import { useState, useCallback } from 'react';
import { Alert } from 'react-native';

/**
 * Custom hook for handling API errors consistently
 * Provides error handling utilities and error state management
 */
export const useApiError = () => {
  const [error, setError] = useState(null);

  const handleError = useCallback((err, fallbackMessage = 'Something went wrong') => {
    let message = fallbackMessage;
    let code = 'UNKNOWN';

    if (err.response) {
      // Server responded with error status
      code = `HTTP_${err.response.status}`;
      message = err.response.data?.message || err.response.data?.error || fallbackMessage;
      
      // Handle specific error codes
      switch (err.response.status) {
        case 400:
          message = err.response.data?.message || 'Invalid input. Please check your data.';
          break;
        case 401:
          message = 'Session expired. Please login again.';
          break;
        case 403:
          message = 'You do not have permission to perform this action.';
          break;
        case 404:
          message = 'The requested resource was not found.';
          break;
        case 409:
          message = err.response.data?.message || 'A conflict occurred. Please try again.';
          break;
        case 422:
          // Validation errors
          if (err.response.data?.errors && Array.isArray(err.response.data.errors)) {
            message = err.response.data.errors.join('\n');
          } else {
            message = 'Validation failed. Please check your input.';
          }
          break;
        case 429:
          message = 'Too many requests. Please wait a moment before trying again.';
          break;
        case 500:
          message = 'Server error. Please try again later.';
          break;
        case 503:
          message = 'Service unavailable. Please try again later.';
          break;
        default:
          break;
      }
    } else if (err.request) {
      // Request made but no response
      code = 'NO_RESPONSE';
      message = 'Cannot reach the server. Please check your connection.';
    } else if (err.message) {
      // Error in request setup
      code = 'REQUEST_ERROR';
      message = err.message;
    }

    const errorObj = {
      code,
      message,
      originalError: err,
      timestamp: new Date().toISOString(),
    };

    setError(errorObj);
    return errorObj;
  }, []);

  const showErrorAlert = useCallback((err, title = 'Error', fallbackMessage = 'Something went wrong') => {
    const errorObj = handleError(err, fallbackMessage);
    Alert.alert(title, errorObj.message);
  }, [handleError]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    handleError,
    showErrorAlert,
    clearError,
    hasError: !!error,
  };
};

/**
 * Hook for managing API loading states
 */
export const useApiLoading = () => {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const startLoading = useCallback((key = 'main') => {
    setLoading((prev) => ({ ...prev, [key]: true }));
  }, []);

  const stopLoading = useCallback((key = 'main') => {
    setLoading((prev) => ({ ...prev, [key]: false }));
  }, []);

  const isLoading = useCallback((key = 'main') => {
    return loading[key] || false;
  }, [loading]);

  const setError = useCallback((key, error) => {
    setErrors((prev) => ({ ...prev, [key]: error }));
  }, []);

  const getError = useCallback((key = 'main') => {
    return errors[key] || null;
  }, [errors]);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  return {
    loading,
    errors,
    startLoading,
    stopLoading,
    isLoading,
    setError,
    getError,
    clearErrors,
  };
};

/**
 * Hook for retrying failed API calls with exponential backoff
 */
export const useRetry = () => {
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  const baseDelay = 1000; // 1 second

  const getDelay = useCallback((attempt) => {
    // Exponential backoff: 1s, 2s, 4s
    return baseDelay * Math.pow(2, attempt - 1);
  }, []);

  const retry = useCallback(async (fn, shouldRetry = () => true) => {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await fn();
        setRetryCount(0);
        return result;
      } catch (err) {
        lastError = err;
        
        if (!shouldRetry(err) || attempt === maxRetries) {
          throw err;
        }

        const delay = getDelay(attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
        setRetryCount(attempt);
      }
    }

    throw lastError;
  }, [getDelay]);

  return {
    retry,
    retryCount,
    maxRetries,
  };
};
