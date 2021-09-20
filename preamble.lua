
local __pairs = pairs
local unpack = unpack or table.unpack
local function table_concat(a, b)
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
    local c = {}
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

local function tail(a)
    return { select(2, unpack(a)) }
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
local none,some,all
none = {["bind"]=function()  return none end,["is_none"]=true}
some = proto({["constructor"]=function(value)  return {["value"]=value} end,["bind"]=function(self,fn)  return maybe((fn(self.value))) end,["is_none"]=false})
boxed = proto({["constructor"]=function(value)  return {["value"]=value} end,["bind"]=function(self,fn)  return boxed((fn(self.value))) end})
pass = {["bind"]=function(self,fn)  return fn((nil)) end}
maybe = function(x)  if ((x==nil) or (x==none)) then return none else if is_subclass(x,some) then return x else return some(x) end end end
put = function(x)  io.write(x);return pass end
putln = function(x)  print(x);return pass end
read = function(x) if x == nil then x = "*line" end return boxed((io.read(x))) end
identity = function(x)  return x end
head = function(a)  return a[1] end
all = function(a,f)  if (len(a)==0) then return true else return (f(a[1]) and for_all((tail(a)))) end end
any = function(a,f)  if (len(a)==0) then return false else return (f(a[1]) or any((tail(a)))) end end
map = function(a,f)  local __t = {} for _, x in pairs(a) do __t[#__t+1] = f(x) end return __t end
filter = function(a,f)  local __t = {} for _, x in pairs(a) do if (f(a)) then __t[#__t+1] = x end end return __t end
