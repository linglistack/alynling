/**
 * GeoLift API Client
 * Provides methods to communicate with the R Plumber API backend
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

class GeoLiftAPIError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'GeoLiftAPIError';
    this.status = status;
    this.data = data;
  }
}

const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  const finalOptions = { ...defaultOptions, ...options };
  
  try {
    const response = await fetch(url, finalOptions);
    const data = await response.json();
    
    if (!response.ok) {
      throw new GeoLiftAPIError(
        data.error || `HTTP ${response.status}`,
        response.status,
        data
      );
    }
    
    return data;
  } catch (error) {
    if (error instanceof GeoLiftAPIError) {
      throw error;
    }
    
    // Handle network errors
    throw new GeoLiftAPIError(
      `Network error: ${error.message}`,
      0,
      null
    );
  }
};

export const geoliftAPI = {
  /**
   * Health check to verify API is running
   */
  async healthCheck() {
    return apiRequest('/health');
  },

  /**
   * Upload and process CSV data
   */
  async uploadData(csvData, options = {}) {
    const {
      locationCol = 'location',
      timeCol = 'time',
      outcomeCol = 'Y'
    } = options;

    return apiRequest('/api/data/upload', {
      method: 'POST',
      body: JSON.stringify({
        csv_data: csvData,
        location_col: locationCol,
        time_col: timeCol,
        outcome_col: outcomeCol
      })
    });
  },

  /**
   * Run market selection analysis
   */
  async marketSelection(data, options = {}) {
    const {
      treatmentPeriods = 14,
      effectSize = [0, 0.05, 0.1, 0.15, 0.2, 0.25],
      lookbackWindow = 1,
      cpic = 1,
      alpha = 0.1
    } = options;

    return apiRequest('/api/market-selection', {
      method: 'POST',
      body: JSON.stringify({
        data,
        treatment_periods: treatmentPeriods,
        effect_size: effectSize,
        lookback_window: lookbackWindow,
        cpic,
        alpha
      })
    });
  },

  /**
   * Run power analysis
   */
  async powerAnalysis(data, locations, options = {}) {
    const {
      treatmentPeriods = 14,
      effectSize = [0, 0.05, 0.1, 0.15, 0.2, 0.25],
      lookbackWindow = 1,
      cpic = 1,
      alpha = 0.1
    } = options;

    return apiRequest('/api/power-analysis', {
      method: 'POST',
      body: JSON.stringify({
        data,
        locations,
        treatment_periods: treatmentPeriods,
        effect_size: effectSize,
        lookback_window: lookbackWindow,
        cpic,
        alpha
      })
    });
  },

  /**
   * Run GeoLift analysis
   */
  async runGeoLift(data, locations, treatmentStartDate, treatmentEndDate, options = {}) {
    const {
      alpha = 0.1,
      model = 'none',
      confidenceIntervals = true
    } = options;

    return apiRequest('/api/geolift', {
      method: 'POST',
      body: JSON.stringify({
        data,
        locations,
        treatment_start_date: treatmentStartDate,
        treatment_end_date: treatmentEndDate,
        alpha,
        model,
        confidence_intervals: confidenceIntervals
      })
    });
  },

  async edaPlots(data, options = {}) {
    const {
      treatmentPeriods = 14,
      effectSize = [0, 0.05, 0.1, 0.15, 0.2, 0.25],
      lookbackWindow = 1,
      cpic = 1,
      alpha = 0.1,
      marketRank = 1,
    } = options;

    return apiRequest('/api/eda/plots', {
      method: 'POST',
      body: JSON.stringify({
        data,
        treatment_periods: treatmentPeriods,
        effect_size: effectSize,
        lookback_window: lookbackWindow,
        cpic,
        alpha,
        market_rank: marketRank
      })
    });
  },
};

/**
 * Helper function to convert CSV file to string
 */
export const csvFileToString = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target.result);
    reader.onerror = (error) => reject(error);
    reader.readAsText(file);
  });
};

export default geoliftAPI;
