library(dplyr)


rank_helper <- function(MarketSelections, investment_weights) {
  # sanity checks
  if (any(investment_weights > 10)) {
    stop("investment_weight should never be above 10.")
  }
  if (any(investment_weights < 0)) {
    stop("investment_weight must be non-negative.")
  }
  if (any(investment_weights > 2)) {
    warning("investment_weight values are usually set below 1. 
             Larger values will heavily prioritize investment over scientific strength.")
  }

  base <- MarketSelections$BestMarkets %>%
    as_tibble() %>%
    mutate(
      rank_mde       = dplyr::dense_rank(abs(EffectSize)),
      rank_pvalue    = dplyr::dense_rank(Power),
      rank_abszero   = dplyr::dense_rank(abs_lift_in_zero),
      rank_business_practicality = dplyr::dense_rank(Investment),
      scientific_strength = rowMeans(across(c(rank_mde, rank_pvalue, rank_abszero)))
    )

  # compute one new column per investment_weight
  for (w in investment_weights) {
    a <- w / 10
    colname <- paste0("rank_weight_", w)
    base[[colname]] <- a * base$rank_business_practicality +
                       (1 - a) * base$scientific_strength
  }

  # Arrange by the first weight for reproducibility
  first_col <- paste0("rank_weight_", investment_weights[1])
  result <- base %>%
    arrange(.data[[first_col]], location) %>%
    select(-c(rank_mde, rank_pvalue, rank_abszero))

  return(result)
}

