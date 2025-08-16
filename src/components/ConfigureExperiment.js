import React, { useState, useEffect, useMemo } from 'react';
import { Table } from 'antd';
import { Resizable } from 'react-resizable';
import './ConfigureExperiment.css';
import CellAdvancedConfig from './CellAdvancedConfig';
import { geoliftAPI } from '../utils/geoliftAPI';
import tooltips from '../config/geoliftTooltips.json';
import TooltipInfo from './TooltipInfo';

const makeEmptyCell = (index) => ({
  id: index + 1,
  channelName: '',
  cpic: '',
  objective: 'lift',
  budget: '',
  advanced: {}
});

const getTip = (id) => ({
  title: (tooltips[id] && tooltips[id].question) || '',
  content: (tooltips[id] && tooltips[id].example) || ''
});

const ConfigureExperiment = ({ processedData, onProceed, cachedResults, onCacheResults, isPreCallingMarketSelection, marketSelectionProgress }) => {
  const [experimentName, setExperimentName] = useState('');
  const [numExperiments, setNumExperiments] = useState(1);
  const [cells, setCells] = useState([makeEmptyCell(0)]);



  // Right panel state
  const [msLoading, setMsLoading] = useState(false);
  const [msError, setMsError] = useState('');
  const [marketCombos, setMarketCombos] = useState([]);
  
  // Column width state for resizing
  const [columnWidths, setColumnWidths] = useState({});
  
  // Dynamic table height based on left panel
  const [tableHeight, setTableHeight] = useState('calc(100vh - 180px)');

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
      const stepper = document.querySelector('.stepper-header');
      
      if (leftPanel && stepper) {
        const leftPanelHeight = leftPanel.offsetHeight;
        const stepperHeight = stepper.offsetHeight;
        const padding = 40; // Account for margins and padding
        
        const availableHeight = window.innerHeight - stepperHeight - padding;
        const calculatedHeight = Math.max(availableHeight, leftPanelHeight);
        
        setTableHeight(`${calculatedHeight - 60}px`); // 60px for table header and margins
      }
    };

    // Adjust on mount and window resize
    adjustTableHeight();
    window.addEventListener('resize', adjustTableHeight);
    
    // Use MutationObserver to watch for left panel changes (advanced config collapse/expand)
    const leftPanel = document.querySelector('.configure-left');
    if (leftPanel) {
      const observer = new MutationObserver(adjustTableHeight);
      observer.observe(leftPanel, { childList: true, subtree: true, attributes: true });
      
      return () => {
        window.removeEventListener('resize', adjustTableHeight);
        observer.disconnect();
      };
    }

    return () => {
      window.removeEventListener('resize', adjustTableHeight);
    };
  }, []);

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

  const effectSize = useMemo(() => {
    const firstCell = cells[0];
    const csvString = firstCell?.advanced?.effectSizeCsv || '0,0.05,0.1,0.15,0.2,0.25';
    const parts = csvString.split(',').map(s => Number(String(s).trim())).filter(n => Number.isFinite(n));
    return parts.length > 0 ? parts : [0, 0.05, 0.1, 0.15, 0.2, 0.25];
  }, [cells]);

  const runMarketSelection = async () => {
    if (!processedData) return;
    try {
      setMsLoading(true);
      setMsError('');
      console.log('[MarketSelection][request]', {
        treatmentPeriods,
        effectSize,
        lookbackWindow,
        cpic,
        alpha,
        dataRows: Array.isArray(processedData) ? processedData.length : undefined
      });
      const resp = await geoliftAPI.marketSelection(processedData, {
        treatmentPeriods,
        effectSize,
        lookbackWindow,
        cpic,
        alpha
      });
      console.log('[MarketSelection][response]', resp);
      if (!resp.success) throw new Error('Market selection failed');
      const combos = resp.market_selection || [];
      setMarketCombos(combos);
      
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
            dataLength: Array.isArray(processedData) ? processedData.length : 0
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
            dataLength: Array.isArray(processedData) ? processedData.length : 0
          }
        });
      }
    } finally {
      setMsLoading(false);
    }
  };

  useEffect(() => {
    // Don't run if pre-call is in progress - wait for it to complete
    if (isPreCallingMarketSelection) {
      console.log('[ConfigureExperiment] Pre-call in progress, waiting...');
      setMsLoading(true);
      return;
    }

    // Check if we need to invalidate cache due to dependency changes
    const currentDeps = {
      treatmentPeriods,
      effectSize,
      lookbackWindow,
      cpic,
      alpha,
      dataLength: Array.isArray(processedData) ? processedData.length : 0
    };

    const shouldInvalidateCache = cachedResults && cachedResults.dependencies && (
      cachedResults.dependencies.treatmentPeriods !== currentDeps.treatmentPeriods ||
      cachedResults.dependencies.lookbackWindow !== currentDeps.lookbackWindow ||
      cachedResults.dependencies.cpic !== currentDeps.cpic ||
      cachedResults.dependencies.alpha !== currentDeps.alpha ||
      cachedResults.dependencies.dataLength !== currentDeps.dataLength ||
      JSON.stringify(cachedResults.dependencies.effectSize) !== JSON.stringify(currentDeps.effectSize)
    );

    // Run API if no cache or if dependencies changed (but not if pre-call is running)
    if (!cachedResults || shouldInvalidateCache) {
      if (shouldInvalidateCache) {
        console.log('[ConfigureExperiment] Cache invalidated due to dependency changes:', {
          cached: cachedResults.dependencies,
          current: currentDeps
        });
      }
      runMarketSelection();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processedData, treatmentPeriods, cpic, lookbackWindow, alpha, effectSize, cachedResults, isPreCallingMarketSelection]);

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
              className={`primary-btn ${canProceed ? '' : 'disabled'}`}
              disabled={!canProceed}
              onClick={() => onProceed && onProceed({ 
                experimentName, 
                numExperiments, 
                cells, 
                msParams: {
                  treatmentPeriods: String(treatmentPeriods),
                  effectSizeCsv: effectSize.join(','),
                  lookbackWindow: String(lookbackWindow),
                  cpic: String(cpic),
                  alpha: String(alpha)
                }
              })}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <div className="configure-right">
        <div className="results-card">
          <div className="results-title">Candidate Test Markets</div>
          {msLoading ? (
            <div className="results-loading">
              <div className="loading-text">
                {isPreCallingMarketSelection ? 'Loading market selection…' : 'Computing market selection…'}
              </div>
              {isPreCallingMarketSelection && (
                <div className="progress-container">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${Math.min(marketSelectionProgress, 100)}%` }}
                    ></div>
                  </div>
                  <div className="progress-text">
                    {Math.round(marketSelectionProgress)}%
                  </div>
                </div>
              )}
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

              return (
                <div className="antd-table-wrapper" id="candidate-markets-table">
                  <Table
                    columns={columns}
                    dataSource={dataSource}
                    pagination={false}
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
            <div className="results-placeholder">Adjust parameters and run to view candidate markets.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConfigureExperiment; 