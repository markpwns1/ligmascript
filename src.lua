local __filename, __mappings = "C:/Users/Mark/Desktop/my-stuff/Programming/funclang/src.t", {[154]=429,[155]=431,[156]=431,[157]=431,[158]=431,[159]=431,[160]=431,[161]=431,[162]=431,[163]=432,[164]=433,[165]=433,[166]=434,[167]=434,[168]=435,[169]=435,[170]=436,[171]=436,[172]=438,[173]=438,[174]=440,[175]=441,[176]=441,[177]=442,[178]=442,[179]=443,[180]=443,[181]=445,[182]=445}
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

local unset = {}
function overwrite(a, b)
    for k,v in __pairs(b) do 
        if type(a[k]) == "table" and type(v) == "table" then 
            overwrite(a[k], v)
        elseif v == unset then
            a[k] = nil
        else
            a[k] = v 
        end
    end
    return a
end

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

do 
    local old_index = getmetatable("").__index
    getmetatable("").__index = function(str,i) if type(i) == "number" then return string.sub(str,i,i) else return old_index[i] end end
end

local function identity(...)
    return ...
end

local function count(a)
    local i = 0
    for k in __pairs(a) do i = i + 1 end
    return i
end

local function modify(t, k, v) 
    if k then t[k] = v end
    return t
end

local function dummy() end
local function __not(x) return not x end

local function __report_error(f)
    local success, result = pcall(f)
    if success then return success 
    else
        local filename, line, message = result:match('(.-):(%d+): (.+)')
        -- filename = filename:gsub('\', '/')
        -- filename = filename:sub(1, filename:find('/[^/]*$')) .. __filename
        error(string.format("%s:%s: %s", __filename, __mappings[tonumber(line)] or line, message), 0)
    end
end

local main = dummy

local main require(
"serialise");
main = 
function()  return 

print(

serialise(

overwrite(
{[
"a"]=
3,[
"b"]=
{[
"c"]=
4,[
"d"]=
5},[
"c"]=
"hello"},
{[
"a"]=
"world",[
"b"]=
{[
"c"]=
69},[
"c"]=
unset}))) end 
__report_error(main)