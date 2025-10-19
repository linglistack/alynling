import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import IngestDataStep from './IngestDataStep';
import ConfigureExperiment from './ConfigureExperiment';

import { geoliftAPI } from '../utils/geoliftAPI';
import { saveExperiment } from '../utils/experimentStorage';
import './ExperimentSetup.css';

const ExperimentSetup = ({ onBack, onExperimentCreated }) => {
  const [currentStep, setCurrentStep] = useState(1);

  // Controlled Step 1 state so we can validate and proceed
  const [selectedFile, setSelectedFile] = useState('');
  const [fileData, setFileData] = useState(null);
  const [dateColumn, setDateColumn] = useState('');
  const [outcomeColumn, setOutcomeColumn] = useState('');
  const [locationColumn, setLocationColumn] = useState('');
  const [containsZipCodes, setContainsZipCodes] = useState(false);
  const [dateFormat, setDateFormat] = useState('');
  const [activeTab, setActiveTab] = useState('data');
  const [useDefaultFile, setUseDefaultFile] = useState(false);
  const [availableLocations, setAvailableLocations] = useState([]);
  const [selectedTestLocations, setSelectedTestLocations] = useState([]);
  const [testLocations, setTestLocations] = useState('');
  const [experimentName, setExperimentName] = useState('');

  const [processedData, setProcessedData] = useState(null);
  const [geoDataReadResponse, setGeoDataReadResponse] = useState(null);
  const [uploadError, setUploadError] = useState('');

  // Track if data has been ingested (user clicked "Ingest Data" button)
  const [isDataIngested, setIsDataIngested] = useState(false);
  // Cache API results to prevent re-running when navigating back
  const [cachedMarketSelection, setCachedMarketSelection] = useState(null);
  
  // Track pre-call loading state to prevent duplicate API calls
  const [isPreCallingMarketSelection, setIsPreCallingMarketSelection] = useState(false);
  const [marketSelectionProgress, setMarketSelectionProgress] = useState(0);

  // Selected market row state - persisted across step navigation
  const [selectedMarketRow, setSelectedMarketRow] = useState(null);

  // Chart and expanded row state - persisted across step navigation
  const [expandedRows, setExpandedRows] = useState({});
  const [rowAnalysisData, setRowAnalysisData] = useState({});
  const [rowAnalysisLoading, setRowAnalysisLoading] = useState({});
  const [rowAnalysisErrors, setRowAnalysisErrors] = useState({});
  
  // Experiment configuration state - persisted across step navigation
  const [experimentCells, setExperimentCells] = useState(null); // Will be initialized in ConfigureExperiment

  // Shared data processing function
  const processDataForAPI = (data, colMappings) => {
    const { locationColumn, outcomeColumn, dateColumn, dateFormat, containsZipCodes } = colMappings;
    
    if (!data || !data.rows || !locationColumn || !outcomeColumn || !dateColumn || !dateFormat) {
      throw new Error('Missing required data or column mappings');
    }

    const headers = (data.headers || []).map(h => String(h).trim().toLowerCase());
    
    // Use exact user-mapped column names
    const locIdx = headers.indexOf(locationColumn.trim().toLowerCase());
    const yIdx = headers.indexOf(outcomeColumn.trim().toLowerCase());
    const dateIdx = headers.indexOf(dateColumn.trim().toLowerCase());

    if (locIdx === -1 || yIdx === -1 || dateIdx === -1) {
      throw new Error(`Missing required columns in data headers. Expected: ${locationColumn}, ${outcomeColumn}, ${dateColumn}`);
    }

    // Date parsing utilities
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
            year = year < 50 ? 2000 + year : 1900 + year;
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
            return new Date(str);
        }
        
        if (!day || !month || !year || month < 1 || month > 12 || day < 1 || day > 31) {
          return null;
        }
        
        return new Date(year, month - 1, day);
      } catch (error) {
        return null;
      }
    };

    const standardizeDate = (dateStr, format) => {
      const parsed = parseDate(dateStr, format);
      if (!parsed || isNaN(parsed.getTime())) return dateStr;
      
      const year = parsed.getFullYear();
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const day = String(parsed.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const isZipCode = (value) => {
      const str = String(value).trim();
      return /^\d{5}(-\d{4})?$/.test(str);
    };

    // Process and validate data
    const validRows = [];
    const dateIssues = [];
    
    for (let i = 0; i < data.rows.length; i++) {
      const row = data.rows[i];
      const location = (row[locIdx] || '').trim().toLowerCase();
      const outcomeStr = (row[yIdx] || '').trim();
      const dateStr = (row[dateIdx] || '').trim();
      
      // Skip empty rows
      if (!location || !dateStr) continue;
      
      // Filter out ZIP codes if enabled
      if (containsZipCodes && isZipCode(location)) continue;
      
      // Validate and parse date
      const parsedDate = parseDate(dateStr, dateFormat);
      if (!parsedDate || isNaN(parsedDate.getTime())) {
        dateIssues.push(`Row ${i + 2}: "${dateStr}" doesn't match format ${dateFormat}`);
        continue;
      }
      
      // Convert outcome to number
      const outcome = parseFloat(outcomeStr);
      if (isNaN(outcome)) {
        console.warn(`Row ${i + 2}: Non-numeric outcome value "${outcomeStr}", setting to 0`);
      }
      
      const standardizedDate = standardizeDate(dateStr, dateFormat);
      
      validRows.push({
        location,
        Y: isNaN(outcome) ? 0 : outcome,
        date: standardizedDate,
        originalDate: dateStr
      });
    }

    if (dateIssues.length > 5) { // Only fail if many date issues
      const maxErrors = 5;
      const errorMessage = `Date format issues found:\n${dateIssues.slice(0, maxErrors).join('\n')}${dateIssues.length > maxErrors ? `\n... and ${dateIssues.length - maxErrors} more` : ''}`;
      throw new Error(errorMessage);
    }

    if (validRows.length === 0) {
      throw new Error('No valid data rows found after processing.');
    }

    // Convert dates to time periods
    const sortedDates = [...new Set(validRows.map(row => row.date))].sort();
    const dateToTime = {};
    sortedDates.forEach((date, index) => {
      dateToTime[date] = index + 1;
    });

    const processedRows = validRows.map(row => ({
      location: row.location,
      Y: row.Y,
      date: row.date,
      time: dateToTime[row.date]
    }));

    // Debug logging to understand data types
    console.log('[processDataForAPI] Data type analysis:', {
      sampleProcessedRow: processedRows[0],
      yValueTypes: processedRows.slice(0, 5).map((row, i) => `Row ${i}: ${typeof row.Y} - ${row.Y}`),
      allYNumeric: processedRows.every(row => typeof row.Y === 'number' && !isNaN(row.Y)),
      totalRows: processedRows.length
    });

    return {
      processedRows,
      summary: {
        totalRows: processedRows.length,
        uniqueLocations: [...new Set(processedRows.map(r => r.location))].length,
        dateRange: sortedDates.length > 0 ? `${sortedDates[0]} to ${sortedDates[sortedDates.length - 1]}` : 'None',
        timeRange: `1 to ${sortedDates.length}`
      }
    };
  };

  // Analysis state - managed within step 2 (kept for future use)
  const [selectedMarketCombo] = useState(null);
  const [analysisParams] = useState(null);
  const [cachedAnalysisResults, setCachedAnalysisResults] = useState(null);

  const canProceed = !!fileData;

  // Navigation functions
  const goToStep = (step) => {
    if (step === 1) {
      setCurrentStep(1);
    } else if (step === 2 && processedData) {
      setCurrentStep(2);
    } else if (step === 3 && processedData) {
      setCurrentStep(3);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToAnalysis = () => {
    setCurrentStep(3);
  };

  const handleCreateExperiment = async () => {
    if (!selectedMarketRow) {
      alert('Please select a market combination from the table');
      return;
    }

    try {
      // Get date range from geoDataReadResponse or processedData
      let startDate = 'N/A';
      let endDate = 'N/A';
      
      if (geoDataReadResponse?.summary?.date_range) {
        startDate = geoDataReadResponse.summary.date_range.min_date;
        endDate = geoDataReadResponse.summary.date_range.max_date;
      } else if (processedData && Array.isArray(processedData) && processedData.length > 0) {
        const dates = processedData.map(row => row.date).filter(Boolean).sort();
        startDate = dates[0];
        endDate = dates[dates.length - 1];
      }

      // Get experiment configuration from cells
      const treatmentPeriods = experimentCells?.[0]?.advanced?.treatmentPeriods || 28;
      const alpha = experimentCells?.[0]?.advanced?.alpha || 0.1;
      const effectSize = experimentCells?.[0]?.advanced?.effectSizeCsv || 0.3;
      const cpic = experimentCells?.[0]?.advanced?.cpic || 1;
      const budget = experimentCells?.[0]?.advanced?.testAmount || 15000000;
      const directionOfEffect = experimentCells?.[0]?.advanced?.directionOfEffect || 'pos';

      // Calculate treatment times from dates if not already in selectedMarketRow
      let treatmentStartTime = selectedMarketRow?.treatment_start_time;
      let treatmentEndTime = selectedMarketRow?.treatment_end_time;
      
      if ((treatmentStartTime === undefined || treatmentEndTime === undefined) && geoDataReadResponse?.time_mapping) {
        const timeMapping = geoDataReadResponse.time_mapping;
        if (startDate && endDate) {
          const startEntry = timeMapping.find(entry => entry.date === startDate);
          const endEntry = timeMapping.find(entry => entry.date === endDate);
          
          if (startEntry && endEntry) {
            treatmentStartTime = Array.isArray(startEntry.time) ? startEntry.time[0] : startEntry.time;
            treatmentEndTime = Array.isArray(endEntry.time) ? endEntry.time[0] : endEntry.time;
            console.log('[ExperimentSetup] Calculated treatment times from dates:', {
              startDate, endDate, treatmentStartTime, treatmentEndTime
            });
          }
        }
      }

      // Prepare enhanced market combo with treatment parameters
      const enhancedMarketCombo = {
        ...selectedMarketRow,
        treatment_start_time: treatmentStartTime,
        treatment_end_time: treatmentEndTime,
        direction_of_effect: directionOfEffect,
        alpha: alpha
      };

      // Prepare experiment data
      const experimentData = {
        name: experimentName || `Experiment - ${new Date().toLocaleDateString()}`,
        outcome: outcomeColumn || 'N/A',
        startDate,
        endDate,
        status: 'Markets Ready',
        statusType: 'success',
        
        // Store selected market combo with enhanced parameters
        marketCombo: enhancedMarketCombo,
        
        // Store analysis parameters
        analysisParams: {
          treatmentPeriods,
          alpha,
          effectSize,
          cpic,
          lookbackWindow: 1,
          budget,
          directionOfEffect
        },
        
        // Store data
        processedData,
        geoDataReadResponse,
        experimentCells,
        
        // Store user config for later use
        userConfig: {
          testBudget: budget,
          treatmentPeriods,
          numTestGeos: experimentCells?.[0]?.advanced?.numTestGeos || 2,
          cpic,
          effectSize,
          alpha,
          directionOfEffect
        }
      };

      // Save experiment
      const savedExperiment = await saveExperiment(experimentData);
      
      console.log('[ExperimentSetup] Experiment created successfully:', savedExperiment);
      
      // Show success message
      alert(`Experiment "${savedExperiment.name}" created successfully!`);
      
      // Notify parent to refresh experiments list
      if (onExperimentCreated) {
        onExperimentCreated(savedExperiment);
      }
      
      // Go back to main view
      onBack();
    } catch (error) {
      console.error('[ExperimentSetup] Failed to create experiment:', error);
      alert('Failed to create experiment. Please try again.');
    }
  };



  // Clear analysis cache when data or market combo changes
  useEffect(() => {
    if (cachedAnalysisResults) {
      console.log('[ExperimentSetup] Data or configuration changed, clearing analysis cache');
      setCachedAnalysisResults(null);
    }
  }, [processedData, selectedMarketCombo, analysisParams]);

  // Pre-call GeoDataRead and market selection when data is ingested
  useEffect(() => {
    const preCallGeoDataReadAndMarketSelection = async () => {
      if (!fileData || !fileData.rows || fileData.rows.length === 0 || !isDataIngested) {
        setIsPreCallingMarketSelection(false);
        return;
      }
      
      // Don't start new pre-call if one is already in progress
      if (isPreCallingMarketSelection) {
        console.log('[CreateExperiment] Pre-call already in progress, skipping...');
        return;
      }
      
      let progressInterval; // Declare at function scope
      
      try {
        setIsPreCallingMarketSelection(true);
        setMarketSelectionProgress(0);
        console.log('[CreateExperiment] Pre-calling GeoDataRead and market selection after file upload...');
        
        // Simulate progress for better UX (cap at 99% until API completes)
        progressInterval = setInterval(() => {
          setMarketSelectionProgress(prev => {
            if (prev >= 99) return 98; // Cap at 99% until API completes
            return Math.min(prev + Math.random() * 6, 98); // Random increments but never exceed 99%
          });
        }, 3000); // Update every 3 seconds
        
        // Process data locally first
        let processedRows, summary;
        try {
          const result = processDataForAPI(fileData, {
            locationColumn, outcomeColumn, dateColumn, dateFormat, containsZipCodes
          });
          
          ({ processedRows, summary } = result);
          
          console.log('[CreateExperiment] Data transformation for pre-call:', {
            ...summary,
            sampleRow: processedRows[0]
          });
        } catch (dataError) {
          console.log('[CreateExperiment] Cannot pre-call: data processing failed -', dataError.message);
          return;
        }

        // Step 1: Call GeoDataRead first (required for proper GeoLift workflow)
        console.log('[CreateExperiment] Pre-calling GeoDataRead...');
        const geoDataResult = await geoliftAPI.geoDataRead(processedRows, {
          date_id: "date",
          location_id: "location",
          Y_id: "Y",
          format: "yyyy-mm-dd"
        });

        if (!geoDataResult.success || !geoDataResult.data || 
            (Array.isArray(geoDataResult.data) && geoDataResult.data.length === 0) ||
            (typeof geoDataResult.data === 'object' && Object.keys(geoDataResult.data).length === 0)) {
          console.error('[CreateExperiment] GeoDataRead pre-call failed:', geoDataResult);
          clearInterval(progressInterval);
          return;
        }

        console.log('[CreateExperiment] GeoDataRead pre-call successful, storing response...');
        setGeoDataReadResponse(geoDataResult);
        
        // Step 2: Call market selection with GeoDataRead converted data
        console.log('[CreateExperiment] Pre-calling market selection with GeoDataRead data...');
        const defaultParams = {
          treatmentPeriods: 28,
          effectSize: 0.3,
          lookbackWindow: 1,
          cpic: 1,
          alpha: 0.1,
          budget: 15000000,
          holdout: [0.5, 1.0]  // Already in decimal format for API
        };
        
        const resp = await geoliftAPI.marketSelection(geoDataResult.data, defaultParams);
        
        clearInterval(progressInterval);
        
        if (resp.success) {
          // Set to 100% only when API truly completes successfully
          setMarketSelectionProgress(100);
          
          // Use new API structure: output_obj.top_choices
          const combos = resp.output_obj?.top_choices || resp.market_selection || [];
          
          // Cache the default market selection results
          setCachedMarketSelection({
            marketCombos: combos,
            msError: '',
            objID: resp.output_obj?.obj_ID || null,
            singleCell: resp.output_obj?.single_cell ?? true,
            timestamp: Date.now(),
            dependencies: {
              treatmentPeriods: defaultParams.treatmentPeriods,
              effectSize: defaultParams.effectSize,
              lookbackWindow: defaultParams.lookbackWindow,
              cpic: defaultParams.cpic,
              alpha: defaultParams.alpha,
              holdout: defaultParams.holdout,
              dataLength: geoDataResult.data.length,
              budget: defaultParams.budget
            }
          });
          console.log('[CreateExperiment] Market selection pre-cached successfully:', combos.length, 'combinations');
        } else {
          console.log('[CreateExperiment] Market selection pre-call failed:', resp.error);
        }
      } catch (e) {
        clearInterval(progressInterval);
        console.log('[CreateExperiment] Pre-call error (non-blocking):', e.message);
      } finally {
        setIsPreCallingMarketSelection(false);
        // Reset progress after a delay
        setTimeout(() => setMarketSelectionProgress(0), 2000);
      }
    };

    preCallGeoDataReadAndMarketSelection();
  }, [fileData, locationColumn, outcomeColumn, dateColumn, isDataIngested]); // Re-run when data is ingested or column mappings change

  const convertToCsvString = (data) => {
    if (!data || !data.rows) return '';
    const headers = (data.headers || []).map(h => String(h).trim().toLowerCase());
    
    // Use exact user-mapped column names (no fallbacks)
    const locIdx = headers.indexOf(locationColumn.trim().toLowerCase());
    const yIdx = headers.indexOf(outcomeColumn.trim().toLowerCase());
    const dateIdx = headers.indexOf(dateColumn.trim().toLowerCase());

    if (locIdx === -1 || yIdx === -1 || dateIdx === -1) return '';

    const headerRow = 'location,Y,date';
    const dataRows = data.rows.map(row => {
      const location = (row[locIdx] || '').trim();
      const outcome = (row[yIdx] || '').trim();
      const date = (row[dateIdx] || '').trim();
      return `${location},${outcome},${date}`;
    });
    return [headerRow, ...dataRows].join('\n');
  };

  const handleIngestNext = async () => {
    // If we already have processed data from GeoDataRead, just navigate to step 2
    if (processedData) {
      setCurrentStep(2);
      return;
    }
    
    if (!fileData) return;
    
    try {
      setUploadError('');
      
      // Process data locally for Create Experiment flow
      const headers = (fileData.headers || []).map(h => String(h).trim().toLowerCase());
      
      // Use exact user-mapped column names (no fallbacks)
      const locIdx = headers.indexOf(locationColumn.trim().toLowerCase());
      const yIdx = headers.indexOf(outcomeColumn.trim().toLowerCase());
      const dateIdx = headers.indexOf(dateColumn.trim().toLowerCase());

      if (locIdx === -1 || yIdx === -1 || dateIdx === -1) {
        throw new Error('Unable to map required columns. Please check your column mappings.');
      }

      // Use shared data processing function
      const result = processDataForAPI(fileData, {
        locationColumn, outcomeColumn, dateColumn, dateFormat, containsZipCodes
      });
      
      const { processedRows, summary } = result;

      console.log('[CreateExperiment] Processed data locally:', {
        ...summary,
        sampleRow: processedRows[0],
        columns: { locationColumn, outcomeColumn, dateColumn, dateFormat },
        dataTypes: {
          location: typeof processedRows[0]?.location,
          Y: typeof processedRows[0]?.Y,
          date: typeof processedRows[0]?.date,
          time: typeof processedRows[0]?.time
        }
      });

      // Store the raw processed data - GeoDataRead will be called by useEffect
      setProcessedData(processedRows);
      setIsDataIngested(true); // This will trigger the useEffect to call GeoDataRead and market selection
      setCurrentStep(2);
      
    } catch (e) {
      console.error('[CreateExperiment] Data processing failed:', e);
      setUploadError(e.message || 'Data processing failed');
    }
  };

  return (
    <div className="experiment-setup">
      <div className="stepper-header">
        <button className="back-button header-back" onClick={onBack}>
          <ArrowLeft size={20} />
          Back
        </button>
        <div className="stepper">
          <div 
            className={`step ${currentStep >= 1 ? 'active' : ''} ${currentStep === 1 ? 'current' : ''}`}
            onClick={() => goToStep(1)}
            style={{ cursor: 'pointer' }}
          >
            <div className="step-circle">1</div>
            <div className="step-label">Ingest data</div>
          </div>
          <div className={`step-connector ${currentStep >= 2 ? 'active' : ''}`}></div>
          <div 
            className={`step ${currentStep >= 2 ? 'active' : ''} ${currentStep === 2 ? 'current' : ''} ${!processedData ? 'disabled' : ''}`}
            onClick={() => goToStep(2)}
            style={{ cursor: processedData ? 'pointer' : 'not-allowed' }}
          >
            <div className="step-circle">2</div>
            <div className="step-label">Configure</div>
          </div>
         
        </div>
          </div>

      <div className="setup-body">
        {currentStep === 1 && (
          <>
            <IngestDataStep
              onBack={onBack}
              withPageWrapper={false}
              showHeader={false}
              selectedFile={selectedFile}
              setSelectedFile={setSelectedFile}
              fileData={fileData}
              setFileData={setFileData}
              dateColumn={dateColumn}
              setDateColumn={setDateColumn}
              outcomeColumn={outcomeColumn}
              setOutcomeColumn={setOutcomeColumn}
              locationColumn={locationColumn}
              setLocationColumn={setLocationColumn}
              containsZipCodes={containsZipCodes}
              setContainsZipCodes={setContainsZipCodes}
              dateFormat={dateFormat}
              setDateFormat={setDateFormat}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              useDefaultFile={useDefaultFile}
              setUseDefaultFile={setUseDefaultFile}
              availableLocations={availableLocations}
              setAvailableLocations={setAvailableLocations}
              selectedTestLocations={selectedTestLocations}
              setSelectedTestLocations={setSelectedTestLocations}
              testLocations={testLocations}
              setTestLocations={setTestLocations}
              isDataIngested={isDataIngested}
              setIsDataIngested={setIsDataIngested}
            />

            {uploadError && <div className="upload-error">{uploadError}</div>}
            <div className="step-actions">
                              <button
                  className={`ingest-next-btn ${(canProceed && (processedData || isDataIngested)) ? '' : 'disabled'}`}
                  disabled={!canProceed || (!processedData && !isDataIngested)}
                  onClick={handleIngestNext}
                >
                  Next
                </button>
            </div>
          </>
        )}

        {currentStep === 2 && (
          <>
            <div className="step-navigation">
              <button 
                className="nav-button prev-button"
                onClick={goToPreviousStep}
              >
                <ArrowLeft size={16} />
                Previous: Ingest Data
              </button>
                </div>
            <ConfigureExperiment 
              processedData={processedData} 
              geoDataReadResponse={geoDataReadResponse}
              cachedResults={cachedMarketSelection}
              onCacheResults={setCachedMarketSelection}
              isPreCallingMarketSelection={isPreCallingMarketSelection}
              marketSelectionProgress={marketSelectionProgress}
              onGoToAnalysis={goToAnalysis}
              onCreateExperiment={handleCreateExperiment}
              selectedMarketRow={selectedMarketRow}
              onSelectedMarketRowChange={setSelectedMarketRow}
              expandedRows={expandedRows}
              onExpandedRowsChange={setExpandedRows}
              rowAnalysisData={rowAnalysisData}
              onRowAnalysisDataChange={setRowAnalysisData}
              rowAnalysisLoading={rowAnalysisLoading}
              onRowAnalysisLoadingChange={setRowAnalysisLoading}
              rowAnalysisErrors={rowAnalysisErrors}
              onRowAnalysisErrorsChange={setRowAnalysisErrors}
              experimentCells={experimentCells}
              onExperimentCellsChange={setExperimentCells}
              experimentName={experimentName}
              onExperimentNameChange={setExperimentName}
            />
          </>
        )}

        {currentStep === 3 && (
          <>
            <div className="step-navigation">
              <button 
                className="nav-button prev-button"
                onClick={goToPreviousStep}
              >
                <ArrowLeft size={16} />
                Previous: Configure Data
              </button>
                </div>
            <ConfigureExperiment 
              processedData={processedData} 
              geoDataReadResponse={geoDataReadResponse}
              cachedResults={cachedMarketSelection}
              onCacheResults={setCachedMarketSelection}
              isPreCallingMarketSelection={isPreCallingMarketSelection}
              marketSelectionProgress={marketSelectionProgress}
              onGoToAnalysis={goToAnalysis}
              onCreateExperiment={handleCreateExperiment}
              currentStep={3}
              selectedMarketRow={selectedMarketRow}
              onSelectedMarketRowChange={setSelectedMarketRow}
              expandedRows={expandedRows}
              onExpandedRowsChange={setExpandedRows}
              rowAnalysisData={rowAnalysisData}
              onRowAnalysisDataChange={setRowAnalysisData}
              rowAnalysisLoading={rowAnalysisLoading}
              onRowAnalysisLoadingChange={setRowAnalysisLoading}
              rowAnalysisErrors={rowAnalysisErrors}
              onRowAnalysisErrorsChange={setRowAnalysisErrors}
              experimentCells={experimentCells}
              onExperimentCellsChange={setExperimentCells}
              experimentName={experimentName}
              onExperimentNameChange={setExperimentName}
            />
          </>
        )}

      </div>
    </div>
  );
};

export default ExperimentSetup; 