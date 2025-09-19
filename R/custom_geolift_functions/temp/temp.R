library(GeoLift)
library(tidyverse)
setwd("/home/shiwen/GitHub/alynling")
source(file.path("R/custom_geolift_functions/plot_helper.R"))


# Plots for MarketSelections ----------------------------------------------

data(GeoLift_PreTest)
GeoTestData_PreTest <- GeoDataRead(data = GeoLift_PreTest,
                                   date_id = "date",
                                   location_id = "location",
                                   Y_id = "Y",
                                   X = c(), #empty list as we have no covariates
                                   format = "yyyy-mm-dd",
                                   summary = TRUE)



MarketSelections <- GeoLiftMarketSelection(data = GeoTestData_PreTest, 
treatment_periods = c(7, 9))


a = 0.05
MarketSelections$BestMarkets %>% 
  as_tibble() %>%
  mutate(rank_mde = dplyr::dense_rank(abs(EffectSize)),
    rank_pvalue = dplyr::dense_rank(Power),
    rank_abszero = dplyr::dense_rank(abs_lift_in_zero),
    rank_investment = dplyr:: dense_rank(Investment)) %>%
  mutate(power_rank = rowMeans(across(c(rank_mde, rank_pvalue, rank_abszero)))) %>%
  mutate(invest_weighted_rank = a * rank_investment + (1 - a) * power_rank) %>% 
  arrange(invest_weighted_rank) %>%
  mutate(invest_weighted_rank = rank(invest_weighted_rank, ties.method = "min")) %>%
  ggplot(aes(x = invest_weighted_rank, y = Investment)) + 
  geom_point()


max_N = GeoTestData_PreTest$location %>% unique() %>% length()
MarketSelections <- GeoLiftMarketSelection(data = GeoTestData_PreTest,
                                           treatment_periods = c(7, 9),
                                           N = c(2),
                                           Y_id = "Y",
                                           location_id = "location",
                                           time_id = "time",
                                           effect_size = seq(0, 0.3, 0.1),
                                           lookback_window = 3,
                                           cpic = 1,
                                           Correlations = TRUE,
                                           fixed_effects = TRUE,
                                           side_of_test = "two_sided")



MarketSelections$BestMarkets %>% 
  as_tibble() %>% 
  filter(Investment <= 100000)



MarketSelections$PowerCurves %>% 
  as_tibble() %>%
  filter(location == "nashville, san diego") %>% 
  ggplot(aes(x = EffectSize, y = power, color = factor(duration)))+
  geom_line()

plot(MarketSelections, 1)


MarketSelections$BestMarkets %>% 
  as_tibble() %>%
  mutate(n_invest = Investment/EffectSize) %>%
  ggplot(aes(x = n_invest, y = Holdout, color = factor(duration))) +
  geom_point()


plot(MarketSelections, 2)


MarketSelections$BestMarkets %>% 
  as_tibble() %>%
  




    ms <- NULL
    if (exists("last_market_selection", envir = .cache_env) &&
      !is.null(.cache_env$last_market_selection)) {
      ms <- .cache_env$last_market_selection
    }
    if (is.null(ms)) {
      cat("ERROR: No cached market_selection found in .cache_env\n")
      stop("No cached market_selection available")
    }

    syn_lift <- GeoLift_lift_injection(ms, market_rank)
    syn_lifted <- syn_lift$lifted
    syn_power <- syn_lift$power

    lifted_df <- GeoLift_lift_data(syn_lift)["t_obs"]




    effect_size       <- get_param(body, "effect_size", seq(0, 0.25, 0.05), as.numeric)
    two_sided <- (min(effect_size) < 0) & (max(effect_size) > 0)
    side_of_test      <- get_param(body, "side_of_test", if (two_sided) "two_sided" else "one_sided", as.character)
    treatment_periods <- get_param(body, "treatment_periods", max(7, min(periodicity, 60)), as.integer)
    lookback_window   <- get_param(body, "lookback_window", lookback_window, as.integer)
    cpic              <- get_param(body, "cpic", 1, as.numeric)
    alpha             <- get_param(body, "alpha", 0.05, as.numeric)
    N                 <- get_param(body, "N", seq(1, max_n, by = floor(max_n/10)), as.integer)
    include_markets   <- get_param(body, "include_markets", c(), as.character)
    exclude_markets   <- get_param(body, "exclude_markets", c(), as.character)
    holdout           <- get_param(body, "holdout", c(0, 1), as.numeric)
    budget            <- get_param(body, "budget", NULL, as.numeric)
    fixed_effects     <- get_param(body, "fixed_effects", TRUE, as.logical)
    Correlations      <- get_param(body, "Correlations", TRUE, as.logical)
    Y_id              <- get_param(body, "Y_id", "Y", as.character)
    location_id       <- get_param(body, "location_id", "location", as.character)
    time_id           <- get_param(body, "time_id", "time", as.character)




