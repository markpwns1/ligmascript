
const fs = require("fs");
const { Scanner } = require("./scanner");
const { Parser } = require("./parser-new");
const types = require("./type");

const source = fs.readFileSync("src.t", "utf-8");
const scanner = new Scanner().scan(source);
const parser = new Parser(scanner.tokens);
const ast = parser.program();


types.resolveTypes(ast.definitions);
// console.log(JSON.stringify(types.resolveTypes(ast.definitions), null, 2));

console.log(JSON.stringify(types.scopes, null, 2));
