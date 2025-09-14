# GeoLift API using Plumber
library(plumber)
library(jsonlite)
library(dplyr)
library(foreach)
library(doParallel)

# Source all GeoLift R files - use dynamic paths
project_root <- getwd()
if (file.exists("api/geolift_api.R")) {
  # If running from project root
  r_path <- "R"
} else if (file.exists("../R")) {
  # If running from api directory
  r_path <- "../R"
  project_root <- dirname(getwd())
} else {
  # Fallback - try to find R directory
  r_path <- file.path(dirname(dirname(getwd())), "R")
  if (!dir.exists(r_path)) {
    stop("Cannot find R directory. Please run from project root or api directory.")
  }
}

suppressMessages({
source(file.path(r_path, "imports.R"))
})
source(file.path(r_path, "auxiliary.R"))
source(file.path(r_path, "data.R"))
source(file.path(r_path, "MultiCell.R"))
source(file.path(r_path, "pre_processing_data.R"))
source(file.path(r_path, "pre_test_power.R"))
source(file.path(r_path, "post_test_analysis.R"))
source(file.path(r_path, "plots.R"))
source(file.path(r_path, "custom_geolift_functions/plot_helper.R"))
source(file.path(r_path, "custom_geolift_functions/gen_api_helper_fn.R"))
source(file.path(r_path, "../api/cache.R"))


#* Enable CORS
#* @filter cors
function(req, res) {
  res$setHeader("Access-Control-Allow-Origin", "*")
  res$setHeader("Access-Control-Allow-Methods", "GET,HEAD,PUT,PATCH,POST,DELETE")
  res$setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
  if (req$REQUEST_METHOD == "OPTIONS") {
    res$status <- 200
    return(list())
  } else {
    plumber::forward()
  }
}

#* Health check endpoint
#* @get /health
function() {
  list(status = "healthy", timestamp = Sys.time())
}


#* Upload and process CSV data
#* @post /api/data/upload
function(req, res) {
  tryCatch({
    body <- jsonlite::fromJSON(req$postBody)
    
    # Use get_param for cleaner parameter handling
    csv_data     <- get_param(body, "csv_data", NULL)
    location_col <- get_param(body, "location_col", "location", as.character)
    time_col     <- get_param(body, "time_col", "date", as.character)
    outcome_col  <- get_param(body, "outcome_col", "Y", as.character) 
    format       <- get_param(body, "format", "yyyy-mm-dd", as.character)
    
    # Safeguard: CSV presence
    if (is.null(csv_data) || csv_data == "") {
      res$status <- 400
      return(list(error = "CSV data is required"))
    }
    
    # Try reading the CSV
    data <- tryCatch({
      read.csv(text = csv_data, stringsAsFactors = FALSE)
    }, error = function(e) {
      res$status <- 400
      return(list(error = paste("Invalid CSV format:", e$message)))
    })
    
    # Safeguard: required columns exist
    required_cols <- c(location_col, time_col, outcome_col)
    if (!all(required_cols %in% names(data))) {
      res$status <- 400
      return(list(
        error = paste("Required columns not found. Expecting:",
                      paste(required_cols, collapse = ", "))
      ))
    }
    
    # Call GeoDataRead
    processed_data <- tryCatch({
      GeoLift::GeoDataRead(
        data = data,
        date_id = time_col,
        location_id = location_col,
        Y_id = outcome_col,
        format = format,
        summary = FALSE
      )
    }, error = function(e) {
      res$status <- 500
      return(list(error = paste("GeoDataRead failed:", e$message)))
    })
    
    # Build summary (if GeoDataRead succeeded)
    locations <- unique(processed_data$location)
    time_periods <- sort(unique(processed_data$time))
    date_range <- range(processed_data$date, na.rm = TRUE)
    
    list(
      success = TRUE,
      message = "Data processed successfully",
      data = processed_data,
      summary = list(
        total_rows = nrow(processed_data),
        locations = locations,
        num_locations = length(locations),
        time_periods = range(time_periods),
        num_time_periods = length(time_periods),
        date_range = as.character(date_range),
        date_to_time_mapping = data.frame(
          date = sort(unique(processed_data$date)),
          time = sort(unique(processed_data$time))
        )
      )
    )
    
  }, error = function(e) {
    res$status <- 500
    list(error = paste("Unexpected failure:", e$message))
  })
}










