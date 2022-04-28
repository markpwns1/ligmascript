
const fs = require("fs");
const TreeWalker = require("./treewalker").TreeWalker;
const Variable = require("./variable").Variable;
const { Scanner } = require("./scanner");
const { Parser } = require("./parser-new");

const INPUT_FILE = process.argv[2];

const analyser = new TreeWalker("type");
const walk = analyser.walk.bind(analyser);

const nop = () => null;

let depth = 0;

let variables = [ ];
let semanticTokens = [ ];
let errors = [ ];
let warnings = [ ];

const generateError = (ast, msg, warning = false) => {
    
    const txt = warning? "WARNING" : "SEMANTIC ERROR";

    if(ast) {
        const pos = ast.firstToken.pos;
        const e = Error(txt + " @ Ln " + pos.ln + ", col " + pos.col + " -- " + msg);
        e.type = "semantic";
        e.rawMessage = msg;
        e.offset = ast.firstToken.pos.offset;
        e.pos = pos;
        e.length = (ast.lastToken.pos.offset - ast.firstToken.pos.offset + ast.lastToken.pos.length);
        e.offendingAST = ast;
        return e;
    }
    else {
        const e = Error(txt + " -- " + msg);
        e.type = "semantic";
        e.rawMessage = msg;
        return e;
    }
}

const typeOfAST = ast => (ast != null && ast.type == "function")? "function" : "variable";

const getVariable = (name, offset) => {
    const candidates = variables.filter(x => x.name == name && ((x.global && x.scope == null) || 
        (x.scope.firstToken.offset <= offset && offset <= x.scope.lastToken.offset)));
    let deepest = -1;
    let found;
    for (const v of candidates) {
        if(v.depth > deepest) found = v;
    }
    return found;
}

const decVariable = (ast, name, global, scope, value) => {
    if(global && variables.find(x => x.name == name && x.global))
        errors.push(generateError(ast, "Duplicate variable '" + name + "'"));

    const v = new Variable();
    v.depth = depth;
    v.name = name;
    v.global = !! global;
    v.scope = global? null : scope;
    v.type = typeOfAST(value);
    v.ast = ast;
    variables.push(v);

    return v;
}

analyser.walkers.nil = nop;
analyser.walkers.number = nop;
analyser.walkers.boolean = nop;
analyser.walkers.string = nop;

analyser.walkers.simple_def = (ast, settings) => {

    if(settings?.topLevelScanningPass == settings?.global) {
        const v = decVariable(ast, ast.name, settings?.global, ast.value, ast.value);
        return [ v ];
    }

    depth++;
    walk(ast.value);
    depth--;
}

analyser.walkers.array_destructure = (ast, settings) => {
    
    if(settings?.topLevelScanningPass != settings?.global) {
        walk(ast.value);
        return;
    }

    const v = [ ];
    for (const va of [ ...ast.head, ...ast.tail ]) {
        v.push(decVariable(ast, va, settings?.global, null, null));
    }

    return v;
}

analyser.walkers.table_destructure = (ast, settings) => {

    if(settings?.topLevelScanningPass != settings?.global) {
        walk(ast.value);
        return;
    }

    const v = [ ];
    for (const va of ast.pairs) {
        v.push(decVariable(ast, va.name, settings?.global, null, null));
    }

    return v;
}

analyser.walkers.let_in_expr = ast => {
    const vars = walk(ast.definition);

    if(ast.hasInBranch) {
        for (const v of vars) {
            v.scope = ast;
        }

        depth++;
        walk(ast.expression);
        depth--;
    }
}

analyser.walkers.variable = ast => {
    const reference = getVariable(ast.name);

    if(reference)
        reference.used = true;

    semanticTokens.push({
        type: "variable",
        name: ast.name,
        reference: reference,
        token: ast.firstToken
    });
}

const analyse = parserResult => {
    
    variables = [ ];
    errors = [ ];
    warnings = [ ];
    semanticTokens = [ ];

    for (const dec of parserResult.definitions) {
        walk(dec, {
            global: true,
            topLevelScanningPass: true
        });
    }

    for (const dec of parserResult.definitions) {
        walk(dec, {
            global: true,
            topLevelScanningPass: false
        });
    }

    for (const v of variables) {
        if(!v.used)
            warnings.push(generateError(v.ast, "Unused variable '" + v.name + "'", true));
    }

    for (const e of parserResult.export) {
        if(!variables.find(x => x.global && x.name == e))
            errors.push(generateError(null, "Attempt to export a non-existent variable '" + e + "'"));
    }

    return {
        imports: parserResult.imports,
        variables: variables,
        semanticTokens: semanticTokens,
        errors: errors,
        warnings: warnings
    }
};

const source = fs.readFileSync(INPUT_FILE, "utf-8");
const scanner = new Scanner().scan(source);
const parser = new Parser(scanner.tokens);
const ast = parser.program();

console.log(analyse(ast));
