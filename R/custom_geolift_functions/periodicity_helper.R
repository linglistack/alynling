library(dplyr)
library(forecast)
library(tidyr)

check_stationarity <- function(y) {
  y <- na.omit(y)
  
  # Augmented Dickey-Fuller (ADF) test
  adf_p <- adf_p <- tryCatch(suppressWarnings(adf.test(y)$p.value), error = function(e) NA)
  
  # KPSS test (level stationarity)
  kpss_fit <- tryCatch(suppressWarnings(ur.kpss(y, type = "tau")), error = function(e) NULL)
  
  if (!is.null(kpss_fit)) {
    kpss_stat <- kpss_fit@teststat
    kpss_cval <- kpss_fit@cval
    kpss_reject <- kpss_stat > kpss_cval[2]   # 1,2,3,4 for 10, 5, 2.5 and 1 %
  } else {
    kpss_reject <- NA
  }
  
  # Final verdict
  if (!is.na(adf_p) && !is.na(kpss_reject) &&
      (adf_p > 0.05 && kpss_reject)) {
    verdict <- "nonstationary"
  } else {
    verdict <- "inconclusive"
  }
  
  return(list(
    adf_p = adf_p,
    kpss_reject = kpss_reject,
    verdict = verdict
  ))
}

detect_periodicity <- function(x, alpha = 0.05, m = 2, tol = 5) {
  # Step 1: Test for periodicity
  test_res <- GeneCycle::fisher.g.test(x)
  pval <- test_res
  
  if (pval < alpha) {
    # Step 2: Spectrum → tibble
    spec <- spectrum(x, plot = FALSE)
    df <- tibble(
      freq = spec$freq,
      power = spec$spec,
      period = 1 / spec$freq
    ) %>%
      filter(period >= 3, is.finite(period)) %>%
      arrange(desc(power))
    
    # Take a generous set of candidates (e.g. 2m)
    df <- df %>% slice_head(n = m * 2)
    
    # Step 2.5: Merge close periods (within ± tol)
    # Approach: sequential clustering by sorted periods
    df <- df %>%
      arrange(period) %>%
      mutate(cluster = cumsum(c(1, diff(period)) > tol)) %>%
      group_by(cluster) %>%
      slice_max(order_by = power, n = 1, with_ties = FALSE) %>%
      ungroup()
    
    # Step 3: Keep top m by power
    df <- df %>% arrange(desc(power)) %>% slice_head(n = m)
    
    # Pad with zeros if fewer than m remain
    periods <- round(df$period)
    if (length(periods) < m) {
      periods <- c(periods, rep(0, m - length(periods)))
    }
    
    return(list(periods = periods, method = "spectral", p.value = pval))
    
  } else {
    return(list(periods = rep(0, m), method = "none", p.value = pval))
  }
}


analyze_stationarity <- function(data, location_col, value_col) {
  results <- data %>%
    group_by(.data[[location_col]]) %>%
    summarise(
      ts_values = list(.data[[value_col]]),
      .groups = "drop"
    ) %>%
    rowwise() %>%
    mutate(
      stationarity = list(check_stationarity(ts_values)),
      verdict = stationarity$verdict
    ) %>%
    ungroup() %>%
    transmute(
      location = .data[[location_col]],
      verdict
    )
  
  return(results)
}

detrend_timeseries <- function(data, stationarity_df, location_col, value_col) {
  results <- data %>%
    group_by(.data[[location_col]]) %>%
    mutate(
      verdict = stationarity_df$verdict[match(.data[[location_col]], stationarity_df$location)],
      detrended = if (unique(verdict) == "nonstationary") {
        fit <- tbats(ts(.data[[value_col]]))
        as.numeric(residuals(fit))
      } else {
        as.numeric(.data[[value_col]])
      }
    ) %>%
    ungroup()
  
  return(results)
}


analyze_periodicity <- function(detrended_data, location_col, value_col, m = 2, tol = 5) {
  results <- detrended_data %>%
    group_by(.data[[location_col]]) %>%
    summarise(
      ts_values = list(.data[[value_col]]),
      .groups = "drop"
    ) %>%
    rowwise() %>%
    mutate(
      periods = list(sort(detect_periodicity(ts_values, m = m, tol = tol)$periods))
    ) %>%
    ungroup() %>%
    dplyr::select(-ts_values) %>%
    unnest_wider(periods, names_sep = "_") %>%
    rename(location = !!sym(location_col)) %>%
    rename_with(~ paste0("period_", seq_along(.)), starts_with("periods_"))
  
  return(results)
}

analyze_timeseries <- function(data, location_col, value_col, m = 2, tol = 5) {
  # 1. Check stationarity
  stationarity_out <- analyze_stationarity(
    data,
    location_col = location_col,
    value_col = value_col
  )

  # 2. Detrend if nonstationary
  detrended_data <- detrend_timeseries(
    data,
    stationarity_df = stationarity_out,
    location_col = location_col,
    value_col = value_col
  )

  # 3. Detect periodicity
  periodicity_out <- analyze_periodicity(
    detrended_data,
    location_col = location_col,
    value_col = "detrended",  # important: use detrended col
    m = m,
    tol = tol
  )
  # print(periodicity_out)
  
  # 4. Join everything together
  results <- stationarity_out %>%
    left_join(periodicity_out, by = "location")
  
  return(results)
}



# # Example: 
# analyze_timeseries(data = df, location_col = "city", "app_per_pop")
