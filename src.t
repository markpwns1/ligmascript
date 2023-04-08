





-- -- -- let proto = $ 

-- -- -- let vec3 = extend vec2 {
-- -- --     .constructor = \x, y, z -> table.merge (vec2.constructor x y) { .z };
-- -- --     .to_string = \. => "${vec2.to_string self}, ${self.z}"
-- -- -- }

-- -- -- let A = proto { 
-- -- --     .hello = \. -> "Hello A"
-- -- -- }

-- -- -- let B = extend A {
-- -- --     .hello = \. -> "Hello B"
-- -- -- }

-- -- -- let main = \. -> print ((B!):hello!)

-- -- -- import "yea"

-- -- -- import asdf

-- -- -- import "hey"

-- -- -- let a b = 4

-- -- -- let c = 5
-- -- -- let c = 6

-- -- -- let main = \. -> maybe blyad >> print

-- -- -- old way of doing IO
-- -- -- let main = \. -> 
-- -- --     do putln "What is your name?" then
-- -- --     do put " > " then
-- -- --     let x = io.read "*line" in 
-- -- --     print "Hello, ${x}"

-- -- -- -- IO monads
-- -- -- let main = \. -> sequence_of
-- -- --     >> putln "What is your name?"
-- -- --     >> put " > "
-- -- --     >> read!
-- -- --     >> \name -> put "Hello, ${name}!"

-- -- -- -- prints 1
-- -- -- let contrived_example = 
-- -- --     let a = [ 1, 2, 3 ] in
-- -- --     (maybe a) >> head >> print

-- -- -- let a = let b = 2 in print b

-- -- -- let main = \. -> (maybe a) >> head >> print 

-- -- -- let ident = $ [T] -> T :: \a -> a
-- -- -- let make_getter = $ T -> (() -> T) :: \a -> \. -> a
-- -- -- let five_getter = make_getter 5
-- -- -- let five = five_getter!


-- -- -- let print_num = $ num :: \n -> print n
-- -- -- let main = \. -> first [ 1, 2, 3 ]

-- -- -- let head = $ [T] -> T :: \a -> a #1
-- -- -- foreign head :: [T] -> T
-- -- -- foreign 

-- -- -- let f = \x -> x
-- -- -- let g = \x... -> x

-- -- -- lua FFI
-- -- -- foreign print :: any -> ()

-- -- -- let overwrite = $ A >= B >= {}, B -> A :: \a, b -> a

-- -- -- let double_x = $ (T >= { x :: num }) -> T :: \a -> a

-- -- -- type None :: { }

-- -- -- let s = 

-- -- -- let f = $ B >= { x :: A }, A -> B :: \b, a -> b
-- -- -- let g = \. -> f { .x = 6 } "abc" 

-- -- -- let e = f { .x = 4 ; .y = 5 }

-- -- -- returns the sum of an array of numbers
-- -- -- let add_all = $ num... -> num :: \a... -> cases
-- -- --     | len a < 1, 0
-- -- --     | else, head a + add_all (...tail a)

-- -- -- -- entry point
-- -- -- let main = \. -> ($ any -> () :: print) (add_all 1 2 3)

-- -- -- let f = $ ([T] -> ()) -> [T] :: \a -> \. -> a
-- -- -- let x = f [ 1, 2, 3 ]

-- -- -- let add_three = get_add 3
-- -- -- let five = add_three 2
-- -- -- let main = \. -> print five

-- -- -- import "serialise"

-- -- -- -- foreign print :: $ ... -> nil

-- -- -- -- let for = \initial, cond, next -> 
-- -- -- --     let c = cond initial in cases
-- -- -- --         | c, for (next initial) cond next
-- -- -- --         | else, ()

-- -- -- let print_all = \a... -> cases
-- -- --         | len a < 1, ()
-- -- --         | else, 
-- -- --             do print (head a) then 
-- -- --             print_all (tail a)

-- -- -- -- -- prints { "x": { 1: 4, 2: 5 } }
-- -- -- -- -- let main = \. -> for 0 (\i -> i < 10) (\i -> do print i then i + 1)

-- -- -- let main = \. -> print_all !


-- -- -- -- a prototype of a 2D vector
-- -- -- let vec = proto {
-- -- --     -- constructor returns a table of initial values
-- -- --     .constructor = \x, y -> { .x = x; .y = y }; 
-- -- --     -- example of string interpolation
-- -- --     .to_string = \. => "(${self.x}, ${self.y})"; 
-- -- --     -- thick arrow automatically prepends "self" to the arguments
-- -- --     .magnitude = \. => math.sqrt (self.x ^ 2 + self.y ^2);
-- -- -- }

-- -- -- -- an array of vectors
-- -- -- let vectors = [ vec 1 2, vec 4 5, vec (-2) 3 ]

