local unwrappable 

local unwrappable;unwrappable = 
{[
"unwrap"]=
function (self)  return 

self[
1] end} 

some = 

box(
unwrappable) 

none = 

symbol(
{[
"unwrap"]=
function (self)  return 
(nil) end}) 

left = 

box(
unwrappable) 

right = 

box(
unwrappable) 


function unwrap(self)  return 

self:unwrap(
(nil)) end 