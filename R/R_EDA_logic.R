# -------------------------------------------------------------------------
library(GeoLift)
library(tidyverse)
# data(GeoLift_PreTest)
library(dplyr)
library(zoo)
library(GeoLift)
library(shiny)
library(tseries)
library(stats)
library(forecast)
library(parameters)





############################################################################
############################################################################
##########################IMPORT EXAMPLE DATA###############################
############################################################################
############################################################################
# online_mkt = read.csv("online_mkt.csv")


# standardization of the Y variable
online_mkt <- online_mkt %>%
  as_tibble() %>%
  mutate(app_per_pop = 100*app_download/population) %>%
  mutate(date_int = as.integer(factor(.$date)))

# standardize the entire data set to GeoLift's format
ol_mkt_pretest <- GeoDataRead(data = online_mkt,
                              date_id = "date",
                              location_id = "city",
                              Y_id = "app_per_pop",
                              X = c(), #empty list as we have no covariates
                              format = "yyyy-mm-dd",
                              summary = TRUE)

# thresholding the time vairable due to the limitation of GeoLift
ol_mkt_pretest_test = ol_mkt_pretest[ol_mkt_pretest$time <= 75,]


# -------------------------------------------------------------------------
# Data Visualization
# ---- Packages ----
library(shiny)
library(ggplot2)
library(dplyr)
library(data.table)   # for fast rolling means
library(stringr)

# ===============================
# Data helpers (compute layer)
# ===============================

# Fast top-N city selection by total Y
top_cities_by_totalY <- function(data, top_n = 5) {
  data %>%
    group_by(location) %>%
    summarise(total_Y = sum(Y, na.rm = TRUE), .groups = "drop") %>%
    arrange(desc(total_Y)) %>%
    slice_head(n = top_n) %>%
    pull(location)
}

# Prepare smoothed (and optionally standardized) series per city
prepare_geo_series <- function(data, city_list = NULL, k = 7, top_n = 5, normalize = FALSE,
                               partial_windows = TRUE) {
  if (is.null(city_list)) {
    city_list <- top_cities_by_totalY(data, top_n = top_n)
  }
  
  df <- data %>%
    dplyr::filter(location %in% city_list) %>%
    dplyr::arrange(location, time) %>%
    dplyr::select(location, time, Y)
  
  DT <- data.table::as.data.table(df)
  data.table::setkey(DT, location, time)
  
  if (partial_windows) {
    # variable-length windows for the first (k-1) rows
    DT[, Y_smooth := zoo::rollapplyr(
      data = Y,
      width = k,
      FUN = function(x) mean(x, na.rm = TRUE),
      partial = TRUE,   # <= key change: allow shorter windows at the start
      fill = NA
    ), by = location]
  } else {
    # strict windows: first k-1 rows are NA
    DT[, Y_smooth := data.table::frollmean(Y, n = k, align = "right", na.rm = TRUE), by = location]
  }
  
  if (normalize) {
    DT[, Y_smooth := {
      mu <- mean(Y_smooth, na.rm = TRUE)
      sdv <- sd(Y_smooth, na.rm = TRUE)
      if (isTRUE(is.finite(sdv)) && sdv > 0) (Y_smooth - mu) / sdv else 0
    }, by = location]
  }
  
  as.data.frame(DT)
}

# ===============================
# Plotting layer
# ===============================

# Pure ggplot path (facet or combined)
plot_geo_trend_gg <- function(data_proc,
                              k,
                              normalize,
                              facet,
                              treatment_start_day = NULL) {
  p <- ggplot(data_proc, aes(x = time, y = Y_smooth, group = location)) +
    { if (!facet) geom_line(alpha = 0.9) else geom_line(color = "steelblue", alpha = 0.9) } +
    theme_minimal(base_size = 12) +
    labs(
      x = "Time",
      y = if (normalize) "Smoothed Y (Z-score)" else "Smoothed Y",
      title = "Smoothed Time Series by City",
      subtitle = paste0("Rolling mean (k = ", k, ")",
                        ifelse(normalize, ", standardized within city", ""))
    )
  
  # Optional treatment line
  if (!is.null(treatment_start_day)) {
    p <- p + geom_vline(xintercept = treatment_start_day,
                        linetype = "dashed", color = "red")
  }
  
  # Facet if requested
  if (facet) {
    p <- p + facet_wrap(~location, scales = "free_y")
  } else {
    p <- p + aes(color = location)
  }
  
  p
}

