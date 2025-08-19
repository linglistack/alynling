import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import './AnalyzeResults.css';

const AnalyzeResults = ({ 
  processedData, 
  selectedMarketCombo, 
  analysisParams, 
  onBack, 
  onBackToStep,
  cachedAnalysisResults,
  onCacheAnalysisResults
}) => {
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [analysisResp, setAnalysisResp] = useState(null);

  // Chart refs
  const chartObservationsRef = useRef(null);
  const chartObsRef = useRef(null);
  const chartPowerRef = useRef(null);
  const chartObservations = useRef(null);
  const chartObs = useRef(null);
  const chartPower = useRef(null);

  // Generate cache key based on dependencies
  const getCacheKey = () => {
    if (!selectedMarketCombo || !analysisParams) return null;
    return JSON.stringify({
      marketCombo: selectedMarketCombo,
      params: analysisParams,
      dataLength: processedData?.length
    });
  };

  // Load Highcharts dynamically
  const loadHighcharts = () => new Promise((resolve, reject) => {
    if (window.Highcharts) return resolve(window.Highcharts);
    const script = document.createElement('script');
    script.src = 'https://code.highcharts.com/highcharts.js';
    script.async = true;
    script.onload = () => resolve(window.Highcharts);
    script.onerror = reject;
    document.body.appendChild(script);
  });

  // Check cache and run analysis on mount or dependency change
  useEffect(() => {
    const cacheKey = getCacheKey();
    if (!cacheKey) return;

    // Check if we have cached results for this exact configuration
    if (cachedAnalysisResults && cachedAnalysisResults.cacheKey === cacheKey) {
      console.log('[AnalyzeResults] Using cached analysis results');
      setAnalysisResp(cachedAnalysisResults.data);
      setAnalysisError('');
      return;
    }

    // Run fresh analysis if no cache or dependencies changed
    if (processedData && selectedMarketCombo && analysisParams) {
      runAnalysis(cacheKey);
    }
  }, [processedData, selectedMarketCombo, analysisParams, cachedAnalysisResults]);

  const runAnalysis = async (cacheKey) => {
    if (!processedData || !selectedMarketCombo || !analysisParams) return;

    try {
      setAnalysisLoading(true);
      setAnalysisError('');

      console.log('[AnalyzeResults] Running analysis with:', {
        selectedMarketCombo,
        analysisParams,
        dataRows: Array.isArray(processedData) ? processedData.length : undefined
      });

      // Import the API
      const { geoliftAPI } = await import('../utils/geoliftAPI');

      // Call the EDA plots API with dynamic parameters
      const data = await geoliftAPI.edaPlots(
        processedData,
        {
          treatmentPeriods: analysisParams.treatmentPeriods,
          alpha: analysisParams.alpha,
          marketRank: selectedMarketCombo.ID || selectedMarketCombo.id || selectedMarketCombo.rank || 1,
          effectSize: analysisParams.effectSize,
          lookbackWindow: analysisParams.lookbackWindow,
          cpic: analysisParams.cpic
        }
      );

      console.log('[AnalyzeResults] Analysis response:', data);
      setAnalysisResp(data);
      
      // Cache the results
      if (onCacheAnalysisResults) {
        onCacheAnalysisResults({
          cacheKey,
          data
        });
      }
    } catch (e) {
      console.error('[AnalyzeResults] Analysis error:', e);
      const errorMsg = e.message || 'Analysis failed';
      setAnalysisError(errorMsg);
    } finally {
      setAnalysisLoading(false);
    }
  };

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
        yAxis: { title: { text: 'ATT' }, plotLines: [{
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
    <div className="analyze-results">
      <div className="analyze-header">
        <button className="back-button" onClick={onBack}>
          <ArrowLeft size={20} />
          Back
        </button>
      </div>

      <div className="analyze-content">
        {/* Step Navigation */}
        <div className="step-navigation">
          <button className="step-back-button" onClick={onBackToStep}>
            <ArrowLeft size={16} />
            Back to Previous Step
          </button>
        </div>

        {/* Market Information */}
        {selectedMarketCombo && (
          <div className="analysis-info">
            <h4>Analysis Results for Selected Market Combination</h4>
            <p>
              <strong>Markets:</strong> {
                Array.isArray(selectedMarketCombo.locations) 
                  ? selectedMarketCombo.locations.join(', ')
                  : selectedMarketCombo.test_markets || selectedMarketCombo.markets || selectedMarketCombo.location || 'Unknown'
              }
            </p>
            {selectedMarketCombo.effect_size && (
              <p><strong>Effect Size:</strong> {selectedMarketCombo.effect_size}</p>
            )}
            {selectedMarketCombo.rank && (
              <p><strong>Rank:</strong> {selectedMarketCombo.rank}</p>
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

        {/* Loading/Error States */}
        {analysisLoading && (
          <div className="analysis-loading">
            <div className="loading-spinner"></div>
            <div>Running GeoLift analysis...</div>
          </div>
        )}

        {analysisError && (
          <div className="analysis-error">{analysisError}</div>
        )}

        {/* Charts Section */}
        {analysisResp && !analysisLoading && (
          <div className="analysis-charts">
            <div className="chart-container">
              <div className="chart-title">Observations per Timestamp and Test Group</div>
              <div ref={chartObservationsRef} style={{ width: '100%', height: 300 }} />
            </div>
            <div className="chart-container">
              <div className="chart-title">Average Treatment Effect (ATT) Over Time</div>
              <div ref={chartObsRef} style={{ width: '100%', height: 300 }} />
            </div>
            <div className="chart-container">
              <div className="chart-title">GeoLift Power Curve</div>
              <div ref={chartPowerRef} style={{ width: '100%', height: 300 }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyzeResults; 