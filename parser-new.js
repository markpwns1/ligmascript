
const { AST } = require("./ast");
const SYMBOLS = require("./symbols").SYMBOLS;
const path = require("path");
// const types = require("./old_type");

const FRIENDLY_NAMES = {
    ...objectFlip(SYMBOLS),
    "identifier": "a word",
    "number": "a number",
    "string": "a string",
    "EOF": "end of file"
}

const OPS_TO_SYMBOLS = objectFlip(SYMBOLS, false);

function objectFlip(obj, addQuotes = true) {
    const ret = {};
    Object.keys(obj).forEach(key => {
      ret[obj[key]] = addQuotes? ("'" + key + "'") : key;
    });
    return ret;
}

function ast(type, firstToken, lastToken, props) {
    return new AST(type, {
        firstToken: firstToken,
        lastToken: lastToken,
        ...props
    });
}

const TRAVERSE_OPERATORS = [ "colon", "dot", "pound", "nullco" ];
const UNARY_OPS = [ "minus", "not", "ellipses" ];

const TRAVERSE_START_TOKENS = [ 
    "number", 
    "string", 
    "open_square", 
    "open_curly", 
    "identifier", 
    "backslash", 
    "dollar",
    "open_paren",
    "unit",
    "excl",
    "selfindex",
    "at"
]

const TRAVERSE_START_KEYWORDS = [
    "true",
    "false"
]

class Parser {

    tokens = [ ];
    offset = 0;
    filename;
    exports = [ ];
    errors = [ ];

    constructor(filename, tokens) {
        this.tokens = tokens;
        this.filename = filename;
    }

    static combineParseResults(a, b) {
        return {
            export: a.export.concat(b.export),
            definitions: a.definitions.concat(b.definitions),
            errors: a.errors.concat(b.errors)
        }
    }

    generateBinop(below, ...operators) {
        return () => {
            const instances = [ below() ];
            const ops = [ ];

            let t = this.peek();
            while(operators.includes(t.type) || operators.some(x => this.isKeyword(x))) {
                this.eat();
                ops.push(OPS_TO_SYMBOLS[t.type] || t.value);
                instances.push(below());
                t = this.peek();
            }

            let e = instances.shift();
            while(ops.length > 0) {
                const right = instances.shift();
                e = {
                    type: "binop",
                    op: ops.shift(),
                    left: e,
                    firstToken: e.firstToken,
                    right: right,
                    lastToken: right.lastToken
                }
            }

            return e;
        }
    }

    generateError(text, offender) {
        if(!offender) throw "NO OFFENDING TOKEN. ERROR TEXT: " + text;
        const pos = offender.pos;
        // console.log(offender);
        const error = Error("SYNTAX ERROR @ Ln " + pos.ln + ", col " + pos.col + " -- " + text);
        error.type = "parser";
        error.rawMessage = text;
        error.filename = this.filename;
        error.offset = pos.offset;
        error.pos = pos;
        error.length = offender.length;
        return error;
    }

    peek(offset = 0) {
        if(this.offset + offset >= this.tokens.length) {
            return this.tokens[this.tokens.length - 1];
        }
        // else if(this.offset < 0) {
        //     throw "wtf";
        // }

        // console.log(this.offset + offset);
        return this.tokens[this.offset + offset]
    }

    eat(type) {
        const t = this.peek();
        if(type && t.type != type) {
            throw this.generateError("Expected " + FRIENDLY_NAMES[type] + " but got " + t.friendlyName, t);
        }
        // if(t.value == "in") 
        // console.log("AT EIN");
        this.offset++;
        return t;
    }

    eatAny(...types) {
        const t = this.peek();
        if(!types.includes(t.type)) {
            throw this.generateError("Expected one of: " + types.slice(0, types.length - 1).map(x => FRIENDLY_NAMES[x]).join("; ") + " or " + FRIENDLY_NAMES[types[types.length - 1]] + ", but got " + t.friendlyName, t);
        }
        this.offset++;
        return t;
    }

    isOneOf(...types) {
        const t = this.peek();
        return types.includes(t.type);
    }

    eatAnyKeyword(...values) {
        const t = this.peek();
        if(t.type != "keyword" || !values.includes(t.value)) {
            throw this.generateError("Expected one of: " + values.slice(0, values.length - 1).join("; ") + " or " + FRIENDLY_NAMES[values[values.length - 1]] + ", but got " + t.friendlyName, t);
        }
        this.offset++;
        return t;
    }

    skip(amt = 1) {
        this.offset += amt;
    }

