 # Render deployment startup script for GeoLift API
# This script is optimized for Render.com deployment

cat("🚀 Starting GeoLift API for Render deployment...\n")

# Install packages if not already available
if (!file.exists(".packages_installed")) {
  cat("📦 Installing packages...\n")
  source("install_packages.R")
  
  # Create marker file to avoid reinstalling on every restart
  file.create(".packages_installed")
  cat("✅ Package installation completed\n")
} else {
  cat("📦 Packages already installed, skipping installation\n")
}

# Load required libraries
library(plumber)
library(jsonlite)
library(dplyr)

# Get port from environment variable (Render sets this automatically)
port <- Sys.getenv("PORT", unset = "8000")
port <- as.numeric(port)

# Get host (Render requires 0.0.0.0)
host <- Sys.getenv("HOST", unset = "0.0.0.0")

cat(paste("🌐 Starting server on", host, ":", port, "\n"))

# Create and configure the plumber API
api <- plumb("api/geolift_api.R")

# Production settings for Render
options(plumber.host = host)
options(plumber.port = port)

# Configure CORS for production
api$setSerializer(plumber::serializer_json())

# Add health check endpoint for Render
api$handle("GET", "/", function() {
  list(
    status = "healthy",
    service = "GeoLift API",
    version = "1.0.0",
    timestamp = Sys.time(),
    environment = "production"
  )
})

cat("🔧 API configured for production deployment\n")
cat("📊 GeoLift API endpoints:\n")
cat("  GET  /                          - Service status\n")
cat("  GET  /health                    - Health check\n") 
cat("  POST /api/data/upload           - Upload and process CSV data\n")
cat("  POST /api/market-selection      - Market selection analysis\n")
cat("  POST /api/power-analysis        - Power analysis\n")
cat("  POST /api/geolift               - Run GeoLift analysis\n")

# Start the server
cat(paste("🚀 Server starting on", paste0("http://", host, ":", port), "\n"))
cat("✨ GeoLift API is ready for requests!\n")

api$run(host = host, port = port, debug = FALSE)