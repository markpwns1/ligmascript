
const fs = require("fs");
const path = require("path");
const { Scanner } = require("./scanner");
const { ast } = require("./parser-new");
// const types = require("./new_type");

// let preprocess = (original_src) => {
//     let src = "";
//     let i = 0;
//     while(i < original_src.length - 1) {
//         if(original_src[i] == "-" && original_src[i + 1] == "-") {
//             i+= 2;
//             while(original_src[i] != "\n") i++;
//             i++;
//         }
//         else {
//             src += original_src[i];
//             i++;
//         }
//     }
//     return src;
// }

// const src = preprocess(fs.readFileSync(INPUT_FILE, "utf-8"));
// const ast = parser.parse(src);

const getValue = x => x.value;

let definitions = [ ];

let depth = 0;

const err = (ast, msg) => {
    
    if(ast) {
        const pos = ast.firstToken.pos;
        const e = Error("SEMANTIC ERROR @ Ln " + pos.ln + ", col " + pos.col + " -- " + msg);
        e.type = "semantic";
        e.rawMessage = msg;
        e.offset = ast.firstToken.pos.offset;
        e.pos = pos;
        e.length = (ast.lastToken.pos.offset - ast.firstToken.pos.offset + ast.lastToken.pos.length);
        e.offendingAST = ast;
        return e;
    }
    else {
        const e = Error("SEMANTIC ERROR -- " + msg);
        e.type = "semantic";
        e.rawMessage = msg;
        return e;
    }
}

const addDefinition = (ast, name) => {
    if(definitions.includes(name)) {
        err(ast, "Cannot declare '" + name + "' more than once.");
    }
        
    definitions.push(name);
}

let tempVarIndex = 0;
const tempVarName = () => "__temp" + (tempVarIndex++);
const raw = txt => ast("raw", null, null, { value: txt });

const evaluators = { };

evaluators.raw = ast => ast.value;

const mtCheck = (mt, rhand) => {
    if(mt) {
        return "if getmetatable(" + evaluate(rhand) + ") ~= " + evaluate(mt) + " then break end ";
    }
    else return ""
}

const mtCheckBreakConditions = (mt, rhand) => {
    if(mt) return [ "getmetatable(" + evaluate(rhand) + ") ~= " + evaluate(mt) ];
    else return [ ];
}

evaluators.match_expression = (ast, rhand, usedVars, mt) => {
    if(mt) {
        // const varName = tempVarName();
        // let toEmit = evalBody(rhand, true, setVarReturn(varName)) + " ";
        let [varName, toEmit] = saveVar(rhand);
        toEmit += mtCheck(mt, raw(varName));
        toEmit += "if " + evaluate(ast.expression) + " ~= " + varName + " then break end ";
        return toEmit;
    }
    else {
        return "if " + evaluate(ast.expression) + " ~= " + evaluate(rhand) + " then break end ";
    }
}

evaluators.match_variable = (ast, rhand, usedVars, mt) => {
    // const varName = tempVarName();
    // let toEmit = evalBody(rhand, true, setVarReturn(varName)) + " ";
    // if(ast.optional && !mt && !usedVars.has(ast.name.value)) {
    //     const toEmit = "local " + ast.name.value + " = " + evaluate(rhand) + " ";
    //     usedVars.add(ast.name.value);
    //     return toEmit;
    // }
    // else {
    //     let [varName, toEmit] = saveVar(rhand);
    //     toEmit += mtCheck(mt, raw(varName));
    //     toEmit += "if " + varName + " == nil";
    //     if(usedVars.has(ast.name.value)) {
    //         toEmit += " or " + varName + " ~= " + ast.name.value;
    //     }
    //     toEmit += " then break end ";
    //     toEmit += "local " + ast.name.value + " = " + varName + " ";
    //     usedVars.add(ast.name.value);
    //     return toEmit;
    // }

    let toEmit = "";
    const varName = ast.name.value;
    const userVarsHas = usedVars.has(varName);
    const breakConditions = [ ];

    if(userVarsHas) {
        breakConditions.push(varName + " ~= " + evaluate(rhand));
    }
    else {
        toEmit += "local " + varName + " = " + evaluate(rhand) + " ";
        usedVars.add(varName);
    }

    if(ast.optional) {
        return toEmit;
    }
    else {
        breakConditions.push(varName + " == nil");
    }

    breakConditions.push(...mtCheckBreakConditions(mt, raw(varName)));

    if(breakConditions.length > 0) {
        toEmit += "if " + breakConditions.map(x => "(" + x + ")").join(" or ") + " then break end ";
    }

    return toEmit;
}

