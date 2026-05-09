import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, RefreshControl
} from 'react-native';
import { COLORS } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [attachment, setAttachment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [attachRes] = await Promise.all([
        api.get('/students/my-attachment').catch(() => ({ data: null })),
      ]);
      setAttachment(attachRes.data);
      setProfile(user);
    } catch (err) {
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile?.full_name?.charAt(0).toUpperCase() || '?'}
            </Text>
          </View>
        </View>
        <Text style={styles.name}>{profile?.full_name || 'Student'}</Text>
        <Text style={styles.email}>{profile?.email}</Text>
      </View>

      {/* Profile Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 Personal Information</Text>
        
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Registration Number:</Text>
            <Text style={styles.infoValue}>{profile?.reg_number || 'N/A'}</Text>
          </View>
          
          <View style={[styles.infoRow, { borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 12, marginTop: 12 }]}>
            <Text style={styles.infoLabel}>Department:</Text>
            <Text style={styles.infoValue}>{profile?.department || 'N/A'}</Text>
          </View>
          
          <View style={[styles.infoRow, { borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 12, marginTop: 12 }]}>
            <Text style={styles.infoLabel}>Year of Study:</Text>
            <Text style={styles.infoValue}>{profile?.year_of_study || 'N/A'}</Text>
          </View>
        </View>
      </View>

      {/* Attachment Information */}
      {attachment && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📍 Current Attachment</Text>
          
          <View style={styles.attachmentCard}>
            <View style={styles.attachmentHeader}>
              <Text style={styles.attachmentOrg}>{attachment.org_name}</Text>
              <View style={[styles.statusBadge, {
                backgroundColor: attachment.status === 'ongoing' ? '#E8F5E9' : '#FFF3E0'
              }]}>
                <Text style={[styles.statusText, {
                  color: attachment.status === 'ongoing' ? '#2E7D32' : COLORS.primary
                }]}>
                  {attachment.status}
                </Text>
              </View>
            </View>
            
            <View style={styles.attachmentDetails}>
              <Text style={styles.attachmentDetail}>📅 Start: {new Date(attachment.start_date).toLocaleDateString()}</Text>
              <Text style={styles.attachmentDetail}>📅 End: {new Date(attachment.end_date).toLocaleDateString()}</Text>
              {attachment.supervisor_name && (
                <Text style={styles.attachmentDetail}>👨‍🏫 Supervisor: {attachment.supervisor_name}</Text>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutBtnText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F4F4',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: COLORS.gray,
  },
  header: {
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 30,
  },
  avatarContainer: {
    marginBottom: 15,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: COLORS.white,
    fontSize: 32,
    fontWeight: 'bold',
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 5,
  },
  email: {
    fontSize: 13,
    color: COLORS.primary,
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.darkGray,
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 13,
    color: COLORS.gray,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.darkGray,
    fontWeight: '700',
  },
  attachmentCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  attachmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  attachmentOrg: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.darkGray,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  attachmentDetails: {
    gap: 8,
  },
  attachmentDetail: {
    fontSize: 13,
    color: COLORS.gray,
  },
  logoutBtn: {
    backgroundColor: '#C62828',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  logoutBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
