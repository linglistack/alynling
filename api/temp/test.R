# geolift_api_new.R

#* @apiTitle GeoLift Upload API
#* @apiDescription Upload and process CSV data for GeoLift

# Helper
get_param <- function(body, name, default, coerce = identity) {
  if (is.null(body[[name]])) default else coerce(body[[name]])
}

#* Upload and process CSV data
#* @post /api/data/upload
function(req, res) {
  ...
}


library(plumber)
pr <- plumb("api/geolift_api_new.R")
pr$run(port = 8000)