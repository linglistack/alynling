# Comprehensive package installation for GeoLift API
cat("Starting R package installation for GeoLift API...\n")

# Set CRAN mirror
options(repos = c(CRAN = "https://cloud.r-project.org/"))

# 1. Install devtools FIRST using standard method
cat("\n=== Installing devtools (standard GitHub installer) ===\n")
if (!require("devtools", character.only = TRUE, quietly = TRUE)) {
  cat("Installing devtools from CRAN...\n")
  install.packages("devtools", repos = "https://cloud.r-project.org/")
  library(devtools)
  cat("✓ devtools installation complete\n")
} else {
  cat("✓ devtools already installed\n")
}

# Function to install packages with error handling
install_package_safely <- function(package_name, source = "CRAN", github_repo = NULL) {
  cat(paste("Installing", package_name, "from", source, "...\n"))
  
  tryCatch({
    if (source == "CRAN") {
      if (!require(package_name, character.only = TRUE, quietly = TRUE)) {
        install.packages(package_name, dependencies = TRUE)
        library(package_name, character.only = TRUE)
        cat(paste("✓", package_name, "installed successfully from CRAN\n"))
      } else {
        cat(paste("✓", package_name, "already installed\n"))
      }
    } else if (source == "GitHub") {
      if (!require(package_name, character.only = TRUE, quietly = TRUE)) {
        devtools::install_github(github_repo, dependencies = TRUE)
        library(package_name, character.only = TRUE)
        cat(paste("✓", package_name, "installed successfully from GitHub\n"))
      } else {
        cat(paste("✓", package_name, "already installed\n"))
      }
    }
    return(TRUE)
  }, error = function(e) {
    cat(paste("✗ Error installing", package_name, ":", e$message, "\n"))
    return(FALSE)
  })
}

# 2. Install core packages
cat("\n=== Installing core dependencies ===\n")
core_packages <- c(
  "plumber", "jsonlite", "dplyr", "tidyr", "ggplot2", "stringr",
  "progress", "foreach", "doParallel", "scales", "gridExtra", 
  "knitr", "tibble", "rlang"
)

for (pkg in core_packages) {
  install_package_safely(pkg, "CRAN")
}

# 3. Install specialized packages
cat("\n=== Installing specialized packages ===\n")
specialized_packages <- c("gsynth", "panelView", "MarketMatching", "directlabels", "lifecycle")

for (pkg in specialized_packages) {
  install_package_safely(pkg, "CRAN")
}

# 4. Install augsynth from GitHub using devtools
cat("\n=== Installing augsynth from GitHub using devtools ===\n")
augsynth_success <- install_package_safely("augsynth", "GitHub", "ebenmichael/augsynth")

# 5. Verify installation
cat("\n=== Verifying installation ===\n")
critical_packages <- c("plumber", "jsonlite", "dplyr", "augsynth", "gsynth")
all_good <- TRUE

for (pkg in critical_packages) {
  if (require(pkg, character.only = TRUE, quietly = TRUE)) {
    cat(paste("✓", pkg, "verified\n"))
  } else {
    cat(paste("✗", pkg, "NOT AVAILABLE\n"))
    all_good <- FALSE
  }
}

if (all_good) {
  cat("\n🎉 All packages installed successfully!\n")
  cat("GeoLift API is ready to start.\n")
} else {
  cat("\n⚠️  Some packages failed to install. Check the errors above.\n")
  stop("Package installation incomplete")
}

cat("\nInstallation completed at:", Sys.time(), "\n")