    skipAny(...types) {
        let t = this.peek();
        while (types.includes(t.type)) {
            this.offset++;
            t = this.peek();
        } 
    }

    identifier() {
        return this.eat("identifier");
    }

    keyword(value) {
        const t = this.peek();
        if(t.type != "keyword" || t.value != value) {
            throw this.generateError("Expected '" + value + "' but got " + t.friendlyName, t);
        }
        // if(t.value == "in") console.log("ATE IN");
        this.offset++;
        return t;
    }

    isKeyword(kind) {
        const t = this.peek();
        return t.type == "keyword" && t.value == kind;
    }

    recover() {
        while(!this.isKeyword("import") && !this.isKeyword("let") && !this.isKeyword("set") && this.peek().type != "EOF") {
            this.offset++;
        }
    }

    tryDo(errors, f) {
        try {
            return f();
        }
        catch (e) {
            errors.push(e);
            this.recover();
        }
    }

    match() {
        const begin = this.keyword("match");
        const expr = this.expression();

        const branches = [ ];
        while(this.peek().type == "union" && this.peek(1).type != "keyword" && this.peek(1).value != "else") {
            const patterns = [ ];
            while(this.peek().type == "union" && this.peek(1).type != "keyword" && this.peek(1).value != "else") {
                this.eat();
                const allVariables = new Set();
                const pattern = this.matchPattern(allVariables);

                const conditions = [ ];
                while(this.isOneOf("comma", "semicolon")) {
                    this.eat();
                    conditions.push(this.expression());
                }

                patterns.push({
                    pattern: pattern,
                    allVariables: Array.from(allVariables),
                    conditions: conditions
                });
            }
            
            // this.separator();
            this.eat("thin_arrow");
            const result = this.expression();

            for (const pattern of patterns) {
                branches.push(ast("match_branch", begin, result.lastToken, {
                    value: result,
                    ...pattern,
                }));
            }
        }

        this.eat("union");
        this.keyword("else");
        // this.separator();
        this.eat("thin_arrow");

        const elseValue = this.expression();

        return ast("match", begin, elseValue.lastToken, {
            expression: expr,
            branches: branches,
            else_value: elseValue
        });
    }

    matchTable(allVariables) {
        const begin = this.eat("open_curly");
        const elements = this.listOf(this.matchTableElement.bind(this, allVariables), "close_curly");
        return ast("match_table", begin, elements.end, {
            elements: elements.elements
        });
    }

    matchTableElement(allVariables) {

        const t = this.peek();
        let keyAST;
        let patternAST;

        if(t.type == "dollar") {
            this.eat();
            const key = this.identifier();
            
            const optional = this.peek().type == "question_mark";
            if(optional) this.eat();

            keyAST = ast("string", key, key, {
                value: key.value
            });
            patternAST = ast("match_variable", key, key, {
                name: key,
                optional: optional
            });
        }
        else if(t.type == "dot") {
            this.eat();
            const key = this.identifier();
            keyAST = ast("string", key, key, {
                value: key.value
            });

            if(this.peek().type == "equals") {
                this.eat();
                patternAST = this.matchPattern(allVariables);
            }
            else {
                patternAST = ast("match_expression", key, key, {
                    expression: ast("variable", key, key, {
                        name: key.value
                    })
                });
            }
        }
        else if(t.type == "pound") {
            this.eat();
            keyAST = this.expression();
            this.eat("equals");
            patternAST = this.matchPattern(allVariables);
        }
        else this.eatAny("dollar", "dot", "pound");
        
        return ast("match_table_element", t, patternAST.lastToken, {
            key: keyAST,
            pattern: patternAST
        });
    }

    matchPattern(allVariables) {

        // let mt;
        // if(this.peek().type == "lt") {
        //     this.eat();
        //     mt = this.expression();
        //     this.eat("gt");
        // }

        let mt;
        const o = this.offset;
        try {
            const _mt = this.expression();
            this.eat("square");
            mt = _mt;
        }
        catch (e) {
            this.offset = o;
        }

        const c = this.peek();
        const m = (() => { switch(c.type) {
            case "open_curly": return this.matchTable(allVariables);
            case "open_square": return this.matchArray(allVariables);
            case "dollar": return this.matchVariable(allVariables);
            default: return this.matchExpression();
        }})();

        return ast("match_pattern", c, m.lastToken, {
            metatable: mt,
            pattern: m
        });
    }

