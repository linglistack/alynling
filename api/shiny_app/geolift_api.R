# GeoLift API using Plumber
library(plumber)
library(jsonlite)
library(dplyr)
library(purrr)
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

library(GeoLift)
# # Importing the package this way seems to cause problem with parallel computing stuff. 
# suppressMessages({
#   source(file.path(r_path, "imports.R"))
# })
# source(file.path(r_path, "auxiliary.R"))
# source(file.path(r_path, "data.R"))
# source(file.path(r_path, "MultiCell.R"))
# source(file.path(r_path, "pre_processing_data.R"))
# source(file.path(r_path, "pre_test_power.R"))
# source(file.path(r_path, "post_test_analysis.R"))
# source(file.path(r_path, "plots.R"))
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

#* Autodetect candidate columns for time, location, and outcome
#* 
#* This endpoint accepts raw CSV data and attempts to infer which columns 
#* represent time, location, and outcome variables. It returns a dataset ID 
#* and candidate column suggestions for the user to review and confirm.
#*
#* @param csv_data:string The raw CSV file contents as a single string. 
#*        Must include at least one column that resembles time/date,
#*        one location column, and one outcome column. 
#*
#* @post /api/upload_autodetect

function(req, res) {
  body <- jsonlite::fromJSON(req$postBody)

  success <- TRUE
  warn <- character()
  error_msg <- character()
  output_obj <- NULL

  # Expect raw CSV text
  csv_data <- body$csv_data

  validators <- list(
    function(d) read_csv_string(d)
  )

  validated <- run_validators(csv_data, validators)

  # if validation fails, halt, else get the cleaned data
  if (!validated$success) {
    return(validated)
  } else {
    df <- validated$data
    warn <- validated$warnings %||% NULL
  }

  # Variant dictionaries
  time_variants <- c("time", "date", "day", "period", "week", "month", "t")
  location_variants <- c(
    "location",
    "region",
    "market",
    "geo",
    "area",
    "state",
    "city",
    "dma",
    "district",
    "commuting zone",
    "province",
    "town"
  )
  outcome_variants <- c(
    "y",
    "outcome",
    "sales",
    "revenue",
    "metric",
    "value",
    "kpi",
    "conversion"
  )

  # Detect candidates
  result <- list(
    time = detect_candidates(df, time_variants),
    location = detect_candidates(df, location_variants),
    outcome = detect_candidates(df, outcome_variants)
  )

  data_ID <- save_item(r_path, "clean_df", df, "csv")

  output_obj <- list(data_ID = data_ID, suggestions = result)
  response <- list(
    success = success,
    error_msg = error_msg,
    warning = warn,
    output_obj = output_obj
  )
  return(response)
}


#* Upload and process CSV data
#* @post /api/upload
function(req, res) {
  body <- jsonlite::fromJSON(req$postBody)

  success <- TRUE
  error_msg <- character()
  warn <- character()
  output_obj <- NULL

  data_ID <- body$data_ID
  data <- load_item(r_path, "clean_df", data_ID, "csv")

  # Use get_param for cleaner parameter handling
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
    function(d) check_required_columns(d, location_col, time_col, outcome_col),
    function(d) check_outcome_numeric(d, outcome_col, threshold = 0.1),
    function(d) check_min_rows_per_location(d, location_col, min_rows = 50)
  )

  validated <- run_validators(data, validators)

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

  # overwrite the raw dataframe
  save_item(r_path, "clean_df", processed_data, "csv", data_ID)

  # Build summary (if GeoDataRead succeeded)
  locations <- unique(processed_data$location)

  summary = list(
    total_rows = nrow(processed_data),
    locations = locations,
    num_locations = length(locations)
  )

  output_obj <- list(data = processed_data, data_ID = data_ID, summary = summary)

  list(
    success = success,
    error_msg = error_msg,
    warning = warn,
    output_obj = output_obj
  )
}


