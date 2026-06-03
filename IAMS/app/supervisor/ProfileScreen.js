import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert,
  ActivityIndicator, useWindowDimensions
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../constants/colors';
import api from '../../api/axios';

const TEAL = '#1B6B5A';
const LIGHT = '#F0F4F3';

export default function SupervisorProfileScreen({ navigation }) {
  const { user, logout } = useAuth();
  const { width } = useWindowDimensions();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      // Fetch supervisor dashboard data for additional details
      const res = await api.get('/supervisors/dashboard');
      const supervisorData = res.data?.supervisor || {};
      
      // Combine with user data from auth context
      setProfile({
        full_name: user?.full_name || supervisorData.full_name || 'Supervisor',
        email: user?.email || supervisorData.email || '',
        phone: user?.phone || supervisorData.phone || '',
        department: user?.department || supervisorData.department || '',
        office: supervisorData.office || '',
        specialization: supervisorData.specialization || '',
      });
    } catch (err) {
      console.log('Profile fetch error:', err.message);
      // Use user data from auth context as fallback
      setProfile({
        full_name: user?.full_name || 'Supervisor',
        email: user?.email || '',
        phone: user?.phone || '',
        department: user?.department || '',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => logout(),
      },
    ]);
  };

  const profileData = profile || {
    full_name: user?.full_name || 'Supervisor',
    email: user?.email || '',
    phone: user?.phone || '',
  };

  const initials = profileData.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'S';

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={{ width: 60 }} />
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={TEAL} />
          </View>
        ) : (
          <>
            {/* Profile Card */}
            <View style={styles.profileCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <Text style={styles.name}>{profileData.full_name}</Text>
              <Text style={styles.role}>Supervisor</Text>
            </View>

            {/* Contact Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Contact Information</Text>

              <View style={styles.infoRow}>
                <Text style={styles.label}>Email</Text>
                <Text style={styles.value}>{profileData.email || 'Not provided'}</Text>
              </View>

              {profileData.phone && (
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Phone</Text>
                  <Text style={styles.value}>{profileData.phone}</Text>
                </View>
              )}

              {profileData.department && (
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Department</Text>
                  <Text style={styles.value}>{profileData.department}</Text>
                </View>
              )}

              {profileData.office && (
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Office</Text>
                  <Text style={styles.value}>{profileData.office}</Text>
                </View>
              )}

              {profileData.specialization && (
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Specialization</Text>
                  <Text style={styles.value}>{profileData.specialization}</Text>
                </View>
              )}
            </View>

            {/* Settings */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Settings</Text>

              <TouchableOpacity style={styles.settingRow}>
                <Text style={styles.settingLabel}>Change Password</Text>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.settingRow}>
                <Text style={styles.settingLabel}>Notification Preferences</Text>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Logout Button */}
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F4F4',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    fontSize: 16,
    color: TEAL,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  },

  // Profile Card
  profileCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 20,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: TEAL,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  role: {
    fontSize: 14,
    color: '#999999',
  },

  // Section
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Info Row
  infoRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  label: {
    fontSize: 12,
    color: '#999999',
    fontWeight: '600',
    marginBottom: 4,
  },
  value: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '500',
  },

  // Setting Row
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingLabel: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '500',
  },
  chevron: {
    fontSize: 20,
    color: '#999999',
  },

  // Logout Button
  logoutButton: {
    marginHorizontal: 16,
    marginVertical: 24,
    paddingVertical: 14,
    backgroundColor: '#FFE5E5',
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#C62828',
  },
});
