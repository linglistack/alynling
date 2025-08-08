import React, { useState } from 'react';
import { ArrowLeft, Info } from 'lucide-react';
import './DataIngestionForm.css';
import { geoliftAPI, csvFileToString } from '../utils/geoliftAPI';
import { validateDataQuality } from '../utils/incrementalityAnalysis';

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

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file.name);
      setUseDefaultFile(false);
      
      // 读取CSV文件数据
      const reader = new FileReader();
      reader.onload = (event) => {
        const csvData = event.target.result;
        processCSVData(csvData, file.name);
      };
      reader.readAsText(file);
    } else {
      setSelectedFile('');
      setFileData(null);
      setAvailableLocations([]);
      setSelectedTestLocations([]);
      setTestLocations('');
    }
  };

  const handleUseDefaultFile = async () => {
    try {
      setUseDefaultFile(true);
      setSelectedFile('us_city_revenue_data.csv');
      
      // 读取默认的CSV文件
      const response = await fetch('/us_city_revenue_data.csv');
      const csvData = await response.text();
      processCSVData(csvData, 'us_city_revenue_data.csv');
    } catch (error) {
      console.error('Error loading default file:', error);
      alert('Error loading default file. Please try uploading your own file.');
    }
  };

  const processCSVData = (csvData, fileName) => {
    const lines = csvData.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const rows = lines.slice(1).filter(line => line.trim() !== '').map(line => 
      line.split(',').map(cell => cell.trim())
    ).filter(row => row.length >= 3 && row[0] && row[1] && row[2]);
    
    // 提取唯一的地理位置
    const uniqueLocations = [...new Set(rows.map(row => row[0]))].sort();
    console.log('Available locations:', uniqueLocations);
    console.log('Total rows processed:', rows.length);
    
    setFileData({
      headers,
      rows,
      totalRows: lines.length - 1
    });
    
    // 设置可用的地理位置
    setAvailableLocations(uniqueLocations);
    setSelectedTestLocations([]);
    setTestLocations('');
  };



  const handleIngestData = () => {
    console.log('Ingesting data...');
  };

  const handleLocationSelection = (location) => {
    const updatedSelection = selectedTestLocations.includes(location)
      ? selectedTestLocations.filter(loc => loc !== location)
      : [...selectedTestLocations, location];
    
    setSelectedTestLocations(updatedSelection);
    setTestLocations(updatedSelection.join(', '));
  };

  const handleSelectAllLocations = () => {
    setSelectedTestLocations(availableLocations);
    setTestLocations(availableLocations.join(', '));
  };

  const handleClearAllLocations = () => {
    setSelectedTestLocations([]);
    setTestLocations('');
  };

  // Helper function to convert file data to CSV string
  const convertToCsvString = (data) => {
    if (!data || !data.rows) return '';
    
    // Our sample data is in format: location, Y, date
    const headerRow = 'location,Y,date';
    const dataRows = data.rows.map(row => {
      // Map the row data according to our CSV format
      const location = row[0] || '';
      const outcome = row[1] || '';
      const date = row[2] || '';
      return `${location},${outcome},${date}`;
    });
    
    return [headerRow, ...dataRows].join('\n');
  };

  // Note: calculateTimePeriod function removed - we now work directly with dates

  // Helper function to generate daily data for charts using real GeoLift analysis
  const generateDailyData = (processedData, testLocations, startDate, endDate, treatmentEffect = 0) => {
    const dailyData = [];
    
    // Get all dates in the data for a complete view
    const allDates = [...new Set(processedData.map(row => row.date))].sort();
    
    // Convert treatment dates for comparison
    const treatmentStartDate = new Date(startDate);
    const treatmentEndDate = new Date(endDate);
    
    // Show data for the full timeline
    allDates.forEach((dateStr, index) => {
      const currentDate = new Date(dateStr);
      const dayData = processedData.filter(row => row.date === dateStr);
      
      const testData = dayData.filter(row => 
        testLocations.includes(row.location?.toLowerCase())
      );
      const controlData = dayData.filter(row => 
        !testLocations.includes(row.location?.toLowerCase())
      );
      
      let testSum = testData.reduce((sum, row) => sum + (row.Y || 0), 0);
      const controlSum = controlData.reduce((sum, row) => sum + (row.Y || 0), 0);
      
      // Check if this date is in the treatment period
      const isInTreatmentPeriod = currentDate >= treatmentStartDate && currentDate <= treatmentEndDate;
      
      dailyData.push({
        day: index + 1, // Use sequential day numbers for chart x-axis
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
    
    // Validate data quality first
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
      // Show loading state
      setAnalysisResults({
        loading: true,
        message: 'Running GeoLift analysis...'
      });

      // Convert file data to CSV string format
      const csvData = convertToCsvString(fileData);
      
      // Upload data to GeoLift API
      const uploadResult = await geoliftAPI.uploadData(csvData, {
        locationCol: 'location',
        timeCol: 'date',
        outcomeCol: 'Y'
      });

      if (!uploadResult.success) {
        throw new Error('Failed to upload data to GeoLift API');
      }

      const processedData = uploadResult.data;
      
      // Convert test locations string to array
      const testLocationArray = testLocations
        .split(',')
        .map(loc => loc.trim().toLowerCase())
        .filter(loc => loc.length > 0);

      // Validate test locations are selected
      if (testLocationArray.length === 0) {
        throw new Error('Please select at least one test location');
      }

      // Use dates directly (API will handle conversion to time periods)
      const treatmentStartDate = testStart;
      const treatmentEndDate = testEnd;

      // Validate that test dates exist in the data
      const availableDates = [...new Set(processedData.map(row => row.date))].sort();
      const minDate = availableDates[0];
      const maxDate = availableDates[availableDates.length - 1];

      console.log('Debug - Frontend values:', {
        testStart,
        testEnd,
        treatmentStartDate,
        treatmentEndDate,
        testLocationArray,
        dataSize: processedData.length,
        dateRange: `${minDate} to ${maxDate}`,
        availableDates: availableDates.slice(0, 10) // Show first 10
      });

      // Validate treatment dates are within data range (convert strings to Date objects for comparison)
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

      // Run GeoLift analysis
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
      
      console.log('Debug - API Response:', results);
      
      // Helper function to extract numeric value from R arrays
      const extractNumeric = (value, defaultValue = 0) => {
        if (Array.isArray(value)) return Number(value[0]) || defaultValue;
        return Number(value) || defaultValue;
      };
      
      // Extract numeric values from API response
      const att = extractNumeric(results.att);
      const percentLift = extractNumeric(results.percent_lift);
      const pValue = extractNumeric(results.p_value);
      const incremental = extractNumeric(results.incremental);
      const lowerBound = extractNumeric(results.lower_bound);
      const upperBound = extractNumeric(results.upper_bound);
      
      // Calculate standard error from confidence interval
      const standardError = Math.abs((upperBound - lowerBound) / 3.92);
      
      // Format results for display
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
      <div className="ingestion-header">
        <button className="back-button" onClick={onBack}>
          <ArrowLeft size={20} />
          Back
        </button>
        <h2 className="page-title">Step 1: Ingest data</h2>
      </div>

      <div className="ingestion-content">
        <div className="ingestion-form-panel">
          <div className="form-section">
            <label className="form-label">Upload data</label>
            <div className="file-upload-options">
              <div className="upload-option">
                <button
                  type="button"
                  className={`upload-option-btn ${useDefaultFile ? 'active' : ''}`}
                  onClick={handleUseDefaultFile}
                >
                  <span className="option-icon">📊</span>
                  <span className="option-text">Use Sample Data</span>
                  <span className="option-desc">us_city_revenue_data.csv</span>
                </button>
              </div>
              
              <div className="upload-option">
                <input
                  type="file"
                  id="file-upload"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                  accept=".csv"
                />
                <button
                  type="button"
                  className={`upload-option-btn ${!useDefaultFile && selectedFile ? 'active' : ''}`}
                  onClick={() => document.getElementById('file-upload').click()}
                >
                  <span className="option-icon">📁</span>
                  <span className="option-text">Upload Your File</span>
                  <span className="option-desc">Choose CSV file</span>
                </button>
              </div>
            </div>
            
            {selectedFile && (
              <div className="file-info">
                <span className="file-name">
                  📄 {selectedFile}
                  {useDefaultFile && <span className="default-badge">Sample</span>}
                </span>
                {fileData && (
                  <span className="file-stats">
                    {fileData.totalRows} rows, {availableLocations.length} locations
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="form-section">
            <label className="form-label">Date column</label>
            <div className="input-with-dropdown">
              <input
                type="text"
                value={dateColumn}
                onChange={(e) => setDateColumn(e.target.value)}
                className="text-input"
              />
              <div className="dropdown-arrow">▼</div>
            </div>
          </div>

          <div className="form-section">
            <label className="form-label">Outcome variable column</label>
            <div className="input-with-dropdown">
              <input
                type="text"
                value={outcomeColumn}
                onChange={(e) => setOutcomeColumn(e.target.value)}
                className="text-input"
              />
              <div className="dropdown-arrow">▼</div>
            </div>
          </div>

          <div className="form-section">
            <label className="form-label">Location ID column</label>
            <div className="input-with-dropdown">
              <input
                type="text"
                value={locationColumn}
                onChange={(e) => setLocationColumn(e.target.value)}
                className="text-input"
              />
              <div className="dropdown-arrow">▼</div>
            </div>
          </div>

          <div className="form-section checkbox-section">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={containsZipCodes}
                onChange={(e) => setContainsZipCodes(e.target.checked)}
              />
              <span className="checkbox-custom"></span>
              Location column contains ZIP codes
              <Info size={14} className="info-icon" />
            </label>
          </div>

          <div className="form-section">
            <label className="form-label">Date format</label>
            <div className="input-with-dropdown">
              <input
                type="text"
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value)}
                className="text-input"
              />
              <div className="dropdown-arrow">▼</div>
            </div>
          </div>
        </div>

        <div className="ingestion-display-panel">
          <div className="tabs">
            <button
              className={`tab-button ${activeTab === 'data' ? 'active' : ''}`}
              onClick={() => setActiveTab('data')}
            >
              Data
            </button>
            <button
              className={`tab-button ${activeTab === 'plot' ? 'active' : ''}`}
              onClick={() => setActiveTab('plot')}
            >
              Plot
            </button>
          </div>
          <div className="tab-content">
            {activeTab === 'data' && (
              fileData ? (
                <div className="data-table-container">
                  <div className="data-info">
                    <span className="row-count">{fileData.totalRows} rows</span>
                  </div>
                  <div className="data-table">
                    <table>
                      <thead>
                        <tr>
                          {fileData.headers.map((header, index) => (
                            <th key={index}>{header}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {fileData.rows.map((row, rowIndex) => (
                          <tr key={rowIndex}>
                            {row.map((cell, cellIndex) => (
                              <td key={cellIndex}>{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="upload-prompt">Please upload your data</p>
              )
            )}
            {activeTab === 'plot' && (
              fileData ? (
                <div className="plot-container">
                  <div className="chart-container">
                    <div className="chart-header">
                      <h3>Revenue by Location</h3>
                      <p className="chart-subtitle">
                        Revenue trends by city
                      </p>
                    </div>
                    <div className="chart-content city-view">
                      <div className="bar-chart">
                        {(() => {
                            const cityData = {};
                            fileData.rows.forEach(row => {
                              const city = row[0]?.trim(); // Trim whitespace
                              const revenue = parseInt(row[1]) || 0;
                              const date = row[2];
                              if (city && !cityData[city]) {
                                cityData[city] = [];
                              }
                              if (city) {
                                cityData[city].push({ date, revenue });
                              }
                            });
                            
                            const cities = Object.keys(cityData).sort();
                            console.log('Cities for plotting:', cities);
                            console.log('City data object:', cityData);
                            const maxRevenue = Math.max(...fileData.rows.map(row => parseInt(row[1]) || 0));
                            const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#ef4444'];
                            
                            return (
                              <div className="city-charts-grid">
                                {cities.map((city, cityIndex) => {
                                  const cityRows = cityData[city];
                                  const color = colors[cityIndex % colors.length];
                                  
                                  return (
                                    <div key={cityIndex} className="city-area-chart">
                                      <h4 className="city-title">{city}</h4>
                                      <div className="area-chart-container">
                                        <svg className="area-chart" viewBox="-50 0 450 320" preserveAspectRatio="xMidYMid meet">
                                          {/* Grid lines */}
                                          {[0, 25, 50, 75, 100].map((y, i) => (
                                            <line
                                              key={i}
                                              x1="0"
                                              y1={250 - y * 2.5}
                                              x2="400"
                                              y2={250 - y * 2.5}
                                              stroke="#e5e7eb"
                                              strokeWidth="1"
                                            />
                                          ))}
                                          {[0, 25, 50, 75, 100].map((x, i) => (
                                            <line
                                              key={i}
                                              x1={x * 4}
                                              y1="0"
                                              x2={x * 4}
                                              y2="250"
                                              stroke="#e5e7eb"
                                              strokeWidth="1"
                                            />
                                          ))}
                                          
                                          {/* Area chart path */}
                                          <path
                                            d={(() => {
                                              if (cityRows.length === 0) return '';
                                              const points = cityRows.map((dataPoint, index) => {
                                                const x = (index / (cityRows.length - 1)) * 400;
                                                const y = 250 - (dataPoint.revenue / maxRevenue) * 250;
                                                return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
                                              });
                                              return points.join(' ') + ' L 400 250 L 0 250 Z';
                                            })()}
                                            fill={color}
                                            fillOpacity="0.3"
                                            stroke={color}
                                            strokeWidth="2"
                                          />
                                          
                                          {/* Data points */}
                                          {cityRows.map((dataPoint, index) => {
                                            const x = (index / (cityRows.length - 1)) * 400;
                                            const y = 250 - (dataPoint.revenue / maxRevenue) * 250;
                                            return (
                                              <circle
                                                key={index}
                                                cx={x}
                                                cy={y}
                                                r="4"
                                                fill={color}
                                                stroke="white"
                                                strokeWidth="1"
                                              />
                                            );
                                          })}
                                          
                                          {/* Y-axis labels */}
                                          {[0, 5000, 10000, 15000, 20000].map((value, i) => {
                                            const y = 250 - (value / maxRevenue) * 250;
                                            return (
                                              <text
                                                key={i}
                                                x="-20"
                                                y={y + 3}
                                                fontSize="10"
                                                fill="#6b7280"
                                                textAnchor="end"
                                              >
                                                {value.toLocaleString()}
                                              </text>
                                            );
                                          })}
                                          
                                          {/* Y-axis title */}
                                          <text
                                            x="-40"
                                            y="125"
                                            fontSize="12"
                                            fill="#374151"
                                            textAnchor="middle"
                                            transform="rotate(-90, -40, 125)"
                                            fontWeight="500"
                                          >
                                            Revenue ($)
                                          </text>
                                          
                                          {/* X-axis labels */}
                                          {cityRows.length > 0 && (
                                            <>
                                              {/* X-axis title */}
                                              <text x="200" y="300" fontSize="12" fill="#374151" textAnchor="middle" fontWeight="500">
                                                Time (Day)
                                              </text>
                                              
                                              {/* Start and end dates */}
                                              <text x="0" y="285" fontSize="10" fill="#6b7280" textAnchor="middle">
                                                Feb 2024
                                              </text>
                                              <text x="400" y="285" fontSize="10" fill="#6b7280" textAnchor="middle">
                                                Apr 2024
                                              </text>
                                              
                                              {/* X-axis tick marks and labels */}
                                              {cityRows.map((dataPoint, index) => {
                                                if (index % Math.ceil(cityRows.length / 5) === 0 || index === cityRows.length - 1) {
                                                  const x = (index / (cityRows.length - 1)) * 400;
                                                  const date = new Date(dataPoint.date);
                                                  const month = date.toLocaleDateString('en-US', { month: 'short' });
                                                  const day = date.getDate();
                                                  return (
                                                    <g key={index}>
                                                      <line
                                                        x1={x}
                                                        y1="250"
                                                        x2={x}
                                                        y2="255"
                                                        stroke="#6b7280"
                                                        strokeWidth="1"
                                                      />
                                                      <text
                                                        x={x}
                                                        y="275"
                                                        fontSize="9"
                                                        fill="#6b7280"
                                                        textAnchor="middle"
                                                      >
                                                        {`${month} ${day}`}
                                                      </text>
                                                    </g>
                                                  );
                                                }
                                                return null;
                                              })}
                                            </>
                                          )}
                                        </svg>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="upload-prompt">Plot will appear here after data ingestion</p>
              )
            )}
          </div>
        </div>
      </div>

      {/* Step 2: Configure analysis - only show when file is uploaded */}
      {fileData && (
        <div className="step-section">
          <div className="ingestion-header">
            <h2 className="page-title">Step 2: Configure analysis</h2>
          </div>
        
        <div className="analysis-content">
          <div className="analysis-form-panel">
            <div className="form-section">
              <label className="form-label">Test start date</label>
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
              <label className="form-label">Test end date</label>
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
              <label className="form-label">
                End of cooldown period
                <Info size={14} className="info-icon" />
              </label>
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
              <label className="form-label">Locations in test group</label>
              {availableLocations.length > 0 ? (
                <div className="location-selector">
                  <div className="location-selector-header">
                    <span className="location-count">
                      {selectedTestLocations.length} of {availableLocations.length} locations selected
                    </span>
                    <div className="location-actions">
                      <button 
                        type="button" 
                        className="location-action-btn"
                        onClick={handleSelectAllLocations}
                      >
                        Select All
                      </button>
                      <button 
                        type="button" 
                        className="location-action-btn"
                        onClick={handleClearAllLocations}
                      >
                        Clear All
                      </button>
                    </div>
                  </div>
                  <div className="location-list">
                    {availableLocations.map(location => (
                      <label key={location} className="location-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedTestLocations.includes(location)}
                          onChange={() => handleLocationSelection(location)}
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
              <label className="form-label">Exclude from control (optional)</label>
              <input
                type="text"
                value={excludeFromControl}
                onChange={(e) => setExcludeFromControl(e.target.value)}
                className="text-input"
                placeholder="Enter locations to exclude"
              />
            </div>

            <div className="form-section">
              <label className="form-label">Outcome variable type</label>
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
                  conversions
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
                  revenue
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
              <label className="form-label">Spend withheld from these locations</label>
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
                  {/* Key Metrics */}
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

                  {/* Revenue Comparison Chart */}
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
                          <span className="bar-value">${Math.abs(analysisResults.lift * 100).toLocaleString()}</span>
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

                  {/* Cumulative Revenue Chart */}
                  <div className="chart-section">
                    <h4 className="chart-title">Cumulative Revenue</h4>
                    <div className="cumulative-chart">
                      <svg viewBox="0 0 400 200" className="line-chart">
                        {/* Grid lines */}
                        {[0, 25, 50, 75, 100].map((y, i) => (
                          <line key={i} x1="0" y1={160 - y * 1.6} x2="400" y2={160 - y * 1.6} stroke="#f0f0f0" strokeWidth="1" />
                        ))}
                        
                        {/* Cumulative revenue line */}
                        <path
                          d={(() => {
                            let cumulative = 0;
                            const maxCumulative = analysisResults.dailyData.reduce((sum, day) => sum + day.test + day.control, 0);
                            const points = analysisResults.dailyData.map((day, index) => {
                              cumulative += day.test + day.control;
                              const x = (index / Math.max(1, analysisResults.dailyData.length - 1)) * 400;
                              const y = 160 - (cumulative / Math.max(1, maxCumulative)) * 150;
                              return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
                            });
                            return points.join(' ');
                          })()}
                          fill="none"
                          stroke="#667eea"
                          strokeWidth="3"
                          strokeDasharray="5,5"
                        />
                        
                        {/* Y-axis labels */}
                        <text x="-10" y="165" fontSize="10" fill="#666" textAnchor="end">$0</text>
                        <text x="-10" y="125" fontSize="10" fill="#666" textAnchor="end">$25K</text>
                        <text x="-10" y="85" fontSize="10" fill="#666" textAnchor="end">$50K</text>
                        <text x="-10" y="45" fontSize="10" fill="#666" textAnchor="end">$75K</text>
                        <text x="-10" y="15" fontSize="10" fill="#666" textAnchor="end">$100K</text>
                        
                        {/* Data points for cumulative chart */}
                        {(() => {
                          let cumulative = 0;
                          const maxCumulative = analysisResults.dailyData.reduce((sum, day) => sum + day.test + day.control, 0);
                          return analysisResults.dailyData.map((day, index) => {
                            cumulative += day.test + day.control;
                            if (index % 3 === 0) { // Show every 3rd point to avoid crowding
                              const x = (index / Math.max(1, analysisResults.dailyData.length - 1)) * 400;
                              const y = 160 - (cumulative / Math.max(1, maxCumulative)) * 150;
                              return (
                                <circle key={index} cx={x} cy={y} r="3" fill="#667eea" stroke="white" strokeWidth="1" />
                              );
                            }
                            return null;
                          });
                        })()}
                        
                        {/* X-axis labels */}
                        <text x="0" y="185" fontSize="10" fill="#666" textAnchor="middle">0</text>
                        <text x="133" y="185" fontSize="10" fill="#666" textAnchor="middle">7</text>
                        <text x="267" y="185" fontSize="10" fill="#666" textAnchor="middle">14</text>
                        <text x="400" y="185" fontSize="10" fill="#666" textAnchor="middle">21</text>
                        <text x="200" y="200" fontSize="10" fill="#666" textAnchor="middle">Days after test start</text>
                      </svg>
                    </div>
                  </div>

                  {/* Daily Revenue Chart */}
                  <div className="chart-section">
                    <h4 className="chart-title">Revenue per Day and Group</h4>
                    <div className="daily-revenue-chart">
                      <svg viewBox="-80 0 550 220" className="line-chart">
                        {/* Background */}
                        <rect x="0" y="20" width="400" height="120" fill="#fafafa" stroke="#e5e7eb" strokeWidth="1" />
                        
                        {/* Horizontal grid lines */}
                        {[0, 25, 50, 75, 100].map((percent, i) => {
                          const y = 140 - (percent / 100) * 120;
                          return (
                            <line key={`h-grid-${i}`} x1="0" y1={y} x2="400" y2={y} stroke="#e5e7eb" strokeWidth="1" />
                          );
                        })}
                        
                        {/* Vertical grid lines */}
                        {[0, 7, 14, 21].map((day, i) => {
                          const x = (day / 20) * 400;
                          return (
                            <line key={`v-grid-${i}`} x1={x} y1="20" x2={x} y2="140" stroke="#e5e7eb" strokeWidth="1" />
                          );
                        })}
                        
                        {/* Y-axis */}
                        <line x1="0" y1="20" x2="0" y2="140" stroke="#374151" strokeWidth="2" />
                        
                        {/* X-axis */}
                        <line x1="0" y1="140" x2="400" y2="140" stroke="#374151" strokeWidth="2" />
                        
                        {/* Y-axis labels */}
                        {(() => {
                          const maxRevenue = Math.max(...analysisResults.dailyData.map(day => Math.max(day.test, day.control)));
                          return [0, 0.33, 0.66, 1].map((fraction, i) => {
                            const value = Math.round(maxRevenue * fraction);
                            const y = 140 - fraction * 120;
                            return (
                              <g key={`y-label-${i}`}>
                                <text x="-15" y={y + 4} fontSize="11" fill="#6b7280" textAnchor="end">
                                  ${value >= 1000 ? `${(value/1000).toFixed(1)}K` : value.toLocaleString()}
                                </text>
                                <line x1="-8" y1={y} x2="0" y2={y} stroke="#374151" strokeWidth="1" />
                              </g>
                            );
                          });
                        })()}
                        
                        {/* X-axis labels */}
                        {[0, 7, 14, 21].map((day, i) => {
                          const x = (day / 20) * 400;
                          return (
                            <g key={`x-label-${i}`}>
                              <text x={x} y="165" fontSize="11" fill="#6b7280" textAnchor="middle">
                                Day {day}
                              </text>
                              <line x1={x} y1="140" x2={x} y2="145" stroke="#374151" strokeWidth="1" />
                            </g>
                          );
                        })}
                        
                        {/* Axis titles */}
                        <text x="-55" y="80" fontSize="13" fill="#374151" textAnchor="middle" transform="rotate(-90, -55, 80)" fontWeight="500">
                          Daily Revenue ($)
                        </text>
                        <text x="200" y="190" fontSize="13" fill="#374151" textAnchor="middle" fontWeight="500">
                          Days After Test Start
                        </text>
                        
                        {/* Test group line */}
                        <path
                          d={(() => {
                            const maxRevenue = Math.max(...analysisResults.dailyData.map(day => Math.max(day.test, day.control)));
                            return analysisResults.dailyData.map((day, index) => {
                              const x = (index / Math.max(1, analysisResults.dailyData.length - 1)) * 400;
                              const y = 140 - (day.test / Math.max(1, maxRevenue)) * 120;
                              return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
                            }).join(' ');
                          })()}
                          fill="none"
                          stroke="#4f46e5"
                          strokeWidth="3"
                        />
                        
                        {/* Control group line */}
                        <path
                          d={(() => {
                            const maxRevenue = Math.max(...analysisResults.dailyData.map(day => Math.max(day.test, day.control)));
                            return analysisResults.dailyData.map((day, index) => {
                              const x = (index / Math.max(1, analysisResults.dailyData.length - 1)) * 400;
                              const y = 140 - (day.control / Math.max(1, maxRevenue)) * 120;
                              return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
                            }).join(' ');
                          })()}
                          fill="none"
                          stroke="#dc2626"
                          strokeWidth="3"
                          strokeDasharray="5,5"
                        />
                        
                        {/* Data points for test group */}
                        {(() => {
                          const maxRevenue = Math.max(...analysisResults.dailyData.map(day => Math.max(day.test, day.control)));
                          return analysisResults.dailyData.map((day, index) => {
                            if (index % 3 === 0) { // Show every 3rd point
                              const x = (index / Math.max(1, analysisResults.dailyData.length - 1)) * 400;
                              const y = 140 - (day.test / Math.max(1, maxRevenue)) * 120;
                              return (
                                <circle key={`test-${index}`} cx={x} cy={y} r="4" fill="#4f46e5" stroke="white" strokeWidth="2" />
                              );
                            }
                            return null;
                          });
                        })()}
                        
                        {/* Data points for control group */}
                        {(() => {
                          const maxRevenue = Math.max(...analysisResults.dailyData.map(day => Math.max(day.test, day.control)));
                          return analysisResults.dailyData.map((day, index) => {
                            if (index % 3 === 0) { // Show every 3rd point
                              const x = (index / Math.max(1, analysisResults.dailyData.length - 1)) * 400;
                              const y = 140 - (day.control / Math.max(1, maxRevenue)) * 120;
                              return (
                                <circle key={`control-${index}`} cx={x} cy={y} r="4" fill="#dc2626" stroke="white" strokeWidth="2" />
                              );
                            }
                            return null;
                          });
                        })()}
                        
                        {/* Legend with better positioning */}
                        <g transform="translate(250, 35)">
                          <rect x="-10" y="-5" width="160" height="45" fill="white" stroke="#e5e7eb" strokeWidth="1" rx="4" />
                          <line x1="5" y1="8" x2="25" y2="8" stroke="#4f46e5" strokeWidth="3" />
                          <circle cx="35" cy="8" r="3" fill="#4f46e5" stroke="white" strokeWidth="1" />
                          <text x="45" y="12" fontSize="11" fill="#374151" fontWeight="500">Test Group</text>
                          
                          <line x1="5" y1="25" x2="25" y2="25" stroke="#dc2626" strokeWidth="3" strokeDasharray="5,5" />
                          <circle cx="35" cy="25" r="3" fill="#dc2626" stroke="white" strokeWidth="1" />
                          <text x="45" y="29" fontSize="11" fill="#374151" fontWeight="500">Control Group</text>
                        </g>
                      </svg>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="results-placeholder">Results will appear here after running the analysis</p>
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