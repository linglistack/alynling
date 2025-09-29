/**
 * 📝 SIMPLE WAITLIST PAGE
 * 
 * MICRO-FEATURE: Waitlist version of landing page
 * - Same content as LandingPage but with waitlist form instead of auth
 * - Uses existing Landing components (Hero, Features, Pricing)
 * - Waitlist form replaces the "Get Started" functionality
 */

import React, { useState } from 'react';
import SimpleWaitlistForm from '../components/SimpleWaitlistForm.js';
import Features from '../components/Landing/Features.js';
import Pricing from '../components/Landing/Pricing.js';
import Button from '../components/UI/Button.js';
import platformPreview from '../assets/platform.png'
import './SimpleWaitlistPage.style.css';

const SimpleWaitlistPage = () => {
  const [showWaitlistForm, setShowWaitlistForm] = useState(false);
  const [successData, setSuccessData] = useState(null);

  const handleJoinWaitlist = () => {
    setShowWaitlistForm(true);
  };

  const handleWaitlistSuccess = (data) => {
    setSuccessData(data);
    setShowWaitlistForm(false);
  };

  const handleCloseWaitlist = () => {
    setShowWaitlistForm(false);
  };

  const handleLearnMore = () => {
    // Scroll to features section
    document.getElementById('features')?.scrollIntoView({ 
      behavior: 'smooth' 
    });
  };

  const handleSelectPlan = () => {
    // In waitlist mode, selecting a plan opens the waitlist form
    handleJoinWaitlist();
  };


  return (
    <div className="simple-waitlist-page">
      {/* Header - same as LandingPage but with waitlist CTA */}
      <header className="simple-waitlist-page__header">
        <div className="simple-waitlist-page__header-container">
          <div className="simple-waitlist-page__logo">
            <span className="simple-waitlist-page__logo-text">Alyn</span>
          </div>
          
         
          
          <div className="simple-waitlist-page__header-actions">
          <nav className="simple-waitlist-page__nav">
            {/* <a href="#features" className="simple-waitlist-page__nav-link">Features</a> */}
            {/* <a href="#pricing" className="simple-waitlist-page__nav-link">Pricing</a> */}
          </nav>
            <Button
              variant="primary"
              onClick={handleJoinWaitlist}
            >
              Join Waitlist
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="simple-waitlist-page__main">

        {/* Waitlist Hero Section - replaces the normal Hero */}
        <section className="simple-waitlist-page__hero">
          <div className="simple-waitlist-page__hero-container">
            <div className="simple-waitlist-page__hero-content">
              <div className="simple-waitlist-page__hero-badge">
                🚀 Coming Soon
              </div>
              
              <h1 className="simple-waitlist-page__hero-title">
                The Complete Platform for<br />
                <span className="simple-waitlist-page__hero-highlight">Advanced Experimentation</span>
              </h1>
              
              <p className="simple-waitlist-page__hero-subtitle">
                Join the waitlist to be the first to experience our revolutionary platform for causal inference and experimentation. Get early access and exclusive benefits.
              </p>
              
              <div className="simple-waitlist-page__hero-actions">
                <Button
                  variant="primary"
                  size="large"
                  onClick={handleJoinWaitlist}
                >
                  Join Waitlist
                </Button>
              </div>
              
              <div className="simple-waitlist-page__hero-stats">
                <div className="simple-waitlist-page__hero-stat">
                  <span className="simple-waitlist-page__hero-stat-number">50%</span>
                  <span className="simple-waitlist-page__hero-stat-label">Ads Optimization</span>
                </div>
                <div className="simple-waitlist-page__hero-stat">
                  <span className="simple-waitlist-page__hero-stat-number">Q4 2025</span>
                  <span className="simple-waitlist-page__hero-stat-label">Expected launch</span>
                </div>
                <div className="simple-waitlist-page__hero-stat">
                  <span className="simple-waitlist-page__hero-stat-number">Early Access</span>
                  <span className="simple-waitlist-page__hero-stat-label">Exclusive benefits</span>
                </div>
              </div>
            </div>
            
            <div className="simple-waitlist-page__hero-image">
              <div className="simple-waitlist-page__hero-image-placeholder">
                <div className="simple-waitlist-page__hero-image-content">
                <img src={platformPreview} alt='platform' />
                </div>
              </div>
            </div>
          </div>
        </section>
        {/* Interactive Figma Section */}
        <section className="simple-waitlist-page__figma-section">
          <div className="simple-waitlist-page__figma-container">
          <div className="features__badge">
            Demo Platform
          </div>
            <h2 className="simple-waitlist-page__figma-title">
            Click and interact with our platform demo
            </h2>
            {/* <p className="simple-waitlist-page__figma-subtitle">
              Click and interact with our platform demo
            </p> */}
            <div className="simple-waitlist-page__figma-iframe">
              <iframe
                className="simple-waitlist-page__figma-iframe-content"
                src="https://red-goal-35465634.figma.site/"
                allowFullScreen
                allow="fullscreen; clipboard-write; clipboard-read; autoplay; camera; microphone; geolocation"
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-top-navigation allow-modals allow-downloads"
                title="Interactive Platform Design"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </section>
        {/* Use existing Features component */}
        <div id="features">
          <Features onGetStarted={handleJoinWaitlist} />
        </div>
        
        {/* Use existing Pricing component */}
        {/* <div id="pricing">
          <Pricing onSelectPlan={handleSelectPlan} />
        </div> */}
      </main>

      {/* Footer - same as LandingPage */}
      <footer className="simple-waitlist-page__footer">
        <div className="simple-waitlist-page__footer-container">
          <div className="simple-waitlist-page__footer-main">
            <div className="simple-waitlist-page__footer-brand">
              <div className="simple-waitlist-page__footer-logo">
                <span className="simple-waitlist-page__footer-logo-text">Alyn</span>
              </div>
              <p className="simple-waitlist-page__footer-description">
                The complete platform for advanced experimentation and causal inference.
              </p>
            </div>
            
            <div className="simple-waitlist-page__footer-links">
              {/* <div className="simple-waitlist-page__footer-section">
                <h4>Product</h4>
                <ul>
                  <li><a href="#features">Features</a></li>
                  <li><a href="#pricing">Pricing</a></li>
                  
                </ul>
              </div> */}
              
              
              
            
            </div>
          </div>
          
          <div className="simple-waitlist-page__footer-bottom">
            <p>&copy; 2025 Alyn. All rights reserved.</p>
            {/* <div className="simple-waitlist-page__footer-legal">
              <a href="#privacy">Privacy Policy</a>
              <a href="#terms">Terms of Service</a>
            </div> */}
          </div>
        </div>
      </footer>

      {/* Waitlist Modal */}
      {showWaitlistForm && (
        <div className="simple-waitlist-page__modal-overlay">
          <div className="simple-waitlist-page__modal">
            <button
              className="simple-waitlist-page__modal-close"
              onClick={handleCloseWaitlist}
              aria-label="Close"
            >
              ×
            </button>
            
            <SimpleWaitlistForm onSuccess={handleWaitlistSuccess} />
          </div>
        </div>
      )}

      {/* Success Message */}
      {successData && (
        <div className="simple-waitlist-page__success-overlay">
          <div className="simple-waitlist-page__success-modal">
            <div className="simple-waitlist-page__success-content">
              <div className="simple-waitlist-page__success-icon">🎉</div>
              <h3>Welcome to the waitlist!</h3>
              <p>Thank you for joining. We'll notify you when we launch.</p>
              <Button
                variant="primary"
                onClick={() => setSuccessData(null)}
              >
                Continue Exploring
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleWaitlistPage;
