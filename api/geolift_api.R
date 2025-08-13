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

    # Defaults aligned with R example snippet
    treatment_periods <- if (is.null(body$treatment_periods)) c(13) else body$treatment_periods
    effect_size <- if (is.null(body$effect_size)) seq(0, 0.3, 0.05) else body$effect_size
    lookback_window <- if (is.null(body$lookback_window)) 1 else body$lookback_window
    cpic <- if (is.null(body$cpic)) 1 else body$cpic
    alpha <- if (is.null(body$alpha)) 0.05 else body$alpha

    N <- if (is.null(body$N)) c(2,3,4,5) else body$N
    include_markets <- if (is.null(body$include_markets)) c() else as.character(body$include_markets)
    exclude_markets <- if (is.null(body$exclude_markets)) c() else as.character(body$exclude_markets)
    holdout <- if (is.null(body$holdout)) c(0.5, 1) else body$holdout
    budget <- if (is.null(body$budget)) 100000 else body$budget
    side_of_test <- if (is.null(body$side_of_test)) "two_sided" else body$side_of_test
    fixed_effects <- if (is.null(body$fixed_effects)) TRUE else as.logical(body$fixed_effects)
    Correlations <- if (is.null(body$Correlations)) TRUE else as.logical(body$Correlations)
    Y_id <- if (is.null(body$Y_id)) "Y" else body$Y_id
    location_id <- if (is.null(body$location_id)) "location" else body$location_id
    time_id <- if (is.null(body$time_id)) "time" else body$time_id

    if (is.null(data)) {
      res$status <- 400
      return(list(error = "Data is required"))
    }

    data <- as.data.frame(data)

    # Sanitize include/exclude markets to match available locations (lowercase)
    if (!(location_id %in% names(data))) {
      res$status <- 400
      return(list(error = paste("location_id column not found:", location_id)))
    }
    available_locs <- unique(tolower(as.character(data[[location_id]])))
    include_markets <- tolower(include_markets)
    exclude_markets <- tolower(exclude_markets)
    include_markets <- include_markets[include_markets %in% available_locs]
    exclude_markets <- exclude_markets[exclude_markets %in% available_locs]

    # Cap N to half of markets after exclusion per helper's intent
    max_n <- max(1, floor(length(available_locs) / 2))
    N <- N[N <= max_n]
    if (length(N) == 0) N <- max(2, min(5, max_n))

    # Ensure foreach backend registered if used
    if (!is.null(getOption('mc.cores')) && getOption('mc.cores') > 1) {
      doParallel::registerDoParallel(parallel::detectCores())
    }

    market_selection <- GeoLiftMarketSelection(
      data = data,
      treatment_periods = treatment_periods,
      N = N,
      Y_id = Y_id,
      location_id = location_id,
      time_id = time_id,
      effect_size = effect_size,
      lookback_window = lookback_window,
      include_markets = include_markets,
      exclude_markets = exclude_markets,
      holdout = holdout,
      cpic = cpic,
      budget = budget,
      alpha = alpha,
      side_of_test = side_of_test,
      fixed_effects = fixed_effects,
      Correlations = Correlations,
      parallel = FALSE,
      print = FALSE
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

#* EDA plots data: observations by group and power curve
#* @post /api/eda/plots
function(req, res) {
  tryCatch({
    body <- jsonlite::fromJSON(req$postBody)
    data <- body$data
    treatment_periods <- if (is.null(body$treatment_periods)) 14 else as.integer(body$treatment_periods)
    effect_size <- if (is.null(body$effect_size)) c(0, 0.05, 0.1, 0.15, 0.2, 0.25) else body$effect_size
    lookback_window <- if (is.null(body$lookback_window)) 1 else as.integer(body$lookback_window)
    cpic <- if (is.null(body$cpic)) 1 else as.numeric(body$cpic)
    alpha <- if (is.null(body$alpha)) 0.1 else as.numeric(body$alpha)
    market_rank <- if (is.null(body$market_rank)) 1 else as.integer(body$market_rank)

    if (is.null(data)) {
      res$status <- 400
      return(list(error = "Data is required"))
    }

    df <- as.data.frame(data)
    req_cols <- c("location", "Y")
    if (!all(req_cols %in% names(df))) {
      res$status <- 400
      return(list(error = paste("Required columns missing:", paste(setdiff(req_cols, names(df)), collapse = ", "))))
    }

    if (!"date" %in% names(df)) {
      res$status <- 400
      return(list(error = "date column is required in processed data"))
    }
    df$date <- as.Date(df$date)
    if (!"time" %in% names(df)) {
      df$time <- as.numeric(df$date - min(df$date, na.rm = TRUE)) + 1
    }

    ms <- GeoLiftMarketSelection(
      data = df,
      treatment_periods = c(treatment_periods),
      N = c(2,3,4,5),
      Y_id = "Y",
      location_id = "location",
      time_id = "time",
      effect_size = effect_size,
      lookback_window = lookback_window,
      cpic = cpic,
      alpha = alpha,
      fixed_effects = TRUE,
      Correlations = TRUE,
      parallel = FALSE,
      print = FALSE
    )

    best <- ms$BestMarkets

    # Robustly detect the locations column
    chosen_locs <- NULL
    loc_col <- NULL

    # 1) Prefer known names (case-insensitive)
    known_names <- c("Locs","locations","Locations","locs","Markets","markets","test_locations","TestLocations","test_markets")
    found <- intersect(known_names, names(best))
    if (length(found) > 0) loc_col <- found[[1]]

    # 2) If not found, pick the first list-column
    if (is.null(loc_col)) {
      for (nm in names(best)) {
        if (is.list(best[[nm]])) { loc_col <- nm; break }
      }
    }

    # 3) Extract for the requested rank, parsing if necessary
    if (!is.null(loc_col)) {
      colval <- best[[loc_col]][[market_rank]]
      if (is.list(best[[loc_col]])) {
        chosen_locs <- tolower(as.character(colval))
      } else if (is.character(best[[loc_col]])) {
        text <- best[[loc_col]][market_rank]
        parsed <- NULL
        # Try JSON-like first
        suppressWarnings({
          if (grepl("^\\[.*\\]$", text)) {
            tmp <- try(jsonlite::fromJSON(text), silent = TRUE)
            if (!inherits(tmp, "try-error")) parsed <- tmp
          }
        })
        # Try c('a','b') pattern
        if (is.null(parsed) && grepl("^c\\(.*\\)$", text)) {
          inner <- sub("^c\\((.*)\\)$", "\\1", text)
          parts <- strsplit(inner, ",")[[1]]
          parts <- trimws(gsub("[\'\"]", "", parts))
          parsed <- parts
        }
        # Fallback: split by comma/semicolon/space
        if (is.null(parsed)) {
          parts <- unlist(strsplit(text, "[,;]"))
          parsed <- trimws(parts)
        }
        chosen_locs <- tolower(as.character(parsed))
      }
    }

    # 4) Last resort: construct from any character column with many commas
    if (is.null(chosen_locs) || length(chosen_locs) == 0) {
      char_cols <- names(best)[sapply(best, is.character)]
      if (length(char_cols) > 0) {
        candidate <- char_cols[which.max(vapply(best[char_cols], function(x) {
          mean(grepl(",", x))
        }, numeric(1)))]
        text <- best[[candidate]][market_rank]
        parts <- unlist(strsplit(text, "[,;]"))
        chosen_locs <- tolower(trimws(parts))
      }
    }

    if (is.null(chosen_locs) || length(chosen_locs) == 0) {
      res$status <- 500
      return(list(error = "Could not detect locations column in BestMarkets"))
    }

    max_time <- max(df$time, na.rm = TRUE)
    treatment_start_time <- max_time - treatment_periods + 1
    treatment_end_time <- max_time

    df$group <- ifelse(tolower(df$location) %in% chosen_locs, "Treatment", "Control")
    obs <- df %>%
      group_by(time, date, group) %>%
      summarise(value = mean(Y, na.rm = TRUE), .groups = "drop") %>%
      arrange(time)

    obs <- obs %>%
      group_by(group) %>%
      arrange(time, .by_group = TRUE) %>%
      mutate(value_smooth = zoo::rollmean(value, k = 7, fill = NA, align = "right")) %>%
      ungroup()

    power <- GeoLiftPower(
      data = df,
      locations = chosen_locs,
      treatment_periods = treatment_periods,
      effect_size = effect_size,
      lookback_window = lookback_window,
      cpic = cpic,
      alpha = alpha,
      parallel = FALSE
    )

    list(
      success = TRUE,
      selection = list(
        market_rank = market_rank,
        locations = chosen_locs
      ),
      treatment_window = list(
        start_time = treatment_start_time,
        end_time = treatment_end_time
      ),
      observations = obs,
      power_curve = list(
        effect_size = power$EffectSize,
        power = power$power
      )
    )
  }, error = function(e) {
    res$status <- 500
    list(error = paste("EDA plots failed:", e$message))
  })
}
