import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../constants/colors';
import api from '../../api/axios';

const TEAL = '#0F6E56';
const BG = '#F0F5F4';

const HostSlots = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [attachments, setAttachments] = useState([]);
  const [updating, setUpdating] = useState(null); // attachment_id being updated

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/host-orgs/ongoing-attachments');
      setAttachments(res.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load placements');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = (attachmentId, studentName, newStatus) => {
    const isApproving = newStatus === 'approved';
    Alert.alert(
      isApproving ? 'Confirm Placement' : 'Reject Application',
      isApproving
        ? `Accept ${studentName}'s application?`
        : `Reject ${studentName}'s application?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isApproving ? 'Confirm ✓' : 'Reject ✗',
          style: isApproving ? 'default' : 'destructive',
          onPress: async () => {
            try {
              setUpdating(attachmentId);
              await api.put(`/host-orgs/application/${attachmentId}`, { status: newStatus });
              Alert.alert('Success!', `Application ${isApproving ? 'approved' : 'rejected'} successfully!`);
              fetchData();
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to update application');
            } finally {
              setUpdating(null);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : parts[0][0].toUpperCase();
  };

  const pendingAttachments = attachments.filter(a => a.status === 'pending');

  if (loading) {
    return (
      <SafeAreaView style={s.safeArea} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.headerBack}>
            <Text style={s.headerBackIcon}>←</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Placement Matching</Text>
          <View style={s.headerRight} />
        </View>
        <View style={s.centered}>
          <ActivityIndicator size="large" color={TEAL} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safeArea} edges={['top']}>
      <View style={s.root}>

        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.headerBack}>
            <Text style={s.headerBackIcon}>←</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Placement Matching</Text>
          <TouchableOpacity style={s.headerRight} onPress={() => navigation.navigate('Notifications')}>
            <Text style={s.bellIcon}>🔔</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={s.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scrollContent}
        >

          {/* Section heading */}
          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>
              Pending Placements ({pendingAttachments.length})
            </Text>
            {pendingAttachments.length > 0 && (
              <View style={s.actionBadge}>
                <Text style={s.actionBadgeText}>ACTION REQUIRED</Text>
              </View>
            )}
          </View>

          {/* Cards */}
          {pendingAttachments.length === 0 ? (
            <View style={s.emptyCard}>
              <Text style={s.emptyIcon}>📭</Text>
              <Text style={s.emptyTitle}>No Pending Placements</Text>
              <Text style={s.emptyText}>All applications have been reviewed.</Text>
            </View>
          ) : (
            pendingAttachments.map((app, index) => (
              <View key={app.attachment_id ?? index} style={s.card}>

                {/* Student row */}
                <View style={s.studentRow}>
                  <View style={s.avatar}>
                    <Text style={s.avatarText}>{getInitials(app.full_name)}</Text>
                  </View>
                  <View style={s.studentInfo}>
                    <Text style={s.studentName}>{app.full_name}</Text>
                    <Text style={s.studentDept}>{app.department || 'Unknown Department'}</Text>
                  </View>
                  <View style={s.pendingBadge}>
                    <Text style={s.pendingBadgeText}>PENDING{'\n'}APPROVAL</Text>
                  </View>
                </View>

                <View style={s.divider} />

                {/* Target company row */}
                <View style={s.companyRow}>
                  <View style={s.companyLogoBox}>
                    <Text style={s.companyLogoText}>🏢</Text>
                  </View>
                  <View style={s.companyInfo}>
                    <Text style={s.companyLabel}>TARGET COMPANY</Text>
                    <Text style={s.companyName}>
                      {app.org_name ? `${app.org_name} — ${app.role || 'Intern'}` : 'Not specified'}
                    </Text>
                  </View>
                  <View style={s.appliedBox}>
                    <Text style={s.appliedLabel}>Applied</Text>
                    <Text style={s.appliedDate}>{formatDate(app.created_at)}</Text>
                  </View>
                </View>

                <View style={s.divider} />

                {/* Action buttons */}
                <View style={s.actions}>
                  <TouchableOpacity
                    style={s.rejectBtn}
                    onPress={() => handleUpdateStatus(app.attachment_id, app.full_name, 'rejected')}
                    disabled={updating === app.attachment_id}
                  >
                    <Text style={s.rejectBtnText}>✕  REJECT</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.approveBtn}
                    onPress={() => handleUpdateStatus(app.attachment_id, app.full_name, 'approved')}
                    disabled={updating === app.attachment_id}
                  >
                    {updating === app.attachment_id
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={s.approveBtnText}>✓  APPROVE</Text>
                    }
                  </TouchableOpacity>
                </View>

              </View>
            ))
          )}

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Bottom nav */}
        <View style={s.bottomNav}>
          {[
            { label: 'Home',    icon: '🏠', screen: 'HostDashboard' },
            { label: 'Users',   icon: '👥', screen: 'HostApplicants' },
            { label: 'Orgs',    icon: '🏢', screen: null },
            { label: 'Profile', icon: '👤', screen: 'HostProfile' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.label}
              style={s.navTab}
              onPress={() => tab.screen && navigation.navigate(tab.screen)}
            >
              <Text style={s.navIcon}>{tab.icon}</Text>
              <Text style={[s.navLabel, !tab.screen && s.navLabelActive]}>{tab.label}</Text>
              {!tab.screen && <View style={s.navDot} />}
            </TouchableOpacity>
          ))}
        </View>

      </View>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  root: { flex: 1, backgroundColor: BG },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  headerBack: { width: 36 },
  headerBackIcon: { fontSize: 22, color: TEAL, fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: TEAL },
  headerRight: { width: 36, alignItems: 'flex-end' },
  bellIcon: { fontSize: 20 },

  scroll: { flex: 1 },
  scrollContent: { padding: 16 },

  // section heading
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#111' },
  actionBadge: {
    backgroundColor: '#FDECEA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  actionBadgeText: { fontSize: 11, fontWeight: '700', color: '#C0392B', letterSpacing: 0.4 },

  // card
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },

  // student row
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#D8EEE9',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 18, fontWeight: '800', color: TEAL },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 16, fontWeight: '800', color: '#111', marginBottom: 2 },
  studentDept: { fontSize: 13, color: '#888', lineHeight: 18 },
  pendingBadge: {
    backgroundColor: '#FDF0E8',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, alignItems: 'center',
  },
  pendingBadgeText: {
    fontSize: 10, fontWeight: '700', color: '#C0392B',
    textAlign: 'center', letterSpacing: 0.3, lineHeight: 14,
  },

  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 12 },

  // company row
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  companyLogoBox: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: '#F4F4F4',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1, borderColor: '#eee',
  },
  companyLogoText: { fontSize: 18 },
  companyInfo: { flex: 1 },
  companyLabel: {
    fontSize: 10, fontWeight: '700', color: TEAL,
    letterSpacing: 0.6, marginBottom: 3,
  },
  companyName: { fontSize: 14, fontWeight: '600', color: '#111', lineHeight: 20 },
  appliedBox: { alignItems: 'flex-end' },
  appliedLabel: { fontSize: 11, color: '#aaa', marginBottom: 2 },
  appliedDate: { fontSize: 14, fontWeight: '800', color: '#111', lineHeight: 20 },

  // action buttons
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  rejectBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#C0392B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtnText: { color: '#C0392B', fontWeight: '700', fontSize: 13, letterSpacing: 0.5 },
  approveBtn: {
    flex: 1.6,
    paddingVertical: 14,
    borderRadius: 30,
    backgroundColor: TEAL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveBtnText: { color: '#fff', fontWeight: '700', fontSize: 13, letterSpacing: 0.5 },

  // empty
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 18, padding: 40,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#333', marginBottom: 4 },
  emptyText: { fontSize: 13, color: '#888', textAlign: 'center' },

  // bottom nav
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 0.5, borderTopColor: 'rgba(0,0,0,0.08)',
    paddingTop: 10, paddingBottom: 24,
  },
  navTab: { flex: 1, alignItems: 'center', gap: 3 },
  navIcon: { fontSize: 22 },
  navLabel: { fontSize: 10, color: '#888', letterSpacing: 0.3 },
  navLabelActive: { color: TEAL, fontWeight: '700' },
  navDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: TEAL },
});

export default HostSlots;
