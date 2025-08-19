import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Info } from 'lucide-react';
import './DataIngestionForm.css';

// Reusable Step 1: Ingest Data component
// Supports both controlled (via props) and uncontrolled (internal state) usage
const IngestDataStep = ({
  onBack,
  withPageWrapper = true,
  showHeader = true,
  showBack = true,
  showTitle = true,
  // Optional controlled props; if not provided, will use internal state
  selectedFile: controlledSelectedFile,
  setSelectedFile: controlledSetSelectedFile,
  fileData: controlledFileData,
  setFileData: controlledSetFileData,
  dateColumn: controlledDateColumn,
  setDateColumn: controlledSetDateColumn,
  outcomeColumn: controlledOutcomeColumn,
  setOutcomeColumn: controlledSetOutcomeColumn,
  locationColumn: controlledLocationColumn,
  setLocationColumn: controlledSetLocationColumn,
  containsZipCodes: controlledContainsZipCodes,
  setContainsZipCodes: controlledSetContainsZipCodes,
  dateFormat: controlledDateFormat,
  setDateFormat: controlledSetDateFormat,
  activeTab: controlledActiveTab,
  setActiveTab: controlledSetActiveTab,
  useDefaultFile: controlledUseDefaultFile,
  setUseDefaultFile: controlledSetUseDefaultFile,
  availableLocations: controlledAvailableLocations,
  setAvailableLocations: controlledSetAvailableLocations,
  selectedTestLocations: controlledSelectedTestLocations,
  setSelectedTestLocations: controlledSetSelectedTestLocations,
  testLocations: controlledTestLocations,
  setTestLocations: controlledSetTestLocations
}) => {
  // Internal state fallbacks for uncontrolled usage
  const [internalSelectedFile, setInternalSelectedFile] = useState('');
  const [internalFileData, setInternalFileData] = useState(null);
  const [internalDateColumn, setInternalDateColumn] = useState('date');
  const [internalOutcomeColumn, setInternalOutcomeColumn] = useState('app_download');
  const [internalLocationColumn, setInternalLocationColumn] = useState('city');
  const [internalContainsZipCodes, setInternalContainsZipCodes] = useState(false);
  const [internalDateFormat, setInternalDateFormat] = useState('mm/dd/yy');
  const [internalActiveTab, setInternalActiveTab] = useState('data');
  const [internalUseDefaultFile, setInternalUseDefaultFile] = useState(false);
  const [internalAvailableLocations, setInternalAvailableLocations] = useState([]);
  const [internalSelectedTestLocations, setInternalSelectedTestLocations] = useState([]);
  const [internalTestLocations, setInternalTestLocations] = useState('');

  // Post-upload options state
  const [trimMostlyZero, setTrimMostlyZero] = useState(false);
  const [clipOutliers, setClipOutliers] = useState(false);
  const [trimToLastEnabled, setTrimToLastEnabled] = useState(false);
  const [trimToLastDays, setTrimToLastDays] = useState('30');
  const [checkProblems, setCheckProblems] = useState(false);
  const [removedLocations, setRemovedLocations] = useState([]);
  const [removeDropdownOpen, setRemoveDropdownOpen] = useState(false);
  const pillContainerRef = useRef(null);

  // Plot toggle: combined Highcharts line
  const [combinedLinePlot, setCombinedLinePlot] = useState(true);
  const highchartsContainerRef = useRef(null);
  const chartInstanceRef = useRef(null);

  // Effective values and setters
  const selectedFile = controlledSelectedFile !== undefined ? controlledSelectedFile : internalSelectedFile;
  const setSelectedFile = controlledSetSelectedFile || setInternalSelectedFile;

  const fileData = controlledFileData !== undefined ? controlledFileData : internalFileData;
  const setFileData = controlledSetFileData || setInternalFileData;

  const dateColumn = controlledDateColumn !== undefined ? controlledDateColumn : internalDateColumn;
  const setDateColumn = controlledSetDateColumn || setInternalDateColumn;

  const outcomeColumn = controlledOutcomeColumn !== undefined ? controlledOutcomeColumn : internalOutcomeColumn;
  const setOutcomeColumn = controlledSetOutcomeColumn || setInternalOutcomeColumn;

  const locationColumn = controlledLocationColumn !== undefined ? controlledLocationColumn : internalLocationColumn;
  const setLocationColumn = controlledSetLocationColumn || setInternalLocationColumn;

  const containsZipCodes = controlledContainsZipCodes !== undefined ? controlledContainsZipCodes : internalContainsZipCodes;
  const setContainsZipCodes = controlledSetContainsZipCodes || setInternalContainsZipCodes;

  const dateFormat = controlledDateFormat !== undefined ? controlledDateFormat : internalDateFormat;
  const setDateFormat = controlledSetDateFormat || setInternalDateFormat;

  const activeTab = controlledActiveTab !== undefined ? controlledActiveTab : internalActiveTab;
  const setActiveTab = controlledSetActiveTab || setInternalActiveTab;

  const useDefaultFile = controlledUseDefaultFile !== undefined ? controlledUseDefaultFile : internalUseDefaultFile;
  const setUseDefaultFile = controlledSetUseDefaultFile || setInternalUseDefaultFile;

  const availableLocations = controlledAvailableLocations !== undefined ? controlledAvailableLocations : internalAvailableLocations;
  const setAvailableLocations = controlledSetAvailableLocations || setInternalAvailableLocations;

  const selectedTestLocations = controlledSelectedTestLocations !== undefined ? controlledSelectedTestLocations : internalSelectedTestLocations;
  const setSelectedTestLocations = controlledSetSelectedTestLocations || setInternalSelectedTestLocations;

  const testLocations = controlledTestLocations !== undefined ? controlledTestLocations : internalTestLocations;
  const setTestLocations = controlledSetTestLocations || setInternalTestLocations;

  const processCSVData = (csvData, fileName) => {
    const lines = csvData.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const headersLower = headers.map(h => String(h).trim().toLowerCase());

    const rows = lines
      .slice(1)
      .filter(line => line.trim() !== '')
      .map(line => line.split(',').map(cell => cell.trim()))
      .filter(row => row.length >= 3);

    // Detect location column index dynamically
    const toKey = (s) => String(s || '').trim().toLowerCase();
    const tryIdx = (name, fallbacks = []) => {
      const targets = [name, ...fallbacks].map(toKey);
      for (let t of targets) {
        const idx = headersLower.indexOf(t);
        if (idx !== -1) return idx;
      }
      return -1;
    };

    // Prefer user-entered locationColumn if present; else detect
    let locIdx = tryIdx(locationColumn, ['location', 'city', 'location_id', 'geo', 'market']);
    if (locIdx === -1) locIdx = tryIdx('location', ['city', 'location_id', 'geo', 'market']);

    // If still not found, fallback to the first non-numeric-looking column
    if (locIdx === -1 && rows.length > 0) {
      for (let c = 0; c < headers.length; c++) {
        const sample = rows[0][c] || '';
        if (isNaN(Number(sample))) { locIdx = c; break; }
      }
    }

    // Compute available locations using detected column
    const uniqueLocations = locIdx !== -1
      ? [...new Set(rows.map(row => row[locIdx] || ''))].filter(Boolean).sort()
      : [];

    // Persist parsed data
    setFileData({ headers, rows, totalRows: lines.length - 1 });
    setAvailableLocations(uniqueLocations);
    setSelectedTestLocations([]);
    setTestLocations('');

    // Align visible location column input if we detected a different header
    if (locIdx !== -1) {
      const detectedHeader = headers[locIdx];
      if (detectedHeader && detectedHeader !== locationColumn) {
        setLocationColumn(detectedHeader);
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file.name);
      setUseDefaultFile(false);

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
      setSelectedFile('online_mkt_us_states.csv');
      const response = await fetch('/online_mkt_us_states.csv');
      const csvData = await response.text();
      // Set correct column mappings for online_mkt_us_states.csv
      setLocationColumn('city');
      setOutcomeColumn('app_download');
      setDateColumn('date');
      processCSVData(csvData, 'online_mkt_us_states.csv');
    } catch (error) {
      console.error('Error loading default file:', error);
    }
  };

  const toggleLocationRemoval = (loc) => {
    if (removedLocations.includes(loc)) {
      setRemovedLocations(removedLocations.filter(l => l !== loc));
    } else {
      setRemovedLocations([...removedLocations, loc]);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (!pillContainerRef.current) return;
      if (!pillContainerRef.current.contains(e.target)) {
        setRemoveDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Highcharts loader
  const loadHighcharts = () => new Promise((resolve, reject) => {
    if (window.Highcharts) return resolve(window.Highcharts);
    const script = document.createElement('script');
    script.src = 'https://code.highcharts.com/highcharts.js';
    script.async = true;
    script.onload = () => resolve(window.Highcharts);
    script.onerror = reject;
    document.body.appendChild(script);
  });

  // Render combined line chart
  useEffect(() => {
    const renderChart = async () => {
      if (activeTab !== 'plot') return;
      
      // If combined chart is turned off, destroy existing chart and return
      if (!combinedLinePlot) {
        if (chartInstanceRef.current) {
          chartInstanceRef.current.destroy();
          chartInstanceRef.current = null;
        }
        return;
      }
      
      if (!fileData || !highchartsContainerRef.current) return;
      const Highcharts = await loadHighcharts();

      // Build series by city
      const cityToPoints = {};
      const headers = (fileData.headers || []).map(h => String(h).trim().toLowerCase());
      const idxCity = headers.indexOf('location') !== -1 ? headers.indexOf('location') : headers.indexOf('city');
      const idxY = headers.indexOf('y') !== -1 ? headers.indexOf('y') : headers.indexOf('app_download');
      const idxDate = headers.indexOf('date');
      if (idxCity === -1 || idxY === -1 || idxDate === -1) return;

      const dates = [];
      fileData.rows.forEach(row => {
        const city = (row[idxCity] || '').trim();
        const y = Number(row[idxY]) || 0;
        const d = (row[idxDate] || '').trim();
        if (!city) return;
        if (!cityToPoints[city]) cityToPoints[city] = [];
        cityToPoints[city].push({ d, y });
        if (!dates.includes(d)) dates.push(d);
      });
      dates.sort((a,b) => new Date(a) - new Date(b));

      const series = Object.keys(cityToPoints).map(city => {
        const map = new Map(cityToPoints[city].map(p => [p.d, p.y]));
        return {
          name: city,
          data: dates.map(d => map.has(d) ? map.get(d) : null),
          connectNulls: true
        };
      });

      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }

      chartInstanceRef.current = Highcharts.chart(highchartsContainerRef.current, {
        title: { text: 'Revenue by Location (Combined)' },
        xAxis: { categories: dates, title: { text: 'Date' } },
        yAxis: { title: { text: 'Y' } },
        legend: { enabled: true },
        credits: { enabled: false },
        series
      });
    };

    renderChart();

    // Preserve chart instance when switching tabs; clean up only on unmount
    return () => {};
  }, [combinedLinePlot, fileData, activeTab]);

  useEffect(() => {
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, []);

  const Header = (
    <div className="ingestion-header">
      {showBack && (
        <button className="back-button" onClick={onBack}>
          <ArrowLeft size={20} />
          Back
        </button>
      )}
      {showTitle && <h2 className="page-title">Step 1: Ingest data</h2>}
    </div>
  );

  const Content = (
    <>
      {showHeader && Header}

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
                  <span className="option-desc">online_mkt_us_states.csv</span>
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
              {fileData?.headers ? (
                <select
                  value={dateColumn}
                  onChange={(e) => setDateColumn(e.target.value)}
                  className="text-input"
                >
                  <option value="">Select date column...</option>
                  {fileData.headers.map((header, index) => (
                    <option key={index} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={dateColumn}
                  onChange={(e) => setDateColumn(e.target.value)}
                  className="text-input"
                  placeholder="Enter date column name"
                />
              )}
            </div>
          </div>

          <div className="form-section">
            <label className="form-label">Outcome variable column</label>
            <div className="input-with-dropdown">
              {fileData?.headers ? (
                <select
                  value={outcomeColumn}
                  onChange={(e) => setOutcomeColumn(e.target.value)}
                  className="text-input"
                >
                  <option value="">Select outcome column...</option>
                  {fileData.headers.map((header, index) => (
                    <option key={index} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={outcomeColumn}
                  onChange={(e) => setOutcomeColumn(e.target.value)}
                  className="text-input"
                  placeholder="Enter outcome column name"
                />
              )}
            </div>
          </div>

          <div className="form-section">
            <label className="form-label">Location ID column</label>
            <div className="input-with-dropdown">
              {fileData?.headers ? (
                <select
                  value={locationColumn}
                  onChange={(e) => setLocationColumn(e.target.value)}
                  className="text-input"
                >
                  <option value="">Select location column...</option>
                  {fileData.headers.map((header, index) => (
                    <option key={index} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={locationColumn}
                  onChange={(e) => setLocationColumn(e.target.value)}
                  className="text-input"
                  placeholder="Enter location column name"
                />
              )}
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
                      <p className="chart-subtitle">Revenue trends by city</p>
                    </div>
                    <div className="plot-controls" style={{ justifyContent: 'flex-end', marginBottom: 8 }}>
                      <label className="checkbox-label" style={{ gap: 6 }}>
                        <input type="checkbox" checked={combinedLinePlot} onChange={(e) => setCombinedLinePlot(e.target.checked)} />
                        <span className="checkbox-custom"></span>
                        Show combined line chart
                      </label>
                    </div>
                    <div className="chart-content city-view">
                      {combinedLinePlot ? (
                        <div style={{ width: '100%', padding: 12 }}>
                          <div ref={highchartsContainerRef} style={{ width: '100%', height: 680 }} />
                        </div>
                      ) : (
                        <div className="bar-chart">
                          {(() => {
                            if (!fileData || !fileData.rows) return null;
                            
                            const headers = fileData.headers || [];
                            const toKey = (s) => String(s || '').trim().toLowerCase();
                            const findIdx = (name, fallbacks = []) => {
                              const targets = [name, ...fallbacks].map(toKey);
                              for (let t of targets) {
                                const idx = headers.findIndex(h => toKey(h) === t);
                                if (idx !== -1) return idx;
                              }
                              return -1;
                            };

                            const locIdx = findIdx(locationColumn, ['city', 'location_id', 'geo', 'market']);
                            const yIdx = findIdx(outcomeColumn, ['y', 'outcome', 'app_download', 'revenue', 'sales']);
                            const dateIdx = findIdx(dateColumn, ['date', 'time', 'timestamp', 'day']);

                            if (locIdx === -1 || yIdx === -1 || dateIdx === -1) return null;

                            const cityData = {};
                            fileData.rows.forEach(row => {
                              const city = (row[locIdx] || '').trim();
                              const revenue = parseFloat(row[yIdx]) || 0;
                              const date = row[dateIdx];
                              if (city && !cityData[city]) {
                                cityData[city] = [];
                              }
                              if (city) {
                                cityData[city].push({ date, revenue });
                              }
                            });

                            const cities = Object.keys(cityData).sort();
                            const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#ef4444'];

                            return (
                              <div className="city-charts-grid">
                                {cities.map((city, cityIndex) => {
                                  const cityRows = cityData[city];
                                  const color = colors[cityIndex % colors.length];
                                  // Use this city's max revenue for scaling instead of global max
                                  const maxRevenue = Math.max(...cityRows.map(d => d.revenue));

                                  return (
                                    <div key={cityIndex} className="city-area-chart">
                                      <h4 className="city-title">{city}</h4>
                                      <div className="area-chart-container">
                                        <svg className="area-chart" viewBox="-50 0 450 320" preserveAspectRatio="xMidYMid meet">
                                          {[0, 25, 50, 75, 100].map((y, i) => (
                                            <line key={i} x1="0" y1={250 - y * 2.5} x2="400" y2={250 - y * 2.5} stroke="#e5e7eb" strokeWidth="1" />
                                          ))}
                                          {[0, 25, 50, 75, 100].map((x, i) => (
                                            <line key={i} x1={x * 4} y1="0" x2={x * 4} y2="250" stroke="#e5e7eb" strokeWidth="1" />
                                          ))}

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

                                          {cityRows.map((dataPoint, index) => {
                                            const x = (index / (cityRows.length - 1)) * 400;
                                            const y = 250 - (dataPoint.revenue / maxRevenue) * 250;
                                            return <circle key={index} cx={x} cy={y} r="4" fill={color} stroke="white" strokeWidth="1" />;
                                          })}

                                          {/* Y-axis labels scaled to this city's max */}
                                          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                                            const value = maxRevenue * ratio;
                                            const y = 250 - ratio * 250;
                                            return (
                                              <text key={i} x="-20" y={y + 3} fontSize="10" fill="#6b7280" textAnchor="end">
                                                {value.toLocaleString()}
                                              </text>
                                            );
                                          })}

                                          <text x="-40" y="125" fontSize="12" fill="#374151" textAnchor="middle" transform="rotate(-90, -40, 125)" fontWeight="500">
                                            Revenue ($)
                                          </text>

                                          {cityRows.length > 0 && (
                                            <>
                                              <text x="200" y="300" fontSize="12" fill="#374151" textAnchor="middle" fontWeight="500">
                                                Time (Day)
                                              </text>
                                              <text x="0" y="285" fontSize="10" fill="#6b7280" textAnchor="middle">
                                                Feb 2024
                                              </text>
                                              <text x="400" y="285" fontSize="10" fill="#6b7280" textAnchor="middle">
                                                Apr 2024
                                              </text>
                                              {cityRows.map((dataPoint, index) => {
                                                if (index % Math.ceil(cityRows.length / 5) === 0 || index === cityRows.length - 1) {
                                                  const x = (index / (cityRows.length - 1)) * 400;
                                                  const date = new Date(dataPoint.date);
                                                  const month = date.toLocaleDateString('en-US', { month: 'short' });
                                                  const day = date.getDate();
                                                  return (
                                                    <g key={index}>
                                                      <line x1={x} y1="250" x2={x} y2="255" stroke="#6b7280" strokeWidth="1" />
                                                      <text x={x} y="275" fontSize="9" fill="#6b7280" textAnchor="middle">
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
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="upload-prompt">Plot will appear here after data ingestion</p>
              )
            )}
          </div>

          {fileData && (
            <div className="post-upload-options">
              <div className="toggle-grid">
                <label className="switch-label">
                  <input type="checkbox" checked={trimMostlyZero} onChange={(e) => setTrimMostlyZero(e.target.checked)} />
                  <span className="switch"></span>
                  <span className="switch-text">Trim Mostly Zero Locations <Info size={14} className="info-icon" /></span>
                </label>

                <label className="switch-label">
                  <input type="checkbox" checked={clipOutliers} onChange={(e) => setClipOutliers(e.target.checked)} />
                  <span className="switch"></span>
                  <span className="switch-text">Clip Outliers <Info size={14} className="info-icon" /></span>
                </label>

                <label className="switch-label">
                  <input type="checkbox" checked={trimToLastEnabled} onChange={(e) => setTrimToLastEnabled(e.target.checked)} />
                  <span className="switch"></span>
                  <span className="switch-text">Trim to Last
                    <input
                      type="number"
                      min="1"
                      className="inline-number"
                      value={trimToLastDays}
                      onChange={(e) => setTrimToLastDays(e.target.value)}
                      disabled={!trimToLastEnabled}
                    />
                    days
                    <Info size={14} className="info-icon" />
                  </span>
                </label>

                <label className="switch-label">
                  <input type="checkbox" checked={checkProblems} onChange={(e) => setCheckProblems(e.target.checked)} />
                  <span className="switch"></span>
                  <span className="switch-text">Seasonality<Info size={14} className="info-icon" /></span>
                </label>
              </div>

              <div className="remove-locations">
                <div className="remove-title">Remove Locations</div>
                <div className="remove-subtitle">Remove specific locations before designing the experiment.</div>
                <div className="pill-input pill-select" ref={pillContainerRef} onClick={() => setRemoveDropdownOpen(!removeDropdownOpen)}>
                  {removedLocations.length === 0 && (
                    <span className="pill-placeholder">Select locations to remove...</span>
                  )}
                  {removedLocations.map((loc) => (
                    <span key={loc} className="pill">
                      {loc}
                      <button
                        type="button"
                        className="pill-remove"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRemovedLocations(removedLocations.filter(l => l !== loc));
                        }}
                        aria-label={`Remove ${loc}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {removeDropdownOpen && (
                    <div className="pill-dropdown">
                      {availableLocations.map((loc) => (
                        <button
                          type="button"
                          key={loc}
                          className={`pill-option ${removedLocations.includes(loc) ? 'selected' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLocationRemoval(loc);
                          }}
                        >
                          {loc}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <small className="input-help">Choices come from your uploaded file's locations.</small>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );

  if (!withPageWrapper) {
    return Content;
  }

  return (
    <div className="data-ingestion-page">
      {Content}
    </div>
  );
};

export default IngestDataStep; 