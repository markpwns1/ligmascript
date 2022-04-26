
local function class()
    local mt = { }
    mt.constructor = function() end
    mt.new = function(...) 
        local instance = {}
        mt.constructor(instance, ...) 
        return setmetatable(instance, mt)
    end
    mt.__index = mt
    return mt
end

local vec2 = class()

vec2.class_name = "Vector2"

function vec2.__add(a, b)
    return vec2.new(a.x + b.x, a.y + b.y)
end

function vec2.constructor(self, x, y)
    self.x = x
    self.y = y
end

function vec2.to_string(self) 
    return tostring(self.x) .. ", " .. tostring(self.y)
end

local v = vec2.new(1, 2) + vec2.new(1, 2)

print(v.class_name)
print(v:to_string())

-- local vec2_mt = {
--     to_string = function(self) 
--         return tostring(self.x) .. ", " .. tostring(self.y)
--     end,
--     add = function(a, b)
--         return vec2(a.x + b.x, a.y + b.y)
--     end,
-- }

-- vec2_mt.__index = vec2_mt

-- function vec2(x, y) 
--     return setmetatable({ 
--         x = x, 
--         y = y
--     }, vec2_mt)
-- end

-- local v = vec2(1, 2)


