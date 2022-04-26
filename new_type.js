
const isEmpty = obj => obj 
    && Object.keys(obj).length === 0
    && Object.getPrototypeOf(obj) === Object.prototype;

const unify = require("heya-unify");
const $ = unify.variable;

const scopes = [ [ ], [ ] ]
let TYPE_ENV;

const PRIMITIVE_TYPES = [
    "str",
    "num",
    "bool",
    "nil",
    "any",
    "()"
]

const getScope = () => scopes[scopes.length - 1];

const getVar = name => {
    for (let i = scopes.length - 1; i > -1; i--) {
        const f = scopes[i].find(x => x.name == name);
        if(f) return f;
    }
}

const setVar = (name, type, scope = getScope()) => {
    let v = scope.find(x => x.name == name);
    if(v) {
        unifyTypes(v.type, type);
    }
    else {
        v = { name: name, type: type }
        scope.push(v);
    }
    return v;
}

let errors = [ ];

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

function isPrimitive(a) {
    if(typeof a === "string") {
        if(PRIMITIVE_TYPES.includes(a)) return true;
        else throw new Error("Unknown type: " + JSON.stringify(a, null, 2));
    }
    else if(a.type) return false;
    else throw new Error("Unknown type: " + JSON.stringify(a, null, 2));
}

let env;

// const typeVars = {
//     x: $("x"),
//     y: $("y"),
//     z: $("z"),
//     w: $("w"),
// }

// env = unify(typeVars.x, {
//     type: "array",
//     inner: typeVars.y
// }, env);

// env = unify(typeVars.z, typeVars.y, env);
// env = unify(typeVars.y, "str", env);
// env = unify(typeVars.w, typeVars.x, env);

// const stringify = x => JSON.stringify(x, null, 2);

// const TTS = t => {
//     if (typeof t === "string") {
//         if(PRIMITIVE_TYPES.includes(t)) {
//             return t;
//         }
//         else throw new Error("Attempted to convert type to string: " + t); 
//     }
//     else if(t.type) {

//     }
//     else throw new Error("Attempted to convert type to string: " + stringify(t)); 
// }

const unwrap = x => (x instanceof unify.Variable && x.bound(env))? unwrap(x.get(env)) : x;
const isUnbound = x => x instanceof unify.Variable && !x.bound(env);
// for (const k of Object.keys(typeVars)) {
//     console.log(k + ": " + JSON.stringify(unwrap(typeVars[k]), null, 2));
// }


const unifyTypes = (left, right) => {
    const oldEnv = env;
    env = unify(left, right, oldEnv);
    if(!env) {
        err("Could not unify types: " + tts(left) + " and " + tts(right));
        env = oldEnv;
        if(isUnbound(left)) env = unify(left, "any", env);
    }
}

const evaluators = { }
evaluators.string = () => "str";
evaluators.number = () => "num";
evaluators.fstring = () => "str";
evaluators.boolean = () => "bool";
evaluators.nil = () => "()";
evaluators.parenthesised = ast => infer(ast.inner);

evaluators.simple_def = ast => {
    const s = getScope();
    scopes.push([]);

    const typeVar = $(ast.name);
    setVar(ast.name, typeVar, s);
    unifyTypes(typeVar, infer(ast.value));

    scopes.pop();
}

evaluators.variable = ast => {
    let v = getVar(ast.name);
    if(!v) {
        const typeVar = $(ast.name);
        v = setVar(ast.name, typeVar, scopes[1]);
    }
    return v.type;
}

function infer(ast, ...settings) {
    if(!ast) throw new Error("Attempt to infer the type of nothing: " + JSON.stringify(ast, null, 2));
    const f = evaluators[ast.type];
    if(f) return f(ast, ...settings);
    else return "any"
}

const tts = y => {
    const ttsInner = t => {
        t = unwrap(t);
        if(isUnbound(t)) return "?"
        else if(isPrimitive(t)) return t;
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

function typecheck(ast) {
    errors = [ ];
    for (const dec of ast) {
        try { infer(dec); } catch (e) { errors.push(e); }
    }
    return errors;
}

function dump() {
    // for (const key in typeVars) {
    //     if (Object.hasOwnProperty.call(typeVars, key)) {
    //         const element = typeVars[key];
    //         console.log(key + ": " + tts(element));
    //     }
    // }
    for (const s of scopes) {
        console.log("--");
        for (const v of s) {
            console.log(v.name + ": " + tts(v.type));
        }
    }
}

exports.infer = infer;
exports.typecheck = typecheck;
// exports.arrayOf = arrayOf;
// exports.tableOf = tableOf;
// exports.scopes = scopes;
exports.dump = dump;
// exports.replaceGeneric = replaceGeneric;
// exports.matchGeneric = matchGeneric;
exports.PRIMITIVE_TYPES = PRIMITIVE_TYPES;

// const x = $("a");
// console.log(x.get(env));
