local serialise_pair,serialise_table,serialise_object,show_one import("preamble.lua") 

local 
function serialise_pair(p,visited)  


__temp3 = 
p 
local k;k = 
__temp3[1] 
local v;v = 
__temp3[2] ;return 
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
x) local __temp5 = true while __temp5 do 

if 
"nil" ~= 
__temp4 then break end  do return 
"nil" end __temp5 = false break end while __temp5 do 

if 
"number" ~= 
__temp4 then break end  do return 

tostring(
x) end __temp5 = false break end while __temp5 do 

if 
"boolean" ~= 
__temp4 then break end  do return 

tostring(
x) end __temp5 = false break end while __temp5 do 

if 
"string" ~= 
__temp4 then break end  do return 
string.format("\"%s\"",
x) end __temp5 = false break end while __temp5 do 

if 
"function" ~= 
__temp4 then break end  do return 
"<function>" end __temp5 = false break end while __temp5 do 

if 
"CFunction" ~= 
__temp4 then break end  do return 
"<cfunction>" end __temp5 = false break end while __temp5 do 

if 
"userdata" ~= 
__temp4 then break end  do return 
"<userdata>" end __temp5 = false break end while __temp5 do 

if 
"table" ~= 
__temp4 then break end  do 
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
visited) end end __temp5 = false break end if __temp5 then return 

panic(
(nil)) end  end 

local 
function show_one(x)  
local __temp6 = 

type(
x) local __temp7 = true while __temp7 do 

if 
"table" ~= 
__temp6 then break end  do return 

serialise_object(
x,
{
x}) end __temp7 = false break end if __temp7 then return 
x end  end 


function show(...) local x = {...}  return 

print(
unpack(

map(
x,
show_one))) end 