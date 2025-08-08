import React, { useState } from 'react';
import { Search, BookOpen, ChevronDown } from 'lucide-react';
import './Integrations.css';

const Integrations = ({ onIntegrationClick }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [sourceFilter, setSourceFilter] = useState('Sources');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');

  const integrations = [
    // Active section - currently connected platforms
    {
      id: 1,
      name: 'Google Analytics',
      type: 'Connected',
      status: 'Active',
      icon: 'https://developers.google.com/identity/images/g-logo.png',
      category: 'analytics',
      section: 'Active'
    },
    {
      id: 2,
      name: 'Facebook Ads',
      type: 'Connected',
      status: 'Active',
      icon: 'https://upload.wikimedia.org/wikipedia/commons/0/05/Facebook_Logo_%282019%29.png',
      category: 'advertising',
      section: 'Active'
    },
    {
      id: 3,
      name: 'Instagram',
      type: 'Connected',
      status: 'Active',
      icon: 'https://upload.wikimedia.org/wikipedia/commons/9/95/Instagram_logo_2022.svg',
      category: 'social',
      section: 'Active'
    },
    
    // Available section - major platforms that can be connected
    {
      id: 4,
      name: 'TikTok Ads',
      type: 'Premium',
      status: null,
      icon: 'https://upload.wikimedia.org/wikipedia/en/a/a9/TikTok_logo.svg',
      category: 'advertising',
      section: 'Available'
    },
    {
      id: 5,
      name: 'Google Ads',
      type: null,
      status: null,
      icon: 'https://developers.google.com/identity/images/g-logo.png',
      category: 'advertising',
      section: 'Available'
    },
    {
      id: 6,
      name: 'YouTube Analytics',
      type: 'Premium',
      status: null,
      icon: 'https://www.youtube.com/s/desktop/12d6b690/img/favicon_32x32.png',
      category: 'analytics',
      section: 'Available'
    },
    {
      id: 7,
      name: 'Twitter Ads',
      type: 'Premium',
      status: null,
      icon: 'https://abs.twimg.com/favicons/twitter.2.ico',
      category: 'advertising',
      section: 'Available'
    },
    {
      id: 8,
      name: 'LinkedIn Ads',
      type: 'Premium',
      status: null,
      icon: 'https://static.licdn.com/sc/h/1bt1uwq5akv756knzdj4l6cdc',
      category: 'advertising',
      section: 'Available'
    },
    {
      id: 9,
      name: 'Snapchat Ads',
      type: 'Premium',
      status: null,
      icon: 'https://upload.wikimedia.org/wikipedia/en/c/c4/Snapchat_logo.svg',
      category: 'advertising',
      section: 'Available'
    },
    {
      id: 10,
      name: 'Pinterest Ads',
      type: 'Premium',
      status: null,
      icon: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Pinterest-logo.png',
      category: 'advertising',
      section: 'Available'
    },
    {
      id: 11,
      name: 'Amazon DSP',
      type: 'Premium',
      status: null,
      icon: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg',
      category: 'advertising',
      section: 'Available'
    },
    {
      id: 12,
      name: 'Shopify',
      type: 'Premium',
      status: null,
      icon: 'https://upload.wikimedia.org/wikipedia/commons/0/0e/Shopify_logo_2018.svg',
      category: 'ecommerce',
      section: 'Available'
    },
    {
      id: 13,
      name: 'Slack',
      type: 'Premium',
      status: null,
      icon: 'https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg',
      category: 'communication',
      section: 'Available'
    },
    {
      id: 14,
      name: 'Microsoft Ads',
      type: 'Premium',
      status: null,
      icon: 'https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg',
      category: 'advertising',
      section: 'Available'
    },
    {
      id: 15,
      name: 'Apple Search Ads',
      type: 'Premium',
      status: null,
      icon: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg',
      category: 'advertising',
      section: 'Available'
    },
    {
      id: 16,
      name: 'Custom API',
      type: 'Premium',
      status: null,
      icon: '/icons/integrations/api.svg',
      category: 'api',
      section: 'Available'
    }
  ];

  const filteredIntegrations = integrations.filter(integration => {
    const matchesSearch = integration.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All Statuses' || 
                         (statusFilter === 'Active' && integration.status === 'Active') ||
                         (statusFilter === 'Available' && integration.section === 'Available');
    const matchesCategory = categoryFilter === 'All Categories' || 
                           integration.category === categoryFilter.toLowerCase();
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Group integrations by section
  const activeIntegrations = filteredIntegrations.filter(integration => integration.section === 'Active');
  const availableIntegrations = filteredIntegrations.filter(integration => integration.section === 'Available');

  const IntegrationCard = ({ integration }) => (
    <div 
      className={`integration-card ${integration.status === 'Active' ? 'active' : ''}`}
      onClick={() => onIntegrationClick && onIntegrationClick(integration)}
    >
      <div className="integration-icon">
        <img 
          src={integration.icon} 
          alt={`${integration.name} icon`}
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'flex';
          }}
        />
        <div className="fallback-icon" style={{ display: 'none' }}>
          {integration.name.charAt(0)}
        </div>
      </div>
      <div className="integration-info">
        <div className="integration-header">
          <h3 className="integration-name">{integration.name}</h3>
          {integration.type && (
            <span className={`integration-type ${integration.type === 'Connected' ? 'connected' : ''}`}>
              {integration.type}
            </span>
          )}
        </div>
        {integration.status && (
          <span className={`integration-status ${integration.status === 'Active' ? 'active' : ''}`}>
            {integration.status}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div className="integrations-page">
      <div className="integrations-header">
        <div className="header-content">
          <h1>Integrations</h1>
          <p>Connect Lifesight to the apps you use every day to get a complete view of your customers</p>
          <a href="#" className="guide-link">
            <BookOpen size={16} />
            View the guide
          </a>
        </div>
      </div>

      <div className="integrations-filters">
        <div className="search-container">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="filter-group">
          <div className="filter-dropdown">
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All Statuses">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Available">Available</option>
            </select>
            <ChevronDown size={16} className="dropdown-icon" />
          </div>
          
          <div className="filter-dropdown">
            <select 
              value={sourceFilter} 
              onChange={(e) => setSourceFilter(e.target.value)}
            >
              <option value="Sources">Sources</option>
              <option value="Platform">Platform</option>
              <option value="API">API</option>
              <option value="Webhook">Webhook</option>
            </select>
            <ChevronDown size={16} className="dropdown-icon" />
          </div>
          
          <div className="filter-dropdown">
            <select 
              value={categoryFilter} 
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="All Categories">All Categories</option>
              <option value="advertising">Advertising</option>
              <option value="analytics">Analytics</option>
              <option value="social">Social</option>
              <option value="ecommerce">E-commerce</option>
              <option value="communication">Communication</option>
              <option value="api">API</option>
            </select>
            <ChevronDown size={16} className="dropdown-icon" />
          </div>
        </div>
      </div>

      <div className="integrations-content">
        {activeIntegrations.length > 0 && (
          <div className="integrations-section">
            <h2 className="section-title">Active Integrations</h2>
            <div className="integrations-grid">
              {activeIntegrations.map(integration => (
                <IntegrationCard key={integration.id} integration={integration} />
              ))}
            </div>
          </div>
        )}

        {availableIntegrations.length > 0 && (
          <div className="integrations-section">
            <h2 className="section-title">Available Integrations</h2>
            <div className="integrations-grid">
              {availableIntegrations.map(integration => (
                <IntegrationCard key={integration.id} integration={integration} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Integrations; 