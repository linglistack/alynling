import React, { useState } from 'react';
import Button from '../UI/Button';
import './Pricing.style.css';

const Pricing = ({ onSelectPlan }) => {
  const [billingCycle, setBillingCycle] = useState('monthly');

  const plans = [
    {
      id: 'free',
      name: 'Free',
      description: 'Perfect for getting started',
      price: { monthly: 0, yearly: 0 },
      features: [
        'Up to 3 experiments',
        'Basic analytics',
        'Community support',
        'Standard integrations',
        '1GB data storage'
      ],
      limitations: [
        'Limited to 1,000 data points',
        'Basic visualizations only'
      ],
      popular: false,
      cta: 'Get Started Free'
    },
    {
      id: 'professional',
      name: 'Professional',
      description: 'For growing teams and advanced analysis',
      price: { monthly: 49, yearly: 490 },
      features: [
        'Unlimited experiments',
        'Advanced causal inference',
        'Mixed media modeling',
        'Priority support',
        'All integrations',
        '100GB data storage',
        'Custom dashboards',
        'API access'
      ],
      limitations: [],
      popular: true,
      cta: 'Start Free Trial'
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      description: 'For large organizations with custom needs',
      price: { monthly: 199, yearly: 1990 },
      features: [
        'Everything in Professional',
        'Dedicated account manager',
        'Custom integrations',
        'On-premise deployment',
        'Advanced security',
        'Unlimited data storage',
        'White-label options',
        'SLA guarantees'
      ],
      limitations: [],
      popular: false,
      cta: 'Contact Sales'
    }
  ];

  const getPrice = (plan) => {
    return plan.price[billingCycle];
  };

  const getPeriod = () => {
    return billingCycle === 'monthly' ? 'month' : 'year';
  };

  const getSavings = (plan) => {
    if (billingCycle === 'yearly' && plan.price.monthly > 0) {
      const monthlyCost = plan.price.monthly * 12;
      const yearlyCost = plan.price.yearly;
      const savings = Math.round(((monthlyCost - yearlyCost) / monthlyCost) * 100);
      return savings;
    }
    return 0;
  };

  return (
    <section className="pricing">
      <div className="pricing__container">
        <div className="pricing__header">
          <div className="pricing__badge">
            💰 Simple Pricing
          </div>
          <h2 className="pricing__title">
            Choose the plan that's right for you
          </h2>
          <p className="pricing__subtitle">
            Start free and scale as you grow. All plans include our core features 
            with no hidden fees or usage limits.
          </p>
        </div>

        <div className="pricing__toggle">
          <div className="pricing__toggle-container">
            <button
              className={`pricing__toggle-option ${billingCycle === 'monthly' ? 'pricing__toggle-option--active' : ''}`}
              onClick={() => setBillingCycle('monthly')}
            >
              Monthly
            </button>
            <button
              className={`pricing__toggle-option ${billingCycle === 'yearly' ? 'pricing__toggle-option--active' : ''}`}
              onClick={() => setBillingCycle('yearly')}
            >
              Yearly
              <span className="pricing__save-badge">Save 20%</span>
            </button>
          </div>
        </div>

        <div className="pricing__grid">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`pricing__card ${plan.popular ? 'pricing__card--popular' : ''}`}
            >
              {plan.popular && (
                <div className="pricing__popular-badge">
                  Most Popular
                </div>
              )}
              
              <div className="pricing__plan-header">
                <h3 className="pricing__plan-name">{plan.name}</h3>
                <p className="pricing__plan-description">{plan.description}</p>
              </div>

              <div className="pricing__price">
                <div className="pricing__price-amount">
                  ${getPrice(plan)}
                  {getSavings(plan) > 0 && (
                    <span className="pricing__savings">
                      Save {getSavings(plan)}%
                    </span>
                  )}
                </div>
                <div className="pricing__price-period">
                  per {getPeriod()}
                </div>
                {billingCycle === 'yearly' && plan.price.monthly > 0 && (
                  <div className="pricing__price-note">
                    ${Math.round(plan.price.yearly / 12)} per month, billed annually
                  </div>
                )}
              </div>

              <div className="pricing__features">
                <h4>What's included:</h4>
                <ul>
                  {plan.features.map((feature, index) => (
                    <li key={index} className="pricing__feature">
                      <span className="pricing__feature-icon">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                
                {plan.limitations.length > 0 && (
                  <div className="pricing__limitations">
                    <h5>Limitations:</h5>
                    <ul>
                      {plan.limitations.map((limitation, index) => (
                        <li key={index} className="pricing__feature pricing__feature--unavailable">
                          <span className="pricing__feature-icon">!</span>
                          {limitation}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="pricing__cta">
                <Button
                  variant={plan.popular ? 'primary' : 'outline'}
                  size="large"
                  fullWidth
                  onClick={() => onSelectPlan && onSelectPlan(plan.id, billingCycle)}
                >
                  {plan.cta}
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="pricing__faq">
          <h3>Frequently Asked Questions</h3>
          <div className="pricing__faq-grid">
           
            <div className="pricing__faq-item">
              <h4>Is there a free trial?</h4>
              <p>Yes, all paid plans come with a 14-day free trial. No credit card required to start.</p>
            </div>
            <div className="pricing__faq-item">
              <h4>What payment methods do you accept?</h4>
              <p>We accept all major credit cards, PayPal, and bank transfers for enterprise plans.</p>
            </div>
            <div className="pricing__faq-item">
              <h4>Do you offer custom enterprise solutions?</h4>
              <p>Yes, we offer custom pricing and features for large organizations. Contact our sales team.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
