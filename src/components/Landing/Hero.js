import React from 'react';
import Button from '../UI/Button';
import './Hero.style.css';

const Hero = ({ onGetStarted, onLearnMore }) => {
  const stats = [
    { number: '10K+', label: 'Experiments Run' },
    { number: '500+', label: 'Data Scientists' },
    { number: '99.9%', label: 'Uptime' }
  ];

  return (
    <section className="hero">
      <div className="hero__container">
        <div className="hero__content">
          <div className="hero__badge">
            🚀 New: Advanced Causal Inference Engine
          </div>
          
          <h1 className="hero__title">
            Run Smarter Experiments with 
            <span className="hero__title-highlight"> Alyn</span>
          </h1>
          
          <p className="hero__subtitle">
            The complete platform for designing, running, and analyzing experiments. 
            From geo-lift tests to mixed media modeling, get actionable insights faster 
            with our advanced analytics engine.
          </p>
          
          <div className="hero__actions">
            <Button
              variant="primary"
              size="large"
              onClick={onGetStarted}
            >
              Get Started Free
            </Button>
            
            <Button
              variant="outline"
              size="large"
              onClick={onLearnMore}
            >
              Watch Demo
            </Button>
          </div>
          
          <div className="hero__stats">
            {stats.map((stat, index) => (
              <div key={index} className="hero__stat">
                <div className="hero__stat-number">{stat.number}</div>
                <div className="hero__stat-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="hero__visual">
          <div className="hero__image-container">
            <div className="hero__image-placeholder">
              <div className="hero__dashboard-mockup">
                <div className="hero__mockup-header">
                  <div className="hero__mockup-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <div className="hero__mockup-title">Alyn Experiments</div>
                </div>
                <div className="hero__mockup-content">
                  <div className="hero__mockup-sidebar">
                    <div className="hero__mockup-menu-item active">📊 Experiments</div>
                    <div className="hero__mockup-menu-item">🔬 Causal Inference</div>
                    <div className="hero__mockup-menu-item">📈 MMM</div>
                    <div className="hero__mockup-menu-item">🔗 Integrations</div>
                  </div>
                  <div className="hero__mockup-main">
                    <div className="hero__mockup-chart">
                      <div className="hero__mockup-chart-bars">
                        <div className="hero__mockup-bar" style={{height: '60%'}}></div>
                        <div className="hero__mockup-bar" style={{height: '80%'}}></div>
                        <div className="hero__mockup-bar" style={{height: '45%'}}></div>
                        <div className="hero__mockup-bar" style={{height: '70%'}}></div>
                        <div className="hero__mockup-bar" style={{height: '90%'}}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
