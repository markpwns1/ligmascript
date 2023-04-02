local smt, gmt, prs, iprs, var_mt = setmetatable, getmetatable, pairs, ipairs, { 
    __tostring = function(self) return self.n end,
    __eq = function(a, b) return a.n == b.n end
}

local function var(name) 
    return smt({ n = name }, var_mt)
end

local function tail(name)
    return smt({ n = name, tail = true }, var_mt)
end

local function is_var(v)
    return gmt(v) == var_mt
end

local function is_tail(v)
    return gmt(v) == var_mt and v.tail
end

local function get_tail(a)
    local last_index = #a
    return (last_index > 0 and is_tail(a[last_index])), last_index
end

local function concat(a, b)
    for i, v in iprs(b) do a[#a+1] = v end
    return a
end

local function compatible(a, b)
    if is_var(a) or is_var(b) then
        return true
    elseif type(a) ~= type(b) then 
        return false
    elseif type(a) == "table" then
        local has_tail, last_index = get_tail(a)
        for k, v in prs(a) do
            if not compatible(v, b[k]) then return false end 
        end
        if not has_tail then
            for k, v in prs(b) do 
                if not compatible(v, a[k]) then return false end 
            end
        end
        return true
    else
        return a == b 
    end
end

local function get_replacements(a, b)
    if not compatible(a, b) then 
        return {}, false
    elseif is_var(a) and is_var(b) then
        return { { f = a, t = b }, { f = b, t = a } }, true
    elseif is_var(a) then
        return { { f = a, t = b } }, true
    elseif is_var(b) then
        return { { f = b, t = a } }, true
    elseif type(a) == "table" then 
        local replacements, success, has_tail, last_index = {}, true, get_tail(a)

        for k, v in prs(a) do 
            if has_tail and last_index == k then
                local tbl = {}
                for i = last_index, #b do
                    tbl[#tbl+1] = b[i]
                end
                concat(replacements, { { f = a[last_index], t = tbl } })
            else
                local r, s = get_replacements(v, b[k])
                if not s then success = false end
                concat(replacements, r)
            end
        end

        return replacements, success
    else 
        return {}, true
    end
end

local function resolve(r)
    local success, a = true, {}
    for _, r0 in prs(r) do
        for k, r1 in prs(r) do 
            if r0 ~= r1 then
                if r0.f == r1.f and r0.f.n ~= "_" and not compatible(r1.t, r0.t) then 
                    success = false 
                end

                if r1.t == r0.f then 
                    r1.t = r0.t 
                end
            end
        end
    end

    for i, v in iprs(r) do
        if v.f ~= v.t then 
            a[v.f.n] = v.t
        end
    end
    a["_"] = nil

    return success, a 
end

local function unify(a, b, c, ...)
    if c ~= nil then error("expected 2 arguments to 'unify' but got " .. (3+#({...})), 2) end
    return resolve(get_replacements(a, b))
end

local function apply(t, r)
    if is_var(t) then 
        return r[t.n] or t
    elseif type(t) == "table" then 
        local t0 = smt({}, gmt(t))
        for k, v in prs(t) do 
            if is_tail(v) then 
                for i, w in iprs(apply(v, r)) do 
                  t0[k+i-1] = w
                end
            else
                t0[k] = apply(v, r)
            end
        end
        return t0
    else 
        return t
    end
end

local function table_to_replacements(t)
    local r = {}
    for k, v in prs(t) do 
        r[#r+1] = { f = var(k), t = v }
    end
    return r
end

local function combine_environments(a, b)
    return resolve(concat(table_to_replacements(a), table_to_replacements(b)))
end

return smt({
    replace = apply,
    is_var = is_var,
    var = var,
    tail = tail,
    combine = combine_environments,
    _ = var("_")
}, {
    __call = function(_, ...) return unify(...) end
})