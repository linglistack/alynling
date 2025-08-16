import React, { useEffect, useRef, useState } from 'react';
import { geoliftAPI } from '../utils/geoliftAPI';
import './ConfigureExperiment.css';

const loadHighcharts = () => new Promise((resolve, reject) => {
  if (window.Highcharts) return resolve(window.Highcharts);
  const s = document.createElement('script');
  s.src = 'https://code.highcharts.com/highcharts.js';
  s.onload = () => resolve(window.Highcharts);
  s.onerror = reject;
  document.body.appendChild(s);
});

const AnalyzeExperiment = ({ processedData, config, cachedResults, onCacheResults }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resp, setResp] = useState(null);

  const chartObsRef = useRef(null);
  const chartPowerRef = useRef(null);
  const chartObs = useRef(null);
  const chartPower = useRef(null);

  // Initialize from cache if available
  useEffect(() => {
    if (cachedResults && cachedResults.data) {
      console.log('[AnalyzeExperiment] Loading from cache:', cachedResults);
      setResp(cachedResults.data);
      setError(cachedResults.error || '');
      setLoading(false);
    }
  }, [cachedResults]);

  useEffect(() => {
    const run = async () => {
      if (!processedData) return;
      try {
        setLoading(true);
        setError('');
        const params = (config && config.msParams) ? config.msParams : {};
        const effectSize = (params.effectSizeCsv || '')
          .split(',')
          .map(s => Number(String(s).trim()))
          .filter(n => Number.isFinite(n));
        const options = {
          treatmentPeriods: Number(params.treatmentPeriods) || 14,
          effectSize: effectSize.length ? effectSize : undefined,
          lookbackWindow: Number(params.lookbackWindow) || 1,
          cpic: Number(params.cpic) || 1,
          alpha: Number(params.alpha) || 0.1,
        };
        console.log('[EDA][request]', options, { dataRows: Array.isArray(processedData) ? processedData.length : undefined });
        const data = await geoliftAPI.edaPlots(processedData, options);
        console.log('[EDA][response]', data);
        setResp(data);
        
        // Cache the results with dependency fingerprint
        if (onCacheResults) {
          onCacheResults({
            data: data,
            error: '',
            timestamp: Date.now(),
            // Store dependency values to detect changes
            dependencies: {
              treatmentPeriods: options.treatmentPeriods,
              effectSize: JSON.stringify(options.effectSize),
              lookbackWindow: options.lookbackWindow,
              cpic: options.cpic,
              alpha: options.alpha,
              dataLength: Array.isArray(processedData) ? processedData.length : 0,
              configHash: JSON.stringify(config)
            }
          });
        }
      } catch (e) {
        console.error('[EDA][error]', e);
        const errorMsg = e.message || 'Failed to load analysis';
        setError(errorMsg);
        
        // Cache the error state with dependency fingerprint
        if (onCacheResults) {
          const params = (config && config.msParams) ? config.msParams : {};
          const effectSize = (params.effectSizeCsv || '')
            .split(',')
            .map(s => Number(String(s).trim()))
            .filter(n => Number.isFinite(n));
          const options = {
            treatmentPeriods: Number(params.treatmentPeriods) || 14,
            effectSize: effectSize.length ? effectSize : undefined,
            lookbackWindow: Number(params.lookbackWindow) || 1,
            cpic: Number(params.cpic) || 1,
            alpha: Number(params.alpha) || 0.1,
          };
          
          onCacheResults({
            data: null,
            error: errorMsg,
            timestamp: Date.now(),
            dependencies: {
              treatmentPeriods: options.treatmentPeriods,
              effectSize: JSON.stringify(options.effectSize),
              lookbackWindow: options.lookbackWindow,
              cpic: options.cpic,
              alpha: options.alpha,
              dataLength: Array.isArray(processedData) ? processedData.length : 0,
              configHash: JSON.stringify(config)
            }
          });
        }
      } finally {
        setLoading(false);
      }
    };
    
    // Check if we need to invalidate cache due to dependency changes
    const params = (config && config.msParams) ? config.msParams : {};
    const effectSize = (params.effectSizeCsv || '')
      .split(',')
      .map(s => Number(String(s).trim()))
      .filter(n => Number.isFinite(n));
    const currentDeps = {
      treatmentPeriods: Number(params.treatmentPeriods) || 14,
      effectSize: JSON.stringify(effectSize.length ? effectSize : undefined),
      lookbackWindow: Number(params.lookbackWindow) || 1,
      cpic: Number(params.cpic) || 1,
      alpha: Number(params.alpha) || 0.1,
      dataLength: Array.isArray(processedData) ? processedData.length : 0,
      configHash: JSON.stringify(config)
    };

    const shouldInvalidateCache = cachedResults && cachedResults.dependencies && (
      cachedResults.dependencies.treatmentPeriods !== currentDeps.treatmentPeriods ||
      cachedResults.dependencies.effectSize !== currentDeps.effectSize ||
      cachedResults.dependencies.lookbackWindow !== currentDeps.lookbackWindow ||
      cachedResults.dependencies.cpic !== currentDeps.cpic ||
      cachedResults.dependencies.alpha !== currentDeps.alpha ||
      cachedResults.dependencies.dataLength !== currentDeps.dataLength ||
      cachedResults.dependencies.configHash !== currentDeps.configHash
    );

    // Run API if no cache or if dependencies changed
    if (!cachedResults || shouldInvalidateCache) {
      if (shouldInvalidateCache) {
        console.log('[AnalyzeExperiment] Cache invalidated due to dependency changes:', {
          cached: cachedResults.dependencies,
          current: currentDeps
        });
      }
      run();
    }
  }, [processedData, config, cachedResults]);

  useEffect(() => {
    if (!resp) return;
    let destroyed = false;
    (async () => {
      const Highcharts = await loadHighcharts();
      if (destroyed) return;

      const obs = resp.observations || [];
      const treatmentStart = resp?.treatment_window?.start_time;
      const treatmentEnd = resp?.treatment_window?.end_time;

      const times = [...new Set(obs.map(o => o.time))].sort((a,b)=>a-b);
      const byGroup = { Control: {}, Treatment: {} };
      obs.forEach(o => { byGroup[o.group] = byGroup[o.group] || {}; byGroup[o.group][o.time] = o.value_smooth ?? o.value; });
      const series = Object.keys(byGroup).map(g => ({
        name: g,
        data: times.map(t => (byGroup[g] && byGroup[g][t] != null) ? Number(byGroup[g][t]) : null),
        dashStyle: g === 'Control' ? 'ShortDash' : 'Solid'
      }));

      if (chartObs.current) chartObs.current.destroy();
      chartObs.current = Highcharts.chart(chartObsRef.current, {
        title: { text: 'Observations per Timestamp and Test Group' },
        xAxis: { categories: times, title: { text: null }, plotBands: (Number.isFinite(treatmentStart) && Number.isFinite(treatmentEnd)) ? [{
          color: 'rgba(102,126,234,0.15)',
          from: times.indexOf(treatmentStart),
          to: times.indexOf(treatmentEnd)
        }] : [] },
        yAxis: { title: { text: null } },
        legend: { enabled: true },
        series
      });

      const eff = resp?.power_curve?.effect_size || [];
      const pow = resp?.power_curve?.power || [];
      if (chartPower.current) chartPower.current.destroy();
      chartPower.current = Highcharts.chart(chartPowerRef.current, {
        title: { text: 'GeoLift Power Curve' },
        xAxis: { categories: eff.map(e => Number(e)), title: { text: 'Effect Size' } },
        yAxis: { title: { text: 'Power' }, max: 1, labels: { formatter() { return `${Math.round(this.value*100)}%`; } } },
        series: [{ name: 'Power', data: pow.map(p => Number(p)) }]
      });
    })();
    return () => { destroyed = true; };
  }, [resp]);

  return (
    <div className="configure-step">
      <div className="configure-header">Step 3: Analyze</div>
      {loading ? (
        <div className="results-loading">Loading charts…</div>
      ) : error ? (
        <div className="results-error">{error}</div>
      ) : resp ? (
        <div className="configure-split equal">
          <div className="configure-left">
            <div className="results-card">
              <div className="results-title">Observations per Timestamp and Test Group</div>
              <div ref={chartObsRef} style={{ width: '100%', height: 340 }} />
            </div>
          </div>
          <div className="configure-right">
            <div className="results-card">
              <div className="results-title">GeoLift Power Curve</div>
              <div ref={chartPowerRef} style={{ width: '100%', height: 340 }} />
            </div>
          </div>
        </div>
      ) : (
        <div className="results-placeholder">Run analysis to view charts.</div>
      )}
    </div>
  );
};

export default AnalyzeExperiment; 