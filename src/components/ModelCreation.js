import React, { useState } from 'react';
import { ArrowLeft, Upload, Plus, Trash2 } from 'lucide-react';
import './ModelCreation.css';

const ModelCreation = ({ onBack }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [modelName, setModelName] = useState('');
  const [inputMethod, setInputMethod] = useState('upload');
  const [fileData, setFileData] = useState(null);
  
  // Features data
  const [outcomeKPI, setOutcomeKPI] = useState('Revenue');
  const [outcomeDataType, setOutcomeDataType] = useState('Revenue');
  const [spendFeatures, setSpendFeatures] = useState([
    { id: 1, inputData: 'google_spend', platform: 'Google', type: 'Integrated' },
    { id: 2, inputData: 'tiktok_spend', platform: 'Tiktok', type: 'Integrated' }
  ]);
  const [clicksFeatures, setClicksFeatures] = useState([
    { id: 1, inputData: 'clicks_google_BOF', platform: 'Google', type: 'Google Sheets' },
    { id: 2, inputData: 'clicks_tiktok', platform: 'Tiktok', type: 'Google Sheets' }
  ]);
  
  // Configuration data
  const [adStockSettings, setAdStockSettings] = useState({
    plotOn: 'average',
    decayRate: 'flexible'
  });
  
  // Calibration data
  const [calibrationData, setCalibrationData] = useState([]);
  const [trainingSize, setTrainingSize] = useState({ lowerBound: '0.85', upperBound: '0.9' });

  const steps = [
    { number: 1, label: 'Data', completed: currentStep > 1 },
    { number: 2, label: 'Features', completed: currentStep > 2 },
    { number: 3, label: 'Configuration', completed: currentStep > 3 },
    { number: 4, label: 'Calibration', completed: currentStep > 4 }
  ];

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setFileData(file);
    }
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else {
      // Create model
      console.log('Creating model...');
      onBack();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const addSpendFeature = () => {
    const newId = Math.max(...spendFeatures.map(f => f.id), 0) + 1;
    setSpendFeatures([...spendFeatures, { 
      id: newId, 
      inputData: '', 
      platform: 'Google', 
      type: 'Integrated' 
    }]);
  };

  const addClicksFeature = () => {
    const newId = Math.max(...clicksFeatures.map(f => f.id), 0) + 1;
    setClicksFeatures([...clicksFeatures, { 
      id: newId, 
      inputData: '', 
      platform: 'Google', 
      type: 'Google Sheets' 
    }]);
  };

  const removeSpendFeature = (id) => {
    setSpendFeatures(spendFeatures.filter(f => f.id !== id));
  };

  const removeClicksFeature = (id) => {
    setClicksFeatures(clicksFeatures.filter(f => f.id !== id));
  };

  const addCalibrationRow = () => {
    const newRow = {
      id: Date.now(),
      platform: '',
      startEndDate: '',
      spend: '',
      incrementalRevenue: '',
      confidence: ''
    };
    setCalibrationData([...calibrationData, newRow]);
  };

  const removeCalibrationRow = (id) => {
    setCalibrationData(calibrationData.filter(row => row.id !== id));
  };

  // Ad Stock Chart Component
  const AdStockChart = ({ platform, lowerBound, upperBound, shapeParam, inflectionParam }) => {
    const generateCurve = () => {
      const points = [];
      const maxTime = 25;
      const chartWidth = 480;
      const chartHeight = 140;
      
      for (let i = 0; i <= maxTime; i++) {
        const t = i / maxTime; // Normalize time to 0-1
        const x = (t * chartWidth) + 40; // Add margin for y-axis
        
        // Adstock decay formula: starts high and decays over time
        const decay = Math.exp(-shapeParam * i * 0.3); // Exponential decay
        const saturation = 1 / (1 + Math.exp(-inflectionParam * (i - 5))); // S-curve saturation
        const y = chartHeight - (decay * saturation * (chartHeight - 20)) + 20; // Invert and add margin
        
        points.push(`${x},${y}`);
      }
      return points.join(' ');
    };

    return (
      <div className="adstock-chart">
        <h4>{platform}</h4>
        <div className="chart-container">
          <svg width="100%" height="180" viewBox="0 0 560 180">
            {/* Grid lines */}
            <defs>
              <pattern id={`grid-${platform}`} width="48" height="20" patternUnits="userSpaceOnUse">
                <path d="M 48 0 L 0 0 0 20" fill="none" stroke="#f3f4f6" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect x="40" y="20" width="480" height="140" fill={`url(#grid-${platform})`} />
            
            {/* Axes */}
            <line x1="40" y1="160" x2="520" y2="160" stroke="#9ca3af" strokeWidth="1"/>
            <line x1="40" y1="160" x2="40" y2="20" stroke="#9ca3af" strokeWidth="1"/>
            
            {/* Curve */}
            <polyline
              points={generateCurve()}
              fill="none"
              stroke="#8b5cf6"
              strokeWidth="3"
            />
            
            {/* Labels */}
            <text x="280" y="175" textAnchor="middle" fontSize="12" fill="#6b7280">Time</text>
            <text x="20" y="90" textAnchor="middle" fontSize="12" fill="#6b7280" transform="rotate(-90, 20, 90)">
              Cumulative Decay Effect
            </text>
            
            {/* X-axis numbers */}
            <text x="40" y="175" textAnchor="middle" fontSize="10" fill="#6b7280">0</text>
            <text x="184" y="175" textAnchor="middle" fontSize="10" fill="#6b7280">10</text>
            <text x="328" y="175" textAnchor="middle" fontSize="10" fill="#6b7280">20</text>
            
            {/* Y-axis numbers */}
            <text x="35" y="165" textAnchor="end" fontSize="10" fill="#6b7280">0</text>
            <text x="35" y="135" textAnchor="end" fontSize="10" fill="#6b7280">0.2</text>
            <text x="35" y="105" textAnchor="end" fontSize="10" fill="#6b7280">0.4</text>
            <text x="35" y="75" textAnchor="end" fontSize="10" fill="#6b7280">0.6</text>
            <text x="35" y="45" textAnchor="end" fontSize="10" fill="#6b7280">0.8</text>
            <text x="35" y="25" textAnchor="end" fontSize="10" fill="#6b7280">1.2</text>
          </svg>
        </div>
        
        <div className="chart-parameters">
          <div className="parameter-section">
            <h5>Shape Parameter</h5>
            <div className="parameter-row">
              <div className="parameter-input">
                <label>Lower Bound</label>
                <input type="text" defaultValue={lowerBound} />
              </div>
              <div className="parameter-input">
                <label>Upper Bound</label>
                <input type="text" defaultValue={upperBound} />
              </div>
            </div>
          </div>
          
          <div className="parameter-section">
            <h5>Inflection Point Parameter</h5>
            <div className="parameter-row">
              <div className="parameter-input">
                <label>Lower Bound</label>
                <input type="text" defaultValue="0" />
              </div>
              <div className="parameter-input">
                <label>Upper Bound</label>
                <input type="text" defaultValue="0.1" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="model-creation-page">
      <div className="model-creation-header">
        <div className="header-left">
          <button className="back-button" onClick={onBack}>
            <ArrowLeft size={20} />
            Name your model
          </button>
        </div>
        
        <div className="progress-steps">
          {steps.map((step, index) => (
            <div key={step.number} className="step-container">
              <div 
                className={`step-circle ${currentStep === step.number ? 'active' : ''} ${step.completed ? 'completed' : ''}`}
              >
                {step.completed ? '✓' : step.number}
              </div>
              <span className={`step-label ${currentStep === step.number ? 'active' : ''}`}>
                {step.label}
              </span>
              {index < steps.length - 1 && (
                <div className={`step-connector ${step.completed ? 'completed' : ''}`}></div>
              )}
            </div>
          ))}
        </div>
        
        <button 
          className="next-button"
          onClick={handleNext}
        >
          {currentStep === 4 ? 'Create Model' : 'Next'}
        </button>
      </div>

      <div className="model-creation-content">
        {/* Step 1: Data */}
        {currentStep === 1 && (
          <div className="step-content">
            <div className="step-header">
              <h2>Add Data</h2>
              <p>First, let's add input data to your model</p>
            </div>
            
            <div className="input-method">
              <h3>Input Method</h3>
              <div className="method-options">
                <div 
                  className={`method-option ${inputMethod === 'upload' ? 'selected' : ''}`}
                  onClick={() => setInputMethod('upload')}
                >
                  <Upload size={20} />
                  <span>Upload Your Data</span>
                  {inputMethod === 'upload' && <div className="selected-indicator"></div>}
                </div>
                <div 
                  className={`method-option ${inputMethod === 'integrated' ? 'selected' : ''}`}
                  onClick={() => setInputMethod('integrated')}
                >
                  <div className="integration-icon"></div>
                  <span>Use Integrated Data</span>
                  {inputMethod === 'integrated' && <div className="selected-indicator"></div>}
                </div>
              </div>
            </div>

            {inputMethod === 'upload' && (
              <div className="upload-section">
                <h3>Upload Data</h3>
                <div className="upload-area">
                  <input 
                    type="file" 
                    id="file-upload" 
                    accept=".csv" 
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="file-upload" className="upload-label">
                    <div className="upload-icon">📄</div>
                    <p>
                      <span className="upload-link">Click to upload</span> or drag and drop
                    </p>
                    <p className="upload-info">CSV ( max. 200 MB )</p>
                    {fileData && <p className="file-selected">File selected: {fileData.name}</p>}
                  </label>
                </div>
                <div className="upload-guidelines">
                  <p>Column headers can only contain alphanumeric characters, underscore and must start with an alphabet.</p>
                  <p>Date format must be YYYY-MM-DD.</p>
                  <p>In case of weekly input, all dates are to be either Sundays or Mondays.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Features */}
        {currentStep === 2 && (
          <div className="step-content">
            <div className="step-header">
              <h2>Select Features</h2>
              <p>Now, let's add features from your data to model</p>
            </div>

            <div className="feature-section">
              <h3>Outcome / KPI</h3>
              <div className="feature-row">
                <div className="feature-input">
                  <label>Input Data</label>
                  <select value={outcomeKPI} onChange={(e) => setOutcomeKPI(e.target.value)}>
                    <option value="Revenue">Revenue</option>
                  </select>
                  <span className="data-source">Google Sheets</span>
                </div>
                <div className="feature-input">
                  <label>Data Type</label>
                  <select value={outcomeDataType} onChange={(e) => setOutcomeDataType(e.target.value)}>
                    <option value="Revenue">Revenue</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="feature-section">
              <h3>Paid Marketing - Spend</h3>
              {spendFeatures.map((feature) => (
                <div key={feature.id} className="feature-row">
                  <div className="feature-input">
                    <label>Input Data</label>
                    <select value={feature.inputData}>
                      <option value="google_spend">google_spend</option>
                      <option value="tiktok_spend">tiktok_spend</option>
                    </select>
                    <span className="data-source">{feature.type}</span>
                  </div>
                  <div className="feature-input">
                    <label>Platform</label>
                    <select value={feature.platform}>
                      <option value="Google">Google</option>
                      <option value="Tiktok">Tiktok</option>
                    </select>
                  </div>
                  {spendFeatures.length > 1 && (
                    <button 
                      className="remove-feature"
                      onClick={() => removeSpendFeature(feature.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
              <button className="add-feature" onClick={addSpendFeature}>
                <Plus size={16} />
                Add
              </button>
            </div>

            <div className="feature-section">
              <h3>Paid Marketing - Clicks</h3>
              {clicksFeatures.map((feature) => (
                <div key={feature.id} className="feature-row">
                  <div className="feature-input">
                    <label>Input Data</label>
                    <select value={feature.inputData}>
                      <option value="clicks_google_BOF">clicks_google_BOF</option>
                      <option value="clicks_tiktok">clicks_tiktok</option>
                    </select>
                    <span className="data-source">{feature.type}</span>
                  </div>
                  <div className="feature-input">
                    <label>Platform</label>
                    <select value={feature.platform}>
                      <option value="Google">Google</option>
                      <option value="Tiktok">Tiktok</option>
                    </select>
                  </div>
                  <button 
                    className="remove-feature"
                    onClick={() => removeClicksFeature(feature.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <button className="add-feature" onClick={addClicksFeature}>
                <Plus size={16} />
                Add
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Configuration */}
        {currentStep === 3 && (
          <div className="step-content">
            <div className="step-header">
              <h2>Configuration</h2>
            </div>

            <div className="advanced-settings">
              <h3>Advanced Settings</h3>
              
              <div className="adstock-section">
                <h4>Ad Stock</h4>
                
                <div className="adstock-controls">
                  <div className="control-group">
                    <label>Plot on:</label>
                    <div className="radio-group">
                      <label className="radio-option">
                        <input 
                          type="radio" 
                          name="plotOn" 
                          value="lower-bound"
                          checked={adStockSettings.plotOn === 'lower-bound'}
                          onChange={(e) => setAdStockSettings({...adStockSettings, plotOn: e.target.value})}
                        />
                        Lower Bound
                      </label>
                      <label className="radio-option">
                        <input 
                          type="radio" 
                          name="plotOn" 
                          value="upper-bound"
                          checked={adStockSettings.plotOn === 'upper-bound'}
                          onChange={(e) => setAdStockSettings({...adStockSettings, plotOn: e.target.value})}
                        />
                        Upper Bound
                      </label>
                      <label className="radio-option">
                        <input 
                          type="radio" 
                          name="plotOn" 
                          value="average"
                          checked={adStockSettings.plotOn === 'average'}
                          onChange={(e) => setAdStockSettings({...adStockSettings, plotOn: e.target.value})}
                        />
                        Average
                      </label>
                    </div>
                  </div>
                  
                  <div className="control-group">
                    <label>Decay rate of adstock effect is:</label>
                    <div className="radio-group">
                      <label className="radio-option">
                        <input 
                          type="radio" 
                          name="decayRate" 
                          value="geometric"
                          checked={adStockSettings.decayRate === 'geometric'}
                          onChange={(e) => setAdStockSettings({...adStockSettings, decayRate: e.target.value})}
                        />
                        Geometric
                      </label>
                      <label className="radio-option">
                        <input 
                          type="radio" 
                          name="decayRate" 
                          value="flexible"
                          checked={adStockSettings.decayRate === 'flexible'}
                          onChange={(e) => setAdStockSettings({...adStockSettings, decayRate: e.target.value})}
                        />
                        Flexible
                      </label>
                    </div>
                  </div>
                </div>

                <div className="adstock-charts">
                  <AdStockChart 
                    platform="Google" 
                    lowerBound="0.0005" 
                    upperBound="6"
                    shapeParam={2.5}
                    inflectionParam={0.05}
                  />
                  <AdStockChart 
                    platform="Tiktok" 
                    lowerBound="0.0001" 
                    upperBound="10"
                    shapeParam={3.0}
                    inflectionParam={0.02}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Calibration */}
        {currentStep === 4 && (
          <div className="step-content">
            <div className="step-header">
              <h2>Calibrate Model</h2>
              <p>Finally, let's calibrate your model</p>
            </div>

            <div className="calibration-section">
              <h3>Calibration</h3>
              <div className="calibration-table">
                <table>
                  <thead>
                    <tr>
                      <th>Platform</th>
                      <th>Start-End Date</th>
                      <th>Spend</th>
                      <th>Incremental Revenue</th>
                      <th>Confidence %</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {calibrationData.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <select>
                            <option value="">Select Platform</option>
                            <option value="Google">Google</option>
                            <option value="Tiktok">Tiktok</option>
                          </select>
                        </td>
                        <td><input type="text" placeholder="" /></td>
                        <td><input type="text" placeholder="Enter Spend" /></td>
                        <td><input type="text" placeholder="Enter Incremental KPI" /></td>
                        <td><input type="text" placeholder="Enter Confidence" /></td>
                        <td>
                          <button 
                            className="remove-row"
                            onClick={() => removeCalibrationRow(row.id)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button className="add-calibration" onClick={addCalibrationRow}>
                  <Plus size={16} />
                  Add
                </button>
              </div>
            </div>

            <div className="training-size-section">
              <h3>Training Size</h3>
              <div className="training-size-inputs">
                <div className="size-input">
                  <label>Lower Bound</label>
                  <input 
                    type="text" 
                    value={trainingSize.lowerBound}
                    onChange={(e) => setTrainingSize({...trainingSize, lowerBound: e.target.value})}
                  />
                </div>
                <div className="size-input">
                  <label>Upper Bound</label>
                  <input 
                    type="text" 
                    value={trainingSize.upperBound}
                    onChange={(e) => setTrainingSize({...trainingSize, upperBound: e.target.value})}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModelCreation; 