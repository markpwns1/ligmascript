
// TODO: replaceGenerics in generic extensions

const scopes = [ [ 
    libraryFunc("len", [ arrayOf("any") ], false, "num"),
    libraryFunc("head", [ arrayOf(genericOf("T")) ], false, genericOf("T")),
    libraryFunc("tail", [ arrayOf(genericOf("T")) ], false, arrayOf(genericOf("T"))),
    libraryFunc("last", [ arrayOf(genericOf("T")) ], false, genericOf("T")),
    libraryFunc("body", [ arrayOf(genericOf("T")) ], false, arrayOf(genericOf("T")))
], [] ];

const PRIMITIVE_TYPES = [
    "str",
    "num",
    "bool",
    "nil",
    "any",
    "()"
]

let errors = [ ];
let suppressFunctionArgInference = false;

const ALPHABET = "abcdefghijklmnopqrstuvwxyz";
let genericCount = -1;
function generateGenericName(n) {
    let s = "";
    do {
        s += ALPHABET[n];
        n -= ALPHABET.length;
    } while(n >= ALPHABET.length);
    return s;
}

const getScope = () => scopes[scopes.length - 1];
const getVar = name => {
    for (let i = scopes.length - 1; i > -1; i--) {
        const f = scopes[i].find(x => x.name == name);
        if(f) return f;
    }
}
const decVar = (name, type, scope = getScope()) => scope.push({ name: name, type: type });

function functionOf(args, variadic, result) {
    return {
        type: "function",
        args: args,
        result: result,
        variadic: variadic
    };
}

function genericOf(name, extending) {
    return {
        type: "generic",
        name: name,
        extending: extending
    }
}

function libraryFunc(name, args, variadic, result) {
    return {
        name: name,
        type: functionOf(args, variadic, result)
    }
}

function tableOf(pairs) {
    return {
        type: "table",
        pairs: pairs
    }
}

function isNullable(a) {
    return isPrimitive(a)? a.endsWith("?") : a.isNullable;
}

function isNil(a) {
    return a == "()";
}

function hasGeneric(t) {
    if(isPrimitive(t)) return false;
    else if(t.type == "generic") return true;
    else if(t.type == "array") return hasGeneric(t.inner);
    else if(t.type == "function") return t.args.some(x => hasGeneric(x)) || hasGeneric(t.result);
}

function isEqual(a, b) {
    if(a == b) return true;
    else if(!isPrimitive(a) && !isPrimitive(b)) {
        if(a.type != b.type) return false;
        if(a.type == "array") return isEqual(a.inner, b.inner);
        if(a.type == "function") {
            if(a.args.length != b.args.length) return false;
            if(a.variadic != b.variadic) return false;
            if(!isEqual(a.result, b.result)) return false;
            for (let i = 0; i < a.args.length; i++) {
                if(!isEqual(a.args[i], b.args[i])) return false;
            }
            return true;
        }
        throw new Error("wtf");
    }
}

function isPrimitive(a) {
    if(typeof a === "string") {
        if(PRIMITIVE_TYPES.includes(a)) return true;
        else throw new Error("Unknown type: " + JSON.stringify(a, null, 2));
    }
    else if(a.type) return false;
    else throw new Error("Unknown type: " + JSON.stringify(a, null, 2));
}

function compatible(a, b) {
    if(a == "any") return true;
    
    if(isNullable(a) && isNil(b)) return true;
    // if(isNil(a) && isNullable(b)) return true;

    if(isPrimitive(a)) return a == b;

    if(a.type == "generic") {
        if(a.extending) {
            return compatible(a.extending, b);
        } 
        else return true;
    }

    if(a.type == "array") {
        return b.type == "array" && compatible(a.inner, b.inner);
    }

    if(a.type == "function") {
        if(b.type != "function") return false;
        if(a.args.length != b.args.length) return false;
        if(a.variadic != b.variadic) return false;

        for (let i = 0; i < a.args.length; i++) {
            if(!compatible(a.args[i], b.args[i])) return false;
        }

        return compatible(a.result, b.result);
    }

    if(a.type == "table") {
        if(b.type == "generic" && b.extending) {
            return compatible(a, b.extending);
        }
        if(b.type != "table") return false;
        for (const p of a.pairs) {
            if(!b.pairs.some(x => x.field == p.field && compatible(p.type, x.type))) return false;
        }
        return true;
    }

    return false;
}

