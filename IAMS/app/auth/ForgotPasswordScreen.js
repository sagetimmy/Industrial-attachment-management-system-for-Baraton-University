import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ScrollView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../../components/Spinner';

// Educational theme colors
const NAVY      = '#0D1B3E';
const NAVY_DEEP = '#081226';
const BLUE      = '#1A56DB';
const GOLD      = '#D4A017';
const WHITE     = '#FFFFFF';
const GRAY      = '#9CA3AF';
const INPUT_BG  = '#F3F6FB';
const BORDER    = '#D1D9E6';
const CARD_BG   = '#FAF9F6';
const FORM_MAX_WIDTH = 420;

export default function ForgotPasswordScreen({ navigation }) {
  const { forgotPassword, resetPassword } = useAuth();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestCode = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address !');
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
          <Text style={styles.kicker} numberOfLines={2}>
            {step === 1 ? 'IAMS · RESET YOUR PASSWORD' : 'IAMS · CONFIRM RESET'}
          </Text>
          <Text style={styles.headerTitle}>
            {step === 1 ? 'Forgot your password?' : 'Check your email'}
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={2}>
            {step === 1
              ? "We'll send you a code to reset it"
              : 'Enter the code sent to your email'}
          </Text>
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

      {/* ── Form section ── */}
      <ScrollView
        style={styles.formContainer}
        contentContainerStyle={styles.formContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formInner}>
          {/* Decorative icon */}
          <View style={styles.iconContainer}>
            {step === 1 ? (
              <MaterialCommunityIcons name="lock-question" size={64} color={BLUE} />
            ) : (
              <MaterialCommunityIcons name="email-check-outline" size={64} color={BLUE} />
            )}
          </View>

          {/* Step 1: Request Reset Code */}
          {step === 1 ? (
            <>
              <Text style={styles.instructionText}>
                Enter an email address to receive a password reset code
              </Text>

              {/* Email input */}
              <View style={styles.inputWrap}>
                <Ionicons name="mail-outline" size={20} color={BLUE} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email Address"
                  placeholderTextColor={GRAY}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              {/* Helper text */}
              <View style={styles.helperBox}>
                <Ionicons name="shield-checkmark-outline" size={18} color={BLUE} />
                <Text style={styles.helperText}>We will send you a password reset code via email</Text>
              </View>

              {/* Send Reset Link button */}
              <TouchableOpacity
                style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
                onPress={handleRequestCode}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <Spinner color={WHITE} size="small" />
                ) : (
                  <>
                    <Text style={styles.primaryBtnText}>Send Code</Text>
                    <Ionicons name="arrow-forward" size={20} color={WHITE} style={{ marginLeft: 8 }} />
                  </>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* Step 2: Reset Password */}
              <Text style={styles.emailConfirmText}>
                We sent a verification code to{'\n'}
                <Text style={styles.emailConfirmBold}>{email}</Text>
              </Text>

              {/* Reset Code input */}
              <Text style={styles.inputLabel}>Reset Code</Text>
              <View style={styles.inputWrap}>
                <MaterialCommunityIcons name="numeric" size={20} color={BLUE} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter 6-digit code"
                  placeholderTextColor={GRAY}
                  value={code}
                  onChangeText={setCode}
                  keyboardType="numeric"
                  maxLength={6}
                />
              </View>

              {/* New Password input */}
              <Text style={styles.inputLabel}>New Password</Text>
              <View style={styles.inputWrap}>
                <MaterialCommunityIcons name="lock-outline" size={20} color={BLUE} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter new password"
                  placeholderTextColor={GRAY}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                />
              </View>

              {/* Confirm Password input */}
              <Text style={styles.inputLabel}>Confirm Password</Text>
              <View style={styles.inputWrap}>
                <MaterialCommunityIcons name="lock-outline" size={20} color={BLUE} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm new password"
                  placeholderTextColor={GRAY}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                />
              </View>

              {/* Reset Password button */}
              <TouchableOpacity
                style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
                onPress={handleResetPassword}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <Spinner color={WHITE} size="small" />
                ) : (
                  <Text style={styles.primaryBtnText}>Reset Password</Text>
                )}
              </TouchableOpacity>

              {/* Resend Code link */}
              <TouchableOpacity 
                onPress={handleRequestCode} 
                disabled={loading}
                style={styles.resendContainer}
              >
                <Text style={styles.resendText}>Didn't receive code? </Text>
                <Text style={styles.resendLink}>Resend</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Back to Login link */}
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.backToLoginLink}>Back to Login</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: CARD_BG,
  },

  // Header
  header: {
    paddingTop: 46,
    paddingBottom: 28,
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
  headerContent: {
    alignItems: 'center',
    width: '100%',
    paddingTop: 4,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    color: GOLD,
    letterSpacing: 2,
    marginBottom: 8,
    textAlign: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: WHITE,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  goldLine: {
    height: 2,
    backgroundColor: GOLD,
    width: 60,
    marginTop: 14,
    borderRadius: 1,
  },

  // Wave divider
  waveWrap: {
    height: 30,
    width: '100%',
  },

  // Form
  formContainer: {
    flex: 1,
    backgroundColor: CARD_BG,
  },
  formContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  formInner: { width: '100%', maxWidth: FORM_MAX_WIDTH },

  // Icon container
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
    marginBottom: 24,
    backgroundColor: '#E3F2FD',
    borderRadius: 20,
  },

  // Instruction text
  instructionText: {
    fontSize: 16,
    color: NAVY,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
    fontWeight: '500',
  },

  // Email confirmation text (Step 2)
  emailConfirmText: {
    fontSize: 16,
    color: GRAY,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22,
  },
  emailConfirmBold: {
    color: NAVY,
    fontWeight: '700',
  },

  // Input label
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: NAVY,
    marginBottom: 8,
    marginTop: 12,
  },

  // Input fields
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: INPUT_BG,
    borderWidth: 1.5,
    borderColor: BLUE,
    borderRadius: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: NAVY,
    fontWeight: '500',
  },

  // Helper box
  helperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 24,
    gap: 10,
  },
  helperText: {
    fontSize: 13,
    color: NAVY,
    fontWeight: '500',
    flex: 1,
  },

  // Primary button
  primaryBtn: {
    backgroundColor: BLUE,
    borderRadius: 14,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    marginTop: 8,
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryBtnText: {
    color: WHITE,
    fontSize: 17,
    fontWeight: '700',
  },

  // Resend code
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  resendText: {
    fontSize: 14,
    color: GRAY,
  },
  resendLink: {
    fontSize: 14,
    color: BLUE,
    fontWeight: '700',
  },

  // Back to login link
  backToLoginLink: {
    fontSize: 14,
    color: BLUE,
    fontWeight: '600',
    textAlign: 'center',
  },
});