
import "preamble"

let serialise_table = \t -> 
    let serialise_table_kv = \kv ->
        let n = len kv in cases
            | n == 0, ""
            | n == 1, let [ k, v ] = head kv in 
                "${serialise k}: ${serialise v}"
            | else, let [ k, v ] = head kv in 
                "${serialise k}: ${serialise v}, ${serialise_table_kv (tail kv)}"
    in "{ ${serialise_table_kv (pairs t)} }"

let serialise = \x -> 
    let T = type x in cases
        | T == "nil", "nil"
        | T == "number", tostring x
        | T == "string", "\"${x}\""
        | T == "boolean", tostring x
        | T == "function", "function"
        | T == "CFunction", "cfunction"
        | T == "userdata", "userdata"
        | T == "table", serialise_table x
        | else, panic!

export serialise