-- -- -- -- gets the nth element of the vectors array, or throws an error
-- -- -- let get_vec = \n -> cases -- branching
-- -- --     | n < 1 or n > len vectors, error "Out of bounds!"
-- -- --     | else, vectors #n -- index operator is #

-- -- -- -- program entry point
-- -- -- let main = \. -> 
-- -- --     -- try-or statement which catches errors
-- -- --     let v = try get_vec 7 or vec 0 0 in 
-- -- --     let { a = .x, b = .y } = v in -- table destructuring
-- -- --         print (vec (a + 1) (b + 1)):to_string! -- prints (1, 1)



-- -- -- gets the first element of an array
-- -- -- let head = \a -> a #1


-- -- import "preamble"
-- -- import "serialise"

-- -- -- converts all the elements of an array to a string and separates them
-- -- -- with the given separator

-- -- let parse_error = proto {
-- --     .constructor = \offset, message -> { .offset, .message };
-- --     .__tostring = \. => "Error (${self.offset}): ${self.message}";
-- -- }

-- -- let parser = proto {
-- --     .constructor = \name, f -> { .name = name or "<unnamed parser>", .f };
-- --     .__div = \a, b -> parse_any [ a, b ];
-- --     .__add = \a, b -> parse_seq [ a, b ]
-- -- }

-- -- let parse_result = proto {
-- --     .constructor = \o, p, r -> { .o, .p, .r };
-- --     .__tostring = \. => "ParseResult(${tostring(self.o)}, ${serialise(self.p)}, \"${tostring(self.r)}\")"
-- -- }

-- -- let token = proto {
-- --     .constructor = \start, value, finish -> { .start, .value, .finish };
-- --     .__tostring = \. => let t = cases
-- --         | self.type, "${self.type}:"
-- --         | else, ""
-- --     in "[${t}${self.start}-${self.finish}:${serialise(self.value)}]"
-- -- }

-- -- let parse_none = parser () \o, s -> parse_result o () s

-- -- let parse_pattern = \pattern, name -> parser name 
-- --     \o, s -> let [start, finish] = [ string.find s ("^" .. pattern) ] in cases
-- --         | start == (), parse_error!
-- --         | else, parse_result 
-- --             (o + finish)
-- --             (token (o + start - 1) (string.sub s (start - 1) finish) (o + finish)) 
-- --             (string.sub s (finish + 1) (-1))

-- -- let parse_str = \str -> parser "\"${str}\""
-- --     \o, s -> let n = string.len str in cases
-- --         | string.sub s 1 n == str, 
-- --             parse_result (o + n) (token o str (o + n)) (string.sub s (n + 1) (-1))
-- --         | else, parse_error!

-- -- let parse_any = \parsers -> parser "one of ${array_join (map parsers \x -> x.name) ", " tostring}"
-- --     \o, s -> cases 
-- --         | len parsers == 0, parse_error!
-- --         | else, let [ h, t ] = parts parsers in parse h o s {
-- --             .failure = \. -> parse (parse_any t) o s
-- --         }

-- -- let parse_seq = \parsers -> 
-- --     let parse_seq_inner = \ps -> cases 
-- --         | len ps == 0, parser () \o, s -> parse_result o [] s
-- --         | else, let [ h, t ] = parts ps in
-- --             parser h.name \o, s -> parse h o s {
-- --                 .success = \r -> parse (parse_seq_inner t) r.o r.r {
-- --                     .success = \n -> parse_result n.o ([r.p] ++ n.p) n.r
-- --                 }
-- --             }
-- --     in process_parser (parse_seq_inner parsers) \p -> cases
-- --         | count p == 1, sole p
-- --         | else, p

-- -- let parse_optional = \parser -> parse_any [ parser, parse_none ]

-- -- let parse_some = \p -> parser !
-- --     \o, s -> parse p o s {
-- --         .failure = \. -> parse_result o [] s;
-- --         .success = \r -> parse (parse_some p) r.o r.r {
-- --             .success = \n -> parse_result n.o ([r.p] ++ n.p) n.r
-- --         }
-- --     } 

-- -- let parse_not = \p -> parser "not ${p.name}" 
-- --     \o, s -> parse p o s {
-- --         .success = -> parse_error o "Forbidden ${p.name}";
-- --         .failure = -> parse_result o () s
-- --     }

-- -- returns all odd numbers in a given array, a
-- let odds = \a -> filter a (\x -> x % 2 == 1)
-- let odds = \a -> filter a (=> @ % 2 == 1)

-- -- function that returns 5
-- let get_five = \. -> 5
-- -- (new syntax) can also be written as
-- let get_five = -> 5

-- -- function that doubles its input
-- let double = \x -> x * 2

