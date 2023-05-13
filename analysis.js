
const fs = require("fs");
const path = require("path");
const TreeWalker = require("./treewalker").TreeWalker;
const Variable = require("./variable").Variable;
const { Scanner } = require("./scanner");
const { Parser } = require("./parser-new");

const INPUT_FILE = "analysis.t";
// process.argv[2];

const analyser = new TreeWalker("type");

const nop = () => null;

let depth = 0;

let decno = 0;

let currentFile;
let backgroundVariables = [ ];
let variables = [ ];
let semanticTokens = [ ];
let errors = [ ];
let warnings = [ ];

const INTRINSIC_FUNCTIONS = [
    "unpack",
    "concat",
    "len",
    "nop",
    "symbol",
    "unset",
    "overwrite",
    "is_subclass",
    "get_empty_table",
    "proto",
    "extend",
    "last",
    "body",
    "pairs",
    "ipairs",
    "pairset",
    "panic",
    "identity",
    "count",
    "modify",
    "type",
    "print",
    "head",
    "tail",
    "tostring",
    "getmetatable",
];

const walk = (ast, ...settings) => {
    depth++;
    const v = analyser.walk(ast, ...settings);
    depth--;
    return v;
}

const tokenToAST = (tok) => ({ firstToken: tok, lastToken: tok });

const generateError = (ast, msg, warning = false) => {
    
    const txt = warning? "WARNING" : "SEMANTIC ERROR";

    if(ast && ast.firstToken && ast.firstToken.pos && ast.lastToken && ast.lastToken.pos) {
        const pos = ast.firstToken.pos;
        const e = Error(txt + " @ " + currentFile + ", ln " + pos.ln + ", col " + pos.col + " -- " + msg);
        e.type = "semantic";
        e.rawMessage = msg;
        e.filename = currentFile;
        e.offset = ast.firstToken.pos.offset;
        e.pos = pos;
        e.length = (ast.lastToken.pos.offset - ast.firstToken.pos.offset + ast.lastToken.pos.length);
        e.offendingAST = ast;
        e.isWarning = warning;
        return e;
    }
    else {
        const e = Error(txt + " -- " + msg);
        e.type = "semantic";
        e.filename = currentFile;
        e.rawMessage = msg;
        e.isWarning = warning;
        return e;
    }
}

const typeOfAST = ast => {
    if(ast == null) return "variable";
    if(ast.type == "function") return "function";
    if(ast.type == "application" && ast.f.type == "variable") {
        if(["proto", "getmetatable", "symbol", "box"].includes(ast.f.name)) return "class";
    }
    return "variable";
}

const getVariable = (name, offset) => {
    if(!name) return null;

    const candidates = variables.filter(x => 
        x.name == name 
        && ((x.global && x.scope == null) || 
            (x.scope && x.scope.firstToken.pos.offset <= offset && offset <= (x.scope.lastToken.pos.offset + x.scope.lastToken.pos.length)))
        );
    let deepest = -1;
    let found;
    for (const v of candidates) {
        if(v.depth > deepest) found = v;
    }

    return found || backgroundVariables.find(x => x.name == name);
}

const addSemanticToken = (tok, associatedVariable, customType) => {
    
    if (tok.value == "_" || tok.value == "@") return;

    if(!customType && !associatedVariable) {
        associatedVariable = getVariable(tok.value, tok.pos.offset);

        if(associatedVariable)
            associatedVariable.used = true;
    }
    
    semanticTokens.push({
        type: customType || (associatedVariable? associatedVariable.type : "variable"),
        name: tok.value,
        filename: currentFile,
        reference: associatedVariable,
        token: tok
    });
};

const decVariable = (ast, name, global, scope, value, createSemTok = true) => {

    if(!name.value) return null;

    const range = tokenToAST(name);

    if(global && variables.find(x => x.name == name.value && x.global && x.filename == currentFile))
        errors.push(generateError(range, "Duplicate variable '" + name.value + "'"));

    const v = new Variable();
    v.decno = decno;
    v.depth = depth;
    v.filename = currentFile;
    v.name = name.value;
    v.global = !! global;
    v.scope = global? null : scope;
    if(!global && !scope)
        throw Error("Internal error: non-global variable without scope");
    v.type = typeOfAST(value);
    v.ast = ast;
    v.range = range;
    variables.push(v);
    
    if(createSemTok)
        addSemanticToken(name, v);

    return v;
}

