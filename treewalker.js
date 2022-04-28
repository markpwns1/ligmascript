
class TreeWalker {

    onFound;
    onMissing;

    walkers = { };

    constructor(walkProperty, onFound, onMissing) {
        this.walkProperty = walkProperty;
        this.onFound = onFound;
        this.onMissing = onMissing;
    }

    walk(tree, ...settings) {
        if(tree == null) throw "Attempt to walk null.";
        const f = this.walkers[tree[this.walkProperty]];
        if(f) {
            if(this.walkOverride) return this.walkOverride(f, tree, ...settings);
            else return f(tree, ...settings);
        }
        else {
            if(this.onMissing) onMissing(f, tree, ...settings)
            else throw "No walker for: " + JSON.stringify(tree, null, 2);
        }
    }
}

exports.TreeWalker = TreeWalker;
