library(dplyr)
library(lubridate)

# General Purpose --------------------------------------------------------

save_item <- function(r_path, relative_path, obj, type = c("csv", "rds"), overwrite_ID = NULL) {
  type <- match.arg(type)

  api_path <- file.path(r_path, "..", "api", "storage_temp", relative_path)

  if (!dir.exists(api_path)) dir.create(api_path, recursive = TRUE)

  id <- if (!is.null(overwrite_ID)) {
    overwrite_ID
  } else {
    paste0(
      ifelse(type == "csv", "ds_", "obj_"),
      as.integer(Sys.time())
    )
  }


  ext <- ifelse(type == "csv", ".csv", ".rds")
  path <- file.path(api_path, paste0(id, ext))

  if (type == "csv") {
    readr::write_csv(as.data.frame(obj), path)
  } else {
    saveRDS(obj, path)
  }

  id
}

load_item <- function(r_path, relative_path, id, type = c("csv", "rds")) {
  type <- match.arg(type)

  api_path <- file.path(r_path, "..", "api", "storage_temp", relative_path)

  ext <- ifelse(type == "csv", ".csv", ".rds")
  path <- file.path(api_path, paste0(id, ext))

  if (!file.exists(path)) return(NULL)

  if (type == "csv") {
    readr::read_csv(path, show_col_types = FALSE)
  } else {
    readRDS(path)
  }
}

# Find the statistical mode... 
get_mode <- function(x) {
  # flatten list if needed
  x <- unlist(x, use.names = FALSE)
  
  # tabulate frequencies
  freq <- table(x)
  max_freq <- max(freq)
  
  # all tied candidates
  candidates <- names(freq)[freq == max_freq]
  
  # tie-break: pick the first candidate that appears in x
  for (val in x) {
    if (val %in% candidates) {
      # coerce back to same type as input
      return(type.convert(val, as.is = TRUE))
    }
  }
}

# helper: merge required + optional args, skipping NULL/empty
merge_args <- function(required, optional) {
  for (nm in names(optional)) {
    val <- optional[[nm]]
    if (!is.null(val) && length(val) > 0) {
      required[[nm]] <- val
    }
  }
  required
}

# # helper: remove optional args from required list
# prune_args <- function(required, optional) {
#   drop <- intersect(names(required), names(optional))
#   required[setdiff(names(required), drop)]
# }


# Detect candidate columns for a specific role
# df: a data.frame
# role: string, one of "time", "location", "outcome"
# Detect candidate columns by strict match (ignore case)
detect_candidates <- function(df, variants) {
  cn <- names(df)
  
  # force lowercase comparison
  cn_lower <- tolower(cn)
  variants_lower <- tolower(variants)
  
  matches <- cn[cn_lower %in% variants_lower]
  
  if (length(matches) == 0) {
    return(NULL)
  }
  
  unique(matches)
}




get_param <- function(body, name, default, coerce = identity) {
  val <- tryCatch(
    body[[name]],
    error = function(e) NULL
  )

  if (is.null(val)) {
    # Missing → return default (after coercion)
    return(list(
      success = TRUE,
      error = NULL,
      value = tryCatch(coerce(default), error = function(e) default) # fallback if default can’t coerce
    ))
  }

  coerced <- tryCatch(
    coerce(val),
    error = function(e) {
      return(list(
        success = FALSE,
        error = sprintf("Failed to coerce parameter '%s': %s", name, e$message),
        value = NULL
      ))
    }
  )

  if (
    is.list(coerced) && !is.null(coerced$success) && coerced$success == FALSE
  ) {
    return(coerced)
  }

  list(
    success = TRUE,
    error = NULL,
    value = coerced
  )
}


# Upload and read data --------------------------------------------------------

read_csv_string <- function(upload) {
  if (is.null(upload) || !nzchar(upload)) {
    return(list(success = FALSE, error = "No CSV string provided."))
  }

  df <- tryCatch(
    readr::read_csv(I(upload), show_col_types = FALSE),
    error = function(e) {
      return(list(
        success = FALSE,
        error = paste("Failed to parse CSV string:", e$message)
      ))
    }
  )

  if (is.list(df) && !is.null(df$success) && df$success == FALSE) {
    return(df) # propagate structured error
  }

  if (nrow(df) == 0 || ncol(df) == 0) {
    return(list(success = FALSE, error = "CSV string is empty after parsing."))
  }

  list(success = TRUE, error = NULL, data = df)
}


