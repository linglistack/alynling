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
    stop(
      "Cannot find R directory. Please run from project root or api directory."
    )
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
source(file.path(r_path, "custom_geolift_functions/rank_helper.R"))
source(file.path(r_path, "custom_geolift_functions/periodicity_helper.R"))
source(file.path(r_path, "custom_geolift_functions/gen_api_helper.R"))


#* Enable CORS
#* @filter cors
function(req, res) {
  res$setHeader("Access-Control-Allow-Origin", "*")
  res$setHeader(
    "Access-Control-Allow-Methods",
    "GET,HEAD,PUT,PATCH,POST,DELETE"
  )
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
  body <- jsonlite::fromJSON(req$postBody)
  warn <- character()

  # Use get_param for cleaner parameter handling
  csv_data <- get_param(body, "csv_data", NULL)$value
  location_col <- get_param(
    body,
    "location_col",
    "location",
    as.character
  )$value
  time_col <- get_param(body, "time_col", "date", as.character)$value
  outcome_col <- get_param(body, "outcome_col", "Y", as.character)$value
  format <- get_param(body, "format", "yyyy-mm-dd", as.character)$value
  list_of_other_vars <- get_param(body, "X", c(), as.character)$value

  validators <- list(
    function(d) read_csv_string(d),
    function(d) check_required_columns(d, location_col, time_col, outcome_col),
    function(d) check_outcome_numeric(d, outcome_col, threshold = 0.1),
    function(d) check_min_rows_per_location(d, location_col, min_rows = 50)
  )

  validated <- run_validators(csv_data, validators)

  # if validation fails, halt, else get the cleaned data
  if (!validated$success) {
    return(validated)
  } else {
    clean_data <- validated$data
    warn <- validated$warnings %||% NULL
  }

  # Call GeoDataRead
  processed_data <- tryCatch(
    {
      GeoDataRead(
        data = clean_data,
        date_id = time_col,
        location_id = location_col,
        Y_id = outcome_col,
        format = format,
        X = list_of_other_vars,
        summary = FALSE,
        keep_unix_time = TRUE
      )
    },
    error = function(e) {
      res$status <- 500
      return(list(error = paste("GeoDataRead failed:", e$message)))
    }
  )

  data_ID <- save_item(r_path, "clean_df", processed_data, "csv")

  # Build summary (if GeoDataRead succeeded)
  locations <- unique(processed_data$location)

  summary = list(
    total_rows = nrow(processed_data),
    locations = locations,
    num_locations = length(locations)
  )

  list(
    success = TRUE,
    warning = warn,
    data = head(processed_data, 10),
    data_ID = data_ID,
    summary = summary
  )
}

#* Market selection for GeoLift test
#* @post /api/market-selection
function(req, res) {
  body <- jsonlite::fromJSON(req$postBody)

  # get the user input parameters
  data_ID <- body$data_ID
  cpic <- get_param(body, "cpic", 1, as.numeric)$value
  size_of_effect <- get_param(body, "size_of_effect", 0.3, as.numeric)$value
  direction_of_effect <- get_param(body, "direction_of_effect", "pos", as.character)$value
  include_markets <- get_param(body, "include_markets", NULL, as.character)$value
  exclude_markets <- get_param(body, "exclude_markets", NULL, as.character)$value
  X <- get_param(body, "X", NULL, as.character)$value
  quick_result <- get_param(body, "quick_result", TRUE, as.logical)$value

  # the less necessary parameters
  alpha <- get_param(body, "alpha", 0.05, as.numeric)$value
  fixed_effects <- get_param(body, "fixed_effects", TRUE, as.logical)$value
  Correlations <- get_param(body, "Correlations", TRUE, as.logical)$value
  N <- get_param(body, "N", NULL, as.integer)$value
  holdout <- get_param(body, "holdout", NULL, as.numeric)$value
  budget <- get_param(body, "budget", NULL, as.numeric)$value

  # preperation for the data dependent parameters
  data <- load_item(r_path, "clean_df", data_ID, "csv")

  n_data <- nrow(data)
  n_time = data %>% 
    group_by(location) %>%
    summarize(unique_time = length(unique(time))) %>% 
    pull(unique_time) %>%
    get_mode()

  ts_analysis <- analyze_timeseries(data, "location", "Y")

  small_period <- ts_analysis[["period_1"]] %>% get_mode()

  # defaulting the treatment period to be the smallest period detected
  treatment_periods <- get_param(body, "treatment_periods", small_period, as.integer)$value

  # setting the lookback window based on the length of the treatment, periodicity, floor = 5. 
  if (length(treatment_periods) == 1) {
    # User gave exact length
    treatment_length <- treatment_periods
  } else {
    # User gave a range → take midpoint
    treatment_length <- round(mean(range(treatment_periods)))
  }

  pre_treatment_length <- n_time - treatment_length
  lookback_window = max(round(pre_treatment_length/10), small_period, 5)
  lookback_window = ifelse(quick_result, 1, lookback_window)

  effect_size <- create_effect_size_list(size_of_effect, direction_of_effect)

  side_of_test <- ifelse(direction_of_effect == "both", "two_sided", "one_sided")

  # Sanitize include/exclude markets to match available locations (lowercase)
  available_locs <- unique(tolower(as.character(data[["location"]])))
  include_markets <- tolower(include_markets)
  exclude_markets <- tolower(exclude_markets)
  include_markets <- include_markets[include_markets %in% available_locs]
  exclude_markets <- exclude_markets[exclude_markets %in% available_locs]


  # Ensure foreach backend registered if used
  if (!is.null(getOption('mc.cores')) && getOption('mc.cores') > 1) {
    doParallel::registerDoParallel(parallel::detectCores())
  }


  args <- list(
    data = data,
    treatment_periods = treatment_periods,
    effect_size = effect_size,
    lookback_window = lookback_window,
    cpic = cpic,
    alpha = alpha,
    side_of_test = side_of_test,
    fixed_effects = fixed_effects,
    Correlations = Correlations,
    parallel = FALSE,
    print = FALSE
  )

  optional_args <- list(
    include_markets = include_markets,
    exclude_markets = exclude_markets,
    X = X,
    N = N,
    holdout = holdout,
    budget = budget
  )

  final_args <- merge_args(args, optional_args)


  market_selection <- do.call(GeoLiftMarketSelection, final_args)
  obj_ID <- save_item(r_path, "market_selection", market_selection, "rds")

  investment_weights <- c(0, 0.5, 2)
  top_choices = rank_helper(market_selection, investment_weights)
  rank_df_ID <- save_item(r_path, "rank_df", top_choices, "csv")


  list(
    success = TRUE,
    obj_ID = obj_ID,
    rank_df_ID = rank_df_ID,
    top_choices = head(top_choices, 10)
  )
}