    matchArray(allVariables) {
        const begin = this.eat("open_square");
        const head = this.listOf(this.matchPattern.bind(this, allVariables), "ellipses", "triple_colon", "close_square");
        
        let tail;
        let collectiveTail;

        if(head.end.type == "ellipses") {
            tail = this.listOf(this.matchPattern.bind(this, allVariables), "close_square");
        } else if(head.end.type == "triple_colon") {
            collectiveTail = this.matchVariable(allVariables);
            this.eat("close_square");
        }

        const tailElements = tail? tail.elements : [ ];
        return ast("match_array", begin, tail? tail.end : head.end, {
            head: head.elements,
            tail: tailElements,
            collectiveTail: collectiveTail
        });
    }

    matchVariable(allVariables) {
        const begin = this.eat("dollar");
        const name = this.eat("identifier");
        const optional = this.peek().type == "question_mark";
        if(optional) this.eat();
        allVariables.add(name.value);
        return ast("match_variable", begin, name, {
            name: name,
            optional: optional
        });
    }

    matchExpression() {
        const expr = this.expression();
        return ast("match_expression", expr.firstToken, expr.lastToken, {
            expression: expr
        });
    }

    destructPattern(exportsAllowed) {
        const c = this.peek();
        switch(c.type) {
            case "open_curly": return this.destructTable(exportsAllowed);
            case "open_square": return this.destructArray(exportsAllowed);
            default: return this.destructVariable(exportsAllowed);
        }
    }

    destructVariable(exportsAllowed) {
        const isExport = this.isKeyword("export");
        let exportToken;
        if(isExport) {
            exportToken = this.keyword("export");
        }
        const name = this.eat("identifier");
        if(isExport) {
            this.exports.push(name);
            if(!exportsAllowed) 
                throw this.generateError("Cannot export local variable '" + name.value + "'", exportToken);
        }
        return ast("destruct_variable", name, name, {
            name: name,
            isExport: isExport
        });
    }

    destructArray(exportsAllowed) {
        const begin = this.eat();
        const head = this.listOf(this.destructPattern.bind(this, exportsAllowed), "ellipses", "triple_colon", "close_square");
        
        let tail;
        let collectiveTail;

        if(head.end.type == "ellipses") {
            tail = this.listOf(this.destructPattern.bind(this, exportsAllowed), "close_square");
        } else if(head.end.type == "triple_colon") {
            collectiveTail = this.destructVariable(exportsAllowed);
            this.eat("close_square");
        }

        const tailElements = tail? tail.elements : [ ];
        return ast("destruct_array", begin, tail? tail.end : head.end, {
            head: head.elements,
            tail: tailElements,
            collectiveTail: collectiveTail
        });
    }

    destructTableElement(exportsAllowed) {
        const begin = this.peek();

        if(this.isKeyword("export")) {
            this.eat();
            this.eat("dot");
            const name = this.eat("identifier");
            this.exports.push(name);

            if(!exportsAllowed)
                throw this.generateError("Cannot export local variable '" + name.value + "'", begin);

            return ast("destruct_table_element", begin, name, {
                pattern: ast("destruct_variable", name, name, {
                    name: name,
                    isExport: true
                }),
                key: ast("string", name, name, {
                    value: name.value
                })
            });
        }
        
        let index;
        let isDotIndex;
        let dotField;
        if(begin.type == "dot") {
            this.eat();
            dotField = this.eat("identifier");
            index = ast("string", dotField, dotField, {
                value: dotField.value
            });
            isDotIndex = true;
        }
        else if(begin.type == "pound") {
            this.eat();
            index = this.expression();
        }
        else {
            throw this.generateError("Expected '#' or '.' to index table", begin);
        }

        let pattern;
        if(this.peek().type == "equals") {
            this.eat();
            pattern = this.destructPattern(exportsAllowed);
        }
        else if(isDotIndex) {
            pattern = ast("destruct_variable", dotField, dotField, {
                name: dotField,
                isExport: false
            });
        }
        else this.eat("equals");

        return ast("destruct_table_element", begin, pattern.lastToken, {
            pattern: pattern,
            index: index
        });

        // [export] .foo
        // if(begin.type == "dot" || (begin.value == "export" && this.peek(1).type == "dot")) {
        //     const isExport = this.isKeyword("export");
        //     let exportToken;
        //     if(isExport) {
        //         exportToken = this.keyword("export");
        //     }
        //     this.eat("dot");
        //     const name = this.eat("identifier");
        //     if(isExport) {
        //         this.exports.push(name);
        //         if(!exportsAllowed) 
        //             throw this.generateError("Cannot export local variable '" + name.value + "'", exportToken);
        //     }
        //     return ast("destruct_table_element", begin, name, {
        //         pattern: ast("destruct_variable", name, name, {
        //             name: name,
        //             isExport: isExport
        //         }),
        //         index: ast("string", name, name, {
        //             value: name.value
        //         }),
        //         isExport: isExport
        //     });
        // }
        // // [export] foo <- .field
        // // [export] foo <- "expression"
        // else {
        //     const pattern = this.destructPattern(exportsAllowed);
        //     this.eat("left_thin_arrow");
        //     let index;
        //     if(this.peek().type == "dot") {
        //         this.eat("dot");
        //         const field = this.eat("identifier");
        //         index = ast("string", field, field, {
        //             value: field.value
        //         });
        //     }
        //     else {
        //         index = this.expression();
        //     }
        //     return ast("destruct_table_element", begin, index.lastToken, {
        //         pattern: pattern,
        //         index: index,
        //     });
        // }
    }

