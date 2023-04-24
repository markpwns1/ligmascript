
import "preamble"

let export serialise_table = \t -> 
    let serialise_table_kv = \kv ->
        let n = len kv in cases
            | n == 0, ""
            | n == 1, let [ k, v ] = head kv in 
                "${serialise k}: ${serialise v}"
            | else, let [ k, v ] = head kv in 
                "${serialise k}: ${serialise v}, ${serialise_table_kv (tail kv)}"
    in "{ ${serialise_table_kv (pairs t)} }"

let export array_join = \a, sep = ", ", transformer = serialise ->
    let n = len a in cases
        | n == 0, ""
        | n == 1, transformer (head a) 
        | else, transformer (head a) .. sep .. array_join (tail a) sep transformer

let export serialise = \x -> 
    let T = type x in cases
        | T == "nil", "nil"
        | T == "number", tostring x
        | T == "string", "\"${x}\""
        | T == "boolean", tostring x
        | T == "function", "function"
        | T == "CFunction", "cfunction"
        | T == "userdata", "userdata"
        | T == "table", cases
            | is_array x, "{ ${array_join x ", "} }"
            | (getmetatable x) & (getmetatable x).__tostring, tostring(x)
            | else, serialise_table x
        | else, panic!
