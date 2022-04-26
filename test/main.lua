local __filename, __mappings = "C:/Users/Mark/Desktop/my-stuff/Programming/funclang/test/main.jam", {[144]=7,[145]=9,[146]=9,[147]=10,[148]=10,[149]=11,[150]=11,[151]=14,[152]=14,[153]=15,[154]=15,[155]=16,[156]=16,[157]=19,[158]=19,[159]=21,[160]=21,[161]=21,[162]=21,[163]=21,[164]=21,[165]=22,[166]=22,[167]=22,[168]=23,[169]=23,[170]=24,[171]=24,[172]=24,[173]=24,[174]=24,[175]=24,[176]=24,[177]=24,[178]=26,[179]=26,[180]=26,[181]=26,[182]=29,[183]=29,[184]=29,[185]=30,[186]=30,[187]=30,[188]=31,[189]=32,[190]=32,[191]=32,[192]=32,[193]=35,[194]=35,[195]=35,[196]=35,[197]=35,[198]=35,[199]=36,[200]=36}
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

function overwrite(a, b)
    for k,v in __pairs(b) do a[k] = v end
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

local next_message_table,state,love_draw,main require(
"preamble");
next_message_table = 
{[
"seizure"]=
"program",[
"program"]=
"seizure"} 
state = 
{[
"current_message"]=
"seizure",[
"show_message"]=
true} 
love_draw = 
function()  

local __t = 
state;local current_message,show_message;current_message = __t[
"current_message"];show_message = __t[
"show_message"];


print(
"seizure program seizure program");
if 
show_message then dummy(



love.graphics.print(
current_message,
400,
300)) else dummy(
(nil)) end;return 

overwrite(
state,
{[
"current_message"]=
(function() if 
show_message then return 

next_message_table[
current_message] else return 
current_message end end)(),[
"show_message"]=

__not(
show_message)}) end 
main = 
function()  return 

overwrite(
love,
{[
"draw"]=
love_draw}) end 
__report_error(main)