function matchGeneric(t, v) {
    if(isPrimitive(t)) return [ ];
    else if(t.type == "generic") {
        if(t.extending) {
            return [ { generic: t, bound: v }, ...matchGeneric(t.extending, v) ];
        }
        else {
            return [ { generic: t, bound: v } ];
        }
        
    }
    else if(t.type == "array") {
        return [ ...matchGeneric(t.inner, v.inner) ];
    }
    else if(t.type == "function") {
        let toReturn = [ ];
        for (let i = 0; i < t.args.length; i++) {
            toReturn = [ ...toReturn, ...matchGeneric(t.args[i], v.args[i]) ];
        }
        return [ ...toReturn, ...matchGeneric(t.result, v.result) ];
    }
    else if(t.type == "table") {
        // console.log(v);
        if(v.type == "generic") return matchGeneric(t, v.extending);

        let matches = [ ];
        for (const p of t.pairs) {
            // if(!v.pairs) {
            //     console.log(v);
            // }
            const counterpart = v.pairs.find(x => x.field == p.field);
            if(!counterpart) throw new Error("Missing field on table: " + p.field);
            matches = [ ...matches, ...matchGeneric(p.type, counterpart.type) ];
        }
        return matches;
        // return [ ...(t.pairs.map(x => matchGeneric(x.type, v.pairs.find(y => y.field == x.field).type)).flat()) ]
    }
    else throw Error("wtf: " + JSON.stringify(t, null, 2));
}

function replaceGeneric(t, from, to) {
    if(isPrimitive(t)) return t;
    else if(t.type == "generic") {
        if(t.name == from.name) return to;
        else return genericOf(t.name, t.extending? replaceGeneric(t.extending, from, to) : null);
    }
    else if(t.type == "array") {
        return arrayOf(replaceGeneric(t.inner, from, to));
    }
    else if(t.type == "function")  {
        return functionOf(t.args.map(x => replaceGeneric(x, from, to)), t.variadic, replaceGeneric(t.result, from, to));
    }    
    else if(t.type == "table") {
        return tableOf(t.pairs.map(x => ({ field: x.field, type: replaceGeneric(x.type, from, to) })));
    }
    else throw Error("wtf: " + JSON.stringify(t, null, 2));
}


/**
 * 
 * @param {any} a 
 * @returns {[any]}
 */
function getGenerics(a) {
    if(isPrimitive(a)) return [ ];
    else if(a.type == "generic") return [ a ];
    else if(a.type == "array") return getGenerics(a.inner);
    else if(a.type == "function") return [ ...a.args.map(x => getGenerics(x)), ...getGenerics(a.result) ];
    else throw Error("wtf");
}

// function replace(a, b) {
//     if(isEqual(a, b)) return b;
//     else if(isPrimitive(a)) return a;
//     else if(a.type == "generic") return 
//     else if(a.type == "array") return arrayOf(replace(a.inner, b));
//     else if(a.type == "function") return functionOf(a.args.map(x => replace(x, b)), a.variadic, replace(a.result, b));
//     else throw Error("wtf");
// }

function arrayOf(t) {
    return {
        type: "array",
        inner: t
    }
}

const err = (ast, msg) => {
    errors.push((() => { if(ast) {
            const pos = ast.firstToken.pos;
            const e = Error("TYPE ERROR @ Ln " + pos.ln + ", col " + pos.col + " -- " + msg);
            e.type = "type";
            e.rawMessage = msg;
            e.offset = ast.firstToken.pos.offset;
            e.pos = pos;
            e.length = (ast.lastToken.pos.offset - ast.firstToken.pos.offset + ast.lastToken.pos.length);
            e.offendingAST = ast;
            return e;
        }
        else {
            const e = Error("TYPE ERROR -- " + msg);
            e.type = "type";
            e.rawMessage = msg;
            return e;
        }
    })());
}

const tts = y => {
    const ttsInner = t => {
        if(isPrimitive(t)) return t;
        else switch(t.type) {
            case "array": return `[${ttsInner(t.inner)}]`;
            case "function": return `${t.args.map(x => ttsInner(x)).join(", ") + (t.variadic? "..." : "")} -> ${ttsInner(t.result)}`
            case "generic": return t.name + (t.extending? (" >= " + ttsInner(t.extending)) : "");
            case "table": return `{ ${t.pairs.map(x => x.field + " :: " + ttsInner(x.type)).join(", ")} }`;
            default: throw new Error("Unknown type: " + t.type);
        }
    }
    return "$(" + ttsInner(y) + ")";
}

