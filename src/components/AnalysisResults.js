import React, { useEffect, useRef } from 'react';
import './AnalysisResults.style.css';

const loadHighcharts = () => new Promise((resolve, reject) => {
  if (window.Highcharts) return resolve(window.Highcharts);
  const s = document.createElement('script');
  s.src = 'https://code.highcharts.com/highcharts.js';
  s.onload = () => resolve(window.Highcharts);
  s.onerror = reject;
  document.body.appendChild(s);
});

const AnalysisResults = ({ 
  analysisData, 
  selectedRow, 
  loading = false, 
  error = null,
  onBack = null 
}) => {
  const chartObsRef = useRef(null);
  const chartObs = useRef(null);

  // Render ATT chart when data is available
  useEffect(() => {
    if (!analysisData || loading || error) return;
    
    let destroyed = false;
    
    (async () => {
      try {
        const Highcharts = await loadHighcharts();
        if (destroyed) return;

        const obs = analysisData.observations || [];
        const treatmentStart = analysisData?.treatment_window?.start_time;
        const treatmentEnd = analysisData?.treatment_window?.end_time;

        const times = [...new Set(obs.map(o => o.time))].sort((a,b)=>a-b);
        const byGroup = { Control: {}, Treatment: {} };
        obs.forEach(o => { 
          byGroup[o.group] = byGroup[o.group] || {}; 
          byGroup[o.group][o.time] = o.value_smooth ?? o.value; 
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
        if (chartObsRef.current) {
          chartObs.current = Highcharts.chart(chartObsRef.current, {
            title: { text: 'Average Treatment Effect (ATT) Over Time' },
            xAxis: { 
              categories: times, 
              title: { text: 'Time Period' }, 
              plotBands: (Number.isFinite(treatmentStart) && Number.isFinite(treatmentEnd)) ? [{
                color: 'rgba(102,126,234,0.15)',
                from: times.indexOf(treatmentStart),
                to: times.indexOf(treatmentEnd),
                label: { text: 'Treatment Period', style: { color: '#667eea', fontWeight: 'bold' } }
              }] : [] 
            },
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
        }
      } catch (e) {
        console.error('[AnalysisResults] Chart rendering error:', e);
      }
    })();

    return () => { 
      destroyed = true;
      if (chartObs.current) {
        chartObs.current.destroy();
        chartObs.current = null;
      }
    };
  }, [analysisData, loading, error]);

  return (
    <div className="analysis-results">
      <div className="analysis-results-header">
        <div className="analysis-results-title">
          <h2>Analysis Results</h2>
          <p>Step 3: Review detailed analysis for selected market combination</p>
        </div>
        {onBack && (
          <button type="button" className="back-button" onClick={onBack}>
            ← Back to Market Selection
          </button>
        )}
      </div>

      {loading ? (
        <div className="analysis-results-loading">
          <div className="loading-text">Loading analysis results...</div>
        </div>
      ) : error ? (
        <div className="analysis-results-error">
          <div className="error-text">{error}</div>
        </div>
      ) : analysisData ? (
        <div className="analysis-results-content">
          {/* Selected Market Info */}
          {selectedRow && (
            <div className="selected-market-info">
              <h3>Selected Market Combination</h3>
              <div className="market-details">
                <div className="market-detail-item">
                  <strong>Markets:</strong> {
                    Array.isArray(selectedRow.locations) 
                      ? selectedRow.locations.join(', ')
                      : selectedRow.test_markets || selectedRow.markets || selectedRow.location || 'Unknown'
                  }
                </div>
                {selectedRow.effect_size && (
                  <div className="market-detail-item">
                    <strong>Effect Size:</strong> {selectedRow.effect_size}
                  </div>
                )}
                {selectedRow.rank && (
                  <div className="market-detail-item">
                    <strong>Rank:</strong> {selectedRow.rank}
                  </div>
                )}
                {selectedRow.average_att && (
                  <div className="market-detail-item">
                    <strong>Average ATT:</strong> {selectedRow.average_att}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Test Statistics Section */}
          {analysisData?.test_statistics && (
            <div className="test-statistics-section">
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
                        const val = analysisData.test_statistics.average_att;
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
                        const val = analysisData.test_statistics.percent_lift;
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
                        const val = analysisData.test_statistics.incremental_y;
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
                        const val = analysisData.test_statistics.p_value;
                        if (Array.isArray(val) && val.length > 0) return Number(val[0]).toFixed(3);
                        if (typeof val === 'number') return val.toFixed(3);
                        return 'N/A';
                      })()
                    }</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ATT Over Time Chart */}
          <div className="att-chart-section">
            <div className="att-chart-container">
              <div ref={chartObsRef} style={{ width: '100%', height: 450 }} />
            </div>
          </div>
        </div>
      ) : (
        <div className="analysis-results-placeholder">
          No analysis data available. Please go back and select a market combination.
        </div>
      )}
    </div>
  );
};

export default AnalysisResults;
