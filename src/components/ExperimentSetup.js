import React, { useState } from 'react';
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

  const canProceed = !!fileData && !isUploading;

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

  const handleIngestNext = async () => {
    if (!fileData) return;
    try {
      setIsUploading(true);
      setUploadError('');
      const csv = convertToCsvString(fileData);
      const uploadResult = await geoliftAPI.uploadData(csv, {
        locationCol: 'location',
        timeCol: 'date',
        outcomeCol: 'Y'
      });
      if (!uploadResult.success) {
        throw new Error('Failed to upload data');
      }
      setProcessedData(uploadResult.data);
      setCurrentStep(2);
    } catch (e) {
      setUploadError(e.message || 'Upload failed');
    } finally {
      setIsUploading(false);
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
          <div className={`step ${currentStep >= 1 ? 'active' : ''}`}>
            <div className="step-circle">1</div>
            <div className="step-label">Ingest data</div>
          </div>
          <div className={`step-connector ${currentStep >= 2 ? 'active' : ''}`}></div>
          <div className={`step ${currentStep >= 2 ? 'active' : ''}`}>
            <div className="step-circle">2</div>
            <div className="step-label">Configure</div>
          </div>
          <div className={`step-connector ${currentStep >= 3 ? 'active' : ''}`}></div>
          <div className={`step ${currentStep >= 3 ? 'active' : ''}`}>
            <div className="step-circle">3</div>
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
                {isUploading ? 'Processing…' : 'Ingest Data'}
              </button>
            </div>
          </>
        )}

        {currentStep === 2 && (
          <ConfigureExperiment processedData={processedData} onProceed={() => setCurrentStep(3)} />
        )}

        {currentStep === 3 && (
          <div className="configure-step">
            <div className="configure-header">Step 3: Analyze</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExperimentSetup; 