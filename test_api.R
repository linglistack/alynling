# Test basic API functionality with installed packages
library(plumber)
library(jsonlite)
library(dplyr)

cat("Testing basic R packages...\n")
cat("plumber:", packageVersion("plumber"), "\n")
cat("jsonlite:", packageVersion("jsonlite"), "\n") 
cat("dplyr:", packageVersion("dplyr"), "\n")

# Test if augsynth is available
if (require("augsynth", quietly = TRUE)) {
  cat("augsynth: AVAILABLE\n")
} else {
  cat("augsynth: MISSING (this will limit GeoLift functionality)\n")
}

cat("Basic packages are ready for API!\n")