# Wrapper that keeps your original signature but is faster/correct
plot_geo_trend <- function(data,
                           city_list = NULL,
                           k = 7,
                           top_n = 5,
                           treatment_start_day = NULL,
                           normalize = FALSE,
                           facet = FALSE,
                           print_cities = FALSE) {
  
  data_proc <- prepare_geo_series(
    data = data,
    city_list = city_list,
    k = k,
    top_n = top_n,
    normalize = normalize
  )
  
  # Optionally print cities chosen (for script usage)
  if (print_cities && is.null(city_list)) {
    chosen <- unique(data_proc$location)
    message("Using top ", top_n, " cities: ", paste(chosen, collapse = ", "))
  }
  
  # If you have a custom GeoPlot(), you can keep this branch.
  # Otherwise, the ggplot path will be used.
  if (!facet && exists("GeoPlot", mode = "function")) {
    # NOTE: assumes your GeoPlot accepts these column names.
    return(
      GeoPlot(
        data_proc %>% select(-Y) %>% rename(Y = Y_smooth),
        Y_id = "Y",
        time_id = "time",
        location_id = "location",
        treatment_start = treatment_start_day
      )
    )
  }
  
  plot_geo_trend_gg(
    data_proc = data_proc,
    k = k,
    normalize = normalize,
    facet = facet,
    treatment_start_day = treatment_start_day
  )
}

# ===============================
# Shiny app
# ===============================

ui <- fluidPage(
  titlePanel("GeoTrend (fast, adjustable)"),
  sidebarLayout(
    sidebarPanel(
      sliderInput("k", "Rolling window size (k)", min = 1, max = 60, value = 7, step = 1),
      sliderInput("top_n", "Top-N cities by total Y", min = 1, max = 15, value = 5, step = 1),
      numericInput("treatment_start_day", "Treatment start (optional)", value = 62, min = NA, max = NA),
      checkboxInput("normalize", "Standardize within each city (Z-score)", value = FALSE),
      checkboxInput("facet", "Facet by city", value = FALSE),
      helpText("Tip: If k is large relative to the number of rows in a city, ",
               "the first few smoothed values will be NA by design (insufficient window).")
    ),
    mainPanel(
      verbatimTextOutput("chosen_cities"),
      plotOutput("geo_plot", height = "520px")
    )
  )
)

server <- function(input, output, session) {
  
  # Reactive chosen cities (updates when top_n changes)
  chosen_cities <- reactive({
    top_cities_by_totalY(ol_mkt_pretest_test, top_n = input$top_n)
  })
  
  output$chosen_cities <- renderText({
    paste0("Cities: ", paste(chosen_cities(), collapse = ", "))
  })
  
  output$geo_plot <- renderPlot({
    req(input$k, input$top_n)  # basic guard
    
    plot_geo_trend(
      data = ol_mkt_pretest_test,
      city_list = NULL,                 # set to chosen_cities() to lock them
      k = input$k,
      top_n = input$top_n,
      treatment_start_day = {
        val <- input$treatment_start_day
        if (is.null(val) || is.na(val) || !is.finite(val)) NULL else val
      },
      normalize = input$normalize,
      facet = input$facet,
      print_cities = FALSE
    )
  }, res = 110)
}

shinyApp(ui, server)  # uncomment to run locally







# TS EDA ------------------------------------------------------------------

# -------------------------------------------------------------------------
# Panel-data EDA for grouped time series
# - Orders by time within each group
# - Infers frequency from the time variable (or accept a user-specified freq)
# - Handles NA/short/constant series gracefully
# - Returns a nested list of results and (optionally) draws plots
# -------------------------------------------------------------------------

# Required packages:
# install.packages(c("dplyr", "rlang", "tseries", "moments", "zoo"))
library(dplyr)
library(rlang)
library(tseries)  # for adf.test
library(moments)  # for skewness, kurtosis
library(zoo)      # for time handling (yearmon, etc.)

