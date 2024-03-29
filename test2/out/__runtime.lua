
__pairs = pairs
unpack = unpack or table.unpack
function concat(a, b)
    local c = { unpack(a) }
    for i=1, #b do
        c[#c+1] = b[i]
    end
    return c
end

function len(a) return #a end
function nop() end

function symbol(mt) 
    if type(mt) == "string" then return setmetatable({}, {__tostring = function() return mt end})
    elseif mt then return setmetatable({}, mt) 
    else return {} end
end

function box(__proto)
    __proto.__index = function(self, k)
        return self[k] or __proto[k]
    end
    return setmetatable(__proto, {
        __call = function(self, ...)
            return setmetatable({...}, __proto)
        end,
    })
end

unset = symbol()
function overwrite(a, b)
    for k,v in __pairs(b) do 
        if type(a[k]) == "table" and type(v) == "table" then 
            overwrite(a[k], v)
        elseif v == unset then
            a[k] = nil
        else
            a[k] = v 
        end
    end
    return a
end

function table.merge(a, b)
    local c = setmetatable({}, getmetatable(a))
    for k,v in __pairs(a) do c[k] = v end
    for k,v in __pairs(b) do c[k] = v end
    return c
end

function is_subclass(A, B)
    local mt = getmetatable(A)
    while mt do
        if mt == B then return true end
        mt = getmetatable(mt)
    end
    return false
end

function get_empty_table() return {} end
function proto(__proto, __super)
    __proto.__index = function(self, k)
        return self[k] or __proto[k]
    end
    __proto.constructor = __proto.constructor or get_empty_table
    __proto.__proto = __proto.__proto or __proto
    __proto.__super = __proto.__super or __super
    local construct = {
        __call = function(self, ...)
            return setmetatable(__proto.constructor(...), __proto)
        end,
        __index = __super
    }
    if __super then construct = setmetatable(construct, __super) end
    return setmetatable(__proto, construct);
end

function extend(__super, __proto) return proto(__proto, __super) end

function head(a) return a[1] end
function slice(a, start, finish, step) 
    local b = setmetatable({}, getmetatable(a))
    for i=start,finish,step do b[#b+1]=a[i] end
    return b
end
function tail(a) return slice(a, 2, #a, 1) end

function last(a) return a[#a] end
function body(a) 
    local b = setmetatable({}, getmetatable(a)) 
    for i=1,#a-1 do b[i]=a[i] end 
    return b 
end

function pairset(t)
    local keyset = {}
    for k, v in __pairs(t) do keyset[#keyset+1] = {k, v} end
    return keyset
end

function DEBUG(a)
    for k, v in __pairs(a) do
        print(k, v)
    end
end

function panic()
    error("Panicked!", 2)
end

do 
    local old_index = getmetatable("").__index
    getmetatable("").__index = function(str,i) if type(i) == "number" then return string.sub(str,i,i) else return old_index[i] end end
end

function identity(...) return ... end

function count(a)
    local i = 0
    for k in __pairs(a) do i = i + 1 end
    return i
end

function modify(t, k, v) 
    if k then t[k] = v end
    return t
end

function __not(x) return not x end

__is_love2d = not not love

function import(path)
    local dir_begin, dir_end = path:find("[/\\]")
    local dir = path:sub(1, dir_end or 0)
    local ext_begin, ext_end = path:find("%.[^%.]*$")
    local ext = path:sub((ext_begin or 0) + 1, (ext_end or 0))
    local file_without_ext = path:sub((dir_end or 0) + 1, (ext_begin or 0) - 1)
    local old0 = package.path
    local old1
    if __is_love2d then 
        old1 = love.filesystem.getRequirePath() 
    end
    if dir == "" then dir = "." end
    package.path = dir .. "/?." .. ext
    if __is_love2d then
        love.filesystem.setRequirePath(dir .. "/?." .. ext)
    end
    local x = require(file_without_ext)
    package.path = old0
    if __is_love2d then
        love.filesystem.setRequirePath(old1)
    end
    return x
end

function string.trim(s)
    return s:match("^%s*(.-)%s*$")
end

local function normalise_path(path)
    if path:sub(1, 2) == "./" then
        path = path:sub(3)
    end
    return path
end

local function __lookup_mapping(filename, line)
    local file_mappings = __mappings[normalise_path(string.trim(filename))]
    local src_filename = __filename_mappings[normalise_path(string.trim(filename))]
    if file_mappings and file_mappings[tonumber(line)] then 
        return src_filename, file_mappings[tonumber(line)]
    else 
        return filename, line
    end
end

local function __replace_line_numbers(str)
    local filename, line, message, filename2, line2 = str:match("([^%s]-):(%d+): ([^<]+)<([^%s]-):(%d+)>")
    if filename then 
        local src_filename, src_line = __lookup_mapping(filename, line)
        local src_filename2, src_line2 = __lookup_mapping(filename2, line2)
        local template = string.gsub(str, "([^%s]-):(%d+): ([^<]+)<([^%s]-):(%d+)>", "%%s:%%s: %%s<%%s:%%s>")
        return string.format(template, src_filename, src_line, message, src_filename2, src_line2)
    else
        local filename, line, message = str:match("([^%s]-):(%d+): (.+)")
        if not filename then return str end
        local src_filename, src_line = __lookup_mapping(filename, line)
        local template = string.gsub(str, "([^%s]-):(%d+): (.+)", "%%s:%%s: %%s")
        return string.format(template, src_filename, src_line, message)
    end
end

local function magiclines(s)
    if s:sub(-1)~="\n" then s=s.."\n" end
    return s:gmatch("(.-)\n")
end

local function __handle_error(err)
    io.write("ligmascript: ")
    for line in magiclines(debug.traceback(err, 2)) do
        print(__replace_line_numbers(line))
    end
    os.exit(1)
end

function __report_error(f)
    return xpcall(f, __handle_error)
end

main = nop

