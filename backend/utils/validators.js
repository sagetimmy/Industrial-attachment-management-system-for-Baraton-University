/**
 * Validation utility functions
 */

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Strong password requires: min 8 chars, uppercase, lowercase, number, special char
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// Moderate password requires: min 6 chars, mix of letters and numbers
const MODERATE_PASSWORD_REGEX = /^(?=.*[a-zA-Z])(?=.*\d)[A-Za-z\d@$!%*?&]{6,}$/;

const validateEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  return EMAIL_REGEX.test(email.trim());
};

const validatePassword = (password, strength = 'moderate') => {
  if (!password || typeof password !== 'string') return false;
  
  if (strength === 'strong') {
    return STRONG_PASSWORD_REGEX.test(password);
  }
  // Default: moderate strength (6+ chars with letters and numbers)
  return password.length >= 6 && MODERATE_PASSWORD_REGEX.test(password);
};

const validatePhoneNumber = (phone) => {
  if (!phone) return true; // Optional field
  if (typeof phone !== 'string') return false;
  // Allow 10-15 digits, with optional +, spaces, dashes, parentheses
  return /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/.test(phone.trim());
};

const validateRegistrationNumber = (regNumber) => {
  if (!regNumber || typeof regNumber !== 'string') return false;
  // Allow alphanumeric, 3-20 chars
  return /^[A-Z0-9]{3,20}$/.test(regNumber.trim().toUpperCase());
};

const validateInput = (input) => {
  if (typeof input !== 'string') return false;
  return input.trim().length > 0 && input.trim().length <= 255;
};

const sanitizeInput = (input) => {
  if (typeof input !== 'string') return '';
  return input.trim();
};

const validateRegistrationPayload = (data) => {
  const errors = [];
  
  if (!data.full_name || !validateInput(data.full_name)) {
    errors.push('Full name is required and must be 1-255 characters');
  }
  
  if (!data.email || !validateEmail(data.email)) {
    errors.push('Valid email address is required');
  }
  
  if (!data.password || !validatePassword(data.password, 'moderate')) {
    errors.push('Password must be at least 6 characters with letters and numbers');
  }
  
  if (data.phone && !validatePhoneNumber(data.phone)) {
    errors.push('Invalid phone number format');
  }
  
  if (data.role === 'student') {
    if (!data.reg_number || !validateRegistrationNumber(data.reg_number)) {
      errors.push('Valid registration number (3-20 alphanumeric characters) is required for students');
    }
  }
  
  if (data.role === 'host_org') {
    if (!data.org_name || !validateInput(data.org_name)) {
      errors.push('Organization name is required');
    }
    if (!data.contact_person || !validateInput(data.contact_person)) {
      errors.push('Contact person name is required');
    }
  }
  
  if (data.role === 'supervisor' && !validateInput(data.full_name)) {
    errors.push('Full name is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = {
  validateEmail,
  validatePassword,
  validatePhoneNumber,
  validateRegistrationNumber,
  validateInput,
  sanitizeInput,
  validateRegistrationPayload,
  EMAIL_REGEX,
  STRONG_PASSWORD_REGEX,
  MODERATE_PASSWORD_REGEX
};
