import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Hero from '../components/Landing/Hero';
import Features from '../components/Landing/Features';
import Pricing from '../components/Landing/Pricing';
import LoginForm from '../components/Auth/LoginForm';
import SignupForm from '../components/Auth/SignupForm';
import Button from '../components/UI/Button';
import './LandingPage.style.css';

const LandingPage = () => {
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // If user is already authenticated, redirect to app
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/app');
    }
  }, [isAuthenticated, navigate]);

  const handleGetStarted = () => {
    setAuthMode('signup');
    setShowAuth(true);
  };

  const handleSignIn = () => {
    setAuthMode('login');
    setShowAuth(true);
  };

  const handleLearnMore = () => {
    // Scroll to features section
    document.getElementById('features')?.scrollIntoView({ 
      behavior: 'smooth' 
    });
  };

  const handleSelectPlan = (planId, billingCycle) => {
    // For now, just trigger signup
    // In a real app, you'd pass plan info to the signup process
    console.log('Selected plan:', planId, billingCycle);
    handleGetStarted();
  };

  const handleAuthSuccess = (user) => {
    console.log('Auth success:', user);
    setShowAuth(false);
    navigate('/app');
  };

  const handleCloseAuth = () => {
    setShowAuth(false);
  };

  const switchAuthMode = () => {
    setAuthMode(authMode === 'login' ? 'signup' : 'login');
  };

  return (
    <div className="landing-page">
      {/* Header */}
      <header className="landing-page__header">
        <div className="landing-page__header-container">
          <div className="landing-page__logo">
            <span className="landing-page__logo-icon">🧪</span>
            <span className="landing-page__logo-text">Alyn</span>
          </div>
          
          <nav className="landing-page__nav">
            <a href="#features" className="landing-page__nav-link">Features</a>
            <a href="#pricing" className="landing-page__nav-link">Pricing</a>
          </nav>
          
          <div className="landing-page__header-actions">
            <Button
              variant="ghost"
              onClick={handleSignIn}
            >
              Sign In
            </Button>
            <Button
              variant="primary"
              onClick={handleGetStarted}
            >
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="landing-page__main">
        <Hero 
          onGetStarted={handleGetStarted}
          onLearnMore={handleLearnMore}
        />
        
        <div id="features">
          <Features onGetStarted={handleGetStarted} />
        </div>
        
        <div id="pricing">
          <Pricing onSelectPlan={handleSelectPlan} />
        </div>
      </main>

      {/* Footer */}
      <footer className="landing-page__footer">
        <div className="landing-page__footer-container">
          <div className="landing-page__footer-main">
            <div className="landing-page__footer-brand">
              <div className="landing-page__footer-logo">
                <span className="landing-page__footer-logo-icon">🧪</span>
                <span className="landing-page__footer-logo-text">Alyn</span>
              </div>
              <p className="landing-page__footer-description">
                The complete platform for advanced experimentation and causal inference.
              </p>
            </div>
            
            <div className="landing-page__footer-links">
              <div className="landing-page__footer-section">
                <h4>Product</h4>
                <ul>
                  <li><a href="#features">Features</a></li>
                  <li><a href="#pricing">Pricing</a></li>
                
                </ul>
              </div>
              
            
              
             
            </div>
          </div>
          
          <div className="landing-page__footer-bottom">
            <p>&copy; 2025 Alyn. All rights reserved.</p>
            <div className="landing-page__footer-legal">
              <a href="#privacy">Privacy Policy</a>
              <a href="#terms">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      {showAuth && (
        <div className="landing-page__auth-overlay">
          <div className="landing-page__auth-modal">
            <button
              className="landing-page__auth-close"
              onClick={handleCloseAuth}
              aria-label="Close"
            >
              ×
            </button>
            
            {authMode === 'login' ? (
              <LoginForm
                onSuccess={handleAuthSuccess}
                onSwitchToSignup={switchAuthMode}
              />
            ) : (
              <SignupForm
                onSuccess={handleAuthSuccess}
                onSwitchToLogin={switchAuthMode}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