    destructTable(exportsAllowed) {
        const begin = this.eat();
        const elements = this.listOf(this.destructTableElement.bind(this, exportsAllowed), "close_curly");
        return ast("destruct_table", begin, elements.end, {
            elements: elements.elements
        });
    }

    program() {

        const imports = [ ];
        this.errors = [ ];
        const errors = this.errors;
        this.exports = [ ];

        while(this.isKeyword("import")) {
            this.eat();
            this.tryDo(errors, () => imports.push(this.string()));
        }

        const decs = [ ];

        while(true) {
            while(this.isKeyword("let") || this.isKeyword("set")) {
                this.tryDo(errors, () => {
                    const dec = this.declaration(true);
                    dec.isGlobal = true;
                    decs.push(dec);
                    // console.log("got here!!!!");
                });
            }

            if(/* !this.isKeyword("export") && */this.peek().type != "EOF") {
                errors.push(
                    this.generateError(
                        "Expected a 'let' or 'set' statement, but got " + this.peek().friendlyName, 
                        this.peek()));
                
                this.recover();
                continue;
            }

            break;
        }
            

        // let ex = [ ];
        // if(this.isKeyword("export")) {
        //     this.eat();
        //     this.tryDo(errors, () => {
        //         const items = this.listOf(this.variable.bind(this), "EOF");
        //         ex = items.elements
        //     });
        // }

        const t = this.peek();
        if(t.type == "keyword") {
            // if(t.value == "export") {
            //     errors.push(this.generateError("There can only be one export statement in a program.", t));
            // }
            // else 
            if(t.value == "import") {
                errors.push(this.generateError("Import statements must be placed before all declarations.", t));
            }
            // else {
            //     errors.push(this.generateError("An export statement must be the last statement in a program.", t));
            // }
        }
                // throw this.generateError("A program can ")
            // if(this.peek().type == "EOF") {
            //     this.eat();
            // }
            // else {
                
            // }

        
        // while(false);
        
        this.tryDo(errors, () => this.eat("EOF"));

        return {
            imports: imports,
            export: this.exports,
            definitions: decs,
            errors: errors
        }
    }

    foreign() {
        const begin = this.keyword("foreign");
        const name = this.identifier();
        this.eat("square");
        const type = this.typeExpression();
        return ast("foreign_dec", begin, type.lastToken, {
            name: name,
            type: type
        });
    }

    expression() {
        if(this.isKeyword("let")) {
            return this.letIn();
        }
        else if(this.isKeyword("set")) {
            return this.assignment();
        }
        else if(this.isKeyword("do")) {
            return this.do();
        }
        else if(this.isKeyword("cases")) {
            return this.cases();
        }
        else if(this.isKeyword("match")) {
            return this.match();
        }
        else if(this.isKeyword("if")) {
            return this.ifExpr();
        }
        else {
            const t = this.peek();
            switch(t.type) {
                case "thin_arrow": {
                    this.eat();
                    const body = this.expression();
                    return ast("function", t, body.lastToken, {
                        parameters: [ ],
                        result: body
                    });
                }
    
                case "arrow": {
                    this.eat();
                    const body = this.expression();
                    return ast("function", t, body.lastToken, {
                        parameters: [ { name: ast("identifier", t, t, { value: "self" }), token: t, variadic: false } ],
                        result: body
                    });
                }

                default: return this.booleanOp();
            }
        }
    }

    ifExpr() {
        const begin = this.keyword("if");
        const cond = this.expression();
        this.keyword("then");
        const trueBody = this.expression();
        let falseBody;
        if(this.peek().type == "keyword" && this.peek().value == "else") {
            this.keyword("else");
            falseBody = this.expression();
        }
        else {
            falseBody = ast("nil", trueBody.firstToken, trueBody.lastToken);
        }

        return ast("when_expr", begin, falseBody.lastToken, {
            branches: [ {
                condition: cond,
                value: trueBody
            } ],
            else_value: falseBody
        }); 
    }

