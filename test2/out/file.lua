import("monad.lua") 


function file_open(path,mode)  
local __temp0 = 


io.open(
path,
mode)  local f = 
__temp0  if f ~= nil then  return 

some(
f) end return 
none end 