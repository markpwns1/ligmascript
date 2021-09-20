
{
    function ast(type, data) {
        return {
            type: type,
            ...(data || {})
        };
    }

    function getNth(list, n) {
        return list.map(x => x[n]);
    }

    function getItems(items) {
        if(items) return [ items[0], ...(items[1].map(x => x[3])) ];
        else return [ ];
    }
}

start = program

program = _ im:(import _)* defs:(definition _)+ _ ex:export? _ {
    return {
        definitions: getNth(defs, 0),
        imports: getNth(im, 0),
        export: ex || [ ]
    }
}

definition = simple_def / array_destructure / table_destructure

import = "import" _ name:string {
    return name.value
}

export = "export" _ names:identifier_list {
    return names
}

table_destructure_element = name:identifier _ "=" _ "." _ index:identifier {
    return {
        name: name,
        index: ast("string", { value: index })
    }
} / name:identifier _ "=" _ index:expression {
    return {
        name: name,
        index: index
    }
} / "." _ name:identifier {
    return {
        name: name,
        index: ast("string", { value: name })
    }
}

table_destructure = "let" _ "{" _ items:(table_destructure_element (_ TABLE_SEPARATOR _ table_destructure_element)* TABLE_SEPARATOR?) _ "}" _ "=" _ expr:expression {
    return ast("table_destructure", {
        pairs: getItems(items),
        value: expr
    })
}

identifier_list = items:(identifier (_ TABLE_SEPARATOR _ identifier)* TABLE_SEPARATOR?) {
    return getItems(items)
}

array_destructure = "let" _ "[" _ items:identifier_list _ "]" _ "=" _ expr:expression {
    return ast("array_destructure", {
        names: items,
        value: expr
    })
}

simple_def = "let" _ name:identifier _ "=" _ expr:expression {
    return ast("simple_def", {
        name: name,
        value: expr
    });
}

do_expr = "do" _ expr:expression _ "then" _ next:expression {
    return ast("do_expr", {
        expression: expr,
        next: next
    });
}

expression = when_expr / let_in_expr / value / do_expr

let_in_expr = def:definition _ "in" _ expr:expression {
    return ast("let_in_expr", {
        definition: def,
        expression: expr
    });
}

when_branch = "|" _ condition:expression _ TABLE_SEPARATOR _ value:expression _ {
    return {
        condition: condition,
        value: value
    }
}

when_expr = "cases" _ branches:when_branch+ _ "|" _ "else" _ TABLE_SEPARATOR _ else_value:expression {
    return ast("when_expr", {
        branches: branches,
        else_value: else_value
    });
}

value = boolean_op

boolean_op = left:equality _ op:("or" / "&") _ right:boolean_op {
    return ast("binop", {
        op: op,
        left: left,
        right: right
    }); 
} / equality

equality = left:comparative _ op:("==" / "~=") _ right:equality {
    return ast("binop", {
        op: op,
        left: left,
        right: right
    }); 
} / comparative

comparative = left:additive _ op:("<" / "<=" / ">" / ">=") _ right:comparative {
    return ast("binop", {
        op: op,
        left: left,
        right: right
    }); 
} / additive

additive = left:multiplicative _ op:("++" / "+" / "-" / "..") _ right:additive {
    return ast("binop", {
        op: op,
        left: left,
        right: right
    }); 
} / multiplicative

multiplicative = left:unary _ op:("*" / "/" / "%") _ right:multiplicative {
    return ast("binop", {
        op: op,
        left: left,
        right: right
    }); 
} / unary

unary = op:("~" / "-") _ right:unary {
    return ast("unary", {
        op: op,
        right: right
    });
} / exponent

exponent = left:monad _ op:"^" _ right:exponent {
    return ast("binop", {
        op: op,
        left: left,
        right: right
    });
} / monad

bind = _ ">>" _ right:application {
    return {
        type: "bind",
        right: right
    }
}

monad = left:application ops:(bind)+ {
    let e = left;
    while (ops.length > 0) {
        e = {
            left: e,
            ...ops.shift()
        };
    }
    return e;
} / application

application = "try" _ body:application false_branch:(_ "or" _ boolean_op)? {
    return ast("try_expr", {
        body: body,
        false_branch: false_branch? false_branch[3] : undefined
    });
} / f:traverse _ args:(traverse _)+ {
    return ast("application", {
        f: f,
        args: getNth(args, 0)
    });
} / traverse

