import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ScrollView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../../components/Spinner';

// Educational theme colors
const NAVY   = '#0D1B3E';
const BLUE   = '#1A56DB';
const GOLD   = '#D4A017';
const WHITE  = '#FFFFFF';
const GRAY   = '#9CA3AF';
const INPUT_BG = '#F3F6FB';
const BORDER   = '#D1D9E6';

export default function VerifyScreen({ navigation, route }) {
  const { verifyEmail, resendVerificationCode } = useAuth();
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
    if (text && index < 5) inputs.current[index + 1]?.focus();
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
    <View style={styles.root}>
      {/* ── Navy header section ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={WHITE} />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Verify Email</Text>
          <Text style={styles.headerSubtitle}>Enter the 6-digit code sent to</Text>
          <Text style={styles.headerEmail}>{email}</Text>
          <View style={styles.goldLine} />
          <Text style={styles.headerAcronym}>IAMS</Text>
        </View>

        <View style={styles.headerIcon}>
          <MaterialCommunityIcons name="email-check-outline" size={30} color={GOLD} />
        </View>
      </View>

      {/* ── Decorative wave divider ── */}
      <View style={styles.waveDivider} />

      <ScrollView
        style={styles.formContainer}
        contentContainerStyle={styles.formContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>Verification Code</Text>

        <View style={styles.codeContainer}>
          {code.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputs.current[index] = ref)}
              style={[
                styles.codeInput,
                { borderColor: digit ? BLUE : BORDER }
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
          style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
          onPress={handleVerify}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <Spinner color={WHITE} size="small" />
          ) : (
            <Text style={styles.primaryBtnText}>Verify Email</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.resendBtn}
          onPress={handleResend}
          disabled={countdown > 0 || resending}
        >
          {resending ? (
            <Spinner color={BLUE} size="small" />
          ) : (
            <Text style={[styles.resendText, countdown > 0 && styles.resendDisabledText]}>
              {countdown > 0 ? `Resend code in ${countdown}s` : 'Resend Code'}
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.signInRow}>
          <Text style={styles.signInText}>Back to </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.signInLink}>Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: WHITE },
  header: {
    backgroundColor: NAVY,
    paddingTop: 40,
    paddingBottom: 30,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: { padding: 8 },
  headerContent: { flex: 1, alignItems: 'center' },
  headerTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: WHITE,
    letterSpacing: 0.4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: WHITE,
    fontWeight: '600',
    marginTop: 4,
  },
  headerEmail: {
    fontSize: 13,
    color: GOLD,
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center',
  },
  goldLine: {
    height: 2,
    backgroundColor: GOLD,
    width: 150,
    marginTop: 8,
    borderRadius: 1,
  },
  headerAcronym: {
    fontSize: 18,
    fontWeight: '800',
    color: WHITE,
    letterSpacing: 4,
    marginTop: 6,
  },
  headerIcon: { padding: 8 },
  waveDivider: {
    height: 34,
    backgroundColor: NAVY,
    borderBottomLeftRadius: 1000,
    borderBottomRightRadius: 1000,
  },
  formContainer: { flex: 1, backgroundColor: WHITE },
  formContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: NAVY,
    marginBottom: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 24,
  },
  codeInput: {
    width: 48,
    height: 58,
    borderWidth: 1.5,
    borderRadius: 14,
    fontSize: 22,
    fontWeight: '700',
    color: NAVY,
    backgroundColor: INPUT_BG,
  },
  primaryBtn: {
    backgroundColor: BLUE,
    borderRadius: 14,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryBtnText: { color: WHITE, fontSize: 17, fontWeight: '700' },
  resendBtn: { alignItems: 'center', paddingVertical: 6 },
  resendText: { fontSize: 14, fontWeight: '600', color: BLUE },
  resendDisabledText: { color: GRAY },
  signInRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  signInText: { fontSize: 14, color: GRAY },
  signInLink: { fontSize: 14, color: BLUE, fontWeight: '700' },
});
