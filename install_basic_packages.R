# Basic package installation for GeoLift API (excluding devtools and augsynth)
cat("Installing basic R packages for GeoLift API...\n")

# Set CRAN mirror
options(repos = c(CRAN = "https://cloud.r-project.org/"))
options(Ncpus = parallel::detectCores())

# Function to install packages with error handling
install_package_safely <- function(package_name) {
  cat(paste("Installing", package_name, "...\n"))
  
  tryCatch({
    if (!require(package_name, character.only = TRUE, quietly = TRUE)) {
      install.packages(package_name, dependencies = TRUE)
      library(package_name, character.only = TRUE)
      cat(paste("✓", package_name, "installed successfully\n"))
    } else {
      cat(paste("✓", package_name, "already installed\n"))
    }
    return(TRUE)
  }, error = function(e) {
    cat(paste("✗ Error installing", package_name, ":", e$message, "\n"))
    return(FALSE)
  })
}

# Core packages needed for the API
cat("\n=== Installing core dependencies ===\n")
core_packages <- c(
  "plumber", "jsonlite", "dplyr", "tidyr", "ggplot2", "stringr",
  "progress", "foreach", "doParallel", "scales", "gridExtra", 
  "knitr", "tibble", "rlang"
)

success_count <- 0
for (pkg in core_packages) {
  if (install_package_safely(pkg)) {
    success_count <- success_count + 1
  }
}

# Specialized packages
cat("\n=== Installing specialized packages ===\n")
specialized_packages <- c("gsynth", "panelView", "MarketMatching", "directlabels", "lifecycle")

for (pkg in specialized_packages) {
  if (install_package_safely(pkg)) {
    success_count <- success_count + 1
  }
}

# Verify critical packages for API
cat("\n=== Verifying critical packages ===\n")
critical_packages <- c("plumber", "jsonlite", "dplyr", "gsynth")
all_critical_ok <- TRUE

for (pkg in critical_packages) {
  if (require(pkg, character.only = TRUE, quietly = TRUE)) {
    cat(paste("✓", pkg, "verified\n"))
  } else {
    cat(paste("✗", pkg, "NOT AVAILABLE\n"))
    all_critical_ok <- FALSE
  }
}

total_packages <- length(core_packages) + length(specialized_packages)
cat(paste("\n=== Summary ===\n"))
cat(paste("Packages installed:", success_count, "/", total_packages, "\n"))
cat(paste("Success rate:", round(success_count/total_packages*100, 1), "%\n"))

if (all_critical_ok) {
  cat("\n🎉 All critical packages installed! Basic API should work.\n")
  cat("Note: devtools and augsynth are excluded. Install them separately if needed.\n")
} else {
  cat("\n⚠️  Some critical packages failed. Check errors above.\n")
}

cat("\nBasic installation completed at:", Sys.time(), "\n") 