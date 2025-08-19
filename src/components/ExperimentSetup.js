import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import IngestDataStep from './IngestDataStep';
import ConfigureExperiment from './ConfigureExperiment';
import { geoliftAPI } from '../utils/geoliftAPI';
import './ExperimentSetup.css';

const ExperimentSetup = ({ onBack }) => {
  const [currentStep, setCurrentStep] = useState(1);

  // Controlled Step 1 state so we can validate and proceed
  const [selectedFile, setSelectedFile] = useState('');
  const [fileData, setFileData] = useState(null);
  const [dateColumn, setDateColumn] = useState('date');
  const [outcomeColumn, setOutcomeColumn] = useState('Y');
  const [locationColumn, setLocationColumn] = useState('location');
  const [containsZipCodes, setContainsZipCodes] = useState(false);
  const [dateFormat, setDateFormat] = useState('mm/dd/yy');
  const [activeTab, setActiveTab] = useState('data');
  const [useDefaultFile, setUseDefaultFile] = useState(false);
  const [availableLocations, setAvailableLocations] = useState([]);
  const [selectedTestLocations, setSelectedTestLocations] = useState([]);
  const [testLocations, setTestLocations] = useState('');

  const [processedData, setProcessedData] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  // Cache API results to prevent re-running when navigating back
  const [cachedMarketSelection, setCachedMarketSelection] = useState(null);
  
  // Track pre-call loading state to prevent duplicate API calls
  const [isPreCallingMarketSelection, setIsPreCallingMarketSelection] = useState(false);
  const [marketSelectionProgress, setMarketSelectionProgress] = useState(0);

  const canProceed = !!fileData;

  // Navigation functions
  const goToStep = (step) => {
    if (step === 1) {
      setCurrentStep(1);
    } else if (step === 2 && processedData) {
      setCurrentStep(2);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Pre-call market selection when fileData is processed
  useEffect(() => {
    const preCallMarketSelection = async () => {
      if (!fileData || !fileData.rows || fileData.rows.length === 0) {
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
        console.log('[CreateExperiment] Pre-calling market selection after file upload...');
        
        // Simulate progress for better UX (cap at 99% until API completes)
        progressInterval = setInterval(() => {
          setMarketSelectionProgress(prev => {
            if (prev >= 99) return 98; // Cap at 99% until API completes
            return Math.min(prev + Math.random() * 6, 98); // Random increments but never exceed 99%
          });
        }, 3000); // Update every 3 seconds
        
        // Process data locally first
        const headers = (fileData.headers || []).map(h => String(h).trim().toLowerCase());
        const toKey = (s) => String(s || '').trim().toLowerCase();
        const findIdx = (name, fallbacks = []) => {
          const targets = [name, ...fallbacks].map(toKey);
          for (let t of targets) {
            const idx = headers.indexOf(t);
            if (idx !== -1) return idx;
          }
          return -1;
        };

        const locIdx = findIdx(locationColumn, ['city', 'location_id', 'geo', 'market']);
        const yIdx = findIdx(outcomeColumn, ['y', 'outcome', 'app_download', 'revenue', 'sales']);
        const dateIdx = findIdx(dateColumn, ['date', 'time', 'timestamp', 'day']);

        if (locIdx === -1 || yIdx === -1 || dateIdx === -1) {
          console.log('[CreateExperiment] Cannot pre-call market selection: missing required columns');
          return;
        }

                 // Transform data to standard format locally
         const rawRows = fileData.rows.map(row => ({
           location: (row[locIdx] || '').trim().toLowerCase(),
           Y: parseFloat(row[yIdx]) || 0,
           date: (row[dateIdx] || '').trim()
         })).filter(row => row.location && row.date);

         if (rawRows.length === 0) {
           console.log('[CreateExperiment] Cannot pre-call market selection: no valid data rows');
           return;
         }

         // Convert dates to time periods (required by GeoLiftMarketSelection)
         const sortedDates = [...new Set(rawRows.map(row => row.date))].sort();
         const dateToTime = {};
         sortedDates.forEach((date, index) => {
           dateToTime[date] = index + 1;
         });

         const processedRows = rawRows.map(row => ({
           location: row.location,
           Y: row.Y,
           date: row.date,
           time: dateToTime[row.date]
         }));

         console.log('[CreateExperiment] Data transformation:', {
           totalRows: processedRows.length,
           sampleRow: processedRows[0],
           dateMapping: `${sortedDates.length} unique dates mapped to time 1-${sortedDates.length}`
         });

        // Call market selection with default parameters
        const defaultParams = {
          treatmentPeriods: 28,
          effectSize: [0, 0.05, 0.1, 0.15, 0.2, 0.25],
          lookbackWindow: 1,
          cpic: 1,
          alpha: 0.1
        };
        
        const resp = await geoliftAPI.marketSelection(processedRows, defaultParams);
        
        clearInterval(progressInterval);
        
        if (resp.success) {
          // Set to 100% only when API truly completes successfully
          setMarketSelectionProgress(100);
          
          // Cache the default market selection results
          setCachedMarketSelection({
            marketCombos: resp.market_selection || [],
            msError: '',
            timestamp: Date.now(),
            dependencies: {
              treatmentPeriods: defaultParams.treatmentPeriods,
              effectSize: defaultParams.effectSize,
              lookbackWindow: defaultParams.lookbackWindow,
              cpic: defaultParams.cpic,
              alpha: defaultParams.alpha,
              dataLength: processedRows.length
            }
          });
          console.log('[CreateExperiment] Market selection pre-cached successfully');
        } else {
          console.log('[CreateExperiment] Market selection pre-call failed:', resp.error);
        }
      } catch (e) {
        clearInterval(progressInterval);
        console.log('[CreateExperiment] Market selection pre-call error (non-blocking):', e.message);
      } finally {
        setIsPreCallingMarketSelection(false);
        // Reset progress after a delay
        setTimeout(() => setMarketSelectionProgress(0), 2000);
      }
    };

    preCallMarketSelection();
  }, [fileData, locationColumn, outcomeColumn, dateColumn]); // Re-run when file or column mappings change

  const convertToCsvString = (data) => {
    if (!data || !data.rows) return '';
    const headers = (data.headers || []).map(h => String(h).trim().toLowerCase());
    const toKey = (s) => String(s || '').trim().toLowerCase();
    const findIdx = (name, fallbacks = []) => {
      const targets = [name, ...fallbacks].map(toKey);
      for (let t of targets) {
        const idx = headers.indexOf(t);
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const locIdx = findIdx(locationColumn, ['city', 'location_id', 'geo', 'market']);
    const yIdx = findIdx(outcomeColumn, ['y', 'outcome', 'app_download', 'revenue', 'sales']);
    const dateIdx = findIdx(dateColumn, ['date', 'time', 'timestamp', 'day']);

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

  const handleIngestNext = () => {
    if (!fileData) return;
    
    try {
      setUploadError('');
      
      // Process data locally for Create Experiment flow
      const headers = (fileData.headers || []).map(h => String(h).trim().toLowerCase());
      const toKey = (s) => String(s || '').trim().toLowerCase();
      const findIdx = (name, fallbacks = []) => {
        const targets = [name, ...fallbacks].map(toKey);
        for (let t of targets) {
          const idx = headers.indexOf(t);
          if (idx !== -1) return idx;
        }
        return -1;
      };

      const locIdx = findIdx(locationColumn, ['city', 'location_id', 'geo', 'market']);
      const yIdx = findIdx(outcomeColumn, ['y', 'outcome', 'app_download', 'revenue', 'sales']);
      const dateIdx = findIdx(dateColumn, ['date', 'time', 'timestamp', 'day']);

      if (locIdx === -1 || yIdx === -1 || dateIdx === -1) {
        throw new Error('Unable to map required columns. Please check your column mappings.');
      }

      // Transform data to standard format locally
      const rawRows = fileData.rows.map(row => ({
        location: (row[locIdx] || '').trim().toLowerCase(),
        Y: parseFloat(row[yIdx]) || 0,
        date: (row[dateIdx] || '').trim()
      })).filter(row => row.location && row.date);

      if (rawRows.length === 0) {
        throw new Error('No valid data rows found after processing.');
      }

      // Convert dates to time periods (required by GeoLiftMarketSelection)
      const sortedDates = [...new Set(rawRows.map(row => row.date))].sort();
      const dateToTime = {};
      sortedDates.forEach((date, index) => {
        dateToTime[date] = index + 1;
      });

      const processedRows = rawRows.map(row => ({
        location: row.location,
        Y: row.Y,
        date: row.date,
        time: dateToTime[row.date]
      }));

      console.log('[CreateExperiment] Processed data locally:', {
        totalRows: processedRows.length,
        sampleRow: processedRows[0],
        columns: { locationColumn, outcomeColumn, dateColumn },
        dateMapping: `${sortedDates.length} unique dates mapped to time 1-${sortedDates.length}`
      });

      setProcessedData(processedRows);
      setCurrentStep(2);
      
    } catch (e) {
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
            <div className="step-label">Analyze</div>
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
            />

            {uploadError && <div className="upload-error">{uploadError}</div>}
            <div className="step-actions">
              <button
                className={`ingest-next-btn ${canProceed ? '' : 'disabled'}`}
                disabled={!canProceed}
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
              cachedResults={cachedMarketSelection}
              onCacheResults={setCachedMarketSelection}
              isPreCallingMarketSelection={isPreCallingMarketSelection}
              marketSelectionProgress={marketSelectionProgress}
            />
          </>
        )}


      </div>
    </div>
  );
};

export default ExperimentSetup; 