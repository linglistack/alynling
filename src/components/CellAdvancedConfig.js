import React, { useState } from 'react';
import TooltipInfo from './TooltipInfo';
import tooltips from '../config/geoliftTooltips.json';

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
  numTestGeos: 2,
  // Market Selection Parameters
  treatmentPeriods: '28',
  effectSizeCsv: '0,0.05,0.1,0.15,0.2,0.25',
  lookbackWindow: '1',
  cpic: '1',
  alpha: '0.1'
};

const CellAdvancedConfig = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const v = { ...defaultAdvanced, ...(value || {}) };

  const update = (field, val) => {
    onChange && onChange({ ...v, [field]: val });
  };

  const getTip = (id) => ({
    title: (tooltips[id] && tooltips[id].question) || '',
    content: (tooltips[id] && tooltips[id].example) || ''
  });

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
              <label className="config-label">Approximate $ amount for test</label>
              <input type="number" className="config-input" value={v.testAmount} onChange={(e) => update('testAmount', e.target.value)} />
            </div>
          </div>



          {/* Market Selection Parameters */}
            <div className="adv-grid">
              <div className="adv-field">
                <label className="config-label">
                  Experiment length (days)
                  <TooltipInfo {...getTip('treatment_periods')} />
                </label>
                <input type="number" min="1" className="config-input" value={v.treatmentPeriods} onChange={(e) => update('treatmentPeriods', e.target.value)} />
              </div>
              <div className="adv-field">
                <label className="config-label">
                  Lookback window
                  <TooltipInfo {...getTip('lookback_window')} />
                </label>
                <input type="number" min="1" className="config-input" value={v.lookbackWindow} onChange={(e) => update('lookbackWindow', e.target.value)} />
              </div>
              <div className="adv-field">
                <label className="config-label">
                  Channel CPIC
                  <TooltipInfo {...getTip('cpic')} />
                </label>
                <input type="number" min="0" className="config-input" value={v.cpic} onChange={(e) => update('cpic', e.target.value)} />
              </div>
              <div className="adv-field">
                <label className="config-label">
                  Alpha
                  <TooltipInfo {...getTip('alpha')} />
                </label>
                <input type="number" step="0.01" min="0.01" max="0.5" className="config-input" value={v.alpha} onChange={(e) => update('alpha', e.target.value)} />
              </div>
            </div>
            <div className="adv-field">
              <label className="config-label">
                Effect size list
                <TooltipInfo {...getTip('effect_size')} />
              </label>
              <input type="text" className="config-input" value={v.effectSizeCsv} onChange={(e) => update('effectSizeCsv', e.target.value)} />
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