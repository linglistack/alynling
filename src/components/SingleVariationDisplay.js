import React, { useRef, useEffect, useCallback } from 'react';
import './SingleVariationDisplay.style.css';

const loadHighcharts = () => new Promise((resolve, reject) => {
  if (window.Highcharts) return resolve(window.Highcharts);
  const s = document.createElement('script');
  s.src = 'https://code.highcharts.com/highcharts.js';
  s.onload = () => resolve(window.Highcharts);
  s.onerror = reject;
  document.body.appendChild(s);
});

const SingleVariationDisplay = ({ 
  analysisData, 
  treatmentStartDate,
  treatmentEndDate,
  geoDataReadResponse
}) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  // Cleanup chart on unmount
  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, []);

  // Render chart
  const renderChart = useCallback(async (chartData) => {
    if (!chartData || !chartData.time || !chartData.att || !chartRef.current) {
      return;
    }

    // Check if container has valid dimensions
    const container = chartRef.current;
    if (!container.offsetWidth || !container.offsetHeight) {
      console.warn('Chart container has invalid dimensions, skipping render');
      return;
    }

    try {
      const Highcharts = await loadHighcharts();
      
      // Destroy existing chart if it exists
      if (chartInstance.current) {
        chartInstance.current.destroy();
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

      chartInstance.current = Highcharts.chart(chartRef.current, {
        title: { text: 'Average Treatment Effect (ATT) Over Time' },
        chart: {
          type: 'line',
          height: 400,
          spacingLeft: 10,
          spacingRight: 10,
          reflow: true,
          animation: false
        },
        accessibility: {
          enabled: false
        },
        xAxis: { 
          categories: times,
          title: { text: 'Time Period' },
          labels: {
            style: {
              fontSize: '10px'
            }
          },
          plotBands: (treatmentStartIndex >= 0 && treatmentEndIndex >= 0) ? [{
            color: 'rgba(150, 150, 150, 0.2)',
            from: treatmentStartIndex,
            to: treatmentEndIndex,
            label: { text: 'Treatment Period', style: { color: '#666', fontWeight: 'bold' } }
          }] : [],
          plotLines: (treatmentStartIndex >= 0) ? [{
            color: '#666',
            width: 2,
            value: treatmentStartIndex,
            dashStyle: 'Dot'
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
          lineWidth: 1,
          marker: {
            enabled: true,
            radius: 2
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
      console.error('Error rendering chart:', error);
    }
  }, [treatmentStartDate, treatmentEndDate, geoDataReadResponse]);

  // Effect to render chart
  useEffect(() => {
    if (analysisData && analysisData.att_data) {
      // Increase delay to ensure DOM is fully rendered
      const timeoutId = setTimeout(() => {
        renderChart(analysisData.att_data);
      }, 200);
      
      return () => clearTimeout(timeoutId);
    }
  }, [analysisData, renderChart]);

  if (!analysisData || !analysisData.summary) {
    return null;
  }

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

  // Extract metrics from the simplified structure
  const summary = analysisData.summary;

  return (
    <div className="single-variation-display">
      {/* Duration Section */}
      <div className="duration-section">
        <div className="duration-value">{summary.duration_days || 0} days</div>
        <div className="duration-label">Duration</div>
      </div>

      {/* Core Analysis Results */}
      <div className="core-results-section">
        <div className="core-result-item">
          <span className="core-label">Average Treatment Effect:</span>
          <span className="core-value">{formatNumber(summary.att, 3)}</span>
        </div>
        <div className="core-result-item">
          <span className="core-label">Percent Lift:</span>
          <span className="core-value">{formatPercentage(summary.percent_lift * 100)}</span>
        </div>
        <div className="core-result-item">
          <span className="core-label">P-value:</span>
          <span className="core-value">{formatNumber(summary.p_value, 4)}</span>
        </div>
        <div className="core-result-item">
          <span className="core-label">Incremental Units:</span>
          <span className="core-value">{formatNumber(summary.incremental_y, 0)}</span>
        </div>
      </div>

      {/* ATT Chart */}
      <div className="chart-section">
        <div 
          ref={chartRef}
          className="chart-container"
        />
      </div>
    </div>
  );
};

export default SingleVariationDisplay;

