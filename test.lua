local __filename = "hello.t"
local __mappings = { 
    [22] = 2
}

function __report_error(f)
    local success, result = pcall(f)
    if success then return success 
    else
        local filename, line, message = result:match("(.-):(%d+): (.+)")
        error(string.format("%s:%s: %s", __filename, __mappings[filename][tonumber()] or line, message), 0)
    end
end

function main() 
    return __report_error(function() print(x.y) end)
end

main()