// Email Validation
export const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };
  
  // Password Validation
  export const validatePassword = (password: string): string[] => {
    const errors: string[] = [];
  
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
  
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
  
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
  
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
  
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
  
    return errors;
  };
  
  // Numeric Validation
  export const isNumeric = (value: string): boolean => {
    return /^-?\d+(\.\d+)?$/.test(value);
  };
  
  // URL Validation
  export const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };
  
  // Form Validation Utility
  export interface ValidationRule {
    validate: (value: any) => boolean;
    message: string;
  }
  
  export const validateForm = (
    values: Record<string, any>, 
    rules: Record<string, ValidationRule[]>
  ): Record<string, string[]> => {
    const errors: Record<string, string[]> = {};
  
    Object.keys(rules).forEach(field => {
      const fieldRules = rules[field];
      const value = values[field];
      
      const fieldErrors = fieldRules
        .filter(rule => !rule.validate(value))
        .map(rule => rule.message);
  
      if (fieldErrors.length > 0) {
        errors[field] = fieldErrors;
      }
    });
  
    return errors;
  };
  
  // Common Validation Rules
  export const validationRules = {
    required: {
      validate: (value: any) => value !== null && value !== undefined && value !== '',
      message: 'This field is required'
    },
    minLength: (min: number) => ({
      validate: (value: string) => value.length >= min,
      message: `Must be at least ${min} characters long`
    }),
    maxLength: (max: number) => ({
      validate: (value: string) => value.length <= max,
      message: `Must be no more than ${max} characters long`
    }),
    email: {
      validate: isValidEmail,
      message: 'Invalid email address'
    },
    numeric: {
      validate: isNumeric,
      message: 'Must be a valid number'
    }
  };