evaluators.match_array = (ast, rhand, usedVars, mt) => {
    // const arrayVar = tempVarName();
    // let toEmit = evalBody(rhand, true, setVarReturn(arrayVar)) + " ";
    let [arrayVar, toEmit] = saveVar(rhand);

    toEmit += mtCheck(mt, raw(arrayVar));

    if(ast.tail && ast.tail.length > 0) {
        toEmit += "if type(" + arrayVar + ") ~= \"table\" or #" + arrayVar + " < " + (ast.head.length + ast.tail.length) + " then break end ";
    }
    else if(!ast.collectiveTail) {
        toEmit += "if type(" + arrayVar + ") ~= \"table\" or #" + arrayVar + " ~= " + ast.head.length + " then break end ";
    }

    for (let i = 0; i < ast.head.length; i++) {
        toEmit += evaluate(ast.head[i], raw(arrayVar + "[" + (i + 1) + "]"), usedVars) + " ";
    }
    for(let i = 0; i < ast.tail.length; i++) {
        toEmit += evaluate(ast.tail[i], raw(arrayVar + "[#" + arrayVar + " - " + (ast.tail.length - i - 1) + "]"), usedVars) + " ";
    }
    if(ast.collectiveTail) {
        toEmit += "local " + ast.collectiveTail.name.value + " = slice(" + arrayVar + ", " + (ast.head.length + 1) + ", #" + arrayVar + ", 1) ";
    }
    return toEmit;
}

const saveVar = rhand => {
    if(rhand.type == "variable") {
        return [rhand.name, ""];
    }
    else {
        const varName = tempVarName();
        const toEmit = "local " + evalBody(rhand, true, setVarReturn(varName)) + " ";
        return [varName, toEmit];
    }
}

evaluators.match_table = (ast, rhand, usedVars, mt) => {
    let [tableVar, toEmit] = saveVar(rhand);
    toEmit += mtCheck(mt, raw(tableVar));
    toEmit += "if type(" + tableVar + ") ~= \"table\" then break end ";

    for(let i = 0; i < ast.elements.length; i++) {
        const key = evaluate(ast.elements[i].key);
        toEmit += evaluate(ast.elements[i].pattern, raw(tableVar + "[" + key + "]"), usedVars) + " ";
    }

    return toEmit;
}

evaluators.match_pattern = (ast, rhand, usedVars) =>
    evaluate(ast.pattern, rhand, usedVars, ast.metatable);

evaluators.match = (ast, simplify, returnPrefix) => {
    let toEmit = "";
    let rhand;
    if(ast.expression.type == "variable") {
        rhand = ast.expression;
    }
    else {
        const varName = tempVarName();
        toEmit += "local " + varName + " = " + evaluate(ast.expression) + " ";
        rhand = raw(varName);
    }

    if(ast.branches.every(x => x.pattern.type == "match_expression")) {
        for(let i = 0; i < ast.branches.length; i++) {
            const branch = ast.branches[i];
            toEmit += (i > 0? "else" : "") + 
                "if " + evaluate(rhand) + " == " + evaluate(branch.pattern.expression) + 
                (branch.conditions.map(x => " and " + evaluate(x))) + " then ";
            toEmit += evalBody(branch.value, simplify, returnPrefix) + " ";
        }
        toEmit += "else " + evalBody(ast.else_value, simplify, returnPrefix) + " end";
    }
    else {
        let unmatched;
        const customReturnPrefix = returnPrefix != defaultReturn;
        if(customReturnPrefix) {
            unmatched = tempVarName();
            toEmit += "local " + unmatched + " = true ";
        }
        for(let i = 0; i < ast.branches.length; i++) {
            toEmit += "while " + (customReturnPrefix? unmatched : "true") + " do "
            const branch = ast.branches[i];
            toEmit += evaluate(branch.pattern, rhand, new Set());
            if(branch.conditions.length > 0) {
                toEmit += " if not (" + branch.conditions.map(evaluate).join(" and ") + ") then break end ";
            }
            if(customReturnPrefix) {
                toEmit += " do " + evalBody(branch.value, simplify, returnPrefix) + " end " 
                toEmit += unmatched + " = false "
                toEmit += "break end ";
            }
            else {
                toEmit += evalBody(branch.value, simplify, returnPrefix) + " end "
            }
            
        }
        if(customReturnPrefix) toEmit += "if " + unmatched + " then "
        toEmit += evalBody(ast.else_value, simplify, returnPrefix) + (customReturnPrefix? " end " : " ");
    }

    return body(simplify, toEmit);
}

