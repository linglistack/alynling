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
    csv_data <- body$csv_data
    location_col <- ifelse(is.null(body$location_col), "location", body$location_col)
    time_col <- ifelse(is.null(body$time_col), "time", body$time_col)
    outcome_col <- ifelse(is.null(body$outcome_col), "Y", body$outcome_col)
    
    if (is.null(csv_data) || csv_data == "") {
      res$status <- 400
      return(list(error = "CSV data is required"))
    }
    
    data <- read.csv(text = csv_data, stringsAsFactors = FALSE)
    
    if (!all(c(location_col, time_col, outcome_col) %in% names(data))) {
      res$status <- 400
      return(list(error = "Required columns not found in data"))
    }
    
    processed_data <- data %>%
      rename(
        location = !!sym(location_col),
        date_raw = !!sym(time_col), 
        Y = !!sym(outcome_col)
      ) %>%
      mutate(
        location = tolower(trimws(as.character(location))),
        Y = as.numeric(Y),
        # Robust date parsing: try ISO first, then common formats
        # Normalize date text before parsing
        date_clean = trimws(as.character(date_raw)),
        date = suppressWarnings(as.Date(date_clean))
      )

    # If date is NA for many rows, try alternative formats
    if (any(is.na(processed_data$date))) {
      suppressWarnings({
        alt <- try(as.Date(processed_data$date_clean, format = "%m/%d/%Y"), silent = TRUE)
        if (!inherits(alt, "try-error")) {
          idx <- is.na(processed_data$date) & !is.na(alt)
          processed_data$date[idx] <- alt[idx]
        }
      })
      suppressWarnings({
        alt2 <- try(as.Date(processed_data$date_clean, format = "%d/%m/%Y"), silent = TRUE)
        if (!inherits(alt2, "try-error")) {
          idx2 <- is.na(processed_data$date) & !is.na(alt2)
          processed_data$date[idx2] <- alt2[idx2]
        }
      })
    }

    processed_data <- processed_data %>%
      filter(!is.na(Y), !is.na(date)) %>%
      arrange(location, date) %>%
      mutate(time = as.numeric(date - min(date, na.rm = TRUE)) + 1)
    
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
    list(error = paste("Failed to process data:", e$message))
  })
}

#* Market selection for GeoLift test
#* @post /api/market-selection
function(req, res) {
  tryCatch({
    body <- jsonlite::fromJSON(req$postBody)
    data <- body$data
    treatment_periods <- ifelse(is.null(body$treatment_periods), 14, body$treatment_periods)
    effect_size <- ifelse(is.null(body$effect_size), c(0, 0.05, 0.1, 0.15, 0.2, 0.25), body$effect_size)
    lookback_window <- ifelse(is.null(body$lookback_window), 1, body$lookback_window)
    cpic <- ifelse(is.null(body$cpic), 1, body$cpic)
    alpha <- ifelse(is.null(body$alpha), 0.1, body$alpha)
    
    if (is.null(data)) {
      res$status <- 400
      return(list(error = "Data is required"))
    }
    
    data <- as.data.frame(data)
    
    # Ensure foreach backend available if GeoLift uses it
if (!is.null(getOption('mc.cores')) && getOption('mc.cores') > 1) {
  doParallel::registerDoParallel(parallel::detectCores())
}
market_selection <- GeoLiftMarketSelection(
      data = data,
      treatment_periods = treatment_periods,
      effect_size = effect_size,
      lookback_window = lookback_window,
      cpic = cpic,
      alpha = alpha,
      parallel = FALSE
    )
    
    list(
      success = TRUE,
      market_selection = market_selection$BestMarkets,
      summary = list(
        top_choice = market_selection$BestMarkets[1, ],
        total_options = nrow(market_selection$BestMarkets)
      )
    )
  }, error = function(e) {
    res$status <- 500
    list(error = paste("Market selection failed:", e$message))
  })
}

#* Power analysis for GeoLift test
#* @post /api/power-analysis
function(req, res) {
  tryCatch({
    body <- jsonlite::fromJSON(req$postBody)
    data <- body$data
    locations <- body$locations
    treatment_periods <- ifelse(is.null(body$treatment_periods), 14, body$treatment_periods)
    effect_size <- ifelse(is.null(body$effect_size), c(0, 0.05, 0.1, 0.15, 0.2, 0.25), body$effect_size)
    lookback_window <- ifelse(is.null(body$lookback_window), 1, body$lookback_window)
    cpic <- ifelse(is.null(body$cpic), 1, body$cpic)
    alpha <- ifelse(is.null(body$alpha), 0.1, body$alpha)
    
    if (is.null(data)) {
      res$status <- 400
      return(list(error = "Data is required"))
    }
    
    if (is.null(locations)) {
      res$status <- 400
      return(list(error = "Test locations are required"))
    }
    
    data <- as.data.frame(data)
    
    if (is.character(locations) && length(locations) == 1) {
      locations <- strsplit(locations, ",")[[1]]
      locations <- trimws(locations)
    }
    
    power_analysis <- GeoLiftPower(
      data = data,
      locations = locations,
      treatment_periods = treatment_periods,
      effect_size = effect_size,
      lookback_window = lookback_window,
      cpic = cpic,
      alpha = alpha,
      parallel = FALSE
    )
    
    list(
      success = TRUE,
      power_analysis = power_analysis,
      summary = list(
        locations = locations,
        max_power = max(power_analysis$power, na.rm = TRUE),
        recommended_effect_size = power_analysis$EffectSize[which.max(power_analysis$power)]
      )
    )
  }, error = function(e) {
    res$status <- 500
    list(error = paste("Power analysis failed:", e$message))
  })
}

