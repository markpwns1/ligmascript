require("__mappings") require("__runtime") __report_error(function() local q,a,c,__while,main 
q = 
69 
local __t = 
{[
"a"]=
1,[
"b"]=
2,[
"c"]=
3};a = __t[
"a"];c = __t[
"c"] 
__while = 
function(cond,body)  
if 

cond(
(nil)) then 


body(
(nil));

__while(
cond,
body) else return 
(nil) end end 
main = 
function()  


i = 
0;

__while(
function()  return 
(
i<
10) end,
function()  


print(
i);

i = 
(
i+
1) end);

print(


x.y.z) end main() end)