evaluators.destruct_table = (ast, rhand) => {
    // const tableVar = tempVarName();
    // let toEmit = evalBody(rhand, true, setVarReturn(tableVar)) + " ";
    let [tableVar, toEmit] = saveVar(rhand);
    for (let i = 0; i < ast.elements.length; i++) {
        toEmit += evaluate(ast.elements[i].pattern, raw(tableVar + "[" + evaluate(ast.elements[i].index) + "]")) + " ";
    }
    return toEmit;
}

evaluators.destruct_array = (ast, rhand) => {
    if(rhand.type == "array" && !ast.collectiveTail) {
        let toEmit = "";
        for (let i = 0; i < ast.head.length; i++) {
            toEmit += evaluate(ast.head[i], rhand.elements[i]) + " ";
        }
        for(let i = 0; i < ast.tail.length; i++) {
            toEmit += evaluate(ast.tail[i], rhand.elements[rhand.elements.length - ast.tail.length + i]) + " ";
        }
        return toEmit;
    }
    else {
        // const arrayVar = tempVarName();
        let [ arrayVar, toEmit ] = saveVar(rhand);
        // let toEmit = evalBody(rhand, true, setVarReturn(arrayVar)) + " ";
        for (let i = 0; i < ast.head.length; i++) {
            toEmit += evaluate(ast.head[i], raw(arrayVar + "[" + (i + 1) + "]")) + " ";
        }
        for(let i = 0; i < ast.tail.length; i++) {
            toEmit += evaluate(ast.tail[i], raw(arrayVar + "[#" + arrayVar + " - " + (ast.tail.length - i - 1) + "]")) + " ";
        }
        if(ast.collectiveTail) {
            toEmit += evaluate(ast.collectiveTail, raw("slice(" + arrayVar + ", " + (ast.head.length + 1) + ", #" + arrayVar + ", 1)")) + " ";
        }
        return toEmit;
    }
    
}

evaluators.destruct_variable = (ast, rhand) => {
    if(!ast.isExport && !rhand) return;

    if(depth == 0) {
        addDefinition(ast, ast.name.value);
    }

    if(rhand.type == "function") {
        return (ast.isExport? "" : "local ") + evaluate(rhand, ast.name.value);
    }
    else {
        let prefix = ast.isExport? "" : ("local " + emitIdentifier(ast.name.value) + ";");

        return prefix + evalBody(rhand, true, setVarReturn(ast.name.value));
    }
    
};

evaluators.let_stmt = ast => {
    return evaluate(ast.pattern, ast.value);
};

const SPECIALS = [ "when_expr", "do_expr", "let_in_expr", "assignment", "try_expr", "array_comprehension", "match" ]

const defaultReturn = content => "return " + content;
const noReturn = content => "nop(" + content + ")";
const setVarReturn = v => content => emitIdentifier(v) + " = " + content;
const setVarsReturn = v => content => v.map(x => emitIdentifier(x)).join(",") + " = unpack(" + content + ")";

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

evaluators.do_expr = (ast, simplify, returnPrefix) => 
    body(simplify, 
        ast.expressions.map(x => 
            (SPECIALS.includes(x.type) || x.type == "application")? 
            evaluate(x, true, noReturn) : 
            noReturn(evaluate(x, true, noReturn))).join(";") + 
        (ast.next.type == "nil"? "" : ";" + evalBody(ast.next, simplify, returnPrefix)));

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
    const inner = evaluate(ast.declaration) + (ast.hasInBranch? (";" + evalBody(ast.expression, simplify, returnPrefix)) : "--[[ NO IN BRANCH ]]");
    // return simplify? (ast.hasInBranch? ("do " + inner + " end") : inner) : ("(function() " + inner + " end)()");
    return simplify? inner : ("(function() " + inner + " end)()");

}

evaluators.array_comprehension = (ast, simplify, returnPrefix = defaultReturn) => body(simplify, "local __t = {} for _, " + ast.iter_var.value + " in __pairs(" + evaluate(ast.collection) + ") do " + (ast.filters.length > 0? ("if " + ast.filters.map(x => "(" + evaluate(x) + ")").join(" and ") + " then " + evalBody(ast.expression, simplify, setVarReturn("__t[#__t+1]")) + " end") : (evalBody(ast.expression, simplify, setVarReturn("__t[#__t+1]")))) + " end " + returnPrefix("__t"))