# your base function (for one tp)
investment_per_es_single <- function(d, tp, cpic, sign=c("positive","negative"),
                                     lookback_window=1, step=0.01) {
  sign <- match.arg(sign)
  max_time <- max(d$time)
  sims <- seq_len(lookback_window)
  holdouts <- seq(0, 1, by=step)
  
  res <- lapply(sims, function(sim){
    t_start <- max_time - tp - sim + 2
    t_end   <- t_start + tp - 1
    Y_post_total <- sum(d$Y[d$time >= t_start & d$time <= t_end])
    invest_per_es <- if (sign=="positive")
      cpic * (1 - holdouts) * Y_post_total
    else
      cpic * holdouts * Y_post_total
    data.frame(tp=tp, sim=sim, holdout=holdouts, invest_per_es=invest_per_es)
  })
  
  result <- do.call(rbind, res) %>%
    dplyr::group_by(tp, holdout) %>%
    dplyr::summarize(invest_per_es = mean(invest_per_es), .groups="drop")
  
  return(result)
}


# wrapper: handle multiple tp values
investment_per_es_multi <- function(d, tp_list, cpic, sign=c("positive","negative"),
                                    lookback_window=1, step=0.01) {
  sign <- match.arg(sign)
  results <- lapply(tp_list, function(tp) {
    investment_per_es_single(d, tp, cpic, sign, lookback_window, step)
  })
  return(dplyr::bind_rows(results))
}

temp_df <- investment_per_es_multi(GeoTestData_PreTest, tp = seq(7, 16, 2), cpic = 1, lookback_window = 3)

temp_df %>% 
  filter(holdout > 0.4) %>%
  ggplot(aes(x = invest_per_es, y = holdout, color = factor(tp))) + 
  geom_point()


ID = 3
artificial_lift <- GeoLift_lift_injection(MarketSelections, ID)

AL_lifted <- artificial_lift$lifted
AL_power <- artificial_lift$power

AL_power %>% ggplot() +
  geom_line(aes(x = EffectSize, y = power))




GeoLift_lift_data(AL_lifted)

GeoLift_att_data(AL_lifted)






# Plots for GeoLift -------------------------------------------------------

data(GeoLift_Test)

GeoTestData_Test <- GeoDataRead(data = GeoLift_Test,
                                date_id = "date",
                                location_id = "location",
                                Y_id = "Y",
                                X = c(), #empty list as we have no covariates
                                format = "yyyy-mm-dd",
                                summary = TRUE)

GeoTest <- GeoLift(Y_id = "Y",
                   data = GeoTestData_Test,
                   locations = c("chicago", "portland"),
                   treatment_start_time = 91,
                   treatment_end_time = 105)


plot(GeoTest, type = "Lift")

plot(GeoTest, type = "ATT")




# Investment vs. holdout....
investment_per_es_single <- function(d, tp, cpic, sign=c("positive","negative"),
                                     lookback_window=1, step=0.01) {
  sign <- match.arg(sign)
  max_time <- max(d$time)
  sims <- seq_len(lookback_window)
  holdouts <- seq(0, 1, by=step)
  
  res <- lapply(sims, function(sim){
    t_start <- max_time - tp - sim + 2
    t_end   <- t_start + tp - 1
    Y_post_total <- sum(d$Y[d$time >= t_start & d$time <= t_end])
    invest_per_es <- if (sign=="positive")
      cpic * (1 - holdouts) * Y_post_total
    else
      cpic * holdouts * Y_post_total
    data.frame(tp=tp, sim=sim, holdout=holdouts, invest_per_es=invest_per_es)
  })
  
  result <- do.call(rbind, res) %>%
    dplyr::group_by(tp, holdout) %>%
    dplyr::summarize(invest_per_es = mean(invest_per_es), .groups="drop")
  
  return(result)
}


# wrapper: handle multiple tp values
investment_per_es_multi <- function(d, tp_list, cpic, sign=c("positive","negative"),
                                    lookback_window=1, step=0.01) {
  sign <- match.arg(sign)
  results <- lapply(tp_list, function(tp) {
    investment_per_es_single(d, tp, cpic, sign, lookback_window, step)
  })
  return(dplyr::bind_rows(results))
}


temp_df <- investment_per_es_multi(GeoTestData_PreTest, tp = seq(7, 16, 2), cpic = 1, lookback_window = 1)

temp_df %>% 
  filter(holdout > 0.4) %>%
  ggplot(aes(x = invest_per_es, y = holdout, color = factor(tp))) + 
  geom_point()









# Helper to fit sigmoid and extract params
fit_sigmoid_params <- function(df) {
  glm_fit <- tryCatch(glm(power ~ EffectSize, family = binomial, data = df), error = function(e) NULL)
  
  if (!is.null(glm_fit)) {
    tibble(location = unique(df$location),
           L = 1,
           k = coef(glm_fit)[["EffectSize"]],
           x0 = -coef(glm_fit)[["(Intercept)"]] / coef(glm_fit)[["EffectSize"]],
           method = "glm")
  } else {
    tibble(location = unique(df$location), L = NA, k = NA, x0 = NA, method = "fail")
  }
}

param_df <- MarketSelections$PowerCurves %>%
  group_by(location) %>%
  mutate(power = as.integer(power))
  group_modify(~ fit_sigmoid_params(.x)) %>%
  ungroup()
