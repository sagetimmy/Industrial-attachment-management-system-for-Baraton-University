import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../../api/axios';

// ── Design Tokens ─────────────────────────────────────────────────────────────
const BG     = '#EEF2F0';
const WHITE  = '#FFFFFF';
const TEAL   = '#1B7A65';
const DARK   = '#0F2419';
const GRAY   = '#7A8F86';
const BORDER = '#D8E4DF';
const RED    = '#E53935';
const ORANGE = '#E8711A';

// ── Role options ──────────────────────────────────────────────────────────────
const ROLES = [
  { key: 'student',    label: 'Student',    icon: 'school-outline'   },
  { key: 'supervisor', label: 'Supervisor', icon: 'ribbon-outline'   },
  { key: 'host_org',   label: 'Host Org',   icon: 'business-outline' },
];

// ── Reusable field ────────────────────────────────────────────────────────────
function Field({ label, value, onChangeText, placeholder, keyboardType, secureTextEntry, optional, icon }) {
  const [show, setShow] = useState(false);
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>
        {label} {optional && <Text style={styles.optionalTag}>(optional)</Text>}
      </Text>
      <View style={styles.inputRow}>
        {icon && <Ionicons name={icon} size={18} color={GRAY} style={styles.inputIcon} />}
        <TextInput
          style={[styles.input, icon && { paddingLeft: 36 }, secureTextEntry && { paddingRight: 44 }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={GRAY}
          keyboardType={keyboardType || 'default'}
          secureTextEntry={secureTextEntry && !show}
          autoCapitalize={keyboardType === 'email-address' ? 'none' : 'words'}
          autoCorrect={false}
        />
        {secureTextEntry && (
          <TouchableOpacity style={styles.eyeBtn} onPress={() => setShow(s => !s)}>
            <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={18} color={GRAY} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ── Role pill selector ────────────────────────────────────────────────────────
function RoleSelector({ selected, onSelect }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>Role</Text>
      <View style={styles.roleGrid}>
        {ROLES.map((r) => (
          <TouchableOpacity
            key={r.key}
            style={[styles.rolePill, selected === r.key && styles.rolePillActive]}
            onPress={() => onSelect(r.key)}
            accessibilityLabel={`Select role ${r.label}`}
          >
            <Ionicons
              name={r.icon}
              size={16}
              color={selected === r.key ? WHITE : GRAY}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.rolePillText, selected === r.key && styles.rolePillTextActive]}>
              {r.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ── Section divider ───────────────────────────────────────────────────────────
function SectionDivider({ title }) {
  return (
    <View style={styles.sectionDivider}>
      <View style={styles.sectionDividerLine} />
      <Text style={styles.sectionDividerText}>{title}</Text>
      <View style={styles.sectionDividerLine} />
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function AddUserScreen({ navigation }) {
  // ── Step tracking (1 = auth, 2 = profile, 3 = done) ──────────────────────
  const [step, setStep]       = useState(1);
  const [loading, setLoading] = useState(false);
  const [authId, setAuthId]   = useState(null);

  // ── Step 1: Auth fields ───────────────────────────────────────────────────
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole]         = useState('student');
  const [fullName, setFullName] = useState('');

  // ── Step 2: Role-specific profile fields ──────────────────────────────────
  // Student
  const [regNumber, setRegNumber]       = useState('');
  const [department, setDepartment]     = useState('');
  const [yearOfStudy, setYearOfStudy]   = useState('');
  const [phone, setPhone]               = useState('');
  // Supervisor (reuses department + phone)
  // Host Org
  const [orgName, setOrgName]           = useState('');
  const [location, setLocation]         = useState('');
  const [contactPerson, setContactPerson] = useState('');
  // NOTE: no `available_slots` field here — slot counts are derived from
  // real vacancy postings (see admin.routes.js getOpenVacancySlotsByOrg),
  // not manually typed at registration. A freshly-created host org has
  // zero vacancies until one is added, so this screen no longer asks for
  // or submits a number that would just disagree with the live sum.

  // ── Step 1: Create auth user ──────────────────────────────────────────────
  const handleCreateAuth = async () => {
    if (!email.trim() || !password.trim() || !fullName.trim()) {
      return Alert.alert('Missing Fields', 'Please fill in name, email, and password.');
    }
    if (password.length < 6) {
      return Alert.alert('Weak Password', 'Password must be at least 6 characters.');
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/register', {
        email:     email.trim().toLowerCase(),
        password,
        role,
        full_name: fullName.trim(),
      });

      setAuthId(res.data.auth_id);
      setStep(2);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Create role profile ───────────────────────────────────────────
  const handleCreateProfile = async () => {
    // Validate role-specific required fields
    if (role === 'student' && !regNumber.trim()) {
      return Alert.alert('Missing Fields', 'Registration number is required for students.');
    }
    if (role === 'host_org' && !orgName.trim()) {
      return Alert.alert('Missing Fields', 'Organisation name is required.');
    }

    setLoading(true);
    try {
      await api.post('/auth/register-profile', {
        auth_id:       authId,
        email:         email.trim().toLowerCase(),
        role,
        full_name:     fullName.trim(),
        // Student fields
        reg_number:    regNumber.trim()    || undefined,
        department:    department.trim()   || undefined,
        year_of_study: yearOfStudy ? parseInt(yearOfStudy, 10) : undefined,
        phone:         phone.trim()        || undefined,
        // Host Org fields
        org_name:      orgName.trim()      || undefined,
        location:      location.trim()     || undefined,
        contact_person: contactPerson.trim() || undefined,
      });

      setStep(3);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  // ── Done state ────────────────────────────────────────────────────────────
  if (step === 3) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.doneWrap}>
          <View style={styles.doneIconCircle}>
            <Ionicons name="checkmark-circle" size={64} color={TEAL} />
          </View>
          <Text style={styles.doneTitle}>User Created!</Text>
          <Text style={styles.doneSubtitle}>
            {role === 'host_org'
              ? `${fullName} has been registered as a Host Organisation.`
              : `${fullName} has been added as a `}
            {role !== 'host_org' && <Text style={{ fontWeight: '700' }}>{role}</Text>}
            {role !== 'host_org' && '.'}
            {'\n'}
            A verification email has been sent to{'\n'}
            <Text style={{ color: TEAL, fontWeight: '600' }}>{email}</Text>
          </Text>
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.doneBtnText}>Back to Users</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addAnotherBtn}
            onPress={() => {
              setStep(1); setAuthId(null);
              setEmail(''); setPassword(''); setFullName(''); setRole('student');
              setRegNumber(''); setDepartment(''); setYearOfStudy(''); setPhone('');
              setOrgName(''); setLocation(''); setContactPerson('');
            }}
          >
            <Text style={styles.addAnotherText}>+ Add Another User</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => step === 2 ? setStep(1) : navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={TEAL} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>{step === 1 ? 'Add User' : 'Profile Details'}</Text>
          <View style={{ width: 34 }} />
        </View>

        {/* Step indicator */}
        <View style={styles.stepIndicator}>
          <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]}>
            <Text style={[styles.stepDotText, step >= 1 && styles.stepDotTextActive]}>1</Text>
          </View>
          <View style={[styles.stepLine, step >= 2 && styles.stepLineActive]} />
          <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]}>
            <Text style={[styles.stepDotText, step >= 2 && styles.stepDotTextActive]}>2</Text>
          </View>
          <View style={styles.stepLine} />
          <View style={[styles.stepDot, step >= 3 && styles.stepDotActive]}>
            <Ionicons name="checkmark" size={14} color={step >= 3 ? WHITE : GRAY} />
          </View>
        </View>
        <View style={styles.stepLabels}>
          <Text style={[styles.stepLabel, step === 1 && styles.stepLabelActive]}>Account</Text>
          <Text style={[styles.stepLabel, step === 2 && styles.stepLabelActive]}>Profile</Text>
          <Text style={styles.stepLabel}>Done</Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── STEP 1: Auth details ── */}
          {step === 1 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Account Information</Text>
              <Text style={styles.cardSubtitle}>Basic credentials for the new user</Text>

              <Field
                label={role === 'host_org' ? 'Organisation Name' : 'Full Name'}
                value={fullName}
                onChangeText={setFullName}
                placeholder={role === 'host_org' ? 'e.g. Safaricom PLC' : 'e.g. Jane Doe'}
                icon={role === 'host_org' ? 'business-outline' : 'person-outline'}
              />
              <Field
                label="Email Address"
                value={email}
                onChangeText={setEmail}
                placeholder="e.g. jane@ueab.ac.ke"
                keyboardType="email-address"
                icon="mail-outline"
              />
              <Field
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Min. 6 characters"
                secureTextEntry
                icon="lock-closed-outline"
              />

              <RoleSelector selected={role} onSelect={setRole} />

              <TouchableOpacity
                style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                onPress={handleCreateAuth}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color={WHITE} />
                  : <Text style={styles.submitBtnText}>Continue →</Text>
                }
              </TouchableOpacity>
            </View>
          )}

          {/* ── STEP 2: Role-specific profile ── */}
          {step === 2 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {role === 'student'    ? 'Student Profile'
                : role === 'supervisor' ? 'Supervisor Profile'
                : role === 'host_org'   ? 'Organisation Profile'
                : 'Admin Profile'}
              </Text>
              <Text style={styles.cardSubtitle}>
                {role === 'host_org'
                  ? `Organisation profile for ${fullName}`
                  : `Additional details for ${fullName}`}
              </Text>

              {/* ── Student fields ── */}
              {role === 'student' && (
                <>
                  <Field
                    label="Registration Number"
                    value={regNumber}
                    onChangeText={setRegNumber}
                    placeholder="e.g. UEAB/CS/2023/001"
                    icon="id-card-outline"
                  />
                  <Field
                    label="Department"
                    value={department}
                    onChangeText={setDepartment}
                    placeholder="e.g. Information Systems"
                    icon="school-outline"
                    optional
                  />
                  <Field
                    label="Year of Study"
                    value={yearOfStudy}
                    onChangeText={setYearOfStudy}
                    placeholder="e.g. 4"
                    keyboardType="numeric"
                    icon="calendar-outline"
                    optional
                  />
                  <Field
                    label="Phone Number"
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="e.g. +254712345678"
                    keyboardType="phone-pad"
                    icon="call-outline"
                    optional
                  />
                </>
              )}

              {/* ── Supervisor fields ── */}
              {role === 'supervisor' && (
                <>
                  <Field
                    label="Department"
                    value={department}
                    onChangeText={setDepartment}
                    placeholder="e.g. Computer Science"
                    icon="school-outline"
                    optional
                  />
                  <Field
                    label="Phone Number"
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="e.g. +254712345678"
                    keyboardType="phone-pad"
                    icon="call-outline"
                    optional
                  />
                </>
              )}

              {/* ── Host Org fields ── */}
              {role === 'host_org' && (
                <>
                  <Field
                    label="Organisation Name"
                    value={orgName}
                    onChangeText={setOrgName}
                    placeholder="e.g. Safaricom PLC"
                    icon="business-outline"
                  />
                  <Field
                    label="Location"
                    value={location}
                    onChangeText={setLocation}
                    placeholder="e.g. Nairobi, Kenya"
                    icon="location-outline"
                    optional
                  />
                  <Field
                    label="Contact Person"
                    value={contactPerson}
                    onChangeText={setContactPerson}
                    placeholder="e.g. John Kamau"
                    icon="person-outline"
                    optional
                  />
                  <Field
                    label="Phone Number"
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="e.g. +254712345678"
                    keyboardType="phone-pad"
                    icon="call-outline"
                    optional
                  />
                </>
              )}



              <TouchableOpacity
                style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                onPress={handleCreateProfile}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color={WHITE} />
                  : <Text style={styles.submitBtnText}>Create User</Text>
                }
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: BG,
  },
  backBtn: { padding: 4 },
  topBarTitle: { fontSize: 18, fontWeight: '800', color: DARK },

  // Step indicator
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    marginTop: 4,
  },
  stepDot: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: WHITE,
    borderWidth: 2, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: TEAL, borderColor: TEAL },
  stepDotText: { fontSize: 13, fontWeight: '700', color: GRAY },
  stepDotTextActive: { color: WHITE },
  stepLine: { flex: 1, height: 2, backgroundColor: BORDER },
  stepLineActive: { backgroundColor: TEAL },
  stepLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    marginTop: 6,
    marginBottom: 16,
  },
  stepLabel: { fontSize: 11, color: GRAY, fontWeight: '500', flex: 1, textAlign: 'center' },
  stepLabelActive: { color: TEAL, fontWeight: '700' },

  // Scroll
  scrollContent: { paddingHorizontal: 16, paddingBottom: 60 },

  // Card
  card: {
    backgroundColor: WHITE,
    borderRadius: 20,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  cardTitle: { fontSize: 18, fontWeight: '800', color: DARK, marginBottom: 4 },
  cardSubtitle: { fontSize: 13, color: GRAY, marginBottom: 20 },

  // Field
  fieldWrap: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: DARK, marginBottom: 6 },
  optionalTag: { fontSize: 11, color: GRAY, fontWeight: '400' },
  inputRow: { position: 'relative' },
  inputIcon: { position: 'absolute', left: 12, top: 13, zIndex: 1 },
  eyeBtn: { position: 'absolute', right: 12, top: 13 },
  input: {
    backgroundColor: BG,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: BORDER,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
    color: DARK,
  },

  // Role selector
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 30,
    backgroundColor: WHITE,
    borderWidth: 1.5,
    borderColor: BORDER,
  },
  rolePillActive: { backgroundColor: TEAL, borderColor: TEAL },
  rolePillText: { fontSize: 13, fontWeight: '600', color: GRAY },
  rolePillTextActive: { color: WHITE },

  // Section divider
  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    gap: 10,
  },
  sectionDividerLine: { flex: 1, height: 1, backgroundColor: BORDER },
  sectionDividerText: { fontSize: 12, color: GRAY, fontWeight: '600' },

  // Admin note
  adminNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#E8F5F2',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  adminNoteText: { fontSize: 13, color: TEAL, flex: 1, lineHeight: 18 },

  // Submit button
  submitBtn: {
    backgroundColor: TEAL,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: WHITE, fontSize: 15, fontWeight: '800' },

  // Done state
  doneWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  doneIconCircle: {
    width: 100, height: 100,
    borderRadius: 50,
    backgroundColor: '#E8F5F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  doneTitle: { fontSize: 26, fontWeight: '800', color: DARK, marginBottom: 12 },
  doneSubtitle: {
    fontSize: 14, color: GRAY, textAlign: 'center',
    lineHeight: 22, marginBottom: 32,
  },
  doneBtn: {
    backgroundColor: TEAL,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 40,
    marginBottom: 14,
    width: '100%',
    alignItems: 'center',
  },
  doneBtnText: { color: WHITE, fontSize: 15, fontWeight: '800' },
  addAnotherBtn: { paddingVertical: 10 },
  addAnotherText: { color: TEAL, fontSize: 14, fontWeight: '600' },
});