    cases() {
        const begin = this.keyword("cases");

        const branches = [ ];
        while(this.peek().type == "union" && this.peek(1).type != "keyword" && this.peek(1).value != "else") {
            this.eat();
            const condition = this.expression();
            // this.separator();
            this.eat("thin_arrow");
            const result = this.expression();
            branches.push({
                condition: condition,
                value: result
            });
        }

        this.eat("union");
        this.keyword("else");
        // this.separator();
        this.eat("thin_arrow");

        const elseValue = this.expression();

        return ast("when_expr", begin, elseValue.lastToken, {
            branches: branches,
            else_value: elseValue
        });
    }

    do() {
        const begin = this.keyword("do");

        const res = this.listOfKeywordTerminated(this.expression.bind(this), "then", "end");
        
        let next;
        // console.log(this.peek().type);
        if(res.end.value == "then") {
            next = this.expression();
        }
        else {
            next = ast("nil", res.end, res.end);
        }

        return ast("do_expr", begin, next.lastToken, {
            expressions: res.elements,
            next: next
        });
    }

    letIn() {
        const dec = this.declaration();
        let expr;
        let hasInBranch;
        // console.log(this.peek());
        if(hasInBranch = this.isKeyword("in")) 
        {
            // this.eat();
            this.keyword("in");
            // console.log(this.peek());
            expr = this.tryDo(this.errors, this.expression.bind(this));
            // hasInBranch = true;
        }
        
        if(!expr || !hasInBranch) {
            expr = ast("nil", dec.firstToken, dec.lastToken, {
                fake: true
            });
            hasInBranch = false;
        }

        return ast("let_in_expr", dec.firstToken, expr.lastToken, {
            declaration: dec,
            expression: expr,
            hasInBranch: hasInBranch
        });
    }

    assignment() {
        const begin = this.keyword("set");
        const left = this.traverse(true);
        this.eat("equals");
        const right = this.expression();
        return ast("assignment", begin, right.lastToken, {
            left: left,
            right: right
        });
    }

    declaration(isTopLevel = false) {
        if(this.isKeyword("let")) {
            const begin = this.keyword("let");
            const pattern = this.destructPattern(isTopLevel);
            this.eat("equals");
            const value = this.tryDo(this.errors, this.expression.bind(this));
            return ast("let_stmt", begin, value? (value.lastToken || pattern.lastToken) : pattern.lastToken, {
                pattern: pattern,
                value: value
            });
        }
        else if(this.isKeyword("set")) {
            return this.assignment();
        }
        else {
            throw this.generateError("Expected a 'let' or 'set' statement, but got " + this.peek().friendlyName, this.peek());
        }
    }
    
    multiplicative = this.generateBinop(this.unary.bind(this), "times", "divide", "floor_div", "percent");
    
    additive = this.generateBinop(this.multiplicative.bind(this), "plus", "minus", "str_concat", "array_concat");

    comparative = this.generateBinop(this.additive.bind(this), "lt", "gt", "geq", "leq");

    equality = this.generateBinop(this.comparative.bind(this), "eq", "neq");
    
    booleanOp = this.generateBinop(this.equality.bind(this), "or", "and");

    unary() {
        const t = this.peek();
        if(UNARY_OPS.includes(t.type)) {
            this.eat();
            const right = this.unary();
            return ast("unary", t, right.lastToken, {
                op: OPS_TO_SYMBOLS[t.type],
                right: right
            });
        }
        else {
            return this.exponent();
        }
    }
    
    // (A ∨ (¬A ∧ B)) ⊢ (A ∨ B)

    exponent = this.generateBinop(this.application.bind(this), "exponent");
    // exponent = this.generateBinop(this.typeAnnotation.bind(this), "exponent");

    // typeExpression() {
    //     return this.typeFunction();
    // }

    // typeFunctionArg() {
    //     const t = this.typeTerminal();
    //     let variadic = false;
    //     let vToken;
    //     if(this.peek().type == "ellipses") {
    //         vToken = this.eat();
    //         variadic = true;
    //     }
    //     return {
    //         type: t,
    //         variadic: variadic,
    //         vToken: vToken
    //     }
    // }

    // typeFunction() {
    //     const o = this.offset;
    //     this.typeTerminal();
    //     const lookAhead = this.peek().type;
    //     this.offset = o;

    //     if(lookAhead == "comma" || lookAhead == "semicolon" || lookAhead == "thin_arrow" || lookAhead == "ellipses") {

