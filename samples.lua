--[[

let f = \x -> match x with 
    | 0, 0
    | $a, a
    | [ $a, 2 ], a
    | [ $a, $b ... 3, $c ], a + b + c
    | [ $x1, $x2 ::: $xs ], x1 + x2 + len xs


]]