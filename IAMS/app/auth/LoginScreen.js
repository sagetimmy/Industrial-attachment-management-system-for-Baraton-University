import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert,
  ImageBackground, ScrollView, Dimensions,
  KeyboardAvoidingView, Platform, SafeAreaView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { getApiBaseUrl } from '../../api/axios';
import Spinner from '../../components/Spinner';

const { height } = Dimensions.get('window');

const NAVY   = '#0D1B3E';
const BLUE   = '#1A56DB';
const GOLD   = '#D4A017';
const WHITE  = '#FFFFFF';
const GRAY   = '#9CA3AF';
const INPUT_BG = '#F3F6FB';
const BORDER   = '#D1D9E6';

const heroImage = require('../../assets/graduation-bg.jpg.png');

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [loading, setLoading]     = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      if (err.response?.data?.requiresVerification) {
        navigation.navigate('Verify', { email });
      } else {
        const message = err.response?.data?.message
          || (err.request
            ? `Cannot reach the server at ${getApiBaseUrl()}. Make sure the backend is running.`
            : err.message || 'Something went wrong');
        Alert.alert('Login Failed', message);
      }
    }
    setLoading(false);
  };

  const heroContent = (
    <>
      <View style={styles.heroOverlay} />

      <View style={styles.iconDecor}>
        <Ionicons name="book-outline" size={24} color={WHITE} style={styles.decorIcon} />
        <MaterialCommunityIcons name="school" size={24} color={WHITE} style={styles.decorIcon} />
        <Ionicons name="ribbon-outline" size={24} color={WHITE} style={styles.decorIcon} />
      </View>

      <View style={styles.heroContent}>
        <Text
          style={styles.welcomeText}
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

        <Text style={styles.capEmoji}>🎓</Text>
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {Platform.OS === 'web' ? (
          <View
            style={[
              styles.hero,
              {
                backgroundImage: `url(${heroImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              },
            ]}
          >
            {heroContent}
          </View>
        ) : (
          <ImageBackground
            source={heroImage}
            style={styles.hero}
            resizeMode="cover"
            imageStyle={{ opacity: 0.9 }}
          >
            {heroContent}
          </ImageBackground>
        )}

        <ScrollView
          style={styles.card}
          contentContainerStyle={styles.cardContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.inputWrap}>
            <Ionicons name="mail-outline" size={20} color={BLUE} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={GRAY}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              allowFontScaling={false}
            />
          </View>

          <View style={styles.inputWrap}>
            <MaterialCommunityIcons name="lock-outline" size={20} color={BLUE} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Password"
              placeholderTextColor={GRAY}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
              allowFontScaling={false}
            />
            <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
              <Ionicons name={showPass ? 'eye-outline' : 'eye-off-outline'} size={20} color={GRAY} />
            </TouchableOpacity>
          </View>

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
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: WHITE },
  hero: {
    height: height * 0.45,
    minHeight: 320,
    justifyContent: 'flex-end',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(13, 27, 62, 0.50)',
  },
  iconDecor: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 40,
    opacity: 0.4,
  },
  decorIcon: { opacity: 0.6 },
  heroContent: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    alignItems: 'center',
    zIndex: 2,
    width: '100%',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '600',
    color: WHITE,
    textAlign: 'center',
    width: '100%',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  appName: {
    fontSize: 44,
    fontWeight: '900',
    color: WHITE,
    letterSpacing: 1,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
    marginVertical: 8,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
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
  capEmoji: { fontSize: 32, marginTop: 12, textAlign: 'center' },
  card: {
    flex: 1,
    backgroundColor: WHITE,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -28,
  },
  cardContent: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 40 },
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