-- -- member function of some vec2 struct
-- let get_magnitude = \self -> sqrt (self.x * self.x + self.y * self.y)
-- -- like with jammy, can also be written as any of the following
-- let get_magnitude = \. => sqrt (self.x * self.x + self.y * self.y)
-- let get_magnitude = \. => sqrt (@x * @x + @y * @y)

-- -- new syntax, like with `get_five` at the beginning:
-- -- `=> <expr>` is equivalent to `\. => expr` (which is itself equivalent to `\self -> expr`)
-- -- so the `double` function above can be written as
-- let double = => @ * 2
-- -- (note that standalone @ is an alias for `self`)

-- -- new syntax is very useful with anonymous functions
-- let odds = => filter @ (=> @ % 2 == 1)
-- -- (equivalent to)
-- let odds = \a -> filter a (\x -> x % 2 == 1)
-- -- more sanely written as
-- let odds = \a -> filter a (=> @ % 2 == 1)

-- -- let process_parser = \p, f -> parser p.name \o, s -> 
-- --     parse p o s {
-- --         .success = \r -> parse_result r.o (f r.p) r.r
-- --     }

-- -- let parse_multiple = \p -> process_parser (parse_seq [ p, (parse_some p) ]) shallow_flatten

-- -- let discard_result = \p -> process_parser p \. -> ()

-- -- let capture_parser = \p, f -> parser p.name \o, s -> 
-- --     parse p o s {
-- --         .success = \r -> if r?.p,  
-- --                 parse_result r.o (token 
-- --                     (head r.p or r.p).start
-- --                     (f r.p)
-- --                     (last r.p or r.p).finish) r.r
-- --                 else r
-- --     }