function unwrap(ast) {
    while(ast.type == "parenthesised")
        ast = ast.inner;
    return ast;
}

const ANY_ARRAY = arrayOf("any");

const evaluators = { };

evaluators.string = () => "str";
evaluators.number = () => "num";
evaluators.fstring = () => "str";
evaluators.boolean = () => "bool";
evaluators.nil = () => "()";
evaluators.parenthesised = ast => infer(ast.inner);

const MATH_OPS = [ "+", "-", "/", "*", "^", "%" ]

evaluators.table = ast => {
    const pairs = [ ];
    for (const p of ast.elements) {
        if(p.index.type == "string") {
            pairs.push({ field: p.index.value, type: infer(p.value) });
        }
        infer(p.index);
    }
    return tableOf(pairs);
};

evaluators.property = ast => {
    const t = infer(ast.table);
    const f = t.pairs.find(x => x.field == ast.name);
    if(f) {
        return f.type;
    }
    else {
        return "any";
    }
}

evaluators.unary = ast => {
    const t = infer(ast.right);
    if(ast.op == "...") {
        if(compatible(ANY_ARRAY, t)) {
            return t.inner;
        }
        else {
            err(ast.right, "Right hand side of the '...' operator must be an array, but got " + tts(t));
            return ANY_ARRAY;
        }
    }
    else if(ast.op == "-" && t == "num") return "num";
    return "any";
}

evaluators.binop = ast => {
    const l = infer(ast.left);
    const r = infer(ast.right);
    if(MATH_OPS.includes(ast.op) && l == "num" && r == "num")
        return "num";

    if(ast.op == "..") {
        if(!compatible("str", l))
            err(ast.left, "Left hand side of the '..' operator must be a string, but got " + tts(l));

        if(!compatible("str", r))
            err(ast.right, "Right hand side of the '..' operator must be a string, but got " + tts(r));

        return "str";
    }

    if(ast.op == "++") {
        
        let erred = false;
        if(!compatible(ANY_ARRAY, l)) {
            err(ast.left, "Left hand side of the '++' operator must be an array, but got " + tts(l));
            erred = true;
        }

        if(!compatible(ANY_ARRAY, r)) {
            err(ast.right, "Right hand side of the '++' operator must be an array, but got " + tts(r));
            erred = true;
        }

        return erred? ANY_ARRAY : (compatible(l, r)? l : ANY_ARRAY);
    }

    return "any";
}

evaluators.variable = ast => {
    const v = getVar(ast.name);
    return v? v.type : "any";
}

evaluators.index = ast => {
    const t = infer(ast.table);
    const i = infer(ast.index);
    if(isPrimitive(t)) return "any";
    else if(t.type == "array") {
        return infer(t.inner);
    }
    else return "any";
}

evaluators.array = ast => {
    if(ast.elements.length < 1) return 
    let innerType = infer(ast.elements[0]);
    for (let i = 1; i < ast.elements.length; i++) {
        if(!compatible(innerType, infer(ast.elements[i]))) {
            innerType = "any";
            break;
        }
    }
    return arrayOf(innerType);
}

evaluators.type_annotation = ast => {
    // TODO: give function parameters a type right away
    if(ast.annotation.type == "function" && unwrap(ast.expression).type == "function") {
        for (let i = 0; i < Math.min(ast.annotation.args.length, ast.expression.parameters.length); i++) {
            const t = (i == ast.annotation.args.length - 1 && ast.annotation.variadic)? arrayOf(ast.annotation.args[i]) : ast.annotation.args[i];
            decVar(ast.expression.parameters[i].name, t);
        }
        suppressFunctionArgInference = true;
    }

    const t = infer(ast.expression);
    if(!compatible(t, ast.annotation))
        err(ast.expression, "Given value does not match type annotation. Expected " + tts(ast.annotation) + " but got " + tts(t));
    return ast.annotation;
}

evaluators.simple_def = ast => {
    const s = getScope();
    scopes.push([]);
    let t;
    if(ast.value.type == "type_annotation") {
        t = ast.value.annotation;
        decVar(ast.name, t, s);
        infer(ast.value);
    }
    else {
        t = infer(ast.value);
        decVar(ast.name, t, s);
    }
    scopes.pop();
}

