import React, { useState } from 'react';
import { ArrowLeft, Info } from 'lucide-react';
import './DataIngestionForm.css';
import { geoliftAPI, csvFileToString } from '../utils/geoliftAPI';
import { validateDataQuality } from '../utils/incrementalityAnalysis';
import IngestDataStep from './IngestDataStep';
import TooltipInfo from './TooltipInfo';
import tooltips from '../config/geoliftTooltips.json';

const DataIngestionForm = ({ onBack }) => {
  const [selectedFile, setSelectedFile] = useState('');
  const [fileData, setFileData] = useState(null);
  const [dateColumn, setDateColumn] = useState('date');
  const [outcomeColumn, setOutcomeColumn] = useState('Y');
  const [locationColumn, setLocationColumn] = useState('location');
  const [containsZipCodes, setContainsZipCodes] = useState(false);
  const [dateFormat, setDateFormat] = useState('mm/dd/yy');
  const [activeTab, setActiveTab] = useState('data');
  const [useDefaultFile, setUseDefaultFile] = useState(false);

  // Step 2 state variables  
  const [testStart, setTestStart] = useState('2024-03-01'); // Date format
  const [testEnd, setTestEnd] = useState('2024-03-22'); // Date format
  const [cooldownEnd, setCooldownEnd] = useState('2024-04-04'); // Date format
  const [testLocations, setTestLocations] = useState('');
  const [excludeFromControl, setExcludeFromControl] = useState('');
  const [outcomeVariableType, setOutcomeVariableType] = useState('conversions');
  const [spendChange, setSpendChange] = useState('reduced');
  const [spendWithheld, setSpendWithheld] = useState('0');
  const [analysisResults, setAnalysisResults] = useState(null);
  const [availableLocations, setAvailableLocations] = useState([]);
  const [selectedTestLocations, setSelectedTestLocations] = useState([]);

  // Helper function to convert file data to CSV string
  const convertToCsvString = (data) => {
    if (!data || !data.rows) return '';
    const headers = (data.headers || []).map(h => String(h).trim().toLowerCase());
    const toKey = (s) => String(s || '').trim().toLowerCase();
    const findIdx = (name, fallbacks = []) => {
      const targets = [name, ...fallbacks].map(toKey);
      for (let t of targets) {
        const idx = headers.indexOf(t);
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const locIdx = findIdx(locationColumn, ['city', 'location_id', 'geo', 'market']);
    const yIdx = findIdx(outcomeColumn, ['y', 'outcome', 'app_download', 'revenue', 'sales']);
    const dateIdx = findIdx(dateColumn, ['date', 'time', 'timestamp', 'day']);

    if (locIdx === -1 || yIdx === -1 || dateIdx === -1) return '';

    const headerRow = 'location,Y,date';
    const dataRows = data.rows.map(row => {
      const location = (row[locIdx] || '').trim();
      const outcome = (row[yIdx] || '').trim();
      const date = (row[dateIdx] || '').trim();
      return `${location},${outcome},${date}`;
    });
    return [headerRow, ...dataRows].join('\n');
  };

  // Helper to build daily data for charts using processed data and selected locations
  const generateDailyData = (processedData, testLocationsArray, startDate, endDate, treatmentEffect = 0) => {
    const dailyData = [];
    const allDates = [...new Set(processedData.map(row => row.date))].sort();
    const treatmentStartDate = new Date(startDate);
    const treatmentEndDate = new Date(endDate);
    
    allDates.forEach((dateStr, index) => {
      const currentDate = new Date(dateStr);
      const dayData = processedData.filter(row => row.date === dateStr);
      
      const testData = dayData.filter(row => testLocationsArray.includes(row.location?.toLowerCase()));
      const controlData = dayData.filter(row => !testLocationsArray.includes(row.location?.toLowerCase()));

      const testSum = testData.reduce((sum, row) => sum + (row.Y || 0), 0);
      const controlSum = controlData.reduce((sum, row) => sum + (row.Y || 0), 0);
      
      const isInTreatmentPeriod = currentDate >= treatmentStartDate && currentDate <= treatmentEndDate;
      
      dailyData.push({
        day: index + 1,
        date: dateStr,
        test: testSum,
        control: controlSum,
        isTreatmentPeriod: isInTreatmentPeriod
      });
    });
    
    return dailyData;
  };

  const handleAnalyzeExperiment = async () => {
    if (!fileData) return;
    const validationIssues = validateDataQuality(fileData, {
      testLocations,
      testStart,
      testEnd
    });
    if (validationIssues.length > 0) {
      alert('Data quality issues found:\n' + validationIssues.join('\n'));
      return;
    }

    try {
      setAnalysisResults({
        loading: true,
        message: 'Running GeoLift analysis...'
      });

      const csvData = convertToCsvString(fileData);
      const uploadResult = await geoliftAPI.uploadData(csvData, {
        locationCol: 'location',
        timeCol: 'date',
        outcomeCol: 'Y'
      });

      if (!uploadResult.success) {
        throw new Error('Failed to upload data to GeoLift API');
      }

      const processedData = uploadResult.data;
      const testLocationArray = testLocations
        .split(',')
        .map(loc => loc.trim().toLowerCase())
        .filter(loc => loc.length > 0);

      if (testLocationArray.length === 0) {
        throw new Error('Please select at least one test location');
      }

      const treatmentStartDate = testStart; // keep as string for API
      const treatmentEndDate = testEnd;     // keep as string for API

      // Validate that treatment dates are within data range
      const availableDates = [...new Set(processedData.map(row => row.date))].sort();
      const minDate = availableDates[0];
      const maxDate = availableDates[availableDates.length - 1];

      const startDateObj = new Date(treatmentStartDate);
      const endDateObj = new Date(treatmentEndDate);
      const minDateObj = new Date(minDate);
      const maxDateObj = new Date(maxDate);

      if (startDateObj < minDateObj || startDateObj > maxDateObj) {
        throw new Error(`Treatment start date ${treatmentStartDate} is outside data range ${minDate} to ${maxDate}`);
      }
      if (endDateObj < minDateObj || endDateObj > maxDateObj) {
        throw new Error(`Treatment end date ${treatmentEndDate} is outside data range ${minDate} to ${maxDate}`);
      }
      if (startDateObj >= endDateObj) {
        throw new Error('Treatment start date must be before end date');
      }

      const geoliftResult = await geoliftAPI.runGeoLift(
        processedData,
        testLocationArray,
        treatmentStartDate,
        treatmentEndDate,
        {
          alpha: 0.1,
          model: 'none',
          confidenceIntervals: true
        }
      );

      if (!geoliftResult.success) {
        throw new Error('GeoLift analysis failed');
      }

      const results = geoliftResult.results;
      
      const extractNumeric = (value, defaultValue = 0) => {
        if (Array.isArray(value)) return Number(value[0]) || defaultValue;
        return Number(value) || defaultValue;
      };
      
      const att = extractNumeric(results.att);
      const percentLift = extractNumeric(results.percent_lift);
      const pValue = extractNumeric(results.p_value);
      const incremental = extractNumeric(results.incremental);
      const lowerBound = extractNumeric(results.lower_bound);
      const upperBound = extractNumeric(results.upper_bound);
      
      const standardError = Math.abs((upperBound - lowerBound) / 3.92);
      
      setAnalysisResults({
        estimatedROI: (percentLift / 100).toFixed(2),
        confidenceInterval: `(${lowerBound.toFixed(2)}, ${upperBound.toFixed(2)})`,
        standardError: standardError.toFixed(3),
        testRevenue: Math.abs(incremental),
        controlRevenue: Math.abs(incremental) / Math.max(Math.abs(percentLift / 100), 0.01),
        lift: incremental,
        liftPercent: percentLift.toFixed(1),
        dailyData: generateDailyData(processedData, testLocationArray, treatmentStartDate, treatmentEndDate, incremental),
        testLocations: Array.isArray(results.test_locations) ? results.test_locations : testLocationArray,
        spendWithheld: spendWithheld,
        isSignificant: pValue < 0.05,
        tStatistic: Math.abs(att / standardError).toFixed(3),
        testDataPoints: processedData.filter(row => testLocationArray.includes(row.location?.toLowerCase())).length,
        controlDataPoints: processedData.filter(row => !testLocationArray.includes(row.location?.toLowerCase())).length,
        totalIncrementalValue: incremental
      });

    } catch (error) {
      console.error('GeoLift analysis error:', error);
      setAnalysisResults({
        error: true,
        message: `Analysis failed: ${error.message}`
      });
    }
  };

  return (
    <div className="data-ingestion-page">
      <IngestDataStep
        onBack={onBack}
        withPageWrapper={false}
        selectedFile={selectedFile}
        setSelectedFile={setSelectedFile}
        fileData={fileData}
        setFileData={setFileData}
        dateColumn={dateColumn}
        setDateColumn={setDateColumn}
        outcomeColumn={outcomeColumn}
        setOutcomeColumn={setOutcomeColumn}
        locationColumn={locationColumn}
        setLocationColumn={setLocationColumn}
        containsZipCodes={containsZipCodes}
        setContainsZipCodes={setContainsZipCodes}
        dateFormat={dateFormat}
        setDateFormat={setDateFormat}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        useDefaultFile={useDefaultFile}
        setUseDefaultFile={setUseDefaultFile}
        availableLocations={availableLocations}
        setAvailableLocations={setAvailableLocations}
        selectedTestLocations={selectedTestLocations}
        setSelectedTestLocations={setSelectedTestLocations}
        testLocations={testLocations}
        setTestLocations={setTestLocations}
      />

      {/* Step 2: Configure analysis - only show when file is uploaded */}
      {fileData && (
        <div className="step-section">
          <div className="ingestion-header">
            <h2 className="page-title">Step 2: Configure analysis</h2>
          </div>
        
        <div className="analysis-content">
          <div className="analysis-form-panel">
            <div className="form-section">
              <label className="form-label">Test start date <TooltipInfo title="Test start date" content="Start date of experiment" /></label>
              <input
                type="date"
                value={testStart}
                onChange={(e) => setTestStart(e.target.value)}
                className="date-input"
                min="2024-01-01"
                max="2024-03-30"
              />
              <small className="input-help">Start date of experiment</small>
            </div>

            <div className="form-section">
              <label className="form-label">Test end date <TooltipInfo title="Test end date" content="End date of experiment" /></label>
              <input
                type="date"
                value={testEnd}
                onChange={(e) => setTestEnd(e.target.value)}
                className="date-input"
                min="2024-01-01"
                max="2024-03-30"
              />
              <small className="input-help">End date of experiment</small>
            </div>

            <div className="form-section">
                          <label className="form-label">End of cooldown period <TooltipInfo title="Cooldown period" content="Date when cooldown period ends" /></label>
              <input
                type="date"
                value={cooldownEnd}
                onChange={(e) => setCooldownEnd(e.target.value)}
                className="date-input"
                min="2024-01-01"
                max="2024-12-31"
              />
              <small className="input-help">Date when cooldown period ends</small>
            </div>

            <div className="form-section">
              <label className="form-label">Locations in test group <TooltipInfo title="Test locations" content="Select locations included in the test (treatment) group" /></label>
              {availableLocations.length > 0 ? (
                <div className="location-selector">
                  <div className="location-selector-header">
                    <span className="location-count">
                      {selectedTestLocations.length} of {availableLocations.length} locations selected
                    </span>
                  </div>
                  <div className="location-list">
                    {availableLocations.map(location => (
                      <label key={location} className="location-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedTestLocations.includes(location)}
                            onChange={() => {
                              const updatedSelection = selectedTestLocations.includes(location)
                                ? selectedTestLocations.filter(loc => loc !== location)
                                : [...selectedTestLocations, location];
                              setSelectedTestLocations(updatedSelection);
                              setTestLocations(updatedSelection.join(', '));
                            }}
                        />
                        <span className="location-name">{location}</span>
                      </label>
                    ))}
                  </div>
                  <div className="selected-locations-display">
                    <strong>Selected:</strong> {testLocations || 'None'}
                  </div>
                </div>
              ) : (
                <div className="location-placeholder">
                  <p>Please upload data to see available locations</p>
                </div>
              )}
            </div>

            <div className="form-section">
              <label className="form-label">Exclude from control (optional) <TooltipInfo title="Exclude from control" content="Locations that should not be used as controls" /></label>
              <input
                type="text"
                value={excludeFromControl}
                onChange={(e) => setExcludeFromControl(e.target.value)}
                className="text-input"
                placeholder="Enter locations to exclude"
              />
            </div>

            <div className="form-section">
              <label className="form-label">Outcome variable type <TooltipInfo title="Outcome variable type" content="Choose whether your outcome is conversions or revenue" /></label>
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="outcomeType"
                    value="conversions"
                    checked={outcomeVariableType === 'conversions'}
                    onChange={(e) => setOutcomeVariableType(e.target.value)}
                  />
                  <span className="radio-custom"></span>
                    Conversions
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="outcomeType"
                    value="revenue"
                    checked={outcomeVariableType === 'revenue'}
                    onChange={(e) => setOutcomeVariableType(e.target.value)}
                  />
                  <span className="radio-custom"></span>
                    Revenue
                </label>
              </div>
            </div>

            <div className="form-section">
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="spendChange"
                    value="reduced"
                    checked={spendChange === 'reduced'}
                    onChange={(e) => setSpendChange(e.target.value)}
                  />
                  <span className="radio-custom"></span>
                  I reduced spend in these locations
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="spendChange"
                    value="increased"
                    checked={spendChange === 'increased'}
                    onChange={(e) => setSpendChange(e.target.value)}
                  />
                  <span className="radio-custom"></span>
                  I increased spend in these locations
                </label>
              </div>
            </div>

            <div className="form-section">
              <label className="form-label">Spend withheld from these locations <TooltipInfo title="Spend withheld" content="Amount of spend withheld in the selected test locations during the experiment" /></label>
              <input
                type="number"
                value={spendWithheld}
                onChange={(e) => setSpendWithheld(e.target.value)}
                className="text-input"
                min="0"
              />
            </div>

            <button className="analyze-experiment-btn" onClick={handleAnalyzeExperiment}>
              Analyze experiment
            </button>
          </div>

          <div className="analysis-results-panel">
            <h3 className="results-title">Analysis results</h3>
            <div className="results-content">
              {analysisResults?.loading ? (
                <div className="loading-state">
                  <div className="loading-spinner"></div>
                  <p>{analysisResults.message}</p>
                </div>
              ) : analysisResults?.error ? (
                <div className="error-state">
                  <p>{analysisResults.message}</p>
                </div>
              ) : analysisResults ? (
                <div className="analysis-dashboard">
                  <div className="metrics-summary">
                    <div className="metric-item">
                      <span className="metric-label">Estimated ROI</span>
                      <span className="metric-value roi-value">{analysisResults.estimatedROI}</span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-label">ROI confidence interval</span>
                      <span className="metric-value">{analysisResults.confidenceInterval}</span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-label">Standard error</span>
                      <span className="metric-value">{analysisResults.standardError}</span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-label">Statistical significance</span>
                      <span className={`metric-value ${analysisResults.isSignificant ? 'significant' : 'not-significant'}`}>
                        {analysisResults.isSignificant ? 'Significant (95%)' : 'Not significant'}
                      </span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-label">T-statistic</span>
                      <span className="metric-value">{analysisResults.tStatistic}</span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-label">Total incremental value</span>
                      <span className="metric-value">${analysisResults.totalIncrementalValue?.toLocaleString() || '0'}</span>
                    </div>
                  </div>

                  <div className="chart-section">
                    <div className="revenue-comparison">
                      <div className="chart-bar holdout">
                        <div className="bar-fill" style={{ height: '70%' }}>
                          <span className="bar-value">${(analysisResults.controlRevenue * 0.85).toLocaleString()}</span>
                        </div>
                        <span className="bar-label">Holdout (modeled)</span>
                      </div>
                      <div className="chart-bar lift">
                        <div className="bar-fill lift-bar" style={{ height: '20%' }}>
                            <span className="bar-value">${Math.max(0, analysisResults.lift).toLocaleString()}</span>
                        </div>
                        <span className="bar-label">Lift</span>
                      </div>
                      <div className="chart-bar test">
                        <div className="bar-fill" style={{ height: '90%' }}>
                          <span className="bar-value">${analysisResults.testRevenue.toLocaleString()}</span>
                        </div>
                        <span className="bar-label">Test</span>
                      </div>
                    </div>
                    </div>
                  </div>
                ) : (
                  <div className="empty-state">
                    <p>Run analysis to see results</p>
                  </div>
              )}
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};

export default DataIngestionForm; 