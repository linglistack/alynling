get_param <- function(body, name, default, coerce = identity) {
  if (is.null(body[[name]])) default else coerce(body[[name]])
}