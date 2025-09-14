import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { validateEmail, validatePassword, validateRequired } from '../../utils/validation';
import Button from '../UI/Button';
import Input from '../UI/Input';
import './AuthForm.style.css';

const SignupForm = ({ onSuccess, onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  
  const { register, loading, error: authError, clearError } = useAuth();

  const validateField = (fieldName, value) => {
    switch (fieldName) {
      case 'email':
        if (!validateRequired(value)) return 'Email is required';
        if (!validateEmail(value)) return 'Please enter a valid email address';
        return '';
      case 'password':
        if (!validateRequired(value)) return 'Password is required';
        if (!validatePassword(value)) return 'Password must be at least 6 characters long';
        return '';
      case 'confirmPassword':
        if (!validateRequired(value)) return 'Please confirm your password';
        if (value !== formData.password) return 'Passwords do not match';
        return '';
      default:
        return '';
    }
  };

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear field error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    
    // Also validate confirm password if password changes
    if (name === 'password' && formData.confirmPassword) {
      const confirmError = validateField('confirmPassword', formData.confirmPassword);
      setErrors(prev => ({ ...prev, confirmPassword: confirmError }));
    }
    
    // Clear auth error when user makes changes
    if (authError) {
      clearError();
    }
  };

  const handleFieldBlur = (e) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    
    const error = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate all fields
    const newErrors = {};
    Object.keys(formData).forEach(field => {
      const error = validateField(field, formData[field]);
      if (error) newErrors[field] = error;
    });
    
    setErrors(newErrors);
    setTouched({ name: true, email: true, password: true, confirmPassword: true });
    
    if (Object.keys(newErrors).length === 0) {
      const { confirmPassword, ...userData } = formData;
      const result = await register(userData);
      if (result.success && onSuccess) {
        onSuccess(result.user);
      }
    }
  };

  const isFormValid = () => {
    return formData.email && 
           formData.password && 
           formData.confirmPassword &&
           !errors.email && 
           !errors.password && 
           !errors.confirmPassword;
  };

  return (
    <div className="auth-form">
      <div className="auth-form__header">
        <h2 className="auth-form__title">Create Account</h2>
       
      </div>

      <form onSubmit={handleSubmit} className="auth-form__form">
        {authError && (
          <div className="auth-form__error">
            {authError}
          </div>
        )}

        <div className="auth-form__fields">
          <Input
            label="Email Address"
            type="email"
            name="email"
            placeholder="Enter your email"
            value={formData.email}
            onChange={handleFieldChange}
            onBlur={handleFieldBlur}
            error={touched.email ? errors.email : ''}
            required
            disabled={loading}
          />

          <Input
            label="Password"
            type="password"
            name="password"
            placeholder="Create a password"
            value={formData.password}
            onChange={handleFieldChange}
            onBlur={handleFieldBlur}
            error={touched.password ? errors.password : ''}
            helpText={!errors.password && !touched.password ? "Must be at least 6 characters long" : ""}
            required
            disabled={loading}
          />

          <Input
            label="Confirm Password"
            type="password"
            name="confirmPassword"
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChange={handleFieldChange}
            onBlur={handleFieldBlur}
            error={touched.confirmPassword ? errors.confirmPassword : ''}
            required
            disabled={loading}
          />
        </div>

        <div className="auth-form__actions">
          <Button
            type="submit"
            variant="primary"
            size="large"
            fullWidth
            loading={loading}
            disabled={!isFormValid() || loading}
          >
            Create Account
          </Button>
        </div>
      </form>

      <div className="auth-form__divider">
        <span className="auth-form__divider-text">or</span>
      </div>

      <button
        type="button"
        className="auth-form__google-button"
        onClick={() => {
          window.location.href = `${process.env.REACT_APP_API_URL || 'http://localhost:8080'}/api/auth/google`;
        }}
        disabled={loading}
      >
        <div className="auth-form__google-icon">
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
            <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.04a4.8 4.8 0 0 1-2.7.75 4.8 4.8 0 0 1-4.52-3.36H1.83v2.07A8 8 0 0 0 8.98 17z"/>
            <path fill="#FBBC05" d="M4.46 10.41a4.8 4.8 0 0 1 0-2.82V5.52H1.83a8 8 0 0 0 0 6.96l2.63-2.07z"/>
            <path fill="#EA4335" d="M8.98 4.75c1.3 0 2.47.45 3.38 1.32l2.54-2.57A8 8 0 0 0 8.98 1a8 8 0 0 0-7.15 4.48l2.63 2.07c.61-1.86 2.35-3.11 4.52-3.11z"/>
          </svg>
        </div>
        Continue with Google
      </button>

      <div className="auth-form__footer">
        <p className="auth-form__footer-text">
          Already have an account?{' '}
          <button
            type="button"
            className="auth-form__footer-link"
            onClick={onSwitchToLogin}
            disabled={loading}
          >
            Sign in here
          </button>
        </p>
      </div>
    </div>
  );
};

export default SignupForm;
