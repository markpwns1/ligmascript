# LIGMAScript

## Warning: LIGMAScript is currently a Work-in-Progress - Use at your own risk!

Ligmascript is a dynamically-typed impure functional language that transpiles to Lua, built with practicality and interoperability with Lua codebases in mind. Ligmascript is exactly the kind of toolset that makes functional programming in Lua as seamless and practical as possible.

LIGMA stands for Lua-Interoperable General Machine Abstraction.

## Features
- A more concise and expressive syntax geared toward functional programming
- A simple, lightweight, file-based module system
- Easy prototypes, inheritance, and structures
- String interpolation, list comprehension, default function arguments, table and list destructuring, and more
- Extremely powerful pattern matching based on syntactic unification that supports non-constant match patterns, optional match variables, and multiple patterns in one branch
- A minimal preamble with many common FP utilities
- Support for imperative programming and side-effects (use at your own risk!)
- High-quality compile-time error checking and runtime errors that point to file locations in the original source code
- All with minimal overhead, compiling to straightforward Lua code ideal for the JIT compiler
- In addition, a VSCode extension and language server (experimental)

### Table of Contents
1. [Sample](#sample)
2. [Installation](#installation)
3. [Usage](#usage)
4. [Language](#language)
5. [Example](#example)
6. [The "How & Why" of Ligmascript](#how--why)

## Sample
Here is a sample of the slice function, taken from `preamble.li`:
```lua
-- copies a slice of an array starting from "first" to optionally "last"
let export slice = \b, first, last = len b -> cases
    | type b == "string" -> string.sub b first last
    | else -> cases
        | first >= last -> [ b #first ]
        | else -> [ b #first ] ++ slice b (first + 1) last
```

Let's analyse this code:
- `let export slice = ...` - declares a variable named `slice` that is accessible from other files
- `\b, first, last = len b -> ...` - defines an anonymous function with three arguments, `b`, `first`, and `last`, with `last` having a default value of `len b` (length of `b`), should the user omit `last` when calling the function.
- `cases | type b == "string" -> ... | else -> ...` - checks whether the type of `b` is a string. This line could have just as easily been an if-statement.
- `string.sub b first last` - equivalent to Lua's `string.sub(b, first, last)`
- `cases | first >= last -> [ b # first ]` - if `first >= last`, return a list with only one element, which is the element of `b` at index `first`. `x # y` is equivalent to Lua's indexing syntax `x[y]`.
- `| else -> [ b # first ] ++ slice b (first + 1) last` - otherwise, return the same as the above, but also append the rest of the slice recursively.

## Installation
As this is a work-in-progress and not quite ready for mass usage, you'll have to install Ligmascript by cloning the repo with `git clone "https://github.com/markpwns1/ligmascript"`. Ligmascript runs on Node, but has no dependencies, so that is the only step.

## Usage
Again, as this is a work-in-progress, the command-line interface for the compiler is very minimal. To compile a file, run `node index.js <entry file> [output dir]`. Any other files in your project will automatically be compiled by analysing the `import` statements in your project. So for example, `node index.js "src/main.li" "out"` will compile `src/main.li` and generate `out/main.lua`, along with some other automatically generated files, necessary for the functioning of Ligmascript programs.

## Language
Ligmascript's syntax and standard library are ergonomic and designed for functional programming, whereas much of Ligmascript's semantics are equivalent to Lua.

### Semantics, Booleans, Numbers
Equivalent to Lua, except numbers can only be written in decimal format

### Comments
For single-line comments, use `-- my comment`, and for block comments, use `--[ my comment ]`. Block comments can be nested.

### Nil
There are three ways to represent Lua's `nil` in Ligmascript. They are:
- `nil`
- `()`
- `!`

### Strings
Strings in Ligmascript are multiline by default, and support string interpolation. See the following example:
```
"five plus 
six equals
${5 + 6}"
--
string.format("five plus\nsix equals\n%s", 5 + 6)
```

Strings can now also be indexed. The index operator in Ligmascript is `#`.
```
"hello" #1
--
"hello"[1]
```

Some useful string functions:
- `string.trim :: string -> string` - strips all leading and trailing whitespace from a string

### Variables
You can declare variables using `let ... = ... [in ...]`
For example,
```
let x = 
	let y = 3 in
	let z = 4 in
	y + z
--
local y = 3
local z = 4
local x = y + z
```

### Operators
Ligmascript's operators differ slightly from Lua. Ligmascript also has no bitwise operators,
| Ligmascript | Lua |
| - | - |
| `~x` | `not x` |
| `a # i` | `a[i]` |
| `a & b` | `a and b` |
| `a ++ b` | `concat(a, b)` |
| `...x` | `unpack(x)` |
| `a .. b` | `a .. b` |
| `f $ g $ x` | `f(g(x))` |

### Simple Branching
Ligmascript has an `if` expression and a `cases` expression. The `if` expression is self explanatory:
```
let f = \x -> if x == 1 then 0 else 1
--
local function f(x)
	if x == 1 then return 0 else return 1 end
end
```
The `else` branch is optional.

The `cases` statement is identical to an `if-elseif-elseif-else` statement. The `else` branch is mandatory.
```
let f = \x -> cases
	| x == 1 -> 2
	| x == 2 -> 3
	| else -> 4
--
local function f(x)
	if x == 1 then return 2 
	elseif x == 2 then return 3
	else return 4 end
end
```

### Lists
Lists in Ligmascript are declared with square brackets. They compile to plain Lua tables. Trailing commas are not allowed.
```
let x = [ 1, 2, 3 ]
--
local x = { 1, 2, 3 }
```

Commas are interchangeable with semicolons.
```
let x = [ 1; 2; 3 ]
```

Lists can be indexed with the `#` operator, like strings and tables. Lists are one-indexed as in Lua.

Lists can be destructured easily using the following syntactic sugar:
```
let [ a, b, c ] = [ 1, 2, 3 ]
--
local l = { 1, 2, 3 }
local a = l[1]
local b = l[2]
local c = l[3]
```

You can also destructure lists in other cool ways, like the `...` operater in the pattern which will make the rest of the variables grab the last elements of the list
```
let [ a, b ... second_last, last ] = [ 1, 2, 3, 4, 5 ]
--
local l = { 1, 2, 3, 4, 5 }
local a = l[1]
local b = l[2]
local second_last = l[#l-1]
local last = l[#l]
```

And there is one final way to destructure lists, which is the classical functional head-tail style:
```
let [ x1, x2 ::: xs ] = [ 1, 2, 3, 4, 5 ]
--
local l = { 1, 2, 3, 4, 5 }
local x1 = l[1]
local x2 = l[2]
local xs = slice(a, 3, #a, 1) -- sets xs = { 3, 4, 5 }
```

Some useful list-related functions:
- `count :: [a] -> number` - number of elements in a list
- `concat :: [a] -> [b] -> [a | b]` - concatenates two lists
- `pairset :: [a] -> [[number, a]]` - returns a list of key-value pairs where the key is the index of each element
- `head`, `tail` - same as every other functional language
- `last :: [a] -> a` - returns the last element in a list
- `body :: [a] -> [a]` - returns all but the last element in a list

### Tables
Tables in Ligmascript are similar to those in Lua. Once again, commas are interchangeable with semicolons. Trailing semicolons/commas are allowed.
```
let t = {
	.x = 1,
	.y = 2,
	.z = 3
}
--
local t = {
	x = 1,
	y = 2,
	z = 3
}
```

To use an arbitrary value as a key in the table, use `#` instead of `.`
```
let x = "hello"
let t = {
	#x = 1,
	#2 + 3 = "foo"
}
--
local x = "hello"
local t = {
	[x] = 1,
	[2 + 3] = "foo"
}
```

And finally, there is syntactic sugar for when you want to include a variable in a list such that the variable's name is the key in the table.
```
let x = 1
let y = 2
let t = { .x, .y }
--
local x = 1
local y = 2
local t = { x = x, y = y }
```

Tables can be indexed with the `#` operator, like strings and lists. In addition, the dot operator can be used to traverse a table.
```
let t = { .x = 1, .y = 2 }
let a = t.x -- a equals 1
--
local t = { x = 1, y = 2 }
local a = t.x -- a equals 1
```
An attempt to index a non-existent key in the table will simply return `nil`, as in Lua.

Ligmascript has a null coalescing operator `?.` which acts like a normal dot access, but when chained, if any access returns nil, the chain will return nil without returning an error.
```
let t = { .a = { .b = { } } }
let x = t?.a?.b?.c?.d -- x = nil
--
local t = { a = { b = { } } }
local x = (function()
	if t and t.a and t.a.b and t.a.b.c then
		return t.a.b.c.d
	else
		return nil
	end
end)()
```

Some useful table functions:
- `count :: {a, b} -> number` - returns the number of values in a table
- `table.merge :: {a, b} -> {c, d} -> {a | b, c | d}` - returns a new table equal to the two tables merged together. **The new table has the same metatable as the first table**.
- `pairset :: {a, b} -> [[a, b]]` - returns a list of key-value pairs in the table
- `modify :: {a, b} -> c -> d -> ()` - **EFFECTFUL FUNCTION** - given a table, a key, and a value, sets the key to the value in that table, modifying the table.

### Table Destructuring
Tables can be destructured using any the following syntaxes, and of course you can mix and match the different syntaxes:
```
let player = {
	.health = 1;
	.pos = { .x = 1, .y = 2 };
}

let { .health, .pos = { .x, .y } } = player
-- aliasing variables
let { .health = hp, .pos = { .x = player_x, .y = y_position } } = player
let { #"hea" .. "lth" = hp, #"po" .. "s" = { #string.trim " x " = xpos, .y } } = player
--
local player = {
	health = 1,
	pos = { x = 1, y = 2 }
}

local health = player.health
local x = player.pos.x
local y = player.pos.y

local hp = player.health
local player_x = player.pos.x
local y_position = player.pos.y

local hp = player["hea" .. "lth"]
local xpos = player["po" .. "s"][string.trim(" x ")]
local y = player["po" .. "s"]["y"]
```

### Functions
Functions are defined like so:
```
\a, b, c -> a + b + c
--
function (a, b, c) 
	return a + b + c 
end
```

All functions are anonymous, so in order to declare a function in the global scope (or any scope for that matter) you must assign it to a variable
```
let f = \x -> x
---
local function f(x)
	return x
end
```

In a break from other functional languages, **functions in Ligmascript are not curried or uncurried automatically.** You **cannot** partially apply a function by calling it with fewer parameters than it expects. Not including a parameter will simply pass `nil` as that parameter.

To write a function with no parameters, simply use a dummy variable `_` in place of a variable name. Alternatively, `\. -> ...` is a special syntax for a zero-parameter function. Or better yet, just `-> ...` - you can omit the lambda part entirely if your function takes no arguments.
```
let f = \_ -> print "Hello world!"
let f = \. -> print "Hello world!"
let f = -> print "Hello world!"
--
function f(_) return print("Hello world!") end
function f() return print("Hello world!") end
function f() return print("Hello world!") end
```

#### Entry Point
**Any Ligmascript file that has a function called `main` will execute that function upon loading**. This effectively means that a function called `main` is the entry point for the file.
```
let main = -> print "Hello world!"
---
local function main()
	print("Hello world!")
end
main()
```

#### Default Function Arguments
Functions can specify default arguments for parameters. A parameter will take that argument instead of `nil`. See the below example:
```
let f = \x = 5 -> x
let main = -> print (f 3 + f ()) -- prints 8
--
local function f(x)
	if x == nil then x = 5 end
	return x
end
local function main()
	print(f(3) + f())
end
main()
```

#### Variadic Arguments
Functions can specify variadic arguments, that is, an unknown number of arguments, with the `...` suffix. Only one of these is permitted, and only at the end of the parameter list. Variadic arguments can also have default values, though it would be wise to make the default argument a list as well. If no variadic argument is given when a function is called, an empty list is passed instead.
```
-- prints [ 6, 5, 4, 3, 2 ]
let add_one_to_all = \x... = [ 1, 2, 3 ] -> map x (\y -> y + 1)
let main = -> show (add_one_to_all 5 4 3 2 1)
--
local function add_one_to_all(...)
	local x = {...}
	if #x == 0 then x = { 1, 2, 3 }
	return map(x, function(y) return y + 1 end)
end
local function main()
	return show (add_one_to_all(5, 4, 3, 2, 1))
end
main()
```

### Implicit Parameter Functions
Ligmascript contains another type of function, an implicit parameter function (or, a fat arrow function). A function with a fat arrow (`=>`) instead of a thin arrow (`->`) will have the variable `self` implicitly added to the beginning of its parameter list.
```
-- semantically identical functions
let f = \x, y -> x + y
let f = \y => self + y
--
local function f(x, y)
	return x + y
end
local function f(self, y)
	return self + y
end
```

In addition, Ligmascript has `@` as a special symbol that is an alias for `self`. So now we have:
```
-- all semantically identical
let f = \x -> x + 1
let f = => self + 1
let f = => @ + 1
--
local function f(x)
	return x + 1
end
local function f(self)
	return self + 1
end
local function f(self)
	return self + 1
end
```

This syntax is useful for things like anonymous functions. For example:
```
-- given an array, returns only the elements greater than 5
let greater_than_five = \x -> filter x (=> @ > 5)
```

#### Self-Access Syntax
Prepend a variable with `@` as a shortcut for accessing a field on `self`. For example:
```
let add_vector_components = => @x + @y
let main = -> print (add_vector_components { .x = 1, .y = 2 })
--
local function add_vector_components(self)
	return self.x + self.y
end
local function main()
	return print(add_vector_components({ x = 1, y = 2 }))
end
main()
```

### Methods
Finally, the result of all this is something that resembles methods:
```
let v = {
	.x = 3,
	.y = 4,
	.length = => math.sqrt (@x * @x + @y * @y),
	.to_string = => "(${@x}, ${@y})"
}
```

These methods would be used like so:
```
print (v.length v)
```

However, passing `v` as the first argument every time isn't quite ideal, so Ligmascript has another piece syntacic sugar, the same as Lua in fact:
```
print (v:length!)
```

Using a `:` instead of a `.` before a function call will pass the object preceding the `:` as the first parameter of the function.

### Prototypes
Finally, here is the formalised version of structs/classes/data types or what have you, in Ligmascript. Prototypes are a way to create an object with shared methods or fields. Follow the example below:
```
let vec2 = proto {
	.constructor = \x, y -> { .x, .y },
	.length = => math.sqrt (@x * @x + @y * @y),
	.to_string = => "(${@x}, ${@y})",
	.foo = "bar!"
}

-- prints "(5, 6)"
let main = -> print (vec2 5 6)
```
Note that `proto` is not special syntax, but rather just a function included in the Ligmascript core language. It takes in a table, called the prototype (or metatable and index table in Lua). When you write `let vec2 = proto ...` you may now call `vec2` as a function, and it will call `constructor` on the prototype and return the result. The value returned from `constructor` is now linked to the prototype, and from now on, if any field access on that value isn't found, it will also search the prototype for that value. 

With `vec2` above, suppose you had:
```
let v = vec2 5 6
```
If you were to inspect the contents of `v`, you would only find `.x = 5` and `.y = 6`. Yet if you were to access `v.foo`, you would indeed get `"bar!"` because even though `foo` wasn't found in `v`, it was found in `v`'s prototype.

### Pattern Matching
Ligmascript has an extremely powerful pattern matching system.

#### Simple Matching
With simple matching like this, value types will match by value, and tables will match by reference
```
let z = "hello world"
let x = match "hello world"
	| 32 -> "A"
	| z -> "B"
	| else -> "C"

-- x = "B"
```

#### Table Matching 
You can structurally match against tables. Note that you can put pretty much any valid table here and it'll match against it by value. 
```
let x = match y 
	| { -- example of a valid table that will match by value
		#(1 + 2) = 1, 
		.b = true, 
		.c = { 
			.m = "gello", 
			.n = 4 
		} 
	} -> "A"
	| else -> "B"
```
Note that table matches **only check if every value matches in a table, and will not reject tables with more fields**. For example, the following will match:
```
let a = match { .x = 1, .y = 2, .z = 3 }
	| { .x = 1 } -> "Match!"
	| else -> panic!

-- a = "Match!"
```

#### Match Variables
Match variables must be preceded with a `$`. Any value besides `nil` will satisfy a match variable. 
```
let x = match { .a = 1, .b = 2 }
	| { .a = $n, .b = $m } -> n + m
	| else -> 0

-- x = 3
```

A shortcut for `.x = $x` is simply `$x`, so the above could also be written as:
```
let x = match { .a = 1, .b = 2 }
	| { $a, $b } -> a + b
	| else -> 0

-- x = 3
```

If you append `?` to the variable, it declares it optional. That means that `nil` will also satisfy the pattern.
```
let x = match { .a = 1 }
	| { $a, $b? } -> a + (b or 0)
	| else -> 0

-- x = 1
```

Variables will be unified (by reference if possible) and any failure to unify will reject the pattern.
```
let x = match { .a = 1, .b = 1, .c = 2 }
	| { .a = $y, .b = $y, .c = $y } -> y * 3
	| { .a = $y, .b = $y } -> y * 2
	| else -> 0

-- x = 2 (2nd branch matches)
```

#### Array Matches
You can also structurally match against arrays, while also using any other feature of the pattern matching system
```
let x = match [ 1, 2, 3 ]
	| [ $x, $y, $z ] -> x + y + z
	| else -> 0
```

Ligmascript also supports matching the beginnings and ends of arrays
```
let x = match [ 1, 2, 3, 4, 5 ]
	| [ 10, 11... ] -> 21
	| [ ... 8, 9 ] -> 17
	| [ $a, $b ... $c, $d ] -> a + b + c + d
	| else -> 0
```

Ligmascript also supports head-tail array matching, as is standard in functional languages.
```
let x = match [ 1, 2, 3, 4, 5 ]
	| [ $a, $b ::: $xs ] -> a + b + len xs
	| else -> 0

-- x = 6
```

#### Union Matches
You can match against multiple patterns as a kind of "or statement".
```
let x = match y
	| { .x = $a } | { .y = $a } -> a
	| else -> 0
```
Note that Ligmascript is whitespace insensitive, so this could also be written like so:
```
let x = match y
	| { .x = $a } 
	| { .y = $a } -> a
	| else -> 0
```

#### Arbitrary Branch Conditions
You can insert one or more arbitrary conditions at the end of a branch by using a comma:
```
let x = match y
	| { $a }, a ~= 4, a * a > a -> "Match!"
	| else -> "No match!"
```
Note that in combination with union matches, you can have conditions on each distinct pattern in the union.

#### Metatable Matches
You can also match against an object's metatable. This is useful when working with prototypes.
```
let vec2 = proto {
	.constructor = \x, y -> { .x, .y }
}

let vec3 = proto {
	.constructor = \x, y -> { .x, .y, .z }
}

let a = match vec3 2 3 4
	| vec2 :: { $x, $y } -> x + y
	| vec3 :: { $x, $y, $z } -> x + y + z
	| else -> panic!

### Language Example
Here is the source code of `serialise.li` as of 2023-06-13
```

import "preamble.li"

let serialise_pair = \p, visited -> 
    let [ k, v ] = p in "${serialise k visited} = ${serialise v visited}"

let serialise_table = \t, visited -> 
    let [ p, n ] = [ pairset t, len p ] in cases
    | n == 0 -> "{}"
    | else -> "{ ${string.join (map p \x -> serialise_pair x visited) ", " } }"

let serialise_object = \x, visited -> 
    let obj = cases
        | is_array x -> "[ ${string.join (map x \x -> serialise x visited) ", " } ]"
        | (getmetatable x)?.__tostring -> tostring x
        | else -> serialise_table x visited
    in "(${tostring x}) ${obj}"

let export serialise = \x, visited = [] -> match type x
    | "nil" -> "nil"
    | "number" | "boolean" -> tostring x
    | "string" -> "\"${x}\""
    | "function" -> "<function>"
    | "CFunction" -> "<cfunction>"
    | "userdata" -> "<userdata>"
    | "table" -> 
        if member visited x 
        then "(recursive) (${tostring x})"
        else do set visited #(len visited + 1) = x
        then serialise_object x visited
    | else -> panic!
        
let show_one = \x -> match type x 
    | "table" -> serialise_object x [x]
    | else -> x

let export show = \x... -> 
    print (... map x show_one)
```

## How & Why
TODO: Write this