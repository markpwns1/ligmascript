
class AST {
    type

    constructor(t, other) {
        this.type = t;

        if(other) for (const val of Object.keys(other)) {
            this[val] = other[val];
        }
    }
}

exports.AST = AST;