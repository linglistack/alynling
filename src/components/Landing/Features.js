import React from 'react';
import Button from '../UI/Button';
import './Features.style.css';

const Features = ({ onGetStarted }) => {
  const features = [
    {
      icon: '📊',
      title: 'Experiment Design',
      description: 'Design robust experiments with our intuitive interface and statistical guidance.',
      features: ['A/B Testing', 'Geo-lift Analysis', 'Power Analysis', 'Sample Size Calculator']
    },
    {
      icon: '🔬',
      title: 'Causal Inference',
      description: 'Advanced causal inference methods to understand true impact and attribution.',
      features: ['Difference-in-Differences', 'Synthetic Controls', 'Instrumental Variables', 'Propensity Score Matching']
    },
    {
      icon: '📈',
      title: 'Mixed Media Modeling',
      description: 'Understand the contribution of each marketing channel to your overall performance.',
      features: ['Attribution Modeling', 'Media Mix Optimization', 'Adstock Modeling', 'Saturation Curves']
    },
  ];

  return (
    <section className="features">
      <div className="features__container">
        <div className="features__header">
          <div className="features__badge">
            ✨ Powerful Features
          </div>
          <h2 className="features__title">
            Everything you need for advanced experimentation
          </h2>
          <p className="features__subtitle">
            From experiment design to causal inference, our platform provides all the tools 
            you need to run sophisticated experiments and get actionable insights.
          </p>
        </div>

        <div className="features__grid">
          {features.map((feature, index) => (
            <div key={index} className="features__card">
              <div className="features__icon">
                {feature.icon}
              </div>
              <h3 className="features__card-title">
                {feature.title}
              </h3>
              <p className="features__card-description">
                {feature.description}
              </p>
              <ul className="features__card-list">
                {feature.features.map((item, itemIndex) => (
                  <li key={itemIndex} className="features__card-list-item">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="features__highlight">
          <div className="features__highlight-content">
            <h3>Ready to transform your experimentation process?</h3>
            <p>
              Join thousands of data scientists and analysts who trust Alyn for their 
              most important experiments. Get started with our free tier today.
            </p>
            <Button
              variant="primary"
              size="large"
              onClick={onGetStarted}
            >
              Start Free Trial
            </Button>
          </div>
          <div className="features__highlight-image">
            <div className="features__highlight-mockup">
              <div className="features__highlight-header">
                <div className="features__highlight-title">Experiment Results</div>
              </div>
              <div className="features__highlight-content-area">
                <div className="features__highlight-metric">
                  <div className="features__highlight-metric-label">Lift</div>
                  <div className="features__highlight-metric-value">+12.3%</div>
                </div>
                <div className="features__highlight-metric">
                  <div className="features__highlight-metric-label">P-value</div>
                  <div className="features__highlight-metric-value">0.003</div>
                </div>
                <div className="features__highlight-metric">
                  <div className="features__highlight-metric-label">Confidence</div>
                  <div className="features__highlight-metric-value">95%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;
