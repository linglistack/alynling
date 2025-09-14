# Digital Ocean Droplet Multi-Service Setup Guide

This guide documents the complete setup of your Digital Ocean droplet running multiple API services with nginx reverse proxy and SSL termination.

## 🏗️ Current Architecture

```
Internet → nginx (443/SSL) → Multiple Backend Services
                          ├── R API (port 8000) - GeoLift Analysis
                          ├── Python RAG API (port 5000) - AI Q&A
                          └── [Future: Node.js API (port 3001)]
```

## 📋 Current Services

### 1. R API Service (GeoLift Analysis)
- **Port**: 8000
- **Service**: `geolift-api.service`
- **Path**: `/opt/alyn/api/`
- **Nginx Route**: `/` (catch-all)
- **URL**: `https://142.93.8.101.sslip.io/`

### 2. Python RAG API Service (AI Q&A)
- **Port**: 5000
- **Service**: `rag-api.service`
- **Path**: `/opt/alyn/ai/`
- **Nginx Route**: `/api/rag/`
- **URL**: `https://142.93.8.101.sslip.io/api/rag/`

## 🔧 Service Configurations

### R API Service (`/etc/systemd/system/geolift-api.service`)
```ini
[Unit]
Description=GeoLift R Plumber API
After=network-online.target
Wants=network-online.target

[Service]
WorkingDirectory=/opt/alyn
ExecStart=/usr/bin/Rscript api/start_api.R
Restart=always
RestartSec=3
StandardOutput=append:/var/log/geolift_out.log
StandardError=append:/var/log/geolift_err.log
Environment=R_LIBS_SITE=/usr/local/lib/R/site-library

[Install]
WantedBy=multi-user.target
```

### Python RAG API Service (`/etc/systemd/system/rag-api.service`)
```ini
[Unit]
Description=Python RAG API Server
After=network-online.target
Wants=network-online.target

[Service]
WorkingDirectory=/opt/alyn/ai
ExecStartPre=/bin/bash -c 'source /opt/alyn/ai/rag_env/bin/activate && which python'
ExecStart=/opt/alyn/ai/rag_env/bin/python hybrid_rag_api.py
Restart=always
RestartSec=3
StandardOutput=append:/var/log/rag_out.log
StandardError=append:/var/log/rag_err.log
Environment=PYTHONPATH=/opt/alyn/ai
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
```

## 🌐 Nginx Configuration

### Main Config (`/etc/nginx/sites-available/geolift.conf`)
```nginx
server {
  server_name 142.93.8.101.sslip.io;
  client_max_body_size 50m;

  # Python RAG API - must come BEFORE the catch-all location /
  location /api/rag/ {
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_pass http://127.0.0.1:5000/;
    proxy_read_timeout 300;
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
  }

  # Future Node.js API example
  # location /api/node/ {
  #   proxy_set_header Host $host;
  #   proxy_set_header X-Real-IP $remote_addr;
  #   proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  #   proxy_set_header X-Forwarded-Proto $scheme;
  #   proxy_pass http://127.0.0.1:3001/;
  #   proxy_read_timeout 300;
  # }

  # R API - catch-all location (must come AFTER specific locations)
  location / {
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_pass http://127.0.0.1:8000;
    proxy_read_timeout 300;
  }

  listen 443 ssl; # managed by Certbot
  ssl_certificate /etc/letsencrypt/live/142.93.8.101.sslip.io/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/142.93.8.101.sslip.io/privkey.pem;
  include /etc/letsencrypt/options-ssl-nginx.conf;
  ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

server {
  if ($host = 142.93.8.101.sslip.io) {
    return 301 https://$host$request_uri;
  }
  listen 80;
  server_name 142.93.8.101.sslip.io;
  return 404;
}
```

## 🚀 Adding a New Service (e.g., Node.js API)

### Step 1: Create the Service
1. **Prepare your application**:
   ```bash
   # Example for Node.js
   mkdir -p /opt/alyn/node-api
   cd /opt/alyn/node-api
   # Deploy your Node.js application here
   npm install
   ```

2. **Create systemd service file**:
   ```bash
   sudo tee /etc/systemd/system/node-api.service >/dev/null <<'EOF'
   [Unit]
   Description=Node.js API Server
   After=network-online.target
   Wants=network-online.target

   [Service]
   WorkingDirectory=/opt/alyn/node-api
   ExecStart=/usr/bin/node server.js
   Restart=always
   RestartSec=3
   StandardOutput=append:/var/log/node_out.log
   StandardError=append:/var/log/node_err.log
   Environment=NODE_ENV=production
   Environment=PORT=3001

   [Install]
   WantedBy=multi-user.target
   EOF
   ```

### Step 2: Add Nginx Location Block
1. **Edit nginx config**:
   ```bash
   sudo nano /etc/nginx/sites-available/geolift.conf
   ```

2. **Add location block** (BEFORE the catch-all `/` location):
   ```nginx
   # Node.js API
   location /api/node/ {
     proxy_set_header Host $host;
     proxy_set_header X-Real-IP $remote_addr;
     proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
     proxy_set_header X-Forwarded-Proto $scheme;
     proxy_pass http://127.0.0.1:3001/;
     proxy_read_timeout 300;
   }
   ```

