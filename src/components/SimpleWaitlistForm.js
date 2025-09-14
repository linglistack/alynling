/**
 * 📝 SIMPLE WAITLIST FORM
 * 
 * MICRO-FEATURE: Simple waitlist subscription form
 * - No authentication required
 * - Stores email and basic info to MongoDB
 * - Clean, minimal design
 * - Success/error handling
 */

import React, { useState } from 'react';
import './SimpleWaitlistForm.style.css';

const SimpleWaitlistForm = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    company: '',
    role: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Use the correct API base URL (port 8080)
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';
      const response = await fetch(`${API_BASE_URL}/api/node/simple-waitlist/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email.toLowerCase().trim(),
          name: formData.name.trim(),
          company: formData.company.trim(),
          role: formData.role.trim(),
          submittedAt: new Date().toISOString()
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitted(true);
        if (onSuccess) {
          onSuccess(data);
        }
      } else {
        setErrors({ general: data.error || 'Something went wrong. Please try again.' });
      }
    } catch (error) {
      console.error('Waitlist submission error:', error);
      setErrors({ general: 'Network error. Please check your connection and try again.' });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="simple-waitlist-form">
        <div className="simple-waitlist-form__success">
          <div className="simple-waitlist-form__success-icon">✅</div>
          <h3>You're on the list!</h3>
          <p>Thank you for joining our waitlist. We'll notify you when we launch.</p>
          <div className="simple-waitlist-form__success-details">
            <p><strong>Email:</strong> {formData.email}</p>
            {formData.name && <p><strong>Name:</strong> {formData.name}</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="simple-waitlist-form">
      <div className="simple-waitlist-form__header">
        <h2>Join Our Waitlist</h2>
        <p>Be the first to know when we launch. No spam, just updates.</p>
      </div>

      <form onSubmit={handleSubmit} className="simple-waitlist-form__form">
        {errors.general && (
          <div className="simple-waitlist-form__error">
            <span className="simple-waitlist-form__error-icon">⚠️</span>
            {errors.general}
          </div>
        )}

        <div className="simple-waitlist-form__field">
          <label htmlFor="email" className="simple-waitlist-form__label">
            Email Address *
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="your@email.com"
            className={`simple-waitlist-form__input ${errors.email ? 'simple-waitlist-form__input--error' : ''}`}
            disabled={loading}
            required
          />
          {errors.email && (
            <span className="simple-waitlist-form__field-error">{errors.email}</span>
          )}
        </div>

        <div className="simple-waitlist-form__field">
          <label htmlFor="name" className="simple-waitlist-form__label">
            Full Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="John Doe"
            className={`simple-waitlist-form__input ${errors.name ? 'simple-waitlist-form__input--error' : ''}`}
            disabled={loading}
            required
          />
          {errors.name && (
            <span className="simple-waitlist-form__field-error">{errors.name}</span>
          )}
        </div>

        <div className="simple-waitlist-form__field">
          <label htmlFor="company" className="simple-waitlist-form__label">
            Company
          </label>
          <input
            type="text"
            id="company"
            name="company"
            value={formData.company}
            onChange={handleInputChange}
            placeholder="Acme Corp"
            className="simple-waitlist-form__input"
            disabled={loading}
          />
        </div>

        <div className="simple-waitlist-form__field">
          <label htmlFor="role" className="simple-waitlist-form__label">
            Role
          </label>
          <select
            id="role"
            name="role"
            value={formData.role}
            onChange={handleInputChange}
            className="simple-waitlist-form__select"
            disabled={loading}
          >
            <option value="">Select your role</option>
            <option value="ceo">CEO/Founder</option>
            <option value="cto">CTO/VP Engineering</option>
            <option value="product">Product Manager</option>
            <option value="engineer">Engineer/Developer</option>
            <option value="designer">Designer</option>
            <option value="marketing">Marketing</option>
            <option value="sales">Sales</option>
            <option value="other">Other</option>
          </select>
        </div>

        <button
          type="submit"
          className="simple-waitlist-form__submit"
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="simple-waitlist-form__spinner"></span>
              Joining...
            </>
          ) : (
            'Join Waitlist'
          )}
        </button>

        <p className="simple-waitlist-form__privacy">
          By joining, you agree to receive updates about our launch. 
          We respect your privacy and won't share your information.
        </p>
      </form>
    </div>
  );
};

export default SimpleWaitlistForm;