# --- Helper: infer a sensible ts frequency from a time vector (Date/POSIX/numeric) ---
infer_frequency <- function(tvec) {
  # If Date/POSIXt: use median spacing in days to guess periodicity
  if (inherits(tvec, c("Date", "POSIXct", "POSIXt"))) {
    # Remove duplicates and NA, then compute diffs in days
    tt <- sort(unique(as.Date(tvec)))
    if (length(tt) < 3) return(1)
    d <- median(diff(tt))
    d <- as.numeric(d)
    
    # Heuristics (tweak if needed)
    if (d <= 1.5) return(365)      # daily -> ~365
    if (d <= 7.5) return(52)       # weekly -> ~52
    if (d <= 31.5) return(12)      # monthly -> 12
    if (d <= 95)  return(4)        # quarterly -> 4
    return(1)                       # else treat as annual/unknown
  }
  
  # If numeric and looks like sequential periods, default to 1 (no seasonality)
  return(1)
}

# --- Helper: build a ts object from a single group's data, ordered by time ---
make_ts <- function(y, time, freq = NULL) {
  # Drop complete NA rows first (keep y and time in sync)
  keep <- !is.na(y) & !is.na(time)
  y <- y[keep]
  time <- time[keep]
  
  # Guard small series
  if (length(y) < 3) return(NULL)
  
  # Use provided frequency or infer
  f <- if (!is.null(freq)) freq else infer_frequency(time)
  ts(y, frequency = f)  # start is left as default; we only need frequency for EDA
}