    //         const args = this.listOf(this.typeFunctionArg.bind(this), "thin_arrow");
    //         for (let i = 0; i < args.elements.length; i++) {
    //             if(args.elements[i].variadic && i != args.elements.length - 1)
    //                 throw this.generateError("The variadic argument must be the last argument in a function.", args.elements[i].vToken);
    //         }

    //         const right = this.typeTerminal();

    //         let f = {
    //             type: "function",
    //             args: args.elements.map(x => x.type),
    //             variadic: args.elements.some(x => x.variadic),
    //             result: right
    //         };

    //         for (let i = 0; i < f.args.length; i++) {
    //             // console.log(f);
    //             const replacements = types.matchGeneric(f.args[i], f.args[i]);
    //             for (const r of replacements) {
    //                 f = types.replaceGeneric(f, r.generic, r.bound);
    //             }
    //         }

    //         return f;
    //     }
    //     else return this.typeTerminal();

    // }

    // typeSuperset() {
    //     if(this.peek().type == "identifier") {
    //         const o = this.offset;
    //         const name = this.identifier();
    //         if(!PRIMITIVE_TYPES.includes(name) && ) {
                
    //         }
    //         else {
    //             this.offset = 0;
    //         }
    //     }
    //     else return this.typeTerminal();
    // }

    // typeTable() {
    //     this.eat("open_curly");
    //     const field = () => {
    //         const name = this.identifier();
    //         this.eat("square");
    //         const type = this.typeTerminal();
    //         return {
    //             field: name,
    //             type: type
    //         }
    //     }
    //     const pairs = this.listOf(field, "close_curly");
    //     return types.tableOf(pairs.elements);
    // }

    // typeTerminal() {
    //     const t = this.peek();
    //     if(t.type == "unit") {
    //         this.eat();
    //         return "()";
    //     }
    //     else if(t.type == "identifier") {
    //         this.eat();
    //         if(types.PRIMITIVE_TYPES.includes(t.value)) {
    //             return t.value
    //         }
    //         else {
    //             let extending;
    //             if(this.peek().type == "geq") {
    //                 this.eat();
    //                 extending = this.typeTable();
    //             }
    //             return {
    //                 type: "generic",
    //                 name: t.value,
    //                 extending: extending
    //             }
    //         }
    //         // else throw this.generateError("Expected a primitive type but got '" + t.value + "'.", t);
    //     }
    //     else if(t.type == "open_paren") {
    //         this.eat();
    //         const inner = this.typeExpression();
    //         this.eat("close_paren");
    //         return inner;
    //     }
    //     else if(t.type == "open_square") {
    //         this.eat();
    //         const inner = this.typeExpression();
    //         this.eat("close_square");
    //         return types.arrayOf(inner);
    //     }
    //     else if(t.type == "open_curly") {
    //         return this.typeTable();
    //     }
    //     else throw this.generateError("Expected a type, but got " + (FRIENDLY_NAMES[t.type] || t.type) + ".", t);
    // }

    // typeAnnotation() {
    //     if(this.peek().type == "dollar") {
    //         const begin = this.eat();
    //         const type = this.typeExpression();
    //         this.eat("square");
    //         const right = this.application();
    //         return ast("type_annotation", begin, right.lastToken, {
    //             annotation: type,
    //             expression: right
    //         });
    //     }
    //     else return this.application();
    // }

    variable() {
        const t = this.eat("identifier");
        return ast("variable", t, t, { name: t.value });
    }

    application() {
        if(this.isKeyword("try")) {
            return this.try();
        }
        else {
            const left = this.traverse();

            const args = [ ];
            let t = this.peek();
            while(TRAVERSE_START_TOKENS.includes(t.type) || (t.type == "keyword" && TRAVERSE_START_KEYWORDS.includes(t.value))) {
                args.push(this.traverse());
                t = this.peek();
            }

            // do {
            //     let o = this.offset;
            //     try {
            //         args.push(this.traverse());
            //     } catch {
            //         this.offset = o;
            //         break;
            //     }
            // } while (true);

            if(args.length < 1) {
                return left;
            } 
            else {
                return ast("application", left.firstToken, args[args.length - 1].lastToken, {
                    f: left,
                    args: args
                });
            }
        }
    }

    try() {
        const begin = this.keyword("try");
        const body = this.application();
        let falseBranch;
        let end = body.lastToken;
        if(this.isKeyword("or")) {
            this.eat();
            falseBranch = this.booleanOp();
            end = falseBranch.lastToken;
        }
        return ast("try", begin, end, {
            body: body,
            false_branch: falseBranch
        });
    }