evaluators.property = ast => evaluate(ast.table) + "." + emitIdentifier(ast.name.value);
evaluators.index = ast => evaluate(ast.table) + "[" + evaluate(ast.index) + "]";
evaluators.nullco = ast => {
    const txt = evaluate(ast.table);
    return "(" + txt + " and " + txt + "." + ast.name.value + ")"
}

evaluators.function = (ast, name = "") => {

    // console.log(ast);

    let txt = "function " + emitIdentifier(name) + "(" + ast.parameters.map(x => x.variadic? "..." : x.name.value).join(",") + ") ";

    depth++;

    // console.log(ast.parameters);
    const last = ast.parameters[ast.parameters.length - 1];
    if(ast.parameters.length > 0 && last.variadic) {
        txt += "local " + last.name.value + " = {...} "
    };

    txt += ast.parameters.filter(x => x.defaultValue).map(
        x => (x.variadic? ("if #" + x.name.value + " == 0 then ") : ("if " + x.name.value + " == nil then ")) + x.name.value + " = " + evaluate(x.defaultValue) + " end").join(" ")
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
        return "concat(" + evaluate(ast.left) + "," + evaluate(ast.right) + ")";
    }

    return "(" + evaluate(ast.left) + (BINOP_REPLACE_TABLE[ast.op] || ast.op) + evaluate(ast.right) + ")"
};

const UNOP_REPLACE_TABLE = {
    "~": "not ",
    "...": "unpack"
}

const RESERVED_LUA_KEYWORDS = [
    "for",
    "if",
    "end",
    "while",
    "and",
    "repeat",
    "break",
    "local",
    "return",
    "function",
    "not",
    "elseif",
    "until"
];

function emitIdentifier(name) {
    return RESERVED_LUA_KEYWORDS.includes(name)? ("__" + name) : name;
}

evaluators.unary = ast => (UNOP_REPLACE_TABLE[ast.op] || ast.op) + "(" + evaluate(ast.right) + ")"

evaluators.nil = () => "(nil)";
evaluators.number = ast => ast.value.toString();
evaluators.boolean = ast => ast.value.toString();
evaluators.variable = ast => emitIdentifier(ast.name);
evaluators.string = ast => "\"" + ast.value + "\"";
evaluators.fstring = ast => "string.format(\"" + ast.value + "\"," + ast.format_values.map(x => evaluate(x)).join(",") + ")";
evaluators.parenthesised = ast => "(" + evaluate(ast.inner) + ")";
evaluators.array = ast => "{" + ast.elements.map(x => evaluate(x)).join(",") + "}";
evaluators.table = ast => "{" + ast.elements.map(x => "[" + evaluate(x.index) + "]=" + evaluate(x.value)).join(",") + "}";

evaluators.method_call = ast => evaluate(ast.table) + ":" + emitIdentifier(ast.name.value) + "(" + ast.args.map(x => evaluate(x)).join(",") + ")";

evaluators.application = ast => evaluate(ast.f) + "(" + ast.args.map(x => evaluate(x)).join(",") + ")";

evaluators.bind = ast => "(" + evaluate(ast.left) + "):bind(" + evaluate(ast.right) + ")";

evaluators.type_annotation = ast => evaluate(ast.expression);
evaluators.assignment = ast => evaluate(ast.left) + " = " + evaluate(ast.right);

function evaluate(ast, ...settings) {
    if(!ast) throw "Attempt to evaluate nothing: " + JSON.stringify(ast, null, 2);
    const f = evaluators[ast.type];
    if(f) {
        lineno++;
        if(ast.firstToken && ast.firstToken.pos && ast.firstToken.pos.ln)
            mappings[currentFile][lineno] = ast.firstToken.pos.ln;
        return "\n" + f(ast, ...settings);
    }
    else throw "No evaluator for: " + JSON.stringify(ast, null, 2);
}

// console.log();



const luafyFilename = filename => filename.substring(0, filename.lastIndexOf(".")) + ".lua";
const getLineCount = x => x.split("\n").length;

let txt = "";
let lineno = 1;// getLineCount(preamble) + 1;
let mappings = { };

let currentFile;

