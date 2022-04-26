
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

head = function(a)  return a[1] end
all = function(a,f)  if (len(a)==0) then return true else return (f(a[1]) and all(tail(a),f)) end end
any = function(a,f)  if (len(a)==0) then return false else return (f(a[1]) or any(tail(a),f)) end end
map = function(a,f)  local __t = {} for _, x in __pairs(a) do __t[#__t+1] = f(x) end return __t end
filter = function(a,f)  local __t = {} for _, x in __pairs(a) do if (f(x)) then __t[#__t+1] = x end end return __t end
map_i = function(a,f,i) if i == nil then i = 1 end if (len(a)==0) then return {} else return concat({f(head(a),i)},map_i(tail(a),f,(i+1))) end end
slice = function(b,first,last) if last == nil then last = len(b) end if (type(b)=="string") then return string.sub(b,first,last) else if (first>=last) then return {b[first]} else return concat({b[first]},slice(b,(first+1),last)) end end end
tail = function(a)  if (len(a)==0) then return (nil) else return slice(a,2) end end
foldr = function(a,v,f,i) if i == nil then i = 1 end local n;n = len(a);if (n==0) then return v else return f(head(a),foldr(tail(a),v,f,(i+1)),i) end end
foldl = function(a,v,f,i) if i == nil then i = 1 end local n;n = len(a);if (n==0) then return v else return foldl(tail(a),f(v,head(a),i),f,(i+1)) end end
range = function(a,b,step) if step == nil then step = 1 end local first,last,__a;if (b==(nil)) then __a = {1,a} else __a = {a,b} end;first = __a[1] last = __a[2] ;if (first==last) then return {first} elseif (last<first) then return {} else return concat({first},range((first+step),last,step)) end end
parts = function(t)  return {head(t),tail(t)} end
pack = function(...) local x = {...}  return x end
is_array = function(t)  return ((type(t)=="table") and all(pairs(t),function(kv)  local k,v,__a;__a = kv;k = __a[1] v = __a[2] ;return (type(k)=="number") end)) end
flatten = function(a)  return foldl(a,{},function(l,r)  if is_array(r) then return concat(l,flatten(r)) else return concat(l,{r}) end end) end
shallow_flatten = function(a)  return foldl(a,{},function(l,r)  if is_array(r) then return concat(l,r) else return concat(l,{r}) end end) end
sole = function(a)  return a[len(a)] end
