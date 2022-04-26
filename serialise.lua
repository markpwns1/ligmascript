
local __pairs = pairs
local unpack = unpack or table.unpack
local function concat(a, b)
    local c = { unpack(a) }
    for i=1, #b do
        c[#c+1] = b[i]
    end
    return c
end

local function len(a) return #a end
local function nop() end

local function range(a, b, c)
    if b == nil then b = a; a = 1 end
    if c == nil then c = 1 end
    local t = {}
    for i = a, b, c do t[#t + 1] = i end
    return t
end

--[[
function table.merge(a, b)
    if a == b then return b end
    if b and (type(b) == "table") then 
        local bmt = getmetatable(b) or { }
        local i = bmt.__index or nop;
        local a = a or { }
        bmt.__index = function (self, key) 
            return i(self, key) or a[key] 
        end
        -- if i == bmt.__index then bmt.__index = function (self, key) return a[key] end end
        setmetatable(b, bmt)
    end
    return b
end
]]

function table.merge(a, b)
    local c = setmetatable({}, getmetatable(a))
    for k,v in __pairs(a) do c[k] = v end
    for k,v in __pairs(b) do c[k] = v end
    return c
end

function is_subclass(A, B)
    local mt = getmetatable(A)
    while mt do
        if mt == B then return true end
        mt = getmetatable(mt)
    end
    return false
end

local function get_empty_table() return {} end
local function proto(__proto, __super)
    __proto.__index = __proto
    __proto.constructor = __proto.constructor or get_empty_table
    __proto.__proto = __proto.__proto or __proto
    __proto.__super = __proto.__super or __super
    local construct = {
        __call = function(self, ...)
            return setmetatable(__proto.constructor(...), __proto)
        end,
        __index = __super
    }
    if __super then construct = setmetatable(construct, __super) end
    return setmetatable(__proto, construct);
end

local function extend(__super, __proto) return proto(__proto, __super) end

--[[
local function head(a) return a[1] end
local function tail(a) return {select(2,unpack(a))} end
]]

local function last(a) return a[#a] end
local function body(a) 
    local b = {} 
    for i=1,#a-1 do b[i]=a[i] end 
    return b 
end

local function pairs(t)
    local keyset = {}
    for k, v in __pairs(t) do keyset[#keyset+1] = {k, v} end
    return keyset
end

local function DEBUG(a)
    for k, v in __pairs(a) do
        print(k, v)
    end
end

local function panic()
    error("Panicked!", 2)
end

getmetatable("").__index = function(str,i) return string.sub(str,i,i) end

local function identity(...)
    return ...
end

local function count(a)
    local i = 0
    for k in __pairs(a) do i = i + 1 end
    return i
end

local function set(t, k, v) 
    if k then t[k] = v end
    return t
end

local function dummy() end

local serialise_table
require("preamble");serialise_table = function(t)  local serialise_table_kv;serialise_table_kv = function(kv)  local n;n = len(kv);if (n==0) then return "" elseif (n==1) then local k,v,__a;__a = head(kv);k = __a[1] v = __a[2] ;return string.format("%s: %s",serialise(k),serialise(v)) else local k,v,__a;__a = head(kv);k = __a[1] v = __a[2] ;return string.format("%s: %s, %s",serialise(k),serialise(v),serialise_table_kv(tail(kv))) end end;return string.format("{ %s }",serialise_table_kv(pairs(t))) end
array_join = function(a,sep,transformer) if sep == nil then sep = ", " end if transformer == nil then transformer = serialise end local n;n = len(a);if (n==0) then return "" elseif (n==1) then return transformer(head(a)) else return ((transformer(head(a))..sep)..array_join(tail(a),sep,transformer)) end end
serialise = function(x)  local T;T = type(x);if (T=="nil") then return "nil" elseif (T=="number") then return tostring(x) elseif (T=="string") then return string.format("\"%s\"",x) elseif (T=="boolean") then return tostring(x) elseif (T=="function") then return "function" elseif (T=="CFunction") then return "cfunction" elseif (T=="userdata") then return "userdata" elseif (T=="table") then if is_array(x) then return string.format("{ %s }",array_join(x,", ")) elseif (getmetatable(x) and getmetatable(x).__tostring) then return tostring(x) else return serialise_table(x) end else return panic((nil)) end end
