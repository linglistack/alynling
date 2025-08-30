import React, { useState, useEffect, useMemo } from 'react';
import { Table } from 'antd';
import { Resizable } from 'react-resizable';
import './ConfigureExperiment.css';
import './DataIngestionForm.css'; // For tab styles
import CellAdvancedConfig from './CellAdvancedConfig';
import { geoliftAPI } from '../utils/geoliftAPI';


import LocationSelectionModal from './LocationSelectionModal';
import ExpandableChartRow from './ExpandableChartRow';
import TreatmentAnalysis from './TreatmentAnalysis';



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



const ConfigureExperiment = ({ 
  processedData, 
  geoDataReadResponse,
  cachedResults,
  onCacheResults,
  isPreCallingMarketSelection,
  marketSelectionProgress,
  onGoToAnalysis,
  currentStep: parentCurrentStep = 2,
  selectedMarketRow,
  onSelectedMarketRowChange,
  expandedRows,
  onExpandedRowsChange,
  rowAnalysisData,
  onRowAnalysisDataChange,
  rowAnalysisLoading,
  onRowAnalysisLoadingChange,
  rowAnalysisErrors,
  onRowAnalysisErrorsChange,
  experimentCells,
  onExperimentCellsChange
}) => {
  const [experimentName, setExperimentName] = useState('');
  const [numExperiments, setNumExperiments] = useState(1);
  
  // Use persistent cells state from parent, initialize if not provided
  const cells = experimentCells || [makeEmptyCell(0)];
  const setCells = (newCells) => {
    if (onExperimentCellsChange) {
      onExperimentCellsChange(newCells);
    }
  };
  
  // Initialize cells in parent if not already set
  useEffect(() => {
    if (!experimentCells && onExperimentCellsChange) {
      onExperimentCellsChange([makeEmptyCell(0)]);
    }
  }, [experimentCells, onExperimentCellsChange]);

  // Use parent step if provided, otherwise use internal step
  const currentStep = parentCurrentStep;

  // Right panel state
  const [msLoading, setMsLoading] = useState(false);
  const [msError, setMsError] = useState('');
  const [marketCombos, setMarketCombos] = useState([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  // Use parent's selectedMarketRow state instead of local selectedRows
  const selectedRows = selectedMarketRow ? [selectedMarketRow] : [];
  const [manualProgress, setManualProgress] = useState(0);



  
  // Analysis state removed - now handled in TreatmentAnalysis component
  
  // Use parent state for expandable rows, with fallbacks
  const expandedRowsState = expandedRows || {};
  const setExpandedRowsState = onExpandedRowsChange || (() => {});
  const rowAnalysisDataState = rowAnalysisData || {};
  const setRowAnalysisDataState = onRowAnalysisDataChange || (() => {});
  const rowAnalysisLoadingState = rowAnalysisLoading || {};
  const setRowAnalysisLoadingState = onRowAnalysisLoadingChange || (() => {});
  const rowAnalysisErrorsState = rowAnalysisErrors || {};
  const setRowAnalysisErrorsState = onRowAnalysisErrorsChange || (() => {});
  
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

  // Sync selectedRowKeys with parent's selectedMarketRow
  useEffect(() => {
    if (selectedMarketRow && selectedMarketRow.key !== undefined) {
      setSelectedRowKeys([selectedMarketRow.key]);
    } else {
      setSelectedRowKeys([]);
    }
  }, [selectedMarketRow]);

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
    const result = Number.isFinite(n) && n > 0 ? n : 15000;  // Match CellAdvancedConfig default
    console.log('[ConfigureExperiment] Budget calculation:', {
      firstCell: firstCell,
      testAmount: firstCell?.advanced?.testAmount,
      parsed: n,
      result: result
    });
    return result;
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
    // Use GeoDataRead converted data if available, otherwise fall back to raw data
    const dataToUse = (geoDataReadResponse && geoDataReadResponse.data && geoDataReadResponse.data.length > 0) 
      ? geoDataReadResponse.data 
      : processedData;
    
    if (!dataToUse) return;
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
      onSelectedMarketRowChange && onSelectedMarketRowChange(null);

      
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
        dataRows: Array.isArray(dataToUse) ? dataToUse.length : undefined,
        locationFilters: {
          includedLocations: currentCellLocations.included,
          excludedLocations: currentCellLocations.excluded,
          includedCount: currentCellLocations.included?.length || 0,
          excludedCount: currentCellLocations.excluded?.length || 0
        }
      });
   
      const resp = await geoliftAPI.marketSelection(dataToUse, {
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
      onSelectedMarketRowChange && onSelectedMarketRowChange(null);
      
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

  const runAnalysisForRow = async (row) => {
    // Use GeoDataRead converted data if available, otherwise fall back to raw data
    const dataToUse = (geoDataReadResponse && geoDataReadResponse.data && geoDataReadResponse.data.length > 0) 
      ? geoDataReadResponse.data 
      : processedData;
    
    if (!dataToUse) return;
    
    const rowKey = row.key;
    
    try {
      setRowAnalysisLoadingState(prev => ({ ...prev, [rowKey]: true }));
      setRowAnalysisErrorsState(prev => ({ ...prev, [rowKey]: null }));
      
      console.log('[ConfigureExperiment][RowAnalysis] Analyzing row:', row);
      
      // Extract locations from the row
      const locations = row.locations || 
                       row.test_markets || 
                       row.markets || 
                       row.location || 
                       [];
      
      // Ensure locations is an array
      const locationsArray = Array.isArray(locations) ? locations : [locations].filter(Boolean);
      
      if (locationsArray.length === 0) {
        throw new Error('Selected market combination has no valid locations');
      }
      
      // Safety check for treatmentPeriods value
      if (!Number.isFinite(treatmentPeriods) || treatmentPeriods > 10000) {
        throw new Error(`Invalid treatment periods value: ${treatmentPeriods}. Please check your experiment configuration.`);
      }
      
      console.log('[ConfigureExperiment][RowAnalysis][request]', {
        row: row,
        locations: locationsArray,
        alpha: alpha,
        treatmentPeriods,
        marketRank: row.ID || row.id || row.rank || 1,
        dataRows: Array.isArray(dataToUse) ? dataToUse.length : undefined
      });
      
      // Call the EDA plots API for this specific row
      const data = await geoliftAPI.edaPlots(
        dataToUse,
        {
          treatmentPeriods: treatmentPeriods,
          alpha: alpha,
          marketRank: row.ID || row.id || row.rank || 1,
          effectSize: effectSize,
          lookbackWindow: lookbackWindow,
          cpic: cpic
        }
      );
      
      console.log('[ConfigureExperiment][RowAnalysis][response]', data);
      setRowAnalysisDataState(prev => ({ ...prev, [rowKey]: data }));
    } catch (e) {
      console.error('[ConfigureExperiment][RowAnalysis][error]', e);
      const errorMsg = e.message || 'Analysis failed';
      setRowAnalysisErrorsState(prev => ({ ...prev, [rowKey]: errorMsg }));
    } finally {
      setRowAnalysisLoadingState(prev => ({ ...prev, [rowKey]: false }));
    }
  };

  const navigateToStep3 = () => {
    // Check if a row is selected
    if (selectedRows.length === 0) {
      alert('Please select a market combination from the table to proceed');
      return;
    }
    
    console.log('[ConfigureExperiment] Navigating to step 3 with selected row:', selectedRows[0]);
    
    // Navigate to step 3 using parent callback
    if (onGoToAnalysis) {
      onGoToAnalysis();
    }
  };

  const handleRowExpand = async (record) => {
    const rowKey = record.key;
    const isCurrentlyExpanded = expandedRowsState[rowKey];
    
    // Toggle expansion
    setExpandedRowsState(prev => ({ ...prev, [rowKey]: !isCurrentlyExpanded }));
    
    // If expanding and no data yet, fetch analysis data
    if (!isCurrentlyExpanded && !rowAnalysisDataState[rowKey] && !rowAnalysisLoadingState[rowKey]) {
      console.log('[ConfigureExperiment] Expanding row and fetching data for:', record);
      await runAnalysisForRow(record);
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

  // Clean up chart rendering effect since charts are now handled by individual components
  // This effect is no longer needed as charts are managed in ExpandableChartRow and AnalysisResults components

  // Render different steps based on current step
  if (currentStep === 3) {
    return (
      <TreatmentAnalysis 
        selectedRow={selectedMarketRow}
        processedData={processedData}
        geoDataReadResponse={geoDataReadResponse}
        availableLocations={availableLocations}
        onBack={() => {/* Will be handled by parent ExperimentSetup */}}
        userConfig={{
          testBudget: budget,
          treatmentPeriods: treatmentPeriods,
          numTestGeos: numTestGeos,
          cpic: cpic,
          effectSize: effectSize[1] || 0.1, // Use first non-zero effect size
          alpha: alpha
        }}
      />
    );
  }

  return (
    <div className="configure-experiment-container">
      
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
          <div className="results-title">Market Selection Results</div>
          <div className="tab-content" style={{ overflow: 'auto', flex: 1, padding: '16px 0', display: 'flex', flexDirection: 'column' }}>
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
                  'investment', 'budget', 'cost',
                  'correlation', 'corr', 'cor',
                  'holdout', 'Holdout', 'holdout_size',
                  'duration', 'Duration', 'duration_days'
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
                    'cost': 'Investment',
                    'correlation': 'Correlation',
                    'corr': 'Correlation',
                    'cor': 'Correlation',
                    'holdout': 'Holdout',
                    'Holdout': 'Holdout',
                    'holdout_size': 'Holdout',
                    'duration': 'Duration',
                    'Duration': 'Duration',
                    'duration_days': 'Duration'
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
                    if (/correlation|corr|cor/i.test(key)) {
                      return v.toFixed(3);
                    }
                    if (/holdout|Holdout|holdout_size/i.test(key)) {
                      return (v * 100).toFixed(1) + '%';
                    }
                    if (/duration|Duration|duration_days/i.test(key)) {
                      return v + ' days';
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
                  const isNumeric = /number|rank|effect|att|investment|budget|cost|correlation|corr|cor|holdout|Holdout|holdout_size|duration|Duration|duration_days/i.test(key);

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
                    // Update parent's selected market row state
                    if (onSelectedMarketRowChange) {
                      onSelectedMarketRowChange(selectedRowsData.length > 0 ? selectedRowsData[0] : null);
                    }
                  },
                  onSelect: (record, selected, selectedRowsData) => {
                    console.log('[Table] Row selected:', { record, selected });
                  },
                };

                // Expandable row render function
                const expandedRowRender = (record) => {
                  const rowKey = record.key;
                  // Get experiment length from the first cell's advanced config
                  // Since market selection is run for all cells collectively, we use the first cell's config
                  const experimentLength = cells[0]?.advanced?.experimentLength || cells[0]?.advanced?.treatmentPeriods || 28;
                  
                  return (
                    <ExpandableChartRow
                      analysisData={rowAnalysisDataState[rowKey]}
                      selectedRow={record}
                      isExpanded={true} // Always true when this function is called
                      onToggle={() => handleRowExpand(record)}
                      loading={rowAnalysisLoadingState[rowKey]}
                      error={rowAnalysisErrorsState[rowKey]}
                      experimentLength={Number(experimentLength)}
                    />
                  );
                };

                return (
                  <>
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
                        expandable={{
                          expandedRowRender,
                          expandedRowKeys: Object.keys(expandedRowsState).filter(key => expandedRowsState[key]).map(Number),
                          onExpand: (expanded, record) => {
                            console.log('[ConfigureExperiment] Row expand/collapse:', { expanded, record });
                            handleRowExpand(record);
                          },
                          expandIcon: ({ expanded, onExpand, record }) => (
                            <span
                              className={`ant-table-row-expand-icon ${expanded ? 'ant-table-row-expand-icon-expanded' : 'ant-table-row-expand-icon-collapsed'}`}
                              onClick={e => {
                                e.stopPropagation();
                                onExpand(record, e);
                              }}
                              style={{ cursor: 'pointer', fontSize: '12px' }}
                            >
                              📊
                            </span>
                          )
                        }}
                      />
                    </div>
                    
                    {/* Next Button for Step 3 */}
                    {marketCombos && marketCombos.length > 0 && (
                      <div className="table-actions">
                        <button
                          type="button"
                          className={`primary-btn ${selectedRows.length === 0 ? 'secondary' : ''}`}
                          disabled={selectedRows.length === 0}
                          onClick={navigateToStep3}
                          title={selectedRows.length === 0 ? 'Select a market combination from the table to proceed' : `Proceed to step 3 for ${selectedRows.length > 0 ? selectedRows[0].locations || selectedRows[0].test_markets || selectedRows[0].markets || 'selected combination' : ''}`}
                        >
                          {selectedRows.length > 0 ? `Next: Analysis` : 'Next (Select a Market)'}
                        </button>
                      </div>
                    )}
                  </>
                );
              })()
            ) : (
              <div className="results-placeholder">
                Adjust parameters and run to view candidate markets.
              </div>
            )}
          </div>
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