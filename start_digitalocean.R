# DigitalOcean deployment startup script for GeoLift API Backend
# Optimized for DigitalOcean App Platform

cat("🚀 Starting GeoLift API Backend for DigitalOcean...\n")

# Install packages if not already available
if (!file.exists(".packages_installed")) {
  cat("📦 Installing R packages...\n")
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

# Get port from environment variable (DigitalOcean sets this automatically)
port <- Sys.getenv("PORT", unset = "8000")
port <- as.numeric(port)

# Get host (DigitalOcean requires 0.0.0.0)
host <- Sys.getenv("HOST", unset = "0.0.0.0")

cat(paste("🌐 Starting server on", host, ":", port, "\n"))

# Create and configure the plumber API
api <- plumb("api/geolift_api.R")

# Production settings for DigitalOcean
options(plumber.host = host)
options(plumber.port = port)

# Configure CORS for production
api$setSerializer(plumber::serializer_json())

# Add health check endpoint for DigitalOcean
api$handle("GET", "/", function() {
  list(
    status = "healthy",
    service = "GeoLift API Backend",
    version = "1.0.0",
    timestamp = Sys.time(),
    environment = "digitalocean",
    deployment = "backend-only"
  )
})

cat("🔧 API configured for DigitalOcean deployment\n")
cat("📊 GeoLift API endpoints:\n")
cat("  GET  /                          - Service status\n")
cat("  GET  /health                    - Health check\n") 
cat("  POST /api/data/upload           - Upload and process CSV data\n")
cat("  POST /api/market-selection      - Market selection analysis\n")
cat("  POST /api/power-analysis        - Power analysis\n")
cat("  POST /api/geolift               - Run GeoLift analysis\n")

# Start the server
cat(paste("🚀 Backend server starting on", paste0("http://", host, ":", port), "\n"))
cat("✨ GeoLift API Backend is ready for requests!\n")

api$run(host = host, port = port, debug = FALSE) 