# 0. Check if all required columns are present
check_required_columns <- function(data, ...) {
  cols <- c(...)
  missing <- setdiff(cols, names(data))

  if (length(missing) > 0) {
    return(list(
      success = FALSE,
      error = paste(
        "Missing required columns:",
        paste(missing, collapse = ", ")
      )
    ))
  }

  list(success = TRUE, warnings = NULL, data = data)
}

# 1. Outcome must be numeric (≤10% coercion failures allowed)
check_outcome_numeric <- function(data, outcome_col, threshold = 0.1) {
  # ensure low amount of NA in the column
  if (!is.numeric(data[[outcome_col]])) {
    suppressWarnings(num_outcome <- as.numeric(data[[outcome_col]]))

    failed <- sum(is.na(num_outcome) & !is.na(data[[outcome_col]]))
    total <- nrow(data)
    frac_failed <- failed / total

    if (frac_failed > threshold) {
      return(list(
        success = FALSE,
        error = paste0(
          "Too many coercion failures in ",
          outcome_col,
          ": ",
          round(frac_failed * 100, 1),
          "% > ",
          threshold * 100,
          "% threshold"
        )
      ))
    }
    data[[outcome_col]] <- num_outcome
  }
  list(success = TRUE, warnings = NULL, data = data)
}

# 2. Minimum data points per location
check_min_rows_per_location <- function(data, location_col, min_rows = 50) {
  # ensure sufficient data amount per location
  counts <- data %>%
    count(.data[[location_col]], name = "n")

  bad_locs <- counts %>% filter(n < min_rows) %>% pull(!!sym(location_col))
  if (length(bad_locs) > 0) {
    return(list(
      success = FALSE,
      error = paste(
        "Insufficient data for locations:",
        paste(bad_locs, collapse = ", "),
        "(need at least",
        min_rows,
        "rows per location)"
      )
    ))
  }
  list(success = TRUE, warnings = NULL, data = data)
}


# Null coalescing
`%||%` <- function(a, b) if (!is.null(a)) a else b

safe_run <- function(fun, data, ...) {
  warnings <- character()

  result <- tryCatch(
    withCallingHandlers(
      {
        fun(data, ...) # run the validator
      },
      warning = function(w) {
        warnings <<- c(warnings, conditionMessage(w))
        invokeRestart("muffleWarning")
      }
    ),
    error = function(e) {
      return(list(
        success = FALSE,
        error = conditionMessage(e),
        warnings = NULL,
        data = NULL
      ))
    }
  )

  # If the validator already returns {success, data, error?}, respect it
  if (is.list(result) && !is.null(result$success)) {
    if (result$success) {
      return(list(
        success = TRUE,
        error = NULL,
        warnings = warnings %||% result$warnings %||% NULL,
        data = result$data
      ))
    } else {
      return(list(
        success = FALSE,
        error = result$error %||% "Unknown error",
        warnings = NULL,
        data = NULL
      ))
    }
  }

  # Otherwise assume validator returned clean data
  list(
    success = TRUE,
    error = NULL,
    warnings = warnings %||% NULL,
    data = result
  )
}

run_validators <- function(data, validators) {
  all_warnings <- character()

  for (v in validators) {
    res <- safe_run(v, data)

    if (!res$success) {
      return(list(
        success = FALSE,
        error = res$error,
        warnings = NULL,
        data = NULL
      ))
    }

    # update working data + accumulate warnings
    data <- res$data
    if (!is.null(res$warnings)) {
      all_warnings <- c(all_warnings, res$warnings)
    }
  }

  list(
    success = TRUE,
    error = NULL,
    warnings = if (length(all_warnings) > 0) unique(all_warnings) else NULL,
    data = data
  )
}

