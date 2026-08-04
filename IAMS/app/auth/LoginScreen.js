import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert,
  ImageBackground, ScrollView, useWindowDimensions,
  KeyboardAvoidingView, Platform, SafeAreaView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { useAuth } from '../../context/AuthContext';
import { getApiBaseUrl } from '../../api/axios';
import Spinner from '../../components/Spinner';

const FORM_MAX_WIDTH = 420;

const NAVY     = '#0D1B3E';
const BLUE     = '#1A56DB';
const GOLD     = '#D4A017';
const WHITE    = '#FFFFFF';
const GRAY     = '#9CA3AF';
const RED      = '#DC2626';
const INPUT_BG = '#F3F6FB';
const BORDER   = '#D1D9E6';
const CARD_BG  = '#FAF9F6';

const heroImage = require('../../assets/graduation-bg.png');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const { height } = useWindowDimensions();
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [loading, setLoading]     = useState(false);

  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError]     = useState('');

  const heroHeight = Math.max(height * 0.45, 320);
  const waveHeight = 48;

  const clearFieldError = (key) => {
    if (fieldErrors[key]) setFieldErrors((e) => ({ ...e, [key]: undefined }));
    if (formError) setFormError('');
  };

  const validate = () => {
    const errors = {};
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!EMAIL_REGEX.test(email.trim())) {
      errors.email = 'Enter a valid email address';
    }
    if (!password) {
      errors.password = 'Password is required';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogin = async () => {
    setFormError('');
    if (!validate()) return;

    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setLoading(false);

      if (err.response?.data?.requiresVerification) {
        navigation.navigate('Verify', { email });
        return;
      }

      if (err.response) {
    
        setFormError(err.response.data?.message || 'Incorrect email or password');
        return;
      }
      const message = err.request
        ? `Cannot reach the server at ${getApiBaseUrl()}. Make sure the backend is running.`
        : err.message || 'Something went wrong';
      Alert.alert('Login Failed', message);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ImageBackground
          source={heroImage}
          style={[styles.hero, { height: heroHeight }]}
          resizeMode="cover"
          imageStyle={styles.heroImage}
        >
          {/* Gradient: near-transparent up top so the photo reads clearly,
              deepening toward the bottom so the white text stays legible */}
          <LinearGradient
            colors={['rgba(13,27,62,0.15)', 'rgba(13,27,62,0.35)', 'rgba(13,27,62,0.82)']}
            locations={[0, 0.5, 1]}
            style={StyleSheet.absoluteFillObject}
          />

          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.75}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={22} color={WHITE} />
          </TouchableOpacity>

          <View style={styles.heroContent}>
            <View style={styles.badgeRow}>
              <Ionicons name="book-outline" size={16} color={GOLD} />
              <View style={styles.goldDot} />
              <MaterialCommunityIcons name="school" size={18} color={GOLD} />
              <View style={styles.goldDot} />
              <Ionicons name="ribbon-outline" size={16} color={GOLD} />
            </View>

            <Text
              style={styles.kickerText}
              numberOfLines={2}
              adjustsFontSizeToFit
              allowFontScaling={false}
            >
              University of Eastern Africa, Baraton
            </Text>

            <Text style={styles.appName} allowFontScaling={false}>IAMS</Text>

            <View style={styles.subtitleRow}>
              <View style={styles.goldLine} />
              <Text
                style={styles.subtitleText}
                numberOfLines={1}
                adjustsFontSizeToFit
                allowFontScaling={false}
              >
                Industrial Attachment Management
              </Text>
              <View style={styles.goldLine} />
            </View>
          </View>

          {/* Wave transition into the card below, replaces a hard straight edge */}
          <Svg
            width="100%"
            height={waveHeight}
            viewBox="0 0 1440 100"
            preserveAspectRatio="none"
            style={styles.wave}
          >
            <Path
              d="M0,40 C240,90 480,10 720,35 C960,60 1200,95 1440,45 L1440,100 L0,100 Z"
              fill={CARD_BG}
            />
          </Svg>
        </ImageBackground>

        <ScrollView
          style={styles.card}
          contentContainerStyle={styles.cardContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formInner}>
            <View
              style={[styles.inputWrap, fieldErrors.email && styles.inputWrapError]}
            >
              <Ionicons
                name="mail-outline"
                size={20}
                color={fieldErrors.email ? RED : BLUE}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={GRAY}
                value={email}
                onChangeText={(v) => { setEmail(v); clearFieldError('email'); }}
                keyboardType="email-address"
                autoCapitalize="none"
                allowFontScaling={false}
              />
            </View>
            {fieldErrors.email ? (
              <Text style={styles.fieldErrorText}>{fieldErrors.email}</Text>
            ) : null}

            <View
              style={[styles.inputWrap, fieldErrors.password && styles.inputWrapError]}
            >
              <MaterialCommunityIcons
                name="lock-outline"
                size={20}
                color={fieldErrors.password ? RED : BLUE}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Password"
                placeholderTextColor={GRAY}
                value={password}
                onChangeText={(v) => { setPassword(v); clearFieldError('password'); }}
                secureTextEntry={!showPass}
                allowFontScaling={false}
              />
              <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
                <Ionicons name={showPass ? 'eye-outline' : 'eye-off-outline'} size={20} color={GRAY} />
              </TouchableOpacity>
            </View>
            {fieldErrors.password ? (
              <Text style={styles.fieldErrorText}>{fieldErrors.password}</Text>
            ) : null}

            {formError ? (
              <View style={styles.formErrorBox}>
                <Ionicons name="alert-circle" size={16} color={RED} />
                <Text style={styles.formErrorText}>{formError}</Text>
              </View>
            ) : null}

            <View style={styles.optionsRow}>
              <View style={{ flex: 1 }} />
              <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                <Text style={styles.forgotText} allowFontScaling={false}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.signInBtn, loading && { opacity: 0.7 }]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <Spinner color={WHITE} size="small" />
              ) : (
                <>
                  <Text style={styles.signInText} allowFontScaling={false}>Log In</Text>
                  <Ionicons name="arrow-forward" size={20} color={WHITE} style={{ marginLeft: 8 }} />
                </>
              )}
            </TouchableOpacity>

            <View style={styles.registerRow}>
              <Text style={styles.registerText} allowFontScaling={false}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.registerLink} allowFontScaling={false}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CARD_BG },
  hero: {
    minHeight: 320,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    width: '100%',
    backgroundColor: NAVY,
    position: 'relative',
  },
  heroImage: Platform.select({
    web: { objectPosition: 'top' },
    default: {},
  }),
  backBtn: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 4,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroContent: {
    paddingHorizontal: 24,
    paddingBottom: 56,
    alignItems: 'center',
    zIndex: 2,
    width: '100%',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  goldDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: GOLD,
    opacity: 0.8,
  },
  kickerText: {
    fontSize: 12,
    fontWeight: '700',
    color: WHITE,
    textAlign: 'center',
    width: '100%',
    letterSpacing: 2,
    textTransform: 'uppercase',
    opacity: 0.85,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  appName: {
    fontSize: 54,
    fontWeight: '900',
    color: WHITE,
    letterSpacing: 1,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    marginTop: 6,
    marginBottom: 10,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    justifyContent: 'center',
  },
  goldLine: { height: 2, backgroundColor: GOLD, maxWidth: 40, flex: 1 },
  subtitleText: {
    color: WHITE,
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.95,
    textAlign: 'center',
    flexShrink: 1,
  },
  wave: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    zIndex: 3,
  },
  card: {
    flex: 1,
    backgroundColor: CARD_BG,
    marginTop: -1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
  cardContent: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 40, alignItems: 'center' },
  formInner: { width: '100%', maxWidth: FORM_MAX_WIDTH },
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
  inputWrapError: {
    borderColor: RED,
    marginBottom: 6,
  },
  fieldErrorText: {
    fontSize: 12,
    fontWeight: '600',
    color: RED,
    marginTop: -2,
    marginBottom: 12,
    marginLeft: 4,
  },
  formErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FDECEC',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  formErrorText: {
    fontSize: 13,
    fontWeight: '600',
    color: RED,
    flexShrink: 1,
  },
  inputIcon: { marginRight: 12 },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '500',
    paddingVertical: 0,
    textAlignVertical: 'center',
  },
  eyeBtn: { padding: 6 },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  rememberRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  forgotText: { fontSize: 14, color: BLUE, fontWeight: '600' },
  signInBtn: {
    backgroundColor: BLUE,
    borderRadius: 14,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  signInText: { color: WHITE, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  registerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' },
  registerText: { fontSize: 14, color: '#6B7280' },
  registerLink: { fontSize: 14, color: BLUE, fontWeight: '700' },
});