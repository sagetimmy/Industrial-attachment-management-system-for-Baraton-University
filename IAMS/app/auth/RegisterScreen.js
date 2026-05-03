import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, ScrollView
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../constants/colors';

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [form, setForm] = useState({
    full_name: '', reg_number: '', email: '',
    password: '', department: '', year_of_study: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (key, value) => setForm({ ...form, [key]: value });

  const handleRegister = async () => {
    if (!form.full_name || !form.email || !form.password || !form.reg_number) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    setLoading(true);
    try {
      await register({ ...form, role: 'student' });
      navigation.replace('StudentDashboard');
    } catch (err) {
      Alert.alert('Registration Failed', err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Student Registration</Text>
      </View>

      <View style={styles.form}>
        {[
          { label: 'Full Name *', key: 'full_name', placeholder: 'e.g. Ngetich Timothy' },
          { label: 'Registration Number *', key: 'reg_number', placeholder: 'e.g. SNGEKI2311' },
          { label: 'Email Address *', key: 'email', placeholder: 'e.g. you@ueab.ac.ke', type: 'email-address' },
          { label: 'Password *', key: 'password', placeholder: 'Min 6 characters', secure: true },
          { label: 'Department', key: 'department', placeholder: 'e.g. Information Systems' },
          { label: 'Year of Study', key: 'year_of_study', placeholder: 'e.g. 4', type: 'numeric' },
        ].map(({ label, key, placeholder, type, secure }) => (
          <View key={key}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
              style={styles.input}
              placeholder={placeholder}
              value={form[key]}
              onChangeText={(v) => handleChange(key, v)}
              keyboardType={type || 'default'}
              secureTextEntry={secure || false}
              autoCapitalize={key === 'email' ? 'none' : 'words'}
            />
          </View>
        ))}

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
  form: { padding: 24, marginTop: 10 },
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
  link: { textAlign: 'center', marginTop: 20, color: COLORS.secondary, fontSize: 14 },
});