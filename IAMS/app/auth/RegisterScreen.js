import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, ScrollView
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import api from '../../api/axios';

export default function RegisterScreen({ navigation }) {
  const { theme } = useTheme();
  const [role, setRole] = useState('student');
  const [form, setForm] = useState({
  full_name: '', reg_number: '', email: '',
  password: '', department: '', year_of_study: '',
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

  const handleChange = (key, value) => setForm({ ...form, [key]: value });

  const handleRegister = async () => {
    if (!form.full_name || !form.email || !form.password) {
      Alert.alert('Error', 'Please fill in all required fields');
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
    { key: 'student', label: '🎓 Student', desc: 'Attachment student' },
    { key: 'supervisor', label: '👨‍🏫 Supervisor', desc: 'Academic supervisor' },
    { key: 'host_org', label: '🏢 Host Org', desc: 'Company offering attachment' },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.secondary }]}>
        <Text style={[styles.title, { color: theme.primary }]}>Create Account</Text>
        <Text style={[styles.subtitle, { color: theme.white }]}>IAMS — Baraton University</Text>
      </View>

      <View style={styles.form}>

        <Text style={[styles.sectionTitle, { color: theme.secondary }]}>I am registering as:</Text>
        <View style={styles.roleContainer}>
          {roles.map((r) => (
            <TouchableOpacity
              key={r.key}
              style={[
                styles.roleCard,
                {
                  borderColor: role === r.key ? theme.primary : theme.gray,
                  backgroundColor: role === r.key ? `${theme.primary}15` : theme.surface,
                }
              ]}
              onPress={() => setRole(r.key)}
            >
              <Text style={styles.roleIcon}>{r.label.split(' ')[0]}</Text>
              <Text style={[styles.roleLabel, role === r.key && { color: theme.primary }]}>
                {r.label.split(' ')[1]}
              </Text>
              <Text style={[styles.roleDesc, role === r.key && { color: theme.primary }]}>
                {r.desc}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: theme.secondary }]}>Personal Information</Text>

        <Text style={[styles.label, { color: theme.text }]}>Full Name *</Text>
        <TextInput
          style={[styles.input, { borderColor: theme.gray, backgroundColor: theme.surface, color: theme.text }]}
          placeholder="e.g. Ngetich Timothy"
          placeholderTextColor={theme.textSecondary}
          value={form.full_name}
          onChangeText={(v) => handleChange('full_name', v)}
        />

        <Text style={[styles.label, { color: theme.text }]}>Email Address *</Text>
        <TextInput
          style={[styles.input, { borderColor: theme.gray, backgroundColor: theme.surface, color: theme.text }]}
          placeholder="e.g. you@ueab.ac.ke"
          placeholderTextColor={theme.textSecondary}
          value={form.email}
          onChangeText={(v) => handleChange('email', v)}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={[styles.label, { color: theme.text }]}>Password *</Text>
        <TextInput
          style={[styles.input, { borderColor: theme.gray, backgroundColor: theme.surface, color: theme.text }]}
          placeholder="Min 6 characters"
          placeholderTextColor={theme.textSecondary}
          value={form.password}
          onChangeText={(v) => handleChange('password', v)}
          secureTextEntry
        />

        <Text style={[styles.label, { color: theme.text }]}>Phone Number</Text>
        <TextInput
          style={[styles.input, { borderColor: theme.gray, backgroundColor: theme.surface, color: theme.text }]}
          placeholder="e.g. 0712345678"
          placeholderTextColor={theme.textSecondary}
          value={form.phone}
          onChangeText={(v) => handleChange('phone', v)}
          keyboardType="phone-pad"
        />

        {role === 'student' && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.secondary }]}>Student Details</Text>
            <Text style={[styles.label, { color: theme.text }]}>Registration Number *</Text>
            <TextInput
              style={[styles.input, { borderColor: theme.gray, backgroundColor: theme.surface, color: theme.text }]}
              placeholder="e.g. SNGEKI2311"
              placeholderTextColor={theme.textSecondary}
              value={form.reg_number}
              onChangeText={(v) => handleChange('reg_number', v)}
              autoCapitalize="characters"
            />
            <Text style={[styles.label, { color: theme.text }]}>Department</Text>
            <TextInput
              style={[styles.input, { borderColor: theme.gray, backgroundColor: theme.surface, color: theme.text }]}
              placeholder="e.g. Information Systems"
              placeholderTextColor={theme.textSecondary}
              value={form.department}
              onChangeText={(v) => handleChange('department', v)}
            />
            <Text style={[styles.label, { color: theme.text }]}>Year of Study</Text>
            <TextInput
              style={[styles.input, { borderColor: theme.gray, backgroundColor: theme.surface, color: theme.text }]}
              placeholder="e.g. 4"
              placeholderTextColor={theme.textSecondary}
              value={form.year_of_study}
              onChangeText={(v) => handleChange('year_of_study', v)}
              keyboardType="numeric"
            />
          </>
        )}

        {role === 'supervisor' && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.secondary }]}>Supervisor Details</Text>
            <Text style={[styles.label, { color: theme.text }]}>Department</Text>
            <TextInput
              style={[styles.input, { borderColor: theme.gray, backgroundColor: theme.surface, color: theme.text }]}
              placeholder="e.g. Computer Science"
              placeholderTextColor={theme.textSecondary}
              value={form.department}
              onChangeText={(v) => handleChange('department', v)}
            />
          </>
        )}

        {role === 'host_org' && (
  <>
    <Text style={styles.sectionTitle}>Organization Information</Text>

    <Text style={styles.label}>Organization Name *</Text>
    <TextInput style={styles.input} placeholder="e.g. Safaricom PLC"
      value={form.org_name} onChangeText={(v) => handleChange('org_name', v)} />

    <Text style={styles.label}>Industry/Sector *</Text>
    <TextInput style={styles.input} placeholder="e.g. Telecommunications"
      value={form.industry} onChangeText={(v) => handleChange('industry', v)} />

    <Text style={styles.label}>Physical Address *</Text>
    <TextInput style={styles.input} placeholder="e.g. Nairobi, Westlands"
      value={form.location} onChangeText={(v) => handleChange('location', v)} />

    <Text style={styles.label}>Official Email *</Text>
    <TextInput style={styles.input} placeholder="e.g. hr@company.com"
      value={form.official_email} onChangeText={(v) => handleChange('official_email', v)}
      keyboardType="email-address" autoCapitalize="none" />

    <Text style={styles.label}>Website (optional)</Text>
    <TextInput style={styles.input} placeholder="e.g. https://company.com"
      value={form.website} onChangeText={(v) => handleChange('website', v)}
      autoCapitalize="none" />

    <Text style={styles.label}>Brief Description</Text>
    <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
      placeholder="Brief description of your organization..."
      value={form.description} onChangeText={(v) => handleChange('description', v)}
      multiline />

    <Text style={styles.sectionTitle}>Contact Person</Text>

    <Text style={styles.label}>Contact Person Full Name *</Text>
    <TextInput style={styles.input} placeholder="e.g. Jane Doe"
      value={form.contact_person} onChangeText={(v) => handleChange('contact_person', v)} />

    <Text style={styles.label}>Position/Job Title *</Text>
    <TextInput style={styles.input} placeholder="e.g. HR Manager"
      value={form.contact_position} onChangeText={(v) => handleChange('contact_position', v)} />

    <Text style={styles.sectionTitle}>Attachment Opportunity</Text>

    <Text style={styles.label}>Department Offering Attachment *</Text>
    <TextInput style={styles.input} placeholder="e.g. IT Department"
      value={form.department_offering} onChangeText={(v) => handleChange('department_offering', v)} />

    <Text style={styles.label}>Roles/Tasks Student Will Undertake *</Text>
    <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
      placeholder="Describe what the student will do..."
      value={form.roles_tasks} onChangeText={(v) => handleChange('roles_tasks', v)}
      multiline />

    <Text style={styles.label}>Required Skills/Specialization</Text>
    <TextInput style={styles.input} placeholder="e.g. Programming, Networking"
      value={form.required_skills} onChangeText={(v) => handleChange('required_skills', v)} />

    <Text style={styles.label}>Number of Available Slots *</Text>
    <TextInput style={styles.input} placeholder="e.g. 3"
      value={form.available_slots} onChangeText={(v) => handleChange('available_slots', v)}
      keyboardType="numeric" />

    <Text style={styles.label}>Attachment Duration</Text>
    <TextInput style={styles.input} placeholder="e.g. 3 months"
      value={form.attachment_duration} onChangeText={(v) => handleChange('attachment_duration', v)} />

    <Text style={styles.label}>Work Mode</Text>
    <View style={styles.workModeRow}>
      {['onsite', 'remote', 'hybrid'].map((mode) => (
        <TouchableOpacity
          key={mode}
          style={[styles.workModeBtn,
            form.work_mode === mode && styles.workModeBtnActive]}
          onPress={() => handleChange('work_mode', mode)}
        >
          <Text style={[styles.workModeBtnText,
            form.work_mode === mode && styles.workModeBtnTextActive]}>
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>

    <Text style={styles.sectionTitle}>Internal Supervision</Text>

    <Text style={styles.label}>Internal Supervisor Name</Text>
    <TextInput style={styles.input} placeholder="e.g. John Smith"
      value={form.internal_supervisor} onChangeText={(v) => handleChange('internal_supervisor', v)} />

    <Text style={styles.label}>Supervisor Position</Text>
    <TextInput style={styles.input} placeholder="e.g. Senior Engineer"
      value={form.supervisor_position} onChangeText={(v) => handleChange('supervisor_position', v)} />

    <Text style={styles.sectionTitle}>Support Provided</Text>

    <Text style={styles.label}>Allowance/Stipend</Text>
    <TextInput style={styles.input} placeholder="e.g. KES 5,000/month or None"
      value={form.allowance} onChangeText={(v) => handleChange('allowance', v)} />

    <Text style={styles.label}>Resources/Equipment Provided</Text>
    <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
      placeholder="e.g. Laptop, internet access..."
      value={form.resources_provided} onChangeText={(v) => handleChange('resources_provided', v)}
      multiline />
  </>
)}

        <TouchableOpacity style={[styles.registerBtn, loading && { opacity: 0.6 }]} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.registerBtnText}>Create Account</Text>}
        </TouchableOpacity>

        <View style={styles.loginLink}>
          <Text style={styles.loginLinkText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={[styles.loginLinkText, { color: theme.primary, fontWeight: '700' }]}>Login</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F4F4' },
  header: { padding: 20, paddingTop: 40, alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 5 },
  subtitle: { fontSize: 13, opacity: 0.7 },
  form: { paddingHorizontal: 16, paddingBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginTop: 18, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    fontSize: 14,
    minHeight: 44,
  },
  roleContainer: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  roleCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
  },
  roleIcon: { fontSize: 28, marginBottom: 6 },
  roleLabel: { fontSize: 12, fontWeight: '700', marginBottom: 2 },
  roleDesc: { fontSize: 10, opacity: 0.7, textAlign: 'center' },
  workModeRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  workModeBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CCC',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
  },
  workModeBtnActive: { borderColor: '#2196F3', backgroundColor: '#E3F2FD' },
  workModeBtnText: { fontSize: 13, fontWeight: '600', color: '#666' },
  workModeBtnTextActive: { color: '#2196F3' },
  registerBtn: {
    backgroundColor: '#2196F3',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 14,
  },
  registerBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  loginLink: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  loginLinkText: { fontSize: 13, color: '#666' },
});