### Step 3: Enable and Test
```bash
# Enable and start the service
sudo systemctl daemon-reload
sudo systemctl enable --now node-api

# Test nginx config and reload
sudo nginx -t
sudo systemctl reload nginx

# Test the service
curl https://142.93.8.101.sslip.io/api/node/health
```

## 🔄 Updating and Rebuilding Services

### R API Updates
```bash
# Stop the service
sudo systemctl stop geolift-api

# Update your R code in /opt/alyn/api/
cd /opt/alyn
git pull  # if using git
# or manually update files

# Restart the service
sudo systemctl start geolift-api
sudo systemctl status geolift-api --no-pager

# Check logs if needed
sudo tail -f /var/log/geolift_out.log
```

### Python RAG API Updates
```bash
# Stop the service
sudo systemctl stop rag-api

# Update your Python code
cd /opt/alyn/ai
git pull  # if using git

# Update dependencies if needed
source rag_env/bin/activate
pip install -r requirements.txt

# Rebuild vector store if needed
python RAG/build_index.py

# Restart the service
sudo systemctl start rag-api
sudo systemctl status rag-api --no-pager

# Check logs
sudo tail -f /var/log/rag_out.log
```

### Node.js API Updates (Future)
```bash
# Stop the service
sudo systemctl stop node-api

# Update code
cd /opt/alyn/node-api
git pull
npm install  # update dependencies

# Restart the service
sudo systemctl start node-api
sudo systemctl status node-api --no-pager
```

## 📊 Service Management Commands

### Universal Commands (replace `SERVICE` with actual service name)
```bash
# Start/Stop/Restart
sudo systemctl start SERVICE
sudo systemctl stop SERVICE
sudo systemctl restart SERVICE

# Enable/Disable auto-start
sudo systemctl enable SERVICE
sudo systemctl disable SERVICE

# Check status
sudo systemctl status SERVICE --no-pager

# View logs
sudo journalctl -u SERVICE -f
# or
sudo tail -f /var/log/SERVICE_out.log
```

### Current Services
- `geolift-api` - R API
- `rag-api` - Python RAG API
- `nginx` - Web server

### Quick Status Check
```bash
# Check all services
sudo systemctl status geolift-api rag-api nginx --no-pager

# Check listening ports
sudo netstat -tlnp | grep -E ":(80|443|8000|5000|3001)"

# Test all endpoints
curl https://142.93.8.101.sslip.io/health  # R API
curl https://142.93.8.101.sslip.io/api/rag/health  # Python RAG API
```

## 🐛 Troubleshooting

### Common Issues

1. **Service won't start**:
   ```bash
   sudo systemctl status SERVICE --no-pager
   sudo journalctl -u SERVICE -n 50
   ```

2. **Nginx 404 errors**:
   ```bash
   # Check nginx config syntax
   sudo nginx -t
   
   # Check nginx error logs
   sudo tail -f /var/log/nginx/error.log
   
   # Verify location block order (specific locations BEFORE catch-all)
   sudo cat /etc/nginx/sites-available/geolift.conf
   ```

3. **SSL certificate issues**:
   ```bash
   # Renew certificates
   sudo certbot renew
   sudo systemctl reload nginx
   ```

4. **Port conflicts**:
   ```bash
   # Check what's using a port
   sudo netstat -tlnp | grep :PORT
   sudo ss -tlnp | grep :PORT
   ```

### Log Locations
- **R API**: `/var/log/geolift_out.log`, `/var/log/geolift_err.log`
- **Python RAG API**: `/var/log/rag_out.log`, `/var/log/rag_err.log`
- **Nginx**: `/var/log/nginx/access.log`, `/var/log/nginx/error.log`
- **Systemd**: `sudo journalctl -u SERVICE_NAME`

## 🔒 Security Notes

1. **Firewall**: Ensure only ports 80, 443, and 22 (SSH) are open externally
2. **SSL**: Certificates auto-renew via certbot
3. **User permissions**: Consider running services as non-root user
4. **Environment variables**: Store sensitive data in `.env` files or systemd environment

## 📁 Directory Structure
```
/opt/alyn/
├── api/                    # R API code
│   ├── start_api.R
│   └── ...
├── ai/                     # Python RAG API
│   ├── hybrid_rag_api.py
│   ├── rag_env/           # Python virtual environment
│   └── ...
└── node-api/              # Future Node.js API
    ├── server.js
    └── ...
```

## 🔄 Backup and Recovery

### Important Files to Backup
- `/etc/nginx/sites-available/geolift.conf`
- `/etc/systemd/system/*.service`
- `/opt/alyn/` (entire application directory)
- SSL certificates: `/etc/letsencrypt/`

### Recovery Steps
1. Restore application files to `/opt/alyn/`
2. Restore systemd service files
3. Restore nginx configuration
4. Reload systemd and nginx:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable geolift-api rag-api
   sudo systemctl start geolift-api rag-api
   sudo nginx -t && sudo systemctl reload nginx
   ```

---

**Last Updated**: $(date)
**Droplet IP**: 142.93.8.101
**Domain**: 142.93.8.101.sslip.io
