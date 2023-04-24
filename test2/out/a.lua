require("__mappings") require("__runtime") local any,main 

local 
function any(a,f)  
while true do 

if type(a) ~= "table" or #a ~= 0 then break end return 
false end while true do 



local x = 
a[1] if (x == nil) then break end  local xs = slice(a, 2, #a, 1) return 
(

f(
x) or 

any(
xs,
f)) end return 

panic(
(nil))  end 

local 
function main()  


local a;a = 
{
1,
2,
3,
4,
5};


print(

any(
a,
function (self)  return 
(
self>
3) end));

print(

any(
a,
function (self)  return 
(
self>
5) end)) end __report_error(main)