#* Power analysis for GeoLift test
#* @post /api/power-analysis
function(req, res){
  body <- jsonlite::fromJSON(req$postBody)

  obj_ID <- body$obj_ID

  location_ID <- get_param(body, "location_ID", 1, as.integer)$value

  ms_obj <- load_item(r_path, "market_selection", obj_ID, "rds")

  inject <- GeoLift_lift_injection(ms_obj, location_ID)
  power <- inject$power
  lifted <- inject$lifted

  lifted_data <- GeoLift_lift_data(lifted)

  return(list(
    lifted_data = lifted_data,
    lifted_power = power
  ))
}


#* GeoLift test 
#* @post /api/geolift
function(req, res){
  body <- jsonlite::fromJSON(req$postBody)
  df_Id <- body$data_ID
  data <- load_item(r_path, "clean_df", df_Id, "csv")

  locations <- get_param(body, "locations", NULL, as.character)$value
  TST <- get_param(body, "treatment_start_time", NULL, as.integer)$value
  TET <- get_param(body, "treatment_end_time", NULL, as.integer)$value
  alpha <- get_param(body, "alpha", 0.05, as.numeric)$value
  stat_test <- get_param(body, "stat_test", "pos", as.character)$value
  X <- get_param(body, "X", NULL, as.character)$value

  map_direction <- function(x) {
    recode <- c(
      pos  = "Positive",
      neg  = "Negative",
      both = "Total"
    )
    unname(recode[x])
  }

  args <- list(
    data = data,
    locations = locations,
    treatment_start_time = TST,
    treatment_end_time = TET,
    alpha = alpha,
    stat_test = map_direction(stat_test)
  )

  optional_args <- list(
    X = X
  )
  final_args <- merge_args(args, optional_args)

  geolift_res <- do.call(GeoLift, final_args)

  obj_ID <- save_item(r_path, "geolift", geolift_res, "rds")

  test_summary <- summary(geolift_res)
  
  result <- list(
    ATT_est = test_summary[1], 
    PercLift = test_summary[2],
    pvalue = test_summary[3],
    L2_Imba = test_summary[7]
  )

  return(
    list(
      success = TRUE, 
      obj_ID = obj_ID,
      summary = result
    )
  )
}


#* Analyze GeoLift result
#* @post /api/geolift_result
function(req, res){

  body <- jsonlite::fromJSON(req$postBody)
  obj_ID <- body$obj_ID
  
  GL_obj <- load_item(r_path, "geolift", obj_ID, "rds")


  att_data <- GeoLift_att_data(GL_obj)
  lift_data <- GeoLift_lift_data(GL_obj)

  return(list(
    att_data = att_data,
    lift_data = lift_data
  ))
}


