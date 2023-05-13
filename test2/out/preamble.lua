


function all(a,f)  
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


function any(a,f)  
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


function map(a,f)  
local __t = {} for _, x in __pairs(
a) do __t[#__t+1] = 

f(
x) end return __t end 


function filter(a,f)  
local __t = {} for _, x in __pairs(
a) do if (

f(
x)) then __t[#__t+1] = 
x end end return __t end 


function map_i(a,f,i) if i == nil then i = 
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


function slice(b,first,last) if last == nil then last = 

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


function foldr(a,v,f,i) if i == nil then i = 
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


function foldl(a,v,f,i) if i == nil then i = 
1 end 
 if type(a) == "table" and #a == 0 then  return 
v end  if type(a) == "table" then  local x = 
a[1]  if x ~= nil then  local xs = slice(a, 2, #a, 1)   return 

foldl(
xs,

f(
v,
x,
i),
f,
(
i+
1)) end  end return 

error(
"foldl: expected array",
2) end 


function range(a,b,step) if step == nil then step = 
1 end 


local __temp3 
if 
(
b==
(nil)) then __temp3 = 
{
1,
a} else __temp3 = 
{
a,
b} end 
local first;first = 
__temp3[1] 
local last;last = 
__temp3[2] ;
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


function pack(...) local x = {...}  return 
x end 


function is_array(t)  return 
(
(

type(
t)==
"table") and 

all(

pairset(
t),
function (kv)  



local k;k = 
kv[1] 
local _;_ = 
kv[2] ;return 
(

type(
k)==
"number") end)) end 


function flatten(a)  return 

foldl(
a,
{},
function (l,r)  
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


function shallow_flatten(a)  return 

foldl(
a,
{},
function (l,r)  
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


function sole(a)  return 

a[

len(
a)] end 


function member(a,x)  return 

any(
a,
function (y)  return 
(
y==
x) end) end 


string.join = 
function (a,sep) if sep == nil then sep = 
"" end 



local h;h = 
a[1] 
local t;t = 
slice(a, 2, #a, 1) ;return 

foldl(
t,
(
h or 
""),
function (l,r)  return 
(
(
l..
sep)..
r) end) end 