#* Market selection for GeoLift test
#* @post /api/market-selection
function(req, res) {
  body <- jsonlite::fromJSON(req$postBody)

  success <- TRUE
  error_msg <- character()
  warn <- character()
  output_obj <- NULL


  # get the user input parameters
  data_ID <- body$data_ID
  cpic <- get_param(body, "cpic", 1, as.numeric)$value
  size_of_effect <- get_param(body, "size_of_effect", 0.3, as.numeric)$value
  direction_of_effect <- get_param(
    body,
    "direction_of_effect",
    "pos",
    as.character
  )$value
  include_markets <- get_param(
    body,
    "include_markets",
    NULL,
    as.character
  )$value
  exclude_markets <- get_param(
    body,
    "exclude_markets",
    NULL,
    as.character
  )$value
  X <- get_param(body, "X", NULL, as.character)$value

  quick_result <- get_param(body, "quick_result", TRUE, as.logical)$value
  number_of_cells <- get_param(body, "number_of_cells", 1, as.integer)$value

  # the less necessary parameters
  alpha <- get_param(body, "alpha", 0.05, as.numeric)$value
  fixed_effects <- get_param(body, "fixed_effects", TRUE, as.logical)$value
  N <- get_param(body, "N", NULL, as.integer)$value
  min_holdout <- get_param(body, "min_holdout", NULL, as.numeric)$value
  max_holdout <- get_param(body, "max_holdout", NULL, as.numeric)$value
  holdout <- sort(c(min_holdout, max_holdout))
  budget <- get_param(body, "budget", NULL, as.numeric)$value
  Correlations <- TRUE

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

  # defaulting the treatment period to be the smallest period detected. Lowerbound it by 1 to avoid error.
  treatment_periods <- get_param(
    body,
    "treatment_periods",
    max(small_period, 7),
    as.integer
  )$value
  treatment_periods <- treatment_periods[treatment_periods > 1]

  # setting the lookback window based on the length of the treatment, periodicity, floor = 7.
  if (length(treatment_periods) == 1) {
    # User gave exact length
    treatment_length <- treatment_periods
  } else {
    # User gave a range → take midpoint
    treatment_length <- round(mean(range(treatment_periods)))
  }

  pre_treatment_length <- n_time - treatment_length
  lookback_window = max(round(pre_treatment_length / 10), small_period, 7)

  lookback_window = ifelse(quick_result, 1, lookback_window)

  # create the list of effect_size based on the size and direction
  effect_size <- create_effect_size_list(size_of_effect, direction_of_effect)

  # determine the side of test based on the input direction of effect
  side_of_test <- ifelse(
    direction_of_effect == "both",
    "two_sided",
    "one_sided"
  )

  # ADD WARNINGS ABOUT THINGS THAT ARE NOT USED
  # Sanitize include/exclude markets to match available locations (lowercase)

  available_locs <- as.character(data[["location"]]) %>% unique()

  include_markets_res <- validate_against_pool(available_locs, include_markets, "locations to be included")
  exclude_markets_res <- validate_against_pool(available_locs, exclude_markets, "locations to be excluded")

  # Sanitize the column names for other variables (X)
  col_names <- unique(tolower(colnames(data))) 
  other_col_names <- setdiff(col_names, c("location", "y", "date"))
  X_res <- validate_against_pool(other_col_names, X, "additional covariates")

  # Collect results and combine warnings
  combined_res <- combine_results(list(include_markets_res, exclude_markets_res, X_res))
  if(!combined_res$success) {return(combined_res)}

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
    parallel = TRUE
  )

  optional_args <- list(
    X = X,
    N = N
  )

  specific_single_cell_args <- list(
    include_markets = include_markets,
    exclude_markets = exclude_markets,
    holdout = holdout,
    budget = budget,
    print = FALSE
  )

  specific_multi_cell_args <- list(
    k = number_of_cells
  )

  final_args <- merge_args(args, optional_args)

  investment_weights <- c(0, 0.5, 2)

  # when number_of_cells == 1, we do single-cell
  if (number_of_cells == 1) {
    final_args <- merge_args(final_args, specific_single_cell_args)
    market_selection <- do.call(GeoLiftMarketSelection, final_args)
    top_choices = rank_helper(market_selection, investment_weights) %>% mutate(cell = 1)
    single_cell_mode = TRUE
  } else {
    # otherwise, we do multi-cell
    final_args <- merge_args(final_args, specific_multi_cell_args)

    market_selection <- do.call(MultiCellMarketSelection, final_args)
    top_choices = collect_rankings(market_selection, investment_weights)
    single_cell_mode = FALSE
  }

  # reformatting the top choices dataframe
  unwanted_cols <- c("AvgATT", "Average_MDE", "ProportionTotal_Y", "abs_lift_in_zero", "rank", "rank_business_practicality", "scientific_strength" )
  top_choices <- top_choices %>% 
    rename(statistically_rigorous = "rank_weight_0", balance_rigor_and_budget = "rank_weight_0.5", budget_friendly = "rank_weight_2",
           synthetic_control_fit = "AvgScaledL2Imbalance") %>% 
    select(ID, cell, location, statistically_rigorous, balance_rigor_and_budget, budget_friendly, Investment, duration, Power, correlation, synthetic_control_fit) %>%
    mutate(across(
      c(statistically_rigorous, balance_rigor_and_budget, budget_friendly),
      dplyr::dense_rank
    ))


  obj_ID <- save_item(r_path, "market_selection", market_selection, "rds")
  rank_df_ID <- save_item(r_path, "rank_df", top_choices, "csv")

  output_obj <- list(
    single_cell = single_cell_mode,
    parameters_used = final_args,
    obj_ID = obj_ID,
    rank_df_ID = rank_df_ID,
    top_choices = top_choices
  )
  
  response <- list(
    success = success,
    error_msg = error_msg,
    warning = warn,
    output_obj = output_obj
  )
  return(response)
}

