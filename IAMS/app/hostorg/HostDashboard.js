import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, RefreshControl
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../constants/colors';
import api from '../../api/axios';

export default function HostDashboard({ navigation }) {
  const { user, logout } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/host-orgs/dashboard');
      setData(res.data);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  // Auto-refresh every 30 seconds when dashboard is focused and feature is enabled
  useEffect(() => {
    if (!autoRefreshEnabled) return;

    const interval = setInterval(() => {
      fetchDashboard();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [autoRefreshEnabled]);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const handleUpdateStatus = (attachmentId, studentName, newStatus) => {
    const isAccepting = newStatus === 'ongoing';
    Alert.alert(
      isAccepting ? 'Confirm Placement' : 'Reject Application',
      isAccepting
        ? `Accept ${studentName}'s application? This will use one of your available slots.`
        : `Reject ${studentName}'s application?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isAccepting ? 'Confirm ✓' : 'Reject ✗',
          style: isAccepting ? 'default' : 'destructive',
          onPress: async () => {
            try {
              await api.put(`/host-orgs/application/${attachmentId}`, { status: newStatus });
              Alert.alert('Success!', `Application ${isAccepting ? 'accepted' : 'rejected'} successfully!`);
              fetchDashboard();
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to update application');
            }
          }
        }
      ]
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  const statusColor = (status) => {
    switch (status) {
      case 'ongoing': return { bg: '#E8F5E9', text: '#2E7D32' };
      case 'pending': return { bg: '#FFF3E0', text: COLORS.primary };
      case 'completed': return { bg: '#E3F2FD', text: COLORS.secondary };
      case 'rejected': return { bg: '#FFEBEE', text: '#C62828' };
      case 'approved': return { bg: '#E8F5E9', text: '#2E7D32' };
      default: return { bg: '#F4F4F4', text: COLORS.gray };
    }
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Host Organization 🏢</Text>
            <Text style={styles.name}>{data?.org?.org_name || 'Organization'}</Text>
            <Text style={styles.location}>📍 {data?.org?.location || 'Location not set'}</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Approval status */}
        <View style={[styles.approvalBadge, {
          backgroundColor: data?.org?.is_approved ? '#E8F5E9' : '#FFF3E0'
        }]}>
          <Text style={[styles.approvalText, {
            color: data?.org?.is_approved ? '#2E7D32' : COLORS.primary
          }]}>
            {data?.org?.is_approved
              ? '✅ Approved Organization'
              : '⏳ Pending Admin Approval'}
          </Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{data?.stats?.total || 0}</Text>
            <Text style={styles.statLabel}>Total{'\n'}Applications</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{data?.stats?.pending || 0}</Text>
            <Text style={styles.statLabel}>Pending{'\n'}Review</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{data?.stats?.ongoing || 0}</Text>
            <Text style={styles.statLabel}>Active{'\n'}Students</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{data?.stats?.completed || 0}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsRow}>
        {[
          { label: 'Update Profile', icon: '✏️', screen: 'HostProfile', color: COLORS.secondary },
          { label: 'Available Slots', icon: '📋', screen: 'HostSlots', color: COLORS.primary },
          { label: 'Submit Evaluation', icon: '⭐', screen: 'HostEvaluation', color: '#2E7D32' },
          { label: 'Notifications', icon: '🔔', screen: 'Notifications', color: '#6A1B9A' },
        ].map((item) => (
          <TouchableOpacity
            key={item.screen}
            style={styles.actionCard}
            onPress={() => navigation.navigate(item.screen)}
          >
            <View style={[styles.actionIcon, { backgroundColor: item.color }]}>
              <Text style={{ fontSize: 22 }}>{item.icon}</Text>
            </View>
            <Text style={styles.actionLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Org Info Card */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Organization Details</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Contact Person</Text>
          <Text style={styles.infoValue}>{data?.org?.contact_person || '—'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Phone</Text>
          <Text style={styles.infoValue}>{data?.org?.phone || '—'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Available Slots</Text>
          <Text style={styles.infoValue}>{data?.org?.available_slots || 0}</Text>
        </View>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => navigation.navigate('HostProfile', { org: data?.org })}
        >
          <Text style={styles.editBtnText}>Edit Profile ✏️</Text>
        </TouchableOpacity>
      </View>

      {/* Applications */}
      <Text style={styles.sectionTitle}>Student Applications</Text>
      {data?.applications?.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyTitle}>No Applications Yet</Text>
          <Text style={styles.emptyText}>
            Students will apply for attachment at your organization here.
          </Text>
        </View>
      ) : (
        data?.applications?.map((app, index) => (
          <View key={index} style={styles.appCard}>
            <View style={styles.appHeader}>
              <View style={styles.appAvatar}>
                <Text style={styles.avatarText}>
                  {app.full_name?.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.appInfo}>
                <Text style={styles.appName}>{app.full_name}</Text>
                <Text style={styles.appReg}>{app.reg_number}</Text>
                <Text style={styles.appDept}>{app.department} • Year {app.year_of_study}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: statusColor(app.status).bg }]}>
                <Text style={[styles.statusText, { color: statusColor(app.status).text }]}>
                  {app.status}
                </Text>
              </View>
            </View>

            {/* Action buttons for pending applications */}
            {app.status === 'pending' && (
              <View style={styles.appActions}>
                <TouchableOpacity
                  style={styles.rejectBtn}
                  onPress={() => handleUpdateStatus(app.attachment_id, app.full_name, 'rejected')}
                >
                  <Text style={styles.rejectBtnText}>✗ Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmBtn}
                  onPress={() => handleUpdateStatus(app.attachment_id, app.full_name, 'ongoing')}
                >
                  <Text style={styles.confirmBtnText}>✓ Confirm Placement</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Phone for ongoing students */}
            {app.status === 'ongoing' && app.phone && (
              <Text style={styles.appPhone}>📞 {app.phone}</Text>
            )}
          </View>
        ))
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F4F4' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: COLORS.gray },
  header: {
    backgroundColor: COLORS.secondary,
    paddingTop: 55,
    paddingHorizontal: 20,
    paddingBottom: 25,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  greeting: { color: '#8899AA', fontSize: 13 },
  name: { color: COLORS.white, fontSize: 20, fontWeight: 'bold', marginTop: 2 },
  location: { color: COLORS.primary, fontSize: 12, marginTop: 3 },
  logoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  logoutText: { color: COLORS.white, fontSize: 13 },
  approvalBadge: {
    borderRadius: 10, padding: 8,
    marginBottom: 15, alignSelf: 'flex-start',
  },
  approvalText: { fontSize: 12, fontWeight: '700' },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 15,
    padding: 15,
    justifyContent: 'space-around',
  },
  statBox: { alignItems: 'center', flex: 1 },
  statNum: { color: COLORS.primary, fontSize: 20, fontWeight: 'bold' },
  statLabel: { color: '#AABBCC', fontSize: 10, textAlign: 'center', marginTop: 3 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  sectionTitle: {
    fontSize: 16, fontWeight: '700',
    color: COLORS.darkGray,
    marginLeft: 16, marginTop: 20, marginBottom: 10,
  },
  actionsRow: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 10,
  },
  actionCard: {
    backgroundColor: COLORS.white,
    width: '46%', margin: '2%',
    padding: 16, borderRadius: 16,
    alignItems: 'center', elevation: 2,
  },
  actionIcon: {
    width: 50, height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionLabel: { fontSize: 12, fontWeight: '700', color: COLORS.darkGray, textAlign: 'center' },
  infoCard: {
    backgroundColor: COLORS.white,
    margin: 16, padding: 16,
    borderRadius: 16, elevation: 2,
  },
  infoTitle: { fontSize: 15, fontWeight: '700', color: COLORS.secondary, marginBottom: 12 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F4F4F4',
  },
  infoLabel: { fontSize: 13, color: COLORS.gray },
  infoValue: { fontSize: 13, fontWeight: '600', color: COLORS.darkGray },
  editBtn: {
    backgroundColor: COLORS.secondary,
    padding: 10, borderRadius: 10,
    alignItems: 'center', marginTop: 12,
  },
  editBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 13 },
  emptyCard: {
    backgroundColor: COLORS.white,
    margin: 16, padding: 30,
    borderRadius: 16, alignItems: 'center',
    elevation: 2,
  },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.darkGray },
  emptyText: { fontSize: 13, color: COLORS.gray, textAlign: 'center', marginTop: 6 },
  appCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16, marginBottom: 12,
    padding: 14, borderRadius: 16,
    elevation: 2,
  },
  appHeader: { flexDirection: 'row', alignItems: 'center' },
  appAvatar: {
    width: 44, height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
  appInfo: { flex: 1 },
  appName: { fontSize: 14, fontWeight: '700', color: COLORS.darkGray },
  appReg: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  appDept: { fontSize: 11, color: COLORS.primary, marginTop: 2 },
  statusBadge: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 10,
  },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  appActions: {
    flexDirection: 'row',
    marginTop: 12, gap: 10,
  },
  rejectBtn: {
    flex: 1, padding: 10,
    borderRadius: 10, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#C62828',
  },
  rejectBtnText: { color: '#C62828', fontWeight: '700', fontSize: 13 },
  confirmBtn: {
    flex: 2, padding: 10,
    borderRadius: 10, alignItems: 'center',
    backgroundColor: '#2E7D32',
  },
  confirmBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 13 },
  appPhone: { fontSize: 12, color: COLORS.gray, marginTop: 8 },
});