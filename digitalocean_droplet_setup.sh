#!/bin/bash
# DigitalOcean Droplet Setup Script - No Docker Required
# Run this on a fresh Ubuntu 22.04 Droplet

echo "🚀 Setting up GeoLift R Backend on DigitalOcean Droplet..."

# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install R
echo "📦 Installing R..."
sudo apt-get install -y software-properties-common dirmngr
wget -qO- https://cloud.r-project.org/bin/linux/ubuntu/marutter_pubkey.asc | sudo tee -a /etc/apt/trusted.gpg.d/cran_ubuntu_key.asc
sudo add-apt-repository "deb https://cloud.r-project.org/bin/linux/ubuntu $(lsb_release -cs)-cran40/"
sudo apt-get update
sudo apt-get install -y r-base r-base-dev

# Install system dependencies for R packages
echo "🔧 Installing system dependencies..."
sudo apt-get install -y \
    build-essential \
    libcurl4-openssl-dev \
    libssl-dev \
    libxml2-dev \
    libfontconfig1-dev \
    libcairo2-dev \
    libxt-dev \
    libfreetype6-dev \
    libpng-dev \
    libtiff5-dev \
    libjpeg-dev \
    libharfbuzz-dev \
    libfribidi-dev \
    libblas-dev \
    liblapack-dev \
    libgdal-dev \
    libproj-dev \
    libgeos-dev \
    libudunits2-dev \
    git \
    nginx

# Clone your repository
echo "📥 Cloning repository..."
cd /home/ubuntu
git clone https://github.com/linglistack/AlynLing.git
cd AlynLing

# Install R packages (excluding devtools and augsynth for now)
echo "📦 Installing R packages (excluding devtools and augsynth)..."
sudo Rscript -e "
options(repos = c(CRAN = 'https://cloud.r-project.org/'))
options(Ncpus = parallel::detectCores())

# Core packages needed for the API
core_packages <- c(
  'plumber', 'jsonlite', 'dplyr', 'tidyr', 'ggplot2', 'stringr',
  'progress', 'foreach', 'doParallel', 'scales', 'gridExtra', 
  'knitr', 'tibble', 'rlang'
)

# Specialized packages
specialized_packages <- c('gsynth', 'panelView', 'MarketMatching', 'directlabels', 'lifecycle')

cat('Installing core packages...\n')
for (pkg in core_packages) {
  if (!require(pkg, character.only = TRUE, quietly = TRUE)) {
    install.packages(pkg, dependencies = TRUE)
    cat(paste('✓', pkg, 'installed\n'))
  } else {
    cat(paste('✓', pkg, 'already installed\n'))
  }
}

cat('Installing specialized packages...\n')
for (pkg in specialized_packages) {
  if (!require(pkg, character.only = TRUE, quietly = TRUE)) {
    install.packages(pkg, dependencies = TRUE)
    cat(paste('✓', pkg, 'installed\n'))
  } else {
    cat(paste('✓', pkg, 'already installed\n'))
  }
}

cat('Basic R package installation completed!\n')
"

# Create systemd service for R API
echo "⚙️ Creating systemd service..."
sudo tee /etc/systemd/system/geolift-api.service > /dev/null <<EOF
[Unit]
Description=GeoLift R API Backend
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/AlynLing
ExecStart=/usr/bin/Rscript start_digitalocean.R
Restart=always
RestartSec=10
Environment=PORT=8000
Environment=HOST=0.0.0.0

[Install]
WantedBy=multi-user.target
EOF

# Configure Nginx as reverse proxy
echo "🌐 Configuring Nginx..."
sudo tee /etc/nginx/sites-available/geolift-api > /dev/null <<EOF
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/geolift-api /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t

# Start services
echo "🚀 Starting services..."
sudo systemctl daemon-reload
sudo systemctl enable geolift-api
sudo systemctl start geolift-api
sudo systemctl enable nginx
sudo systemctl restart nginx

# Configure firewall
echo "🔒 Configuring firewall..."
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

echo "✅ Setup complete!"
echo "🌐 Your R API is now running at your droplet's IP address"
echo "📊 Check status with: sudo systemctl status geolift-api"
echo "📋 View logs with: sudo journalctl -u geolift-api -f" 