
// const fs = require("fs");
const { Scanner } = require("./scanner");
const { Parser } = require("./parser-new");
// const types = require("./type");
const analyser = require("./analysis");

// const source = fs.readFileSync("src.t", "utf-8");

let filename = "test2/a.li";

const anal = analyser.analyse(filename);
console.log(JSON.stringify(anal.variables.map(x => x.name), null, 2));

// const scanned = new Scanner().scanFile(filename);
// const p = new Parser(filename, scanned.tokens);
// console.log(JSON.stringify(p.program(), null, 2));
