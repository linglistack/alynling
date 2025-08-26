import React, { useState, useEffect, useRef } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { feature } from 'topojson-client';
import './LocationSelectionModal.css';

// Using a more reliable GeoJSON source for US states
const geoUrl = "https://cdn.jsdelivr.net/npm/us-atlas@3.0.0/states-10m.json";

// US state names list for dropdown filtering
const usStates = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", 
  "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", 
  "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", 
  "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", 
  "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", 
  "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", 
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", 
  "Wisconsin", "Wyoming"
];

// State abbreviation mapping with better matching
const stateAbbreviations = {
  'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
  'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
  'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
  'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
  'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
  'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
  'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
  'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
  'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY'
};

// State centroids for reliable label positioning (manually calculated)
const stateCentroids = {
  'Alabama': [-86.7910, 32.7777], 'Alaska': [-153.0063, 64.0685], 'Arizona': [-111.6602, 34.2011],
  'Arkansas': [-92.2992, 35.2044], 'California': [-119.7662, 36.7755], 'Colorado': [-105.5478, 39.7391],
  'Connecticut': [-72.7273, 41.7627], 'Delaware': [-75.6094, 39.1573], 'Florida': [-84.6, 27.8],
  'Georgia': [-83.2, 32.7], 'Hawaii': [-155.5, 19.7], 'Idaho': [-114.6, 44.2], 'Illinois': [-89.3, 40.0],
  'Indiana': [-86.1, 39.7], 'Iowa': [-93.5, 42.0], 'Kansas': [-98.3, 38.5], 'Kentucky': [-84.8, 37.8],
  'Louisiana': [-92.2, 30.8], 'Maine': [-69.2, 45.5], 'Maryland': [-76.6, 39.3], 'Massachusetts': [-71.8, 42.2],
  'Michigan': [-84.6, 44.3], 'Minnesota': [-94.3, 46.4], 'Mississippi': [-89.6, 32.9], 'Missouri': [-92.5, 38.7],
  'Montana': [-110.3, 47.0], 'Nebraska': [-99.5, 41.5], 'Nevada': [-116.8, 39.3], 'New Hampshire': [-71.5, 43.7],
  'New Jersey': [-74.6, 40.2], 'New Mexico': [-105.9, 34.8], 'New York': [-74.2, 43.0], 'North Carolina': [-79.2, 35.6],
  'North Dakota': [-100.5, 47.4], 'Ohio': [-82.9, 40.2], 'Oklahoma': [-97.5, 35.5], 'Oregon': [-120.5, 44.0],
  'Pennsylvania': [-77.8, 40.9], 'Rhode Island': [-71.4, 41.7], 'South Carolina': [-80.9, 33.8],
  'South Dakota': [-100.3, 44.3], 'Tennessee': [-86.7, 35.8], 'Texas': [-97.5, 31.0], 'Utah': [-111.9, 39.3],
  'Vermont': [-72.6, 44.0], 'Virginia': [-78.6, 37.5], 'Washington': [-121.0, 47.4], 'West Virginia': [-80.9, 38.5],
  'Wisconsin': [-89.6, 44.3], 'Wyoming': [-107.3, 42.8]
};

// State to cities mapping based on the dataset cities (verified against actual data)
const stateToCitiesMapping = {
  'Arizona': ['phoenix', 'mesa', 'tucson'],
  'California': ['los angeles', 'san diego', 'san jose', 'san francisco', 'fresno', 'sacramento', 'oakland'],
  'Colorado': ['denver'],
  'Florida': ['jacksonville', 'miami'],
  'Georgia': ['atlanta'],
  'Illinois': ['chicago'],
  'Indiana': ['indianapolis'],
  'Kentucky': ['louisville'],
  'Maryland': ['baltimore'],
  'Massachusetts': ['boston'],
  'Michigan': ['detroit'],
  'Missouri': ['kansas city'],
  'Nevada': ['las vegas'],
  'New Mexico': ['albuquerque'],
  'New York': ['new york'],
  'North Carolina': ['charlotte'],
  'Ohio': ['columbus'],
  'Oklahoma': ['oklahoma city'],
  'Oregon': ['portland'],
  'Pennsylvania': ['philadelphia'],
  'Tennessee': ['memphis', 'nashville'],
  'Texas': ['houston', 'san antonio', 'dallas', 'austin', 'fort worth', 'el paso'],
  'Washington': ['seattle'],
  'Wisconsin': ['milwaukee'],
  'District of Columbia': ['washington']
};