validate_against_pool <- function(pool, input_list, label = "values") {

  success <- TRUE
  error_msg <- character()
  warn <- character()
  output_obj <- NULL

  result <- tryCatch({
    # normalize everything to lowercase for comparison
    pool_lower <- unique(tolower(pool))
    input_lower <- unique(tolower(input_list))

    valid <- input_list[tolower(input_list) %in% pool_lower] %>% unique()
    invalid <- input_list[!tolower(input_list) %in% pool_lower] %>% unique()

    if (length(invalid) > 0) {
      warn <- paste(
        "The following", label, "are not in the pool and were ignored:",
        paste(invalid, collapse = ", ")
      )
    }

    output_obj <- list(valid_list = valid, invalid_list = invalid)

    list(
      success = TRUE,
      warn = warn,
      error_msg = character(),
      output_obj = output_obj
    )
  }, error = function(e) {
    list(
      success = FALSE,
      warn = NULL,
      error_msg = paste("Validation failed:", e$message),
      output_obj = NULL
    )
  })

  return(result)
}



combine_results <- function(results) {
  success   <- TRUE
  warns     <- character()
  errors    <- character()
  
  tryCatch({
    for (res in results) {
      # Defensive: if fields are missing, treat as error
      if (is.null(res$success) || is.null(res$warn) || is.null(res$error_msg)) {
        success <- FALSE
        errors  <- c(errors, "One or more results missing expected fields.")
      } else {
        success <- success && isTRUE(res$success)
        if (!is.null(res$warn)) warns <- c(warns, res$warn)
        if (!is.null(res$error_msg) && res$error_msg != "") {
          errors <- c(errors, res$error_msg)
        }
      }
    }
  }, error = function(e) {
    success <- FALSE
    errors  <- c(errors, paste("combine_validation_results failed:", e$message))
  })
  
  list(
    success   = success,
    warn      = if (length(warns) > 0) warns else NULL,
    error_msg = if (length(errors) > 0) errors else NULL,
    output_obj = NULL
  )
}




# Market Selection --------------------------------------------------------
create_effect_size_list <- function(size, direction, steps = 10) {
  size = abs(size)

  if(size > 1 | size == 0) {
    size <- 1
  }

  if (direction != "both") {
    effect_size = seq(0, size, by = size/steps)
  } else {
    effect_size = seq(-size, size, size/(steps/2))
  }

  if (direction == "neg") {
    effect_size = -effect_size
  }
  return(effect_size)
}


# GeoLift -----------------------------------------------------------------

validate_locations <- function(locations, data) {
  success <- TRUE
  error_msg <- character()
  warn <- character()
  
  # 1. Must be a list-of-lists-of-strings
  if (!is.list(locations) || length(locations) == 0) {
    return(list(success = FALSE, error_msg = "locations must be a non-empty list", warn = NULL))
  }
  
  # Check all elements are character vectors
  if (!all(sapply(locations, function(x) is.character(x) || (is.list(x) && all(sapply(x, is.character)))))) {
    return(list(success = FALSE, error_msg = "locations must be a 2-layer list, with innermost values as character vectors", warn = NULL))
  }
  
  # 2. Cells cannot overlap
  all_locs <- unlist(locations, use.names = FALSE)
  if (any(duplicated(tolower(all_locs)))) {
    dupes <- unique(all_locs[duplicated(tolower(all_locs))])
    return(list(success = FALSE, error_msg = paste("Overlapping locations across cells:", paste(dupes, collapse = ", ")), warn = NULL))
  }
  
  # 3. All locations must exist in dataset
  dataset_locs <- unique(tolower(as.character(data$location)))
  missing <- setdiff(tolower(all_locs), dataset_locs)
  if (length(missing) > 0) {
    warn <- paste("The following locations are not present in dataset and will be ignored:", paste(missing, collapse = ", "))
    # strip out missing from locations
    locations <- lapply(locations, function(x) x[tolower(x) %in% dataset_locs])
  }
  
  # 4. Force names to "cell_1", "cell_2", ...
  expected_names <- paste0("cell_", seq_along(locations))

  if (is.null(names(locations)) || any(names(locations) != expected_names)) {
    warn <- c(warn, paste(
      "Cell names were reset. Expected names:",
      paste(expected_names, collapse = ", ")
    ))
    names(locations) <- expected_names
  }
  
  return(list(success = success, error_msg = error_msg, warning = warn, output_obj = locations))
}
