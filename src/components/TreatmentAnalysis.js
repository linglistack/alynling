import React, { useState, useEffect, useRef } from 'react';
import './TreatmentAnalysis.style.css';
import LocationSelectionModal from './LocationSelectionModal';
import { geoliftAPI } from '../utils/geoliftAPI';

const loadHighcharts = () => new Promise((resolve, reject) => {
  if (window.Highcharts) return resolve(window.Highcharts);
  const s = document.createElement('script');
  s.src = 'https://code.highcharts.com/highcharts.js';
  s.onload = () => resolve(window.Highcharts);
  s.onerror = reject;
  document.body.appendChild(s);
});

const TreatmentAnalysis = ({ 
  selectedRow, 
  processedData,
  geoDataReadResponse,
  availableLocations = [],
  onBack = null 
}) => {
  // Form inputs - now using calendar dates
  const [treatmentStartDate, setTreatmentStartDate] = useState('');
  const [treatmentEndDate, setTreatmentEndDate] = useState('');
  const [alpha, setAlpha] = useState(0.05);

  // Available date range from data
  const [dateRange, setDateRange] = useState({ min: '', max: '' });
  const [selectedLocations, setSelectedLocations] = useState({
    included: [],
    excluded: []
  });

  // Location modal state
  const [locationModalOpen, setLocationModalOpen] = useState(false);

  // Analysis state
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);

  // Chart refs
  const chartLiftRef = useRef(null);
  const chartATTRef = useRef(null);
  const chartLift = useRef(null);
  const chartATT = useRef(null);

  // Initialize with selected row's location
  useEffect(() => {
    if (selectedRow) {
      const rowLocations = selectedRow.locations || 
                          selectedRow.test_markets || 
                          selectedRow.markets || 
                          selectedRow.location || 
                          [];
      
      const locationsArray = Array.isArray(rowLocations) ? rowLocations : [rowLocations].filter(Boolean);
      
      setSelectedLocations({
        included: locationsArray,
        excluded: []
      });
    }
  }, [selectedRow]);

  // Initialize date range from geoDataReadResponse
  useEffect(() => {
    console.log('[TreatmentAnalysis] Date initialization - geoDataReadResponse:', !!geoDataReadResponse);
    console.log('[TreatmentAnalysis] Date initialization - summary:', geoDataReadResponse?.summary);
    console.log('[TreatmentAnalysis] Date initialization - time_mapping length:', geoDataReadResponse?.time_mapping?.length);
    
    if (geoDataReadResponse?.summary?.date_range) {
      const { min_date, max_date } = geoDataReadResponse.summary.date_range;
      console.log('[TreatmentAnalysis] Setting date range from GeoDataRead:', { min_date, max_date });
      setDateRange({ min: min_date, max: max_date });
      
      // Set default treatment period to last 12 periods
      if (!treatmentStartDate && !treatmentEndDate && geoDataReadResponse.time_mapping) {
        const sortedMapping = geoDataReadResponse.time_mapping.sort((a, b) => new Date(a.date) - new Date(b.date));
        const defaultStart = sortedMapping[sortedMapping.length - 12]?.date || sortedMapping[0]?.date;
        const defaultEnd = sortedMapping[sortedMapping.length - 1]?.date;
        
        console.log('[TreatmentAnalysis] Setting default dates from GeoDataRead:', { defaultStart, defaultEnd });
        if (defaultStart && defaultEnd) {
          setTreatmentStartDate(defaultStart);
          setTreatmentEndDate(defaultEnd);
        }
      }
    } else if (processedData && Array.isArray(processedData) && processedData.length > 0) {
      // Fallback to processedData if geoDataReadResponse is not available
      const dates = processedData.map(row => row.date).filter(Boolean).sort();
      const minDate = dates[0];
      const maxDate = dates[dates.length - 1];
      
      setDateRange({ min: minDate, max: maxDate });
      
      // Set default treatment period to last 12 periods
      if (!treatmentStartDate && !treatmentEndDate) {
        const totalDates = [...new Set(dates)].sort();
        const defaultStart = totalDates[totalDates.length - 12] || totalDates[0];
        const defaultEnd = totalDates[totalDates.length - 1];
        
        setTreatmentStartDate(defaultStart);
        setTreatmentEndDate(defaultEnd);
      }
    }
  }, [geoDataReadResponse, processedData, treatmentStartDate, treatmentEndDate]);

  // Function to normalize state names to proper case for map matching
  const normalizeStateName = (name) => {
    if (!name) return '';
    // Convert to proper case (first letter of each word capitalized)
    return name.trim()
      .replace(/\s+/g, ' ')
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Initialize default locations from selectedRow (market selection results)
  useEffect(() => {
    if (selectedRow && selectedRow.location) {
      // Handle locations that might be either array or comma-separated string
      let locations = [];
      
      if (Array.isArray(selectedRow.location)) {
        locations = selectedRow.location;
      } else if (typeof selectedRow.location === 'string') {
        // Split comma-separated string and clean up
        locations = selectedRow.location.split(',').map(loc => loc.trim());
      }
      
      // Normalize location names to proper case for consistent map matching
      const normalizedLocations = locations.map(loc => normalizeStateName(loc));
      
      if (normalizedLocations.length > 0) {
        console.log('[TreatmentAnalysis] Setting default locations from selectedRow:', normalizedLocations);
        setSelectedLocations({
          included: normalizedLocations,
          excluded: []
        });
      }
    }
  }, [selectedRow]);

  const getLocationSummary = (locations) => {
    const included = locations.included || [];
    const excluded = locations.excluded || [];
    
    if (excluded.length > 0 && included.length > 0) {
      return `${included.length} included, ${excluded.length} excluded`;
    } else if (excluded.length > 0) {
      return `${excluded.length} excluded`;
    } else if (included.length > 0) {
      return `${included.length} included`;
    }
    return 'All locations';
  };

  const handleLocationSave = (locationData) => {
    setSelectedLocations(locationData);
    setLocationModalOpen(false);
  };

  const runGeoLiftAnalysis = async () => {
    if (!processedData || selectedLocations.included.length === 0) {
      setAnalysisError('Please select at least one location for treatment');
      return;
    }

    if (!treatmentStartDate || !treatmentEndDate) {
      setAnalysisError('Please select treatment start and end dates');
      return;
    }

    if (new Date(treatmentStartDate) >= new Date(treatmentEndDate)) {
      setAnalysisError('Treatment start date must be before treatment end date');
      return;
    }

    try {
      setAnalysisLoading(true);
      setAnalysisError('');
      
      let treatmentStartTime, treatmentEndTime;
      
      if (geoDataReadResponse && geoDataReadResponse.time_mapping) {
        // Use GeoDataRead response for date-to-time conversion
        console.log('[TreatmentAnalysis] Using GeoDataRead response for date conversion');
        const timeMapping = geoDataReadResponse.time_mapping || [];
        console.log('[TreatmentAnalysis] Time mapping available:', timeMapping.length, 'entries');
        console.log('[TreatmentAnalysis] First few time mapping entries:', timeMapping.slice(0, 5));
        console.log('[TreatmentAnalysis] Looking for dates:', { treatmentStartDate, treatmentEndDate });
        
        const startTimeEntry = timeMapping.find(entry => entry.date === treatmentStartDate);
        const endTimeEntry = timeMapping.find(entry => entry.date === treatmentEndDate);
        
        console.log('[TreatmentAnalysis] Found entries:', { startTimeEntry, endTimeEntry });
        console.log('[TreatmentAnalysis] Raw time values:', { 
          startTime: startTimeEntry?.time, 
          endTime: endTimeEntry?.time,
          startTimeType: typeof startTimeEntry?.time,
          endTimeType: typeof endTimeEntry?.time,
          startTimeIsArray: Array.isArray(startTimeEntry?.time),
          endTimeIsArray: Array.isArray(endTimeEntry?.time)
        });
        
        if (!startTimeEntry || !endTimeEntry) {
          console.error('[TreatmentAnalysis] Date conversion failed. Available dates:', 
            timeMapping.map(entry => entry.date).slice(0, 10));
          throw new Error('Selected dates not found in time mapping. Please select valid dates from the available range.');
        }
        
        // Ensure we get scalar values, not arrays
        treatmentStartTime = Array.isArray(startTimeEntry.time) ? startTimeEntry.time[0] : startTimeEntry.time;
        treatmentEndTime = Array.isArray(endTimeEntry.time) ? endTimeEntry.time[0] : endTimeEntry.time;
        
        console.log('[TreatmentAnalysis] Converted time values:', { 
          treatmentStartTime, 
          treatmentEndTime,
          startTimeType: typeof treatmentStartTime,
          endTimeType: typeof treatmentEndTime 
        });
        
        console.log('[TreatmentAnalysis] Running GeoLift analysis with GeoDataRead:', {
          locations: selectedLocations.included,
          treatmentStartDate,
          treatmentEndDate,
          treatmentStartTime,
          treatmentEndTime,
          alpha,
          geoDataRows: geoDataReadResponse?.data ? geoDataReadResponse.data.length : 'unknown'
        });

        // Call the GeoLift API for final analysis using GeoDataRead response data and converted time periods
        const result = await geoliftAPI.geoLiftWithGeoData(geoDataReadResponse, {
          locations: selectedLocations.included,
          treatmentStartTime,
          treatmentEndTime,
          alpha,
          fixedEffects: true,
          model: "best"
        });
        
        console.log('[TreatmentAnalysis] GeoLift analysis result:', result);
        setAnalysisResult(result);
      } else {
        // Fallback: Use regular GeoLift API with dates (let backend handle conversion)
        console.log('[TreatmentAnalysis] GeoDataRead not available, using fallback with dates');
        
        console.log('[TreatmentAnalysis] Running GeoLift analysis with dates:', {
          locations: selectedLocations.included,
          treatmentStartDate,
          treatmentEndDate,
          alpha,
          processedDataRows: Array.isArray(processedData) ? processedData.length : 'unknown'
        });

        // Call the regular GeoLift API with dates
        const result = await geoliftAPI.geoLift(processedData, {
          locations: selectedLocations.included,
          treatmentStartDate,
          treatmentEndDate,
          alpha,
          fixedEffects: true,
          model: "best"
        });
        
        console.log('[TreatmentAnalysis] GeoLift analysis result:', result);
        setAnalysisResult(result);
      }

    } catch (e) {
      console.error('[TreatmentAnalysis] Analysis error:', e);
      const errorMsg = e.message || 'GeoLift analysis failed';
      setAnalysisError(errorMsg);
    } finally {
      setAnalysisLoading(false);
    }
  };

  // Render charts when analysis result is available
  useEffect(() => {
    if (!analysisResult || analysisLoading || analysisError) return;
    
    let destroyed = false;
    
    (async () => {
      try {
        const Highcharts = await loadHighcharts();
        if (destroyed) return;

        // Lift chart removed as requested

        // Render ATT chart if data is available
        if (analysisResult.att_data && chartATTRef.current) {
          const attData = analysisResult.att_data;
          const times = attData.time || [];
          const attValues = attData.att || [];
          
          console.log('[TreatmentAnalysis] ATT Chart Data:', {
            timesLength: times.length,
            attValuesLength: attValues.length,
            sampleTimes: times.slice(0, 5),
            sampleAttValues: attValues.slice(0, 5),
            treatmentStart: analysisResult?.results?.treatment_start,
            treatmentEnd: analysisResult?.results?.treatment_end
          });

          // Create date mapping for tooltips
          let timeToDateMap = {};
          if (geoDataReadResponse && geoDataReadResponse.time_mapping) {
            geoDataReadResponse.time_mapping.forEach(mapping => {
              timeToDateMap[mapping.time] = mapping.date;
            });
          }

          // Calculate treatment start and end indices based on user input
          const treatmentStartTime = geoDataReadResponse?.time_mapping?.find(m => m.date === treatmentStartDate)?.time;
          const treatmentEndTime = geoDataReadResponse?.time_mapping?.find(m => m.date === treatmentEndDate)?.time;
          const treatmentStartIndex = times.findIndex(t => t === treatmentStartTime);
          const treatmentEndIndex = times.findIndex(t => t === treatmentEndTime);

          console.log('[TreatmentAnalysis] Treatment period calculation:', {
            treatmentStartDate,
            treatmentEndDate,
            treatmentStartTime,
            treatmentEndTime,
            treatmentStartIndex,
            treatmentEndIndex
          });

          if (chartATT.current) chartATT.current.destroy();
          chartATT.current = Highcharts.chart(chartATTRef.current, {
            title: { text: 'Average Treatment Effect (ATT) Over Time' },
            chart: {
              type: 'line',
              height: 400,
              width: null, // Let it take full width
              spacingLeft: 10,
              spacingRight: 10,
              reflow: true
            },
            xAxis: { 
              categories: times, // Show integer time periods
              title: { text: 'Time Period' },
              labels: {
                style: {
                  fontSize: '10px'
                }
              },
              // Add treatment period shading based on user input
              plotBands: (treatmentStartIndex >= 0 && treatmentEndIndex >= 0) ? [{
                color: 'rgba(150, 150, 150, 0.2)', // Grey shade for treatment period
                from: treatmentStartIndex,
                to: treatmentEndIndex,
                label: { text: 'Treatment Period', style: { color: '#666', fontWeight: 'bold' } }
              }] : [],
              // Add vertical dotted line for treatment start
              plotLines: (treatmentStartIndex >= 0) ? [{
                color: '#666', // Grey color for the line
                width: 2,
                value: treatmentStartIndex, // Position at treatment start
                dashStyle: 'Dot' // Dotted line style
              }] : []
            },
            yAxis: { 
              title: { text: 'ATT Value' },
              plotLines: [{
                value: 0,
                color: '#666',
                width: 1,
                dashStyle: 'Dash',
                label: {
                  text: 'No Effect',
                  align: 'right',
                  style: {
                    color: '#666'
                  }
                }
              }]
            },
            series: [{
              name: 'ATT',
              data: attValues,
              color: '#667eea',
              lineWidth: 1, // Make line thinner
              marker: {
                enabled: true,
                radius: 2 // Smaller markers to match thinner line
              }
            }],
            tooltip: {
              formatter: function() {
                const time = times[this.point.index];
                const date = timeToDateMap[time] || time;
                return `<b>Time Period:</b> ${time}<br/><b>Date:</b> ${date}<br/><b>ATT Value:</b> ${this.y.toFixed(4)}`;
              }
            },
            legend: { enabled: false },
            responsive: {
              rules: [{
                condition: {
                  maxWidth: 500
                },
                chartOptions: {
                  xAxis: {
                    labels: {
                      rotation: -90
                    }
                  }
                }
              }]
            }
          });
        }

      } catch (e) {
        console.error('[TreatmentAnalysis] Chart rendering error:', e);
      }
    })();

    return () => { 
      destroyed = true;
      if (chartLift.current) {
        chartLift.current.destroy();
        chartLift.current = null;
      }
      if (chartATT.current) {
        chartATT.current.destroy();
        chartATT.current = null;
      }
    };
  }, [analysisResult, analysisLoading, analysisError, treatmentStartDate, treatmentEndDate, geoDataReadResponse]);

  return (
    <div className="treatment-analysis">
      
      <div className="treatment-split">
        <div className="treatment-left">
          <div className="treatment-config">
            {/* Selected Market Info */}
            {selectedRow && (
              <div className="config-card">
                <h3 className="config-section-title">Selected Market Combination</h3>
                <div className="selected-market-summary">
                  <div className="market-info-item">
                    <strong>Markets:</strong> {
                      Array.isArray(selectedRow.locations) 
                        ? selectedRow.locations.join(', ')
                        : selectedRow.test_markets || selectedRow.markets || selectedRow.location || 'Unknown'
                    }
                  </div>
                  {selectedRow.rank && (
                    <div className="market-info-item">
                      <strong>Rank:</strong> {selectedRow.rank}
                    </div>
                  )}
                  {selectedRow.effect_size && (
                    <div className="market-info-item">
                      <strong>Effect Size:</strong> {selectedRow.effect_size}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Treatment Parameters */}
            <div className="config-card">
              <h3 className="config-section-title">Treatment Parameters</h3>
              <div className="config-form">
                <div className="config-field">
                  <label className="config-label">Treatment Start Date</label>
                  <input
                    type="date"
                    className="config-input"
                    value={treatmentStartDate}
                    onChange={(e) => setTreatmentStartDate(e.target.value)}
                    min={dateRange.min}
                    max={dateRange.max}
                  />
                  {dateRange.min && (
                    <small className="config-hint">
                      Available range: {dateRange.min} to {dateRange.max}
                    </small>
                  )}
                </div>
                
                <div className="config-field">
                  <label className="config-label">Treatment End Date</label>
                  <input
                    type="date"
                    className="config-input"
                    value={treatmentEndDate}
                    onChange={(e) => setTreatmentEndDate(e.target.value)}
                    min={dateRange.min}
                    max={dateRange.max}
                  />
                </div>
                
                <div className="config-field">
                  <label className="config-label">Alpha (Significance Level)</label>
                  <input
                    type="number"
                    className="config-input"
                    value={alpha}
                    onChange={(e) => setAlpha(Number(e.target.value))}
                    min="0.01"
                    max="0.99"
                    step="0.01"
                  />
                </div>

                <div className="config-field">
                  <label className="config-label">Treatment Locations</label>
                  <div className="location-selection-input" onClick={() => setLocationModalOpen(true)}>
                    <span className="location-summary">
                      {getLocationSummary(selectedLocations)}
                    </span>
                    <span className="location-edit-icon">✏️</span>
                  </div>
                </div>
              </div>

              <div className="config-actions">
                <button
                  type="button"
                  className={`primary-btn ${analysisLoading ? 'disabled' : ''}`}
                  disabled={analysisLoading || selectedLocations.included.length === 0}
                  onClick={runGeoLiftAnalysis}
                >
                  {analysisLoading ? 'Running Analysis…' : 'Run GeoLift Analysis'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="treatment-right">
          <div className="results-card">
            <div className="results-title">GeoLift Analysis Results</div>
            <div className="results-content">
              {analysisLoading ? (
                <div className="results-loading">
                  <div className="loading-text">Running GeoLift analysis...</div>
                  <div className="loading-subtitle">This may take a few moments</div>
                </div>
              ) : analysisError ? (
                <div className="results-error">{analysisError}</div>
              ) : analysisResult ? (
                <div className="analysis-results-content">
                  {/* Test Statistics */}
                  {analysisResult.summary && (
                    <div className="test-statistics-section">
                      <div className="test-statistics">
                        <div className="stats-header">
                          <div className="stats-title">##### GeoLift Results #####</div>
                          <div className="stats-border">##########################################</div>
                        </div>
                        <div className="stats-content">
                          {analysisResult.summary.average_lift && (
                            <div className="stat-item">
                              <span className="stat-label">★ Average Lift:</span>
                              <span className="stat-value">{Number(analysisResult.summary.average_lift).toFixed(3)}</span>
                            </div>
                          )}
                          {analysisResult.summary.percent_lift && (
                            <div className="stat-item">
                              <span className="stat-label">★ Percent Lift:</span>
                              <span className="stat-value">{Number(analysisResult.summary.percent_lift).toFixed(1)}%</span>
                            </div>
                          )}
                          {analysisResult.summary.p_value && (
                            <div className="stat-item">
                              <span className="stat-label">★ P-value:</span>
                              <span className="stat-value">{Number(analysisResult.summary.p_value).toFixed(3)}</span>
                            </div>
                          )}
                          {analysisResult.summary.incremental_y && (
                            <div className="stat-item">
                              <span className="stat-label">★ Incremental Y:</span>
                              <span className="stat-value">{Number(analysisResult.summary.incremental_y).toFixed(0)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ATT Chart */}
                  <div className="analysis-charts">
                    <div className="chart-container" style={{ width: '100%' }}>
                      <div ref={chartATTRef} style={{ width: '100%', height: 400 }} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="results-placeholder">
                  Configure treatment parameters and click "Run GeoLift Analysis" to view results.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <LocationSelectionModal
        isOpen={locationModalOpen}
        onClose={() => setLocationModalOpen(false)}
        onSave={handleLocationSave}
        initialIncluded={selectedLocations.included}
        initialExcluded={selectedLocations.excluded}
        availableLocations={availableLocations}
      />
    </div>
  );
};

export default TreatmentAnalysis;
