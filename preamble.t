
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

let identity = \x -> x
let head = \a -> a #1 

let all = \a, f -> cases
    | len a == 0, true
    | else, f a #1 & for_all (tail a)

let any = \a, f -> cases
    | len a == 0, false
    | else, f a #1 or any (tail a)

let map = \a, f -> [ f x | x <- a ]
let filter = \a, f -> [ x | x <- a, f a ]

export identity, head, any, all, map, filter

