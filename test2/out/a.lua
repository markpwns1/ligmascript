require("__mappings") require("__runtime") 


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