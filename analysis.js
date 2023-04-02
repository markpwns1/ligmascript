
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
    "overwrite",
    "is_subclass",
    "get_empty_table",
    "proto",
    "extend",
    "last",
    "body",
    "pairs",
    "panic",
    "identity",
    "count",
    "type",
    "print"
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
        const e = Error(txt + " @ Ln " + pos.ln + ", col " + pos.col + " -- " + msg);
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

const typeOfAST = ast => (ast != null && ast.type == "function")? "function" : "variable";

const getVariable = (name, offset) => {
    if(!name) return null;

    const candidates = variables.filter(x => 
        x.name == name 
        && ((x.global && x.scope == null) || 
            (x.scope && x.scope.firstToken.pos.offset <= offset && offset <= x.scope.lastToken.pos.offset))
        );
    let deepest = -1;
    let found;
    for (const v of candidates) {
        if(v.depth > deepest) found = v;
    }

    return found || backgroundVariables.find(x => x.name == name);
}

const addSemanticToken = (tok, associatedVariable) => {
    
    if (tok.value == "_" || tok.value == "@") return;

    if(!associatedVariable) {
        associatedVariable = getVariable(tok.value, tok.pos.offset);

        if(associatedVariable)
            associatedVariable.used = true;
    }
    
    semanticTokens.push({
        type: associatedVariable? associatedVariable.type : "variable",
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
analyser.walkers.method_call = ast => { walk(ast.table); ast.args.forEach(walk); };
analyser.walkers.application = ast => { walk(ast.f); ast.args.forEach(walk); };
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

analyser.walkers.simple_def = (ast, settings) => {

    if(settings?.topLevelScanningPass == settings?.global) {
        // console.log(ast);
        const v = decVariable(ast, ast.name, settings?.global, ast.value, ast.value);
        if(!settings?.topLevelScanningPass) walk(ast.value);
        return [ v ];
    }

    walk(ast.value);
}

analyser.walkers.array_destructure = (ast, settings) => {
    
    if(!settings?.topLevelScanningPass) {
        walk(ast.value);
        // return;
    }

    if(settings?.topLevelScanningPass == settings?.global) {
        const v = [ ];
        for (const va of [ ...ast.head, ...ast.tail ]) {
            v.push(decVariable(ast, va, settings?.global, null, null));
        }

        return v;
    }
}

analyser.walkers.table_destructure = (ast, settings) => {

    if(!settings?.topLevelScanningPass) {
        walk(ast.value);
        // return;
    }

    if(settings?.topLevelScanningPass == settings?.global) {
        const v = [ ];
        for (const va of ast.pairs) {
            v.push(decVariable(ast, va.name, settings?.global, null, null));
        }

        return v;
    }
}

analyser.walkers.let_in_expr = ast => {
    const vars = walk(ast.definition);

    if(ast.hasInBranch) {
        for (const v of vars) {
            v.scope = ast;
        }

        walk(ast.expression);
    }
}

analyser.walkers.function = ast => {
    for (const p of ast.parameters) {
        if(p.defaultValue) walk(p.defaultValue);
        // console.log(p);
        decVariable(ast, p.name, false, ast.result, null);
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
            else
                errors.push(generateError(e, "Attempt to export a non-existent variable '" + e.value + "'"));
        }

        for (const v of variables) {
            if(v.filename == currentFile && !v.used && v.name != "main" && v.name != "_") {
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