analyser.walkers.nil = nop;
analyser.walkers.number = nop;
analyser.walkers.boolean = nop;
analyser.walkers.string = nop;
analyser.walkers.fstring = ast => ast.format_values.forEach(walk);
analyser.walkers.parenthesised = ast => walk(ast.inner);
analyser.walkers.array = ast => ast.elements.forEach(walk);
analyser.walkers.table = ast => ast.elements.forEach(x => { walk(x.index); walk(x.value); });
analyser.walkers.method_call = ast => { 
    addSemanticToken(ast.name, null, "function");
    walk(ast.table); 
    ast.args.forEach(walk); 
};
analyser.walkers.application = ast => { 
    if(ast.f.type == "variable") {
        addSemanticToken(ast.f.firstToken, null, "function");
    }
    else if(ast.f.type == "property") {
        addSemanticToken(ast.f.name, null, "function");
    }
    walk(ast.f); 
    ast.args.forEach(walk); 
};
analyser.walkers.assignment = ast => { walk(ast.left); walk(ast.right); };
analyser.walkers.nullco = ast => walk(ast.table);
analyser.walkers.property = ast => walk(ast.table);
analyser.walkers.index = ast => { 
    walk(ast.table); 
    walk(ast.index); 
};

analyser.walkers.unary = ast => walk(ast.right);
analyser.walkers.binop = ast => { walk(ast.left); walk(ast.right); };

analyser.walkers.do_expr = ast => { 
    ast.expressions.forEach(walk); 
    if(ast.next) walk(ast.next); 
}

analyser.walkers.when_expr = ast => {
    ast.branches.forEach(x => { walk(x.condition); walk(x.value); }); 
    if(ast.else_value) walk(ast.else_value);
}

analyser.walkers.try_expr = ast => {
    walk(ast.body);
    if(ast.false_branch) walk(ast.false_branch);
}

analyser.walkers.match_expression = ast => walk(ast.expression);

analyser.walkers.match_variable = (ast, settings) => {
    if(settings.usedVars.has(ast.name.value)) {
        addSemanticToken(ast.name);
    }
    else {
        settings.usedVars.add(ast.name.value);
        decVariable(ast, ast.name, false, settings.scope, settings.value);
    }
}

analyser.walkers.match_array = (ast, settings) => {
    if(ast.collectiveTail) {
        [ ...ast.head, ast.collectiveTail ].forEach(x => walk(x, settings));
    }
    else {
        [ ...ast.head, ...ast.tail ].forEach(x => walk(x, settings));
    }
}

analyser.walkers.match_table = (ast, settings) => {
    ast.elements.forEach(x => {
        walk(x.key, settings);
        walk(x.pattern, settings);
    });
};

analyser.walkers.match_pattern = (ast, settings) => {
    if(ast.metatable) walk(ast.metatable);
    walk(ast.pattern, settings);
}

analyser.walkers.match = ast => {
    walk(ast.expression);

    ast.branches.forEach(x => { 
        walk(x.pattern, {
            scope: x,
            value: x.value,
            usedVars: new Set()
        }); 
        walk(x.value); 
        x.conditions.forEach(walk);
    });

    walk(ast.else_value);
}

analyser.walkers.destruct_variable = (ast, settings) => 
    [ decVariable(ast, ast.name, settings?.global, settings.scope, settings.value) ];

analyser.walkers.destruct_array = (ast, settings) => {
    if(ast.collectiveTail) {
        return [ ...ast.head, ast.collectiveTail ].map(x => walk(x, settings)).flat();
    }
    else {
        return [ ...ast.head, ...ast.tail ].map(x => walk(x, settings)).flat();
    }
}

analyser.walkers.destruct_table = (ast, settings) => 
    ast.elements.map(x => walk(x.pattern, settings)).flat();

analyser.walkers.let_stmt = (ast, settings) => {
    
    if(settings?.topLevelScanningPass == ast.isGlobal) {
        walk(ast.pattern, {
            ...settings,
            global: ast.isGlobal,
            value: ast.value
        });
    }
    
    if(ast.value && (!settings?.topLevelScanningPass || !ast.isGlobal))
        walk(ast.value);
}

