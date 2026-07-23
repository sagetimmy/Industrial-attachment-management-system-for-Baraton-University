export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return email && emailRegex.test(email.trim());
};

// Password validation (moderate: 6+ chars with letters and numbers)
export const isValidPassword = (password, strength = 'moderate') => {
  if (!password) return false;

  if (strength === 'strong') {
    // Strong: 8+, uppercase, lowercase, number, special char
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password);
  }

  // Moderate: 6+, letters and numbers
  return /^(?=.*[a-zA-Z])(?=.*\d)[A-Za-z\d@$!%*?&]{6,}$/.test(password);
};

// Phone number validation
export const isValidPhoneNumber = (phone) => {
  if (!phone) return true; // Optional
  return /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/.test(phone.trim());
};

// Registration number validation (alphanumeric, 3-20 chars)
export const isValidRegistrationNumber = (regNumber) => {
  if (!regNumber) return false;
  return /^[A-Z0-9]{3,20}$/.test(regNumber.trim().toUpperCase());
};

// Generic text validation (non-empty, max 255 chars)
export const isValidText = (text, minLength = 1, maxLength = 255) => {
  if (typeof text !== 'string') return false;
  const trimmed = text.trim();
  return trimmed.length >= minLength && trimmed.length <= maxLength;
};

// Date validation
export const isValidDate = (dateString) => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) return false;
  
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
};

// Date range validation
export const isValidDateRange = (startDate, endDate) => {
  if (!isValidDate(startDate) || !isValidDate(endDate)) return false;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  return end > start;
};

// Password strength score (0-4)
export const getPasswordStrength = (password) => {
  let score = 0;
  
  if (!password) return score;
  if (password.length >= 6) score++;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[@$!%*?&]/.test(password)) score++;
  
  return Math.min(score, 4);
};

// Get password strength label
export const getPasswordStrengthLabel = (password) => {
  const strength = getPasswordStrength(password);
  
  const labels = {
    0: 'Very Weak',
    1: 'Weak',
    2: 'Fair',
    3: 'Good',
    4: 'Strong',
  };
  
  return labels[strength] || 'Unknown';
};

// Validate form object
export const validateForm = (formData, rules) => {
  const errors = {};
  
  Object.entries(rules).forEach(([field, rule]) => {
    const value = formData[field];
    
    if (rule.required && (!value || value.toString().trim() === '')) {
      errors[field] = `${rule.label || field} is required`;
      return;
    }
    
    if (!value) return;
    
    if (rule.type === 'email' && !isValidEmail(value)) {
      errors[field] = 'Invalid email address';
    } else if (rule.type === 'password' && !isValidPassword(value)) {
      errors[field] = 'Password must be at least 6 characters with letters and numbers';
    } else if (rule.type === 'phone' && !isValidPhoneNumber(value)) {
      errors[field] = 'Invalid phone number';
    } else if (rule.type === 'date' && !isValidDate(value)) {
      errors[field] = 'Invalid date format (YYYY-MM-DD)';
    } else if (rule.minLength && value.length < rule.minLength) {
      errors[field] = `${rule.label || field} must be at least ${rule.minLength} characters`;
    } else if (rule.maxLength && value.length > rule.maxLength) {
      errors[field] = `${rule.label || field} must not exceed ${rule.maxLength} characters`;
    } else if (rule.pattern && !rule.pattern.test(value)) {
      errors[field] = rule.message || `${rule.label || field} format is invalid`;
    }
  });
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

// Sanitize input (trim and basic XSS prevention)
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return '';
  return input.trim().replace(/[<>]/g, '');
};

// Format phone number display
export const formatPhoneNumber = (phone) => {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  
  return phone;
};
