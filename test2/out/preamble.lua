


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


function range(a,b,step) if step == nil then step = 
1 end 



if 
(
b==
(nil)) then __temp0 = 
{
1,
a} else __temp0 = 
{
a,
b} end 
local first;first = 
__temp0[1] 
local last;last = 
__temp0[2] ;
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


__temp1 = 
kv 
local k;k = 
__temp1[1] 
local _;_ = 
__temp1[2] ;return 
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


__temp2 = 
a 
local h;h = 
__temp2[1] 
local t;t = 
slice(__temp2, 2, #__temp2, 1) ;return 

foldl(
t,
h,
function (l,r)  return 
(
(
l..
sep)..
r) end) end 