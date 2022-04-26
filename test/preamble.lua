local __filename, __mappings = "C:/Users/Mark/Desktop/my-stuff/Programming/funclang/test/preamble.jam", {[144]=39,[145]=39,[146]=39,[147]=39,[148]=39,[149]=41,[150]=41,[151]=41,[152]=42,[153]=42,[154]=42,[155]=42,[156]=42,[157]=42,[158]=43,[159]=43,[160]=43,[161]=43,[162]=43,[163]=43,[164]=43,[165]=43,[166]=43,[167]=43,[168]=43,[169]=43,[170]=45,[171]=45,[172]=45,[173]=46,[174]=46,[175]=46,[176]=46,[177]=46,[178]=46,[179]=47,[180]=47,[181]=47,[182]=47,[183]=47,[184]=47,[185]=47,[186]=47,[187]=47,[188]=47,[189]=47,[190]=47,[191]=49,[192]=49,[193]=49,[194]=49,[195]=49,[196]=49,[197]=49,[198]=50,[199]=50,[200]=50,[201]=50,[202]=50,[203]=50,[204]=50,[205]=50,[206]=52,[207]=52,[208]=52,[209]=52,[210]=53,[211]=53,[212]=53,[213]=53,[214]=53,[215]=53,[216]=54,[217]=54,[218]=54,[219]=54,[220]=54,[221]=54,[222]=54,[223]=54,[224]=54,[225]=54,[226]=54,[227]=54,[228]=54,[229]=54,[230]=54,[231]=54,[232]=54,[233]=57,[234]=57,[235]=57,[236]=57,[237]=57,[238]=57,[239]=58,[240]=58,[241]=58,[242]=58,[243]=58,[244]=58,[245]=58,[246]=58,[247]=58,[248]=58,[249]=58,[250]=59,[251]=60,[252]=60,[253]=60,[254]=60,[255]=60,[256]=60,[257]=60,[258]=61,[259]=61,[260]=61,[261]=61,[262]=61,[263]=61,[264]=61,[265]=61,[266]=61,[267]=61,[268]=61,[269]=61,[270]=64,[271]=64,[272]=64,[273]=65,[274]=65,[275]=65,[276]=65,[277]=65,[278]=65,[279]=66,[280]=66,[281]=66,[282]=66,[283]=68,[284]=68,[285]=68,[286]=69,[287]=69,[288]=69,[289]=69,[290]=69,[291]=69,[292]=70,[293]=70,[294]=70,[295]=70,[296]=71,[297]=71,[298]=71,[299]=71,[300]=71,[301]=71,[302]=71,[303]=71,[304]=71,[305]=71,[306]=71,[307]=71,[308]=71,[309]=71,[310]=71,[311]=71,[312]=73,[313]=73,[314]=73,[315]=74,[316]=74,[317]=74,[318]=74,[319]=74,[320]=74,[321]=75,[322]=75,[323]=75,[324]=75,[325]=76,[326]=76,[327]=76,[328]=76,[329]=76,[330]=76,[331]=76,[332]=76,[333]=76,[334]=76,[335]=76,[336]=76,[337]=76,[338]=76,[339]=76,[340]=76,[341]=83,[342]=83,[343]=83,[344]=84,[345]=84,[346]=84,[347]=85,[348]=85,[349]=85,[350]=85,[351]=85,[352]=85,[353]=86,[354]=86,[355]=86,[356]=87,[357]=88,[358]=88,[359]=88,[360]=88,[361]=88,[362]=89,[363]=89,[364]=89,[365]=89,[366]=90,[367]=90,[368]=90,[369]=90,[370]=90,[371]=90,[372]=90,[373]=90,[374]=90,[375]=90,[376]=92,[377]=92,[378]=92,[379]=92,[380]=92,[381]=92,[382]=92,[383]=92,[384]=92,[385]=94,[386]=94,[387]=94,[388]=96,[389]=96,[390]=97,[391]=97,[392]=97,[393]=97,[394]=97,[395]=97,[396]=97,[397]=97,[398]=97,[399]=97,[400]=97,[401]=97,[402]=98,[403]=98,[404]=98,[405]=98,[406]=98,[407]=98,[408]=98,[409]=98,[410]=106,[411]=106,[412]=106,[413]=106,[414]=106,[415]=106,[416]=106,[417]=106,[418]=107,[419]=107,[420]=107,[421]=107,[422]=107,[423]=107,[424]=107,[425]=107,[426]=108,[427]=108,[428]=108,[429]=108,[430]=110,[431]=110,[432]=110,[433]=110,[434]=110,[435]=110,[436]=110,[437]=110,[438]=111,[439]=111,[440]=111,[441]=111,[442]=111,[443]=111,[444]=112,[445]=112,[446]=112,[447]=112,[448]=114,[449]=114,[450]=114,[451]=114,[452]=114,[453]=114,[454]=114}
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


