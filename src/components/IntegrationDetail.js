import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import './IntegrationDetail.css';

const IntegrationDetail = ({ integration }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState('Oct 4 - Oct 11, 2024');
  
  // Mock data for the analytics
  const overviewMetrics = [
    { 
      label: 'Spend', 
      value: '$10.42 K', 
      data: [10.2, 10.5, 10.8, 10.4, 10.6, 10.3, 10.1],
      color: '#8b5cf6'
    },
    { 
      label: 'Impressions', 
      value: '1.90 M', 
      data: [1.8, 1.85, 1.92, 1.88, 1.91, 1.89, 1.87],
      color: '#8b5cf6'
    },
    { 
      label: 'Clicks', 
      value: '20.42 K', 
      data: [20.1, 20.8, 20.5, 20.9, 20.3, 20.6, 20.2],
      color: '#8b5cf6'
    },
    { 
      label: 'pROAS', 
      value: '0', 
      data: [0, 0, 0, 0, 0, 0, 0],
      color: '#8b5cf6'
    }
  ];

  const sourceData = [
    {
      date: '2024-10-04',
      source: 'TikTok',
      spend: '$1,420',
      impressions: '264,308',
      clicks: '2,902',
      objective: 'Traffic',
      advertisingChannelType: 'Video',
      campaignId: 'TK_001',
      campaignName: 'Summer Collection Launch'
    },
    {
      date: '2024-10-05', 
      source: 'TikTok',
      spend: '$1,380',
      impressions: '258,442',
      clicks: '2,847',
      objective: 'Conversions',
      advertisingChannelType: 'Video',
      campaignId: 'TK_002',
      campaignName: 'Fall Trends Campaign'
    },
    {
      date: '2024-10-06',
      source: 'TikTok', 
      spend: '$1,520',
      impressions: '285,193',
      clicks: '3,156',
      objective: 'Traffic',
      advertisingChannelType: 'Image',
      campaignId: 'TK_003',
      campaignName: 'Weekend Flash Sale'
    },
    {
      date: '2024-10-07',
      source: 'TikTok',
      spend: '$1,290',
      impressions: '242,857',
      clicks: '2,734',
      objective: 'Brand Awareness',
      advertisingChannelType: 'Video',
      campaignId: 'TK_004', 
      campaignName: 'Brand Story Series'
    },
    {
      date: '2024-10-08',
      source: 'TikTok',
      spend: '$1,650',
      impressions: '312,446',
      clicks: '3,428',
      objective: 'Conversions',
      advertisingChannelType: 'Video',
      campaignId: 'TK_005',
      campaignName: 'Holiday Preview'
    }
  ];

  // Mini chart component
  const MiniChart = ({ data, color }) => {
    const maxValue = Math.max(...data);
    const minValue = Math.min(...data);
    const range = maxValue - minValue || 1;
    
    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = 100 - ((value - minValue) / range) * 100;
      return `${x},${y}`;
    }).join(' ');

    return (
      <div className="mini-chart">
        <svg width="60" height="30" viewBox="0 0 100 100">
          <polyline
            points={points}
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      </div>
    );
  };

  // Source sync monitor chart data
  const syncMonitorData = [
    { date: '2024-10-04', spends: 1420, impressions: 264308, clicks: 2902 },
    { date: '2024-10-05', spends: 1380, impressions: 258442, clicks: 2847 },
    { date: '2024-10-06', spends: 1520, impressions: 285193, clicks: 3156 },
    { date: '2024-10-07', spends: 1290, impressions: 242857, clicks: 2734 },
    { date: '2024-10-08', spends: 1650, impressions: 312446, clicks: 3428 },
    { date: '2024-10-09', spends: 1580, impressions: 298721, clicks: 3287 },
    { date: '2024-10-10', spends: 1440, impressions: 271635, clicks: 2953 },
    { date: '2024-10-11', spends: 1360, impressions: 256184, clicks: 2791 }
  ];

  const SyncMonitorChart = () => {
    const maxSpends = Math.max(...syncMonitorData.map(d => d.spends));
    const maxImpressions = Math.max(...syncMonitorData.map(d => d.impressions));
    const maxClicks = Math.max(...syncMonitorData.map(d => d.clicks));
    
    return (
      <div className="sync-monitor-chart">
        <svg width="100%" height="300" viewBox="0 0 800 300">
          {/* Background grid */}
          <defs>
            <pattern id="grid" width="80" height="30" patternUnits="userSpaceOnUse">
              <path d="M 80 0 L 0 0 0 30" fill="none" stroke="#f0f0f0" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="800" height="300" fill="url(#grid)" />
          
          {/* Y-axis labels */}
          <text x="30" y="50" textAnchor="end" fontSize="12" fill="#6b7280">2K</text>
          <text x="30" y="100" textAnchor="end" fontSize="12" fill="#6b7280">1.5K</text>
          <text x="30" y="150" textAnchor="end" fontSize="12" fill="#6b7280">1K</text>
          <text x="30" y="200" textAnchor="end" fontSize="12" fill="#6b7280">500</text>
          <text x="30" y="250" textAnchor="end" fontSize="12" fill="#6b7280">0</text>
          
          {/* Right Y-axis labels for secondary metrics */}
          <text x="770" y="50" textAnchor="start" fontSize="12" fill="#6b7280">400,000</text>
          <text x="770" y="100" textAnchor="start" fontSize="12" fill="#6b7280">300,000</text>
          <text x="770" y="150" textAnchor="start" fontSize="12" fill="#6b7280">200,000</text>
          <text x="770" y="200" textAnchor="start" fontSize="12" fill="#6b7280">100,000</text>
          <text x="770" y="250" textAnchor="start" fontSize="12" fill="#6b7280">0</text>
          
          {/* Data bars and lines */}
          {syncMonitorData.map((data, index) => {
            const x = 60 + (index * 90);
            const barWidth = 25;
            
            // Spends bars (primary scale)
            const spendsHeight = (data.spends / maxSpends) * 180;
            
            return (
              <g key={index}>
                {/* Spends bar */}
                <rect
                  x={x}
                  y={250 - spendsHeight}
                  width={barWidth}
                  height={spendsHeight}
                  fill="#8b5cf6"
                />
                
                {/* X-axis labels */}
                <text
                  x={x + barWidth/2}
                  y="280"
                  textAnchor="middle"
                  fontSize="10"
                  fill="#6b7280"
                  transform={`rotate(-45, ${x + barWidth/2}, 280)`}
                >
                  {new Date(data.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </text>
              </g>
            );
          })}
          
          {/* Impressions line */}
          <polyline
            points={syncMonitorData.map((data, index) => {
              const x = 60 + (index * 90) + 12;
              const y = 250 - (data.impressions / maxImpressions) * 180;
              return `${x},${y}`;
            }).join(' ')}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="3"
          />
          
          {/* Clicks line */}
          <polyline
            points={syncMonitorData.map((data, index) => {
              const x = 60 + (index * 90) + 12;
              const y = 250 - (data.clicks / maxClicks) * 180;
              return `${x},${y}`;
            }).join(' ')}
            fill="none"
            stroke="#ef4444"
            strokeWidth="3"
          />
          
          {/* Legend */}
          <g transform="translate(350, 20)">
            <rect x="0" y="0" width="15" height="10" fill="#8b5cf6"/>
            <text x="20" y="8" fontSize="12" fill="#374151">Spends - 1.29K</text>
            
            <rect x="100" y="0" width="15" height="3" fill="#f59e0b"/>
            <text x="120" y="8" fontSize="12" fill="#374151">Impressions - 264,308</text>
            
            <rect x="250" y="0" width="15" height="3" fill="#ef4444"/>
            <text x="270" y="8" fontSize="12" fill="#374151">Clicks - 2,902</text>
          </g>
        </svg>
      </div>
    );
  };

  return (
    <div className="integration-detail-page">
      <div className="integration-detail-header">
        <div className="breadcrumb">
          <span className="breadcrumb-item">Integrations</span>
          <span className="breadcrumb-separator">›</span>
          <div className="breadcrumb-current">
            <span>{integration?.name || 'TikTok'}</span>
            <ChevronDown size={16} />
          </div>
        </div>
      </div>

      <div className="integration-tabs">
        <button 
          className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`tab-button ${activeTab === 'conversion' ? 'active' : ''}`}
          onClick={() => setActiveTab('conversion')}
        >
          Conversion
        </button>
      </div>

      <div className="date-range-section">
        <span className="date-range">{dateRange}</span>
      </div>

      {activeTab === 'overview' && (
        <div className="overview-content">
          <div className="overview-metrics-section">
            <h3>Overview metrics</h3>
            <div className="metrics-grid">
              {overviewMetrics.map((metric, index) => (
                <div key={index} className="metric-card">
                  <div className="metric-header">
                    <span className="metric-label">{metric.label}</span>
                    <MiniChart data={metric.data} color={metric.color} />
                  </div>
                  <div className="metric-value">{metric.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="source-sync-section">
            <h3>Source Sync Monitor</h3>
            <SyncMonitorChart />
          </div>

          <div className="source-data-section">
            <h3>Source Data</h3>
            <div className="source-data-table">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Source</th>
                    <th>Spend</th>
                    <th>Impressions</th>
                    <th>Clicks</th>
                    <th>Objective</th>
                    <th>Advertising Channel Type</th>
                    <th>Campaign Id</th>
                    <th>Campaign Name</th>
                  </tr>
                </thead>
                <tbody>
                  {sourceData.map((row, index) => (
                    <tr key={index}>
                      <td>{new Date(row.date).toLocaleDateString()}</td>
                      <td>{row.source}</td>
                      <td>{row.spend}</td>
                      <td>{row.impressions}</td>
                      <td>{row.clicks}</td>
                      <td>{row.objective}</td>
                      <td>{row.advertisingChannelType}</td>
                      <td>{row.campaignId}</td>
                      <td>{row.campaignName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IntegrationDetail; 