method_call = ":" _ name:identifier _ args:(traverse _)+ {
    return {
        type: "method_call",
        name: name,
        args: getNth(args, 0)
    }
}

index = _ "#" _ index:terminal {
    return {
        type: "index",
        index: index
    }
}

property = _ "." _ name:identifier {
    return {
        type: "property",
        name: name
    }
}

traverse = table:terminal traversals:(index / property / method_call)+ {
    let e = table;
    while (traversals.length > 0) {
        e = {
            table: e,
            ...traversals.shift()
        };
    }
    return e;
} / terminal

terminal = number / bool / variable / parenthesised / string / nil / array_comprehension / array / table / function

string "string" = '"' parts:string_char* '"' { 
    let str = "";
    let ast_type = "string";
    let format_values = [ ];

    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (typeof part === "string") {
            str += part;
        }
        else {
            format_values.push(part.value);
            str += "%s";
            ast_type = "fstring";
        }
    }

    return ast(ast_type, {
        value: str.replace(/\n/g, "\\n").replace(/\r/g, ""),
        format_values: format_values
    });
}

string_char
    = !('"' / "\\" / "$") char:. { return char; }
    / "\\" sequence:. { return "\\" + sequence; }
    / "${" _ value: expression _ "}" { 
        return {
            value: value
        }
    }

string_escape
    = '"'
    / "\\"
    / "b"  { return "\b";   }
    / "f"  { return "\f";   }
    / "n"  { return "\n";   }
    / "r"  { return "\r";   }
    / "t"  { return "\t";   }
    / "v"  { return "\x0B"; }

parenthesised "parenthesised expression" = "(" _ inner:expression _ ")" {
    return ast("parenthesised", {
        inner: inner
    });
}

variable "variable" = name:identifier {
    return ast("variable", {
        name: name
    });
}

bool "boolean" = text:("true" / "false") {
    return ast("boolean", {
        value: text == "true"
    }); 
}

number "number" = digits:$([0-9]+("." [0-9]+)?) {
    return ast("number", {
        value: parseFloat(digits)
    });
}

nil "nil" = ("!" / "()") {
    return ast("nil");
}

array "array" = "[" _ items:(expression (_ TABLE_SEPARATOR _ expression)* TABLE_SEPARATOR?)? _ "]" {
    return ast("array", {
        items: getItems(items)
    });
}

array_comprehension = "[" _ expr:expression _ "|" _ in_var:identifier _ "<-" _ collection:expression filters:(_ "," _ expression)* _"]" {
    return ast("array_comprehension", {
        expression: expr,
        iter_var: in_var,
        collection: collection,
        filters: getNth(filters, 3)
    });
}

table_element = index:expression _ "=" _ value:expression {
    return {
        index: index,
        value: value
    }
} / "." _ index:identifier _ "=" _ value:expression {
    return {
        index: ast("string", { value: index }),
        value: value
    }
} / "." _ index:identifier {
    return {
        index: ast("string", { value: index }),
        value: ast("variable", { name: index })
    }
}

func_param = name:identifier _ defaultVal:("=" _ expression)? {
    return {
        name: name,
        defaultValue: defaultVal? defaultVal[2] : undefined
    }
}

parameter_list = items:(func_param (_ TABLE_SEPARATOR _ func_param)* TABLE_SEPARATOR?) {
    return getItems(items)
}

function "function" = "\\" _ parameters:(parameter_list / ".") _ arrow_type:("->" / "=>") _ expr:expression {
    return ast("function", {
        parameters: [ ...(arrow_type == "=>"? [ { name: "self" } ] : [ ]), ...(parameters == "."? [ ] : parameters) ],
        result: expr
    });
} 

TABLE_SEPARATOR = ";" / ","

table "table" = "{" _ items:(table_element (_ TABLE_SEPARATOR _ table_element)* TABLE_SEPARATOR?)? _"}" {
    return ast("table", {
        elements: getItems(items)
    });
}

KEYWORDS = "let" / "in" / "cases" / "else" / "do" / "then" / "or" / "try" / "export" / "import"

__ "whitespace" = [' '\t\r\n]+
_ "whitespace" = [' '\t\r\n]*

identifier "name" = !KEYWORDS x:$([_a-zA-Z][_a-zA-Z0-9]*) { return x }
