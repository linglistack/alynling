import React, { useState, useRef, useEffect, useCallback } from 'react';
import './VariationSelector.style.css';

const loadHighcharts = () => new Promise((resolve, reject) => {
  if (window.Highcharts) return resolve(window.Highcharts);
  const s = document.createElement('script');
  s.src = 'https://code.highcharts.com/highcharts.js';
  s.onload = () => resolve(window.Highcharts);
  s.onerror = reject;
  document.body.appendChild(s);
});

const VariationSelector = ({ 
  variations, 
  onVariationSelect, 
  selectedVariation = 'happy_medium',
  treatmentStartDate,
  treatmentEndDate,
  geoDataReadResponse
}) => {
  const [expandedVariation, setExpandedVariation] = useState(selectedVariation);
  const chartRefs = useRef({});
  const chartInstances = useRef({});

  // Render chart for a specific variation
  const renderChart = useCallback(async (variationKey, chartData) => {
    if (!chartData || !chartData.time || !chartData.att || !chartRefs.current[variationKey]) {
      return;
    }

    try {
      const Highcharts = await loadHighcharts();
      
      // Destroy existing chart if it exists
      if (chartInstances.current[variationKey]) {
        chartInstances.current[variationKey].destroy();
      }

      const times = chartData.time || [];
      const attValues = chartData.att || [];

      // Create date mapping for tooltips
      let timeToDateMap = {};
      if (geoDataReadResponse && geoDataReadResponse.time_mapping) {
        geoDataReadResponse.time_mapping.forEach(mapping => {
          timeToDateMap[mapping.time] = mapping.date;
        });
      }

      // Calculate treatment start and end indices based on user input
      let treatmentStartIndex = -1;
      let treatmentEndIndex = -1;
      
      if (treatmentStartDate && treatmentEndDate && geoDataReadResponse?.time_mapping) {
        const treatmentStartTime = geoDataReadResponse.time_mapping.find(m => m.date === treatmentStartDate)?.time;
        const treatmentEndTime = geoDataReadResponse.time_mapping.find(m => m.date === treatmentEndDate)?.time;
        treatmentStartIndex = times.findIndex(t => t === treatmentStartTime);
        treatmentEndIndex = times.findIndex(t => t === treatmentEndTime);
      }

      chartInstances.current[variationKey] = Highcharts.chart(chartRefs.current[variationKey], {
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
        },
        credits: { enabled: false }
      });
    } catch (error) {
      console.error('Error rendering chart for variation:', variationKey, error);
    }
  }, [treatmentStartDate, treatmentEndDate, geoDataReadResponse]); // Add dependencies

  // Effect to render chart when variation is expanded
  useEffect(() => {
    if (expandedVariation && variations && variations[expandedVariation] && variations[expandedVariation].chart_data) {
      // Small delay to ensure DOM element is rendered
      setTimeout(() => {
        renderChart(expandedVariation, variations[expandedVariation].chart_data);
      }, 100);
    }
  }, [expandedVariation, variations, renderChart]);

  if (!variations) {
    return null;
  }

  const handleToggleExpand = (variationKey) => {
    const newExpandedVariation = expandedVariation === variationKey ? null : variationKey;
    setExpandedVariation(newExpandedVariation);
    if (onVariationSelect) {
      // Only call onVariationSelect with the variation key if it's being expanded
      // If collapsing, pass null to hide the chart
      onVariationSelect(newExpandedVariation);
    }
  };

  const formatNumber = (value, decimals = 2) => {
    if (value === null || value === undefined || isNaN(value)) {
      return 'N/A';
    }
    return Number(value).toFixed(decimals);
  };

  const formatPercentage = (value, decimals = 1) => {
    if (value === null || value === undefined || isNaN(value)) {
      return 'N/A';
    }
    return `${Number(value).toFixed(decimals)}%`;
  };

  const renderMetricsSection = (metrics) => {
    if (!metrics) return null;

    return (
      <div className="metrics-section">
        {/* Metrics Grid - 3x2 layout like screenshot */}
        <div className="screenshot-metrics-grid">
          <div className="metric-card">
            <div className="metric-value-large">{formatNumber(metrics.correlation, 2)}</div>
            <div className="metric-label-small">Correlation</div>
          </div>
          
          <div className="metric-card">
            <div className="metric-value-large">{formatNumber(metrics.mape, 2)}</div>
            <div className="metric-label-small">MAPE</div>
          </div>
          
          <div className="metric-card">
            <div className="metric-value-large">{formatNumber(metrics.r_squared, 2)}</div>
            <div className="metric-label-small">R-Squared</div>
          </div>
          
          <div className="metric-card">
            <div className="metric-value-large">{formatNumber(metrics.cusum_p_value, 3)}</div>
            <div className="metric-label-small">CUSUM P-Value</div>
          </div>
          
          <div className="metric-card">
            <div className="metric-value-large">{metrics.model_fit || 'Fair'}</div>
            <div className="metric-label-small">Model Fit</div>
          </div>
          
          <div className="metric-card investment-card">
            <div className="metric-value-large investment-value">{metrics.min_investment || '$3.9k'}</div>
            <div className="metric-label-small">Min Investment</div>
          </div>
        </div>

        {/* Duration - displayed separately like in screenshot */}
        <div className="duration-section">
          <div className="duration-value">{metrics.duration_days || 20} days</div>
          <div className="duration-label">Duration</div>
        </div>

        {/* Core Analysis Results */}
        <div className="core-results-section">
          <div className="core-result-item">
            <span className="core-label">Average Treatment Effect:</span>
            <span className="core-value">{formatNumber(metrics.att, 3)}</span>
          </div>
          <div className="core-result-item">
            <span className="core-label">Percent Lift:</span>
            <span className="core-value">{formatPercentage(metrics.percent_lift)}</span>
          </div>
          <div className="core-result-item">
            <span className="core-label">P-value:</span>
            <span className="core-value">{formatNumber(metrics.p_value, 4)}</span>
          </div>
          <div className="core-result-item">
            <span className="core-label">Incremental Units:</span>
            <span className="core-value">{formatNumber(metrics.incremental_y, 0)}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="variation-selector">
      <div className="variation-selector-header">
        <h3 className="variation-selector-title">Analysis Variations</h3>
        <p className="variation-selector-subtitle">
          Choose the approach that best fits your requirements
        </p>
      </div>

      <div className="variations-list">
        {Object.entries(variations).map(([key, variation]) => (
          <div key={key} className={`variation-item ${expandedVariation === key ? 'expanded' : ''}`}>
            <div 
              className="variation-header"
              onClick={() => handleToggleExpand(key)}
            >
              <div className="variation-header-content">
                <div className="variation-title-section">
                  <h4 className="variation-title">{variation.name}</h4>
                  <p className="variation-description">{variation.description}</p>
                </div>
                <div className="variation-summary">
                  <div className="variation-badges">
                    <span className={`badge confidence-${variation.optimization_focus}`}>
                      {variation.optimization_focus === 'balanced' ? 'Balanced' : 
                       variation.optimization_focus === 'confidence' ? 'High Confidence' : 'Efficient'}
                    </span>
                    <span className="badge confidence-level">
                      {formatPercentage(variation.confidence_level * 100, 0)} Confidence
                    </span>
                  </div>
                  <div className="toggle-icon">
                    {expandedVariation === key ? '▲' : '▼'}
                  </div>
                </div>
              </div>
            </div>

            {expandedVariation === key && (
              <div className="variation-content">
                {renderMetricsSection(variation.metrics)}
                
                {/* ATT Chart for this variation */}
                <div className="variation-chart-section">
                  <div className="chart-title">ATT Chart - {variation.name}</div>
                  <div 
                    ref={el => chartRefs.current[key] = el}
                    className="variation-chart-container"
                    style={{ width: '100%', height: '400px' }}
                  />
                </div>
                
                {variation.additional_info && (
                  <div className="additional-info">
                    <div className="robustness-score">
                      <span className="score-label">Robustness Score:</span>
                      <div className="score-bar">
                        <div 
                          className="score-fill"
                          style={{ width: `${(variation.additional_info.robustness_score || 0) * 100}%` }}
                        />
                      </div>
                      <span className="score-value">
                        {formatPercentage((variation.additional_info.robustness_score || 0) * 100, 0)}
                      </span>
                    </div>
                    
                    <div className="recommendation">
                      <strong>Recommendation:</strong> {variation.additional_info.recommendation}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default VariationSelector;