#* Power analysis for GeoLift test
#* @post /api/power-analysis
function(req, res) {

  success <- TRUE
  error_msg <- character()
  warn <- character()
  output_obj <- NULL

  body <- jsonlite::fromJSON(req$postBody)

  single_cell <- body$single_cell
  obj_ID <- body$obj_ID

  ms_obj <- load_item(r_path, "market_selection", obj_ID, "rds")


  if (single_cell) {
    location_ID <- get_param(body, "location_ID", 1, as.integer)$value

    if(length(location_ID) > 1) {
      warn <- c(warn, "Multiple location IDs entered for single cell experiment. Only the first ID will be used.")
      location_ID <- location_ID[1]
    }

    inject <- GeoLift_lift_injection(ms_obj, location_ID)
    power <- inject$power %>% mutate(cell = 1)

    lifted_data <- inject$lifted %>% GeoLift_lift_data() %>% mutate(cell = 1)

    collected <- list(
      lifted_data = lifted_data,
      lifted_power = power
    )

  } else {
    # sanity checks
    
    if (is.null(ms_obj$Models) || !is.list(ms_obj$Models)) {
      success <- FALSE
      error_msg <- "Input object is neither single-cell nor multi-cell output. Check obj_ID and ms_obj."
      response <- list(success = success, warning = warn, error_msg = error_msg, output_obj = output_obj)
      message("[API ERROR][Power Analysis]", error_msg)
      return(response)
    }
    
    k <- length(ms_obj$Models)

    location_ID <- get_param(body, "location_ID", NULL, as.integer)$value

    if (is.null(location_ID) || length(location_ID) != k) {
      warn <- c(warn, "No location ID is entered or the number of IDs is incorrect. Defaulting to the top choice in each cell. ")
      location_ID <- rep(1, k)
    }

    collected = collect_injections(ms_obj, location_ID)

  }

  response <- list(
    success = success, 
    error_msg = error_msg, 
    warning = warn, 
    output_obj = collected)
  
  return(response)
}