evaluators.function = ast => {
    const last = ast.parameters[ast.parameters.length - 1];
    let result;
    let args = [ ];
    if(suppressFunctionArgInference) {
        ast.parameters.filter(x => x.defaultValue).forEach(x => infer(x.defaultValue));
        args = Array(ast.parameters.length).fill("any");
        result = infer(ast.result);
        suppressFunctionArgInference = false;
    }
    else {
        let originalGenericCount = genericCount;
        scopes.push([ ]);
        for (const p of ast.parameters) {
            let t;
            if(p.name == "_" && !p.defaultValue) {
                t = "()";
            }
            else if(p.defaultValue) {
                t = infer(p.defaultValue);
            }
            else {
                genericCount++
                t = genericOf(generateGenericName(genericCount));
            }

            args.push(t);

            if(p.variadic) t = arrayOf(t);
            decVar(p.name, t);
            // console.log("made var: " + p.name + " :: " + tts(t));
        }
        result = infer(ast.result);
        scopes.pop();
        genericCount = originalGenericCount;
    }
    return {
        type: "function",
        args: args,
        variadic: ast.parameters.length > 0 && last.variadic,
        result: result
    }
}

evaluators.when_expr = ast => {
    let inferType = infer(ast.branches[0].value);

    let erred = false;

    for (let i = 1; i < ast.branches.length; i++) {
        infer(ast.branches[i].condition);
        const t = infer(ast.branches[i].value);
        if(!compatible(inferType, t)) {
            err(ast.branches[i].value, "Inconsistent return types in 'cases' statement. The first branch returns " + tts(inferType) + " but branch #" + (i + 1) + " returns " + tts(t));
            erred = true;
        }
    }

    const t = infer(ast.else_value);
    if(!compatible(inferType, t)) {
        err(ast.else_value, "Inconsistent return types in 'cases' statement. The first branch returns " + tts(inferType) + " but the else branch returns " + tts(t));
        erred = true;
    }
        
    return erred? "any" : inferType;
}

evaluators.application = ast => {
    let l = infer(ast.f);

    if(l == "any" || l.type != "function") {
        err(ast.f, "Can only call functions, not " + tts(l));
        return "any";
    }

    if(l.variadic) {
        if(ast.args.length < l.args.length - 1)
            err(ast, "Expected at least " + (l.args.length - 1) + " arguments to match the function signature " + tts(l) + ", but only got " + ast.args.length);
    }
    else if(ast.args.length != l.args.length) {
        err(ast, "Expected " + l.args.length + " arguments to match the function signature " + tts(l) + ", but got " + ast.args.length);
    }

    for (let i = 0; i < Math.min(l.args.length, ast.args.length); i++) {
        const lt = l.args[i];
        const rt = infer(ast.args[i]);

        if(!compatible(lt, rt))
            err(ast.args[i], "Expected argument #" + (i + 1) + " to be " + tts(lt) + " to match the function signature " + tts(l) + ", but got " + tts(rt))
        else {
            const replacements = matchGeneric(lt, rt);
            for (const r of replacements) {
                l = replaceGeneric(l, r.generic, r.bound);
            }
        }
    }

    return l.result;
}

function infer(ast, ...settings) {
    if(!ast) throw new Error("Attempt to infer the type of nothing: " + JSON.stringify(ast, null, 2));
    const f = evaluators[ast.type];
    if(f) return f(ast, ...settings);
    else return "any"
}

function typecheck(ast) {
    errors = [ ];
    for (const dec of ast) {
        try { infer(dec); } catch (e) { errors.push(e); }
    }
    return errors;
}

function dump() {
    for (const s of scopes) {
        console.log("--");
        for (const v of s) {
            console.log(v.name + ": " + tts(v.type));
        }
    }
}

exports.infer = infer;
exports.typecheck = typecheck;
exports.arrayOf = arrayOf;
exports.tableOf = tableOf;
exports.scopes = scopes;
exports.dump = dump;
exports.replaceGeneric = replaceGeneric;
exports.matchGeneric = matchGeneric;
exports.PRIMITIVE_TYPES = PRIMITIVE_TYPES;
// exports.typecheck = typecheck
