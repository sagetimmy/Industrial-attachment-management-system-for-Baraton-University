import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ScrollView,
  Dimensions
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../../api/axios';
import Spinner from '../../components/Spinner';

const { height } = Dimensions.get('window');

// Educational theme colors
const NAVY   = '#0D1B3E';
const BLUE   = '#1A56DB';
const GOLD   = '#D4A017';
const WHITE  = '#FFFFFF';
const GRAY   = '#9CA3AF';
const INPUT_BG = '#F3F6FB';
const BORDER   = '#D1D9E6';

export default function RegisterScreen({ navigation }) {
  const [role, setRole] = useState('student');
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [form, setForm] = useState({
    full_name: '', reg_number: '', email: '',
    password: '', confirm_password: '', department: '', year_of_study: '',
    phone: '',
    // Host org fields
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
    // Validation based on role
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
      await api.post('/auth/register', { ...form, role });
      navigation.navigate('Verify', { email: form.email });
    } catch (err) {
      Alert.alert('Registration Failed', err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    { key: 'student', label: 'Student', icon: 'school' },
    { key: 'supervisor', label: 'Supervisor', icon: 'briefcase' },
    { key: 'host_org', label: 'Host Organization', icon: 'office-building' },
  ];

  const selectedRoleLabel = roles.find(r => r.key === role)?.label || 'Select Role';

  return (
    <View style={styles.root}>
      {/* ── Navy header section ── */}
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

        {/* Educational icon */}
        <View style={styles.headerIcon}>
          <MaterialCommunityIcons name="school" size={32} color={GOLD} />
        </View>
      </View>

      {/* ── Decorative wave divider ── */}
      <View style={styles.waveDivider} />

      {/* ── Form section ── */}
      <ScrollView
        style={styles.formContainer}
        contentContainerStyle={styles.formContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Role Selection Dropdown */}
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
          <Ionicons 
            name={showRoleDropdown ? 'chevron-up' : 'chevron-down'} 
            size={20} 
            color={BLUE} 
          />
        </TouchableOpacity>

        {showRoleDropdown && (
          <View style={styles.roleDropdownMenu}>
            {roles.map((r) => (
              <TouchableOpacity
                key={r.key}
                style={[
                  styles.roleOption,
                  role === r.key && styles.roleOptionSelected
                ]}
                onPress={() => {
                  setRole(r.key);
                  setShowRoleDropdown(false);
                }}
              >
                <MaterialCommunityIcons 
                  name={r.icon} 
                  size={18} 
                  color={role === r.key ? BLUE : GRAY}
                  style={{ marginRight: 10 }}
                />
                <Text style={[
                  styles.roleOptionText,
                  role === r.key && styles.roleOptionTextSelected
                ]}>
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Personal Information Section - Hidden for Host Org */}
        {role !== 'host_org' && (
          <>
            <Text style={styles.sectionLabel}>Personal Information</Text>

            {/* Full Name */}
            <View style={styles.inputWrap}>
              <Ionicons name="person-outline" size={20} color={BLUE} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor={GRAY}
                underlineColorAndroid="transparent"
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
            underlineColorAndroid="transparent"
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
            underlineColorAndroid="transparent"
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
            underlineColorAndroid="transparent"
            value={form.confirm_password}
            onChangeText={(v) => handleChange('confirm_password', v)}
            secureTextEntry
          />
        </View>

        {/* Phone Number */}
        <View style={styles.inputWrap}>
          <Ionicons name="call-outline" size={20} color={BLUE} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Phone Number"
            placeholderTextColor={GRAY}
            underlineColorAndroid="transparent"
            value={form.phone}
            onChangeText={(v) => handleChange('phone', v)}
            keyboardType="phone-pad"
          />
        </View>

        {/* Student-specific fields */}
        {role === 'student' && (
          <>
            <Text style={styles.sectionLabel}>Student Details</Text>

            <View style={styles.inputWrap}>
              <Ionicons name="id-card-outline" size={20} color={BLUE} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Registration Number"
                placeholderTextColor={GRAY}
                underlineColorAndroid="transparent"
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
                underlineColorAndroid="transparent"
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
                underlineColorAndroid="transparent"
                value={form.year_of_study}
                onChangeText={(v) => handleChange('year_of_study', v)}
                keyboardType="numeric"
              />
            </View>
          </>
        )}

        {/* Supervisor-specific fields */}
        {role === 'supervisor' && (
          <>
            <Text style={styles.sectionLabel}>Supervisor Details</Text>

            <View style={styles.inputWrap}>
              <Ionicons name="book-outline" size={20} color={BLUE} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Department"
                placeholderTextColor={GRAY}
                underlineColorAndroid="transparent"
                value={form.department}
                onChangeText={(v) => handleChange('department', v)}
              />
            </View>
          </>
        )}

        {/* Host Organization-specific fields */}
        {role === 'host_org' && (
          <>
            <Text style={styles.sectionLabel}>Organization Information</Text>

            <View style={styles.inputWrap}>
              <MaterialCommunityIcons name="office-building-outline" size={20} color={BLUE} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Organization Name"
                placeholderTextColor={GRAY}
                underlineColorAndroid="transparent"
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
                underlineColorAndroid="transparent"
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
                underlineColorAndroid="transparent"
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
                underlineColorAndroid="transparent"
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
                underlineColorAndroid="transparent"
                value={form.website}
                onChangeText={(v) => handleChange('website', v)}
                autoCapitalize="none"
              />
            </View>
          </>
        )}

        {/* Terms & Conditions */}
        <TouchableOpacity 
          style={styles.termsRow} 
          onPress={() => setAgreeTerms(!agreeTerms)}
        >
          <View style={[styles.checkbox, agreeTerms && styles.checkboxChecked]}>
            {agreeTerms && <Ionicons name="checkmark" size={12} color={WHITE} />}
          </View>
          <Text style={styles.termsText}>
            I agree to the Terms & Conditions and{' '}
            <Text
              style={styles.termsLink}
              onPress={() => navigation.navigate('PrivacyPolicy')}
            >
              Privacy Policy
            </Text>
          </Text>
        </TouchableOpacity>

        {/* Sign Up Button */}
        <TouchableOpacity
          style={[styles.signUpBtn, loading && { opacity: 0.7 }]}
          onPress={handleRegister}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <Spinner color={WHITE} size="small" />
          ) : (
            <Text style={styles.signUpText}>Register</Text>
          )}
        </TouchableOpacity>

        {/* Sign In Link */}
        <View style={styles.signInRow}>
          <Text style={styles.signInText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.signInLink}>Sign In</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: WHITE,
  },

  // Header
  header: {
    backgroundColor: NAVY,
    paddingTop: 40,
    paddingBottom: 30,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    padding: 8,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: WHITE,
    letterSpacing: 0.5,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  subtitleText: {
    fontSize: 13,
    color: WHITE,
    fontWeight: '600',
    textAlign: 'center',
    flexShrink: 1,
  },
  goldLine: {
    height: 2,
    backgroundColor: GOLD,
    maxWidth: 50,
    flex: 1,
  },
  headerAcronym: {
    fontSize: 20,
    fontWeight: '850',
    color: WHITE,
    letterSpacing: 5,
    marginTop: 6,
  },
  headerIcon: {
    padding: 8,
  },

  // Wave divider
  waveDivider: {
    height:34,
    backgroundColor: NAVY,
    borderBottomLeftRadius: 1000,
    borderBottomRightRadius: 1000,
  },

  // Form
  formContainer: {
    flex: 2,
    backgroundColor: WHITE,
  },
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
  },

  // Role Dropdown
  roleDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: INPUT_BG,
    borderWidth: 1.5,
    borderColor: BLUE,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
  },
  roleIcon: {
    marginRight: 12,
  },
  roleDropdownText: {
    flex: 1,
    fontSize: 15,
    color: NAVY,
    fontWeight: '600',
  },
  roleDropdownMenu: {
    backgroundColor: WHITE,
    borderWidth: 1.5,
    borderColor: BLUE,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal:20,
    paddingVertical: 15,
    borderBottomWidth: 5,
    borderBottomColor: BORDER,
  },
  roleOptionSelected: {
    backgroundColor: '#E3F2FD',
  },
  roleOptionText: {
    fontSize: 14,
    color: GRAY,
    fontWeight: '500',
  },
  roleOptionTextSelected: {
    color: BLUE,
    fontWeight: '700',
  },

  // Input fields
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 28,
    paddingHorizontal: 20,
    marginBottom: 16,
    height: 66,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: NAVY,
    fontWeight: '500',
    paddingVertical: 12,
    paddingRight: 8,
    textAlignVertical: 'center',
  },

  // Terms checkbox
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WHITE,
  },
  checkboxChecked: {
    backgroundColor: BLUE,
    borderColor: BLUE,
  },
  termsText: {
    fontSize: 14,
    color: NAVY,
    flex: 1,
    flexWrap: 'wrap',
    lineHeight: 20,
  },
  termsLink: {
    fontSize: 14,
    color: BLUE,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },

  // Sign up button
  signUpBtn: {
    backgroundColor: BLUE,
    borderRadius: 14,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  signUpText: {
    color: WHITE,
    fontSize: 17,
    fontWeight: '700',
  },

  // Sign in link
  signInRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInText: {
    fontSize: 14,
    color: GRAY,
  },
  signInLink: {
    fontSize: 14,
    color: BLUE,
    fontWeight: '700',
  },
});