# Dockerfile for GeoLift API deployment on Render
FROM rocker/r-ver:4.3.0

# Install system dependencies for R packages and devtools
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
    libnode-dev \
    # System utilities
    wget \
    unzip \
    curl \
    ca-certificates \
    gnupg \
    # Node.js (alternative installation)
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package.json first for npm dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy package installation script and install R packages
COPY install_packages.R .

# Configure R for package installation
RUN echo 'options(repos = c(CRAN = "https://cloud.r-project.org/"))' >> /usr/local/lib/R/etc/Rprofile.site && \
    echo 'options(Ncpus = parallel::detectCores())' >> /usr/local/lib/R/etc/Rprofile.site

# Install R packages with verbose output
RUN echo "Starting R package installation..." && \
    R -e "cat('R version:', R.version.string, '\n')" && \
    R -e "cat('Available system libraries:\n'); system('pkg-config --list-all | grep -E \"(curl|ssl|xml)\"')" && \
    Rscript install_packages.R && \
    echo "R package installation completed"

# Copy the rest of the application
COPY . .

# Create marker file to skip package installation on startup
RUN touch .packages_installed

# Expose port (Render will set PORT env variable)
EXPOSE 8000

# Set environment variables
ENV R_LIBS_USER=/usr/local/lib/R/site-library
ENV HOST=0.0.0.0
ENV PORT=8000

# Start the application
CMD ["Rscript", "start_render.R"]
