import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Animated,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../../components/Spinner';

const NAVY       = '#0D1B3E';
const NAVY_DEEP  = '#081226';
const BLUE       = '#1A56DB';
const GOLD       = '#D4A017';
const WHITE      = '#FFFFFF';
const GRAY       = '#9CA3AF';
const GREEN      = '#1E9E5A';
const RED        = '#DC2626';
const INPUT_BG   = '#F3F6FB';
const BORDER     = '#D1D9E6';
const CARD_BG    = '#FAF9F6';
const FORM_MAX_WIDTH = 420;

export default function VerifyScreen({ navigation, route }) {
  const { verifyEmail, resendVerificationCode, login } = useAuth();
  const { email, password } = route.params;
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);

  const [status, setStatus] = useState('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [resendBanner, setResendBanner] = useState(null); 

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
      <LinearGradient
        colors={[NAVY_DEEP, NAVY]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={22} color={WHITE} />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <View style={styles.iconBadge}>
            <MaterialCommunityIcons name="email-check-outline" size={26} color={GOLD} />
          </View>

          <Text style={styles.kicker}>IAMS · SECURE VERIFICATION</Text>
          <Text style={styles.headerTitle}>Verify Email</Text>

          <Text style={styles.headerSubtitle}>Enter the 6-digit code sent to</Text>
          <Text style={styles.headerEmail}>{email}</Text>

          <View style={styles.goldLine} />
        </View>
      </LinearGradient>

      {/* ── SVG wave transition ── */}
      <View style={styles.waveWrap}>
        <Svg
          width="100%"
          height="100%"
          viewBox="0 0 400 40"
          preserveAspectRatio="none"
        >
          <Path
            d="M0,0 L0,18 C66,34 133,34 200,20 C267,6 333,6 400,18 L400,0 Z"
            fill={NAVY}
          />
        </Svg>
      </View>

      <ScrollView
        style={styles.formContainer}
        contentContainerStyle={styles.formContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formInner}>
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
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CARD_BG },
  header: {
    paddingTop: 46,
    paddingBottom: 26,
    paddingHorizontal: 20,
  },
  backBtn: {
    position: 'absolute',
    top: 46,
    left: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  headerContent: { alignItems: 'center', paddingTop: 6 },
  iconBadge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(212,160,23,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(212,160,23,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    color: GOLD,
    letterSpacing: 2,
    marginBottom: 6,
    textAlign: 'center',
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: WHITE,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
    marginTop: 10,
    textAlign: 'center',
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
    width: 60,
    marginTop: 14,
    borderRadius: 1,
  },
  waveWrap: {
    height: 30,
    width: '100%',
  },
  formContainer: { flex: 1, backgroundColor: CARD_BG },
  formContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  formInner: { width: '100%', maxWidth: FORM_MAX_WIDTH },
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