analyser.walkers.let_in_expr = (ast, settings) => {
    const vars = walk(ast.declaration, {
        ...settings,
        scope: ast
    }) || [];

    if(ast.hasInBranch) {
        for (const v of vars) {
            v.scope = ast;
        }

        // if(settings?.topLevelScanningPass == settings?.global)
            
    }

    walk(ast.expression);
}

analyser.walkers.function = ast => {
    for (const p of ast.parameters) {
        if(p.defaultValue) walk(p.defaultValue);
        // console.log(p);
        decVariable(ast, p.name, false, ast.result, p.defaultValue);
    }

    walk(ast.result);
}

analyser.walkers.array_comprehension = ast => {
    decVariable(ast, ast.iter_var, false, ast, null);

    walk(ast.collection);
    for (const filter of ast.filters) {
        walk(filter);
    }
    walk(ast.expression);
}

analyser.walkers.variable = ast => addSemanticToken(ast.firstToken, null);



const analyse = (filename, ast, updateFile, savedVariables) => {

    let visitedFiles = [ ];

    let parseResult = {
        imports: [ ],
        definitions: [ ],
        errors: [ ],
        export: [ ]
    }

    backgroundVariables = savedVariables || [ ];
    variables = [ ];

    let backgroundErrors;
    errors = [ ];

    let backgroundWarnings;
    warnings = [ ];

    if (!updateFile) {
        for (const v of INTRINSIC_FUNCTIONS) {
            decVariable(null, { value: v }, true, null, { type: "function" }, false);
            decno++;
        }
        backgroundVariables = variables;
        variables = [ ];
    }
    
    const analyseFile = (filename, isFirst) => {

        if(visitedFiles.includes(filename)) return;

        visitedFiles.push(filename);

        let oldCurrentFile = currentFile;
        currentFile = filename;

        let parsed;
        if(ast) {
            parsed = ast;
            ast = null;
        }
        else {
            const scanned = new Scanner().scanFile(filename);
            const p = new Parser(filename, scanned.tokens);
            parsed = p.program();
        }

        parseResult = Parser.combineParseResults(parseResult, parsed);

        let importErrors = [ ];
        for(const i of parsed.imports) {
            if(i.value.trim() == "") {
                importErrors.push(generateError(i, "Empty import statement", false));
                continue;
            }

            const importPath = path.join(path.dirname(filename), i.value);

            if(fs.existsSync(importPath)) {
                if(!updateFile) {
                    analyseFile(importPath, false);
                }
            }
            else {
                importErrors.push(generateError(i, "Could not import file '" + importPath + "'", false));
            }
        }

        if(isFirst) {
            backgroundErrors = errors;
            backgroundWarnings = warnings;
            variables = [ ];
            errors = [ ...parsed.errors, ...importErrors ];
            warnings = [ ];
        }

        semanticTokens = [ ];

        for (const dec of parsed.definitions) {
            walk(dec, {
                global: true,
                topLevelScanningPass: true
            });
        }

        for (const dec of parsed.definitions) {
            walk(dec, {
                global: true,
                topLevelScanningPass: false
            });
            decno++;
        }

        for (const e of parsed.export) {
            const found = variables.find(x => x.global && x.name == e.value);
            if(found) {
                found.used = true;
                // addSemanticToken(e.firstToken, found);
                if(!isFirst)
                    backgroundVariables.push(found);
            }
            // else
            //     errors.push(generateError(e, "Attempt to export a non-existent variable '" + e.value + "'"));
        }

        for (const v of variables) {
            if(v.filename == currentFile && !v.used && v.name != "main" && v.name != "_" && v.name != "self") {
                warnings.push(generateError(v.range, "Unused variable '" + v.name + "'", true));
            }
        }

        currentFile = oldCurrentFile;
    }

    analyseFile(filename, true);

    return {
        parseResult: parseResult,
        semanticTokens: semanticTokens,
        
        backgroundVariables: backgroundVariables,
        variables: variables,

        backgroundErrors: backgroundErrors,
        errors: errors,

        backgroundWarnings: backgroundWarnings,
        warnings: warnings
    }
};

// const source = fs.readFileSync(INPUT_FILE, "utf-8");
// const scanner = new Scanner().scan(source);
// const parser = new Parser(scanner.tokens);
// const ast = parser.program();
// // console.log(ast);
// console.log(analyse(ast));
// console.log();


exports.analyse = analyse;
exports.INTRINSICS = INTRINSIC_FUNCTIONS;
