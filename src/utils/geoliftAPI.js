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
      alpha = 0.1,
      budget = 100000,
      numTestGeos = 2,
      includedLocations = [],
      excludedLocations = []
    } = options;

    const requestBody = {
      data,
      treatment_periods: treatmentPeriods,
      effect_size: effectSize,
      lookback_window: lookbackWindow,
      cpic,
      alpha,
      budget,
      N: Array.from({length: numTestGeos - 1}, (_, i) => i + 2), // Convert to range: [2, 3, ..., numTestGeos]
      include_markets: includedLocations,
      exclude_markets: excludedLocations
    };
    
    console.log('[geoliftAPI] Market selection request body:', {
      ...requestBody,
      data: `${Array.isArray(data) ? data.length : 'unknown'} rows`,
      sampleDataRow: Array.isArray(data) && data.length > 0 ? data[0] : 'No data',
      yValueTypes: Array.isArray(data) ? data.slice(0, 3).map((row, i) => `Row ${i}: ${typeof row.Y} - ${row.Y}`) : 'No data',
      include_markets: includedLocations,
      exclude_markets: excludedLocations,
      budget,
      N: requestBody.N,
      numTestGeos_original: numTestGeos
    });
    
    return apiRequest('/api/market-selection', {
      method: 'POST',
      body: JSON.stringify(requestBody)
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

    console.log('[geoliftAPI] EDA plots request:', {
      dataRows: Array.isArray(data) ? data.length : 'unknown',
      treatmentPeriods,
      alpha,
      marketRank,
      effectSize: effectSize.length > 5 ? `${effectSize.slice(0,3)}...` : effectSize
    });

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

  /**
   * Call GeoDataRead to process data and create time mapping
   */
  async geoDataRead(data, options = {}) {
    const {
      date_id = "date",
      location_id = "location", 
      Y_id = "Y",
      format = "yyyy-mm-dd"
    } = options;

    console.log('[geoliftAPI] GeoDataRead request:', {
      dataRows: Array.isArray(data) ? data.length : 'unknown',
      date_id,
      location_id,
      Y_id,
      format
    });

    return apiRequest('/api/geolift/geodataread', {
      method: 'POST',
      body: JSON.stringify({
        data,
        date_id,
        location_id,
        Y_id,
        format
      })
    });
  },

  /**
   * Run full GeoLift analysis with treatment parameters
   */
  async geoLift(data, options = {}) {
    const {
      locations = [],
      treatmentStartDate = null,
      treatmentEndDate = null,
      treatmentStartTime = null,
      treatmentEndTime = null,
      alpha = 0.05,
      fixedEffects = true,
      model = "best"
    } = options;

    console.log('[geoliftAPI] GeoLift analysis request:', {
      dataRows: Array.isArray(data) ? data.length : 'unknown',
      locations,
      treatmentStartDate,
      treatmentEndDate,
      treatmentStartTime,
      treatmentEndTime,
      alpha,
      fixedEffects,
      model
    });

    const requestBody = {
      data,
      locations,
      alpha,
      fixed_effects: fixedEffects,
      model
    };

    // Support both date and time parameters for backward compatibility
    if (treatmentStartDate && treatmentEndDate) {
      requestBody.treatment_start_date = treatmentStartDate;
      requestBody.treatment_end_date = treatmentEndDate;
    } else if (treatmentStartTime && treatmentEndTime) {
      requestBody.treatment_start_time = treatmentStartTime;
      requestBody.treatment_end_time = treatmentEndTime;
    } else {
      throw new Error('Either treatment dates or treatment times must be provided');
    }

    return apiRequest('/api/geolift/analysis', {
      method: 'POST',
      body: JSON.stringify(requestBody)
    });
  },

  /**
   * Run GeoLift analysis using pre-processed GeoDataRead response
   */
  async geoLiftWithGeoData(geoDataReadResponse, options = {}) {
    const {
      locations = [],
      treatmentStartTime,
      treatmentEndTime,
      alpha = 0.05,
      fixedEffects = true,
      model = "best"
    } = options;

    console.log('[geoliftAPI] GeoLift with GeoData analysis request:', {
      geoDataRows: geoDataReadResponse?.data ? geoDataReadResponse.data.length : 'unknown',
      locations,
      treatmentStartTime,
      treatmentEndTime,
      alpha,
      fixedEffects,
      model
    });

    return apiRequest('/api/geolift/analysis-with-geodata', {
      method: 'POST',
      body: JSON.stringify({
        geoDataReadResponse,
        locations,
        treatment_start_time: treatmentStartTime,
        treatment_end_time: treatmentEndTime,
        alpha,
        fixed_effects: fixedEffects,
        model
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
