
function var(name)
    return { var = true, name = name }
end

function is_var(x)
    return type(x) == "table" and x.var = true
end

function replaceIn()
