# DigitalOcean Deployment Guide - R Backend Only

This guide helps you deploy only the R backend API to DigitalOcean App Platform, avoiding the need for Docker system dependencies on your local machine.

## What This Deploys

- **R Backend API Only**: The GeoLift analysis API server
- **No Frontend**: React frontend is excluded to save resources
- **Container Size**: Optimized for single container deployment

## DigitalOcean Pricing Options

Based on your requirements:

### Option 1: Basic XXS (Recommended)
- **vCPU**: 1 Shared
- **Memory**: 512 MB RAM  
- **Containers**: 1
- **Cost**: $5.00/mo
- **Perfect for**: R backend only

### Option 2: Basic XS (If you need more memory)
- **vCPU**: 1 Shared
- **Memory**: 1 GB RAM
- **Containers**: 1
- **Cost**: Higher than $5/mo

## Deployment Steps

### 1. Push Changes to GitHub
```bash
git add .
git commit -m "Add DigitalOcean backend deployment configuration"
git push origin main
```

### 2. Deploy to DigitalOcean

#### Option A: Using DigitalOcean CLI (doctl)
```bash
doctl apps create --spec .do/app.yaml
```

#### Option B: Using DigitalOcean Web Interface
1. Go to [DigitalOcean Apps](https://cloud.digitalocean.com/apps)
2. Click "Create App"
3. Choose "GitHub" as source
4. Select repository: `linglistack/alynling`
5. Choose branch: `main`
6. **Important**: Set Dockerfile path to `Dockerfile.backend`
7. Configure:
   - **Name**: `geolift-api`
   - **Plan**: Basic XXS ($5/mo)
   - **Port**: 8000
   - **Health Check**: `/health`

### 3. Environment Variables
These are automatically set, but verify:
- `HOST=0.0.0.0`
- `PORT=8000`
- `R_LIBS_USER=/usr/local/lib/R/site-library`

## What's Excluded

The following files are excluded from the Docker build to reduce size:
- Frontend files (`src/`, `package.json`, `node_modules/`)
- Development files (logs, test files)
- Documentation files
- Render deployment configs

## API Endpoints

Once deployed, your backend will be available at:
```
https://your-app-name.ondigitalocean.app
```

Available endpoints:
- `GET /` - Service status
- `GET /health` - Health check
- `POST /api/data/upload` - Upload CSV data
- `POST /api/market-selection` - Market selection analysis
- `POST /api/power-analysis` - Power analysis
- `POST /api/geolift` - Run GeoLift analysis

## Frontend Configuration

If you deploy a frontend separately, update the API base URL to point to your DigitalOcean backend:

```javascript
// In your frontend code
const API_BASE_URL = 'https://your-app-name.ondigitalocean.app';
```

## Monitoring

- Monitor app status in DigitalOcean dashboard
- Check logs via: `doctl apps logs <app-id>`
- Health check available at: `/health`

## Troubleshooting

### Build Failures
- Check that `Dockerfile.backend` is being used
- Ensure R package dependencies are properly specified
- Monitor build logs in DigitalOcean dashboard

### Memory Issues
- If 512MB is insufficient, upgrade to Basic XS (1GB)
- Monitor memory usage in app metrics

### Connection Issues
- Verify health check endpoint is responding
- Check environment variables are set correctly
- Ensure CORS is properly configured for your frontend domain 