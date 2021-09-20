
const fs = require("fs");
const parser = require("./parser");

const INPUT_FILE = process.argv[2];
const OUTPUT_FILE = process.argv[3] || (INPUT_FILE.substring(0, INPUT_FILE.lastIndexOf(".")) + ".lua");

let preprocess = (original_src) => {
    let src = "";
    let i = 0;
    while(i < original_src.length - 1) {
        if(original_src[i] == "-" && original_src[i + 1] == "-") {
            i+= 2;
            while(original_src[i] != "\n") i++;
            i++;
        }
        else {
            src += original_src[i];
            i++;
        }
    }
    return src;
}

const src = preprocess(fs.readFileSync(INPUT_FILE, "utf-8"));
const ast = parser.parse(src);

const definitions = [ ];

let depth = 0;

const addDefinition = (name) => {
    if(definitions.includes(name))
        throw "Cannot define '" + name + "' twice";
        
    definitions.push(name);
}

const evaluators = { };

evaluators.simple_def = ast => {
    let prefix = "local " + ast.name + ";";

    if(depth == 0) {
        addDefinition(ast.name);
        prefix = "";
    }
    
    return prefix + evalBody(ast.value, true, setVarReturn(ast.name));
}

evaluators.array_destructure = ast => {
    let prefix = "local " + ast.names.join(",") + ";";

    if(depth == 0) {
        ast.names.forEach(addDefinition);
        prefix = "";
    }

    return prefix + evalBody(ast.value, true, setVarsReturn(ast.names));
    // return prefix + ast.names.join(",") + " = unpack(" + evaluate(ast.value) + ")";
}

evaluators.table_destructure = ast => {
    let prefix = "local " + ast.pairs.map(x => x.name).join(",") + ";";

    if(depth == 0) {
        ast.pairs.map(x => x.name).forEach(addDefinition);
        prefix = "";
    }

    return "local __t = " + evaluate(ast.value) + ";" + prefix + ast.pairs.map(x => x.name + " = __t[" + evaluate(x.index) + "]").join(";");
}

const SPECIALS = [ "when_expr", "do_expr", "let_in_expr", "try_expr", "array_comprehension" ]

const defaultReturn = content => "return " + content;
const setVarReturn = v => content => v + " = " + content;
const setVarsReturn = v => content => v.join(",") + " = unpack(" + content + ")";

const evalBody = (ast, simplify, returnPrefix = defaultReturn) => {
    ast = getInnerAST(ast);
    if(SPECIALS.includes(ast.type)) {
        if(simplify) return evaluate(ast, true, returnPrefix);
        else return returnPrefix(evaluate(ast));
    }
    else return returnPrefix(evaluate(ast));
    // else return "return (function() " + evaluate(ast) + " end)()";
}


const getInnerAST = (ast) => {
    let a = ast;
    while(a.type == "parenthesised")
        a = a.inner;
    return a;
}

const body = (simplify, content) => simplify? content : ("(function() " + content + " end)()")

evaluators.do_expr = (ast, simplify, returnPrefix) => body(simplify, evaluate(ast.expression) + ";" + evalBody(ast.next, simplify, returnPrefix))
evaluators.when_expr = (ast, simplify, returnPrefix) => body(simplify, ast.branches.map(x => "if " + evaluate(x.condition) + " then " + evalBody(x.value, simplify, returnPrefix)).join(" else") + " else " + evalBody(ast.else_value, simplify, returnPrefix) + " end")
evaluators.try_expr = (ast, simplify, returnPrefix) => {
    const pcall = "pcall(function() " + evalBody(ast.body, simplify, returnPrefix) + " end)";
    if(simplify && returnPrefix != defaultReturn) {
        if(ast.false_branch) {
            return "if not " + pcall + " then " + returnPrefix(evaluate(ast.false_branch)) + " end"
        }
        else return pcall;
    }
    else {
        let txt = "(function() local __r = {" + pcall + "} if __r[1] then return __r[2] end end)()";
        if (ast.false_branch) {
            return "(" + txt + " or " + evaluate(ast.false_branch) + ")"
        }
        else return txt
    }
}

evaluators.let_in_expr = (ast, simplify, returnPrefix) => {
    const inner = evaluate(ast.definition) + ";" + evalBody(ast.expression, simplify, returnPrefix);
    return simplify? ("do " + inner + " end") : ("(function() " + inner + " end)()");
}

evaluators.array_comprehension = (ast, simplify, returnPrefix) => body(simplify, "local __t = {} for _, " + ast.iter_var + " in pairs(" + evaluate(ast.collection) + ") do " + (ast.filters.length > 0? ("if " + ast.filters.map(x => "(" + evaluate(x) + ")").join(" and ") + " then " + evalBody(ast.expression, simplify, setVarReturn("__t[#__t+1]")) + " end") : (evalBody(ast.expression, simplify, setVarReturn("__t[#__t+1]")))) + " end " + returnPrefix("__t"))

evaluators.property = ast => evaluate(ast.table) + "." + ast.name;
evaluators.index = ast => evaluate(ast.table) + "[" + evaluate(ast.index) + "]";

