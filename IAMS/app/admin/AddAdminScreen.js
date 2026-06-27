import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, ActivityIndicator,
  Switch, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../../api/axios';

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  navy:       '#0F2419',
  teal:       '#1B7A65',
  tealDark:   '#0D7A6B',
  tealLight:  '#E0F5F1',
  bg:         '#EEF2F0',
  white:      '#FFFFFF',
  cardBorder: '#D6E4DF',
  surface:    '#F6FAF8',
  textPrimary:'#0F2419',
  textSub:    '#4A6B5D',
  textMuted:  '#8FA89F',
  outline:    '#6E7976',
  outlineVar: '#BDC9C5',
  red:        '#EF4444',
  green:      '#10B981',
  border:     '#D8E4DF',
};

// ─── Permission definitions ───────────────────────────────────────────────────
const PERMISSIONS = [
  { key: 'manageStudents',     label: 'Manage Students',                   icon: 'school-outline' },
  { key: 'manageSupervisors',  label: 'Manage Supervisors',                icon: 'ribbon-outline' },
  { key: 'manageOrgs',         label: 'Manage Organizations',              icon: 'business-outline' },
  { key: 'managePlacements',   label: 'Manage Placements & Attachments',   icon: 'clipboard-check-outline' },
  { key: 'viewReports',        label: 'System Reports & Analytics',        icon: 'bar-chart-outline' },
  { key: 'systemSettings',     label: 'System Settings & Audit Logs',      icon: 'settings-outline' },
];

// Default permission sets per role — mirrors template's selectRole() JS logic
const ROLE_DEFAULTS = {
  system: {
    manageStudents:    true,
    manageSupervisors: true,
    manageOrgs:        true,
    managePlacements:  false,
    viewReports:       false,
    systemSettings:    false,
  },
  super: {
    manageStudents:    true,
    manageSupervisors: true,
    manageOrgs:        true,
    managePlacements:  true,
    viewReports:       true,
    systemSettings:    true,
  },
};