    methodCall() {
        this.eat("colon");
        const name = this.identifier();
        
        const args = [ ];
        do {
            let o = this.offset;
            try {
                args.push(this.traverse());
            } catch {
                this.offset = o;
                break;
            }
        } while (true);

        if(args.length == 0)
            throw this.generateError("Expected one or more arguments to the method '" + name.value + "' but got " + this.peek().friendlyName, this.peek());

        return {
            type: "method_call",
            name: name,
            args: args,
            lastToken: args[args.length - 1].lastToken
        }
    }

    index() {
        this.eat("pound");
        const index = this.terminal();
        return {
            type: "index",
            index: index,
            lastToken: index.lastToken
        }
    }

    property() {
        this.eat("dot");
        const t = this.eat("identifier");
        return {
            type: "property",
            name: t,
            lastToken: t
        }
    }

    nullCoalesce() {
        this.eat("nullco");
        const t = this.eat("identifier");
        return {
            type: "nullco",
            name: t,
            lastToken: t
        }
    }

    traverse(lvalue = false) {
        let e = this.terminal();
        const begin = e.firstToken;
        let t = this.peek();
        while(TRAVERSE_OPERATORS.includes(t.type)) {

            let traversal;
            switch(t.type) {
                case "dot": { traversal = this.property(); break }
                case "pound": { traversal = this.index(); break }
                case "colon": { traversal = this.methodCall(); break }
                case "nullco": { traversal = this.nullCoalesce(); break }
            }

            e = {
                firstToken: begin,
                table: e,
                ...traversal
            }

            t = this.peek();
        }

        if(e.type == "method_call" && lvalue) {
            throw this.generateError("A method call cannot be on the left hand side of an equals operation", e.firstToken);
        }

        return e;
    }

    terminal() {
        const t = this.peek();
        switch(t.type) {

            case "at": {
                this.eat();
                return ast("variable", t, t, { name: "self" });
            }

            case "selfindex": {
                this.eat();
                return ast("property", t, t, { 
                    table: ast("variable", t, t, { name: "self" }),
                    name: t
                });
            }

            case "number": {
                this.eat();
                return ast("number", t, t, { value: t.value });
            }

            case "string": return this.string();

            case "identifier": return this.variable();

            case "excl":
            case "unit": {
                this.eat();
                return ast("nil", t, t);
            }

            case "open_paren": {
                this.eat();
                const inner = this.expression();
                this.eat("close_paren");
                return inner;
            }

            case "open_square": {
                const o = this.offset;
                this.eat();
                
                if(this.peek().type == "close_square") {
                    this.offset = o;
                    return this.array();
                }
                else {
                    this.expression();
                }

                if(this.peek().type == "union") {
                    this.offset = o;
                    return this.arrayComprehension();
                }
                else {
                    this.offset = o;
                    return this.array();
                }
            }

            case "open_curly": {
                return this.table();
            }

            case "backslash": {
                return this.function();
            }

            case "dollar": {
                this.eat();
                return this.expression();
            }

            case "keyword": {
                switch(t.value) {
                    case "true":
                    case "false": {
                        this.eat();
                        return ast("boolean", t, t, { value: t.value == "true" });
                    }
                }
            }
        }

        throw this.generateError("Expected a value or a parenthesised expression, but got " + t.friendlyName, t);
    }

    separator() {
        this.eatAny("comma", "semicolon");
    }

    string() {
        const t = this.eat("string");
        return ast(
            t.interpolations.length == 0? "string" : "fstring", 
            t, t,
            {
                value: t.value,
                format_values: t.interpolations.map(x => new Parser(this.filename, x).expression())
            }
        );
    }

    functionParameter() {
        const name = this.eat("identifier");

        let variadic = false;
        if(this.peek().type == "ellipses") {
            this.eat();
            variadic = true;
        }

        let value;
        if(this.peek().type == "equals") {
            this.eat();
            value = this.expression();
        }

        return {
            name: name,
            variadic: variadic,
            defaultValue: value
        }
    }

