library(dplyr)


rank_helper <- function(MarketSelections, investment_weight) {

  a <- investment_weight/10

  result <- MarketSelections$BestMarkets %>% 
    as_tibble() %>%
    mutate(rank_mde = dplyr::dense_rank(abs(EffectSize)),  # redundancy mainly for future-proofing
      rank_pvalue = dplyr::dense_rank(Power),
      rank_abszero = dplyr::dense_rank(abs_lift_in_zero),
      rank_business_practicality = dplyr:: dense_rank(Investment)) %>%
    mutate(scientific_strength = rowMeans(across(c(rank_mde, rank_pvalue, rank_abszero)))) %>% # redundancy ends here
    mutate(invest_weighted_rank = a * rank_business_practicality + (1 - a) * scientific_strength) %>%
    arrange(invest_weighted_rank, location) %>%
    select(-c(rank_mde, rank_pvalue, rank_abszero))

  return(result)
}