# --- Main function ---
eda_panel_data <- function(data, time_var, group_var, y_var = "Y",
                           freq = NULL, show_plots = TRUE, quiet = FALSE) {
  time_sym  <- ensym(time_var)
  group_sym <- ensym(group_var)
  y_sym     <- ensym(y_var)
  
  # Collect unique groups (drop NA groups)
  unique_groups <- data %>%
    filter(!is.na(!!group_sym)) %>%
    distinct(!!group_sym) %>%
    pull(!!group_sym)
  
  panel_results <- vector("list", length(unique_groups))
  names(panel_results) <- unique_groups
  
  for (group in unique_groups) {
    # 1) Extract & order this group's data
    group_data <- data %>%
      filter(!!group_sym == group) %>%
      arrange(!!time_sym) %>%
      select(!!group_sym, !!time_sym, !!y_sym)
    
    # Rename for convenience
    colnames(group_data) <- c("group", "time", "y")
    
    # 2) Build time series (handles NA, short length)
    ts_data <- make_ts(group_data$y, group_data$time, freq = freq)
    
    # If ts could not be created, store a note and continue
    if (is.null(ts_data)) {
      panel_results[[group]] <- list(
        Error = "Series too short or fully NA after cleaning.",
        Time_Info = data.frame(
          Count = nrow(group_data),
          Non_NA = sum(!is.na(group_data$y)),
          Frequency = ifelse(is.null(freq), infer_frequency(group_data$time), freq)
        )
      )
      if (!quiet) message("Skipped group '", group, "': series too short or NA-only.")
      next
    }
    
    # 3) Descriptive statistics (on non-NA)
    y_clean <- as.numeric(ts_data)
    mean_y <- mean(y_clean, na.rm = TRUE)
    sd_y   <- sd(y_clean,   na.rm = TRUE)
    
    summary_stats <- data.frame(
      Mean     = mean_y,
      Median   = median(y_clean, na.rm = TRUE),
      SD       = sd_y,
      Min      = min(y_clean, na.rm = TRUE),
      Max      = max(y_clean, na.rm = TRUE),
      Skewness = if (sum(!is.na(y_clean)) > 2) skewness(y_clean, na.rm = TRUE) else NA_real_,
      Kurtosis = if (sum(!is.na(y_clean)) > 3) kurtosis(y_clean, na.rm = TRUE) else NA_real_,
      NAs      = sum(is.na(ts_data)),
      Length   = length(ts_data),
      stringsAsFactors = FALSE
    )
    
    # 4) Decomposition
    # Use additive by default; decompose() needs at least 2*frequency observations to show seasonality.
    decomposition <- NULL
    decomp_msg <- NULL
    try({
      decomposition <- decompose(ts_data, type = "additive")
    }, silent = TRUE)
    if (is.null(decomposition)) {
      decomp_msg <- "Decomposition not available (insufficient length for seasonal period or NA issues)."
    }
    
    # 5) Stationarity test (ADF)
    # ADF fails on series with too few unique values or too short length.
    adf_res <- NULL
    adf_msg <- NULL
    try({
      # Remove any NA before adf
      y_adf <- na.omit(y_clean)
      if (length(unique(y_adf)) > 2 && length(y_adf) >= 10) {
        adf_res <- adf.test(y_adf, alternative = "stationary")
      } else {
        adf_msg <- "ADF not run (series too short or nearly constant)."
      }
    }, silent = TRUE)
    if (is.null(adf_res) && is.null(adf_msg)) {
      adf_msg <- "ADF failed (possibly due to NA or singularity)."
    }
    
    # 6) Time metadata
    time_info <- data.frame(
      Start     = paste(start(ts_data), collapse = "."),
      End       = paste(end(ts_data), collapse = "."),
      Frequency = frequency(ts_data),
      stringsAsFactors = FALSE
    )
    
    # 7) Save results
    panel_results[[group]] <- list(
      Summary_Statistics = summary_stats,
      Trend_Seasonality_Decomposition = if (!is.null(decomposition)) decomposition else decomp_msg,
      ADF_Test = if (!is.null(adf_res)) adf_res else adf_msg,
      Time_Info = time_info
    )
    
    # 8) Optional printing & plots
    if (!quiet) {
      cat("\n==============================\n")
      cat("#### Group:", group, "\n")
      cat("------------------------------\n")
      cat("Time-series descriptive stats:\n"); print(summary_stats)
      
      cat("\nStationarity (ADF):\n")
      if (inherits(adf_res, "htest")) {
        print(adf_res)
      } else {
        print(adf_msg)
      }
      
      cat("\nDecomposition (trend/seasonality):\n")
      if (show_plots && !is.null(decomposition)) {
        plot(decomposition)
      } else {
        cat(ifelse(is.null(decomposition), decomp_msg, "(plot suppressed)\n"))
      }
      
      cat("\nTime range & frequency:\n"); print(time_info)
      
      if (show_plots) {
        # ACF & PACF (only if long enough)
        y_acf <- na.omit(as.numeric(ts_data))
        if (length(y_acf) >= 10) {
          old_par <- par(no.readonly = TRUE)
          on.exit(par(old_par), add = TRUE)
          par(mfrow = c(1, 2))
          acf(y_acf, main = paste("ACF -", group))
          pacf(y_acf, main = paste("PACF -", group))
        } else {
          cat("ACF/PACF skipped (series too short).\n")
        }
      }
    }
  }
  
  return(panel_results)
}





eda_result <- eda_panel_data(ol_mkt_pretest_test, time_var = "time", group_var = "location")

# -------------------------------------------------------------------------


MarketSelections <- GeoLiftMarketSelection(data = ol_mkt_pretest_test,
                                           treatment_periods = c(13),
                                           N = c(2,3,4,5),
                                           Y_id = "Y",
                                           location_id = "location",
                                           time_id = "time",
                                           effect_size = seq(0, 0.3, 0.05),
                                           lookback_window = 1,
                                           include_markets = c('sao_paulo'),
                                           exclude_markets = c(),
                                           holdout = c(0.5, 1),
                                           cpic = 1,
                                           budget = 100000,
                                           alpha = 0.05,
                                           side_of_test = "two_sided",
                                           fixed_effects = TRUE,
                                           Correlations = TRUE)

# Plot for chicago, cincinnati, houston, portland for a 15 day test
plot(MarketSelections, market_ID = 1, print_summary = TRUE)


GeoTestResult <- GeoLift(
  Y_id = "Y",
  data = ol_mkt_pretest, 
  locations = c('sao_paulo', 'porto_alegre', 'joao_pessoa'),
  treatment_start_time = 62,
  treatment_end_time = 74,
  fixed_effects = TRUE,
  model = "best",  
  alpha = 0.05
)

summary(GeoTestResult)

plot(GeoTestResult, type = "Lift")

plot(GeoTestResult, type = "ATT")


