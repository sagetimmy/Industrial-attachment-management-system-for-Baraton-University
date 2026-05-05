import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, ScrollView
} from 'react-native';
import { COLORS } from '../../constants/colors';
import api from '../../api/axios';

export default function RegisterScreen({ navigation }) {
  const [role, setRole] = useState('student');
  const [form, setForm] = useState({
    full_name: '', reg_number: '', email: '',
    password: '', department: '', year_of_study: '',
    org_name: '', location: '', contact_person: '', phone: '',
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
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>IAMS — Baraton University</Text>
      </View>

      <View style={styles.form}>

        <Text style={styles.sectionTitle}>I am registering as:</Text>
        <View style={styles.roleContainer}>
          {roles.map((r) => (
            <TouchableOpacity
              key={r.key}
              style={[styles.roleCard, role === r.key && styles.roleCardActive]}
              onPress={() => setRole(r.key)}
            >
              <Text style={styles.roleIcon}>{r.label.split(' ')[0]}</Text>
              <Text style={[styles.roleLabel, role === r.key && styles.roleLabelActive]}>
                {r.label.split(' ')[1]}
              </Text>
              <Text style={[styles.roleDesc, role === r.key && styles.roleDescActive]}>
                {r.desc}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Personal Information</Text>

        <Text style={styles.label}>Full Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Ngetich Timothy"
          value={form.full_name}
          onChangeText={(v) => handleChange('full_name', v)}
        />

        <Text style={styles.label}>Email Address *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. you@ueab.ac.ke"
          value={form.email}
          onChangeText={(v) => handleChange('email', v)}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Password *</Text>
        <TextInput
          style={styles.input}
          placeholder="Min 6 characters"
          value={form.password}
          onChangeText={(v) => handleChange('password', v)}
          secureTextEntry
        />

        <Text style={styles.label}>Phone Number</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 0712345678"
          value={form.phone}
          onChangeText={(v) => handleChange('phone', v)}
          keyboardType="phone-pad"
        />

        {role === 'student' && (
          <>
            <Text style={styles.sectionTitle}>Student Details</Text>
            <Text style={styles.label}>Registration Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. SNGEKI2311"
              value={form.reg_number}
              onChangeText={(v) => handleChange('reg_number', v)}
              autoCapitalize="characters"
            />
            <Text style={styles.label}>Department</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Information Systems"
              value={form.department}
              onChangeText={(v) => handleChange('department', v)}
            />
            <Text style={styles.label}>Year of Study</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 4"
              value={form.year_of_study}
              onChangeText={(v) => handleChange('year_of_study', v)}
              keyboardType="numeric"
            />
          </>
        )}

        {role === 'supervisor' && (
          <>
            <Text style={styles.sectionTitle}>Supervisor Details</Text>
            <Text style={styles.label}>Department</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Computer Science"
              value={form.department}
              onChangeText={(v) => handleChange('department', v)}
            />
          </>
        )}

        {role === 'host_org' && (
          <>
            <Text style={styles.sectionTitle}>Organization Details</Text>
            <Text style={styles.label}>Organization Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Safaricom PLC"
              value={form.org_name}
              onChangeText={(v) => handleChange('org_name', v)}
            />
            <Text style={styles.label}>Location</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Nairobi, Kenya"
              value={form.location}
              onChangeText={(v) => handleChange('location', v)}
            />
            <Text style={styles.label}>Contact Person</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. HR Manager name"
              value={form.contact_person}
              onChangeText={(v) => handleChange('contact_person', v)}
            />
          </>
        )}

        <TouchableOpacity
          style={styles.button}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color={COLORS.white} />
            : <Text style={styles.buttonText}>Create Account</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.link}>Already have an account? Login</Text>
        </TouchableOpacity>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  header: {
    backgroundColor: COLORS.secondary,
    paddingTop: 60, paddingBottom: 30,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  title: { fontSize: 28, fontWeight: 'bold', color: COLORS.primary },
  subtitle: { fontSize: 14, color: COLORS.white, marginTop: 4 },
  form: { padding: 20, marginTop: 10 },
  sectionTitle: {
    fontSize: 15, fontWeight: '700',
    color: COLORS.secondary, marginBottom: 12, marginTop: 8,
  },
  roleContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  roleCard: {
    flex: 1, marginHorizontal: 4,
    padding: 12, borderRadius: 12,
    borderWidth: 2, borderColor: COLORS.gray,
    alignItems: 'center', backgroundColor: COLORS.lightGray,
  },
  roleCardActive: { borderColor: COLORS.primary, backgroundColor: '#FFF3E0' },
  roleIcon: { fontSize: 24, marginBottom: 4 },
  roleLabel: { fontSize: 12, fontWeight: '700', color: COLORS.darkGray },
  roleLabelActive: { color: COLORS.primary },
  roleDesc: { fontSize: 9, color: COLORS.gray, textAlign: 'center', marginTop: 2 },
  roleDescActive: { color: COLORS.primary },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.darkGray, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: COLORS.gray,
    borderRadius: 10, padding: 12,
    fontSize: 15, marginBottom: 16,
    backgroundColor: COLORS.lightGray,
  },
  button: {
    backgroundColor: COLORS.primary,
    padding: 15, borderRadius: 10,
    alignItems: 'center', marginTop: 8,
  },
  buttonText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
  link: { textAlign: 'center', marginTop: 20, color: COLORS.secondary, fontSize: 14, marginBottom: 40 },
});