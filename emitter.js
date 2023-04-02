
const fs = require("fs");
const path = require("path");
const { Scanner } = require("./scanner");
const { Parser } = require("./parser-new");
// const types = require("./new_type");

const INPUT_FILE = process.argv[2];
const OUTPUT_FILE = process.argv[3] || (INPUT_FILE.substring(0, INPUT_FILE.lastIndexOf(".")) + ".lua");

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

const evaluators = { };

evaluators.simple_def = ast => {
    let prefix = "local " + emitIdentifier(ast.name.value) + ";";

    if(depth == 0) {
        addDefinition(ast, ast.name.value);
        prefix = "";
    }
    
    return prefix + evalBody(ast.value, true, setVarReturn(ast.name.value));
}

evaluators.array_destructure = ast => {
    // let prefix = "local " + ast.names.join(",") + ";";

    // if(depth == 0) {
    //     ast.names.forEach(addDefinition);
    //     prefix = "";
    // }

    // return prefix + evalBody(ast.value, true, setVarsReturn(ast.names));

    const allNames = ast.head.map(getValue).concat(ast.tail.map(getValue)).concat(["__a"]).filter(x => x != "_");
    let prefix = "local " + allNames.join(",") + ";";

    if(depth == 0) {
        allNames.forEach(x => addDefinition(ast, x));
        prefix = "";
    }

    let txt = prefix + evalBody(ast.value, true, setVarReturn("__a")) + ";";
    for (let i = 0; i < ast.head.length; i++) {
        const name = ast.head[i].value;
        if(name != "_")
            txt += name + " = __a[" + (i + 1) + "] "
    }

    for (let i = 0; i < ast.tail.length; i++) {
        const name = ast.tail[i].value;
        if(name != "_")
            txt += name + " = __a[#__a - " + (ast.tail.length - i - 1) + "] "
    }

    return txt;
    // return prefix + ast.names.join(",") + " = unpack(" + evaluate(ast.value) + ")";
}

evaluators.table_destructure = ast => {
    let prefix = "local " + ast.pairs.map(x => x.name.value).filter(x => x != "_").join(",") + ";";

    if(depth == 0) {
        ast.pairs.map(x => x.name.value).filter(x => x != "_").forEach(x => addDefinition(ast, x));
        prefix = "";
    }

    return "local __t = " + evaluate(ast.value) + ";" + prefix + ast.pairs.filter(x => x.name.value != "_").map(x => x.name.value + " = __t[" + evaluate(x.index) + "]").join(";");
}

const SPECIALS = [ "when_expr", "do_expr", "let_in_expr", "assignment", "try_expr", "array_comprehension" ]

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
    const inner = evaluate(ast.definition) + (ast.hasInBranch? (";" + evalBody(ast.expression, simplify, returnPrefix)) : "--[[ NO IN BRANCH ]]");
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

evaluators.function = ast => {

    let txt = "function(" + ast.parameters.map(x => x.variadic? "..." : x.name.value).join(",") + ") ";

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
        txt += 'main()';
        // txt += 'main()';

    if(definitions.length > 0) {
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