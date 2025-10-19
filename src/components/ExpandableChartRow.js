import React, { useEffect, useRef } from 'react';
import './ExpandableChartRow.style.css';

const loadHighcharts = () => new Promise((resolve, reject) => {
  if (window.Highcharts) return resolve(window.Highcharts);
  const s = document.createElement('script');
  s.src = 'https://code.highcharts.com/highcharts.js';
  s.onload = () => resolve(window.Highcharts);
  s.onerror = reject;
  document.body.appendChild(s);
});

const ExpandableChartRow = ({ 
  analysisData, 
  selectedRow, 
  isExpanded, 
  onToggle,
  loading = false,
  error = null,
  experimentLength = 28, // Days for treatment period
  timeMapping = null // Time to date mapping
}) => {
  const chartObservationsRef = useRef(null);
  const chartPowerRef = useRef(null);
  const chartObservations = useRef(null);
  const chartPower = useRef(null);

  // Helper function to convert time period to date
  const getDateFromTime = (timePeriod) => {
    if (!timeMapping || !Array.isArray(timeMapping)) {
      return `Time ${timePeriod}`;
    }
    
    const timeEntry = timeMapping.find(entry => entry.time === timePeriod);
    return timeEntry ? timeEntry.date : `Time ${timePeriod}`;
  };

  // Render charts when data is available and row is expanded
  useEffect(() => {
    if (!isExpanded || !analysisData || loading || error) return;
    
    let destroyed = false;
    
    (async () => {
      try {
        const Highcharts = await loadHighcharts();
        if (destroyed) return;

        // Handle new data structure from lifted_data and lifted_power
        const liftedData = analysisData.lifted_data || [];
        
        if (!Array.isArray(liftedData) || liftedData.length === 0) {
          console.warn('[ExpandableChartRow] No lifted_data available');
          return;
        }
        
        // Extract time periods and observations
        const times = liftedData.map(d => d.Time);
        const treatmentObs = liftedData.map(d => Number(d.t_obs));
        const controlObs = liftedData.map(d => Number(d.c_obs));
        
        // Calculate treatment start date by subtracting experiment days from the last time
        const lastTime = times[times.length - 1];
        const treatmentStart = lastTime - experimentLength + 1;
        const treatmentEnd = lastTime;
        
        console.log('[ExpandableChartRow] Treatment calculation:', {
          experimentLength,
          lastTime,
          treatmentStart,
          treatmentEnd,
          totalTimes: times.length,
          sampleData: liftedData[0]
        });

        // Render observations per timestamp chart
        const observationsSeries = [
          {
            name: 'Control (Synthetic)',
            data: controlObs,
            color: '#6b7280',
            lineWidth: 2,
            dashStyle: 'Dash'
          },
          {
            name: 'Treatment (Actual)', 
            data: treatmentObs,
            color: '#667eea',
            lineWidth: 2,
            dashStyle: 'Solid'
          }
        ];

        if (chartObservations.current) chartObservations.current.destroy();
        if (chartObservationsRef.current) {
          chartObservations.current = Highcharts.chart(chartObservationsRef.current, {
            title: { text: 'Observations per Timestamp and Test Group', style: { fontSize: '14px' } },
            xAxis: { 
              categories: times, 
              title: { text: 'Time Period' },
              plotBands: (Number.isFinite(treatmentStart) && Number.isFinite(treatmentEnd)) ? [{
                color: 'rgba(150, 150, 150, 0.2)', // Grey shade for treatment period
                from: times.indexOf(treatmentStart),
                to: times.indexOf(treatmentEnd),
                label: { text: 'Treatment Period', style: { color: '#666', fontWeight: 'bold' } }
              }] : [],
              plotLines: (Number.isFinite(treatmentStart)) ? [{
                color: '#666', // Grey color for the line
                width: 2,
                value: times.indexOf(treatmentStart), // Position at treatment start
                dashStyle: 'Dot', // Dotted line style
               
              }] : []
            },
            yAxis: { 
              title: { text: 'Observations' }
            },
            tooltip: {
              shared: true,
              formatter: function() {
                const index = this.x;
                const timePeriod = times[index];
                const actualDate = getDateFromTime(timePeriod);
                
                // Get treatment and control values for this time period
                const treatmentValue = treatmentObs[index];
                const controlValue = controlObs[index];
                
                // Calculate difference (treatment - control)
                const difference = (treatmentValue != null && controlValue != null) ? treatmentValue - controlValue : null;
                
                let tooltipContent = `<b>Date: ${actualDate}</b><br/>`;
                tooltipContent += `<b>Time Period: ${timePeriod}</b><br/><br/>`;
                
                if (treatmentValue != null) {
                  tooltipContent += `<span style="color:#667eea">●</span> Treatment: <b>${treatmentValue.toLocaleString()}</b><br/>`;
                }
                
                if (controlValue != null) {
                  tooltipContent += `<span style="color:#6b7280">●</span> Control (Synthetic): <b>${controlValue.toLocaleString()}</b><br/>`;
                }
                
                if (difference != null) {
                  const diffColor = difference >= 0 ? '#10b981' : '#ef4444';
                  tooltipContent += `<br/><span style="color:${diffColor}">●</span> Difference: <b style="color:${diffColor}">${difference >= 0 ? '+' : ''}${difference.toLocaleString()}</b>`;
                }
                
                return tooltipContent;
              }
            },
            series: observationsSeries,
            legend: { enabled: true },
            chart: { height: 300 }
          });
        }

        // Render power curve chart
        const liftedPower = analysisData?.lifted_power || [];
        
        // Sort by effect size for proper curve visualization
        const sortedPower = [...liftedPower].sort((a, b) => a.EffectSize - b.EffectSize);
        const effectSizes = sortedPower.map(p => Number(p.EffectSize));
        const powerValues = sortedPower.map(p => Number(p.power));

        if (chartPower.current) chartPower.current.destroy();
        if (chartPowerRef.current && effectSizes.length > 0) {
          chartPower.current = Highcharts.chart(chartPowerRef.current, {
            title: { text: 'GeoLift Power Curve', style: { fontSize: '14px' } },
            xAxis: { 
              categories: effectSizes.map(e => e.toFixed(2)), 
              title: { text: 'Effect Size' } 
            },
            yAxis: { 
              title: { text: 'Power' }, 
              max: 1,
              min: 0,
              labels: { formatter() { return `${Math.round(this.value*100)}%`; } } 
            },
            tooltip: {
              formatter: function() {
                const effectSize = effectSizes[this.x];
                const power = powerValues[this.x];
                return `<b>Effect Size: ${effectSize.toFixed(2)}</b><br/>Power: <b>${(power * 100).toFixed(1)}%</b>`;
              }
            },
            series: [{ 
              name: 'Power', 
              data: powerValues,
              color: '#667eea',
              lineWidth: 2,
              marker: {
                enabled: false
              }
            }],
            chart: { height: 300 }
          });
        }
      } catch (e) {
        console.error('[ExpandableChartRow] Chart rendering error:', e);
      }
    })();

    return () => { 
      destroyed = true;
      if (chartObservations.current) {
        chartObservations.current.destroy();
        chartObservations.current = null;
      }
      if (chartPower.current) {
        chartPower.current.destroy();
        chartPower.current = null;
      }
    };
  }, [isExpanded, analysisData, loading, error, experimentLength]);

  if (!isExpanded) return null;

  return (
    <div className="expandable-chart-row">
      
      {loading ? (
        <div className="expandable-chart-loading">
          <div className="loading-text">Loading chart data...</div>
          <div className="progress-container">
            <div className="progress-bar">
              <div className="progress-fill loading-animation"></div>
            </div>
          </div>
          <div className="loading-subtitle">Generating observations and power curve charts</div>
        </div>
      ) : error ? (
        <div className="expandable-chart-error">
          <div className="error-text">{error}</div>
        </div>
      ) : (
        <div className="expandable-charts">
          <div className="expandable-chart-container">
            <div ref={chartObservationsRef} />
          </div>
          <div className="expandable-chart-container">
            <div ref={chartPowerRef} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpandableChartRow;
