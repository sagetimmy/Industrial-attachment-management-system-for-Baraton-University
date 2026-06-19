import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ScrollView,
  Dimensions
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../../components/Spinner';

const { height } = Dimensions.get('window');

const NAVY     = '#0D1B3E';
const BLUE     = '#1A56DB';
const GOLD     = '#D4A017';
const WHITE    = '#FFFFFF';
const GRAY     = '#9CA3AF';
const INPUT_BG = '#F3F6FB';
const BORDER   = '#D1D9E6';

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [role, setRole] = useState('student');
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [form, setForm] = useState({
    full_name: '', reg_number: '', email: '',
    password: '', confirm_password: '', department: '', year_of_study: '',
    phone: '',
    org_name: '', industry: '', location: '',
    official_email: '', website: '', description: '',
    contact_person: '', contact_position: '',
    department_offering: '', roles_tasks: '',
    required_skills: '', available_slots: '',
    attachment_duration: '', work_mode: 'onsite',
    internal_supervisor: '', supervisor_position: '',
    allowance: '', resources_provided: '',
  });
  const [loading, setLoading] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const handleChange = (key, value) => setForm({ ...form, [key]: value });

  const handleRegister = async () => {
    if (role === 'host_org') {
      if (!form.email || !form.password || !form.org_name || !form.location) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }
    } else {
      if (!form.full_name || !form.email || !form.password) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }
    }

    if (form.password !== form.confirm_password) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (!agreeTerms) {
      Alert.alert('Error', 'Please agree to Terms & Conditions and Privacy Policy');
      return;
    }

    if (role === 'student' && !form.reg_number) {
      Alert.alert('Error', 'Registration number is required for students');
      return;
    }

    setLoading(true);
    try {
      await register({ ...form, role });
      navigation.navigate('Verify', { email: form.email });
    } catch (err) {
      Alert.alert('Registration Failed', err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    { key: 'student',   label: 'Student',           icon: 'school' },
    { key: 'supervisor', label: 'Supervisor',        icon: 'briefcase' },
    { key: 'host_org',  label: 'Host Organization',  icon: 'office-building' },
  ];

  const selectedRoleLabel = roles.find(r => r.key === role)?.label || 'Select Role';

  return (
    <View style={styles.root}>

      {/* ── Navy header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={WHITE} />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Create Account</Text>
          <View style={styles.subtitleRow}>
            <View style={styles.goldLine} />
            <Text style={styles.subtitleText}>Industrial Attachment Management</Text>
            <View style={styles.goldLine} />
          </View>
          <Text style={styles.headerAcronym}>IAMS</Text>
        </View>

        <View style={styles.headerIcon}>
          <MaterialCommunityIcons name="school" size={32} color={GOLD} />
        </View>
      </View>

      <View style={styles.waveDivider} />

      {/* ── Form ── */}
      <ScrollView
        style={styles.formContainer}
        contentContainerStyle={styles.formContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* Role dropdown */}
        <Text style={styles.sectionLabel}>Registering as:</Text>
        <TouchableOpacity
          style={styles.roleDropdown}
          onPress={() => setShowRoleDropdown(!showRoleDropdown)}
        >
          <MaterialCommunityIcons
            name={roles.find(r => r.key === role)?.icon || 'help'}
            size={20}
            color={BLUE}
            style={styles.roleIcon}
          />
          <Text style={styles.roleDropdownText}>{selectedRoleLabel}</Text>
          <Ionicons name={showRoleDropdown ? 'chevron-up' : 'chevron-down'} size={20} color={BLUE} />
        </TouchableOpacity>

        {showRoleDropdown && (
          <View style={styles.roleDropdownMenu}>
            {roles.map((r) => (
              <TouchableOpacity
                key={r.key}
                style={[styles.roleOption, role === r.key && styles.roleOptionSelected]}
                onPress={() => { setRole(r.key); setShowRoleDropdown(false); }}
              >
                <MaterialCommunityIcons
                  name={r.icon}
                  size={18}
                  color={role === r.key ? BLUE : GRAY}
                  style={{ marginRight: 10 }}
                />
                <Text style={[styles.roleOptionText, role === r.key && styles.roleOptionTextSelected]}>
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Personal info — hidden for host org */}
        {role !== 'host_org' && (
          <>
            <Text style={styles.sectionLabel}>Personal Information</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="person-outline" size={20} color={BLUE} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor={GRAY}
                value={form.full_name}
                onChangeText={(v) => handleChange('full_name', v)}
              />
            </View>
          </>
        )}

        {/* Email */}
        <View style={styles.inputWrap}>
          <Ionicons name="mail-outline" size={20} color={BLUE} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={GRAY}
            value={form.email}
            onChangeText={(v) => handleChange('email', v)}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* Password */}
        <View style={styles.inputWrap}>
          <MaterialCommunityIcons name="lock-outline" size={20} color={BLUE} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={GRAY}
            value={form.password}
            onChangeText={(v) => handleChange('password', v)}
            secureTextEntry
          />
        </View>

        {/* Confirm Password */}
        <View style={styles.inputWrap}>
          <MaterialCommunityIcons name="lock-outline" size={20} color={BLUE} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            placeholderTextColor={GRAY}
            value={form.confirm_password}
            onChangeText={(v) => handleChange('confirm_password', v)}
            secureTextEntry
          />
        </View>

        {/* Phone */}
        <View style={styles.inputWrap}>
          <Ionicons name="call-outline" size={20} color={BLUE} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Phone Number"
            placeholderTextColor={GRAY}
            value={form.phone}
            onChangeText={(v) => handleChange('phone', v)}
            keyboardType="phone-pad"
          />
        </View>

        {/* Student fields */}
        {role === 'student' && (
          <>
            <Text style={styles.sectionLabel}>Student Details</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="id-card-outline" size={20} color={BLUE} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Registration Number"
                placeholderTextColor={GRAY}
                value={form.reg_number}
                onChangeText={(v) => handleChange('reg_number', v)}
                autoCapitalize="characters"
              />
            </View>
            <View style={styles.inputWrap}>
              <Ionicons name="book-outline" size={20} color={BLUE} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Department"
                placeholderTextColor={GRAY}
                value={form.department}
                onChangeText={(v) => handleChange('department', v)}
              />
            </View>
            <View style={styles.inputWrap}>
              <Ionicons name="layers-outline" size={20} color={BLUE} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Year of Study"
                placeholderTextColor={GRAY}
                value={form.year_of_study}
                onChangeText={(v) => handleChange('year_of_study', v)}
                keyboardType="numeric"
              />
            </View>
          </>
        )}

        {/* Supervisor fields */}
        {role === 'supervisor' && (
          <>
            <Text style={styles.sectionLabel}>Supervisor Details</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="book-outline" size={20} color={BLUE} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Department"
                placeholderTextColor={GRAY}
                value={form.department}
                onChangeText={(v) => handleChange('department', v)}
              />
            </View>
          </>
        )}

        {/* Host org fields */}
        {role === 'host_org' && (
          <>
            <Text style={styles.sectionLabel}>Organization Information</Text>
            <View style={styles.inputWrap}>
              <MaterialCommunityIcons name="office-building-outline" size={20} color={BLUE} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Organization Name"
                placeholderTextColor={GRAY}
                value={form.org_name}
                onChangeText={(v) => handleChange('org_name', v)}
              />
            </View>
            <View style={styles.inputWrap}>
              <Ionicons name="briefcase-outline" size={20} color={BLUE} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Industry/Sector"
                placeholderTextColor={GRAY}
                value={form.industry}
                onChangeText={(v) => handleChange('industry', v)}
              />
            </View>
            <View style={styles.inputWrap}>
              <Ionicons name="location-outline" size={20} color={BLUE} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Physical Address"
                placeholderTextColor={GRAY}
                value={form.location}
                onChangeText={(v) => handleChange('location', v)}
              />
            </View>
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={20} color={BLUE} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Official Email"
                placeholderTextColor={GRAY}
                value={form.official_email}
                onChangeText={(v) => handleChange('official_email', v)}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <View style={styles.inputWrap}>
              <Ionicons name="globe-outline" size={20} color={BLUE} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Website (optional)"
                placeholderTextColor={GRAY}
                value={form.website}
                onChangeText={(v) => handleChange('website', v)}
                autoCapitalize="none"
              />
            </View>
          </>
        )}

        {/* Terms */}
        <TouchableOpacity style={styles.termsRow} onPress={() => setAgreeTerms(!agreeTerms)}>
          <View style={[styles.checkbox, agreeTerms && styles.checkboxChecked]}>
            {agreeTerms && <Ionicons name="checkmark" size={12} color={WHITE} />}
          </View>
          <Text style={styles.termsText}>
            I agree to the Terms & Conditions and{' '}
            <Text style={styles.termsLink} onPress={() => navigation.navigate('PrivacyPolicy')}>
              Privacy Policy
            </Text>
          </Text>
        </TouchableOpacity>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.signUpBtn, loading && { opacity: 0.7 }]}
          onPress={handleRegister}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <Spinner color={WHITE} size="small" />
          ) : (
            <>
              <Text style={styles.signUpText}>Create Account</Text>
              <Ionicons name="person-add-outline" size={20} color={WHITE} style={{ marginLeft: 8 }} />
            </>
          )}
        </TouchableOpacity>

        {/* Login link */}
        <View style={styles.loginRow}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginLink}>Log In</Text>
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
    height: 180,
    paddingTop: 40,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerContent: { marginTop: 10, alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: '700', color: WHITE },
  subtitleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 },
  goldLine: { height: 1.5, backgroundColor: GOLD, width: 30 },
  subtitleText: {
    color: WHITE, fontSize: 11, fontWeight: '600',
    opacity: 0.8, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  headerAcronym: { fontSize: 16, fontWeight: '800', color: GOLD, marginTop: 2, letterSpacing: 2 },
  headerIcon: {
    position: 'absolute', bottom: -16, right: 32,
    backgroundColor: WHITE, width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 6,
  },
  waveDivider: { height: 20 },
  formContainer: { flex: 1 },
  formContent: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },
  sectionLabel: {
    fontSize: 14, fontWeight: '700', color: NAVY,
    marginBottom: 12, marginTop: 8,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  roleDropdown: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: INPUT_BG, borderWidth: 1.5, borderColor: BLUE,
    borderRadius: 14, paddingHorizontal: 16, height: 56, marginBottom: 8,
  },
  roleIcon: { marginRight: 12 },
  roleDropdownText: { flex: 1, fontSize: 15, color: NAVY, fontWeight: '600' },
  roleDropdownMenu: {
    backgroundColor: WHITE, borderRadius: 14,
    borderWidth: 1, borderColor: BORDER, marginBottom: 16,
    elevation: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, overflow: 'hidden',
  },
  roleOption: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  roleOptionSelected: { backgroundColor: '#EEF2FF' },
  roleOptionText: { fontSize: 14, color: GRAY, fontWeight: '500' },
  roleOptionTextSelected: { color: BLUE, fontWeight: '700' },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: INPUT_BG, borderRadius: 14,
    paddingHorizontal: 16, marginBottom: 16, height: 56,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 15, color: NAVY, fontWeight: '500' },
  termsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, marginTop: 8 },
  checkbox: {
    width: 20, height: 20, borderRadius: 6,
    borderWidth: 2, borderColor: BLUE,
    marginRight: 10, alignItems: 'center', justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: BLUE },
  termsText: { fontSize: 13, color: '#6B7280', flex: 1 },
  termsLink: { color: BLUE, fontWeight: '700' },
  signUpBtn: {
    backgroundColor: BLUE, borderRadius: 14, height: 56,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
    shadowColor: BLUE, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  signUpText: { color: WHITE, fontSize: 16, fontWeight: '700' },
  loginRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  loginText: { fontSize: 14, color: '#6B7280' },
  loginLink: { fontSize: 14, color: BLUE, fontWeight: '700' },
});