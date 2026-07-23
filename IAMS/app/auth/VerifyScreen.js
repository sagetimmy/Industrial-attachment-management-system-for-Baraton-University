import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Animated,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../../components/Spinner';

const NAVY   = '#0D1B3E';
const BLUE   = '#1A56DB';
const GOLD   = '#D4A017';
const WHITE  = '#FFFFFF';
const GRAY   = '#9CA3AF';
const GREEN  = '#1E9E5A';
const RED    = '#DC2626';
const INPUT_BG = '#F3F6FB';
const BORDER   = '#D1D9E6';

export default function VerifyScreen({ navigation, route }) {
  const { verifyEmail, resendVerificationCode, login } = useAuth();
  const { email, password } = route.params;
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);

  // 'idle' | 'success' | 'error'
  const [status, setStatus] = useState('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [resendBanner, setResendBanner] = useState(null); // { type: 'success'|'error', text }

  const inputs = useRef([]);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const statusFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => prev > 0 ? prev - 1 : 0);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const resetStatus = () => {
    if (status !== 'idle') {
      setStatus('idle');
      setStatusMessage('');
      statusFade.setValue(0);
    }
  };

  const handleChange = (text, index) => {
    resetStatus();
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

  const showStatus = () => {
    Animated.timing(statusFade, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const triggerSuccess = (autoLogin, message) => {
    setLoading(false);
    setStatus('success');
    setStatusMessage(message);
    showStatus();
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.06, duration: 160, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 160, useNativeDriver: true }),
    ]).start();

    if (!autoLogin) {
      setTimeout(() => navigation.replace('Login'), 1100);
    }
  };

  const triggerError = (message) => {
    setLoading(false);
    setStatus('error');
    setStatusMessage(message);
    showStatus();

    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 1, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -1, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 1, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -1, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 55, useNativeDriver: true }),
    ]).start(() => {
      setCode(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    });
  };

  const handleVerify = async () => {
    const fullCode = code.join('');
    if (fullCode.length < 6) {
      triggerError('Please enter the complete 6-digit code');
      return;
    }
    setLoading(true);
    setStatus('idle');

    try {
      await verifyEmail(email, fullCode);
    } catch (err) {
      triggerError(err.response?.data?.message || 'Invalid code, please try again');
      return;
    }
    if (!password) {
      triggerSuccess(false, 'Email verified! Please log in to continue.');
      return;
    }

    try {
      await login(email, password);
      triggerSuccess(true, 'Email verified! Taking you in…');
    } catch (err) {
      triggerSuccess(false, 'Email verified! Please log in to continue.');
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setResending(true);
    setResendBanner(null);
    try {
      await resendVerificationCode(email);
      setCountdown(60);
      setCode(['', '', '', '', '', '']);
      resetStatus();
      setResendBanner({ type: 'success', text: 'A new code has been sent to your email.' });
    } catch (err) {
      setResendBanner({ type: 'error', text: err.response?.data?.message || 'Failed to resend code' });
    } finally {
      setResending(false);
    }
  };

  const shakeTranslate = shakeAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [-8, 0, 8],
  });

  const getInputBorderColor = (digit) => {
    if (status === 'success') return GREEN;
    if (status === 'error') return RED;
    return digit ? BLUE : BORDER;
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
        {resendBanner && (
          <View
            style={[
              styles.banner,
              resendBanner.type === 'success' ? styles.bannerSuccess : styles.bannerError,
            ]}
          >
            <Ionicons
              name={resendBanner.type === 'success' ? 'checkmark-circle' : 'alert-circle'}
              size={18}
              color={resendBanner.type === 'success' ? GREEN : RED}
            />
            <Text
              style={[
                styles.bannerText,
                { color: resendBanner.type === 'success' ? GREEN : RED },
              ]}
            >
              {resendBanner.text}
            </Text>
          </View>
        )}

        <Text style={styles.sectionLabel}>Verification Code</Text>

        <Animated.View
          style={[
            styles.codeContainer,
            {
              transform: [
                { translateX: shakeTranslate },
                { scale: scaleAnim },
              ],
            },
          ]}
        >
          {code.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputs.current[index] = ref)}
              style={[
                styles.codeInput,
                { borderColor: getInputBorderColor(digit) },
                status === 'success' && styles.codeInputSuccess,
                status === 'error' && styles.codeInputError,
              ]}
              value={digit}
              onChangeText={(text) => handleChange(text.slice(-1), index)}
              onKeyPress={(e) => handleBackspace(e, index)}
              keyboardType="numeric"
              maxLength={1}
              textAlign="center"
              editable={!loading && status !== 'success'}
            />
          ))}
        </Animated.View>

        {status !== 'idle' && (
          <Animated.View style={[styles.statusRow, { opacity: statusFade }]}>
            <Ionicons
              name={status === 'success' ? 'checkmark-circle' : 'close-circle'}
              size={20}
              color={status === 'success' ? GREEN : RED}
            />
            <Text style={[styles.statusText, { color: status === 'success' ? GREEN : RED }]}>
              {statusMessage}
            </Text>
          </Animated.View>
        )}

        <TouchableOpacity
          style={[
            styles.primaryBtn,
            loading && { opacity: 0.7 },
            status === 'success' && styles.primaryBtnSuccess,
          ]}
          onPress={handleVerify}
          disabled={loading || status === 'success'}
          activeOpacity={0.85}
        >
          {loading ? (
            <Spinner color={WHITE} size="small" />
          ) : (
            <Text style={styles.primaryBtnText}>
              {status === 'success' ? 'Verified' : 'Verify Email'}
            </Text>
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
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  bannerSuccess: { backgroundColor: '#E7F7EF' },
  bannerError: { backgroundColor: '#FDECEC' },
  bannerText: { fontSize: 13, fontWeight: '600', flexShrink: 1 },
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
    marginBottom: 12,
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
  codeInputSuccess: { backgroundColor: '#E7F7EF' },
  codeInputError: { backgroundColor: '#FDECEC' },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 16,
  },
  statusText: { fontSize: 14, fontWeight: '700' },
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
  primaryBtnSuccess: { backgroundColor: GREEN, shadowColor: GREEN },
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