// Simplified conversion function - just pass selected states directly
const convertLocationsForAPI = (selectedStates, availableLocations) => {
  console.log('[LocationModal] Converting locations for API:', { selectedStates, availableLocations: availableLocations.slice(0, 10) });
  
  // Simply return the selected states as-is for the API
  // The API should receive whatever locations exist in the uploaded data
  const directMapping = Array.from(selectedStates);
  
  console.log('[LocationModal] Using direct mapping (no conversion):', directMapping);
  return directMapping;
};

const LocationSelectionModal = ({ isOpen, onClose, onSave, initialIncluded = [], initialExcluded = [], availableLocations = [] }) => {
  const [selectionMode, setSelectionMode] = useState('exclude'); // 'include' or 'exclude'
  const [includedStates, setIncludedStates] = useState(new Set(initialIncluded));
  const [excludedStates, setExcludedStates] = useState(new Set(initialExcluded));
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notification, setNotification] = useState(null);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

  useEffect(() => {
    setIncludedStates(new Set(initialIncluded));
    setExcludedStates(new Set(initialExcluded));
  }, [initialIncluded, initialExcluded]);

  // Function to normalize state names for better matching
  const normalizeStateName = (name) => {
    if (!name) return '';
    // Convert to proper case (first letter of each word capitalized)
    return name.trim()
      .replace(/\s+/g, ' ')
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const showNotification = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 2000);
  };

  const handleStateClick = (stateName) => {
    const normalizedName = normalizeStateName(stateName);
    
    if (selectionMode === 'exclude') {
      const newExcluded = new Set(excludedStates);
      const newIncluded = new Set(includedStates);
      
      if (newExcluded.has(normalizedName)) {
        // If already excluded, remove from excluded
        newExcluded.delete(normalizedName);
        showNotification(`${stateName} removed from excluded list`);
      } else {
        // Add to excluded and remove from included if it exists there
        newExcluded.add(normalizedName);
        if (newIncluded.has(normalizedName)) {
          newIncluded.delete(normalizedName);
          setIncludedStates(newIncluded);
          showNotification(`${stateName} moved from included to excluded`);
        } else {
          showNotification(`${stateName} added to excluded list`);
        }
      }
      setExcludedStates(newExcluded);
    } else {
      const newIncluded = new Set(includedStates);
      const newExcluded = new Set(excludedStates);
      
      if (newIncluded.has(normalizedName)) {
        // If already included, remove from included
        newIncluded.delete(normalizedName);
        showNotification(`${stateName} removed from included list`);
      } else {
        // Add to included and remove from excluded if it exists there
        newIncluded.add(normalizedName);
        if (newExcluded.has(normalizedName)) {
          newExcluded.delete(normalizedName);
          setExcludedStates(newExcluded);
          showNotification(`${stateName} moved from excluded to included`);
        } else {
          showNotification(`${stateName} added to included list`);
        }
      }
      setIncludedStates(newIncluded);
    }
  };

  const getStateColor = (stateName) => {
    const normalizedName = normalizeStateName(stateName);
    if (excludedStates.has(normalizedName)) {
      return '#dc2626'; // Red for excluded
    }
    if (includedStates.has(normalizedName)) {
      return '#2563eb'; // Blue for included
    }
    return '#6b7280'; // Gray for neutral
  };

  const handleSave = () => {
    // Convert state names to city names for API compatibility
    const includedCities = convertLocationsForAPI(Array.from(includedStates), availableLocations);
    const excludedCities = convertLocationsForAPI(Array.from(excludedStates), availableLocations);
    
    console.log('[LocationModal] Final API locations:', { 
      includedCities, 
      excludedCities,
      totalAvailableLocations: availableLocations.length 
    });
    
    // Show notification about the selection
    const totalStates = includedStates.size + excludedStates.size;
    const totalLocations = includedCities.length + excludedCities.length;
    if (totalStates > 0) {
      showNotification(`${totalStates} states selected for analysis (${totalLocations} locations sent to API)`);
    }
    
    onSave({
      included: includedCities,
      excluded: excludedCities,
      // Also pass the original state names for display purposes
      includedStates: Array.from(includedStates),
      excludedStates: Array.from(excludedStates)
    });
    onClose();
  };

  const handleCancel = () => {
    // Reset to initial values
    setIncludedStates(new Set(initialIncluded));
    setExcludedStates(new Set(initialExcluded));
    onClose();
  };

  // Get current selected states for the active mode
  const getCurrentSelectedStates = () => {
    return selectionMode === 'exclude' ? Array.from(excludedStates) : Array.from(includedStates);
  };

  // Filter states for autocomplete suggestions
  const getSuggestions = () => {
    if (!searchTerm) return [];
    const currentSelected = getCurrentSelectedStates();
    return usStates.filter(state => 
      state.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !currentSelected.includes(state)
    ).slice(0, 10); // Limit to 10 suggestions
  };

  // Handle suggestion selection
  const handleSuggestionClick = (state) => {
    handleStateClick(state);
    setSearchTerm('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setShowSuggestions(value.length > 0);
  };

  // Handle input key press
  const handleInputKeyPress = (e) => {
    if (e.key === 'Enter' && searchTerm) {
      const exactMatch = usStates.find(state => 
        state.toLowerCase() === searchTerm.toLowerCase()
      );
      if (exactMatch) {
        handleSuggestionClick(exactMatch);
      }
    }
  };

  // Remove pill
  const removePill = (state) => {
    if (selectionMode === 'exclude') {
      const newExcluded = new Set(excludedStates);
      newExcluded.delete(state);
      setExcludedStates(newExcluded);
    } else {
      const newIncluded = new Set(includedStates);
      newIncluded.delete(state);
      setIncludedStates(newIncluded);
    }
  };

  // Check if state is selected in current mode
  const isStateSelected = (state) => {
    return selectionMode === 'exclude' ? excludedStates.has(state) : includedStates.has(state);
  };

  // Check if state is selected in either mode (for dropdown display)
  const getStateSelectionMode = (state) => {
    if (excludedStates.has(state)) return 'excluded';
    if (includedStates.has(state)) return 'included';
    return null;
  };

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
      // Close dropdown if clicking outside
      if (!event.target.closest('.state-dropdown-container')) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="location-modal-overlay">
      {/* Notification toast */}
      {notification && (
        <div className="notification-toast">
          {notification}
        </div>
      )}
      <div className="location-modal">
        <div className="location-modal-header">
          <h2>Include/exclude specific regions</h2>
          <button className="close-button" onClick={handleCancel}>×</button>
        </div>

        <div className="location-modal-content">
          <div className="selection-mode">
            <label className="radio-option">
              <input
                type="radio"
                name="selectionMode"
                checked={selectionMode === 'exclude'}
                onChange={() => setSelectionMode('exclude')}
              />
              Exclude Mode - Select states to exclude from targeting
            </label>
            <label className="radio-option">
              <input
                type="radio"
                name="selectionMode"
                checked={selectionMode === 'include'}
                onChange={() => setSelectionMode('include')}
              />
              Include Mode - Select only these states for targeting
            </label>
          </div>

          <div className="search-section">
            <div className="autocomplete-container" ref={suggestionsRef}>
              <div className="search-input-group">
                <span className="mode-indicator">
                  {selectionMode === 'exclude' ? '🚫 Exclude:' : '✅ Include:'}
                </span>
                <div className="input-with-pills">
                  {/* Selected state pills */}
                  {getCurrentSelectedStates().map(state => (
                    <div key={state} className={`state-pill ${selectionMode}`}>
                      {state}
                      <button 
                        className="remove-pill"
                        onClick={() => removePill(state)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder={getCurrentSelectedStates().length > 0 ? "Add more..." : 
                      (selectionMode === 'exclude' ? "Type to exclude states" : "Type to include states")}
                    value={searchTerm}
                    onChange={handleInputChange}
                    onKeyPress={handleInputKeyPress}
                    className="location-search-autocomplete"
                    onFocus={() => searchTerm && setShowSuggestions(true)}
                  />
                </div>
              </div>
              
              {/* Autocomplete suggestions */}
              {showSuggestions && getSuggestions().length > 0 && (
                <div className="suggestions-dropdown">
                  {getSuggestions().map(state => (
                    <div 
                      key={state} 
                      className="suggestion-item"
                      onClick={() => handleSuggestionClick(state)}
                    >
                      {state}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Dropdown with checkmarks */}
            <div className="state-dropdown-container">
              <button 
                className="state-dropdown-button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                All States ▼
              </button>
              {dropdownOpen && (
                <div className="state-dropdown-menu">
                  {usStates.map(state => {
                    const selectionMode = getStateSelectionMode(state);
                    const isCurrentMode = isStateSelected(state);
                    
                    return (
                      <div 
                        key={state} 
                        className={`dropdown-item ${selectionMode ? 'selected' : ''} ${selectionMode ? selectionMode : ''}`}
                        onClick={() => {
                          handleStateClick(state);
                        }}
                      >
                        <span className="checkbox">
                          {selectionMode === 'excluded' ? '🚫' : selectionMode === 'included' ? '✅' : ''}
                          {isCurrentMode ? '✓' : ''}
                        </span>
                        <span className="state-name">{state}</span>
                        {selectionMode && !isCurrentMode && (
                          <span className="mode-badge">
                            Currently {selectionMode === 'excluded' ? 'Excluded' : 'Included'}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="content-split">
            <div className="map-panel">
              <div className="map-legend">
                <div className="legend-item">
                  <span className="legend-color excluded"></span>
                  Excluded
                </div>
                <div className="legend-item">
                  <span className="legend-color included"></span>
                  Included
                </div>
              </div>

              <div className="map-container">
                <ComposableMap 
                  projection="geoAlbersUsa" 
                  width={800} 
                  height={500}
                  projectionConfig={{
                    scale: 1000,
                    translate: [400, 250]
                  }}
                >
                  <Geographies geography={geoUrl}>
                    {({ geographies }) => {
                      let statesToRender = [];
                      
                      try {
                        // Handle TopoJSON format
                        if (geographies.objects && geographies.objects.states) {
                          const states = feature(geographies, geographies.objects.states);
                          statesToRender = states.features;
                        } else if (Array.isArray(geographies)) {
                          // Handle GeoJSON format
                          statesToRender = geographies;
                        } else {
                          console.warn('Unexpected geography format:', geographies);
                          return null;
                        }
                      } catch (error) {
                        console.error('Error processing geography data:', error);
                        return null;
                      }
                      
                      return statesToRender.map((geo, index) => {
                        // Try different property names for state identification
                        const stateName = normalizeStateName(
                          geo.properties?.NAME || 
                          geo.properties?.name || 
                          geo.properties?.Name ||
                          geo.properties?.STATE_NAME ||
                          geo.properties?.state_name ||
                          geo.properties?.STUSPS ||
                          geo.properties?.STATE ||
                          geo.properties?.State ||
                          ''
                        );
                        
                        // Get centroid for label placement
                        const centroid = stateCentroids[stateName] || [0, 0];
                        
                        return (
                          <g key={geo.properties?.GEOID || geo.id || stateName || index}>
                            <Geography
                              geography={geo}
                              onClick={() => handleStateClick(stateName)}
                              style={{
                                default: {
                                  fill: getStateColor(stateName),
                                  stroke: "#FFFFFF",
                                  strokeWidth: 0.75,
                                  outline: "none",
                                  cursor: "pointer"
                                },
                                hover: {
                                  fill: getStateColor(stateName),
                                  stroke: "#FFFFFF",
                                  strokeWidth: 1,
                                  outline: "none",
                                  cursor: "pointer",
                                  opacity: 0.8
                                },
                                pressed: {
                                  fill: getStateColor(stateName),
                                  stroke: "#FFFFFF",
                                  strokeWidth: 1,
                                  outline: "none"
                                }
                              }}
                            />
                            {/* Add state abbreviation label using manual centroids */}
                            {stateAbbreviations[stateName] && centroid[0] !== 0 && centroid[1] !== 0 && (
                              <text
                                x={centroid[0]}
                                y={centroid[1]}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                style={{
                                  fontFamily: "Arial, sans-serif",
                                  fontSize: "12px",
                                  fontWeight: "bold",
                                  fill: "#FFFFFF",
                                  stroke: "#000000",
                                  strokeWidth: "1px",
                                  pointerEvents: "none",
                                  paintOrder: "stroke fill"
                                }}
                              >
                                {stateAbbreviations[stateName]}
                              </text>
                            )}
                          </g>
                        );
                      });
                    }}
                  </Geographies>
                </ComposableMap>
              </div>
            </div>

            <div className="state-list-panel">
              {/* Show only relevant states based on current mode */}
              {selectionMode === 'exclude' && excludedStates.size > 0 && (
                <div className="excluded-section">
                  <h3 className="section-title">
                    <span className="exclude-icon">⚫</span>
                    Excluded locations ({excludedStates.size})
                  </h3>
                  <div className="state-tags">
                    {Array.from(excludedStates).map(state => (
                      <div key={state} className="state-tag excluded">
                        {state}
                        <button 
                          className="remove-tag"
                          onClick={() => removePill(state)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectionMode === 'include' && includedStates.size > 0 && (
                <div className="included-section">
                  <h3 className="section-title">
                    <span className="include-icon">⚫</span>
                    Included locations ({includedStates.size})
                  </h3>
                  <div className="state-tags">
                    {Array.from(includedStates).map(state => (
                      <div key={state} className="state-tag included">
                        {state}
                        <button 
                          className="remove-tag"
                          onClick={() => removePill(state)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Show appropriate empty state message based on mode */}
              {((selectionMode === 'exclude' && excludedStates.size === 0) || 
                (selectionMode === 'include' && includedStates.size === 0)) && (
                <div className="no-selections">
                  <p>Click on states on the map, use autocomplete, or select from dropdown to {selectionMode === 'exclude' ? 'exclude' : 'include'} locations.</p>
                </div>
              )}

              {/* Show non-active states in light gray when in specific mode */}
              {selectionMode === 'exclude' && includedStates.size > 0 && (
                <div className="inactive-section">
                  <h3 className="section-title">
                    <span className="include-icon" style={{opacity: 0.5}}>⚫</span>
                    <span style={{opacity: 0.5}}>Included locations ({includedStates.size})</span>
                  </h3>
                  <div className="state-tags">
                    {Array.from(includedStates).map(state => (
                      <div key={state} className="state-tag included" style={{opacity: 0.5}}>
                        {state}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectionMode === 'include' && excludedStates.size > 0 && (
                <div className="inactive-section">
                  <h3 className="section-title">
                    <span className="exclude-icon" style={{opacity: 0.5}}>⚫</span>
                    <span style={{opacity: 0.5}}>Excluded locations ({excludedStates.size})</span>
                  </h3>
                  <div className="state-tags">
                    {Array.from(excludedStates).map(state => (
                      <div key={state} className="state-tag excluded" style={{opacity: 0.5}}>
                        {state}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="location-modal-footer">
          <div className="modal-actions">
            <button className="cancel-button" onClick={handleCancel}>Cancel</button>
            <button className="save-button" onClick={handleSave}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationSelectionModal; 