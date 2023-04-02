
-- TODO: allow
--  let x.y = whatever

-- let none = {
--     .bind = \. -> none;
--     .is_none = true;
-- }

-- let some = proto {
--     .constructor = \value -> { .value };
--     .bind = \fn => maybe (fn self.value);
--     .is_none = false;
-- }

-- let boxed = proto {
--     .constructor = \value -> { .value };
--     .bind = \fn => boxed (fn self.value);
-- }

-- -- let state = proto {
-- --     .constructor = \
-- -- }

-- let pass = {
--     .bind = \fn => fn!
-- }

-- let maybe = \x -> cases
--     | x == nil or x == none, none
--     | else, cases
--         | is_subclass x some, x
--         | else, some x

-- let put = \x -> do io.write x then pass
-- let putln = \x -> do print x then pass
-- let read = \x = "*line" -> boxed (io.read x)

let head = \a -> a #1 

let all = \a, f -> cases
    | len a == 0, true
    | else, f a #1 & all (tail a) f

let any = \a, f -> cases
    | len a == 0, false
    | else, f a #1 or any (tail a) f

let map = \a, f -> [ f x | x <- a ]
let filter = \a, f -> [ x | x <- a, f x ]

let map_i = \a, f, i = 1 -> cases
    | len a == 0, []
    | else, [f (head a) i] ++ map_i (tail a) f (i + 1)

-- gets a copy of an array except for the first N elements
let slice = \b, first, last = len b -> cases
    | type b == "string", string.sub b first last
    | else, cases
        | first >= last, [ b #first ]
        | else, [ b #first ] ++ slice b (first + 1) last

-- gets a copy of an array except for the first element
let tail = \a -> cases
    | len a == 0, !
    | else, slice a 2

let foldr = \a, v, f, i = 1 -> 
    let n = len a in cases
        | n == 0, v
        | else, f (head a) (foldr (tail a) v f (i + 1)) i

let foldl = \a, v, f, i = 1 -> 
    let n = len a in cases
        | n == 0, v
        | else, foldl (tail a) (f v (head a) i) f (i + 1)

-- creates an array [ 1, 2 ... n ]
-- has three overloads:
--  - range n
--  - range first last
--  - range first last step
let range = \a, b, step = 1 -> 
    let [ first, last ] = cases
        | b == !, [ 1, a ]
        | else, [ a, b ]
    in cases
        | first == last, [ first ]
        | last < first, [ ]
        | else, [ first ] ++ range (first + step) last step

let parts = \t -> [ head t, tail t ]

let pack = \x... -> x

let is_array = \t -> 
    type t == "table" & all (pairs t) \kv -> 
        let [ k, _ ] = kv in type k == "number"

-- let flatten = \a -> cases
--     | is_array a, let n = len a in cases
--         | n == 0, []
--         | else, let [x, xs] = parts a in [x] ++ (flatten xs)
--     | else, [ a ]

let flatten = \a -> foldl a [] (\l, r -> cases
    | is_array r, l ++ (flatten r)
    | else, l ++ [r]) 

let shallow_flatten = \a -> foldl a [] (\l, r -> cases
    | is_array r, l ++ r
    | else, l ++ [r]) 

let sole = \a -> a # (len a)
    

-- [ 1, [ 2, 3 ] ]

export 
    head, 
    any, 
    all, 
    map, 
    filter, 
    range, 
    tail, 
    slice, 
    parts, 
    pack, 
    is_array, 
    flatten, 
    shallow_flatten,
    foldl, 
    foldr,
    map_i,
    sole

