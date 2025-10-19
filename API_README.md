# GeoLift API Documentation

This project provides a RESTful API for GeoLift analysis using R Plumber, allowing your React frontend to leverage all GeoLift functionality without modifying the original R functions.

## Quick Start

### 1. Install Dependencies
```bash
# Install R packages
Rscript api/install_packages.R

# Install Node.js packages
npm install
```

### 2. Start Development Environment
```bash
# Start both R API and React frontend
npm run dev
```

### 3. Test the API
```bash
# Health check
curl http://localhost:8000/health
```

## API Endpoints

### Data Upload
```
POST /api/data/upload
Content-Type: application/json

{
  "csv_data": "location,time,Y\nchicago,1,100\n...",
  "location_col": "location",
  "time_col": "time",
  "outcome_col": "Y"
}
```

### Market Selection
```
POST /api/market-selection

{
  "data": {...},
  "treatment_periods": 14,
  "effect_size": 0.3
}
```

### Power Analysis
```
POST /api/power-analysis

{
  "data": {...},
  "locations": ["chicago", "portland"],
  "treatment_periods": 14
}
```

### GeoLift Analysis
```
POST /api/geolift

{
  "data": {...},
  "locations": ["chicago", "portland"],
  "treatment_start_time": 76,
  "treatment_end_time": 90
}
```

## Frontend Usage

```javascript
import { geoliftAPI } from '../utils/geoliftAPI';

// Upload data
const result = await geoliftAPI.uploadData(csvData);

// Run analysis
const analysis = await geoliftAPI.runGeoLift(
  data,
  ['chicago', 'portland'],
  76, 90
);
```

## Files Created

- `api/geolift_api.R` - Main Plumber API server
- `api/start_api.R` - API startup script
- `api/install_packages.R` - Package installation script
- `src/utils/geoliftAPI.js` - Frontend API client
- Updated `package.json` with new scripts

## Architecture

Your existing R functions in the `R/` directory remain completely unchanged. The API simply exposes them through REST endpoints that your React frontend can call.

**Plumber is the better choice** because:
- ✅ No need to rewrite R logic
- ✅ Direct access to GeoLift functions
- ✅ Simpler maintenance
- ✅ Native R package support
- ✅ Better performance for statistical computations

Your GeoLift functionality is now available as a modern REST API!
