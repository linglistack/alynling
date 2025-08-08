# Start the GeoLift API server for LOCAL DEVELOPMENT
library(plumber)
library(dplyr)

# Check if required packages are installed
required_packages <- c("plumber", "jsonlite", "dplyr", "augsynth", "tidyr")
missing_packages <- required_packages[!sapply(required_packages, require, quietly = TRUE, character.only = TRUE)]

if (length(missing_packages) > 0) {
  cat("Missing packages detected. Run this command first:\n")
  cat("Rscript install_packages.R\n")
  stop(paste("Missing packages:", paste(missing_packages, collapse = ", ")))
}

# Dynamic path detection (no hardcoded paths!)
if (file.exists("api/geolift_api.R")) {
  # Running from project root
  api_path <- "api/geolift_api.R"
} else if (file.exists("geolift_api.R")) {
  # Running from api directory  
  api_path <- "geolift_api.R"
} else {
  stop("Cannot find geolift_api.R. Please run from project root or api directory.")
}

# Create and start the API
pr <- plumb(api_path)

# Start the server
cat("🚀 Starting GeoLift API server for LOCAL DEVELOPMENT\n")
cat("📍 Server: http://localhost:8000\n")
cat("📊 API endpoints available:\n")
cat("  GET  /health                    - Health check\n")
cat("  POST /api/data/upload           - Upload and process CSV data\n")
cat("  POST /api/market-selection      - Market selection analysis\n")
cat("  POST /api/power-analysis        - Power analysis\n")
cat("  POST /api/geolift               - Run GeoLift analysis\n")
cat("\n✨ API is ready to receive requests from frontend...\n")

pr$run(host = "0.0.0.0", port = 8000)
