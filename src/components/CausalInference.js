import React, { useState } from 'react';
import { Settings } from 'lucide-react';
import './CausalInference.css';

const CausalInference = () => {
  const [selectedWorkspace, setSelectedWorkspace] = useState('Workspace DAG');
  const [activeTab, setActiveTab] = useState('causal-graph');

  // Define nodes with their positions and types
  const nodes = [
    // Spend nodes (left side)
    { id: 'spend_meta_mof', label: 'spend_meta_mof', x: 50, y: 80, type: 'spend', color: '#3b82f6' },
    { id: 'klaviyo_unique_clicks', label: 'Klaviyo_Unique_Clicks', x: 50, y: 140, type: 'marketing', color: '#f59e0b' },
    { id: 'spend_google_bof', label: 'spend_google_BOF', x: 50, y: 200, type: 'spend', color: '#3b82f6' },
    { id: 'spend_google_tof', label: 'spend_google_TOF', x: 50, y: 260, type: 'spend', color: '#3b82f6' },
    { id: 'spend_google_brand', label: 'spend_google_Brand', x: 50, y: 320, type: 'spend', color: '#3b82f6' },
    
    // Middle layer nodes
    { id: 'spend_meta_tof', label: 'spend_meta_tof', x: 300, y: 100, type: 'spend', color: '#3b82f6' },
    { id: 'spend_meta_bof', label: 'spend_meta_bof', x: 300, y: 160, type: 'spend', color: '#3b82f6' },
    { id: 'spend_youtube', label: 'spend_youtube', x: 300, y: 220, type: 'spend', color: '#3b82f6' },
    { id: 'trend', label: 'trend', x: 300, y: 280, type: 'external', color: '#6b7280' },
    { id: 'season', label: 'season', x: 300, y: 340, type: 'external', color: '#6b7280' },
    
    // Right side nodes
    { id: 'spend_meta_others', label: 'spend_meta_others', x: 550, y: 80, type: 'spend', color: '#3b82f6' },
    { id: 'spend_snapchat', label: 'spend_snapchat', x: 550, y: 140, type: 'spend', color: '#3b82f6' },
    { id: 'spend_google_mof', label: 'spend_google_MOF', x: 550, y: 200, type: 'spend', color: '#3b82f6' },
    { id: 'holiday', label: 'holiday', x: 550, y: 260, type: 'external', color: '#6b7280' },
    { id: 'spend_tiktok', label: 'spend_tiktok', x: 550, y: 320, type: 'spend', color: '#3b82f6' },
    
    // Final outcome
    { id: 'revenue', label: 'Revenue', x: 800, y: 200, type: 'outcome', color: '#10b981' }
  ];

  // Define connections between nodes
  const connections = [
    // Direct connections to revenue
    { from: 'spend_meta_others', to: 'revenue', type: 'direct' },
    { from: 'spend_snapchat', to: 'revenue', type: 'direct' },
    { from: 'spend_google_mof', to: 'revenue', type: 'direct' },
    { from: 'spend_tiktok', to: 'revenue', type: 'direct' },
    
    // Indirect connections through middle layer
    { from: 'spend_meta_mof', to: 'spend_meta_tof', type: 'indirect' },
    { from: 'klaviyo_unique_clicks', to: 'spend_meta_tof', type: 'other' },
    { from: 'spend_google_bof', to: 'spend_meta_bof', type: 'indirect' },
    { from: 'spend_google_tof', to: 'spend_youtube', type: 'indirect' },
    { from: 'spend_google_brand', to: 'trend', type: 'other' },
    
    // Middle to right connections
    { from: 'spend_meta_tof', to: 'spend_meta_others', type: 'indirect' },
    { from: 'spend_meta_bof', to: 'spend_snapchat', type: 'indirect' },
    { from: 'spend_youtube', to: 'spend_google_mof', type: 'indirect' },
    { from: 'trend', to: 'holiday', type: 'other' },
    { from: 'season', to: 'spend_tiktok', type: 'other' },
    
    // External factors to revenue
    { from: 'holiday', to: 'revenue', type: 'other' },
    { from: 'trend', to: 'revenue', type: 'other' }
  ];

  const getNodeById = (id) => nodes.find(node => node.id === id);

  const getConnectionPath = (from, to) => {
    const fromNode = getNodeById(from);
    const toNode = getNodeById(to);
    
    const startX = fromNode.x + 120; // Node width
    const startY = fromNode.y + 15; // Half node height
    const endX = toNode.x;
    const endY = toNode.y + 15;
    
    const controlX1 = startX + (endX - startX) * 0.3;
    const controlX2 = startX + (endX - startX) * 0.7;
    
    return `M ${startX} ${startY} C ${controlX1} ${startY}, ${controlX2} ${endY}, ${endX} ${endY}`;
  };

  const getConnectionStyle = (type) => {
    switch (type) {
      case 'direct':
        return { stroke: '#3b82f6', strokeWidth: 2, strokeDasharray: '5,5' };
      case 'indirect':
        return { stroke: '#10b981', strokeWidth: 2, strokeDasharray: '5,5' };
      case 'other':
        return { stroke: '#6b7280', strokeWidth: 1.5, strokeDasharray: '3,3' };
      default:
        return { stroke: '#6b7280', strokeWidth: 1, strokeDasharray: '5,5' };
    }
  };

  return (
    <div className="causal-inference-page">
      <div className="causal-header">
        <h2 className="page-title">Causal Inference</h2>
        <div className="header-controls">
          <div className="workspace-selector">
            <label>Select</label>
            <select 
              value={selectedWorkspace} 
              onChange={(e) => setSelectedWorkspace(e.target.value)}
            >
              <option value="Workspace DAG">Workspace DAG</option>
            </select>
          </div>
        </div>
      </div>

      <div className="causal-content">
        <div className="causal-tabs">
          <button
            className={`tab-button ${activeTab === 'causal-graph' ? 'active' : ''}`}
            onClick={() => setActiveTab('causal-graph')}
          >
            Causal Graph
          </button>
          <button
            className={`tab-button ${activeTab === 'revenue' ? 'active' : ''}`}
            onClick={() => setActiveTab('revenue')}
          >
            Revenue
          </button>
        </div>

        <div className="graph-container">
          <div className="graph-header">
            <h3>Acme Retail Revenue</h3>
            <button className="settings-button">
              <Settings size={16} />
            </button>
          </div>

          <div className="dag-visualization">
            <svg width="900" height="400" viewBox="0 0 900 400">
              {/* Render connections first (behind nodes) */}
              {connections.map((connection, index) => (
                <path
                  key={index}
                  d={getConnectionPath(connection.from, connection.to)}
                  fill="none"
                  {...getConnectionStyle(connection.type)}
                />
              ))}
              
              {/* Render nodes */}
              {nodes.map((node) => (
                <g key={node.id}>
                  <rect
                    x={node.x}
                    y={node.y}
                    width={120}
                    height={30}
                    rx={4}
                    fill={node.type === 'outcome' ? '#10b981' : node.color}
                    stroke={node.type === 'outcome' ? '#059669' : '#d1d5db'}
                    strokeWidth={node.type === 'outcome' ? 2 : 1}
                    opacity={node.type === 'outcome' ? 1 : 0.9}
                  />
                  <text
                    x={node.x + 60}
                    y={node.y + 20}
                    textAnchor="middle"
                    fontSize="11"
                    fill={node.type === 'outcome' ? 'white' : '#374151'}
                    fontWeight={node.type === 'outcome' ? '600' : '400'}
                  >
                    {node.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          <div className="legend">
            <div className="legend-item">
              <div className="legend-line direct"></div>
              <span>Potential (Direct)</span>
            </div>
            <div className="legend-item">
              <div className="legend-line indirect"></div>
              <span>Potential (Indirect)</span>
            </div>
            <div className="legend-item">
              <div className="legend-line other"></div>
              <span>Other</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CausalInference; 