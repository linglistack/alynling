import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Table } from 'antd';
import { Resizable } from 'react-resizable';
import './ConfigureExperiment.css';
import './DataIngestionForm.css'; // For tab styles
import CellAdvancedConfig from './CellAdvancedConfig';
import { geoliftAPI } from '../utils/geoliftAPI';
import tooltips from '../config/geoliftTooltips.json';
import TooltipInfo from './TooltipInfo';
import LocationSelectionModal from './LocationSelectionModal';

const loadHighcharts = () => new Promise((resolve, reject) => {
  if (window.Highcharts) return resolve(window.Highcharts);
  const s = document.createElement('script');
  s.src = 'https://code.highcharts.com/highcharts.js';
  s.onload = () => resolve(window.Highcharts);
  s.onerror = reject;
  document.body.appendChild(s);
});

const makeEmptyCell = (index) => ({
  id: index + 1,
  channelName: '',
  cpic: '',
  objective: 'lift',
  budget: '',
  advanced: {},
  locations: {
    included: [],
    excluded: []
  }
});

const getTip = (id) => ({
  title: (tooltips[id] && tooltips[id].question) || '',
  content: (tooltips[id] && tooltips[id].example) || ''
});

const ConfigureExperiment = ({ processedData, cachedResults, onCacheResults, isPreCallingMarketSelection, marketSelectionProgress }) => {
  const [experimentName, setExperimentName] = useState('');
  const [numExperiments, setNumExperiments] = useState(1);
  const [cells, setCells] = useState([makeEmptyCell(0)]);



  // Right panel state
  const [msLoading, setMsLoading] = useState(false);
  const [msError, setMsError] = useState('');
  const [marketCombos, setMarketCombos] = useState([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [manualProgress, setManualProgress] = useState(0);
  const [resultsClearedReason, setResultsClearedReason] = useState(null);
  const [activeRightTab, setActiveRightTab] = useState('table'); // 'table' or 'analyze'

  // Analysis state (for Step 3 charts)
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [analysisResp, setAnalysisResp] = useState(null);
  const chartObsRef = useRef(null);
  const chartPowerRef = useRef(null);
  const chartObservationsRef = useRef(null); // New ref for observations chart
  const chartObs = useRef(null);
  const chartPower = useRef(null);
  const chartObservations = useRef(null); // New chart instance ref
  
  // Column width state for resizing
  const [columnWidths, setColumnWidths] = useState({});
  
  // Dynamic table height based on left panel
  const [tableHeight, setTableHeight] = useState('calc(100vh - 180px)');
  
  // Location selection modal state
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [editingCellIndex, setEditingCellIndex] = useState(null);

  // Extract available locations from processedData
  const availableLocations = useMemo(() => {
    if (!processedData || !Array.isArray(processedData)) return [];
    const locations = [...new Set(processedData.map(row => row.location))].filter(Boolean).sort();
    console.log('[ConfigureExperiment] Available locations from data:', {
      total: locations.length,
      first10: locations.slice(0, 10),
      sample: locations.slice(0, 5)
    });
    return locations;
  }, [processedData]);

  // Initialize from cache if available
  useEffect(() => {
    if (cachedResults && cachedResults.marketCombos) {
      console.log('[ConfigureExperiment] Loading from cache:', cachedResults);
      setMarketCombos(cachedResults.marketCombos);
      setMsError(cachedResults.msError || '');
      setMsLoading(false);
    }
  }, [cachedResults]);

  // Handle pre-call completion
  useEffect(() => {
    if (!isPreCallingMarketSelection && cachedResults) {
      console.log('[ConfigureExperiment] Pre-call completed, using cached results');
      setMsLoading(false);
    }
  }, [isPreCallingMarketSelection, cachedResults]);

  // Dynamic height adjustment based on left panel content
  useEffect(() => {
    const adjustTableHeight = () => {
      const leftPanel = document.querySelector('.configure-left');
      const rightPanel = document.querySelector('.configure-right');
      const resultsCard = document.querySelector('.results-card');
      
      if (leftPanel && rightPanel && resultsCard) {
        const leftPanelHeight = leftPanel.offsetHeight;
        
        // Set right panel to match left panel height
        rightPanel.style.height = `${leftPanelHeight}px`;
        
        // Calculate available height for table within results card
        const resultsTitle = resultsCard.querySelector('.results-title');
        const titleHeight = resultsTitle ? resultsTitle.offsetHeight : 0;
        const cardPadding = 32; // 16px padding * 2
        const tableMargin = 16; // margin-top on table wrapper
        
        const availableTableHeight = leftPanelHeight - titleHeight - cardPadding - tableMargin;
        setTableHeight(`${Math.max(availableTableHeight, 200)}px`); // Minimum 200px height
      }
    };

    // Adjust on mount and window resize
    const debouncedAdjustHeight = () => {
      // Add small delay to ensure DOM changes are complete
      setTimeout(adjustTableHeight, 50);
    };
    
    adjustTableHeight();
    window.addEventListener('resize', debouncedAdjustHeight);
    
    // Use MutationObserver to watch for left panel changes (advanced config collapse/expand)
    const leftPanel = document.querySelector('.configure-left');
    if (leftPanel) {
      const observer = new MutationObserver(debouncedAdjustHeight);
      observer.observe(leftPanel, { 
        childList: true, 
        subtree: true, 
        attributes: true,
        attributeFilter: ['class', 'style']
      });
      
      // Also observe when panels are first rendered
      const configureSplit = document.querySelector('.configure-split');
      let splitObserver;
      if (configureSplit) {
        splitObserver = new MutationObserver(debouncedAdjustHeight);
        splitObserver.observe(configureSplit, { childList: true, subtree: true });
      }
      
      return () => {
        window.removeEventListener('resize', debouncedAdjustHeight);
        observer.disconnect();
        if (splitObserver) splitObserver.disconnect();
      };
    }

    return () => {
      window.removeEventListener('resize', debouncedAdjustHeight);
    };
  }, []);

  // Additional effect to handle initial layout after component mount
  useEffect(() => {
    const timer = setTimeout(() => {
      const adjustTableHeight = () => {
        const leftPanel = document.querySelector('.configure-left');
        const rightPanel = document.querySelector('.configure-right');
        const resultsCard = document.querySelector('.results-card');
        
        if (leftPanel && rightPanel && resultsCard) {
          const leftPanelHeight = leftPanel.offsetHeight;
          rightPanel.style.height = `${leftPanelHeight}px`;
          
          const resultsTitle = resultsCard.querySelector('.results-title');
          const titleHeight = resultsTitle ? resultsTitle.offsetHeight : 0;
          const cardPadding = 32;
          const tableMargin = 16;
          
          const availableTableHeight = leftPanelHeight - titleHeight - cardPadding - tableMargin;
          setTableHeight(`${Math.max(availableTableHeight, 200)}px`);
        }
      };
      adjustTableHeight();
    }, 100); // Small delay to ensure DOM is ready

    return () => clearTimeout(timer);
  }, [marketCombos]); // Re-run when market combinations change

  useEffect(() => {
    setCells((prev) => {
      const next = [...prev];
      if (numExperiments > prev.length) {
        for (let i = prev.length; i < numExperiments; i += 1) {
          next.push(makeEmptyCell(i));
        }
      } else if (numExperiments < prev.length) {
        next.length = numExperiments;
      }
      return next.map((c, i) => ({ ...c, id: i + 1 }));
    });
  }, [numExperiments]);

  const updateCell = (index, field, value) => {
    setCells((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
  };

  const openLocationModal = (cellIndex) => {
    setEditingCellIndex(cellIndex);
    setLocationModalOpen(true);
  };

  const handleLocationSave = (locationData) => {
    if (editingCellIndex !== null) {
      updateCell(editingCellIndex, 'locations', locationData);
      
      // NOTE: We no longer clear market selection results when location filters change
      // The table will persist until the user explicitly clicks "Run Selection"
      console.log('[ConfigureExperiment] Location filters updated, keeping existing table results');
      
      // Invalidate cache to ensure fresh run is needed when "Run Selection" is clicked
      if (onCacheResults) {
        onCacheResults(null);
      }
    }
    setLocationModalOpen(false);
    setEditingCellIndex(null);
  };

  const getLocationSummary = (locations) => {
    // Use state names for display if available, otherwise fall back to city names
    const included = locations.includedStates || locations.included || [];
    const excluded = locations.excludedStates || locations.excluded || [];
    
    if (excluded.length > 0 && included.length > 0) {
      return `${included.length} included, ${excluded.length} excluded`;
    } else if (excluded.length > 0) {
      return `${excluded.length} excluded`;
    } else if (included.length > 0) {
      return `${included.length} included`;
    }
    return 'All locations';
  };

  const canProceed = experimentName.trim().length > 0;

  // Use parameters from the first cell's advanced config (since all cells will have same market selection params)
  const treatmentPeriods = useMemo(() => {
    const firstCell = cells[0];
    const n = Number(firstCell?.advanced?.treatmentPeriods);
    return Number.isFinite(n) && n > 0 ? n : 28;
  }, [cells]);

  const cpic = useMemo(() => {
    const firstCell = cells[0];
    const n = Number(firstCell?.advanced?.cpic);
    return Number.isFinite(n) && n > 0 ? n : 1;
  }, [cells]);

  const lookbackWindow = useMemo(() => {
    const firstCell = cells[0];
    const n = Number(firstCell?.advanced?.lookbackWindow);
    return Number.isFinite(n) && n > 0 ? n : 1;
  }, [cells]);

  const alpha = useMemo(() => {
    const firstCell = cells[0];
    const n = Number(firstCell?.advanced?.alpha);
    return Number.isFinite(n) && n > 0 ? n : 0.1;
  }, [cells]);

  const budget = useMemo(() => {
    const firstCell = cells[0];
    const n = Number(firstCell?.advanced?.testAmount);
    return Number.isFinite(n) && n > 0 ? n : 100000;
  }, [cells]);

  const numTestGeos = useMemo(() => {
    const firstCell = cells[0];
    const n = Number(firstCell?.advanced?.numTestGeos);
    return Number.isFinite(n) && n >= 2 ? n : 2;
  }, [cells]);

  const effectSize = useMemo(() => {
    const firstCell = cells[0];
    const csvString = firstCell?.advanced?.effectSizeCsv || '0,0.05,0.1,0.15,0.2,0.25';
    const parts = csvString.split(',').map(s => Number(String(s).trim())).filter(n => Number.isFinite(n));
    return parts.length > 0 ? parts : [0, 0.05, 0.1, 0.15, 0.2, 0.25];
  }, [cells]);

  // Progress simulation for manual runs
  const simulateProgress = () => {
    setManualProgress(0);
    const progressInterval = setInterval(() => {
      setManualProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90; // Stop at 90% until API completes
        }
        // Accelerate progress early, then slow down
        const increment = prev < 30 ? 8 : prev < 60 ? 4 : 2;
        return Math.min(prev + increment, 90);
      });
    }, 200); // Update every 200ms
    return progressInterval;
  };

  const runMarketSelection = async () => {
    if (!processedData) return;
      // Get fresh location filters from first cell (all cells should have same location constraints for market selection)
      const currentCellLocations = cells[0]?.locations || { included: [], excluded: [] };
      let progressInterval = null;

    try {
      setMsLoading(true);
      setMsError('');
      
      // Clear previous results when starting a new market selection run
      console.log('[MarketSelection] Clearing previous results for new run');
      setMarketCombos([]);
      setSelectedRowKeys([]);
      setSelectedRows([]);
      setResultsClearedReason(null);
      
      // Start progress simulation for manual runs
      if (!isPreCallingMarketSelection) {
        progressInterval = simulateProgress();
      }
      
      console.log('[MarketSelection][request]', {
        treatmentPeriods,
        effectSize,
        lookbackWindow,
        cpic,
        alpha,
        budget,
        numTestGeos,
        dataRows: Array.isArray(processedData) ? processedData.length : undefined,
        locationFilters: {
          includedLocations: currentCellLocations.included,
          excludedLocations: currentCellLocations.excluded,
          includedCount: currentCellLocations.included?.length || 0,
          excludedCount: currentCellLocations.excluded?.length || 0
        }
      });
   
      const resp = await geoliftAPI.marketSelection(processedData, {
        treatmentPeriods,
        effectSize,
        lookbackWindow,
        cpic,
        alpha,
        budget,
        numTestGeos,
        includedLocations: currentCellLocations.included,
        excludedLocations: currentCellLocations.excluded
      });
      console.log('[MarketSelection][response]', resp);
      if (!resp.success) throw new Error('Market selection failed');
      const combos = resp.market_selection || [];
      setMarketCombos(combos);
      
      // Complete progress for manual runs
      if (!isPreCallingMarketSelection) {
        setManualProgress(100);
      }
      
      // Clear row selection when new results come in
      setSelectedRowKeys([]);
      setSelectedRows([]);
      setResultsClearedReason(null); // Clear the reason since we have new results
      
      // Cache the results with dependency fingerprint
      if (onCacheResults) {
        onCacheResults({
          marketCombos: combos,
          msError: '',
          timestamp: Date.now(),
          // Store dependency values to detect changes
          dependencies: {
            treatmentPeriods,
            effectSize,
            lookbackWindow,
            cpic,
            alpha,
            dataLength: Array.isArray(processedData) ? processedData.length : 0,
            locationFilters: JSON.stringify(currentCellLocations)
          }
        });
      }
    } catch (e) {
      console.error('[MarketSelection][error]', e);
      const errorMsg = e.message || 'Market selection failed';
      setMsError(errorMsg);
      
      // Cache the error state with dependency fingerprint
      if (onCacheResults) {
        onCacheResults({
          marketCombos: [],
          msError: errorMsg,
          timestamp: Date.now(),
          dependencies: {
            treatmentPeriods,
            effectSize,
            lookbackWindow,
            cpic,
            alpha,
            dataLength: Array.isArray(processedData) ? processedData.length : 0,
            locationFilters: JSON.stringify(currentCellLocations)
          }
        });
      }
    } finally {
      // Complete progress and cleanup
      if (!isPreCallingMarketSelection) {
        if (progressInterval) {
          clearInterval(progressInterval);
        }
        setManualProgress(100);
        // Brief delay to show 100% before hiding
        setTimeout(() => {
          setMsLoading(false);
          setManualProgress(0);
        }, 300);
      } else {
        setMsLoading(false);
      }
    }
  };

  const runAnalysis = async () => {
    if (!processedData) return;
    
    // Check if a row is selected
    if (selectedRows.length === 0) {
      setAnalysisError('Please select a market combination from the table to analyze');
      return;
    }
    
    try {
      setAnalysisLoading(true);
      setAnalysisError('');
      
      // Get the selected row data
      const selectedRow = selectedRows[0]; // Use first selected row
      console.log('[ConfigureExperiment][Analysis] Selected row:', selectedRow);
      
      // Extract locations from the selected row
      // Try different possible location field names
      const locations = selectedRow.locations || 
                       selectedRow.test_markets || 
                       selectedRow.markets || 
                       selectedRow.location || 
                       [];
      
      // Ensure locations is an array
      const locationsArray = Array.isArray(locations) ? locations : [locations].filter(Boolean);
      
      if (locationsArray.length === 0) {
        setAnalysisError('Selected market combination has no valid locations');
        return;
      }
      
      // Safety check for treatmentPeriods value
      if (!Number.isFinite(treatmentPeriods) || treatmentPeriods > 10000) {
        setAnalysisError(`Invalid treatment periods value: ${treatmentPeriods}. Please check your experiment configuration.`);
        return;
      }
      
      console.log('[ConfigureExperiment][Analysis][request]', {
        selectedRow: selectedRow,
        locations: locationsArray,
        alpha: alpha, // Show dynamic alpha
        treatmentPeriods,
        marketRank: selectedRow.ID || selectedRow.id || selectedRow.rank || 1,
        dataRows: Array.isArray(processedData) ? processedData.length : undefined
      });
      
      // Call the EDA plots API with dynamic parameters
      // This API will:
      // 1. Use the selected market combination (marketRank) from the table
      // 2. Calculate treatment start/end times automatically based on treatmentPeriods
      // 3. Apply the dynamic alpha value from advanced config
      // 4. Return observation data and power curve for visualization
      const data = await geoliftAPI.edaPlots(
        processedData,
        {
          treatmentPeriods: treatmentPeriods,
          alpha: alpha, // Use dynamic alpha from advanced config
          marketRank: selectedRow.ID || selectedRow.id || selectedRow.rank || 1, // Use selected row's market rank
          effectSize: effectSize,
          lookbackWindow: lookbackWindow,
          cpic: cpic
        }
      );
      
      console.log('[ConfigureExperiment][Analysis][response]', data);
      setAnalysisResp(data);
      
      // Switch to analyze tab to show results
      setActiveRightTab('analyze');
    } catch (e) {
      console.error('[ConfigureExperiment][Analysis][error]', e);
      const errorMsg = e.message || 'Analysis failed';
      setAnalysisError(errorMsg);
      
      // Switch to analyze tab to show error
      setActiveRightTab('analyze');
    } finally {
      setAnalysisLoading(false);
    }
  };

  useEffect(() => {
    // Only handle pre-call completion, don't auto-run market selection
    if (isPreCallingMarketSelection) {
      console.log('[ConfigureExperiment] Pre-call in progress, waiting...');
      setMsLoading(true);
      return;
    }

    // If pre-call just completed and we have cached results, use them
    if (cachedResults && cachedResults.marketCombos) {
      console.log('[ConfigureExperiment] Using cached market selection results');
      setMarketCombos(cachedResults.marketCombos);
      setMsLoading(false);
      setMsError('');
    }
  }, [isPreCallingMarketSelection, cachedResults]);

  // Chart rendering effect
  useEffect(() => {
    if (!analysisResp) return;
    let destroyed = false;
    (async () => {
      const Highcharts = await loadHighcharts();
      if (destroyed) return;

      const obs = analysisResp.observations || [];
      const treatmentStart = analysisResp?.treatment_window?.start_time;
      const treatmentEnd = analysisResp?.treatment_window?.end_time;

      const times = [...new Set(obs.map(o => o.time))].sort((a,b)=>a-b);
      const byGroup = { Control: {}, Treatment: {} };
      obs.forEach(o => { byGroup[o.group] = byGroup[o.group] || {}; byGroup[o.group][o.time] = o.value_smooth ?? o.value; });
      
      // Calculate ATT (Average Treatment Effect) as Treatment - Control for each time point
      const attData = times.map(t => {
        const treatmentValue = byGroup.Treatment && byGroup.Treatment[t] != null ? Number(byGroup.Treatment[t]) : null;
        const controlValue = byGroup.Control && byGroup.Control[t] != null ? Number(byGroup.Control[t]) : null;
        
        if (treatmentValue != null && controlValue != null) {
          return treatmentValue - controlValue;
        }
        return null;
      });

      const series = [
        {
          name: 'ATT (Treatment - Control)',
          data: attData,
          color: '#667eea',
          lineWidth: 2
        }
      ];

      if (chartObs.current) chartObs.current.destroy();
      chartObs.current = Highcharts.chart(chartObsRef.current, {
        title: { text: 'Average Treatment Effect (ATT) Over Time' },
        xAxis: { categories: times, title: { text: 'Time Period' }, plotBands: (Number.isFinite(treatmentStart) && Number.isFinite(treatmentEnd)) ? [{
          color: 'rgba(102,126,234,0.15)',
          from: times.indexOf(treatmentStart),
          to: times.indexOf(treatmentEnd),
          label: { text: 'Treatment Period', style: { color: '#667eea', fontWeight: 'bold' } }
        }] : [] },
        yAxis: { 
          title: { text: 'ATT Value' },
          plotLines: [{
            value: 0,
            color: '#666',
            width: 1,
            dashStyle: 'Dash',
            label: { text: 'No Effect', align: 'right', style: { color: '#666' } }
          }]
        },
        legend: { enabled: true },
        series
      });

      // Render observations per timestamp chart
      const observationsSeries = [
        {
          name: 'Control',
          data: times.map(t => byGroup.Control && byGroup.Control[t] != null ? Number(byGroup.Control[t]) : null),
          color: '#6b7280',
          lineWidth: 2,
          dashStyle: 'Dash' // Dotted line for control
        },
        {
          name: 'Treatment', 
          data: times.map(t => byGroup.Treatment && byGroup.Treatment[t] != null ? Number(byGroup.Treatment[t]) : null),
          color: '#667eea',
          lineWidth: 2,
          dashStyle: 'Solid' // Solid line for treatment
        }
      ];

      if (chartObservations.current) chartObservations.current.destroy();
      chartObservations.current = Highcharts.chart(chartObservationsRef.current, {
        title: { text: 'Observations per Timestamp and Test Group' },
        xAxis: { 
          categories: times, 
          title: { text: 'Time Period' },
          plotBands: (Number.isFinite(treatmentStart) && Number.isFinite(treatmentEnd)) ? [{
            color: 'rgba(150, 150, 150, 0.2)', // Grey shade for treatment period
            from: times.indexOf(treatmentStart),
            to: times.indexOf(treatmentEnd),
            label: { text: 'Treatment Period', style: { color: '#666', fontWeight: 'bold' } }
          }] : []
        },
        yAxis: { 
          title: { text: 'Observations' }
        },
        series: observationsSeries,
        legend: {
          enabled: true
        }
      });

      // Render power curve chart
      const eff = analysisResp?.power_curve?.effect_size || [];
      const pow = analysisResp?.power_curve?.power || [];

      if (chartPower.current) chartPower.current.destroy();
      chartPower.current = Highcharts.chart(chartPowerRef.current, {
        title: { text: 'GeoLift Power Curve' },
        xAxis: { categories: eff.map(e => Number(e)), title: { text: 'Effect Size' } },
        yAxis: { title: { text: 'Power' }, max: 1, labels: { formatter() { return `${Math.round(this.value*100)}%`; } } },
        series: [{ name: 'Power', data: pow.map(p => Number(p)) }]
      });
    })();
    return () => { destroyed = true; };
  }, [analysisResp]);

  return (
    <div className="configure-split">
      <div className="configure-left">
        <div className="configure-experiment">
          <div className="config-card">
            <div className="config-row single-col">
              <div className="config-field">
                <label className="config-label">Experiment Name</label>
                <input
                  type="text"
                  className="config-input"
                  placeholder="Enter experiment name"
                  value={experimentName}
                  onChange={(e) => setExperimentName(e.target.value)}
                />
              </div>
              <div className="config-field">
                <label className="config-label">Number of Experiments</label>
                <div className="segment">
                  {[1, 2, 3].map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={`segment-item ${numExperiments === n ? 'active' : ''}`}
                      onClick={() => setNumExperiments(n)}
                    >
                      {n === 1 ? 'One' : n === 2 ? 'Two' : 'Three'} Experiments
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {cells.map((cell, idx) => (
            <div className="cell-card" key={cell.id}>
              <div className="cell-title">Cell {cell.id} Configuration</div>
              <div className="cell-grid single-col">
                <div className="cell-field">
                  <label className="config-label">Channel Name</label>
                  <input
                    type="text"
                    className="config-input"
                    placeholder="Enter channel name"
                    value={cell.channelName}
                    onChange={(e) => updateCell(idx, 'channelName', e.target.value)}
                  />
                </div>
                
                <div className="cell-field">
                  <label className="config-label">Location Selection</label>
                  <div className="location-selection-input" onClick={() => openLocationModal(idx)}>
                    <span className="location-summary">
                      {getLocationSummary(cell.locations)}
                    </span>
                    <span className="location-edit-icon">✏️</span>
                  </div>
                </div>
              </div>

              <CellAdvancedConfig
                value={cell.advanced}
                onChange={(next) => updateCell(idx, 'advanced', next)}
              />
            </div>
          ))}

          <div className="config-actions">
            <button
              type="button"
              className={`secondary-btn ${msLoading ? 'disabled' : ''}`}
              disabled={msLoading}
              onClick={runMarketSelection}
            >
              {msLoading ? 'Running…' : 'Run Selection'}
            </button>
          </div>
        </div>
      </div>

      <div className="configure-right">
        <div className="results-card">
          <div className="tabs">
            <button
              className={`tab-button ${activeRightTab === 'table' ? 'active' : ''}`}
              onClick={() => setActiveRightTab('table')}
            >
              Candidate Markets
            </button>
            <button
              className={`tab-button ${activeRightTab === 'analyze' ? 'active' : ''}`}
              onClick={() => setActiveRightTab('analyze')}
            >
              Analysis Results
            </button>
          </div>
          <div className="tab-content" style={{ overflow: 'auto', flex: 1, padding: '16px 0', display: 'flex', flexDirection: 'column' }}>
            {activeRightTab === 'table' && (
              <>
          {msLoading ? (
            <div className="results-loading">
              <div className="loading-text">
                {isPreCallingMarketSelection ? 'Loading market selection…' : 'Computing market selection…'}
              </div>
              <div className="progress-container">
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${Math.min(isPreCallingMarketSelection ? marketSelectionProgress : manualProgress, 100)}%` }}
                  ></div>
                </div>
                <div className="progress-text">
                  {Math.round(isPreCallingMarketSelection ? marketSelectionProgress : manualProgress)}%
                </div>
              </div>
              <div className="loading-subtitle">
                This may take up to 1 minute for large datasets
              </div>
            </div>
          ) : msError ? (
            <div className="results-error">{msError}</div>
          ) : marketCombos && marketCombos.length > 0 ? (
            (() => {
              const first = marketCombos[0] || {};
              const allKeys = Object.keys(first);

              // Define which columns to show (prioritize rank over id)
              const allowedColumns = [
                'rank', 'ranking', 'location', 'locations', 'markets', 'test_markets',
                'effect_size', 'effectsize', 'effect',
                'average_att', 'att', 'avg_att', 'average_effect',
                'investment', 'budget', 'cost'
              ];

              // Create a mapping of API keys to their categories, then filter in priority order
              const keyMapping = {};
              allKeys.forEach(key => {
                const lowerKey = key.toLowerCase();
                for (const allowed of allowedColumns) {
                  const lowerAllowed = allowed.toLowerCase();
                  if (lowerKey.includes(lowerAllowed) || lowerAllowed.includes(lowerKey)) {
                    if (!keyMapping[allowed]) {
                      keyMapping[allowed] = key; // First match wins
                    }
                    break; // Stop at first match to avoid duplicates
                  }
                }
              });

              // Get filtered keys in priority order
              const filteredKeys = allowedColumns
                .filter(allowed => keyMapping[allowed])
                .map(allowed => keyMapping[allowed]);

              // Prepare data with unique keys first (needed for width calculation)
              const dataSource = marketCombos.map((row, index) => ({
                ...row,
                key: index
              }));

              const getColumnTitle = (k) => {
                // Custom labels for specific columns
                const labelMap = {
                  'rank': 'Rank',
                  'ranking': 'Rank',
                  'location': 'Location',
                  'locations': 'Location', 
                  'markets': 'Location',
                  'test_markets': 'Location',
                  'effect_size': 'Effect Size',
                  'effectsize': 'Effect Size',
                  'effect': 'Effect Size',
                  'average_att': 'Average ATT',
                  'att': 'Average ATT',
                  'avg_att': 'Average ATT',
                  'average_effect': 'Average ATT',
                  'investment': 'Investment',
                  'budget': 'Investment',
                  'cost': 'Investment'
                };
                
                const lowerKey = k.toLowerCase();
                for (const [pattern, label] of Object.entries(labelMap)) {
                  if (lowerKey.includes(pattern) || pattern.includes(lowerKey)) {
                    return label;
                  }
                }
                
                return k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
              };

              const formatValue = (v, key) => {
                if (Array.isArray(v)) return v.filter(Boolean).join(', ');
                if (v == null) return '';
                if (typeof v === 'object') return JSON.stringify(v);
                if (typeof v === 'number') {
                  if (/revenue|budget|amount|lift|value|investment|cost/i.test(key)) {
                    return v.toLocaleString();
                  }
                  if (/effect|att/i.test(key)) {
                    return v.toFixed(3);
                  }
                  return v.toLocaleString();
                }
                return String(v);
              };

              // Resizable title component
              const ResizableTitle = (props) => {
                const { onResize, width, ...restProps } = props;

                if (!width) {
                  return <th {...restProps} />;
                }

                return (
                  <Resizable
                    width={width}
                    height={0}
                    handle={
                      <span
                        className="react-resizable-handle"
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      />
                    }
                    onResize={onResize}
                    draggableOpts={{ enableUserSelectHack: false }}
                  >
                    <th {...restProps} />
                  </Resizable>
                );
              };

              // Helper function to calculate column width based on content + header + icons
              const calculateColumnWidth = (key, title, dataSource) => {
                // Calculate max content width
                const maxContentLength = Math.max(
                  ...dataSource.map(row => String(formatValue(row[key], key) || '').length),
                  title.length
                );
                
                // Base width calculation: 8px per character + padding + icons
                const baseWidth = maxContentLength * 8 + 32; // 32px for padding
                const iconSpace = 40; // Extra space for sort + filter icons
                const minWidth = 80; // Minimum column width
                const maxWidth = 300; // Maximum column width to prevent too wide columns
                
                return Math.min(Math.max(baseWidth + iconSpace, minWidth), maxWidth);
              };

              // Handle column resize
              const handleResize = (index) => (e, { size }) => {
                const newColumns = [...columns];
                newColumns[index] = {
                  ...newColumns[index],
                  width: size.width,
                };
                setColumnWidths(prev => ({
                  ...prev,
                  [filteredKeys[index]]: size.width
                }));
              };

              // Create Ant Design table columns
              const columns = filteredKeys.map((key, index) => {
                const title = getColumnTitle(key);
                const isNumeric = /number|rank|effect|att|investment|budget|cost/i.test(key);
                const isLocation = /location|market/i.test(key);
                const defaultWidth = calculateColumnWidth(key, title, dataSource);
                const width = columnWidths[key] || defaultWidth;
                
                return {
                  title: title,
                  dataIndex: key,
                  key: key,
                  width: width,
                  align: isNumeric ? 'right' : 'left',
                  onHeaderCell: (column) => ({
                    width: column.width,
                    onResize: handleResize(index),
                  }),
                  sorter: (a, b) => {
                    const aVal = a[key];
                    const bVal = b[key];
                    
                    // Handle numeric sorting
                    if (typeof aVal === 'number' && typeof bVal === 'number') {
                      return aVal - bVal;
                    }
                    
                    // Handle string sorting
                    const aStr = String(aVal || '').toLowerCase();
                    const bStr = String(bVal || '').toLowerCase();
                    return aStr.localeCompare(bStr);
                  },
                  filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
                    <div style={{ padding: 8 }}>
                      <input
                        placeholder={`Search ${title}`}
                        value={selectedKeys[0]}
                        onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
                        onPressEnter={() => confirm()}
                        style={{ width: 188, marginBottom: 8, display: 'block', padding: '4px 8px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <button 
                          type="button" 
                          onClick={() => confirm()}
                          style={{ marginRight: 8, padding: '4px 8px', background: '#1890ff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          Search
                        </button>
                        <button 
                          type="button" 
                          onClick={() => { clearFilters(); confirm(); }}
                          style={{ padding: '4px 8px', background: '#f5f5f5', border: '1px solid #d9d9d9', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  ),
                  onFilter: (value, record) => {
                    const recordValue = String(record[key] || '').toLowerCase();
                    return recordValue.includes(String(value).toLowerCase());
                  },
                  render: (value) => formatValue(value, key)
                };
              });

              const rowSelection = {
                type: 'radio', // Single selection
                selectedRowKeys,
                onChange: (selectedKeys, selectedRowsData) => {
                  console.log('[Table] Row selection changed:', { selectedKeys, selectedRowsData });
                  setSelectedRowKeys(selectedKeys);
                  setSelectedRows(selectedRowsData);
                },
                onSelect: (record, selected, selectedRowsData) => {
                  console.log('[Table] Row selected:', { record, selected });
                },
              };

              return (
                <div className="antd-table-wrapper" id="candidate-markets-table">
                  <Table
                    columns={columns}
                    dataSource={dataSource}
                    pagination={false}
                    rowSelection={rowSelection}
                    scroll={{ 
                      y: tableHeight, // Dynamic height that matches left panel
                      x: 'max-content' // Auto width based on content
                    }}
                    size="small"
                    bordered
                    showSorterTooltip={false}
                    tableLayout="auto" // Auto-size columns based on content
                    components={{
                      header: {
                        cell: ResizableTitle,
                      },
                    }}
                  />
                </div>
              );
            })()
          ) : (
            <div className="results-placeholder">
              Adjust parameters and run to view candidate markets.
            </div>
          )}
                
                {/* Analyze Button */}
                {marketCombos && marketCombos.length > 0 && (
                  <div className="table-actions">
                    <button
                      type="button"
                      className={`primary-btn ${analysisLoading ? 'disabled' : selectedRows.length === 0 ? 'secondary' : ''}`}
                      disabled={analysisLoading}
                      onClick={runAnalysis}
                      title={selectedRows.length === 0 ? 'Select a market combination from the table to analyze' : `Analyze ${selectedRows.length > 0 ? selectedRows[0].locations || selectedRows[0].test_markets || selectedRows[0].markets || 'selected combination' : ''}`}
                    >
                      {analysisLoading ? 'Analyzing…' : selectedRows.length > 0 ? `Analyze Selected` : 'Analyze'}
                    </button>
                  </div>
                )}
              </>
            )}

            {activeRightTab === 'analyze' && (
              <div style={{ padding: '16px 0' }}>
          {analysisLoading ? (
            <div className="analysis-section">
              <div className="results-loading">Loading analysis charts…</div>
            </div>
          ) : analysisError ? (
            <div className="analysis-section">
              <div className="results-error">{analysisError}</div>
            </div>
          ) : analysisResp ? (
            <div className="analysis-section">
              {selectedRows.length > 0 && (
                <div className="analysis-info">
                  <h4>Analysis Results for Selected Market Combination</h4>
                  <p>
                    <strong>Markets:</strong> {
                      Array.isArray(selectedRows[0].locations) 
                        ? selectedRows[0].locations.join(', ')
                        : selectedRows[0].test_markets || selectedRows[0].markets || selectedRows[0].location || 'Unknown'
                    }
                  </p>
                  {selectedRows[0].effect_size && (
                    <p><strong>Effect Size:</strong> {selectedRows[0].effect_size}</p>
                  )}
                  {selectedRows[0].rank && (
                    <p><strong>Rank:</strong> {selectedRows[0].rank}</p>
                  )}
                </div>
              )}
              
              {/* Test Statistics Section */}
              {analysisResp?.test_statistics && (
                <div className="test-statistics">
                  <div className="stats-header">
                    <div className="stats-title">##### Test Statistics #####</div>
                    <div className="stats-border">##########################################</div>
                  </div>
                  <div className="stats-content">
                    <div className="stat-item">
                      <span className="stat-label">★ Average ATT:</span>
                      <span className="stat-value">{
                        (() => {
                          const val = analysisResp.test_statistics.average_att;
                          if (Array.isArray(val) && val.length > 0) return Number(val[0]).toFixed(3);
                          if (typeof val === 'number') return val.toFixed(3);
                          return 'N/A';
                        })()
                      }</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">★ Percent Lift:</span>
                      <span className="stat-value">{
                        (() => {
                          const val = analysisResp.test_statistics.percent_lift;
                          if (Array.isArray(val) && val.length > 0) return `${(Number(val[0]) * 100).toFixed(1)}%`;
                          if (typeof val === 'number') return `${(val * 100).toFixed(1)}%`;
                          return 'N/A';
                        })()
                      }</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">★ Incremental Y:</span>
                      <span className="stat-value">{
                        (() => {
                          const val = analysisResp.test_statistics.incremental_y;
                          if (Array.isArray(val) && val.length > 0) return Number(val[0]).toFixed(1);
                          if (typeof val === 'number') return val.toFixed(1);
                          if (val !== null && val !== undefined) return val;
                          return 'N/A';
                        })()
                      }</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">★ P-value:</span>
                      <span className="stat-value">{
                        (() => {
                          const val = analysisResp.test_statistics.p_value;
                          if (Array.isArray(val) && val.length > 0) return Number(val[0]).toFixed(3);
                          if (typeof val === 'number') return val.toFixed(3);
                          return 'N/A';
                        })()
                      }</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="analysis-charts">
                <div className="chart-container">
                  <div className="chart-title">Observations per Timestamp and Test Group</div>
                  <div ref={chartObservationsRef} style={{ width: '100%', height: 450 }} />
                </div>
                <div className="chart-container">
                  <div className="chart-title">Average Treatment Effect (ATT) Over Time</div>
                  <div ref={chartObsRef} style={{ width: '100%', height: 450 }} />
                </div>
                <div className="chart-container">
                  <div className="chart-title">GeoLift Power Curve</div>
                  <div ref={chartPowerRef} style={{ width: '100%', height: 450 }} />
                </div>
              </div>
            </div>
          ) : (
            <div className="results-placeholder">
              Select a market combination from the table and click "Analyze" to view results.
            </div>
          )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <LocationSelectionModal
        isOpen={locationModalOpen}
        onClose={() => {
          setLocationModalOpen(false);
          setEditingCellIndex(null);
        }}
        onSave={handleLocationSave}
        initialIncluded={editingCellIndex !== null ? cells[editingCellIndex]?.locations?.includedStates || cells[editingCellIndex]?.locations?.included || [] : []}
        initialExcluded={editingCellIndex !== null ? cells[editingCellIndex]?.locations?.excludedStates || cells[editingCellIndex]?.locations?.excluded || [] : []}
        availableLocations={availableLocations}
      />
    </div>
  );
};

export default ConfigureExperiment; 