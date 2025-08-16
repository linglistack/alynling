import React, { useState, useEffect, useMemo } from 'react';
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

const ConfigureExperiment = ({ processedData, onProceed, cachedResults, onCacheResults, isPreCallingMarketSelection }) => {
  const [experimentName, setExperimentName] = useState('');
  const [numExperiments, setNumExperiments] = useState(1);
  const [cells, setCells] = useState([makeEmptyCell(0)]);

  // Market selection params (left panel, one-line inputs)
  const [msParams, setMsParams] = useState({
    treatmentPeriods: '28',
    effectSizeCsv: '0,0.05,0.1,0.15,0.2,0.25',
    lookbackWindow: '1',
    cpic: '1',
    alpha: '0.1'
  });

  // Right panel state
  const [msLoading, setMsLoading] = useState(false);
  const [msError, setMsError] = useState('');
  const [marketCombos, setMarketCombos] = useState([]);

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

  // Prefer explicit params from left panel; fall back to first cell data if present
  const treatmentPeriods = useMemo(() => {
    const n = Number(msParams.treatmentPeriods);
    return Number.isFinite(n) && n > 0 ? n : 14;
  }, [msParams]);

  const cpic = useMemo(() => {
    const n = Number(msParams.cpic);
    return Number.isFinite(n) && n > 0 ? n : 1;
  }, [msParams]);

  const lookbackWindow = useMemo(() => {
    const n = Number(msParams.lookbackWindow);
    return Number.isFinite(n) && n > 0 ? n : 1;
  }, [msParams]);

  const alpha = useMemo(() => {
    const n = Number(msParams.alpha);
    return Number.isFinite(n) && n > 0 ? n : 0.1;
  }, [msParams]);

  const effectSize = useMemo(() => {
    const parts = (msParams.effectSizeCsv || '').split(',').map(s => Number(String(s).trim())).filter(n => Number.isFinite(n));
    return parts.length > 0 ? parts : [0, 0.05, 0.1, 0.15, 0.2, 0.25];
  }, [msParams]);

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
  }, [processedData, treatmentPeriods, cpic, lookbackWindow, alpha, msParams.effectSizeCsv, cachedResults, isPreCallingMarketSelection]);

  return (
    <div className="configure-split">
      <div className="configure-left">
        <div className="configure-experiment">
          <div className="ms-card">
            <div className="ms-title">Market Selection Parameters</div>
            <div className="ms-form">
              <div className="ms-field">
                <label>Experiment length (days)
                  <TooltipInfo {...getTip('treatment_periods')} />
                </label>
                <input type="number" min="1" value={msParams.treatmentPeriods} onChange={(e) => setMsParams({ ...msParams, treatmentPeriods: e.target.value })} />
              </div>
              <div className="ms-field">
                <label>Effect size list
                  <TooltipInfo {...getTip('effect_size')} />
                </label>
                <input type="text" value={msParams.effectSizeCsv} onChange={(e) => setMsParams({ ...msParams, effectSizeCsv: e.target.value })} />
              </div>
              <div className="ms-field">
                <label>Lookback window
                  <TooltipInfo {...getTip('lookback_window')} />
                </label>
                <input type="number" min="1" value={msParams.lookbackWindow} onChange={(e) => setMsParams({ ...msParams, lookbackWindow: e.target.value })} />
              </div>
              <div className="ms-field">
                <label>CPIC
                  <TooltipInfo {...getTip('cpic')} />
                </label>
                <input type="number" min="0" value={msParams.cpic} onChange={(e) => setMsParams({ ...msParams, cpic: e.target.value })} />
              </div>
              <div className="ms-field">
                <label>Alpha
                  <TooltipInfo {...getTip('alpha')} />
                </label>
                <input type="number" step="0.01" min="0.01" max="0.5" value={msParams.alpha} onChange={(e) => setMsParams({ ...msParams, alpha: e.target.value })} />
              </div>
              <div className="ms-actions">
                <button type="button" className="secondary-btn" onClick={runMarketSelection} disabled={msLoading}>
                  {msLoading ? 'Running…' : 'Run Selection'}
                </button>
              </div>
            </div>
          </div>

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
                  <label className="config-label">Channel CPIC</label>
                  <input
                    type="number"
                    min="0"
                    className="config-input"
                    placeholder="Enter CPIC"
                    value={cell.cpic}
                    onChange={(e) => updateCell(idx, 'cpic', e.target.value)}
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
              onClick={() => onProceed && onProceed({ experimentName, numExperiments, cells, msParams })}
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
            <div className="results-loading">Computing market selection…</div>
          ) : msError ? (
            <div className="results-error">{msError}</div>
          ) : marketCombos && marketCombos.length > 0 ? (
            (() => {
              const first = marketCombos[0] || {};
              const allKeys = Object.keys(first);

              const humanize = (k) => k
                .replace(/_/g, ' ')
                .replace(/\b\w/g, c => c.toUpperCase());

              const formatValue = (v, key) => {
                if (Array.isArray(v)) return v.filter(Boolean).join(', ');
                if (v == null) return '';
                if (typeof v === 'object') return JSON.stringify(v);
                if (typeof v === 'number') {
                  if (/revenue|budget|amount|lift|value/i.test(key)) {
                    return v.toLocaleString();
                  }
                  return v.toLocaleString();
                }
                return String(v);
              };

              const headers = ['#', ...allKeys];

              return (
                <div className="combo-table-wrapper">
                  <table className="combo-table">
                    <thead>
                      <tr>
                        {headers.map((h, idx) => (
                          <th key={idx}>{idx === 0 ? '#' : humanize(h)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {marketCombos.map((row, i) => (
                        <tr key={i}>
                          <td>{i + 1}</td>
                          {allKeys.map((k, j) => (
                            <td key={j} className={/location|market/i.test(k) ? 'loc-cell' : ''}>
                              {formatValue(row[k], k)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
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