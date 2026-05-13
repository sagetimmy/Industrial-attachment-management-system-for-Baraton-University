import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

/**
 * Error Boundary Component
 * Catches errors in child components and displays error UI
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error for debugging
    console.error('Error caught by boundary:', error);
    console.error('Error info:', errorInfo);

    this.setState({
      error,
      errorInfo,
    });
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} errorInfo={this.state.errorInfo} resetError={this.resetError} />;
    }

    return this.props.children;
  }
}

/**
 * Error UI Component
 */
function ErrorFallback({ error, errorInfo, resetError }) {
  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>⚠️</Text>
        </View>

        <Text style={styles.title}>Oops! Something went wrong</Text>
        <Text style={styles.message}>We're sorry, but something unexpected happened.</Text>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorBoxTitle}>Error Details:</Text>
            <Text style={styles.errorText}>{error.toString()}</Text>
          </View>
        )}

        {errorInfo && (
          <View style={styles.stackBox}>
            <Text style={styles.stackBoxTitle}>Stack Trace:</Text>
            <Text style={styles.stackText} numberOfLines={10}>
              {errorInfo.componentStack}
            </Text>
          </View>
        )}

        <TouchableOpacity style={styles.resetButton} onPress={resetError}>
          <Text style={styles.resetButtonText}>Try Again</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>
          If the problem persists, please contact support or try restarting the app.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100%',
  },
  iconContainer: {
    marginBottom: 20,
  },
  icon: {
    fontSize: 64,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#C62828',
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 20,
  },
  errorBox: {
    backgroundColor: '#FFEBEE',
    borderLeftColor: '#C62828',
    borderLeftWidth: 4,
    padding: 12,
    borderRadius: 8,
    marginVertical: 10,
    width: '100%',
  },
  errorBoxTitle: {
    fontWeight: '600',
    color: '#C62828',
    marginBottom: 8,
  },
  errorText: {
    color: '#C62828',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  stackBox: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginVertical: 10,
    width: '100%',
  },
  stackBoxTitle: {
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  stackText: {
    color: '#666666',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  resetButton: {
    backgroundColor: '#1E3A5F',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginVertical: 20,
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
    marginTop: 20,
  },
});
