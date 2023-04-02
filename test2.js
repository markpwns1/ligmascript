
// const fs = require("fs");
const { Scanner } = require("./scanner");
const { Parser } = require("./parser-new");
// const types = require("./type");
const analyser = require("./analysis");

// const source = fs.readFileSync("src.t", "utf-8");

let filename = "test2/b.li";

// const anal = analyser.analyse(filename);
// console.log(JSON.stringify(anal.errors, null, 2));

const scanned = new Scanner().scanFile(filename);
const p = new Parser(filename, scanned.tokens);
console.log(JSON.stringify(p.program().errors, null, 2));
