import React, { useState } from 'react';
import { ArrowLeft, Plus } from 'lucide-react';
import './ExperimentSetup.css';

const ExperimentSetup = ({ onBack }) => {
  const [experimentType, setExperimentType] = useState('split');
  const [dateRange, setDateRange] = useState('Mar 1 - Mar 8, 2024');
  const [endWithSignificance, setEndWithSignificance] = useState(false);
  const [selectedSegments, setSelectedSegments] = useState('');
  const [selectedKPI, setSelectedKPI] = useState('');
  const [autoSplit, setAutoSplit] = useState(false);
  const [splits, setSplits] = useState([
    {
      id: 1,
      name: 'Control',
      destination: '',
      percentage: 10
    },
    {
      id: 2,
      name: 'Treatment A',
      destination: '',
      percentage: 90
    }
  ]);

  const addSplit = () => {
    const newSplit = {
      id: splits.length + 1,
      name: `Treatment ${String.fromCharCode(65 + splits.length - 1)}`,
      destination: '',
      percentage: 0
    };
    setSplits([...splits, newSplit]);
  };

  const updateSplit = (id, field, value) => {
    setSplits(splits.map(split => 
      split.id === id ? { ...split, [field]: value } : split
    ));
  };

  return (
    <div className="experiment-setup">
      <div className="setup-header">
        <button className="back-button" onClick={onBack}>
          <ArrowLeft size={20} />
          Name your experiment
        </button>
        <button className="create-experiment-btn">
          Create Experiment
        </button>
      </div>

      <div className="setup-content">
        <div className="setup-form">
          <h1>Setup your Experiment</h1>
          <p className="subtitle">Design and setup your experiment</p>

          <div className="form-section">
            <h3>Experiment Type</h3>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="experimentType"
                  value="split"
                  checked={experimentType === 'split'}
                  onChange={(e) => setExperimentType(e.target.value)}
                />
                <span className="radio-custom"></span>
                Split Testing
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="experimentType"
                  value="geo"
                  checked={experimentType === 'geo'}
                  onChange={(e) => setExperimentType(e.target.value)}
                />
                <span className="radio-custom"></span>
                Geo Testing
              </label>
            </div>
          </div>

          <div className="form-section">
            <h3>Experiment Duration</h3>
            <input
              type="text"
              className="date-input"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            />
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={endWithSignificance}
                onChange={(e) => setEndWithSignificance(e.target.checked)}
              />
              <span className="checkbox-custom"></span>
              End Test using statistical significance
            </label>
          </div>

          <div className="form-section">
            <h3>Segments & Lists</h3>
            <select
              className="select-input"
              value={selectedSegments}
              onChange={(e) => setSelectedSegments(e.target.value)}
            >
              <option value="">Select Segments & Lists</option>
              <option value="all">All Contacts</option>
              <option value="new">New Contacts</option>
            </select>
            <p className="contact-count">0 Contacts</p>
          </div>

          <div className="form-section">
            <h3>Outcome / KPI</h3>
            <select
              className="select-input"
              value={selectedKPI}
              onChange={(e) => setSelectedKPI(e.target.value)}
            >
              <option value="">Select Outcome / KPI</option>
              <option value="revenue">Revenue</option>
              <option value="conversion">Conversion Rate</option>
              <option value="clicks">Click Rate</option>
            </select>
          </div>

          <div className="form-section">
            <h3>Splits</h3>
            <div className="auto-split-toggle">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={autoSplit}
                  onChange={(e) => setAutoSplit(e.target.checked)}
                />
                <span className="toggle-slider"></span>
                Auto Split
              </label>
            </div>

            {splits.map((split) => (
              <div key={split.id} className="split-row">
                <div className="split-name">
                  <input
                    type="text"
                    value={split.name}
                    onChange={(e) => updateSplit(split.id, 'name', e.target.value)}
                    className="text-input"
                  />
                </div>
                <div className="split-destination">
                  <select
                    className="select-input"
                    value={split.destination}
                    onChange={(e) => updateSplit(split.id, 'destination', e.target.value)}
                  >
                    <option value="">Select Destination</option>
                    <option value="landing-a">Landing Page A</option>
                    <option value="landing-b">Landing Page B</option>
                  </select>
                </div>
                <div className="split-percentage">
                  <input
                    type="number"
                    value={split.percentage}
                    onChange={(e) => updateSplit(split.id, 'percentage', parseInt(e.target.value) || 0)}
                    className="percentage-input"
                  />
                  <span className="percentage-symbol">%</span>
                </div>
              </div>
            ))}

            <button className="add-split-btn" onClick={addSplit}>
              <Plus size={16} />
              + Add Split
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExperimentSetup; 