# Comprehensive package installation for GeoLift API with proper dependency handling
cat("Starting R package installation for GeoLift API...\n")

# Set CRAN mirror and options
options(repos = c(CRAN = "https://cloud.r-project.org/"))
options(Ncpus = parallel::detectCores())

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
        if (!require("remotes", character.only = TRUE, quietly = TRUE)) {
          install.packages("remotes", dependencies = TRUE)
        }
        remotes::install_github(github_repo, dependencies = TRUE)
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

# 1. Install system-level graphics dependencies first
cat("\n=== Installing graphics and system dependencies ===\n")
graphics_packages <- c("systemfonts", "textshaping")

for (pkg in graphics_packages) {
  install_package_safely(pkg, "CRAN")
}

# 2. Install ragg (graphics rendering)
cat("\n=== Installing ragg (graphics) ===\n")
install_package_safely("ragg", "CRAN")

# 3. Install lightweight remote installer first
cat("\n=== Installing remotes (lightweight GitHub installer) ===\n")
install_package_safely("remotes", "CRAN")

# 4. Install core packages
cat("\n=== Installing core dependencies ===\n")
core_packages <- c(
  "plumber", "jsonlite", "dplyr", "tidyr", "ggplot2", "stringr",
  "progress", "foreach", "doParallel", "scales", "gridExtra", 
  "knitr", "tibble", "rlang"
)

for (pkg in core_packages) {
  install_package_safely(pkg, "CRAN")
}

# 5. Install specialized packages
cat("\n=== Installing specialized packages ===\n")
specialized_packages <- c("gsynth", "panelView", "MarketMatching", "directlabels", "lifecycle", "GeneCycle", "forecast")

for (pkg in specialized_packages) {
  install_package_safely(pkg, "CRAN")
}

# 6. Try to install pkgdown (optional for devtools)
cat("\n=== Installing pkgdown (optional) ===\n")
pkgdown_success <- install_package_safely("pkgdown", "CRAN")

# 7. Install devtools with minimal dependencies if pkgdown fails
cat("\n=== Installing devtools ===\n")
if (pkgdown_success) {
  devtools_success <- install_package_safely("devtools", "CRAN")
} else {
  cat("pkgdown failed, trying devtools with minimal dependencies...\n")
  tryCatch({
    install.packages("devtools", dependencies = c("Depends", "Imports"))
    devtools_success <- require("devtools", character.only = TRUE, quietly = TRUE)
    if (devtools_success) {
      cat("✓ devtools installed with minimal dependencies\n")
    }
  }, error = function(e) {
    cat("✗ devtools installation failed:", e$message, "\n")
    devtools_success <- FALSE
  })
}

# 8. Install augsynth from GitHub
cat("\n=== Installing augsynth from GitHub ===\n")
if (require("remotes", character.only = TRUE, quietly = TRUE)) {
  augsynth_success <- install_package_safely("augsynth", "GitHub", "ebenmichael/augsynth")
} else if (require("devtools", character.only = TRUE, quietly = TRUE)) {
  cat("Using devtools for augsynth installation...\n")
  tryCatch({
    devtools::install_github("ebenmichael/augsynth", dependencies = TRUE)
    augsynth_success <- require("augsynth", character.only = TRUE, quietly = TRUE)
    if (augsynth_success) {
      cat("✓ augsynth installed from GitHub using devtools\n")
    }
  }, error = function(e) {
    cat("✗ augsynth installation failed:", e$message, "\n")
    augsynth_success <- FALSE
  })
} else {
  cat("⚠️  Neither remotes nor devtools available, skipping augsynth\n")
  augsynth_success <- FALSE
}
# 8-5. Install GeoLift from GitHub
cat("\n=== Installing GeoLift from GitHub ===\n")

# Ensure prerequisites: remotes and augsynth
if (!require("remotes", character.only = TRUE, quietly = TRUE) &&
    !require("devtools", character.only = TRUE, quietly = TRUE)) {
  cat("⚠️  Neither remotes nor devtools available — cannot install GeoLift\n")
  geolift_success <- FALSE
} else if (!require("augsynth", character.only = TRUE, quietly = TRUE)) {
  cat("⚠️  Dependency 'augsynth' not found — please install it first\n")
  geolift_success <- FALSE
} else {
  # Proceed with installation
  tryCatch({
    if (require("remotes", character.only = TRUE, quietly = TRUE)) {
      remotes::install_github("facebookincubator/GeoLift", dependencies = TRUE, upgrade = "never")
    } else {
      devtools::install_github("facebookincubator/GeoLift", dependencies = TRUE, upgrade = "never")
    }
    geolift_success <- require("GeoLift", character.only = TRUE, quietly = TRUE)
    if (geolift_success) {
      cat("✓ GeoLift installed successfully from GitHub\n")
    } else {
      cat("✗ GeoLift installation completed but package not loadable\n")
    }
  }, error = function(e) {
    cat("✗ GeoLift installation failed:", e$message, "\n")
    geolift_success <- FALSE
  })
}


# 9. Verification
cat("\n=== Verifying installation ===\n")
critical_packages <- c("plumber", "jsonlite", "dplyr", "gsynth", "GeneCycle", "forecast", "augsynth", "GeoLift")
optional_packages <- c("devtools", "ragg")

all_critical_ok <- TRUE
optional_count <- 0

cat("Critical packages:\n")
for (pkg in critical_packages) {
  if (require(pkg, character.only = TRUE, quietly = TRUE)) {
    cat(paste("✓", pkg, "verified\n"))
  } else {
    cat(paste("✗", pkg, "NOT AVAILABLE\n"))
    all_critical_ok <- FALSE
  }
}

cat("\nOptional packages:\n")
for (pkg in optional_packages) {
  if (require(pkg, character.only = TRUE, quietly = TRUE)) {
    cat(paste("✓", pkg, "verified\n"))
    optional_count <- optional_count + 1
  } else {
    cat(paste("○", pkg, "not available (optional)\n"))
  }
}

# Final status
cat("\n=== Installation Summary ===\n")
if (all_critical_ok) {
  cat("🎉 All critical packages installed successfully!\n")
  cat(paste("✓ Optional packages installed:", optional_count, "/", length(optional_packages), "\n"))
  cat("GeoLift API is ready to start.\n")
  
  if (optional_count < length(optional_packages)) {
    cat("\n📝 Note: Some optional packages failed to install.\n")
    cat("The API will work, but some advanced features may be limited.\n")
  }
} else {
  cat("⚠️  Some critical packages failed to install. Check the errors above.\n")
  cat("The API may not work properly.\n")
}

cat("\nInstallation completed at:", Sys.time(), "\n")
