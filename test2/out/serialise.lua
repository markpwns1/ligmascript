local serialise_pair,serialise_table,serialise_object,show_one import("preamble.lua") 

local 
function serialise_pair(p,visited)  



local k;k = 
p[1] 
local v;v = 
p[2] ;return 
string.format("%s = %s",

serialise(
k,
visited),

serialise(
v,
visited)) end 

local 
function serialise_table(t,visited)  



local p;p = 

pairset(
t) 
local n;n = 

len(
p) ;
if 
(
n==
0) then return 
"{}" else return 
string.format("{ %s }",


string.join(

map(
p,
function (x)  return 

serialise_pair(
x,
visited) end),
", ")) end end 

local 
function serialise_object(x,visited)  


local obj;
if 

is_array(
x) then obj = 
string.format("[ %s ]",


string.join(

map(
x,
function (x)  return 

serialise(
x,
visited) end),
", ")) elseif 
(

getmetatable(
x) and 

getmetatable(
x).__tostring) then obj = 

tostring(
x) else obj = 

serialise_table(
x,
visited) end;return 
string.format("(%s) %s",

tostring(
x),
obj) end 


function serialise(x,visited) if visited == nil then visited = 
{} end 
local __temp4 = 

type(
x)  if 
"nil" == 
__temp4 then  return 
"nil" end  if 
"number" == 
__temp4 then  return 

tostring(
x) end  if 
"boolean" == 
__temp4 then  return 

tostring(
x) end  if 
"string" == 
__temp4 then  return 
string.format("\"%s\"",
x) end  if 
"function" == 
__temp4 then  return 
"<function>" end  if 
"CFunction" == 
__temp4 then  return 
"<cfunction>" end  if 
"userdata" == 
__temp4 then  return 
"<userdata>" end  if 
"table" == 
__temp4 then  
if 

member(
visited,
x) then return 
string.format("(recursive) (%s)",

tostring(
x)) else 



visited[
(

len(
visited)+
1)] = 
x;return 

serialise_object(
x,
visited) end end return 

panic(
(nil)) end 

local 
function show_one(x)  
local __temp6 = 

type(
x)  if 
"table" == 
__temp6 then  return 

serialise_object(
x,
{
x}) end return 
x end 


function show(...) local x = {...}  return 

print(
unpack(

map(
x,
show_one))) end 