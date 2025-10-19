import React, { useState, useEffect } from 'react';
import { ArrowLeft, Info } from 'lucide-react';
import DynamicHypothesis from './DynamicHypothesis';
import TreatmentAnalysis from './TreatmentAnalysis';
import './ExperimentDetail.css';

const ExperimentDetail = ({ experiment, onBack }) => {
  const [activeTab, setActiveTab] = useState('test-design');
  const [selectedCell, setSelectedCell] = useState('Cell 1');
  const [showTreatmentAnalysis, setShowTreatmentAnalysis] = useState(false);

  // Check if experiment has stored data for TreatmentAnalysis
  useEffect(() => {
    if (experiment) {
      const hasStoredData = experiment.processedData && 
                           experiment.geoDataReadResponse && 
                           experiment.marketCombo;
      setShowTreatmentAnalysis(hasStoredData);
      console.log('[ExperimentDetail] Has stored data:', hasStoredData, experiment);
    }
  }, [experiment]);

  // Mock data based on the screenshots
  const experimentData = {
    name: 'Tiktok-Scaleup-May',
    status: 'Completed',
    hypothesis: 'Incremental Return of Tiktok by Holding Out',
    cellData: {
      'Cell 1': {
        dateRange: '(May 01 - May 28, 2025)',
        campaigns: '-',
        minDetectableLift: '19.00%',
        additionalSpend: '17,029,159',
        treatmentType: 'Scale-Up'
      }
    },
    testMarkets: {
      states: ['California', 'Illinois', 'Pennsylvania', 'Texas'],
      marketShare: '39.50%'
    },
    controlMarkets: [
      { state: 'Michigan_us', weight: '0.19' },
      { state: 'Georgia_us', weight: '0.19' },
      { state: 'Arizona_us', weight: '0.17' },
      { state: 'Ohio_us', weight: '0.16' },
      { state: 'Florida_us', weight: '0.15' }
    ]
  };

  const usStates = [
    // Test markets (green)
    { id: 'CA', name: 'California', type: 'test', x: 50, y: 200 },
    { id: 'IL', name: 'Illinois', type: 'test', x: 280, y: 150 },
    { id: 'PA', name: 'Pennsylvania', type: 'test', x: 350, y: 120 },
    { id: 'TX', name: 'Texas', type: 'test', x: 200, y: 250 },
    
    // Control markets (yellow)
    { id: 'MI', name: 'Michigan', type: 'control', x: 300, y: 100 },
    { id: 'GA', name: 'Georgia', type: 'control', x: 320, y: 210 },
    { id: 'AZ', name: 'Arizona', type: 'control', x: 120, y: 220 },
    { id: 'OH', name: 'Ohio', type: 'control', x: 310, y: 130 },
    { id: 'FL', name: 'Florida', type: 'control', x: 360, y: 280 },
    
    // Other states (gray)
    { id: 'WA', name: 'Washington', type: 'other', x: 70, y: 50 },
    { id: 'OR', name: 'Oregon', type: 'other', x: 60, y: 80 },
    { id: 'NV', name: 'Nevada', type: 'other', x: 80, y: 150 },
    { id: 'UT', name: 'Utah', type: 'other', x: 130, y: 140 },
    { id: 'CO', name: 'Colorado', type: 'other', x: 180, y: 140 },
    { id: 'WY', name: 'Wyoming', type: 'other', x: 160, y: 110 },
    { id: 'MT', name: 'Montana', type: 'other', x: 150, y: 70 },
    { id: 'ND', name: 'North Dakota', type: 'other', x: 220, y: 70 },
    { id: 'SD', name: 'South Dakota', type: 'other', x: 220, y: 100 },
    { id: 'NE', name: 'Nebraska', type: 'other', x: 200, y: 120 },
    { id: 'KS', name: 'Kansas', type: 'other', x: 200, y: 160 },
    { id: 'OK', name: 'Oklahoma', type: 'other', x: 200, y: 200 },
    { id: 'MN', name: 'Minnesota', type: 'other', x: 250, y: 80 },
    { id: 'IA', name: 'Iowa', type: 'other', x: 250, y: 120 },
    { id: 'MO', name: 'Missouri', type: 'other', x: 250, y: 160 },
    { id: 'AR', name: 'Arkansas', type: 'other', x: 250, y: 200 },
    { id: 'LA', name: 'Louisiana', type: 'other', x: 250, y: 240 },
    { id: 'WI', name: 'Wisconsin', type: 'other', x: 280, y: 110 },
    { id: 'IN', name: 'Indiana', type: 'other', x: 300, y: 140 },
    { id: 'KY', name: 'Kentucky', type: 'other', x: 300, y: 170 },
    { id: 'TN', name: 'Tennessee', type: 'other', x: 300, y: 190 },
    { id: 'MS', name: 'Mississippi', type: 'other', x: 280, y: 220 },
    { id: 'AL', name: 'Alabama', type: 'other', x: 300, y: 230 },
    { id: 'WV', name: 'West Virginia', type: 'other', x: 330, y: 150 },
    { id: 'VA', name: 'Virginia', type: 'other', x: 350, y: 160 },
    { id: 'NC', name: 'North Carolina', type: 'other', x: 350, y: 190 },
    { id: 'SC', name: 'South Carolina', type: 'other', x: 340, y: 210 },
    { id: 'NY', name: 'New York', type: 'other', x: 370, y: 100 },
    { id: 'VT', name: 'Vermont', type: 'other', x: 380, y: 80 },
    { id: 'NH', name: 'New Hampshire', type: 'other', x: 390, y: 90 },
    { id: 'ME', name: 'Maine', type: 'other', x: 400, y: 70 },
    { id: 'MA', name: 'Massachusetts', type: 'other', x: 390, y: 110 },
    { id: 'RI', name: 'Rhode Island', type: 'other', x: 395, y: 120 },
    { id: 'CT', name: 'Connecticut', type: 'other', x: 380, y: 120 },
    { id: 'NJ', name: 'New Jersey', type: 'other', x: 370, y: 130 },
    { id: 'DE', name: 'Delaware', type: 'other', x: 370, y: 140 },
    { id: 'MD', name: 'Maryland', type: 'other', x: 360, y: 140 }
  ];

  // Generate time series data
  const generateTimeSeriesData = () => {
    const data = [];
    const startDate = new Date('2025-05-01');
    for (let i = 0; i < 28; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const control = 500000 + Math.random() * 1000000;
      const treatment = 600000 + Math.random() * 900000;
      data.push({
        date: date.toISOString().split('T')[0],
        control,
        treatment,
        day: i
      });
    }
    return data;
  };

  const timeSeriesData = generateTimeSeriesData();

  const getStateColor = (type) => {
    switch (type) {
      case 'test': return '#10b981';
      case 'control': return '#f59e0b';
      default: return '#d1d5db';
    }
  };

  // Extract available locations from geoDataReadResponse
  const availableLocations = experiment?.geoDataReadResponse?.summary?.unique_locations || [];

  // If we have stored data, show TreatmentAnalysis
  if (showTreatmentAnalysis) {
    return (
      <div className="experiment-detail-page">
        <div className="experiment-header">
        
          
          <div className="breadcrumb">
            <span className="breadcrumb-item clickable" onClick={onBack}>Experiments</span>
            <span className="breadcrumb-separator">›</span>
            <span className="breadcrumb-item current">{experiment.name}</span>
            <span className="status-badge completed">{experiment.status}</span>
          </div>
        </div>

        <div className="experiment-content">
          <TreatmentAnalysis
            selectedRow={experiment.marketCombo}
            processedData={experiment.processedData}
            geoDataReadResponse={experiment.geoDataReadResponse}
            availableLocations={availableLocations}
            onBack={onBack}
            userConfig={experiment.userConfig || {}}
          />
        </div>
      </div>
    );
  }

  // Otherwise, show the mock experiment detail view
  return (
    <div className="experiment-detail-page">
      <div className="experiment-header">
        <button className="back-button" onClick={onBack}>
          <ArrowLeft size={20} />
          Back
        </button>
        
        <div className="breadcrumb">
          <span className="breadcrumb-item clickable" onClick={onBack}>Experiments</span>
          <span className="breadcrumb-separator">›</span>
          <span className="breadcrumb-item current">{experimentData.name}</span>
          <span className="status-badge completed">{experimentData.status}</span>
        </div>
      </div>

      <div className="experiment-content">
        <div className="experiment-tabs">
          <button
            className={`tab-button ${activeTab === 'test-design' ? 'active' : ''}`}
            onClick={() => setActiveTab('test-design')}
          >
            Test Design
          </button>
          <button
            className={`tab-button ${activeTab === 'insights' ? 'active' : ''}`}
            onClick={() => setActiveTab('insights')}
          >
            Insights
          </button>
          <button
            className={`tab-button ${activeTab === 'campaigns' ? 'active' : ''}`}
            onClick={() => setActiveTab('campaigns')}
          >
            Campaigns
          </button>
        </div>

        {activeTab === 'test-design' && (
          <div className="test-design-content">
            {/* Cell Selection */}
            <div className="cell-section">
              <h3>Cell</h3>
              <div className="cell-selector">
                <select value={selectedCell} onChange={(e) => setSelectedCell(e.target.value)}>
                  <option value="Cell 1">Cell 1</option>
                </select>
              </div>
            </div>

            {/* Cell Details */}
            <div className="cell-details">
              <h3>Cell 1 <span className="date-range">{experimentData.cellData[selectedCell].dateRange}</span></h3>
              
              <div className="hypothesis-section">
                <h4>Hypothesis</h4>
                <DynamicHypothesis />
              </div>

              <div className="experiment-metrics">
                <div className="metrics-row">
                  <div className="metric-group">
                    <div className="metric-item">
                      <label>Campaigns <Info size={14} /></label>
                      <span>{experimentData.cellData[selectedCell].campaigns}</span>
                    </div>
                    <div className="metric-item">
                      <label>Minimum Detectable Lift <Info size={14} /></label>
                      <span>{experimentData.cellData[selectedCell].minDetectableLift}</span>
                    </div>
                  </div>
                  <div className="metric-group">
                    <div className="metric-item">
                      <label>Treatment Type</label>
                      <span>{experimentData.cellData[selectedCell].treatmentType}</span>
                    </div>
                    <div className="metric-item">
                      <label>Additional Spend <Info size={14} /></label>
                      <span>{experimentData.cellData[selectedCell].additionalSpend}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Markets Section */}
              <div className="markets-section">
                <div className="markets-content">
                  <div className="markets-left">
                    <div className="test-markets">
                      <div className="market-header">
                        <span className="market-indicator test"></span>
                        <span>Test Markets</span>
                        <Info size={14} />
                      </div>
                      <div className="market-details">
                        <span className="market-states">{experimentData.testMarkets.states.join(', ')}</span>
                        <div className="market-share">
                          <span>Market Share</span>
                          <Info size={14} />
                        </div>
                        <span className="market-percentage">{experimentData.testMarkets.marketShare}</span>
                      </div>
                    </div>

                    <div className="control-markets">
                      <div className="market-header">
                        <span className="market-indicator control"></span>
                        <span>Control Markets</span>
                      </div>
                      <div className="control-list">
                        {experimentData.controlMarkets.map((market, index) => (
                          <div key={index} className="control-item">
                            <span className="weight">({market.weight})</span>
                            <span className="state">{market.state}</span>
                            {index < experimentData.controlMarkets.length - 1 && <span className="separator">+</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="map-view">
                    <h4>Map View</h4>
                    <div className="us-map">
                      <svg viewBox="0 0 450 350" className="map-svg">
                        {usStates.map((state) => (
                          <circle
                            key={state.id}
                            cx={state.x}
                            cy={state.y}
                            r="12"
                            fill={getStateColor(state.type)}
                            stroke="white"
                            strokeWidth="1"
                            opacity="0.8"
                          />
                        ))}
                        {usStates.map((state) => (
                          <text
                            key={`${state.id}-text`}
                            x={state.x}
                            y={state.y + 3}
                            textAnchor="middle"
                            fontSize="8"
                            fill="white"
                            fontWeight="500"
                          >
                            {state.id}
                          </text>
                        ))}
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Time Series Decomposition */}
              <div className="time-series-section">
                <h4>Time Series Decomposition</h4>
                <p className="section-subtitle">Observations per Timestamp and Test Group</p>
                
                <div className="time-series-chart">
                  <svg viewBox="0 0 800 200" className="chart-svg">
                    {/* Grid lines */}
                    {[0, 25, 50, 75, 100].map((y, i) => (
                      <line key={i} x1="50" y1={150 - y * 1.2} x2="750" y2={150 - y * 1.2} stroke="#f0f0f0" strokeWidth="1" />
                    ))}
                    
                    {/* Control line */}
                    <path
                      d={timeSeriesData.map((d, i) => {
                        const x = 50 + (i / (timeSeriesData.length - 1)) * 700;
                        const y = 150 - (d.control / 1500000) * 120;
                        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                      }).join(' ')}
                      fill="none"
                      stroke="#6b7280"
                      strokeWidth="2"
                    />
                    
                    {/* Treatment line */}
                    <path
                      d={timeSeriesData.map((d, i) => {
                        const x = 50 + (i / (timeSeriesData.length - 1)) * 700;
                        const y = 150 - (d.treatment / 1500000) * 120;
                        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                      }).join(' ')}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="2"
                    />
                    
                    {/* Y-axis labels */}
                    <text x="35" y="155" fontSize="10" fill="#666" textAnchor="end">0</text>
                    <text x="35" y="125" fontSize="10" fill="#666" textAnchor="end">500K</text>
                    <text x="35" y="95" fontSize="10" fill="#666" textAnchor="end">1M</text>
                    <text x="35" y="65" fontSize="10" fill="#666" textAnchor="end">1.5M</text>
                    <text x="35" y="35" fontSize="10" fill="#666" textAnchor="end">2M</text>
                    
                    {/* Legend */}
                    <g transform="translate(650, 30)">
                      <line x1="0" y1="0" x2="20" y2="0" stroke="#6b7280" strokeWidth="2" />
                      <text x="25" y="4" fontSize="12" fill="#666">Control</text>
                      <line x1="0" y1="15" x2="20" y2="15" stroke="#3b82f6" strokeWidth="2" />
                      <text x="25" y="19" fontSize="12" fill="#666">Treatment</text>
                    </g>
                  </svg>
                </div>
              </div>

              {/* GeoLift Power Curve */}
              <div className="power-curve-section">
                <h4>GeoLift Power Curve - Rank 1</h4>
                
                <div className="power-curve-chart">
                  <svg viewBox="0 0 600 300" className="chart-svg">
                    {/* Grid */}
                    <line x1="60" y1="50" x2="60" y2="200" stroke="#333" strokeWidth="1" />
                    <line x1="60" y1="200" x2="550" y2="200" stroke="#333" strokeWidth="1" />
                    
                    {/* Power curve */}
                    <path
                      d="M 60 200 Q 200 190, 300 125 Q 400 60, 550 50"
                      fill="none"
                      stroke="#666"
                      strokeWidth="2"
                      strokeDasharray="5,5"
                    />
                    
                    {/* Filled area */}
                    <path
                      d="M 60 200 L 300 200 L 300 125 Q 200 190, 60 200"
                      fill="#e5e7eb"
                      opacity="0.5"
                    />
                    
                    {/* Y-axis labels */}
                    <text x="45" y="205" fontSize="10" fill="#666" textAnchor="end">0</text>
                    <text x="45" y="170" fontSize="10" fill="#666" textAnchor="end">0.2</text>
                    <text x="45" y="140" fontSize="10" fill="#666" textAnchor="end">0.4</text>
                    <text x="45" y="110" fontSize="10" fill="#666" textAnchor="end">0.6</text>
                    <text x="45" y="80" fontSize="10" fill="#666" textAnchor="end">0.8</text>
                    <text x="45" y="55" fontSize="10" fill="#666" textAnchor="end">1</text>
                    
                    {/* Y-axis title */}
                    <text x="25" y="125" fontSize="12" fill="#333" textAnchor="middle" transform="rotate(-90, 25, 125)">Power</text>
                    
                    {/* X-axis title */}
                    <text x="305" y="230" fontSize="12" fill="#333" textAnchor="middle">Effect Size</text>
                    
                    {/* Right side values */}
                    <text x="570" y="60" fontSize="10" fill="#666">$40,008</text>
                    <text x="570" y="90" fontSize="10" fill="#666">$33,340</text>
                    <text x="570" y="120" fontSize="10" fill="#666">$26,672</text>
                    <text x="570" y="150" fontSize="10" fill="#666">$20,004</text>
                    <text x="570" y="180" fontSize="10" fill="#666">$13,336</text>
                    <text x="570" y="205" fontSize="10" fill="#666">$0</text>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'insights' && (
          <div className="insights-content">
            <p>Insights content will be displayed here</p>
          </div>
        )}

        {activeTab === 'campaigns' && (
          <div className="campaigns-content">
            <p>Campaigns content will be displayed here</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExperimentDetail; 