head = 
function(a)  return 

a[
1] end 
all = 
function(a,f)  
if 
(

len(
a)==
0) then return 
true else return 
(

f(

a[
1]) and 

all(

tail(
a),
f)) end end 
any = 
function(a,f)  
if 
(

len(
a)==
0) then return 
false else return 
(

f(

a[
1]) or 

any(

tail(
a),
f)) end end 
map = 
function(a,f)  
local __t = {} for _, x in __pairs(
a) do __t[#__t+1] = 

f(
x) end return __t end 
filter = 
function(a,f)  
local __t = {} for _, x in __pairs(
a) do if (

f(
x)) then __t[#__t+1] = 
x end end return __t end 
map_i = 
function(a,f,i) if i == nil then i = 
1 end 
if 
(

len(
a)==
0) then return 
{} else return 
concat(
{

f(

head(
a),
i)},

map_i(

tail(
a),
f,
(
i+
1))) end end 
slice = 
function(b,first,last) if last == nil then last = 

len(
b) end 
if 
(

type(
b)==
"string") then return 


string.sub(
b,
first,
last) else 
if 
(
first>=
last) then return 
{

b[
first]} else return 
concat(
{

b[
first]},

slice(
b,
(
first+
1),
last)) end end end 
tail = 
function(a)  
if 
(

len(
a)==
0) then return 
(nil) else return 

slice(
a,
2) end end 
foldr = 
function(a,v,f,i) if i == nil then i = 
1 end 

local n;n = 

len(
a);
if 
(
n==
0) then return 
v else return 

f(

head(
a),

foldr(

tail(
a),
v,
f,
(
i+
1)),
i) end end 
foldl = 
function(a,v,f,i) if i == nil then i = 
1 end 

local n;n = 

len(
a);
if 
(
n==
0) then return 
v else return 

foldl(

tail(
a),

f(
v,

head(
a),
i),
f,
(
i+
1)) end end 
range = 
function(a,b,step) if step == nil then step = 
1 end 

local first,last,__a;
if 
(
b==
(nil)) then __a = 
{
1,
a} else __a = 
{
a,
b} end;first = __a[1] last = __a[2] ;
if 
(
first==
last) then return 
{
first} elseif 
(
last<
first) then return 
{} else return 
concat(
{
first},

range(
(
first+
step),
last,
step)) end end 
parts = 
function(t)  return 
{

head(
t),

tail(
t)} end 
pack = 
function(...) local x = {...}  return 
x end 
is_array = 
function(t)  return 
(
(

type(
t)==
"table") and 

all(

pairs(
t),
function(kv)  

local k,v,__a;__a = 
kv;k = __a[1] v = __a[2] ;return 
(

type(
k)==
"number") end)) end 
flatten = 
function(a)  return 

foldl(
a,
{},
function(l,r)  
if 

is_array(
r) then return 
concat(
l,

flatten(
r)) else return 
concat(
l,
{
r}) end end) end 
shallow_flatten = 
function(a)  return 

foldl(
a,
{},
function(l,r)  
if 

is_array(
r) then return 
concat(
l,
r) else return 
concat(
l,
{
r}) end end) end 
sole = 
function(a)  return 

a[

len(
a)] end 