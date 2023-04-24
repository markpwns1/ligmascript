const SYMBOLS = {
    ":::": "triple_colon",
    "...": "ellipses",
    "::": "square",
    "?.": "nullco",
    "~=": "neq",
    "==": "eq",
    ">=": "geq",
    "<=": "leq",
    "=>": "arrow",
    "->": "thin_arrow",
    "<-": "left_thin_arrow",
    "..": "str_concat",
    "++": "array_concat",
    "//": "floor_div",
    "()": "unit",
    "^": "exponent",
    "+": "plus",
    "-": "minus",
    "*": "times",
    "/": "divide",
    "=": "equals",
    "!": "excl",
    "~": "not",
    ".": "dot",
    ":": "colon",
    ",": "comma",
    "<": "lt",
    ">": "gt",
    "#": "pound",
    "[": "open_square",
    "]": "close_square",
    "(": "open_paren",
    ")": "close_paren",
    "{": "open_curly",
    "}": "close_curly",
    ";": "semicolon",
    "?": "question_mark",
    "|": "union",
    "@": "at",
    "%": "percent",
    "&": "and",
    "$": "dollar",
    "\\": "backslash"
};

const KEYWORDS = [
    "let", 
    "in", 
    "cases", 
    "else", 
    "do", 
    "then", 
    "or", 
    "try", 
    "export", 
    "import",
    "true",
    "false",
    "nil",
    "match",
    "vmatch",
    "if",
    "end",
    "set"
]

exports.SYMBOLS = SYMBOLS;
exports.KEYWORDS = KEYWORDS;
