import React, { useState } from 'react';

const defaultAdvanced = {
  testType: 'increase', // 'increase' | 'decrease'
  outcomeType: 'revenue', // 'conversions' | 'revenue'
  channelROI: '3',
  experimentLength: '28',
  cooldownPeriod: '7',
  testAmount: '15000',
  marketsRequired: '',
  excludeFromTest: '',
  excludeCompletely: '',
  numTestGeos: 2
};

const CellAdvancedConfig = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const v = { ...defaultAdvanced, ...(value || {}) };

  const update = (field, val) => {
    onChange && onChange({ ...v, [field]: val });
  };

  return (
    <div className="advanced">
      <button type="button" className="advanced-toggle" onClick={() => setOpen(!open)}>
        <span className={`caret ${open ? 'open' : ''}`}>▸</span>
        Advanced Configuration
      </button>
      {open && (
        <div className="advanced-panel">
          <div className="adv-field">
            <label className="config-label">Which of the following best describes the type of test you want to run?</label>
            <div className="radio-row">
              <label className="radio-inline">
                <input type="radio" name="testType" checked={v.testType === 'decrease'} onChange={() => update('testType', 'decrease')} />
                <span>Decrease or eliminate spend in an existing channel</span>
              </label>
              <label className="radio-inline">
                <input type="radio" name="testType" checked={v.testType === 'increase'} onChange={() => update('testType', 'increase')} />
                <span>Increase spend on an existing channel or add a new channel</span>
              </label>
            </div>
          </div>

          <div className="adv-field">
            <label className="config-label">Outcome variable type</label>
            <div className="radio-row">
              <label className="radio-inline">
                <input type="radio" name="outcomeType" checked={v.outcomeType === 'conversions'} onChange={() => update('outcomeType', 'conversions')} />
                <span>conversions</span>
              </label>
              <label className="radio-inline">
                <input type="radio" name="outcomeType" checked={v.outcomeType === 'revenue'} onChange={() => update('outcomeType', 'revenue')} />
                <span>revenue</span>
              </label>
            </div>
          </div>

          <div className="adv-grid">
            <div className="adv-field">
              <label className="config-label">Approximate channel ROI</label>
              <input type="number" className="config-input" value={v.channelROI} onChange={(e) => update('channelROI', e.target.value)} />
            </div>
            <div className="adv-field">
              <label className="config-label">Experiment length (days)</label>
              <input type="number" className="config-input" value={v.experimentLength} onChange={(e) => update('experimentLength', e.target.value)} />
            </div>
            <div className="adv-field">
              <label className="config-label">Cooldown period (days)</label>
              <input type="number" className="config-input" value={v.cooldownPeriod} onChange={(e) => update('cooldownPeriod', e.target.value)} />
            </div>
            <div className="adv-field">
              <label className="config-label">Approximate $ amount for test</label>
              <input type="number" className="config-input" value={v.testAmount} onChange={(e) => update('testAmount', e.target.value)} />
            </div>
          </div>

          <div className="adv-field">
            <label className="config-label">Markets required for test arm (optional)</label>
            <input type="text" className="config-input" placeholder="Comma-separated" value={v.marketsRequired} onChange={(e) => update('marketsRequired', e.target.value)} />
          </div>

          <div className="adv-field">
            <label className="config-label">Exclude from test arm (optional)</label>
            <input type="text" className="config-input" placeholder="Comma-separated" value={v.excludeFromTest} onChange={(e) => update('excludeFromTest', e.target.value)} />
          </div>

          <div className="adv-field">
            <label className="config-label">Exclude completely (optional)</label>
            <input type="text" className="config-input" placeholder="Comma-separated" value={v.excludeCompletely} onChange={(e) => update('excludeCompletely', e.target.value)} />
          </div>

          <div className="adv-field">
            <label className="config-label">Number of test geos to consider: <strong>{v.numTestGeos}</strong></label>
            <input type="range" min="2" max="20" step="1" value={v.numTestGeos} onChange={(e) => update('numTestGeos', Number(e.target.value))} />
          </div>
        </div>
      )}
    </div>
  );
};

export default CellAdvancedConfig; 