#* GeoLift test
#* @post /api/geolift
function(req, res) {

  body <- jsonlite::fromJSON(req$postBody)

  success <- TRUE
  warn <- character()
  error_msg <- character()
  output_obj <- NULL

  df_Id <- body$data_ID
  data <- load_item(r_path, "clean_df", df_Id, "csv")

  TST <- get_param(body, "treatment_start_time", NULL, as.integer)$value
  TET <- get_param(body, "treatment_end_time", NULL, as.integer)$value
  alpha <- get_param(body, "alpha", 0.05, as.numeric)$value
  stat_test <- get_param(body, "stat_test", "pos", as.character)$value
  X <- get_param(body, "X", NULL, as.character)$value
  
  loc_res <- validate_locations(body$locations, data)
  warn <- c(warn, loc_res$warning)

  if(!loc_res$success) {return(loc_res)}

  locations <- loc_res$output_obj
  single_cell = ifelse(length(locations) == 1, TRUE, FALSE)
  if(single_cell) {locations = locations$cell_1}

  map_direction <- function(x) {
    recode <- c(
      pos = "Positive",
      neg = "Negative",
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
    stat_test = map_direction(stat_test),
    model = "best",
    print = FALSE
  )

  optional_args <- list(
    X = X
  )
  final_args <- merge_args(args, optional_args)


  if (single_cell) {
    geolift_res <- do.call(GeoLift, final_args)
    test_summary <- summary(geolift_res)

    result_df <- test_summary[c(1,2,3,7)] %>% 
      tibble::enframe(name = "statistics", value = "values") %>% 
      dplyr::mutate(values = unlist(values),
                    cell = 1) %>% 
      dplyr::select(cell, statistics, values)

    
  } else {
    geolift_res <- do.call(GeoLiftMultiCell, final_args)

    result_df <- geolift_res$results %>%
      purrr::map(summary) %>%
      purrr::map_dfr(~ tibble::enframe(.x[c(1,2,3,7)], name = "statistics", value = "values"),
                    .id = "cell") %>%
      mutate(values = unlist(values)) %>% 
      arrange(statistics, cell)
  }
  
  
  obj_ID <- save_item(r_path, "geolift", geolift_res, "rds")
  output_obj <- list(obj_ID = obj_ID, single_cell = single_cell, summary = result_df)


  return(
    list(
      success = success,
      error_msg = error_msg,
      warning = warn,
      output_obj = output_obj
    )
  )
}


#* Analyze GeoLift result
#* @post /api/geolift_result
function(req, res) {

  body <- jsonlite::fromJSON(req$postBody)

  success <- TRUE
  error_msg <- character()
  warn <- character()
  output_obj <- NULL

  obj_ID <- body$obj_ID
  single_cell <- body$single_cell
  
  GL_obj <- load_item(r_path, "geolift", obj_ID, "rds")



  if(single_cell) {
    att_data <- GeoLift_att_data(GL_obj) %>% mutate(cell = 1) 
    lift_data <- GeoLift_lift_data(GL_obj) %>% mutate(cell = 1)
  } else {
    k <- GL_obj %>% pluck(1) %>% length()
    
    att_data <- purrr::map_dfr(seq_len(k), ~ {
      GL_obj %>% pluck(1, .x) %>%
        GeoLift_att_data() %>%
        dplyr::mutate(cell = .x)
    }) %>%
      arrange(Time, cell)

    lift_data <- purrr::map_dfr(seq_len(k), ~ {
      GL_obj %>% pluck(1, .x) %>%
        GeoLift_lift_data() %>%
        dplyr::mutate(cell = .x)
    })%>%
      arrange(Time, cell)
  }

  output_obj <- list(att_data = att_data %>% as_tibble(), lift_data = lift_data %>% as_tibble())

  response <- list(
    success = success,
    error_msg = error_msg,
    warning = warn,
    output_obj = output_obj
  )
  return(response)
}
