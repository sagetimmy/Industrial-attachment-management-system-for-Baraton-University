import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

export default function VerifyScreen({ navigation, route }) {
  const { verifyEmail, resendVerificationCode } = useAuth();
  const { theme } = useTheme();
  const { email } = route.params;
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const inputs = useRef([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => prev > 0 ? prev - 1 : 0);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleChange = (text, index) => {
    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);
    if (text && index < 5) inputs.current[index + 1].focus();
  };

  const handleBackspace = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputs.current[index - 1].focus();
    }
  };

  const handleVerify = async () => {
    const fullCode = code.join('');
    if (fullCode.length < 6) {
      Alert.alert('Error', 'Please enter the complete 6-digit code');
      return;
    }
    setLoading(true);
    try {
      await verifyEmail(email, fullCode);
      Alert.alert('Success! 🎉', 'Your email has been verified!', [
        { text: 'Continue' }
      ]);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setResending(true);
    try {
      await resendVerificationCode(email);
      setCountdown(60);
      setCode(['', '', '', '', '', '']);
      Alert.alert('Sent!', 'A new verification code has been sent to your email.');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to resend code');
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.secondary }]}>
        <Text style={styles.icon}>📧</Text>
        <Text style={[styles.title, { color: theme.white }]}>Verify Your Email</Text>
        <Text style={[styles.subtitle, { color: theme.gray }]}>
          We sent a 6-digit code to:
        </Text>
        <Text style={[styles.email, { color: theme.primary }]}>{email}</Text>
      </View>

      <View style={styles.body}>
        <Text style={[styles.label, { color: theme.text }]}>Enter Verification Code</Text>

        {/* Code Input Boxes */}
        <View style={styles.codeContainer}>
          {code.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputs.current[index] = ref)}
              style={[
                styles.codeInput,
                {
                  borderColor: digit ? theme.primary : theme.gray,
                  backgroundColor: digit ? `${theme.primary}15` : theme.surface,
                  color: theme.text,
                }
              ]}
              value={digit}
              onChangeText={(text) => handleChange(text.slice(-1), index)}
              onKeyPress={(e) => handleBackspace(e, index)}
              keyboardType="numeric"
              maxLength={1}
              textAlign="center"
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.primary }]}
          onPress={handleVerify}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color={theme.white} />
            : <Text style={styles.buttonText}>Verify Email ✓</Text>
          }
        </TouchableOpacity>

        {/* Resend */}
        <TouchableOpacity
          style={[styles.resendBtn, countdown > 0 && styles.resendDisabled]}
          onPress={handleResend}
          disabled={countdown > 0 || resending}
        >
          {resending
            ? <ActivityIndicator color={theme.primary} size="small" />
            : <Text style={[styles.resendText, countdown > 0 && { color: theme.textSecondary }]}>
                {countdown > 0
                  ? `Resend code in ${countdown}s`
                  : 'Resend Code'
                }
              </Text>
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={[styles.backText, { color: theme.secondary }]}>← Back to Login</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 70, paddingBottom: 40,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  icon: { fontSize: 50, marginBottom: 10 },
  title: { fontSize: 24, fontWeight: 'bold' },
  subtitle: { fontSize: 14, marginTop: 8 },
  email: { fontWeight: '700', fontSize: 15, marginTop: 4 },
  body: { padding: 28, alignItems: 'center', marginTop: 20 },
  label: { fontSize: 15, fontWeight: '600', marginBottom: 20 },
  codeContainer: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 30 },
  codeInput: {
    width: 48, height: 58,
    borderWidth: 2,
    borderRadius: 12, fontSize: 24,
    fontWeight: 'bold',
  },
  button: {
    paddingVertical: 15,
    paddingHorizontal: 60,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  resendBtn: { marginTop: 20, padding: 10 },
  resendDisabled: { opacity: 0.5 },
  resendText: { fontSize: 14, fontWeight: '600' },
  backText: { fontSize: 14, marginTop: 16 },
});
