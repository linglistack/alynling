# Dockerfile for R Backend API deployment on DigitalOcean
FROM rocker/r-ver:4.3.0

# Install system dependencies for R packages only
RUN apt-get update && apt-get install -y \
    # Essential build tools
    build-essential \
    gcc \
    g++ \
    gfortran \
    make \
    cmake \
    # Git for devtools
    git \
    # Curl and SSL libraries
    libcurl4-openssl-dev \
    libssl-dev \
    # XML libraries
    libxml2-dev \
    # Graphics and fonts
    libfontconfig1-dev \
    libcairo2-dev \
    libxt-dev \
    libfreetype6-dev \
    libpng-dev \
    libtiff5-dev \
    libjpeg-dev \
    # HarfBuzz and text rendering dependencies
    libharfbuzz-dev \
    libfribidi-dev \
    # Additional graphics dependencies
    libpoppler-cpp-dev \
    librsvg2-dev \
    libmagick++-dev \
    # Math libraries
    libblas-dev \
    liblapack-dev \
    libatlas-base-dev \
    # Additional dependencies for R packages
    libgdal-dev \
    libproj-dev \
    libgeos-dev \
    libudunits2-dev \
    # System utilities
    wget \
    unzip \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy R package installation script
COPY install_packages.R .

# Configure R for package installation
RUN echo 'options(repos = c(CRAN = "https://cloud.r-project.org/"))' >> /usr/local/lib/R/etc/Rprofile.site && \
    echo 'options(Ncpus = parallel::detectCores())' >> /usr/local/lib/R/etc/Rprofile.site

# Install R packages
RUN echo "Installing R packages..." && \
    Rscript install_packages.R && \
    echo "R package installation completed"

# Copy only backend files
COPY api/ ./api/
COPY R/ ./R/
COPY start_digitalocean.R .
COPY public/us_city_revenue_data*.csv ./public/

# Create marker file to skip package installation on startup
RUN touch .packages_installed

# Expose port for DigitalOcean
EXPOSE 8000

# Set environment variables
ENV R_LIBS_USER=/usr/local/lib/R/site-library
ENV HOST=0.0.0.0
ENV PORT=8000

# Start the R API server
CMD ["Rscript", "start_digitalocean.R"] 