evaluators.function = ast => {

    let txt = "function(" + ast.parameters.map(x => x.name).join(",") + ") ";

    depth++;

    txt += ast.parameters.filter(x => x.defaultValue).map(x => "if " + x.name + " == nil then " + x.name + " = " + evaluate(x.defaultValue) + " end").join(" ")
    + " " + evalBody(ast.result, true) + " end"

    depth--;

    return txt;
}

const BINOP_REPLACE_TABLE = {
    "or": " or ",
    "&": " and "
}

evaluators.binop = ast => {
    if(ast.op == "++") {
        return "table_concat(" + evaluate(ast.left) + "," + evaluate(ast.right) + ")";
    }

    return "(" + evaluate(ast.left) + (BINOP_REPLACE_TABLE[ast.op] || ast.op) + evaluate(ast.right) + ")"
};

const UNOP_REPLACE_TABLE = {
    "~": "not ",
    "...": "unpack"
}

evaluators.unary = ast => (UNOP_REPLACE_TABLE[ast.op] || ast.op) + "(" + evaluate(ast.right) + ")"

evaluators.nil = () => "(nil)";
evaluators.number = ast => ast.value.toString();
evaluators.boolean = ast => ast.value.toString();
evaluators.variable = ast => ast.name;
evaluators.string = ast => "\"" + ast.value + "\"";
evaluators.fstring = ast => "string.format(\"" + ast.value + "\"," + ast.format_values.map(x => evaluate(x)).join(",") + ")";
evaluators.parenthesised = ast => "(" + evaluate(ast.inner) + ")";
evaluators.array = ast => "{" + ast.items.map(x => evaluate(x)).join(",") + "}";
evaluators.table = ast => "{" + ast.elements.map(x => "[" + evaluate(x.index) + "]=" + evaluate(x.value)).join(",") + "}";

evaluators.method_call = ast => evaluate(ast.table) + ":" + ast.name + "(" + ast.args.map(x => evaluate(x)).join(",") + ")";

evaluators.application = ast => evaluate(ast.f) + "(" + ast.args.map(x => evaluate(x)).join(",") + ")";

evaluators.bind = ast => "(" + evaluate(ast.left) + "):bind(" + evaluate(ast.right) + ")";

function evaluate(ast, ...settings) {
    if(!ast) throw "Attempt to evaluate nothing: " + JSON.stringify(ast, null, 2);
    const f = evaluators[ast.type];
    if(f) return f(ast, ...settings);
    else throw "No evaluator for: " + JSON.stringify(ast, null, 2);
}

// console.log();

const preamble = `
local __pairs = pairs
local unpack = unpack or table.unpack
local function table_concat(a, b)
    local c = { unpack(a) }
    for i=1, #b do
        c[#c+1] = b[i]
    end
    return c
end

local function len(a) return #a end
local function nop() end

local function range(a, b, c)
    if b == nil then b = a; a = 1 end
    if c == nil then c = 1 end
    local t = {}
    for i = a, b, c do t[#t + 1] = i end
    return t
end

--[[
function table.merge(a, b)
    if a == b then return b end
    if b and (type(b) == "table") then 
        local bmt = getmetatable(b) or { }
        local i = bmt.__index or nop;
        local a = a or { }
        bmt.__index = function (self, key) 
            return i(self, key) or a[key] 
        end
        -- if i == bmt.__index then bmt.__index = function (self, key) return a[key] end end
        setmetatable(b, bmt)
    end
    return b
end
]]

function table.merge(a, b)
    local c = {}
    for k,v in __pairs(a) do c[k] = v end
    for k,v in __pairs(b) do c[k] = v end
    return c
end

function is_subclass(A, B)
    local mt = getmetatable(A)
    while mt do
        if mt == B then return true end
        mt = getmetatable(mt)
    end
    return false
end

local function get_empty_table() return {} end
local function proto(__proto, __super)
    __proto.__index = __proto
    __proto.constructor = __proto.constructor or get_empty_table
    __proto.__proto = __proto.__proto or __proto
    __proto.__super = __proto.__super or __super
    local construct = {
        __call = function(self, ...)
            return setmetatable(__proto.constructor(...), __proto)
        end,
        __index = __super
    }
    if __super then construct = setmetatable(construct, __super) end
    return setmetatable(__proto, construct);
end

local function extend(__super, __proto) return proto(__proto, __super) end

local function tail(a)
    return { select(2, unpack(a)) }
end

local function pairs(t)
    local keyset = {}
    for k, v in __pairs(t) do keyset[#keyset+1] = {k, v} end
    return keyset
end

local function DEBUG(a)
    for k, v in __pairs(a) do
        print(k, v)
    end
end

local function panic()
    error("Panicked!", 2)
end
`;

txt = "";

for (const im of ast.imports) {
    txt += "require(\"" + im + "\");"
}

for (const dec of ast.definitions) {
    txt += evaluate(dec) + "\n";
}

if(definitions.includes("main"))
    txt += "\nmain()";

if(definitions.length > 0)
    txt = ("local " + definitions.filter(x => !ast.export.includes(x)).join(",") + "\n") + txt;

txt = preamble + txt;

console.log(txt);

fs.writeFileSync(OUTPUT_FILE, txt);
