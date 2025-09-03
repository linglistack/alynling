# 🚀 Deploy Python RAG Server to DigitalOcean Droplet

## 📋 Prerequisites
- Your R server is already running on the droplet
- You have SSH access to your droplet
- Your droplet has sufficient resources (RAM/CPU) for both servers

## 🎯 Step-by-Step Deployment Guide

### Step 1: Connect to Your Droplet
```bash
ssh root@your-droplet-ip
# or
ssh your-username@your-droplet-ip
```

### Step 2: Navigate and Create Python Project Directory
```bash
# Create a directory for your Python RAG server
mkdir -p /opt/python-rag-server
cd /opt/python-rag-server

# Or if you prefer home directory:
# mkdir -p ~/python-rag-server
# cd ~/python-rag-server
```

### Step 3: Upload Your Python Project Files
**Option A: Using SCP (from your local machine)**
```bash
# Upload the entire ai folder
scp -r /Users/gantz/Desktop/AlynLing/ai root@your-droplet-ip:/opt/python-rag-server/

# Upload specific files if needed
scp /Users/gantz/Desktop/AlynLing/ai/hybrid_rag_api.py root@your-droplet-ip:/opt/python-rag-server/
scp /Users/gantz/Desktop/AlynLing/ai/requirements.txt root@your-droplet-ip:/opt/python-rag-server/
```

**Option B: Using Git (if you have a repo)**
```bash
git clone https://github.com/your-username/your-repo.git .
# or pull latest changes if already cloned
```

### Step 4: Install Python and Dependencies
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Python 3.10+ and pip
sudo apt install python3 python3-pip python3-venv -y

# Verify Python version
python3 --version  # Should be 3.8+ for your dependencies

# Install system dependencies for some Python packages
sudo apt install build-essential python3-dev -y
```

### Step 5: Create Python Virtual Environment
```bash
cd /opt/python-rag-server/ai  # or wherever your ai folder is

# Create virtual environment
python3 -m venv rag_env

# Activate virtual environment
source rag_env/bin/activate

# Verify you're in the virtual environment
which python  # Should show path with rag_env
```

### Step 6: Install Python Requirements
```bash
# Make sure you're in the virtual environment
source rag_env/bin/activate

# Install requirements
pip install --upgrade pip
pip install -r requirements.txt

# If you get errors, install problematic packages individually:
pip install fastapi uvicorn
pip install langchain langchain-community
pip install sentence-transformers
pip install accelerate
pip install faiss-cpu  # or faiss-gpu if you have GPU
pip install google-generativeai
pip install python-dotenv
pip install pydantic
pip install PyYAML
```

### Step 7: Set Up Environment Variables
```bash
# Create .env file
nano .env

# Add your environment variables:
GEMINI_API_KEY=your_actual_gemini_api_key_here
OPENAI_API_KEY=your_openai_key_if_needed

# Save and exit (Ctrl+X, Y, Enter in nano)

# Make sure .env file has correct permissions
chmod 600 .env
```

### Step 8: Build RAG Documents and Vector Store
```bash
# Make sure you're in the right directory and virtual environment
cd /opt/python-rag-server/ai
source rag_env/bin/activate

# Build the database from JSON files
python Database_SQL/create_manage_db.py

# Build the FAISS vector store
python RAG/build_index.py

# Verify the vector store was created
ls -la RAG/store/
# Should see index.faiss and index.pkl files
```

### Step 9: Test the Server Locally
```bash
# Test that everything works
python hybrid_rag_api.py

# In another terminal, test the API:
curl -X GET "http://localhost:8001/health"
curl -X POST "http://localhost:8001/ask" -H "Content-Type: application/json" -d '{"query": "What is holdout?"}'

# Stop the test server (Ctrl+C)
```

### Step 10: Configure Firewall (if needed)
```bash
# Check current firewall status
sudo ufw status

# Allow port 8001 for your Python API
sudo ufw allow 8001

# If you want to change the port, edit hybrid_rag_api.py:
# Change: uvicorn.run(app, host="0.0.0.0", port=8001)
# To:     uvicorn.run(app, host="0.0.0.0", port=5000)  # or your preferred port
```

### Step 11: Create Systemd Service for Auto-Start
```bash
# Create service file
sudo nano /etc/systemd/system/python-rag-server.service

