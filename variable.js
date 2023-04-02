
class Variable {
    name;
    global;
    scope;
    exported = false;
    decno;
    type;
    depth;
    used = false;

    toString() {
        return `$${this.name}`;
    }
}

exports.Variable = Variable;
