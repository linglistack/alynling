import React, { useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp, Search } from 'lucide-react';
import './FAQs.css';

const FAQs = ({ onBack }) => {
  const [expandedFAQ, setExpandedFAQ] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const faqs = [
    {
      id: 1,
      question: 'What is GeoLift and how does it work?',
      answer: 'GeoLift is a methodology for conducting geographic experiments in marketing. It works by dividing markets into treatment and control groups based on geographic boundaries, allowing marketers to measure the causal impact of their campaigns without cross-contamination between groups. The method uses synthetic control techniques to create optimal control groups that mimic the behavior of treated regions before treatment.',
      category: 'GeoLift',
      tags: ['geolift', 'experiments', 'methodology']
    },
    {
      id: 2,
      question: 'How do I know if my business is ready for incrementality testing?',
      answer: 'Your business is ready for incrementality testing when you have: a monthly marketing budget of $100K+, sufficient data volume for statistical significance, stable business operations, and pressure to prove marketing effectiveness. It\'s also important to have clean, consistent data and the ability to run controlled experiments.',
      category: 'Getting Started',
      tags: ['incrementality', 'testing', 'readiness', 'budget']
    },
    {
      id: 3,
      question: 'What\'s the difference between correlation and causation in marketing analytics?',
      answer: 'Correlation means two variables move together, while causation means one variable directly causes changes in another. Traditional marketing analytics often rely on correlation (e.g., "sales increased when we spent more on ads"), but this doesn\'t prove the ads caused the sales increase. Causal inference methods like GeoLift and A/B testing can establish true cause-and-effect relationships.',
      category: 'Analytics',
      tags: ['correlation', 'causation', 'analytics', 'inference']
    },
    {
      id: 4,
      question: 'How long should I run a geographic experiment?',
      answer: 'Geographic experiments should typically run for at least 2-4 weeks to capture weekly patterns and seasonal effects. Longer experiments (8-12 weeks) provide more robust results and better statistical power. The exact duration depends on your business cycle, seasonality, and the effect size you\'re trying to detect.',
      category: 'Experiments',
      tags: ['duration', 'timing', 'experiments', 'statistical power']
    },
    {
      id: 5,
      question: 'What data do I need for Marketing Mix Modeling (MMM)?',
      answer: 'For effective MMM, you need: historical sales data (2-3 years minimum), marketing spend by channel and time period, external factors (GDP, weather, competition), and market-level data. The data should be clean, consistent, and at the same frequency (daily, weekly, or monthly).',
      category: 'MMM',
      tags: ['mmm', 'data requirements', 'marketing mix', 'modeling']
    },
    {
      id: 6,
      question: 'How do I interpret the results of an incrementality test?',
      answer: 'Incrementality test results should be interpreted by looking at: the lift percentage (how much the treatment group outperformed the control), statistical significance (p-value < 0.05), confidence intervals, and practical significance (is the lift meaningful for your business?). Always consider the context and external factors that might affect results.',
      category: 'Results',
      tags: ['results', 'interpretation', 'lift', 'significance']
    },
    {
      id: 7,
      question: 'Can I run multiple experiments simultaneously?',
      answer: 'Yes, you can run multiple experiments simultaneously, but it requires careful planning. Ensure experiments don\'t overlap geographically or target the same audience. Use different treatment periods or test different variables. Monitor for potential interactions between experiments and adjust sample sizes accordingly.',
      category: 'Experiments',
      tags: ['multiple experiments', 'planning', 'overlap', 'interactions']
    },
    {
      id: 8,
      question: 'What\'s the best way to select control markets for a geo experiment?',
      answer: 'Control markets should be selected based on: similarity to treatment markets in pre-treatment behavior, demographic characteristics, market size, and business relevance. Use market selection algorithms that optimize for similarity while maintaining statistical power. Avoid markets that might be affected by the treatment or have unusual patterns.',
      category: 'Market Selection',
      tags: ['control markets', 'selection', 'similarity', 'algorithms']
    }
  ];

  const filteredFAQs = faqs.filter(faq => 
    faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faq.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faq.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const toggleFAQ = (id) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  return (
    <div className="faqs-page">
      <div className="faqs-header">
        <button className="back-button" onClick={onBack}>
          <ArrowLeft size={20} />
          Back
        </button>
        <h1 className="faqs-title">Frequently Asked Questions</h1>
        <p className="faqs-subtitle">Find answers to common questions about incrementality testing and causal inference</p>
      </div>

      <div className="faqs-content">
        <div className="search-section">
          <div className="search-container">
            <Search size={20} className="search-icon" />
            <input
              type="text"
              placeholder="Search FAQs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="search-results">
            {searchTerm && (
              <p className="results-count">
                {filteredFAQs.length} result{filteredFAQs.length !== 1 ? 's' : ''} found
              </p>
            )}
          </div>
        </div>

        <div className="faqs-list">
          {filteredFAQs.map((faq) => (
            <div key={faq.id} className="faq-item">
              <div 
                className="faq-question"
                onClick={() => toggleFAQ(faq.id)}
              >
                <div className="faq-header">
                  <span className="faq-category">{faq.category}</span>
                  <h3 className="faq-question-text">{faq.question}</h3>
                </div>
                <div className="faq-toggle">
                  {expandedFAQ === faq.id ? (
                    <ChevronUp size={20} />
                  ) : (
                    <ChevronDown size={20} />
                  )}
                </div>
              </div>
              
              {expandedFAQ === faq.id && (
                <div className="faq-answer">
                  <p>{faq.answer}</p>
                  <div className="faq-tags">
                    {faq.tags.map((tag, index) => (
                      <span key={index} className="faq-tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredFAQs.length === 0 && searchTerm && (
          <div className="no-results">
            <p>No FAQs found matching "{searchTerm}". Try different keywords or browse all questions.</p>
            <button 
              className="clear-search-btn"
              onClick={() => setSearchTerm('')}
            >
              Clear Search
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FAQs;
