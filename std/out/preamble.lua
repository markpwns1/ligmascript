require("__mappings") require("__runtime") __report_error(function() local head,all,any,map,filter,map_i,slice,tail,foldr,foldl,range,parts,pack,is_array,flatten,shallow_flatten,sole 
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

local k,_,__a;__a = 
kv;k = __a[1] ;return 
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
a)] end  end)