// ─── Field component ──────────────────────────────────────────────────────────
function Field({ label, value, onChangeText, placeholder, keyboardType, secureTextEntry }) {
  const [show, setShow] = useState(false);
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, secureTextEntry && { paddingRight: 44 }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={C.outlineVar}
          keyboardType={keyboardType || 'default'}
          secureTextEntry={secureTextEntry && !show}
          autoCapitalize={keyboardType === 'email-address' ? 'none' : 'words'}
          autoCorrect={false}
        />
        {secureTextEntry && (
          <TouchableOpacity style={styles.eyeBtn} onPress={() => setShow(s => !s)}>
            <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={18} color={C.outline} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Role card ────────────────────────────────────────────────────────────────
function RoleCard({ roleKey, label, subtitle, iconName, selected, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.roleCard, selected && styles.roleCardActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.roleIconCircle, selected && styles.roleIconCircleActive]}>
        <MaterialCommunityIcons
          name={iconName}
          size={24}
          color={selected ? C.white : C.teal}
        />
      </View>
      <Text style={[styles.roleCardLabel, selected && styles.roleCardLabelActive]}>
        {label}
      </Text>
      <Text style={[styles.roleCardSub, selected && styles.roleCardSubActive]}>
        {subtitle}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Permission row ───────────────────────────────────────────────────────────
function PermissionRow({ perm, value, onChange, isLast }) {
  return (
    <View style={[styles.permRow, !isLast && styles.permRowBorder]}>
      <View style={styles.permLeft}>
        <View style={styles.permIconBox}>
          <Ionicons name={perm.icon} size={18} color={C.teal} />
        </View>
        <Text style={styles.permLabel}>{perm.label}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: C.outlineVar, true: C.tealDark }}
        thumbColor={C.white}
        ios_backgroundColor={C.outlineVar}
      />
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AddAdminScreen({ navigation }) {
  // ── Form state ──
  const [fullName, setFullName] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [adminRole, setAdminRole] = useState('system'); // 'system' | 'super'
  const [permissions, setPermissions] = useState({ ...ROLE_DEFAULTS.system });

  // ── Process state ──
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);

  // ── Role switch: auto-set permissions like template ──
  const handleRoleSelect = (roleKey) => {
    setAdminRole(roleKey);
    setPermissions({ ...ROLE_DEFAULTS[roleKey] });
  };

  // ── Toggle single permission ──
  const togglePerm = (key) => {
    setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // ── Submit: 2-step API (register → register-profile) ──
  const handleCreate = async () => {
    if (!fullName.trim()) return Alert.alert('Missing Field', 'Full name is required.');
    if (!email.trim())    return Alert.alert('Missing Field', 'Email address is required.');
    if (!password.trim()) return Alert.alert('Missing Field', 'Password is required.');
    if (password.length < 6) return Alert.alert('Weak Password', 'Password must be at least 6 characters.');

    setLoading(true);
    try {
      // Step 1 — create auth user
      const authRes = await api.post('/auth/register', {
        email:     email.trim().toLowerCase(),
        password,
        role:      'admin',
        full_name: fullName.trim(),
      });

      const authId = authRes.data?.auth_id ?? authRes.data?.id;

      // Step 2 — create admin profile with role + permissions
      await api.post('/auth/register-profile', {
        auth_id:       authId,
        email:         email.trim().toLowerCase(),
        role:          'admin',
        full_name:     fullName.trim(),
        is_super_admin: adminRole === 'super',
        permissions,
      });

      setDone(true);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to create administrator.');
    } finally {
      setLoading(false);
    }
  };

  // ── Done state ──
  if (done) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.doneWrap}>
          <View style={styles.doneIconCircle}>
            <Ionicons name="checkmark-circle" size={64} color={C.teal} />
          </View>
          <Text style={styles.doneTitle}>Admin Created!</Text>
          <Text style={styles.doneSub}>
            <Text style={{ fontWeight: '700' }}>{fullName}</Text> has been added as a{' '}
            <Text style={{ fontWeight: '700' }}>
              {adminRole === 'super' ? 'Super Admin' : 'System Admin'}
            </Text>.{'\n\n'}
            An invitation link has been sent to{'\n'}
            <Text style={{ color: C.teal, fontWeight: '600' }}>{email}</Text>
          </Text>
          <TouchableOpacity style={styles.doneBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.doneBtnText}>Back to Manage Admins</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addAnotherBtn}
            onPress={() => {
              setFullName(''); setEmail(''); setPassword('');
              setAdminRole('system');
              setPermissions({ ...ROLE_DEFAULTS.system });
              setDone(false);
            }}
          >
            <Text style={styles.addAnotherText}>+ Add Another Admin</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Main form ────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={C.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Administrator</Text>
          <View style={styles.headerIconBtn} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Hero banner — matches template illustration block ── */}
          <View style={styles.heroBanner}>
            <View style={styles.heroDotGrid} />
            <MaterialCommunityIcons
              name="shield-account"
              size={48}
              color="rgba(255,255,255,0.9)"
            />
            <Text style={styles.heroText}>
              Grant specific access rights and manage team administrative responsibilities securely.
            </Text>
          </View>

          {/* ── Section 1: Personal Information ── */}
          <View style={styles.sectionHeader}>
            <Ionicons name="person-outline" size={20} color={C.teal} />
            <Text style={styles.sectionTitle}>Personal Information</Text>
          </View>
          <View style={styles.card}>
            <Field
              label="FULL NAME"
              value={fullName}
              onChangeText={setFullName}
              placeholder="e.g. Alexander Pierce"
            />
            <Field
              label="EMAIL ADDRESS"
              value={email}
              onChangeText={setEmail}
              placeholder="alex.pierce@iams-edu.com"
              keyboardType="email-address"
            />
            <Field
              label="PASSWORD"
              value={password}
              onChangeText={setPassword}
              placeholder="Min. 6 characters"
              secureTextEntry
            />
          </View>

          {/* ── Section 2: Select Role ── */}
          <View style={styles.sectionHeader}>
            <Ionicons name="id-card-outline" size={20} color={C.teal} />
            <Text style={styles.sectionTitle}>Select Role</Text>
          </View>
          <View style={styles.roleGrid}>
            <RoleCard
              roleKey="system"
              label="System Admin"
              subtitle="Day-to-day operations"
              iconName="cog-outline"
              selected={adminRole === 'system'}
              onPress={() => handleRoleSelect('system')}
            />
            <RoleCard
              roleKey="super"
              label="Super Admin"
              subtitle="Full system access"
              iconName="shield-check-outline"
              selected={adminRole === 'super'}
              onPress={() => handleRoleSelect('super')}
            />
          </View>

          {/* ── Section 3: Permissions ── */}
          <View style={styles.sectionHeader}>
            <Ionicons name="lock-closed-outline" size={20} color={C.teal} />
            <Text style={styles.sectionTitle}>Permissions Settings</Text>
          </View>
          <View style={[styles.card, { padding: 0 }]}>
            {PERMISSIONS.map((perm, idx) => (
              <PermissionRow
                key={perm.key}
                perm={perm}
                value={permissions[perm.key]}
                onChange={() => togglePerm(perm.key)}
                isLast={idx === PERMISSIONS.length - 1}
              />
            ))}
          </View>

          {/* Bottom spacer so content clears the sticky footer */}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* ── Sticky footer CTA — matches template ── */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.createBtn, loading && { opacity: 0.7 }]}
            onPress={handleCreate}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={C.white} />
            ) : (
              <>
                <Ionicons name="person-add-outline" size={20} color={C.white} />
                <Text style={styles.createBtnText}>Create Administrator</Text>
              </>
            )}
          </TouchableOpacity>
          <Text style={styles.footerNote}>
            An invitation link will be sent to the email address.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.navy,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  headerIconBtn: {
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 20,
  },
  headerTitle: {
    color: C.white, fontSize: 18, fontWeight: '700',
    flex: 1, textAlign: 'center',
  },

  // ── Scroll ──
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },

  // ── Hero banner ──
  heroBanner: {
    borderRadius: 18,
    backgroundColor: C.tealDark,
    height: 148,
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  // Subtle dot-grid overlay (approximated in RN via absolute positioned view)
  heroDotGrid: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.08,
    backgroundColor: 'transparent',
  },
  heroText: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 10,
  },

  // ── Section header ──
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    marginTop: 4,
  },
  sectionTitle: { fontSize: 17, fontWeight: '600', color: C.textPrimary },

  // ── Card ──
  card: {
    backgroundColor: C.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.cardBorder,
    padding: 16,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#0D7A6B',
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },

  // ── Field ──
  fieldWrap: { marginBottom: 14 },
  fieldLabel: {
    fontSize: 11, fontWeight: '700', color: C.outline,
    letterSpacing: 0.5, marginBottom: 6, marginLeft: 2,
  },
  inputRow: { position: 'relative' },
  eyeBtn:   { position: 'absolute', right: 14, top: 14 },
  input: {
    height: 52,
    backgroundColor: C.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.outlineVar,
    paddingHorizontal: 14,
    fontSize: 14,
    color: C.textPrimary,
  },

  // ── Role cards ──
  roleGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  roleCard: {
    flex: 1,
    backgroundColor: C.white,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#0D7A6B',
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  roleCardActive: {
    backgroundColor: C.teal,
    borderColor: C.teal,
  },
  roleIconCircle: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: C.tealLight,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  roleIconCircleActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  roleCardLabel: { fontSize: 14, fontWeight: '600', color: C.textPrimary, textAlign: 'center' },
  roleCardLabelActive: { color: C.white },
  roleCardSub:   { fontSize: 11, color: C.textMuted, marginTop: 2, textAlign: 'center' },
  roleCardSubActive: { color: 'rgba(255,255,255,0.72)' },

  // ── Permission rows ──
  permRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  permRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(189,201,197,0.3)',
  },
  permLeft:   { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  permIconBox:{
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: C.tealLight,
    alignItems: 'center', justifyContent: 'center',
  },
  permLabel: { fontSize: 14, color: C.textPrimary, flex: 1 },

  // ── Footer ──
  footer: {
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderTopColor: 'rgba(189,201,197,0.3)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingBottom: Platform.OS === 'ios' ? 24 : 14,
  },
  createBtn: {
    height: 52,
    backgroundColor: C.teal,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 3,
    shadowColor: C.teal,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  createBtnText: { color: C.white, fontSize: 16, fontWeight: '700' },
  footerNote: {
    textAlign: 'center', fontSize: 12,
    color: C.outline, marginTop: 8,
  },

  // ── Done state ──
  doneWrap: {
    flex: 1, alignItems: 'center',
    justifyContent: 'center', padding: 32,
    backgroundColor: C.bg,
  },
  doneIconCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: C.tealLight,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
  },
  doneTitle: { fontSize: 26, fontWeight: '800', color: C.textPrimary, marginBottom: 12 },
  doneSub: {
    fontSize: 14, color: C.textMuted,
    textAlign: 'center', lineHeight: 22, marginBottom: 32,
  },
  doneBtn: {
    backgroundColor: C.teal, borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 32,
    marginBottom: 14, width: '100%', alignItems: 'center',
  },
  doneBtnText:    { color: C.white, fontSize: 15, fontWeight: '800' },
  addAnotherBtn:  { paddingVertical: 10 },
  addAnotherText: { color: C.teal, fontSize: 14, fontWeight: '600' },
});