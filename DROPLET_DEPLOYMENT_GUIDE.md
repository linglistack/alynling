# Step-by-Step DigitalOcean Droplet Deployment (No Docker)

## Prerequisites
- DigitalOcean account
- SSH key pair (or you can create one during droplet setup)

## Step 1: Create a DigitalOcean Droplet

1. **Log into DigitalOcean**
   - Go to https://cloud.digitalocean.com
   - Click "Create" → "Droplets"

2. **Choose Image**
   - Select **Ubuntu 22.04 (LTS) x64**

3. **Choose Size**
   - **Recommended**: Basic plan, Regular Intel with SSD
   - **$4/month**: 1 GB RAM, 1 vCPU, 25 GB SSD (sufficient for R backend)
   - **$6/month**: 2 GB RAM, 1 vCPU, 50 GB SSD (if you need more memory)

4. **Choose Region**
   - Select region closest to your users (e.g., New York, San Francisco)

5. **Authentication**
   - **Option A**: SSH Key (recommended)
     - If you have an SSH key, select it
     - If not, create one: `ssh-keygen -t rsa -b 4096 -C "your-email@example.com"`
     - Copy public key: `cat ~/.ssh/id_rsa.pub`
   - **Option B**: Password (less secure but easier)

6. **Finalize Details**
   - Hostname: `geolift-api` or any name you prefer
   - Add tags if desired
   - Click **Create Droplet**

## Step 2: Connect to Your Droplet

1. **Get Your Droplet's IP Address**
   - It will be shown in the DigitalOcean dashboard
   - Example: `164.90.XXX.XXX`

2. **SSH into Your Droplet**
   ```bash
   ssh root@YOUR_DROPLET_IP
   ```
   - Replace `YOUR_DROPLET_IP` with actual IP
   - If using password, enter it when prompted

## Step 3: Run the Setup Script

1. **Download the Setup Script**
   ```bash
   wget https://raw.githubusercontent.com/linglistack/AlynLing/main/digitalocean_droplet_setup.sh
   ```

2. **Make it Executable**
   ```bash
   chmod +x digitalocean_droplet_setup.sh
   ```

3. **Run the Setup Script**
   ```bash
   ./digitalocean_droplet_setup.sh
   ```
   
   This will:
   - Install R and all dependencies
   - Clone your repository
   - Install R packages
   - Set up the API as a system service
   - Configure Nginx as reverse proxy
   - Set up firewall

   **Note**: This process takes 10-15 minutes

## Step 4: Verify Deployment

1. **Check if Services are Running**
   ```bash
   sudo systemctl status geolift-api
   sudo systemctl status nginx
   ```

2. **Test Your API**
   - In your browser, go to: `http://YOUR_DROPLET_IP`
   - You should see a JSON response with service status

3. **Check API Endpoints**
   ```bash
   curl http://YOUR_DROPLET_IP/
   curl http://YOUR_DROPLET_IP/health
   ```

## Step 5: Update Your Frontend (if needed)

If you have a frontend that needs to connect to this API, update the API base URL:

```javascript
// In your frontend code
const API_BASE_URL = 'http://YOUR_DROPLET_IP';
```

## Step 6: Set Up Domain (Optional)

1. **Point Your Domain to Droplet**
   - In your domain registrar, create an A record pointing to your droplet IP
   - Example: `api.yourdomain.com` → `164.90.XXX.XXX`

2. **Update Nginx Configuration**
   ```bash
   sudo nano /etc/nginx/sites-available/geolift-api
   ```
   
   Change the `server_name` line:
   ```nginx
   server_name api.yourdomain.com;
   ```

3. **Reload Nginx**
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

## Useful Commands

### Check Logs
```bash
# R API logs
sudo journalctl -u geolift-api -f

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Restart Services
```bash
sudo systemctl restart geolift-api
sudo systemctl restart nginx
```

### Update Your Code
```bash
cd /home/ubuntu/AlynLing
git pull origin main
sudo systemctl restart geolift-api
```

## Troubleshooting

### If R API fails to start:
```bash
sudo journalctl -u geolift-api -n 50
```

### If you can't access the API:
```bash
sudo ufw status
sudo systemctl status nginx
```

### If packages fail to install:
```bash
cd /home/ubuntu/AlynLing
sudo Rscript install_packages.R
```

## Cost Breakdown
- **Droplet**: $4-6/month
- **Total**: $4-6/month (much cheaper than App Platform)
- **No additional Docker or container costs**

## Next Steps After Deployment
1. Test all API endpoints
2. Update any frontend applications
3. Set up SSL certificate (optional, for HTTPS)
4. Configure monitoring/backups (optional) 