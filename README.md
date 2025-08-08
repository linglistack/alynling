# Alyn - Experiment Management Platform

This is a React-based experiment management platform with a modern user interface and complete functionality.

## Features

- 🎨 Modern deep purple gradient sidebar design
- 📊 Experiment data table display
- 📱 Responsive design
- ⚡ Interactive components

## Tech Stack

### Frontend
- React 18
- Lucide React (Icon Library)
- CSS3 (Modern Styling)

### Backend
- R (Statistical Computing)
- Plumber (R API Framework)
- augsynth (Synthetic Control Methods)
- dplyr, tidyr (Data Manipulation)
- Various GeoLift analysis packages

## Quick Start

### Install Dependencies

```bash
npm install
```

### Start Development Server

```bash
npm start
```

The application will start at [http://localhost:3000](http://localhost:3000).

### Build for Production

```bash
npm run build
```

## R Backend Setup

The application includes a complete R backend API for GeoLift analysis. Follow these steps to set up and run the R server:

### Prerequisites

Ensure you have R installed on your system. You can download it from [https://cran.r-project.org/](https://cran.r-project.org/).

### Install Required R Packages

1. **Install devtools** (required for GitHub package installation):
```r
install.packages("devtools")
```

2. **Install augsynth from GitHub** (not available on CRAN):
```r
library(devtools)
devtools::install_github("ebenmichael/augsynth")
```

3. **Install all other required packages**:
Run the package installation script:
```bash
Rscript api/install_packages.R
```

This will automatically install all required packages including:
- plumber (API framework)
- jsonlite (JSON handling)  
- dplyr (data manipulation)
- tidyr (data tidying)
- augsynth (synthetic control methods)
- And many other dependencies

### Start the R API Server

Once all packages are installed, start the API server:

```bash
Rscript api/start_api.R
```

The server will start on [http://localhost:8000](http://localhost:8000) and display:
```
Starting GeoLift API server on http://localhost:8000
API endpoints available:
  GET  /health                    - Health check
  POST /api/data/upload           - Upload and process CSV data
  POST /api/market-selection      - Market selection analysis
  POST /api/power-analysis        - Power analysis
  POST /api/geolift               - Run GeoLift analysis

API is ready to receive requests from frontend...
Running plumber API at http://0.0.0.0:8000
Running swagger Docs at http://127.0.0.1:8000/__docs__/
```

### Test the API

You can test the API endpoints:

1. **Health check**:
```bash
curl http://localhost:8000/health
```

2. **View API documentation**:
Open [http://127.0.0.1:8000/__docs__/](http://127.0.0.1:8000/__docs__/) in your browser

## Full Stack Development

To run both the React frontend and R backend together:

### Terminal 1 - Start R API Server:
```bash
Rscript api/start_api.R
```
Server will run on: [http://localhost:8000](http://localhost:8000)

### Terminal 2 - Start React Frontend:
```bash
npm start
```
Frontend will run on: [http://localhost:3000](http://localhost:3000)

The frontend will automatically connect to the R backend API for GeoLift analysis functionality.

### API Endpoints

- `GET /health` - Health check endpoint
- `POST /api/data/upload` - Upload and process CSV data for analysis
- `POST /api/market-selection` - Perform market selection analysis  
- `POST /api/power-analysis` - Run power analysis calculations
- `POST /api/geolift` - Execute full GeoLift analysis

### Troubleshooting

If you encounter issues:

1. **Package installation errors**: Make sure you have the latest version of R and all system dependencies
2. **augsynth installation fails**: Ensure devtools is properly installed and you have internet connectivity
3. **Server won't start**: Check that all required packages are installed by running `api/install_packages.R`

## Project Structure

```
Alyn/
├── src/                    # React Frontend
│   ├── components/
│   │   ├── Sidebar.js          # Sidebar navigation component
│   │   ├── Sidebar.css
│   │   ├── MainContent.js      # Main content area component
│   │   ├── MainContent.css
│   │   └── ...                 # Other React components
│   ├── utils/
│   │   └── geoliftAPI.js       # Frontend API client
│   ├── App.js                  # Main application component
│   ├── App.css
│   ├── index.js               # Application entry point
│   └── index.css              # Global styles
├── api/                    # R Backend API
│   ├── geolift_api.R           # Main API endpoints and logic
│   ├── start_api.R             # API server startup script
│   └── install_packages.R     # R package installation script
├── R/                      # GeoLift R Functions
│   ├── imports.R               # Package imports
│   ├── auxiliary.R             # Helper functions
│   ├── data.R                  # Data processing functions
│   ├── MultiCell.R             # Multi-cell analysis
│   ├── pre_processing_data.R   # Data preprocessing
│   ├── pre_test_power.R        # Power analysis functions
│   ├── post_test_analysis.R    # Post-test analysis
│   └── plots.R                 # Plotting functions
├── public/                 # Static assets
├── package.json           # Node.js dependencies
└── README.md              # This file
```

## Main Components

### Sidebar
- Deep purple gradient background
- Expandable/collapsible menu items
- Current page highlighting

### MainContent
- Experiment data table
- Pagination controls
- Create experiment button

## Customization

You can customize the styles by modifying the CSS files:

- `src/components/Sidebar.css` - Sidebar styles
- `src/components/MainContent.css` - Main content styles

## License

MIT