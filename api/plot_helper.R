library(GeoLift)


create_artificial_lift_for_given_market <- function(x, market_ID){
  # Taken from plot.GeoLiftPower
  # takes a market selection object, returns 
  # 1. a GeoLift object for market selection treatment vs. control
  # 2. a data frame containing effect size, power, and Investment needed. 
  
  Market <- x$BestMarkets %>% dplyr::filter(ID == market_ID)
  locs_aux <- unlist(strsplit(stringr::str_replace_all(Market$location, ", ", ","), split = ","))
  max_time <- max(x$parameters$data$time)
  
  data_lifted <- x$parameters$data
  
  data_lifted$Y[data_lifted$location %in% locs_aux &
                  data_lifted$time >= max_time - Market$duration + 1] <-
    data_lifted$Y[data_lifted$location %in% locs_aux &
                    data_lifted$time >= max_time - Market$duration + 1] * (1 + Market$EffectSize)
  
  
  if (tolower(x$parameters$side_of_test) == "two_sided") {
    stat_test <- "Total"
  } else {
    if (Market$EffectSize < 0) {
      stat_test <- "Negative"
    } else if (Market$EffectSize > 0) {
      stat_test <- "Positive"
    }
  }
  artificial_lift <- GeoLift(
    Y_id = "Y",
    time_id = "time",
    location_id = "location",
    data = data_lifted,
    locations = locs_aux,
    treatment_start_time = max_time - Market$duration + 1,
    treatment_end_time = max_time,
    model = x$parameters$model,
    fixed_effects = x$parameters$fixed_effects,
    stat_test = stat_test
  )
  
  
  treatment_periods <- unique(x$duration)
  EffectSize <- unique(x$EffectSize)
  
  PowerPlot_data <- as.data.frame(x$PowerCurves %>% dplyr::filter(
    duration == Market$duration,
    location == Market$location
  ))%>%
    dplyr::group_by(EffectSize) %>%
    dplyr::summarise(power = mean(power), investment = mean(Investment))
  
  return(list("lifted" = artificial_lift, "power" = PowerPlot_data))
}






df_GeoLift_Lift <- function(GeoLift,
                      treatment_end_date = NULL,
                      frequency = "daily",
                      post_treatment_periods = 0) {
  # Taken from Lift.plot
  # Take output from GeoLift, return treatment + observation + confidence band for treatment period
  
  treatment_obs <- as.data.frame(
    colMeans(
      matrix(
        GeoLift$y_obs,
        nrow = nrow(GeoLift$test_id),
        ncol = GeoLift$TreatmentEnd
      )
    )
  ) * nrow(GeoLift$test_id)
  colnames(treatment_obs) <- c("t_obs")
  
  q_treatment_locations <- length(GeoLift$test_id$name)
  df <- data.frame(
    t_obs = treatment_obs$t_obs,
    c_obs = GeoLift$y_hat * q_treatment_locations,
    c_obs_lower_bound = (GeoLift$y_hat - (GeoLift$summary$att$Estimate - GeoLift$summary$att$lower_bound)) * q_treatment_locations,
    c_obs_upper_bound = (GeoLift$y_hat + (GeoLift$summary$att$upper_bound - GeoLift$summary$att$Estimate)) * q_treatment_locations,
    Time = 1:length(treatment_obs$t_obs)
  )
  
  if (!is.null(treatment_end_date)) {
    plot_dates <- get_date_from_test_periods(GeoLift,
                                             treatment_end_date,
                                             post_treatment_periods = post_treatment_periods,
                                             frequency = frequency
    )
    df$Time <- plot_dates$date_vector
  } else {
    message(
      "You can include dates in your chart if you supply the end date of the treatment. Just specify the treatment_end_date parameter."
    )
    plot_dates <- list(
      treatment_start = GeoLift$TreatmentStart,
      treatment_end = GeoLift$TreatmentEnd
    )
  }
  
  if (post_treatment_periods < 0) {
    post_treatment_periods <- abs(post_treatment_periods)
  }
  
  # Post Treatment Periods
  df$post_treatment <- "Treatment Period"
  if (post_treatment_periods > 0) {
    post_treatment_linetype <- "dashed"
    df$post_treatment[(nrow(df) - post_treatment_periods + 1):nrow(df)] <- "Post-treatment Period"
    df <- rbind(df, df[(nrow(df) - post_treatment_periods + 1), ])
    df$post_treatment[nrow(df)] <- "Treatment Period"
  } else {
    post_treatment_linetype <- "blank"
  }
  
  if (!is.null(treatment_end_date)) {
    plot_dates$treatment_end <- plot_dates$treatment_end + post_treatment_periods
  }
  
  return(df)
}



prep_att_data <- function(GeoLift,
                          treatment_end_date = NULL,
                          frequency = "daily",
                          post_treatment_periods = 0) {
  # Taken from absolute_value.plot
  # Take output from GeoLift, return treatment + observation + confidence band for treatment period
  
  
  # Keep only needed columns from ATT summary
  df <- GeoLift$summary$att[, c("Time", "Estimate", "lower_bound", "upper_bound")]
  
  # Handle post-treatment periods if user specified a number
  if (post_treatment_periods < 0) {
    post_treatment_periods <- abs(post_treatment_periods)
  }
  
  # Convert period indices to actual dates if an end date is given
  if (!is.null(treatment_end_date)) {
    plot_dates <- get_date_from_test_periods(
      GeoLift,
      treatment_end_date,
      post_treatment_periods = post_treatment_periods,
      frequency = frequency
    )
    df$Time <- plot_dates$date_vector
  } else {
    plot_dates <- list(
      treatment_start = GeoLift$TreatmentStart,
      treatment_end   = GeoLift$TreatmentEnd
    )
  }
  
  
  # Mark treatment vs post-treatment rows
  df$post_treatment <- "Treatment Period"
  if (post_treatment_periods > 0) {
    df$post_treatment[(nrow(df) - post_treatment_periods + 1):nrow(df)] <- "Post-treatment Period"
    df <- rbind(df, df[(nrow(df) - post_treatment_periods + 1), ])
    df$post_treatment[nrow(df)] <- "Treatment Period" # R plotting hack, not sure if it's good elsewhere
  }
  
  return(df)
}