-- -- -- let capture_result = \p, pattern -> parser p.name \o, s -> 
-- -- --     parse p o s {
-- -- --         .success = \r -> parse_result r.o (token 
-- -- --                 (head r.p).start
-- -- --                 (foldl r.p {} \t, x, i -> set t (pattern #i) x.value )
-- -- --                 (last r.p).finish) r.r
-- -- --     }

-- -- let match_results = \pattern, p, f = \x -> x.value -> capture_parser p 
-- --     \parsed -> (foldl parsed { } \t, x, i -> set t (pattern #i) (f x))

-- -- let take_nth = \n, p -> capture_parser p \parsed -> (parsed #n).value

-- -- let parse = \p, o, s, c = { } -> 
-- --     let r = p.f o s in cases
-- --         | is_subclass r parse_error, let callback = (c.failure or identity) in cases 
-- --             | r?.message, callback r
-- --             | else, callback (parse_error o "Expected ${p.name}")
-- --         | else, (c.success or identity) r

-- -- let odds = \n -> [ x | x <- (range 1 n 2) ]

-- -- let show = \x -> print (serialise x)

-- -- -- -- prints an array containing the numbers from 1 to 10
-- -- -- let main = \. -> print (array_to_string (odds 10))


-- -- -- let whitespace = discard_result (parse_some (parse_char " "))
-- -- -- let hello = parse_str "hello"
-- -- -- let world = parse_str "world"

-- -- -- -- Equivalent to the following grammar: whitespace ((hello | world) whitespace)*
-- -- -- let hello_world_parser = whitespace + parse_some ((hello / world) + whitespace)

-- -- -- let main = \. -> show (parse hello_world_parser 0 "hello world world hello abc123")

-- -- --[
-- --     Returns:
-- --     ParseResult(24, { [0-5:"hello"], [6-11:"world"], [12-17:"world"], [18-23:"hello"] }, 'abc123')
-- --     where 24 is the current byte offset of the parser, the array is the array of tokens returned
-- --     (without any processing, all parsers just return the tokens parsed) and 'abc123' is the 
-- --     remaining text. A token is of the format [start-end:content]
-- -- ]

-- -- let whitespace = discard_result (parse_some (parse_str " "))
-- -- let comma = discard_result (parse_str ",")
-- -- let dot = discard_result (parse_str ".")

-- -- let json_str = take_nth 2 (parse_seq [ 
-- --     parse_str "'",
-- --     process_parser (parse_some (parse_seq [ parse_not (parse_str "'"), parse_pattern "." "a character" ]))
-- --         \chars -> token (head chars).start (foldl chars "" \l, r -> l .. r.value) (last chars).finish,
-- --     parse_str "'"
-- -- ])

-- -- let digits = parse_pattern "%d+" "a digit"

-- -- let json_num = capture_parser (parse_seq [
-- --     digits,
-- --     parse_optional (parse_seq [dot, digits])
-- -- ]) \parsed -> cases 
-- --     | is_array parsed, tonumber "${(parsed #1).value}.${(parsed #2).value}"
-- --     | else, tonumber parsed.value

-- -- let json_bool = capture_parser ((parse_str "true") / (parse_str "false")) 
-- --     \parsed -> parsed.value == "true"

-- -- let json_val = \. -> parse_any [ json_str, json_num, json_bool ]

-- -- -- let json_array = parse_seq [
-- -- --     discard_result (parse_str "["),
-- -- --     whitespace,
-- -- --     process_parser (parse_optional (parse_seq [
-- -- --         json_val!,
-- -- --         parse_some (parse_seq [whitespace, comma, whitespace, json_table_entry])
-- -- --     ])) shallow_flatten,
-- -- --     whitespace,
-- -- --     discard_result (parse_str "]")
-- -- -- ]

-- -- let json_table_entry = match_results [ "key", !, "value" ] (parse_seq [
-- --     json_str,
-- --     whitespace,
-- --     parse_str ":",
-- --     whitespace,
-- --     json_val!
-- -- ])

-- -- let json_table = process_parser (match_results [ !, "pairs" ] (parse_seq [
-- --     parse_str "{",
-- --     whitespace,
-- --     process_parser (parse_optional (parse_seq [
-- --         json_table_entry,
-- --         parse_some (parse_seq [whitespace, comma, whitespace, json_table_entry])
-- --     ])) shallow_flatten,
-- --     whitespace,
-- --     parse_str "}"
-- -- ]) identity) \p -> table.merge p { .type = "table" }

-- -- -- let main = \. -> show (parse json_table_entry 0 "'x': y")
-- -- -- let main = \. -> show (parse (parse_any [ parse_str "a", parse_str "b", parse_str "c" ]) 0 "d")



-- -- -- let main = \. -> let t = { .x = 4 } in t?.x

-- -- -- let main = \. -> show (if true, 1 else 2)

-- -- -- let main = \. -> show (parse (parse_multiple hello) 0 "hellohellohelloworld")

-- -- -- let main = \. -> show (reduce [1, 2, 3] (\a, b -> a + b) 10) 

-- -- -- -- let a = \x -> 
-- -- -- --     let y = cases
-- -- -- --         | true, 1
-- -- -- --         | else, 2
-- -- -- --     in ()

-- import "preamble"
-- import "serialise"

-- let longest_increasing_arc = \a -> cases 
--     | len a < 2, a
--     | else,
--         let elem = last a in
--         let arc = longest_increasing_arc $ body a in
--         let prev = last arc in 
--         let prev' = arc # (len arc - 1) in cases
--             | elem > prev, arc ++ [elem]
--             | prev' & elem > prev', body arc ++ [elem]
--             | else, arc

-- let show = \x -> print $ serialise x
-- let main = -> show $ longest_increasing_arc [7, 2, 33, 8, 11, 17, 1, 5, 9]

-- let main = -> print $ string.sub "x" "y" "z"

--[
import "serialise"

let main = -> print $ serialise $ overwrite
    {
        .a = 3,
        .b = {
            .c = 4,
            .d = 5
        },
        .c = "hello"
    }
    {
        .a = "world",
        .b = {
            .c = 69
        },
        .c = unset
    }
]

import "preamble"

let f = print "hello world"

end

let x = 4

end

export x

--[ Emits the following:
local longest_increasing_arc,show,main
require("preamble");require("serialise");
longest_increasing_arc = function(a)  
    if (len(a)<2) then return a 
    else local elem;elem = last(a);
        local arc;arc = longest_increasing_arc(body(a));
        local prev;prev = last(arc);
        local prev_p;prev_p = arc[(len(arc)-1)];
        if (elem>prev) then return concat(arc,{elem}) 
        elseif (prev_p and (elem>prev_p)) then return concat(body(arc),{elem}) 
        else return arc end end end
show = function(x) return print(serialise(x)) end
main = function() return show(longest_increasing_arc({7,2,33,8,11,17,1,5,9})) end
main()
]

-- let main = \. -> let x = 5 in x + 1

-- prints all elements of a greater than 2
-- outputs the following: 
-- { 4, 5, 3 }
-- let a = [ 1, 4, 5, 2, 3 ]
-- let main = -> print $ serialise $ filter a (=> @ > 2)

-- that last line is equivalent to:
-- let main = \. -> print (serialise (filter a (\x -> x > 2)))


-- let main = \. -> do 
--     print "What is your name?";
--     let x = io.read "*l";
--     if x == "Mark", do 
--         1 + 2;
--         print "Hello, ${x}!";
--         print "That's a cool name!"
--     end 
--     else do
--         print "Oh, it's ${x}"
--     end;
--     print "Well, it was nice seeing you, ${x}!"
-- end

let 
    [ 
        { .x, .y },
        [ a, b, c ],
        d,
        ...
        { q <- .field },
        { { .n, .m } <- .field },
        { [i, j, k] <- .field }
    ]