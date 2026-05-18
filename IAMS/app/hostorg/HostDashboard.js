import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, RefreshControl
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { useNotifications } from '../../hooks/useNotifications';

const TEAL = '#0F6E56';
const TEAL_LIGHT = '#de210c';
const TEAL_MID = '#dc7d09';
const CORAL = '#D85A30';
const CORAL_LIGHT = '#b43b0f';
const AMBER = '#BA7517';
const AMBER_LIGHT = '#FAEEDA';

export default function HostDashboard({ navigation }) {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
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

  useEffect(() => { fetchDashboard(); }, []);

  useEffect(() => {
    if (!autoRefreshEnabled) return;
    const interval = setInterval(() => { fetchDashboard(); }, 30000);
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

  const onRefresh = () => { setRefreshing(true); fetchDashboard(); };

  const calculateProgress = (application) => {
    if (Number.isFinite(application?.progress_percent)) {
      return Math.max(0, Math.min(100, Math.round(application.progress_percent)));
    }

    const start = application?.start_date ? new Date(application.start_date) : null;
    const end = application?.end_date ? new Date(application.end_date) : null;
    if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      return null;
    }

    const now = new Date();
    const totalMs = end.getTime() - start.getTime();
    const elapsedMs = Math.max(0, Math.min(totalMs, now.getTime() - start.getTime()));
    return Math.max(0, Math.min(100, Math.round((elapsedMs / totalMs) * 100)));
  };

  const getWeekSummary = (application) => {
    if (Number.isFinite(application?.current_week)) {
      return `Week ${application.current_week}`;
    }

    const start = application?.start_date ? new Date(application.start_date) : null;
    const end = application?.end_date ? new Date(application.end_date) : null;
    if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      return null;
    }

    const now = new Date();
    const totalWeeks = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7)));
    const elapsedWeeks = Math.max(1, Math.min(totalWeeks, Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7))));
    return `Week ${elapsedWeeks} of ${totalWeeks}`;
  };

  if (loading) {
    return (
      <View style={s.loadingContainer}>
        <ActivityIndicator size="large" color={TEAL} />
        <Text style={s.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  const activeStudents = data?.applications?.filter(a => a.status === 'ongoing') ?? [];
  const pendingApps    = data?.applications?.filter(a => a.status === 'pending') ?? [];
  const ongoingCount = data?.stats?.ongoing ?? activeStudents.length;
  const pendingCount = data?.stats?.pending ?? pendingApps.length;
  const openVacancyCount = data?.org?.available_slots ?? 0;

  return (
    <View style={s.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={s.scrollContent}
      >

        {/* ── Top bar ─────────────────────────────────────────────────── */}
        <View style={s.topBar}>
          <TouchableOpacity style={s.logoutChip} onPress={handleLogout}>
            <Text style={s.logoutChipText}>Logout</Text>
          </TouchableOpacity>
          <View style={s.topBarCenter}>
            <View style={s.logoBox}>
              <Text style={s.logoIcon}>🎓</Text>
            </View>
            <Text style={s.topBarTitle}>Industrial Attachment Management System</Text>
          </View>
          <TouchableOpacity style={s.notifBtn} onPress={() => navigation.navigate('Notifications')}>
            <Text style={s.notifIcon}>🔔</Text>
            {unreadCount > 0 && (
              <View style={s.notifBadge}>
                <Text style={s.notifBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Hero banner ─────────────────────────────────────────────── */}
        <View style={s.hero}>
          <View style={s.premiumBadge}>
            <Text style={s.premiumText}>PREMIUM PARTNER</Text>
          </View>
          <Text style={s.heroWelcome}>
            Welcome,{' '}
            <Text style={s.heroOrg}>{data?.org?.org_name || 'Organization'}</Text>
          </Text>
          <Text style={s.heroSub}>
            Oversee your internship ecosystem and nurture the next generation of talent
            through our streamlined management suite.
          </Text>
          <TouchableOpacity
            style={s.postBtn}
            onPress={() => navigation.navigate('HostSlots')}
          >
            <Text style={s.postBtnIcon}>⊕</Text>
            <Text style={s.postBtnText}>Post New Vacancy</Text>
          </TouchableOpacity>
        </View>

        {/* ── Stat cards ──────────────────────────────────────────────── */}
        <View style={s.statCard}>
          <View style={s.statCardTop}>
            <Text style={s.statCardLabel}>CURRENT INTERNS</Text>
            <Text style={s.statCardIcon}>👥</Text>
          </View>
          <Text style={s.statCardVal}>{ongoingCount}</Text>
          <Text style={s.statCardHint} numberOfLines={1}>
            <Text style={{ color: TEAL }}>{ongoingCount > 0 ? `${ongoingCount} active placement${ongoingCount === 1 ? '' : 's'}` : 'No active placements'}</Text>
          </Text>
        </View>

        <View style={s.statCard}>
          <View style={s.statCardTop}>
            <Text style={s.statCardLabel}>OPEN VACANCIES</Text>
            <Text style={s.statCardIcon}>💼</Text>
          </View>
          <Text style={s.statCardVal}>
            {String(openVacancyCount).padStart(2, '0')}
          </Text>
          <Text style={[s.statCardHint, { color: '#888' }]}>
            {openVacancyCount > 0
              ? `${openVacancyCount} slot${openVacancyCount === 1 ? '' : 's'} open`
              : 'No open vacancies'}
          </Text>
        </View>

        <View style={s.statCard}>
          <View style={s.statCardTop}>
            <Text style={s.statCardLabel}>PENDING APPS</Text>
            <Text style={s.statCardIcon}>📋</Text>
          </View>
          <Text style={s.statCardVal}>
            {String(pendingCount).padStart(2, '0')}
          </Text>
          <Text style={[s.statCardHint, { color: CORAL }]}>
            {pendingCount > 0 ? `${pendingCount} awaiting review` : 'All reviewed'}
          </Text>
        </View>

        {/* ── Active Interns Performance ───────────────────────────────── */}
        <View style={s.sectionHead}>
          <Text style={s.sectionTitle}>Active Interns{'\n'}Performance</Text>
          <TouchableOpacity
            style={s.viewAllBtn}
            onPress={() => navigation.navigate('HostApplicants')}
          >
            <Text style={s.viewAllText}>View{'\n'}All</Text>
            <Text style={s.viewAllArrow}>→</Text>
          </TouchableOpacity>
        </View>

        {activeStudents.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={s.emptyIcon}>📭</Text>
            <Text style={s.emptyTitle}>No Active Interns</Text>
            <Text style={s.emptyText}>Accepted students will appear here.</Text>
          </View>
        ) : (
          activeStudents.map((app, index) => {
            const progress = calculateProgress(app);
            const weekSummary = getWeekSummary(app);
            return (
              <View key={app.attachment_id ?? index} style={s.internCard}>
                <View style={s.internTop}>
                  <View style={s.internAvatar}>
                    <Text style={s.internAvatarText}>
                      {app.full_name?.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={s.internInfo}>
                    <Text style={s.internName}>{app.full_name}</Text>
                    <Text style={s.internRole}>
                      {app.department || 'Intern'} Intern{weekSummary ? ` · ${weekSummary}` : ''}
                    </Text>
                  </View>
                  <View style={s.activeBadge}>
                    <Text style={s.activeBadgeText}>ACTIVE</Text>
                  </View>
                </View>
                <View style={s.progressRow}>
                  <Text style={s.progressLabel}>Program Progress</Text>
                  <Text style={s.progressPct}>{progress === null ? '—' : `${progress}%`}</Text>
                </View>
                <View style={s.progressTrack}>
                  <View style={[s.progressFill, { width: `${progress ?? 0}%` }]} />
                </View>
              </View>
            );
          })
        )}

        {/* ── Pending Applications ─────────────────────────────────────── */}
        {pendingApps.length > 0 && (
          <>
            <View style={[s.sectionHead, { marginTop: 8 }]}>
              <Text style={s.sectionTitle}>Pending Applications</Text>
            </View>
            {pendingApps.map((app, index) => (
              <View key={index} style={s.appCard}>
                <View style={s.internTop}>
                  <View style={[s.internAvatar, { backgroundColor: AMBER }]}>
                    <Text style={s.internAvatarText}>
                      {app.full_name?.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={s.internInfo}>
                    <Text style={s.internName}>{app.full_name}</Text>
                    <Text style={s.internRole}>{app.reg_number}</Text>
                    <Text style={[s.internRole, { color: TEAL }]}>
                      {app.department} · Year {app.year_of_study}
                    </Text>
                  </View>
                  <View style={[s.activeBadge, { backgroundColor: AMBER_LIGHT }]}>
                    <Text style={[s.activeBadgeText, { color: AMBER }]}>PENDING</Text>
                  </View>
                </View>
                <View style={s.appActions}>
                  <TouchableOpacity
                    style={s.rejectBtn}
                    onPress={() => handleUpdateStatus(app.attachment_id, app.full_name, 'rejected')}
                  >
                    <Text style={s.rejectBtnText}>✗ Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.confirmBtn}
                    onPress={() => handleUpdateStatus(app.attachment_id, app.full_name, 'ongoing')}
                  >
                    <Text style={s.confirmBtnText}>✓ Confirm Placement</Text>
                  </TouchableOpacity>
                </View>
                {app.phone && (
                  <Text style={s.appPhone}>📞 {app.phone}</Text>
                )}
              </View>
            ))}
          </>
        )}

        {/* ── Org Info ────────────────────────────────────────────────── */}
        <View style={s.infoCard}>
          <Text style={s.infoTitle}>Organization Details</Text>
          {[
            { label: 'Contact Person', value: data?.org?.contact_person },
            { label: 'Phone',          value: data?.org?.phone },
            { label: 'Location',       value: data?.org?.location },
            { label: 'Available Slots',value: data?.org?.available_slots ?? 0 },
          ].map((row) => (
            <View key={row.label} style={s.infoRow}>
              <Text style={s.infoLabel}>{row.label}</Text>
              <Text style={s.infoValue}>{row.value || '—'}</Text>
            </View>
          ))}
          <TouchableOpacity
            style={s.editBtn}
            onPress={() => navigation.navigate('HostProfile', { org: data?.org })}
          >
            <Text style={s.editBtnText}>Edit Profile ✏️</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Bottom nav ──────────────────────────────────────────────────── */}
      <View style={s.bottomNav}>
        {[
          { label: 'Home',       icon: '🏠', screen: null },
          { label: 'Vacancies',  icon: '💼', screen: 'HostSlots' },
          { label: 'Applicants', icon: '📋', screen: 'HostApplicants' },
          { label: 'Profile',   icon: '👤', screen: 'HostProfile' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.label}
            style={s.navTab}
            onPress={() => tab.screen && navigation.navigate(tab.screen)}
          >
            <Text style={s.navIcon}>{tab.icon}</Text>
            <Text style={[s.navLabel, !tab.screen && { color: TEAL, fontWeight: '600' }]}>
              {tab.label}
            </Text>
            {!tab.screen && <View style={s.navActiveDot} />}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F0F4F3' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#888' },
  scrollContent: { paddingBottom: 20 },

  // top bar
  topBar: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 52, paddingBottom: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  logoutChip: {
    backgroundColor: '#FCE8E8',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  logoutChipText: { color: '#C62828', fontSize: 12, fontWeight: '700' },
  topBarCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoBox: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: '#0F6E56',
    alignItems: 'center', justifyContent: 'center',
  },
  logoIcon: { fontSize: 16 },
  topBarTitle: { fontSize: 16, fontWeight: '700', color: '#111' },
  notifBtn: { position: 'relative', paddingHorizontal: 2, paddingVertical: 2 },
  notifIcon: { fontSize: 22 },
  notifBadge: {
    position: 'absolute',
    right: -6,
    top: -6,
    backgroundColor: '#D85A30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  // hero
  hero: {
    backgroundColor: '#0F6E56',
    marginHorizontal: 16, marginBottom: 16,
    borderRadius: 18, padding: 22,
    overflow: 'hidden',
  },
  premiumBadge: {
    alignSelf: 'flex-start',
    backgroundColor: CORAL,
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20, marginBottom: 6,
  },
  premiumText: { color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  heroWelcome: { color: '#fff', fontSize: 26, fontWeight: '700', lineHeight: 34 },
  heroOrg: { color: TEAL_MID },
  heroSub: { color: 'rgba(255,255,255,0.75)', fontSize: 13, lineHeight: 20, marginTop: 10 },
  postBtn: {
    flexDirection: 'row', alignItems: 'center',
    alignSelf: 'flex-start', gap: 8,
    backgroundColor: CORAL,
    paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: 30, marginTop: 20,
  },
  postBtnIcon: { color: '#fff', fontSize: 18 },
  postBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // stat cards
  statCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16, marginBottom: 12,
    borderRadius: 16, padding: 18,
    borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.07)',
  },
  statCardTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  statCardLabel: { fontSize: 11, fontWeight: '600', color: '#888', letterSpacing: 0.5 },
  statCardIcon: { fontSize: 20 },
  statCardVal: { fontSize: 36, fontWeight: '700', color: '#111' },
  statCardHint: { fontSize: 13, marginTop: 4 },

  // section head
  sectionHead: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16, marginBottom: 12, marginTop: 4,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111', lineHeight: 26 },
  viewAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewAllText: { fontSize: 13, color: '#0F6E56', fontWeight: '600', textAlign: 'right' },
  viewAllArrow: { fontSize: 16, color: '#0F6E56', fontWeight: '600' },

  // intern card
  internCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16, marginBottom: 12,
    borderRadius: 16, padding: 16,
    borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.07)',
  },
  internTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  internAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#0F6E56',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  internAvatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  internInfo: { flex: 1 },
  internName: { fontSize: 15, fontWeight: '700', color: '#111' },
  internRole: { fontSize: 12, color: '#888', marginTop: 2 },
  activeBadge: {
    backgroundColor: TEAL_LIGHT,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20,
  },
  activeBadgeText: { fontSize: 10, fontWeight: '700', color: '#0F6E56', letterSpacing: 0.3 },
  progressRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: { fontSize: 12, color: '#888' },
  progressPct: { fontSize: 12, fontWeight: '600', color: '#111' },
  progressTrack: {
    height: 6, backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 3,
  },
  progressFill: {
    height: 6, backgroundColor: '#0F6E56', borderRadius: 3,
  },

  // pending app card
  appCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16, marginBottom: 12,
    borderRadius: 16, padding: 16,
    borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.07)',
  },
  appActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  rejectBtn: {
    flex: 1, padding: 10, borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1.5, borderColor: '#C62828',
  },
  rejectBtnText: { color: '#C62828', fontWeight: '700', fontSize: 13 },
  confirmBtn: {
    flex: 2, padding: 10, borderRadius: 10,
    alignItems: 'center', backgroundColor: '#0F6E56',
  },
  confirmBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  appPhone: { fontSize: 12, color: '#888', marginTop: 8 },

  // org info
  infoCard: {
    backgroundColor: '#fff',
    margin: 16, padding: 16,
    borderRadius: 16,
    borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.07)',
  },
  infoTitle: { fontSize: 15, fontWeight: '700', color: '#0F6E56', marginBottom: 12 },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  infoLabel: { fontSize: 13, color: '#888' },
  infoValue: { fontSize: 13, fontWeight: '600', color: '#222' },
  editBtn: {
    backgroundColor: '#0F6E56',
    padding: 12, borderRadius: 10,
    alignItems: 'center', marginTop: 14,
  },
  editBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // empty
  emptyCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16, marginBottom: 12,
    padding: 30, borderRadius: 16,
    alignItems: 'center',
    borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.07)',
  },
  emptyIcon: { fontSize: 36, marginBottom: 10 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#333' },
  emptyText: { fontSize: 13, color: '#888', textAlign: 'center', marginTop: 6 },

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
  navActiveDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#0F6E56' },
});