#* Run GeoLift analysis
#* @post /api/geolift
function(req, res) {
  tryCatch({
    body <- jsonlite::fromJSON(req$postBody)
    data <- body$data
    locations <- body$locations
    treatment_start_date <- body$treatment_start_date
    treatment_end_date <- body$treatment_end_date
    alpha <- ifelse(is.null(body$alpha), 0.1, body$alpha)
    model <- ifelse(is.null(body$model), "none", body$model)
    confidence_intervals <- ifelse(is.null(body$confidence_intervals), TRUE, body$confidence_intervals)
    
    if (is.null(data)) {
      res$status <- 400
      return(list(error = "Data is required"))
    }
    
    if (is.null(locations)) {
      res$status <- 400
      return(list(error = "Test locations are required"))
    }
    
    if (is.null(treatment_start_date) || is.null(treatment_end_date)) {
      res$status <- 400
      return(list(error = "Treatment start and end dates are required"))
    }
    
    data <- as.data.frame(data)
    
    if (is.character(locations) && length(locations) == 1) {
      locations <- strsplit(locations, ",")[[1]]
      locations <- trimws(locations)
    }
    
    # Convert treatment dates to time periods
    # Ensure date column is properly formatted
    data$date <- as.Date(data$date)
    
    # If time column doesn't exist, create it from date
    if (!"time" %in% names(data)) {
      data$time <- as.numeric(data$date - min(data$date, na.rm = TRUE)) + 1
    }
    
    # Convert treatment dates to time periods
    treatment_start_date <- as.Date(treatment_start_date)
    treatment_end_date <- as.Date(treatment_end_date)
    
    # Find the corresponding time periods
    min_date <- min(data$date, na.rm = TRUE)
    treatment_start_time <- as.numeric(treatment_start_date - min_date) + 1
    treatment_end_time <- as.numeric(treatment_end_date - min_date) + 1
    
    # Debug: Print the values being passed to GeoLift
    cat("Debug - Treatment start date:", treatment_start_date, "-> time:", treatment_start_time, "\n")
    cat("Debug - Treatment end date:", treatment_end_date, "-> time:", treatment_end_time, "\n")
    cat("Debug - Locations:", paste(locations, collapse = ", "), "\n")
    cat("Debug - Data rows:", nrow(data), "\n")
    cat("Debug - Time range in data:", min(data$time, na.rm = TRUE), "to", max(data$time, na.rm = TRUE), "\n")
    
    # Validate treatment times are numeric and finite
    if (!is.numeric(treatment_start_time) || !is.finite(treatment_start_time)) {
      res$status <- 400
      return(list(error = paste("Invalid treatment_start_time:", treatment_start_time)))
    }
    
    if (!is.numeric(treatment_end_time) || !is.finite(treatment_end_time)) {
      res$status <- 400
      return(list(error = paste("Invalid treatment_end_time:", treatment_end_time)))
    }
    
    if (treatment_start_time >= treatment_end_time) {
      res$status <- 400
      return(list(error = "Treatment start time must be before end time"))
    }
    
    # Validate treatment times are within data range
    min_time <- min(data$time, na.rm = TRUE)
    max_time <- max(data$time, na.rm = TRUE)
    
    if (treatment_start_time < min_time || treatment_start_time > max_time) {
      res$status <- 400
      return(list(error = paste("Treatment start time", treatment_start_time, "is outside data range", min_time, "to", max_time)))
    }
    
    if (treatment_end_time < min_time || treatment_end_time > max_time) {
      res$status <- 400
      return(list(error = paste("Treatment end time", treatment_end_time, "is outside data range", min_time, "to", max_time)))
    }

    geolift_result <- GeoLift(
      data = data,
      locations = locations,
      treatment_start_time = treatment_start_time,
      treatment_end_time = treatment_end_time,
      alpha = alpha,
      model = model,
      ConfidenceIntervals = confidence_intervals
    )
    
    list(
      success = TRUE,
      results = list(
        att = geolift_result$inference$ATT,
        percent_lift = geolift_result$inference$Perc.Lift,
        p_value = geolift_result$inference$pvalue,
        incremental = geolift_result$incremental,
        lower_bound = geolift_result$lower_bound,
        upper_bound = geolift_result$upper_bound,
        treatment_start = geolift_result$TreatmentStart,
        treatment_end = geolift_result$TreatmentEnd,
        test_locations = geolift_result$test_id$name
      ),
      summary = list(
        is_significant = geolift_result$inference$pvalue < alpha,
        effect_direction = ifelse(geolift_result$inference$ATT > 0, "positive", "negative"),
        model_used = geolift_result$results$progfunc
      )
    )
  }, error = function(e) {
    res$status <- 500
    list(error = paste("GeoLift analysis failed:", e$message))
  })
}
