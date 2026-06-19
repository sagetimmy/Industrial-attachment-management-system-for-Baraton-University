import { registerRootComponent } from 'expo';
import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import App from './App';

// ── FIX #12: ErrorBoundary wrapping App ───────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('💥 Uncaught error:', error, info.componentStack);
  }

  handleReset() {
    this.setState({ hasError: false, error: null });
  }

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F0F4F3', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ alignItems: 'center', paddingHorizontal: 32 }}>
            <Text style={{ fontSize: 56, marginBottom: 16 }}>💥</Text>
            <Text style={{ fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 10, textAlign: 'center' }}>
              Something went wrong
            </Text>
            <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22, marginBottom: 32 }}>
              {this.state.error?.message || 'An unexpected error occurred.'}
            </Text>
            <TouchableOpacity
              style={{ backgroundColor: '#0F6E56', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 30 }}
              onPress={() => this.handleReset()}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

function Root() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

registerRootComponent(Root);