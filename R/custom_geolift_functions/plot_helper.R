library(GeoLift)


GeoLift_lift_injection <- function(market_selection, market_ID){
  # Taken from plot.GeoLiftPower
  
  # Takes a GeoLiftMarketSelection object, and a market_ID, returns:
  # 1. a GeoLift output object for market selection treatment vs. control
  # 2. a data frame containing effect size, power, and Investment needed. 
  
  Market <- market_selection$BestMarkets %>% dplyr::filter(ID == market_ID)
  locs_aux <- unlist(strsplit(stringr::str_replace_all(Market$location, ", ", ","), split = ","))
  max_time <- max(market_selection$parameters$data$time)
  
  data_lifted <- market_selection$parameters$data
  
  data_lifted$Y[data_lifted$location %in% locs_aux &
                  data_lifted$time >= max_time - Market$duration + 1] <-
    data_lifted$Y[data_lifted$location %in% locs_aux &
                    data_lifted$time >= max_time - Market$duration + 1] * (1 + Market$EffectSize)
  
  
  if (tolower(market_selection$parameters$side_of_test) == "two_sided") {
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
    model = market_selection$parameters$model,
    fixed_effects = market_selection$parameters$fixed_effects,
    stat_test = stat_test
  )
  
  
  treatment_periods <- unique(market_selection$duration)
  EffectSize <- unique(market_selection$EffectSize)
  
  PowerPlot_data <- as.data.frame(market_selection$PowerCurves %>% dplyr::filter(
    duration == Market$duration,
    location == Market$location
  ))%>%
    dplyr::group_by(EffectSize) %>%
    dplyr::summarise(power = mean(power), investment = mean(Investment))
  
  return(list("lifted" = artificial_lift, "power" = PowerPlot_data))
}






GeoLift_lift_data <- function(GeoLift) {
  # Taken from Lift.plot
  
  # Takes a GeoLift object, returns:
  # treatment + observation + confidence band for treatment period
  
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
  
  return(df)
}

# Combining outputs for multi-cells experiments
collect_injections <- function(ms_obj, location_ID) {


  results <- purrr::imap(ms_obj$Models, function(glms_obj, nm) {
    cell_id <- readr::parse_number(nm)
    
    inject <- GeoLift_lift_injection(glms_obj, location_ID[cell_id])
    
    list(
      power = inject$power %>% dplyr::mutate(cell = cell_id),
      lifted_data = GeoLift_lift_data(inject$lifted) %>% 
        dplyr::mutate(cell = cell_id)
    )
  })
  
  list(
    lifted_power = purrr::map_dfr(results, "power"),
    lifted_data = purrr::map_dfr(results, "lifted_data")
  )
}

GeoLift_att_data <- function(GeoLift) {
  # Taken from absolute_value.plot
  
  # Takes a GeoLift object, returns: 
  # time + ATT estimate and confidence band for the treatment period
  
  df <- GeoLift$summary$att[, c("Time", "Estimate", "lower_bound", "upper_bound")]
  
  return(df)
}





