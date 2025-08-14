import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';
import ExperimentSetup from './components/ExperimentSetup';
import DataIngestionForm from './components/DataIngestionForm';
import CausalInference from './components/CausalInference';
import ExperimentDetail from './components/ExperimentDetail';
import MMM from './components/MMM';
import ModelCreation from './components/ModelCreation';
import MMMDetail from './components/MMMDetail';
import Integrations from './components/Integrations';
import IntegrationDetail from './components/IntegrationDetail';
import Blog from './components/Blog';
import FAQs from './components/FAQs';
import './App.css';

function App() {
  const [activeMenuItem, setActiveMenuItem] = useState('experiments');
  const [expandedMenu, setExpandedMenu] = useState('measure');
  const [showExperimentSetup, setShowExperimentSetup] = useState(false);
  const [showDataIngestion, setShowDataIngestion] = useState(false);
  const [showModelCreation, setShowModelCreation] = useState(false);
  const [showExperimentDetail, setShowExperimentDetail] = useState(false);
  const [showMMMDetail, setShowMMMDetail] = useState(false);
  const [showIntegrationDetail, setShowIntegrationDetail] = useState(false);
  const [selectedExperiment, setSelectedExperiment] = useState(null);
  const [selectedModel, setSelectedModel] = useState(null);
  const [selectedIntegration, setSelectedIntegration] = useState(null);

  const handleCreateExperiment = () => {
    setShowExperimentSetup(true);
  };

  const handleAnalyzeExperiment = () => {
    setShowDataIngestion(true);
  };

  const handleExperimentClick = (experiment) => {
    setSelectedExperiment(experiment);
    setShowExperimentDetail(true);
  };

  const handleCreateModel = () => {
    setShowModelCreation(true);
  };

  const handleModelClick = (model) => {
    setSelectedModel(model);
    setShowMMMDetail(true);
  };

  const handleIntegrationClick = (integration) => {
    setSelectedIntegration(integration);
    setShowIntegrationDetail(true);
  };

  const handleBackToMain = () => {
    setShowExperimentSetup(false);
    setShowDataIngestion(false);
    setShowModelCreation(false);
  };

  const handleBackToMMM = () => {
    setShowMMMDetail(false);
    setSelectedModel(null);
  };

  const handleBackToIntegrations = () => {
    setShowIntegrationDetail(false);
    setSelectedIntegration(null);
  };

  const handleBackToExperiments = () => {
    setShowExperimentDetail(false);
    setSelectedExperiment(null);
  };

  // Clear experiment detail when navigating away from experiments
  useEffect(() => {
    if (activeMenuItem !== 'experiments') {
      setShowExperimentDetail(false);
      setSelectedExperiment(null);
    }
  }, [activeMenuItem]);

  // Clear MMM detail when navigating away from MMM
  useEffect(() => {
    if (activeMenuItem !== 'mmm') {
      setShowMMMDetail(false);
      setSelectedModel(null);
    }
  }, [activeMenuItem]);

  // Clear integration detail when navigating away from integrations
  useEffect(() => {
    if (activeMenuItem !== 'integrations') {
      setShowIntegrationDetail(false);
      setSelectedIntegration(null);
    }
  }, [activeMenuItem]);

  const isFullScreen = showExperimentSetup || showDataIngestion || showModelCreation;

  return (
    <div className={`app ${isFullScreen ? 'full-width' : ''}`}>
      <div className={`sidebar-container ${isFullScreen ? 'slide-out' : ''}`}>
        <Sidebar 
          activeMenuItem={activeMenuItem}
          setActiveMenuItem={setActiveMenuItem}
          expandedMenu={expandedMenu}
          setExpandedMenu={setExpandedMenu}
        />
      </div>
      <div className={`main-container ${isFullScreen ? 'expand' : ''}`}>
        {showExperimentSetup ? (
          <ExperimentSetup onBack={handleBackToMain} />
        ) : showDataIngestion ? (
          <DataIngestionForm onBack={handleBackToMain} />
        ) : showModelCreation ? (
          <ModelCreation onBack={handleBackToMain} />
        ) : activeMenuItem === 'causal-inference' ? (
          <CausalInference />
        ) : activeMenuItem === 'integrations' && showIntegrationDetail ? (
          <IntegrationDetail integration={selectedIntegration} onBack={handleBackToIntegrations} />
        ) : activeMenuItem === 'integrations' ? (
          <Integrations onIntegrationClick={handleIntegrationClick} />
        ) : activeMenuItem === 'mmm' && showMMMDetail ? (
          <MMMDetail model={selectedModel} onBack={handleBackToMMM} />
        ) : activeMenuItem === 'mmm' ? (
          <MMM onCreateModel={handleCreateModel} onModelClick={handleModelClick} />
        ) : activeMenuItem === 'experiments' && showExperimentDetail ? (
          <ExperimentDetail experiment={selectedExperiment} onBack={handleBackToExperiments} />
        ) : activeMenuItem === 'blog' ? (
          <Blog onBack={() => setActiveMenuItem('experiments')} />
        ) : activeMenuItem === 'faqs' ? (
          <FAQs onBack={() => setActiveMenuItem('experiments')} />
        ) : (
          <MainContent 
            onCreateExperiment={handleCreateExperiment}
            onAnalyzeExperiment={handleAnalyzeExperiment}
            onExperimentClick={handleExperimentClick}
          />
        )}
      </div>
    </div>
  );
}

export default App; 