    function() {
        const begin = this.eat("backslash");
        const args = (() => {
            const a = [ ]
            const t_tok = this.peek();
            let t = t_tok.type;
            if(t == "dot") {
                this.eat();
                const eaten = this.eatAny("arrow", "thin_arrow");
                return [ 
                    { 
                        name: ast("identifier", t_tok, t_tok, { 
                            value: eaten.type == "thin_arrow"? "_" : "self" 
                        }), 
                        token: t_tok, 
                        variadic: false 
                    } 
                ];
            }
            else {
                while(t != "arrow" && t != "thin_arrow") {
                    a.push(this.functionParameter());
                    const tok = this.peek();
                    t = tok.type;
                    if(t == "comma" || t == "semicolon") {
                        this.eat();
                    }
                    else if(t != "arrow" && t != "thin_arrow") {
                        throw this.generateError("Expected '->' or '=>' to begin function declaration, but got " + tok.friendlyName, tok);
                    }
                    else {
                        if(t == "arrow")
                            a.unshift({ 
                                name: ast("identifier", tok, tok, { value: "self" }),
                                token: tok,
                                variadic: false 
                            });
                        
                        this.eatAny("arrow", "thin_arrow");
                        return a;
                    }
                }

                const tok = this.peek();
                if(tok.type == "arrow")
                    a.unshift({ 
                        name: ast("identifier", tok, tok, { value: "self" }),
                        token: tok,
                        variadic: false 
                    });
                
                this.eatAny("arrow", "thin_arrow");
                return a;
            }
        })();

        for (let i = 0; i < args.length; i++) {
            if(args[i].variadic && i != args.length - 1)
                throw this.generateError("The variadic argument must be the last argument in a function.", args[i].token);
        }

        const body = this.expression();
        const end = body.lastToken;

        return ast("function", begin, end, {
            parameters: args,
            result: body
        });
    }

    tableElement() {
        const c = this.peek().type;
        if(c == "dot") {
            this.eat();
            const name = this.eat("identifier");
            const key = ast("string", name, name, { value: name.value });
            let value;
            if(this.peek().type == "equals") {
                this.eat();
                value = this.expression();
            }
            else {
                value = ast("variable", name, name, { name: name.value });
            }
            return {
                index: key,
                value: value
            }
        }
        else if(c == "pound") {
            this.eat();
            const key = this.expression();
            this.eat("equals");
            const val = this.expression();
            return {
                index: key,
                value: val
            }
        }
        else {
            throw this.generateError("Expected \"#\" or \".\" to begin a table key, but got " + this.peek().friendlyName, this.peek());
        }
    }

    listOf(parseFunction, ...endingTokens) {
        const elements = [ ];

        while(!endingTokens.includes(this.peek().type)) {
            elements.push(parseFunction());
            const t = this.peek().type;
            if(t == "comma" || t == "semicolon") {
                this.eat();
            }
            else {
                const end = this.eatAny(...endingTokens);
                return {
                    elements: elements,
                    end: end
                }
            }
        }

        const end = this.eatAny(...endingTokens);
        return {
            elements: elements,
            end: end
        }
    }

    listOfKeywordTerminated(parseFunction, ...endingKeywords) {
        const elements = [ ];

        while(!endingKeywords.includes(this.peek().type)) {
            elements.push(parseFunction());
            const t = this.peek().type;
            if(t == "comma" || t == "semicolon") {
                this.eat();
            }
            else {
                const end = this.eatAnyKeyword(...endingKeywords);
                return {
                    elements: elements,
                    end: end
                }
            }
        }

        const end = this.eatAnyKeyword(...endingTokens);
        return {
            elements: elements,
            end: end
        }
    }

    table() {
        const begin = this.eat("open_curly");

        const items = this.listOf(this.tableElement.bind(this), "close_curly");

        return ast("table", begin, items.end, {
            elements: items.elements
        });
    }

    arrayComprehension() {
        const begin = this.eat("open_square");
        const expr = this.expression();
        this.eat("union");
        const inVar = this.identifier();
        this.eat("left_thin_arrow");
        const collection = this.expression();
        const filters = [ ]
        while(this.peek().type == "comma" || this.peek().type == "semicolon") {
            this.eat();
            filters.push(this.expression());
        }
        const end = this.eat("close_square");
        return ast("array_comprehension", begin, end, {
            expression: expr,
            iter_var: inVar,
            collection: collection,
            filters: filters
        });
    }

    array() {
        const begin = this.eat("open_square");

        const items = this.listOf(this.expression.bind(this), "close_square");

        return ast("array", begin, items.end, {
            elements: items.elements
        });

        // const elements = [ ];
        // while(this.peek().type != "close_square") {
        //     elements.push(this.expression());
        //     const t = this.peek().type;
        //     if(t == "comma" || t == "semicolon") {
        //         this.eat();
        //     }
        //     else {
        //         const end = this.eat("close_square");
        //         return ast("array", begin, end, {
        //             items: elements
        //         });
        //     }
        // }

        // const end = this.eat("close_square");
        // return ast("array", begin, end, {
        //     items: elements
        // });
    }

}

exports.Parser = Parser;
exports.ast = ast;