# Add the following content:
```

```ini
[Unit]
Description=Python RAG API Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/python-rag-server/ai
Environment=PATH=/opt/python-rag-server/ai/rag_env/bin
ExecStart=/opt/python-rag-server/ai/rag_env/bin/python hybrid_rag_api.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### Step 12: Start and Enable the Service
```bash
# Reload systemd to recognize new service
sudo systemctl daemon-reload

# Start the service
sudo systemctl start python-rag-server

# Enable auto-start on boot
sudo systemctl enable python-rag-server

# Check service status
sudo systemctl status python-rag-server

# View logs if needed
sudo journalctl -u python-rag-server -f
```

### Step 13: Update Frontend Configuration
Update your frontend to point to your droplet:

```javascript
// In src/utils/ragAPI.js
const RAG_API_BASE_URL = process.env.REACT_APP_RAG_API_URL || 'http://your-droplet-ip:8001';
```

Or set environment variable:
```bash
# In your frontend .env file
REACT_APP_RAG_API_URL=http://your-droplet-ip:8001
```

### Step 14: Set Up Nginx Reverse Proxy (Optional but Recommended)
```bash
# Install nginx if not already installed
sudo apt install nginx -y

# Create nginx configuration
sudo nano /etc/nginx/sites-available/python-rag-api

# Add configuration:
```

```nginx
server {
    listen 80;
    server_name your-domain.com;  # or your droplet IP

    location /api/rag/ {
        proxy_pass http://localhost:8001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/python-rag-api /etc/nginx/sites-enabled/

# Test nginx configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

## 🔧 **Useful Management Commands**

### Service Management
```bash
# Check service status
sudo systemctl status python-rag-server

# Start/stop/restart service
sudo systemctl start python-rag-server
sudo systemctl stop python-rag-server
sudo systemctl restart python-rag-server

# View logs
sudo journalctl -u python-rag-server -f
sudo journalctl -u python-rag-server --since "1 hour ago"
```

### Manual Server Management
```bash
# Activate environment and run manually
cd /opt/python-rag-server/ai
source rag_env/bin/activate
python hybrid_rag_api.py

# Run in background
nohup python hybrid_rag_api.py > server.log 2>&1 &

# Find and kill process
ps aux | grep hybrid_rag_api
kill PID_NUMBER
```

### Update RAG Data
```bash
cd /opt/python-rag-server/ai
source rag_env/bin/activate

# Rebuild database and vector store
python Database_SQL/create_manage_db.py
python RAG/build_index.py

# Restart service to load new data
sudo systemctl restart python-rag-server
```

## 🚨 **Troubleshooting**

### Common Issues:

1. **Port conflicts**: Change port in `hybrid_rag_api.py` if 8001 is in use
2. **Memory issues**: Ensure droplet has enough RAM for both R and Python servers
3. **Permission issues**: Make sure files have correct ownership and permissions
4. **Environment variables**: Verify `.env` file is in the correct location
5. **Dependencies**: Some packages might need system libraries

### Check Resources:
```bash
# Check memory usage
free -h
htop

# Check disk space
df -h

# Check running processes
ps aux | grep -E "(R|python)"
```

## ✅ **Verification Steps**

1. **Health Check**: `curl http://your-droplet-ip:8001/health`
2. **API Test**: `curl -X POST "http://your-droplet-ip:8001/ask" -H "Content-Type: application/json" -d '{"query": "test"}'`
3. **Service Status**: `sudo systemctl status python-rag-server`
4. **Logs Check**: `sudo journalctl -u python-rag-server -n 50`

## 🎉 **Result**

Your Python RAG server will be running alongside your R server on your DigitalOcean droplet with:
- ✅ Auto-start on boot
- ✅ Auto-restart on crashes  
- ✅ Proper logging
- ✅ Environment isolation
- ✅ Production-ready setup

Your frontend can now connect to `http://your-droplet-ip:8001` for RAG functionality! 🚀