const emit = (ast, filename) => {
    definitions = [ ];
    currentFile = path.normalize(filename);
    lineno = 1;
    mappings[currentFile] = { };
    let errors = ast.errors;
    errors = [ ...errors ];
    txt = "";

    const tryDo = f => {
        try {
            return f();
        }
        catch (e) {
            errors.push(e);
        }
    }

    for(const i of ast.imports) {
        mappings[currentFile][1] = i.firstToken.pos.ln;
        txt += 'import("' + luafyFilename(i.value).replace(/\\/g, "/") + '") ';
    }

    for (const dec of ast.definitions) {
        tryDo(() => txt += evaluate(dec) + " ");
    }

    if(definitions.includes("main"))
        txt += '__report_error(main)';

    if(definitions.length > 0) {
        // console.log(ast.export);
        // console.log(definitions);
        const locals = definitions.filter(x => !ast.export.map(x => x.value).includes(x));
        if(locals.length > 0) {
            txt = "local " + locals.map(x => emitIdentifier(x)).join(",") + " " + txt;
        }
    }

    // for (const ex of ast.export) {
    //     if(!definitions.includes(ex.value)) {
    //         errors.push(err(null, "Attempt to export variable '" + ex.value + "' that has not been defined."));
    //     }
    // }

    return {
        lua: txt,
        errors: errors
    }
}

// const compile = (inputFile, outputFile) => {
    
//     const source = fs.readFileSync(inputFile, "utf-8");
//     const scanner = new Scanner().scan(source);
//     const parser = new Parser(scanner.tokens);
//     ast = parser.program();
    
//     // console.log(JSON.stringify(ast, null, 2));
    
//     // let errors = ast.errors;

//     // errors = [ ...errors, /*...types.typecheck(ast.definitions)*/ ];

//     // console.log(JSON.stringify(types.scopes, null, 2));

//     txt = "";

//     const tryDo = f => {
//         try {
//             return f();
//         }
//         catch (e) {
//             errors.push(e);
//         }
//     }

//     for (const im of ast.imports) {
//         tryDo(() => txt += "require(" + evaluate(im) + ");");
//     }

//     for (const dec of ast.definitions) {
//         tryDo(() => txt += evaluate(dec) + " ");
//     }

//     if(definitions.includes("main"))
//         txt += "main()"
//         // txt += "\n__report_error(main)";

//     if(definitions.length > 0) {
//         const locals = definitions.filter(x => !ast.export.map(x => x.name).includes(x));
//         if(locals.length > 0) {
//             txt = "local " + locals.map(x => emitIdentifier(x)).join(",") + " " + txt;
//         }
//     }

//     // console.log(ast.export);
//     // for (const ex of ast.export) {
//     //     if(!definitions.includes(ex.name)) {
//     //         errors.push(err(null, "Attempt to export variable '" + ex.name + "' that has not been defined."));
//     //     }
//     // }

//     // txt = "local __filename, __mappings = \"" + path.resolve(inputFile).replace(/\\/g, "/") + "\", {" + Object.keys(mappings).map(x => "[" + x + "]=" + mappings[x]).join(",") + "}"
//     //     + preamble + txt;

//     // if(errors.length > 0) {
//     //     const lines = source.split("\n");
//     //     console.log(errors.length + " ERRORS:");

//     //     let i = 0;
//     //     for (const err of errors) {
//     //         try {
//     //             if(err.type) {
//     //                 if(err.pos) {
//     //                     const pos = err.pos;
//     //                     const length = err.length || err.pos.length || 1;
            
//     //                     let text = (++i) + ". ";
//     //                     text += err.message;
//     //                     text += "\n     | \n";
//     //                     text += pos.ln.toString().padStart(4) + " | " + lines[pos.ln - 1] + "\n";
                        
//     //                     text += "     | ";
//     //                     for (let i = 0; i < pos.col - 1; i++) {
//     //                         text += " ";
//     //                     }
//     //                     for (let i = 0; i < length; i++) {
//     //                         text += "^"
//     //                     }
//     //                     text += "";
            
//     //                     console.log(text);
//     //                 }
//     //                 else {
//     //                     console.log((++i) + ". " + (err.message || err));
//     //                 }
//     //             }
//     //             else {
//     //                 console.log((++i) + ". " + (err.stack || err));
//     //             }
//     //         }
//     //         catch {
//     //             console.log("There was an error displaying this error. Here is an uglier version of the error:");
//     //             console.log(err);
//     //         }
//     //     }
//     //     return;
//     // }

//     // types.dump();
//     // console.log(JSON.stringify(types.scopes, null, 2));
//     // console.log(txt);

//     // console.log(mappings);
//     fs.writeFileSync(outputFile, txt);
// }

// compile(INPUT_FILE, OUTPUT_FILE);

const getFileMappings = () => mappings;

exports.emit = emit;
exports.getFileMappings = getFileMappings;