
const fs = require("fs");
const path = require("path");

const INPUT_FILE = process.argv[2];
const OUTPUT_FILE = process.argv[3] || (INPUT_FILE.substring(0, INPUT_FILE.lastIndexOf(".")) + ".lua");

const generateError = (ast, msg) => {
    
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

