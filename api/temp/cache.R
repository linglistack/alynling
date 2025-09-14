# cache.R
library(digest)

.cache_env <- new.env(parent = emptyenv())

set_cached <- function(key, value) assign(key, value, envir = .cache_env)
get_cached <- function(key) if (exists(key, envir = .cache_env)) get(key, envir = .cache_env) else NULL
