import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Info } from 'lucide-react';
import './DataIngestionForm.css';
import './ConfigureExperiment.css';
import './IngestDataStep.style.css';
import { selectQuantileLocations, processDataForQuantileSelection } from '../utils/quantileLocationSelection';

// Reusable Step 1: Ingest Data component
// Supports both controlled (via props) and uncontrolled (internal state) usage
const IngestDataStep = ({
  onBack,
  withPageWrapper = true,
  showHeader = true,
  showBack = true,
  showTitle = true,
  // Optional controlled props; if not provided, will use internal state
  selectedFile: controlledSelectedFile,
  setSelectedFile: controlledSetSelectedFile,
  fileData: controlledFileData,
  setFileData: controlledSetFileData,
  dateColumn: controlledDateColumn,
  setDateColumn: controlledSetDateColumn,
  outcomeColumn: controlledOutcomeColumn,
  setOutcomeColumn: controlledSetOutcomeColumn,
  locationColumn: controlledLocationColumn,
  setLocationColumn: controlledSetLocationColumn,
  containsZipCodes: controlledContainsZipCodes,
  setContainsZipCodes: controlledSetContainsZipCodes,
  dateFormat: controlledDateFormat,
  setDateFormat: controlledSetDateFormat,
  activeTab: controlledActiveTab,
  setActiveTab: controlledSetActiveTab,
  useDefaultFile: controlledUseDefaultFile,
  setUseDefaultFile: controlledSetUseDefaultFile,
  availableLocations: controlledAvailableLocations,
  setAvailableLocations: controlledSetAvailableLocations,
  selectedTestLocations: controlledSelectedTestLocations,
  setSelectedTestLocations: controlledSetSelectedTestLocations,
  testLocations: controlledTestLocations,
  setTestLocations: controlledSetTestLocations,
  isDataIngested: controlledIsDataIngested,
  setIsDataIngested: controlledSetIsDataIngested
}) => {
  // Internal state fallbacks for uncontrolled usage
  const [internalSelectedFile, setInternalSelectedFile] = useState('');
  const [internalFileData, setInternalFileData] = useState(null);
  const [internalDateColumn, setInternalDateColumn] = useState('');
  const [internalOutcomeColumn, setInternalOutcomeColumn] = useState('');
  const [internalLocationColumn, setInternalLocationColumn] = useState('');
  const [internalContainsZipCodes, setInternalContainsZipCodes] = useState(false);
  const [internalDateFormat, setInternalDateFormat] = useState('');
  const [internalActiveTab, setInternalActiveTab] = useState('data');
  const [internalUseDefaultFile, setInternalUseDefaultFile] = useState(false);
  const [internalAvailableLocations, setInternalAvailableLocations] = useState([]);
  const [internalSelectedTestLocations, setInternalSelectedTestLocations] = useState([]);
  const [internalTestLocations, setInternalTestLocations] = useState('');
  const [internalIsDataIngested, setInternalIsDataIngested] = useState(false);

  // Date range filter state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Chart location management state
  // enabledLocations: Array of location names that are currently visible in the chart
  // Initially populated with 5 locations selected using quantile-based algorithm from R logic
  const [enabledLocations, setEnabledLocations] = useState([]);
  const [addLocationInput, setAddLocationInput] = useState('');
  const [addLocationDropdownOpen, setAddLocationDropdownOpen] = useState(false);
  const addLocationContainerRef = useRef(null);

  // Plot toggle: combined Highcharts line
  const [combinedLinePlot, setCombinedLinePlot] = useState(true);
  const highchartsContainerRef = useRef(null);
  const chartInstanceRef = useRef(null);

  // New state to track loading and errors
  const [ingestLoading, setIngestLoading] = useState(false);
  const [ingestError, setIngestError] = useState('');

  // Effective values and setters
  const selectedFile = controlledSelectedFile !== undefined ? controlledSelectedFile : internalSelectedFile;
  const setSelectedFile = controlledSetSelectedFile || setInternalSelectedFile;

  const fileData = controlledFileData !== undefined ? controlledFileData : internalFileData;
  const setFileData = controlledSetFileData || setInternalFileData;

  const dateColumn = controlledDateColumn !== undefined ? controlledDateColumn : internalDateColumn;
  const setDateColumn = controlledSetDateColumn || setInternalDateColumn;

  const outcomeColumn = controlledOutcomeColumn !== undefined ? controlledOutcomeColumn : internalOutcomeColumn;
  const setOutcomeColumn = controlledSetOutcomeColumn || setInternalOutcomeColumn;

  const locationColumn = controlledLocationColumn !== undefined ? controlledLocationColumn : internalLocationColumn;
  const setLocationColumn = controlledSetLocationColumn || setInternalLocationColumn;

  const containsZipCodes = controlledContainsZipCodes !== undefined ? controlledContainsZipCodes : internalContainsZipCodes;
  const setContainsZipCodes = controlledSetContainsZipCodes || setInternalContainsZipCodes;

  const dateFormat = controlledDateFormat !== undefined ? controlledDateFormat : internalDateFormat;
  const setDateFormat = controlledSetDateFormat || setInternalDateFormat;

  const activeTab = controlledActiveTab !== undefined ? controlledActiveTab : internalActiveTab;
  const setActiveTab = controlledSetActiveTab || setInternalActiveTab;

  const useDefaultFile = controlledUseDefaultFile !== undefined ? controlledUseDefaultFile : internalUseDefaultFile;
  const setUseDefaultFile = controlledSetUseDefaultFile || setInternalUseDefaultFile;

  const availableLocations = controlledAvailableLocations !== undefined ? controlledAvailableLocations : internalAvailableLocations;
  const setAvailableLocations = controlledSetAvailableLocations || setInternalAvailableLocations;

  // eslint-disable-next-line no-unused-vars
  const selectedTestLocations = controlledSelectedTestLocations !== undefined ? controlledSelectedTestLocations : internalSelectedTestLocations;
  const setSelectedTestLocations = controlledSetSelectedTestLocations || setInternalSelectedTestLocations;

  // eslint-disable-next-line no-unused-vars
  const testLocations = controlledTestLocations !== undefined ? controlledTestLocations : internalTestLocations;
  const setTestLocations = controlledSetTestLocations || setInternalTestLocations;

  const isDataIngested = controlledIsDataIngested !== undefined ? controlledIsDataIngested : internalIsDataIngested;
  const setIsDataIngested = controlledSetIsDataIngested || setInternalIsDataIngested;

  // Utility function to check if a value looks like a ZIP code
  const isZipCode = (value) => {
    const str = String(value).trim();
    // US ZIP codes: 5 digits or 5+4 format
    return /^\d{5}(-\d{4})?$/.test(str);
  };

  // Utility function to parse date based on format
  const parseDate = (dateStr, format) => {
    if (!dateStr || !format) return null;
    
    const str = String(dateStr).trim();
    let day, month, year;
    
    try {
      switch (format) {
        case 'MM/dd/yyyy':
          [month, day, year] = str.split('/').map(Number);
          break;
        case 'dd/MM/yyyy':
          [day, month, year] = str.split('/').map(Number);
          break;
        case 'yyyy-MM-dd':
          [year, month, day] = str.split('-').map(Number);
          break;
        case 'yyyy/MM/dd':
          [year, month, day] = str.split('/').map(Number);
          break;
        case 'MM-dd-yyyy':
          [month, day, year] = str.split('-').map(Number);
          break;
        case 'dd-MM-yyyy':
          [day, month, year] = str.split('-').map(Number);
          break;
        case 'MM/dd/yy':
          [month, day, year] = str.split('/').map(Number);
          year = year < 50 ? 2000 + year : 1900 + year; // Assume 00-49 = 2000-2049, 50-99 = 1950-1999
          break;
        case 'dd/MM/yy':
          [day, month, year] = str.split('/').map(Number);
          year = year < 50 ? 2000 + year : 1900 + year;
          break;
        case 'yy-MM-dd':
          [year, month, day] = str.split('-').map(Number);
          year = year < 50 ? 2000 + year : 1900 + year;
          break;
        default:
          // Try to parse as-is
          return new Date(str);
      }
      
      // Validate the parsed values
      if (!day || !month || !year || month < 1 || month > 12 || day < 1 || day > 31) {
        return null;
      }
      
      // Create date (month is 0-indexed in JavaScript Date)
      return new Date(year, month - 1, day);
    } catch (error) {
      console.warn('Date parsing error:', error, { dateStr, format });
      return null;
    }
  };

  // Function to standardize date to ISO format (yyyy-MM-dd)
  const standardizeDate = (dateStr, format) => {
    const parsed = parseDate(dateStr, format);
    if (!parsed || isNaN(parsed.getTime())) return dateStr; // Return original if parsing fails
    
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Reset ingestion status when key parameters change
  useEffect(() => {
    if (isDataIngested) {
      setIsDataIngested(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateColumn, outcomeColumn, locationColumn, dateFormat, containsZipCodes]);

  // Handle data ingestion with column mapping validation
  const handleIngestData = async () => {
    if (!fileData || !dateColumn || !outcomeColumn || !locationColumn || !dateFormat) {
      setIngestError('Please map all required fields: Date column, Outcome column, Location column, and Date format');
      return;
    }

    try {
      setIngestLoading(true);
      setIngestError('');

      // Validate column mappings exist in headers
      const headers = (fileData.headers || []).map(h => String(h).trim().toLowerCase());
      const mappedColumns = {
        date: dateColumn.trim().toLowerCase(),
        outcome: outcomeColumn.trim().toLowerCase(), 
        location: locationColumn.trim().toLowerCase()
      };

      const missingColumns = [];
      if (!headers.includes(mappedColumns.date)) missingColumns.push(`Date: "${dateColumn}"`);
      if (!headers.includes(mappedColumns.outcome)) missingColumns.push(`Outcome: "${outcomeColumn}"`);
      if (!headers.includes(mappedColumns.location)) missingColumns.push(`Location: "${locationColumn}"`);

      if (missingColumns.length > 0) {
        throw new Error(`Column(s) not found in data: ${missingColumns.join(', ')}`);
      }

      // Process and validate the data
      const processedRows = [];
      const dateIssues = [];
      const zipCodeLocations = [];
      
      for (let i = 0; i < fileData.rows.length; i++) {
        const row = fileData.rows[i];
        const location = (row[headers.indexOf(mappedColumns.location)] || '').trim();
        const outcome = row[headers.indexOf(mappedColumns.outcome)];
        const dateValue = (row[headers.indexOf(mappedColumns.date)] || '').trim();
        
        // Skip empty rows
        if (!location || !dateValue) continue;
        
        // Check for ZIP codes if the option is enabled
        if (containsZipCodes && isZipCode(location)) {
          zipCodeLocations.push(location);
          continue; // Skip ZIP code entries
        }
        
        // Parse and standardize the date
        const standardizedDate = standardizeDate(dateValue, dateFormat);
        const parsedDate = parseDate(dateValue, dateFormat);
        
        if (!parsedDate || isNaN(parsedDate.getTime())) {
          dateIssues.push(`Row ${i + 2}: "${dateValue}" doesn't match format ${dateFormat}`);
          continue;
        }
        
        processedRows.push({
          location: location.toLowerCase(),
          outcome: parseFloat(outcome) || 0,
          originalDate: dateValue,
          standardizedDate: standardizedDate,
          parsedDate: parsedDate
        });
      }
      
      // Report issues if any
      if (dateIssues.length > 0) {
        const maxErrors = 5;
        const errorMessage = `Date format issues found:\n${dateIssues.slice(0, maxErrors).join('\n')}${dateIssues.length > maxErrors ? `\n... and ${dateIssues.length - maxErrors} more` : ''}`;
        throw new Error(errorMessage);
      }
      
      if (containsZipCodes && zipCodeLocations.length > 0) {
        console.log(`Filtered out ${zipCodeLocations.length} ZIP code entries:`, zipCodeLocations.slice(0, 10));
      }
      
      if (processedRows.length === 0) {
        throw new Error('No valid data rows found after processing. Please check your column mappings and date format.');
      }
      
      // Update available locations list (excluding ZIP codes)
      const uniqueLocations = [...new Set(processedRows.map(row => row.location))].sort();
      setAvailableLocations(uniqueLocations);
      
      // Select initial 5 locations using quantile logic (based on R logic from Representitive Cities.R)
      // This selects representative locations across the distribution of outcome values
      const quantileData = processedRows.map(row => ({
        location: row.location,
        outcome: row.outcome,
        date: row.standardizedDate
      }));
      
      const initialLocations = selectQuantileLocations(quantileData, {
        n: 5,
        target: 'outcome',
        method: 'mean',
        locationColumn: 'location'
      });
      
      console.log('Selected initial locations using quantile algorithm:', initialLocations);
      
      setEnabledLocations(initialLocations);
      
      // Mark as successfully ingested
      setIsDataIngested(true);
      console.log('Data ingested successfully:', {
        mappings: mappedColumns,
        totalRows: processedRows.length,
        uniqueLocations: uniqueLocations.length,
        zipCodesFiltered: zipCodeLocations.length,
        dateRange: processedRows.length > 0 ? {
          earliest: processedRows[0].standardizedDate,
          latest: processedRows[processedRows.length - 1].standardizedDate
        } : null
      });
      
    } catch (error) {
      setIngestError(error.message);
      setIsDataIngested(false);
    } finally {
      setIngestLoading(false);
    }
  };

  const processCSVData = (csvData, fileName, autoDetect = false) => {
    console.log('[IngestDataStep] Processing CSV data:', { fileName, autoDetect, lines: csvData.split('\n').length });
    const lines = csvData.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const headersLower = headers.map(h => String(h).trim().toLowerCase());

    const rows = lines
      .slice(1)
      .filter(line => line.trim() !== '')
      .map(line => line.split(',').map(cell => cell.trim()))
      .filter(row => row.length >= 3);

    // Detect location column index dynamically
    const toKey = (s) => String(s || '').trim().toLowerCase();
    const tryIdx = (name, fallbacks = []) => {
      const targets = [name, ...fallbacks].map(toKey);
      for (let t of targets) {
        const idx = headersLower.indexOf(t);
        if (idx !== -1) return idx;
      }
      return -1;
    };

    // Prefer user-entered locationColumn if present; else detect
    let locIdx = tryIdx(locationColumn, ['location', 'city', 'location_id', 'geo', 'market']);
    if (locIdx === -1) locIdx = tryIdx('location', ['city', 'location_id', 'geo', 'market']);

    // If still not found, fallback to the first non-numeric-looking column
    if (locIdx === -1 && rows.length > 0) {
      for (let c = 0; c < headers.length; c++) {
        const sample = rows[0][c] || '';
        if (isNaN(Number(sample))) { locIdx = c; break; }
      }
    }

    // Compute available locations using detected column (convert to lowercase for consistency)
    const uniqueLocations = locIdx !== -1
      ? [...new Set(rows.map(row => (row[locIdx] || '').trim().toLowerCase()))].filter(Boolean).sort()
      : [];

    // Persist parsed data
    const newFileData = { headers, rows, totalRows: lines.length - 1 };
    console.log('[IngestDataStep] Setting file data:', { headers: newFileData.headers, rowCount: newFileData.rows.length, totalRows: newFileData.totalRows });
    setFileData(newFileData);
    setAvailableLocations(uniqueLocations);
    setSelectedTestLocations([]);
    setTestLocations('');

    // Align visible location column input if we detected a different header (only for auto-detect mode)
    if (autoDetect && locIdx !== -1) {
      const detectedHeader = headers[locIdx];
      if (detectedHeader && detectedHeader !== locationColumn) {
        setLocationColumn(detectedHeader);
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file.name);
      setUseDefaultFile(false);

      // Reset all mapping fields when new file is uploaded
      setLocationColumn('');
      setOutcomeColumn('');
      setDateColumn('');
      setDateFormat('');
      setContainsZipCodes(false);
      
      // Reset data ingestion state
      setIsDataIngested(false);
      setEnabledLocations([]);
      setStartDate('');
      setEndDate('');
      
      // Reset to data tab to show the uploaded table
      setActiveTab('data');

      const reader = new FileReader();
      reader.onload = (event) => {
        const csvData = event.target.result;
        console.log('[IngestDataStep] File loaded, processing CSV data...', { fileName: file.name, dataLength: csvData.length });
        processCSVData(csvData, file.name, false); // User upload - no auto-detection
      };
      reader.readAsText(file);
    } else {
      setSelectedFile('');
      setFileData(null);
      setAvailableLocations([]);
      setSelectedTestLocations([]);
      setTestLocations('');
      setEnabledLocations([]);
      setStartDate('');
      setEndDate('');
      
      // Reset mapping fields when no file
      setLocationColumn('');
      setOutcomeColumn('');
      setDateColumn('');
      setDateFormat('');
      setContainsZipCodes(false);
      setIsDataIngested(false);
      setActiveTab('data');
    }
  };

  const handleUseDefaultFile = async () => {
    try {
      setUseDefaultFile(true);
      setSelectedFile('online_mkt_us_states.csv');
      const response = await fetch('/online_mkt_us_states.csv');
      const csvData = await response.text();
      // Set correct column mappings for online_mkt_us_states.csv
      setLocationColumn('state');
      setOutcomeColumn('app_download');
      setDateColumn('date');
      setDateFormat('yyyy-MM-dd');
      processCSVData(csvData, 'online_mkt_us_states.csv', false); // Sample data - already explicitly mapped
    } catch (error) {
      console.error('Error loading default file:', error);
    }
  };

  const addLocationToChart = (locationName) => {
    if (!enabledLocations.includes(locationName)) {
      setEnabledLocations(prev => [...prev, locationName]);
    }
    setAddLocationInput('');
    setAddLocationDropdownOpen(false);
  };

  const handleAddLocationInputChange = (e) => {
    const value = e.target.value;
    setAddLocationInput(value);
    setAddLocationDropdownOpen(value.length > 0);
  };

  const getFilteredAvailableLocations = () => {
    if (!addLocationInput) return [];
    return availableLocations.filter(loc => 
      !enabledLocations.includes(loc) &&
      loc.toLowerCase().includes(addLocationInput.toLowerCase())
    );
  };

  // Function to filter file data rows based on date range
  const getFilteredFileData = () => {
    if (!fileData || (!startDate && !endDate)) {
      return fileData; // Return original data if no filters
    }

    const headers = fileData.headers.map(h => String(h).trim().toLowerCase());
    const idxDate = headers.indexOf(dateColumn.trim().toLowerCase());
    
    if (idxDate === -1) {
      console.warn('Date column not found for filtering:', dateColumn);
      return fileData; // Return original data if date column not found
    }

    const filteredRows = fileData.rows.filter(row => {
      const dateStr = (row[idxDate] || '').trim();
      if (!dateStr) return false;

      // Parse the date using the user's specified format
      const parsedDate = parseDate(dateStr, dateFormat);
      if (!parsedDate || isNaN(parsedDate.getTime())) {
        return false; // Skip invalid dates
      }

      // Convert to YYYY-MM-DD string for comparison
      const rowDateStr = parsedDate.getFullYear() + '-' + 
        String(parsedDate.getMonth() + 1).padStart(2, '0') + '-' + 
        String(parsedDate.getDate()).padStart(2, '0');

      // Apply date range filter
      if (startDate && rowDateStr < startDate) return false;
      if (endDate && rowDateStr > endDate) return false;
      
      return true;
    });

    console.log('Date filtering applied:', {
      originalRows: fileData.rows.length,
      filteredRows: filteredRows.length,
      startDate,
      endDate,
      dateColumn,
      dateFormat
    });

    return {
      ...fileData,
      rows: filteredRows,
      totalRows: filteredRows.length
    };
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (addLocationContainerRef.current && !addLocationContainerRef.current.contains(e.target)) {
        setAddLocationDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Handle chart legend clicks
  useEffect(() => {
    const handleLegendClick = (e) => {
      const { locationName } = e.detail;
      setEnabledLocations(prev => {
        if (prev.includes(locationName)) {
          return prev.filter(loc => loc !== locationName);
        } else {
          return [...prev, locationName];
        }
      });
    };

    window.addEventListener('chartLegendClick', handleLegendClick);
    return () => window.removeEventListener('chartLegendClick', handleLegendClick);
  }, []);

  // Highcharts loader
  const loadHighcharts = () => new Promise((resolve, reject) => {
    if (window.Highcharts) return resolve(window.Highcharts);
    const script = document.createElement('script');
    script.src = 'https://code.highcharts.com/highcharts.js';
    script.async = true;
    script.onload = () => resolve(window.Highcharts);
    script.onerror = reject;
    document.body.appendChild(script);
  });

  // Render combined line chart
  useEffect(() => {
    const renderChart = async () => {
      if (activeTab !== 'plot') return;
      
      // Only render chart if data has been ingested
      if (!isDataIngested) {
        if (chartInstanceRef.current) {
          chartInstanceRef.current.destroy();
          chartInstanceRef.current = null;
        }
        return;
      }
      
      // If combined chart is turned off, destroy existing chart and return
      if (!combinedLinePlot) {
        if (chartInstanceRef.current) {
          chartInstanceRef.current.destroy();
          chartInstanceRef.current = null;
        }
        return;
      }
      
      if (!fileData || !highchartsContainerRef.current) return;
      
      // Don't render chart if we don't have any enabled locations yet
      if (enabledLocations.length === 0) {
        console.log('No enabled locations yet, skipping chart render');
        return;
      }
      
      const Highcharts = await loadHighcharts();

      // Get filtered data based on date range
      const filteredData = getFilteredFileData();
      if (!filteredData || filteredData.rows.length === 0) {
        console.log('No data after date filtering - chart will be empty');
        // Clear the chart if no data
        if (chartInstanceRef.current) {
          chartInstanceRef.current.destroy();
          chartInstanceRef.current = null;
        }
        return;
      }

      // Build series by location using mapped column names
      const locationToPoints = {};
      const headers = (filteredData.headers || []).map(h => String(h).trim().toLowerCase());
      

      
      // Use mapped column names instead of hardcoded ones
      const idxLocation = headers.indexOf(locationColumn.trim().toLowerCase());
      const idxOutcome = headers.indexOf(outcomeColumn.trim().toLowerCase());
      const idxDate = headers.indexOf(dateColumn.trim().toLowerCase());
      
      if (idxLocation === -1 || idxOutcome === -1 || idxDate === -1) {
        console.error('Mapped columns not found in headers:', { locationColumn, outcomeColumn, dateColumn, headers });
        return;
      }

      const dates = [];
      const dateToStandardized = new Map();
      
      filteredData.rows.forEach(row => {
        const location = (row[idxLocation] || '').trim().toLowerCase(); // Convert to lowercase to match ingestion
        const outcome = Number(row[idxOutcome]) || 0;
        const dateStr = (row[idxDate] || '').trim();
        
        if (!location || !dateStr) return;
        
        // Filter out ZIP codes if option is enabled (check original location before conversion)
        if (containsZipCodes && isZipCode((row[idxLocation] || '').trim())) return;
        
        // Parse and standardize the date
        const standardizedDate = standardizeDate(dateStr, dateFormat);
        const parsedDate = parseDate(dateStr, dateFormat);
        
        // Skip invalid dates
        if (!parsedDate || isNaN(parsedDate.getTime())) return;
        
        if (!locationToPoints[location]) locationToPoints[location] = [];
        locationToPoints[location].push({ d: standardizedDate, y: outcome, originalDate: dateStr });
        
        if (!dates.includes(standardizedDate)) {
          dates.push(standardizedDate);
          dateToStandardized.set(standardizedDate, dateStr);
        }
      });
      
      // Sort dates properly using the parsed dates
      dates.sort((a, b) => {
        const dateA = parseDate(a, 'yyyy-MM-dd') || new Date(a);
        const dateB = parseDate(b, 'yyyy-MM-dd') || new Date(b);
        return dateA - dateB;
      });


      const series = Object.keys(locationToPoints).map(location => {
        const map = new Map(locationToPoints[location].map(p => [p.d, p.y]));
        const isEnabled = enabledLocations.includes(location);
        const seriesData = dates.map(d => map.has(d) ? map.get(d) : null);
        
        return {
          name: location,
          data: seriesData,
          connectNulls: true,
          visible: isEnabled,
          showInLegend: true
        };
      });
      


      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }

      chartInstanceRef.current = Highcharts.chart(highchartsContainerRef.current, {
        title: { text: `${outcomeColumn} by ${locationColumn} (Combined)` },
        xAxis: { categories: dates, title: { text: dateColumn } },
        yAxis: { title: { text: outcomeColumn } },
        legend: { 
          enabled: true,
          itemStyle: {
            cursor: 'pointer'
          }
        },
        credits: { enabled: false },
        plotOptions: {
          series: {
            events: {
              legendItemClick: function(e) {
                // Prevent default toggle behavior
                e.preventDefault();
                
                const locationName = this.name;
                
                // Use a custom event to communicate with React
                const event = new CustomEvent('chartLegendClick', {
                  detail: { locationName }
                });
                window.dispatchEvent(event);
                
                return false; // Prevent default Highcharts behavior
              }
            }
          }
        },
        series
      });
    };

    renderChart();

    // Preserve chart instance when switching tabs; clean up only on unmount
    return () => {};
  }, [combinedLinePlot, fileData, activeTab, isDataIngested, locationColumn, outcomeColumn, dateColumn, enabledLocations, dateFormat, containsZipCodes, startDate, endDate]);

  useEffect(() => {
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, []);

  const Header = (
    <div className="ingestion-header">
      {showBack && (
        <button className="back-button" onClick={onBack}>
          <ArrowLeft size={20} />
          Back
        </button>
      )}
      {showTitle && <h2 className="page-title">Step 1: Ingest data</h2>}
    </div>
  );

  const Content = (
    <>
      {showHeader && Header}

      <div className="ingestion-content">
        <div className="ingestion-form-panel">
          <div className="form-section">
            <div className="file-upload-options">
              <div className="upload-option">
                <button
                  type="button"
                  className={`upload-option-btn ${useDefaultFile ? 'active' : ''}`}
                  onClick={handleUseDefaultFile}
                >
                  <span className="option-icon">📊</span>
                  <span className="option-text">Use Sample Data</span>
                  <span className="option-desc">online_mkt_us_states.csv</span>
                </button>
              </div>

              <div className="upload-option">
                <input
                  type="file"
                  id="file-upload"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                  accept=".csv"
                />
                <button
                  type="button"
                  className={`upload-option-btn ${!useDefaultFile && selectedFile ? 'active' : ''}`}
                  onClick={() => document.getElementById('file-upload').click()}
                >
                  <span className="option-icon">📁</span>
                  <span className="option-text">Upload Your File</span>
                  <span className="option-desc">Choose CSV file</span>
                </button>
              </div>
            </div>

            {selectedFile && (
              <div className="file-info">
                <span className="file-name">
                  📄 {selectedFile}
                  {useDefaultFile && <span className="default-badge">Sample</span>}
                </span>
                {fileData && (
                  <span className="file-stats">
                    {fileData.totalRows} rows, {availableLocations.length} locations
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="form-section">
            <label className="form-label">Date column</label>
            <div className="input-with-dropdown">
              {fileData?.headers ? (
                <select
                  value={dateColumn}
                  onChange={(e) => setDateColumn(e.target.value)}
                  className="text-input"
                >
                  <option value="">Select date column...</option>
                  {fileData.headers.map((header, index) => (
                    <option key={index} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={dateColumn}
                  onChange={(e) => setDateColumn(e.target.value)}
                  className="text-input"
                  placeholder="Enter date column name"
                />
              )}
            </div>
          </div>

          <div className="form-section">
            <label className="form-label">Outcome variable column</label>
            <div className="input-with-dropdown">
              {fileData?.headers ? (
                <select
                  value={outcomeColumn}
                  onChange={(e) => setOutcomeColumn(e.target.value)}
                  className="text-input"
                >
                  <option value="">Select outcome column...</option>
                  {fileData.headers.map((header, index) => (
                    <option key={index} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={outcomeColumn}
                  onChange={(e) => setOutcomeColumn(e.target.value)}
                  className="text-input"
                  placeholder="Enter outcome column name"
                />
              )}
            </div>
          </div>

          <div className="form-section">
            <label className="form-label">Location ID column</label>
            <div className="input-with-dropdown">
              {fileData?.headers ? (
                <select
                  value={locationColumn}
                  onChange={(e) => setLocationColumn(e.target.value)}
                  className="text-input"
                >
                  <option value="">Select location column...</option>
                  {fileData.headers.map((header, index) => (
                    <option key={index} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={locationColumn}
                  onChange={(e) => setLocationColumn(e.target.value)}
                  className="text-input"
                  placeholder="Enter location column name"
                />
              )}
            </div>
          </div>

          <div className="form-section checkbox-section">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={containsZipCodes}
                onChange={(e) => setContainsZipCodes(e.target.checked)}
              />
              <span className="checkbox-custom"></span>
              Location column contains ZIP codes
              <Info size={14} className="info-icon" />
            </label>
          </div>

          <div className="form-section">
            <label className="form-label">Date format</label>
            <div className="input-with-dropdown">
              <select
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value)}
                className="text-input"
              >
                <option value="">Select date format...</option>
                <option value="MM/dd/yyyy">MM/dd/yyyy (e.g., 03/15/2024)</option>
                <option value="dd/MM/yyyy">dd/MM/yyyy (e.g., 15/03/2024)</option>
                <option value="yyyy-MM-dd">yyyy-MM-dd (e.g., 2024-03-15)</option>
                <option value="yyyy/MM/dd">yyyy/MM/dd (e.g., 2024/03/15)</option>
                <option value="MM-dd-yyyy">MM-dd-yyyy (e.g., 03-15-2024)</option>
                <option value="dd-MM-yyyy">dd-MM-yyyy (e.g., 15-03-2024)</option>
                <option value="MM/dd/yy">MM/dd/yy (e.g., 03/15/24)</option>
                <option value="dd/MM/yy">dd/MM/yy (e.g., 15/03/24)</option>
                <option value="yy-MM-dd">yy-MM-dd (e.g., 24-03-15)</option>
              </select>
            </div>
          </div>

          <div className="form-section">
            <div className="config-actions">
              <button
                type="button"
                className={`secondary-btn ${ingestLoading ? 'disabled' : ''}`}
                disabled={ingestLoading || !fileData || !dateColumn || !outcomeColumn || !locationColumn || !dateFormat}
                onClick={handleIngestData}
              >
                {ingestLoading ? 'Ingesting...' : 'Ingest Data'}
              </button>
            </div>
            {ingestError && <div className="error-message">{ingestError}</div>}
            {isDataIngested && (
              <div className="success-message">
                Data successfully ingested! Plot is now available.
              </div>
            )}
          </div>
        </div>

        <div className="ingestion-display-panel">
          <div className="tabs">
            <button
              className={`tab-button ${activeTab === 'data' ? 'active' : ''}`}
              onClick={() => setActiveTab('data')}
            >
              Data
            </button>
            <button
              className={`tab-button ${activeTab === 'plot' ? 'active' : ''}`}
              onClick={() => setActiveTab('plot')}
            >
              Plot
            </button>
          </div>
          <div className="tab-content">
            {activeTab === 'data' && (
              fileData ? (
                <div className="data-table-container">
                  <div className="data-info">
                    <span className="row-count">{fileData.totalRows} rows</span>
                  </div>
                  <div className="data-table">
                    <table>
                      <thead>
                        <tr>
                          {fileData.headers.map((header, index) => (
                            <th key={index}>{header}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {fileData.rows.map((row, rowIndex) => (
                          <tr key={rowIndex}>
                            {row.map((cell, cellIndex) => (
                              <td key={cellIndex}>{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="upload-prompt">Please upload your data</p>
              )
            )}
            {activeTab === 'plot' && (
              fileData ? (
                isDataIngested ? (
                  <div className="plot-container">
                    <div className="chart-container">
                      
                    <div className="plot-controls" style={{ justifyContent: 'flex-end', marginBottom: 8 }}>
                      <label className="checkbox-label" style={{ gap: 6 }}>
                        <input type="checkbox" checked={combinedLinePlot} onChange={(e) => setCombinedLinePlot(e.target.checked)} />
                        <span className="checkbox-custom"></span>
                        Show combined line chart
                      </label>
                    </div>
                    <div className="chart-content city-view">
                      {combinedLinePlot ? (
                        <div style={{ width: '100%', padding: 12 }}>
                          <div ref={highchartsContainerRef} style={{ width: '100%', height: 680 }} />
                        </div>
                      ) : (
                        <div className="bar-chart">
                          {(() => {
                            if (!fileData || !fileData.rows) return null;
                            
                            const headers = fileData.headers || [];
                            const toKey = (s) => String(s || '').trim().toLowerCase();
                            const findIdx = (name, fallbacks = []) => {
                              const targets = [name, ...fallbacks].map(toKey);
                              for (let t of targets) {
                                const idx = headers.findIndex(h => toKey(h) === t);
                                if (idx !== -1) return idx;
                              }
                              return -1;
                            };

                            const locIdx = headers.indexOf(locationColumn.trim().toLowerCase());
                            const yIdx = headers.indexOf(outcomeColumn.trim().toLowerCase());
                            const dateIdx = headers.indexOf(dateColumn.trim().toLowerCase());

                            if (locIdx === -1 || yIdx === -1 || dateIdx === -1) return null;

                            const locationData = {};
                            fileData.rows.forEach(row => {
                              const location = (row[locIdx] || '').trim();
                              const outcome = parseFloat(row[yIdx]) || 0;
                              const dateStr = (row[dateIdx] || '').trim();
                              
                              if (!location || !dateStr) return;
                              
                              // Filter out ZIP codes if option is enabled
                              if (containsZipCodes && isZipCode(location)) return;
                              
                              // Parse and validate date
                              const parsedDate = parseDate(dateStr, dateFormat);
                              if (!parsedDate || isNaN(parsedDate.getTime())) return;
                              
                              const standardizedDate = standardizeDate(dateStr, dateFormat);
                              
                              if (!locationData[location]) {
                                locationData[location] = [];
                              }
                              locationData[location].push({ 
                                date: standardizedDate, 
                                outcome: outcome,
                                originalDate: dateStr 
                              });
                            });

                            const locations = Object.keys(locationData).sort();
                            const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#ef4444'];

                            return (
                              <div className="location-charts-grid">
                                {locations.map((location, locationIndex) => {
                                  const locationRows = locationData[location];
                                  const color = colors[locationIndex % colors.length];
                                  // Use this location's max outcome for scaling instead of global max
                                  const maxOutcome = Math.max(...locationRows.map(d => d.outcome));

                                  return (
                                    <div key={locationIndex} className="location-area-chart">
                                      <h4 className="location-title">{location}</h4>
                                      <div className="area-chart-container">
                                        <svg className="area-chart" viewBox="-50 0 450 320" preserveAspectRatio="xMidYMid meet">
                                          {[0, 25, 50, 75, 100].map((y, i) => (
                                            <line key={i} x1="0" y1={250 - y * 2.5} x2="400" y2={250 - y * 2.5} stroke="#e5e7eb" strokeWidth="1" />
                                          ))}
                                          {[0, 25, 50, 75, 100].map((x, i) => (
                                            <line key={i} x1={x * 4} y1="0" x2={x * 4} y2="250" stroke="#e5e7eb" strokeWidth="1" />
                                          ))}

                                          <path
                                            d={(() => {
                                              if (locationRows.length === 0) return '';
                                              const points = locationRows.map((dataPoint, index) => {
                                                const x = (index / (locationRows.length - 1)) * 400;
                                                const y = 250 - (dataPoint.outcome / maxOutcome) * 250;
                                                return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
                                              });
                                              return points.join(' ') + ' L 400 250 L 0 250 Z';
                                            })()}
                                            fill={color}
                                            fillOpacity="0.3"
                                            stroke={color}
                                            strokeWidth="2"
                                          />

                                          {locationRows.map((dataPoint, index) => {
                                            const x = (index / (locationRows.length - 1)) * 400;
                                            const y = 250 - (dataPoint.outcome / maxOutcome) * 250;
                                            return <circle key={index} cx={x} cy={y} r="4" fill={color} stroke="white" strokeWidth="1" />;
                                          })}

                                          {/* Y-axis labels scaled to this location's max */}
                                          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                                            const value = maxOutcome * ratio;
                                            const y = 250 - ratio * 250;
                                            return (
                                              <text key={i} x="-20" y={y + 3} fontSize="10" fill="#6b7280" textAnchor="end">
                                                {value.toLocaleString()}
                                              </text>
                                            );
                                          })}

                                          <text x="-40" y="125" fontSize="12" fill="#374151" textAnchor="middle" transform="rotate(-90, -40, 125)" fontWeight="500">
                                            {outcomeColumn}
                                          </text>

                                          {locationRows.length > 0 && (
                                            <>
                                              <text x="200" y="300" fontSize="12" fill="#374151" textAnchor="middle" fontWeight="500">
                                                Time (Day)
                                              </text>
                                              <text x="0" y="285" fontSize="10" fill="#6b7280" textAnchor="middle">
                                                Feb 2024
                                              </text>
                                              <text x="400" y="285" fontSize="10" fill="#6b7280" textAnchor="middle">
                                                Apr 2024
                                              </text>
                                              {locationRows.map((dataPoint, index) => {
                                                if (index % Math.ceil(locationRows.length / 5) === 0 || index === locationRows.length - 1) {
                                                  const x = (index / (locationRows.length - 1)) * 400;
                                                  const date = new Date(dataPoint.date);
                                                  const month = date.toLocaleDateString('en-US', { month: 'short' });
                                                  const day = date.getDate();
                                                  return (
                                                    <g key={index}>
                                                      <line x1={x} y1="250" x2={x} y2="255" stroke="#6b7280" strokeWidth="1" />
                                                      <text x={x} y="275" fontSize="9" fill="#6b7280" textAnchor="middle">
                                                        {`${month} ${day}`}
                                                      </text>
                                                    </g>
                                                  );
                                                }
                                                return null;
                                              })}
                                            </>
                                          )}
                                        </svg>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                ) : (
                  <div className="ingestion-required-message">
                    <h3>Data Ingestion Required</h3>
                    <p>Please click "Ingest Data" in the left panel after mapping your columns to see the plot.</p>
                  </div>
                )
              ) : (
                <p className="upload-prompt">Plot will appear here after data ingestion</p>
              )
            )}
          </div>

          {fileData && (
            <div className="post-upload-options">
              <div className="date-range-filter">
                <div className="date-range-title">Date Range Filter</div>
                <div className="date-range-inputs">
                  <div className="date-input-group">
                    <label className="date-label">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="date-input"
                    />
                  </div>
                  <div className="date-input-group">
                    <label className="date-label">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="date-input"
                    />
                  </div>
                </div>
                {(startDate || endDate) && (
                  <button
                    type="button"
                    className="clear-dates-btn"
                    onClick={() => {
                      setStartDate('');
                      setEndDate('');
                    }}
                  >
                    Clear Date Filter
                  </button>
                )}
              </div>

              <div className="add-locations">
                <div className="add-title">Add Location to Chart</div>
                <div className="location-input-container" ref={addLocationContainerRef}>
                  <div className="location-input-wrapper">
                    {enabledLocations.length > 0 && (
                      <div className="enabled-locations-legend">
                        {enabledLocations.map((location) => (
                          <span key={location} className="location-pill">
                            {location}
                            <button
                              type="button"
                              className="pill-remove"
                              onClick={() => setEnabledLocations(prev => prev.filter(loc => loc !== location))}
                              aria-label={`Remove ${location}`}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <input
                      type="text"
                      value={addLocationInput}
                      onChange={handleAddLocationInputChange}
                      placeholder={enabledLocations.length > 0 ? "Add more locations..." : "Type location name to add..."}
                      className="location-input"
                    />
                  </div>
                  {addLocationDropdownOpen && getFilteredAvailableLocations().length > 0 && (
                    <div className="location-dropdown">
                      {getFilteredAvailableLocations().map((loc) => (
                        <button
                          type="button"
                          key={loc}
                          className="location-option"
                          onClick={() => addLocationToChart(loc)}
                        >
                          {loc}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );

  if (!withPageWrapper) {
    return Content;
  }

  return (
    <div className="data-ingestion-page">
      {Content}
    </div>
  );
};

export default IngestDataStep; 