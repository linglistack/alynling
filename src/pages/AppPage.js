import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Button from '../components/UI/Button';

// Import your existing app components
import Sidebar from '../components/Sidebar';
import MainContent from '../components/MainContent';
import ExperimentSetup from '../components/ExperimentSetup';
import DataIngestionForm from '../components/DataIngestionForm';
import CausalInference from '../components/CausalInference';
import ExperimentDetail from '../components/ExperimentDetail';
import MMM from '../components/MMM';
import ModelCreation from '../components/ModelCreation';
import MMMDetail from '../components/MMMDetail';
import Integrations from '../components/Integrations';
import IntegrationDetail from '../components/IntegrationDetail';
import Blog from '../components/Blog';
import FAQs from '../components/FAQs';
import ChatBot from '../components/ChatBot';
import '../App.css';

const AppPage = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  // Check if we're in waitlist mode
  const isWaitlistMode = process.env.REACT_APP_WAITLIST_MODE === 'true';
  
  // Your existing app state
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
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [experimentRefreshTrigger, setExperimentRefreshTrigger] = useState(0);

  // Redirect to landing page if not authenticated (but skip this in waitlist mode for /alynling access)
  useEffect(() => {
    if (!isAuthenticated && !isWaitlistMode) {
      navigate('/');
    }
  }, [isAuthenticated, navigate, isWaitlistMode]);

  // Your existing handlers
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

  const handleExperimentCreated = (experiment) => {
    console.log('[AppPage] Experiment created, refreshing list:', experiment);
    // Trigger refresh of experiments list
    setExperimentRefreshTrigger(prev => prev + 1);
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

  const handleChatToggle = (isOpen) => {
    setIsChatOpen(isOpen);
  };

  const handleLogout = async () => {
    if (isWaitlistMode) {
      // In waitlist mode, just navigate to the waitlist page
      navigate('/');
    } else {
      // Normal mode - perform actual logout
      await logout();
      navigate('/');
    }
  };

  const toggleUserMenu = () => {
    setShowUserMenu(!showUserMenu);
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

  // Auto-close chat when navigating
  useEffect(() => {
    setIsChatOpen(false);
  }, [activeMenuItem, expandedMenu, showExperimentSetup, showDataIngestion, showModelCreation, showMMMDetail, showIntegrationDetail, showExperimentDetail]);

  const isFullScreen = showExperimentSetup || showDataIngestion || showModelCreation;

  if (!isAuthenticated && !isWaitlistMode) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '1.125rem',
        color: '#6b7280'
      }}>
        Loading...
      </div>
    );
  }

  return (
    <div className={`app ${isFullScreen ? 'full-width' : ''}`}>
      {/* User Menu Overlay */}
      {showUserMenu && (
        <div 
          className="user-menu-overlay" 
          onClick={() => setShowUserMenu(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.1)'
          }}
        />
      )}
      
      {/* User Menu */}
      <div 
        className="user-menu"
        style={{
          position: 'fixed',
          top: '1rem',
          right: '1rem',
          zIndex: 1001,
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '1rem',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
          minWidth: '200px',
          display: showUserMenu ? 'block' : 'none'
        }}
      >
        <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ fontWeight: '600', color: '#111827' }}>
            {user?.name || (isWaitlistMode ? 'Guest User' : 'Unknown User')}
          </div>
          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            {user?.email || (isWaitlistMode ? 'Direct Access' : 'No email')}
          </div>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Button
            variant="ghost"
            size="small"
            fullWidth
            onClick={() => {
              setShowUserMenu(false);
              // You could add profile management here
            }}
          >
            Profile Settings
          </Button>
          
          <Button
            variant="ghost"
            size="small"
            fullWidth
            onClick={handleLogout}
          >
            Sign Out
          </Button>
        </div>
      </div>

      {/* User Menu Toggle Button */}
      <button
        onClick={toggleUserMenu}
        style={{
          position: 'fixed',
          top: '1rem',
          right: '1rem',
          zIndex: 999,
          background: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          fontWeight: '600',
          fontSize: '0.875rem'
        }}
      >
        {user?.name?.charAt(0)?.toUpperCase() || (isWaitlistMode ? 'G' : 'U')}
      </button>

      <div className={`sidebar-container ${isFullScreen || isChatOpen ? 'slide-out' : ''} ${isChatOpen ? 'chat-open' : ''}`}>
        <Sidebar 
          activeMenuItem={activeMenuItem}
          setActiveMenuItem={setActiveMenuItem}
          expandedMenu={expandedMenu}
          setExpandedMenu={setExpandedMenu}
        />
      </div>
      
      <div className={`main-container ${isFullScreen ? 'expand' : ''} ${isChatOpen ? 'chat-open' : ''}`}>
        {showExperimentSetup ? (
          <ExperimentSetup 
            onBack={handleBackToMain} 
            onExperimentCreated={handleExperimentCreated}
          />
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
            refreshTrigger={experimentRefreshTrigger}
          />
        )}
      </div>
      
      {/* ChatBot component - global display */}
      <ChatBot onChatToggle={handleChatToggle} />
    </div>
  );
};

export default AppPage;
