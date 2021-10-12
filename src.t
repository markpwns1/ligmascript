



-- import "preamble"

-- let vec2 = proto {
--     .constructor = \x, y -> { .x, .y };
--     .to_string = \. => "${self.x}, ${self.y}";
-- }

-- let proto = $ 

-- let vec3 = extend vec2 {
--     .constructor = \x, y, z -> table.merge (vec2.constructor x y) { .z };
--     .to_string = \. => "${vec2.to_string self}, ${self.z}"
-- }

-- let A = proto { 
--     .hello = \. -> "Hello A"
-- }

-- let B = extend A {
--     .hello = \. -> "Hello B"
-- }

-- let main = \. -> print ((B!):hello!)

-- import "yea"

-- import asdf

-- import "hey"

-- let a b = 4

-- let c = 5
-- let c = 6

-- let main = \. -> maybe blyad >> print

-- old way of doing IO
-- let main = \. -> 
--     do putln "What is your name?" then
--     do put " > " then
--     let x = io.read "*line" in 
--     print "Hello, ${x}"

-- -- IO monads
-- let main = \. -> sequence_of
--     >> putln "What is your name?"
--     >> put " > "
--     >> read!
--     >> \name -> put "Hello, ${name}!"

-- -- prints 1
-- let contrived_example = 
--     let a = [ 1, 2, 3 ] in
--     (maybe a) >> head >> print

-- let a = let b = 2 in print b

-- let main = \. -> (maybe a) >> head >> print 

-- let ident = $ [T] -> T :: \a -> a
-- let make_getter = $ T -> (() -> T) :: \a -> \. -> a
-- let five_getter = make_getter 5
-- let five = five_getter!


-- let print_num = $ num :: \n -> print n
-- let main = \. -> first [ 1, 2, 3 ]

-- let head = $ [T] -> T :: \a -> a #1
-- foreign head :: [T] -> T
-- foreign 

-- let f = \x -> x
-- let g = \x... -> x

-- lua FFI
-- foreign print :: any -> ()

-- let overwrite = $ A >= B >= {}, B -> A :: \a, b -> a

-- let double_x = $ (T >= { x :: num }) -> T :: \a -> a

-- type None :: { }


let none = $ { bind :: }:: {
    .bind = \. -> none;
    .is_none = true;
}

let some = proto {
    .constructor = \value -> { .value };
    .bind = \fn => maybe (fn self.value);
    .is_none = false;
}

-- let f = $ B >= { x :: A }, A -> B :: \b, a -> b
-- let g = \. -> f { .x = 6 } "abc" 

-- let e = f { .x = 4 ; .y = 5 }

-- returns the sum of an array of numbers
-- let add_all = $ num... -> num :: \a... -> cases
--     | len a < 1, 0
--     | else, head a + add_all (...tail a)

-- -- entry point
-- let main = \. -> ($ any -> () :: print) (add_all 1 2 3)

-- let f = $ ([T] -> ()) -> [T] :: \a -> \. -> a
-- let x = f [ 1, 2, 3 ]

-- let add_three = get_add 3
-- let five = add_three 2
-- let main = \. -> print five

-- import "serialise"

-- -- foreign print :: $ ... -> nil

-- -- let for = \initial, cond, next -> 
-- --     let c = cond initial in cases
-- --         | c, for (next initial) cond next
-- --         | else, ()

-- let print_all = \a... -> cases
--         | len a < 1, ()
--         | else, 
--             do print (head a) then 
--             print_all (tail a)

-- -- -- prints { "x": { 1: 4, 2: 5 } }
-- -- -- let main = \. -> for 0 (\i -> i < 10) (\i -> do print i then i + 1)

-- let main = \. -> print_all !


-- -- a prototype of a 2D vector
-- let vec = proto {
--     -- constructor returns a table of initial values
--     .constructor = \x, y -> { .x = x; .y = y }; 
--     -- example of string interpolation
--     .to_string = \. => "(${self.x}, ${self.y})"; 
--     -- thick arrow automatically prepends "self" to the arguments
--     .magnitude = \. => math.sqrt (self.x ^ 2 + self.y ^2);
-- }

-- -- an array of vectors
-- let vectors = [ vec 1 2, vec 4 5, vec (-2) 3 ]

-- -- gets the nth element of the vectors array, or throws an error
-- let get_vec = \n -> cases -- branching
--     | n < 1 or n > len vectors, error "Out of bounds!"
--     | else, vectors #n -- index operator is #

-- -- program entry point
-- let main = \. -> 
--     -- try-or statement which catches errors
--     let v = try get_vec 7 or vec 0 0 in 
--     let { a = .x, b = .y } = v in -- table destructuring
--         print (vec (a + 1) (b + 1)):to_string! -- prints (1, 1)



-- gets the first element of an array
-- let head = \a -> a #1

-- -- gets a copy of an array except for the first N elements
-- let slice = \b, first, last = len b -> cases
--     | first == last, [ b #first ]
--     | else, [ b #first ] ++ slice b (first + 1) last

-- -- gets a copy of an array except for the first element
-- let tail = \a -> slice a 2

-- creates an array [ 1, 2 ... n ]
-- has three overloads:
--  - range n
--  - range first last
--  - range first last step
-- let range = \a, b, step = 1 -> 
--     let [ first, last ] = cases
--         | b == nil, [ 1, a ]
--         | else, [ a, b ]
--     in cases
--         | first == last, [ first ]
--         | last < first, [ ]
--         | else, [ first ] ++ range (first + step) last step

-- -- converts all the elements of an array to a string and separates them
-- -- with the given separator
-- let array_join = \a, sep ->
--     let n = len a in cases
--         | n == 0, ""
--         | n == 1, tostring (head a) 
--         | else, tostring (head a) .. sep .. array_join (tail a) sep

-- -- converts an array to a string
-- let array_to_string = \a -> "[ ${ array_join a ", " } ]"

-- let odds = \n -> [ math.sqrt x | x <- range n ]

-- -- prints an array containing the numbers from 1 to 10
-- let main = \. -> print (array_to_string (odds 10))

-- -- let a = \x -> 
-- --     let y = cases
-- --         | true, 1
-- --         | else, 2
-- --     in ()
