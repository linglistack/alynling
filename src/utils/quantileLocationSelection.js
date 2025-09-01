// Utility function for quantile-based location selection
// Based on the R logic from Representitive Cities.R

/**
 * Selects representative locations using quantile-based approach
 * @param {Array} data - Array of data rows with location, outcome, and date
 * @param {Object} options - Configuration options
 * @returns {Array} Array of selected location names
 */
export const selectQuantileLocations = (data, options = {}) => {
  const {
    n = 5,
    target = 'outcome',
    method = 'mean',
    locationColumn = 'location'
  } = options;

  if (!data || data.length === 0) {
    return [];
  }

  // Select aggregation function
  const getAggFunction = (method) => {
    switch (method) {
      case 'mean':
        return (values) => values.reduce((sum, val) => sum + val, 0) / values.length;
      case 'sum':
        return (values) => values.reduce((sum, val) => sum + val, 0);
      case 'median':
        return (values) => {
          const sorted = [...values].sort((a, b) => a - b);
          const mid = Math.floor(sorted.length / 2);
          return sorted.length % 2 === 0 
            ? (sorted[mid - 1] + sorted[mid]) / 2 
            : sorted[mid];
        };
      default:
        throw new Error("method must be 'mean', 'median', or 'sum'");
    }
  };

  const aggFunction = getAggFunction(method);

  // Aggregate per location
  const locationStats = {};
  
  data.forEach(row => {
    const location = row[locationColumn];
    const outcome = parseFloat(row[target]) || 0;
    
    if (!location) return;
    
    if (!locationStats[location]) {
      locationStats[location] = [];
    }
    locationStats[location].push(outcome);
  });

  // Calculate aggregated stats for each location
  const cityStats = Object.entries(locationStats)
    .map(([location, values]) => ({
      location,
      stat: aggFunction(values)
    }))
    .sort((a, b) => a.stat - b.stat);

  if (cityStats.length === 0) {
    return [];
  }

  const nUse = Math.min(n, cityStats.length);
  
  // Calculate quantiles
  const probs = nUse === 1 ? [0] : Array.from({ length: nUse }, (_, i) => i / (nUse - 1));
  const stats = cityStats.map(c => c.stat);
  
  // Get quantile values
  const quantiles = probs.map(prob => {
    const index = prob * (stats.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    
    if (lower === upper) {
      return stats[lower];
    }
    
    const weight = index - lower;
    return stats[lower] * (1 - weight) + stats[upper] * weight;
  });

  // Find nearest cities to quantiles
  const chosenCities = new Set();
  
  quantiles.forEach(q => {
    let minDistance = Infinity;
    let nearestCity = null;
    
    cityStats.forEach(city => {
      const distance = Math.abs(city.stat - q);
      if (distance < minDistance) {
        minDistance = distance;
        nearestCity = city.location;
      }
    });
    
    if (nearestCity) {
      chosenCities.add(nearestCity);
    }
  });

  // If we need more cities, add remaining ones
  if (chosenCities.size < nUse) {
    const remaining = cityStats
      .map(c => c.location)
      .filter(loc => !chosenCities.has(loc))
      .slice(0, nUse - chosenCities.size);
    
    remaining.forEach(loc => chosenCities.add(loc));
  }

  return Array.from(chosenCities);
};

/**
 * Processes file data to format for quantile selection
 * @param {Object} fileData - File data with headers and rows
 * @param {Object} columnMappings - Column name mappings
 * @returns {Array} Processed data array
 */
export const processDataForQuantileSelection = (fileData, columnMappings) => {
  const { locationColumn, outcomeColumn, dateColumn } = columnMappings;
  
  if (!fileData || !fileData.headers || !fileData.rows) {
    return [];
  }

  const headers = fileData.headers.map(h => String(h).trim().toLowerCase());
  const idxLocation = headers.indexOf(locationColumn.trim().toLowerCase());
  const idxOutcome = headers.indexOf(outcomeColumn.trim().toLowerCase());
  const idxDate = headers.indexOf(dateColumn.trim().toLowerCase());

  if (idxLocation === -1 || idxOutcome === -1 || idxDate === -1) {
    console.error('Column mappings not found in headers:', { locationColumn, outcomeColumn, dateColumn, headers });
    return [];
  }

  return fileData.rows
    .map(row => ({
      location: (row[idxLocation] || '').trim(),
      outcome: parseFloat(row[idxOutcome]) || 0,
      date: (row[idxDate] || '').trim()
    }))
    .filter(row => row.location && row.date);
};
