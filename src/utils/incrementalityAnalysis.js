/**
 * Incrementality Analysis Module
 * Calculates true incremental effect of marketing experiments
 */

// Incrementality Analysis Module
const parseDate = (dateStr) => {
  if (!dateStr) return null;
  return new Date(dateStr);
};

const isDateInRange = (date, startDate, endDate) => {
  const testDate = parseDate(date);
  if (!testDate) return false;
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  if (!start || !end) return false;
  return testDate >= start && testDate <= end;
};

const calculateMean = (values) => {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
};

const calculateVariance = (values, mean) => {
  if (values.length <= 1) return 0;
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  return squaredDiffs.reduce((sum, val) => sum + val, 0) / (values.length - 1);
};

export const analyzeIncrementality = (data, config) => {
  const { testStart, testEnd, testLocations, spendWithheld = 0 } = config;

  const testLocationList = testLocations
    .split(',')
    .map(loc => loc.trim().toLowerCase())
    .filter(loc => loc.length > 0);

  const locationData = {};
  
  data.rows.forEach(row => {
    const location = row[0]?.trim().toLowerCase();
    const outcomeValue = parseFloat(row[1]) || 0;
    const date = row[2]?.trim();
    
    if (!location || !date) return;
    
    if (!locationData[location]) {
      locationData[location] = [];
    }
    
    locationData[location].push({ date, value: outcomeValue });
  });

  const testGroupLocations = Object.keys(locationData).filter(location =>
    testLocationList.includes(location)
  );
  
  const controlGroupLocations = Object.keys(locationData).filter(location =>
    !testLocationList.includes(location)
  );

  const testPeriodData = [];
  const controlPeriodData = [];

  testGroupLocations.forEach(location => {
    locationData[location].forEach(record => {
      if (isDateInRange(record.date, testStart, testEnd)) {
        testPeriodData.push(record.value);
      }
    });
  });

  controlGroupLocations.forEach(location => {
    locationData[location].forEach(record => {
      if (isDateInRange(record.date, testStart, testEnd)) {
        controlPeriodData.push(record.value);
      }
    });
  });

  const testPeriodMean = calculateMean(testPeriodData);
  const controlPeriodMean = calculateMean(controlPeriodData);
  const incrementalEffect = testPeriodMean - controlPeriodMean;
  const liftPercentage = controlPeriodMean > 0 ? (incrementalEffect / controlPeriodMean) * 100 : 0;
  const totalIncrementalValue = incrementalEffect * testPeriodData.length;
  const roi = spendWithheld > 0 ? (totalIncrementalValue / spendWithheld) : 0;

  const testVariance = calculateVariance(testPeriodData, testPeriodMean);
  const controlVariance = calculateVariance(controlPeriodData, controlPeriodMean);
  const standardError = Math.sqrt((testVariance / testPeriodData.length) + (controlVariance / controlPeriodData.length));
  const tStatistic = standardError > 0 ? (testPeriodMean - controlPeriodMean) / standardError : 0;
  const isSignificant = Math.abs(tStatistic) > 1.96;

  const dailyData = [];
  const startDate = parseDate(testStart);
  const endDate = parseDate(testEnd);
  
  if (startDate && endDate) {
    const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    
    for (let i = 0; i <= daysDiff; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      
      const dayTestData = [];
      const dayControlData = [];
      
      testGroupLocations.forEach(location => {
        locationData[location].forEach(record => {
          if (parseDate(record.date)?.toDateString() === currentDate.toDateString()) {
            dayTestData.push(record.value);
          }
        });
      });
      
      controlGroupLocations.forEach(location => {
        locationData[location].forEach(record => {
          if (parseDate(record.date)?.toDateString() === currentDate.toDateString()) {
            dayControlData.push(record.value);
          }
        });
      });
      
      dailyData.push({
        date: currentDate.toISOString().split('T')[0],
        test: calculateMean(dayTestData),
        control: calculateMean(dayControlData),
        day: i
      });
    }
  }

  return {
    incrementalEffect: incrementalEffect,
    liftPercentage: liftPercentage,
    roi: roi,
    tStatistic: tStatistic,
    standardError: standardError,
    isSignificant: isSignificant,
    testTotalRevenue: testPeriodData.reduce((sum, val) => sum + val, 0),
    controlTotalRevenue: controlPeriodData.reduce((sum, val) => sum + val, 0),
    testAvgDaily: testPeriodMean,
    controlAvgDaily: controlPeriodMean,
    testLocations: testGroupLocations,
    controlLocations: controlGroupLocations,
    dailyData: dailyData,
    spendWithheld: parseFloat(spendWithheld) || 0,
    totalIncrementalValue: totalIncrementalValue,
    testDataPoints: testPeriodData.length,
    controlDataPoints: controlPeriodData.length
  };
};

export const validateDataQuality = (data, config) => {
  const issues = [];
  
  if (!data || !data.rows || data.rows.length === 0) {
    issues.push('No data provided');
    return issues;
  }

  const testLocationList = config.testLocations
    .split(',')
    .map(loc => loc.trim().toLowerCase())
    .filter(loc => loc.length > 0);

  const availableLocations = [...new Set(data.rows.map(row => row[0]?.trim().toLowerCase()))];
  const missingTestLocations = testLocationList.filter(loc => !availableLocations.includes(loc));
  
  if (missingTestLocations.length > 0) {
    issues.push(`Test locations not found in data: ${missingTestLocations.join(', ')}`);
  }

  if (data.rows.length < 10) {
    issues.push('Insufficient data points for reliable analysis');
  }

  return issues;
};

// Function to generate analysis report
export const generateAnalysisReport = (analysisResults) => {
  const {
    incrementalEffect,
    liftPercentage,
    roi,
    isSignificant,
    significanceLevel,
    testGroupSize,
    controlGroupSize,
    testDataPoints,
    controlDataPoints
  } = analysisResults;

  const report = {
    summary: {
      incrementalEffect: incrementalEffect.toFixed(2),
      liftPercentage: liftPercentage.toFixed(1),
      roi: roi.toFixed(2),
      isSignificant: isSignificant,
      significanceLevel: significanceLevel
    },
    
    interpretation: {
      effect: incrementalEffect > 0 ? 'positive' : 'negative',
      magnitude: Math.abs(liftPercentage) < 5 ? 'small' : 
                 Math.abs(liftPercentage) < 15 ? 'moderate' : 'large',
      confidence: isSignificant ? 'high' : 'low'
    },
    
    recommendations: []
  };

  if (isSignificant && incrementalEffect > 0) {
    report.recommendations.push('The experiment shows a statistically significant positive effect. Consider scaling the tested approach.');
  } else if (isSignificant && incrementalEffect < 0) {
    report.recommendations.push('The experiment shows a statistically significant negative effect. Consider discontinuing the tested approach.');
  } else {
    report.recommendations.push('The results are not statistically significant. Consider running a longer experiment or increasing sample size.');
  }

  if (testDataPoints < 30 || controlDataPoints < 30) {
    report.recommendations.push('Consider collecting more data points for more reliable results.');
  }

  if (testGroupSize < 3 || controlGroupSize < 3) {
    report.recommendations.push('Consider including more locations in each group for better statistical power.');
  }

  return report;
}; 