
-- local traceback0 = debug.traceback

require("serialise")

-- local success, result = pcall(f)
-- if success then return success 
-- else
--     local filename, line, message = result:match('(.-):(%d+): (.+)')
--     -- filename = filename:gsub('\\', '/')
--     -- filename = filename:sub(1, filename:find('/[^/]*$')) .. __filename
--     error(string.format("%s:%s: %s", __filename, __mappings[tonumber(line)] or line, message), 0)
-- end

-- debug.traceback = function(a, b, c) 
--     -- print("Hello world!") 
--     -- 
--     print(serialise(a))
--     print(serialise(b))
--     print(serialise(c))
--     return original_debug_traceback() .. "\nHello world!"
-- end

-- local x = require("b")
-- x.y()

local unify = require("lunify")
local var = unify.var
local tail = unify.tail

local a = { var("a"), var("b"), 
  x = {
    z = var("a")
  }, 
  y = var("rest"),
  tail("rest") }

local b = { "hello world", 2, 3, 4, 5, 6, 
  x = {
    z = "hello world",
  },
  y = {3, 4, 5, 6}
}

local success, result = unify(a, b)

if success then 
    for k, v in pairs(result) do 
        print(k .. " := " .. serialise(v))
    end

    print(serialise(unify.replace(a, result)))
else
    print("Failed to unify")
end
