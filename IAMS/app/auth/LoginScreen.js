import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { API_BASE_URL } from '../../api/axios';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      return;
    } catch (err) {
      if (err.response?.data?.requiresVerification) {
        navigation.navigate('Verify', { email });
      } else {
        const message = err.response?.data?.message
          || (err.request
            ? `Cannot reach the server at ${API_BASE_URL}. Make sure the backend is running and your phone is on the same Wi-Fi.`
            : err.message || 'Something went wrong');
        Alert.alert('Login Failed', message);
      }
    }
    setLoading(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.secondary }]}>
        <Text style={[styles.title, { color: theme.primary }]}>IAMS</Text>
        <Text style={[styles.subtitle, { color: theme.white }]}>Industrial Attachment Management System</Text>
        <Text style={[styles.university, { color: theme.gray }]}>University of Eastern Africa, Baraton</Text>
      </View>

      {/* Form */}
      <View style={styles.form}>
        <Text style={[styles.label, { color: theme.text }]}>Email Address</Text>
        <TextInput
          style={[styles.input, { borderColor: theme.gray, backgroundColor: theme.surface, color: theme.text }]}
          placeholder="Enter your email"
          placeholderTextColor={theme.textSecondary}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={[styles.label, { color: theme.text }]}>Password</Text>
        <TextInput
          style={[styles.input, { borderColor: theme.gray, backgroundColor: theme.surface, color: theme.text }]}
          placeholder="Enter your password"
          placeholderTextColor={theme.textSecondary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.primary }]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color={theme.white} />
            : <Text style={styles.buttonText}>Login</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
          <Text style={[styles.link, { color: theme.secondary }]}>Forgot password?</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={[styles.linkSecondary, { color: theme.secondary }]}>Don't have an account? Register</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 80,
    paddingBottom: 40,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  title: { fontSize: 42, fontWeight: 'bold' },
  subtitle: { fontSize: 13, marginTop: 6, textAlign: 'center', paddingHorizontal: 20 },
  university: { fontSize: 11, marginTop: 4 },
  form: { padding: 24, marginTop: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 10, padding: 12,
    fontSize: 15, marginBottom: 16,
  },
  button: {
    padding: 15, borderRadius: 10,
    alignItems: 'center', marginTop: 8,
  },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  link: { textAlign: 'center', marginTop: 20, fontSize: 14 },
  linkSecondary: { textAlign: 'center', marginTop: 10, fontSize: 14 },
});
