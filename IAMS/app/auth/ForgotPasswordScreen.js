import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function ForgotPasswordScreen({ navigation }) {
  const { forgotPassword, resetPassword } = useAuth();
  const { theme } = useTheme();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestCode = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setStep(2);
      Alert.alert('Code Sent', 'Check your email for the password reset code.');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to send reset code');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!code || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email.trim(), code.trim(), newPassword);
      Alert.alert('Success', 'Password reset successful. Please login with your new password.', [
        { text: 'Login', onPress: () => navigation.replace('Login') }
      ]);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.secondary }]}>
        <Text style={[styles.title, { color: theme.primary }]}>Forgot Password</Text>
        <Text style={[styles.subtitle, { color: theme.white }]}>Reset your IAMS account password</Text>
      </View>

      <View style={styles.form}>
        {step === 1 ? (
          <>
            <Text style={[styles.label, { color: theme.text }]}>Email Address</Text>
            <TextInput
              style={[styles.input, { borderColor: theme.gray, backgroundColor: theme.surface, color: theme.text }]}
              placeholder="Enter your registered email"
              placeholderTextColor={theme.textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.primary }]}
              onPress={handleRequestCode}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color={theme.white} />
                : <Text style={styles.buttonText}>Send Reset Code</Text>
              }
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={[styles.infoText, { color: theme.text }]}>Reset code sent to: {email}</Text>

            <Text style={[styles.label, { color: theme.text }]}>Reset Code</Text>
            <TextInput
              style={[styles.input, { borderColor: theme.gray, backgroundColor: theme.surface, color: theme.text }]}
              placeholder="Enter 6-digit code"
              placeholderTextColor={theme.textSecondary}
              value={code}
              onChangeText={setCode}
              keyboardType="numeric"
              maxLength={6}
            />

            <Text style={[styles.label, { color: theme.text }]}>New Password</Text>
            <TextInput
              style={[styles.input, { borderColor: theme.gray, backgroundColor: theme.surface, color: theme.text }]}
              placeholder="Enter new password"
              placeholderTextColor={theme.textSecondary}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />

            <Text style={[styles.label, { color: theme.text }]}>Confirm New Password</Text>
            <TextInput
              style={[styles.input, { borderColor: theme.gray, backgroundColor: theme.surface, color: theme.text }]}
              placeholder="Confirm new password"
              placeholderTextColor={theme.textSecondary}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />

            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.primary }]}
              onPress={handleResetPassword}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color={theme.white} />
                : <Text style={styles.buttonText}>Reset Password</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity onPress={handleRequestCode} disabled={loading}>
              <Text style={[styles.secondaryLink, { color: theme.primary }]}>Resend Code</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={[styles.link, { color: theme.secondary }]}>Back to Login</Text>
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
  title: { fontSize: 30, fontWeight: 'bold' },
  subtitle: { fontSize: 13, marginTop: 8 },
  form: { padding: 24, marginTop: 20 },
  infoText: {
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    marginBottom: 16,
  },
  button: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  secondaryLink: {
    textAlign: 'center',
    marginTop: 18,
    fontSize: 14,
    fontWeight: '600',
  },
  link: { textAlign: 'center', marginTop: 20, fontSize: 14 },
});
