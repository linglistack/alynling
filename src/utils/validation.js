// Form validation utilities

// Email validation
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Password validation
export const validatePassword = (password) => {
  return password && password.length >= 6;
};

// Required field validation
export const validateRequired = (value) => {
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  return value !== null && value !== undefined;
};

// Generic form validation
export const validateForm = (fields, rules) => {
  const errors = {};
  
  Object.keys(rules).forEach(field => {
    const value = fields[field];
    const fieldRules = rules[field];
    
    fieldRules.forEach(rule => {
      if (typeof rule === 'function') {
        const error = rule(value, fields);
        if (error) {
          errors[field] = error;
        }
      }
    });
  });
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Common validation rules
export const validationRules = {
  required: (value) => {
    if (!validateRequired(value)) {
      return 'This field is required';
    }
    return null;
  },
  
  email: (value) => {
    if (value && !validateEmail(value)) {
      return 'Please enter a valid email address';
    }
    return null;
  },
  
  password: (value) => {
    if (value && !validatePassword(value)) {
      return 'Password must be at least 6 characters long';
    }
    return null;
  },
  
  confirmPassword: (value, fields) => {
    if (value && value !== fields.password) {
      return 'Passwords do not match';
    }
    return null;
  },
  
  minLength: (min) => (value) => {
    if (value && value.length < min) {
      return `Must be at least ${min} characters long`;
    }
    return null;
  },
  
  maxLength: (max) => (value) => {
    if (value && value.length > max) {
      return `Must be no more than ${max} characters long`;
    }
    return null;
  }
};
