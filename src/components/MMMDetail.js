import React, { useState } from 'react';
import { Calendar } from 'lucide-react';
import './MMMDetail.css';

const MMMDetail = ({ model }) => {
  const [activeTab, setActiveTab] = useState('model');
  const [dateRange, setDateRange] = useState('03 Apr 22 - 29 Sep 24');

  // Mock data based on the screenshots
  const modelData = {
    name: 'Acme-Retail-Revenue',
    version: 'V1 - Estimation Error: 0.88%',
    metrics: {
      r2: '91.13 %',
      nrmse: '0',
      actualRevenue: '$113,409,347.91',
      predictedRevenue: '$114,406,891.22',
      estimationError: '0.88 %'
    },
    backtests: [
      { period: '4 weeks', actualRevenue: '$1,990,204.60', predictedRevenue: '$2,139,469.95', error: '7.50%' },
      { period: '6 weeks', actualRevenue: '$4,594,661.02', predictedRevenue: '$4,997,424.62', error: '8.77%' },
      { period: '8 weeks', actualRevenue: '$6,241,668.37', predictedRevenue: '$7,067,574.65', error: '13.23%' },
      { period: '10 weeks', actualRevenue: '$7,888,929.61', predictedRevenue: '$9,113,100.56', error: '15.52%' },
      { period: '12 weeks', actualRevenue: '$9,739,680.19', predictedRevenue: '$11,323,415.65', error: '16.26%' }
    ]
  };

  // Generate time series data for the chart
  const generateTimeSeriesData = () => {
    const data = [];
    const startDate = new Date('2022-04-03');
    const endDate = new Date('2024-09-29');
    const totalDays = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
    
    for (let i = 0; i <= totalDays; i += 7) { // Weekly data points
      const currentDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const week = Math.floor(i / 7);
      
      // Generate realistic revenue patterns with seasonality
      const baseRevenue = 800000 + Math.sin(week * 0.1) * 200000;
      const seasonality = Math.sin((week % 52) * 0.12) * 300000;
      const noise = (Math.random() - 0.5) * 100000;
      
      const actualRevenue = Math.max(0, baseRevenue + seasonality + noise);
      const predictedRevenue = actualRevenue + (Math.random() - 0.5) * 150000;
      
      data.push({
        date: currentDate,
        actual: actualRevenue,
        predicted: predictedRevenue,
        week: week
      });
    }
    return data;
  };

  const timeSeriesData = generateTimeSeriesData();

  // Chart component
  const RevenueChart = () => {
    const chartWidth = 1000;
    const chartHeight = 220;
    const margin = { top: 20, right: 40, bottom: 50, left: 80 };
    
    const maxRevenue = Math.max(...timeSeriesData.map(d => Math.max(d.actual, d.predicted)));
    const minRevenue = Math.min(...timeSeriesData.map(d => Math.min(d.actual, d.predicted)));
    
    const xScale = (index) => margin.left + (index / (timeSeriesData.length - 1)) * (chartWidth - margin.left - margin.right);
    const yScale = (value) => margin.top + (1 - (value - minRevenue) / (maxRevenue - minRevenue)) * (chartHeight - margin.top - margin.bottom);
    
    const actualPath = timeSeriesData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(d.actual)}`).join(' ');
    const predictedPath = timeSeriesData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(d.predicted)}`).join(' ');
    
    // Generate month labels for x-axis
    const monthLabels = [];
    const labelInterval = Math.floor(timeSeriesData.length / 12);
    for (let i = 0; i < timeSeriesData.length; i += labelInterval) {
      const date = timeSeriesData[i].date;
      monthLabels.push({
        x: xScale(i),
        label: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
      });
    }

    return (
      <div className="revenue-chart">
        <svg width="100%" height="280" viewBox={`0 0 ${chartWidth} ${chartHeight + 40}`}>
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="50" height="40" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 40" fill="none" stroke="#f0f0f0" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect x={margin.left} y={margin.top} width={chartWidth - margin.left - margin.right} height={chartHeight - margin.top - margin.bottom} fill="url(#grid)" />
          
          {/* Training/Validation period dividers */}
          <rect x={margin.left} y={margin.top} width={chartWidth * 0.7 - margin.left} height={chartHeight - margin.top - margin.bottom} fill="rgba(66, 153, 225, 0.1)" />
          <rect x={chartWidth * 0.7} y={margin.top} width={chartWidth * 0.3 - margin.right} height={chartHeight - margin.top - margin.bottom} fill="rgba(255, 193, 7, 0.1)" />
          
          {/* Period labels */}
          <text x={chartWidth * 0.4} y={margin.top + 15} textAnchor="middle" fontSize="12" fill="#666" fontWeight="500">Training Period</text>
          <text x={chartWidth * 0.85} y={margin.top + 15} textAnchor="middle" fontSize="12" fill="#666" fontWeight="500">Validation Period</text>
          
          {/* Axes */}
          <line x1={margin.left} y1={chartHeight - margin.bottom} x2={chartWidth - margin.right} y2={chartHeight - margin.bottom} stroke="#ccc" strokeWidth="1"/>
          <line x1={margin.left} y1={margin.top} x2={margin.left} y2={chartHeight - margin.bottom} stroke="#ccc" strokeWidth="1"/>
          
          {/* Revenue lines */}
          <path d={actualPath} fill="none" stroke="#3182ce" strokeWidth="2"/>
          <path d={predictedPath} fill="none" stroke="#ed8936" strokeWidth="2"/>
          
          {/* Y-axis labels */}
          {[0, 1, 2, 3, 4].map(i => {
            const value = minRevenue + (i / 4) * (maxRevenue - minRevenue);
            const y = yScale(value);
            return (
              <g key={i}>
                <line x1={margin.left - 5} y1={y} x2={margin.left} y2={y} stroke="#ccc" strokeWidth="1"/>
                <text x={margin.left - 10} y={y + 4} textAnchor="end" fontSize="10" fill="#666">
                  ${(value / 1000000).toFixed(0)}M
                </text>
              </g>
            );
          })}
          
          {/* X-axis labels */}
          {monthLabels.map((label, i) => (
            <text key={i} x={label.x} y={chartHeight - margin.bottom + 15} textAnchor="middle" fontSize="9" fill="#666" transform={`rotate(-45, ${label.x}, ${chartHeight - margin.bottom + 15})`}>
              {label.label}
            </text>
          ))}
          
          {/* Y-axis title */}
          <text x="20" y={chartHeight / 2} textAnchor="middle" fontSize="12" fill="#666" transform={`rotate(-90, 20, ${chartHeight / 2})`}>
            Revenue
          </text>
        </svg>
        
        {/* Legend */}
        <div className="chart-legend">
          <div className="legend-item">
            <span className="legend-color predicted"></span>
            <span>Predicted Revenue</span>
          </div>
          <div className="legend-item">
            <span className="legend-color actual"></span>
            <span>Actual Revenue</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="mmm-detail-page">
      <div className="mmm-detail-header">
        <div className="header-breadcrumb">
          <span className="breadcrumb-item">Marketing Mix Models</span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">{modelData.name}</span>
        </div>
        
        <div className="header-actions">
          <button className="calibrate-button">Calibrate</button>
          <button className="retrain-button">Re-Train</button>
        </div>
      </div>

      <div className="mmm-detail-content">
        <div className="model-tabs">
          {['Overview', 'Model', 'Insights', 'Budget Optimizer', 'Campaigns'].map((tab) => (
            <button
              key={tab}
              className={`tab-button ${activeTab === tab.toLowerCase().replace(/ /g, '-') ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.toLowerCase().replace(/ /g, '-'))}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'budget-optimizer' && (
          <div className="budget-optimizer-content">
            <div className="budget-section">
              <h3>Current - Optimized Budget</h3>
              <div className="budget-controls">
                <div className="budget-inputs">
                  <div className="budget-group">
                    <div className="budget-input">
                      <label>Current Budget</label>
                      <input type="text" defaultValue="$1,11,895" />
                    </div>
                    <div className="budget-input">
                      <input type="text" defaultValue="100" />
                      <span className="percentage">%</span>
                    </div>
                    <div className="budget-input">
                      <label>Planned Budget</label>
                      <input type="text" defaultValue="$1,11,895" />
                    </div>
                  </div>
                  <div className="target-group">
                    <div className="budget-input">
                      <label>Target iROAS</label>
                      <input type="text" defaultValue="11.34" />
                    </div>
                  </div>
                </div>
                <div className="time-selector">
                  <select defaultValue="Next Week">
                    <option>Next Week</option>
                    <option>This Month</option>
                    <option>Next Month</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="platform-performance">
              <div className="performance-grid">
                <div className="platform-card all-platforms">
                  <div className="platform-header">
                    <h4>All Platforms</h4>
                    <div className="performance-metrics">
                      <span className="percentage-change">0%</span>
                      <span className="budget-change">-2</span>
                    </div>
                  </div>
                </div>
                
                <div className="platform-card positive">
                  <div className="platform-header">
                    <h4>Google Display</h4>
                    <div className="performance-metrics">
                      <span className="percentage-change positive">+399%</span>
                      <span className="budget-change positive">+7.24 K</span>
                    </div>
                  </div>
                </div>

                <div className="platform-card positive">
                  <div className="platform-header">
                    <h4>Facebook Video</h4>
                    <div className="performance-metrics">
                      <span className="percentage-change positive">+398%</span>
                      <span className="budget-change positive">+7.36 K</span>
                    </div>
                  </div>
                </div>

                <div className="platform-card negative">
                  <div className="platform-header">
                    <h4>Google Discovery</h4>
                    <div className="performance-metrics">
                      <span className="percentage-change negative">-99%</span>
                      <span className="budget-change negative">-29.17 K</span>
                    </div>
                  </div>
                </div>

                <div className="platform-card positive">
                  <div className="platform-header">
                    <h4>Tiktok</h4>
                    <div className="performance-metrics">
                      <span className="percentage-change positive">+188%</span>
                      <span className="budget-change positive">+60.66 K</span>
                    </div>
                  </div>
                </div>

                <div className="platform-card negative">
                  <div className="platform-header">
                    <h4>Meta_Audience_Network</h4>
                    <div className="performance-metrics">
                      <span className="percentage-change negative">-99%</span>
                      <span className="budget-change negative">-46.09 K</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="budget-allocation-chart">
                <svg width="100%" height="400" viewBox="0 0 1000 400">
                  {/* Y-axis labels */}
                  <text x="30" y="50" textAnchor="end" fontSize="12" fill="#6b7280">$110 K</text>
                  <text x="30" y="80" textAnchor="end" fontSize="12" fill="#6b7280">$100 K</text>
                  <text x="30" y="110" textAnchor="end" fontSize="12" fill="#6b7280">$90 K</text>
                  <text x="30" y="140" textAnchor="end" fontSize="12" fill="#6b7280">$80 K</text>
                  <text x="30" y="170" textAnchor="end" fontSize="12" fill="#6b7280">$70 K</text>
                  <text x="30" y="200" textAnchor="end" fontSize="12" fill="#6b7280">$60 K</text>
                  <text x="30" y="230" textAnchor="end" fontSize="12" fill="#6b7280">$50 K</text>
                  <text x="30" y="260" textAnchor="end" fontSize="12" fill="#6b7280">$40 K</text>
                  <text x="30" y="290" textAnchor="end" fontSize="12" fill="#6b7280">$30 K</text>
                  <text x="30" y="320" textAnchor="end" fontSize="12" fill="#6b7280">$20 K</text>
                  <text x="30" y="350" textAnchor="end" fontSize="12" fill="#6b7280">$10 K</text>
                  <text x="30" y="380" textAnchor="end" fontSize="12" fill="#6b7280">$0</text>

                  {/* Platform bars */}
                  {[
                    { name: 'All Platforms', current: 90, optimized: 88, x: 80 },
                    { name: 'Google Display', current: 8, optimized: 12, x: 200 },
                    { name: 'Facebook Video', current: 10, optimized: 14, x: 320 },
                    { name: 'Google Discovery', current: 25, optimized: 8, x: 440 },
                    { name: 'Tiktok', current: 30, optimized: 85, x: 560 },
                    { name: 'Meta_Audience_Network', current: 22, optimized: 8, x: 680 }
                  ].map((platform, index) => (
                    <g key={index}>
                      {/* Current budget bar (light purple) */}
                      <rect
                        x={platform.x}
                        y={380 - platform.current * 3}
                        width="30"
                        height={platform.current * 3}
                        fill="#c4b5fd"
                      />
                      {/* Optimized budget bar (dark purple) */}
                      <rect
                        x={platform.x + 35}
                        y={380 - platform.optimized * 3}
                        width="30"
                        height={platform.optimized * 3}
                        fill="#8b5cf6"
                      />
                      {/* Platform label */}
                      <text
                        x={platform.x + 32}
                        y="395"
                        textAnchor="middle"
                        fontSize="10"
                        fill="#6b7280"
                        transform={`rotate(-45, ${platform.x + 32}, 395)`}
                      >
                        {platform.name}
                      </text>
                    </g>
                  ))}

                  {/* Legend */}
                  <g transform="translate(750, 50)">
                    <rect x="0" y="0" width="15" height="15" fill="#c4b5fd"/>
                    <text x="20" y="12" fontSize="12" fill="#374151">Current</text>
                    
                    <rect x="0" y="25" width="15" height="15" fill="#8b5cf6"/>
                    <text x="20" y="37" fontSize="12" fill="#374151">Optimized</text>
                  </g>
                </svg>
              </div>
            </div>

            <div className="saturation-curve-section">
              <div className="section-header">
                <h3>Saturation (Diminishing Returns) Curve</h3>
                <div className="platform-selector">
                  <select defaultValue="Google Display">
                    <option>Google Display</option>
                    <option>Facebook Video</option>
                    <option>Google Discovery</option>
                    <option>Tiktok</option>
                    <option>Meta_Audience_Network</option>
                  </select>
                </div>
              </div>
              
              <div className="saturation-chart">
                <svg width="100%" height="300" viewBox="0 0 800 300">
                  {/* Grid background */}
                  <defs>
                    <pattern id="saturation-grid" width="40" height="30" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 30" fill="none" stroke="#f0f0f0" strokeWidth="1"/>
                    </pattern>
                  </defs>
                  <rect width="800" height="300" fill="url(#saturation-grid)" />
                  
                  {/* Y-axis label */}
                  <text x="30" y="50" textAnchor="end" fontSize="12" fill="#6b7280">$400,000</text>
                  
                  {/* Saturation curve - diminishing returns curve */}
                  <path
                    d="M 60 250 Q 200 200 300 150 Q 500 100 600 80 Q 700 70 750 65"
                    fill="none"
                    stroke="#8b5cf6"
                    strokeWidth="3"
                  />
                  
                  {/* Current point marker */}
                  <circle cx="200" cy="200" r="6" fill="#ef4444" />
                  <text x="200" y="190" textAnchor="middle" fontSize="10" fill="#ef4444">Current</text>
                  
                  {/* Optimal point marker */}
                  <circle cx="400" cy="120" r="6" fill="#10b981" />
                  <text x="400" y="110" textAnchor="middle" fontSize="10" fill="#10b981">Optimal</text>
                </svg>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'model' && (
          <div className="model-content">
            <div className="model-info-section">
              <div className="date-version-row">
                <div className="date-range-selector">
                  <label>Date Range</label>
                  <div className="date-input">
                    <Calendar size={16} />
                    <input type="text" value={dateRange} onChange={(e) => setDateRange(e.target.value)} />
                  </div>
                </div>
                
                <div className="version-selector">
                  <label>Version</label>
                  <select>
                    <option>{modelData.version}</option>
                  </select>
                </div>
              </div>

              <div className="metrics-grid">
                <div className="metric-card">
                  <div className="metric-label">R²</div>
                  <div className="metric-value large">{modelData.metrics.r2}</div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">NRMSE</div>
                  <div className="metric-value large">{modelData.metrics.nrmse}</div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Actual Revenue</div>
                  <div className="metric-value">{modelData.metrics.actualRevenue}</div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Predicted Revenue</div>
                  <div className="metric-value">{modelData.metrics.predictedRevenue}</div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Estimation Error ( % )</div>
                  <div className="metric-value">{modelData.metrics.estimationError}</div>
                </div>
              </div>
            </div>

            <div className="chart-section">
              <h3>Actual vs Predicted Revenue</h3>
              <RevenueChart />
            </div>

            <div className="backtests-section">
              <h3>Backtests</h3>
              <div className="backtests-table">
                <table>
                  <thead>
                    <tr>
                      <th>Period</th>
                      <th>Actual Revenue</th>
                      <th>Predicted Revenue</th>
                      <th>Estimated Error (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modelData.backtests.map((backtest, index) => (
                      <tr key={index}>
                        <td>{backtest.period}</td>
                        <td>{backtest.actualRevenue}</td>
                        <td>{backtest.predictedRevenue}</td>
                        <td>{backtest.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="saturation-section">
              <div className="section-header">
                <h3>Saturation & Ad Stock Curves</h3>
                <div className="platform-selector">
                  <select defaultValue="Google BOF">
                    <option>Google BOF</option>
                    <option>Tiktok</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MMMDetail; 