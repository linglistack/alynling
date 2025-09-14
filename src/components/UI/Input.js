import React from 'react';
import './Input.style.css';

const Input = ({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  success,
  helpText,
  required = false,
  disabled = false,
  size = 'medium',
  className = '',
  name,
  ...props
}) => {
  const inputId = `input-${name || Math.random().toString(36).substr(2, 9)}`;
  
  const inputClasses = [
    'input',
    `input--${size}`,
    error && 'input--error',
    success && 'input--success',
    className
  ].filter(Boolean).join(' ');

  const helpTextClasses = [
    'input-help',
    error && 'input-help--error',
    success && 'input-help--success'
  ].filter(Boolean).join(' ');

  return (
    <div className="input-group">
      {label && (
        <label htmlFor={inputId} className={`input-label ${required ? 'input-label--required' : ''}`}>
          {label}
        </label>
      )}
      
      <div className="input-wrapper">
        <input
          id={inputId}
          type={type}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          required={required}
          className={inputClasses}
          {...props}
        />
      </div>
      
      {(error || success || helpText) && (
        <div className={helpTextClasses}>
          {error || success || helpText}
        </div>
      )}
    </div>
  );
};

export default Input;
