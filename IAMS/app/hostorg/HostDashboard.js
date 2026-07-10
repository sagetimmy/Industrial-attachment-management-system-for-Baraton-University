import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, RefreshControl,
  Platform, Modal, Pressable, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { useNotifications } from '../../hooks/useNotifications';
import { hasRolePermission } from '../../utils/permissions';
import { confirmLogout } from '../../utils/confirmLogout';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TEAL = '#0F6E56';
const HERO_GREEN = '#0E7A6B';
const TEAL_LIGHT = '#DCEFEA';
const CORAL = '#D85A30';
const CORAL_LIGHT = '#FBEAE3';
const AMBER = '#BA7517';
const AMBER_LIGHT = '#FAEEDA';

const SETTINGS_KEY = 'iams_host_settings';
const DEFAULT_SETTINGS = {
  autoRefresh: true,
  showAnalytics: true,
};

// Standard industrial attachment program length used for week display
const STANDARD_ATTACHMENT_WEEKS = 12;

const Storage = {
  getItem: async (key) => {
    if (Platform.OS === 'web') return localStorage.getItem(key);
    return AsyncStorage.getItem(key);
  },
};

function getTimeAgo(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return null;
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

export default function HostDashboard({ navigation }) {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const [data, setData] = useState(null);
  const [openVacancySlots, setOpenVacancySlots] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [menuOpen, setMenuOpen] = useState(false);

  const fetchDashboard = async () => {
    try {

      const [dashboardRes, slotsRes] = await Promise.all([
        api.get('/host-orgs/dashboard'),
        api.get('/host-orgs/available-slots').catch(() => ({ data: { available_slots: 0 } })),
      ]);
      setData(dashboardRes.data);
      setOpenVacancySlots(slotsRes.data?.available_slots ?? 0);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchDashboard(); }, []);

  const loadSettings = useCallback(async () => {
    try {
      const stored = await Storage.getItem(SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } else {
        setSettings(DEFAULT_SETTINGS);
      }
    } catch {
      setSettings(DEFAULT_SETTINGS);
    }
  }, []);

  useEffect(() => {
    loadSettings();
    const unsubscribe = navigation.addListener('focus', loadSettings);
    return unsubscribe;
  }, [navigation, loadSettings]);

  useEffect(() => {
    if (!settings.autoRefresh) return;
    const interval = setInterval(() => { fetchDashboard(); }, 30000);
    return () => clearInterval(interval);
  }, [settings.autoRefresh]);

  const handleLogout = () => {
    setMenuOpen(false);

    setTimeout(() => confirmLogout(logout), 300);
  };

  const handleUpdateStatus = (attachmentId, studentName, newStatus) => {
    const isAccepting = newStatus === 'approved';
    Alert.alert(
      isAccepting ? 'Confirm Placement' : 'Reject Application',
      isAccepting
        ? `Accept ${studentName}'s application? This will use one of your available slots.`
        : `Reject ${studentName}'s application?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isAccepting ? 'Confirm' : 'Reject',
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
    if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return null;
    const now = new Date();
    const totalMs = end.getTime() - start.getTime();
    const elapsedMs = Math.max(0, Math.min(totalMs, now.getTime() - start.getTime()));
    return Math.max(0, Math.min(100, Math.round((elapsedMs / totalMs) * 100)));
  };

  // Week display now always shows against the standard 12-week attachment
  // program instead of a total derived from start/end dates (which could
  // produce mismatched totals like "Week x of 14").
  const getWeekSummary = (application) => {
    if (Number.isFinite(application?.current_week)) {
      const capped = Math.max(1, Math.min(STANDARD_ATTACHMENT_WEEKS, Math.round(application.current_week)));
      return `Week ${capped} of ${STANDARD_ATTACHMENT_WEEKS}`;
    }
    const start = application?.start_date ? new Date(application.start_date) : null;
    if (!start || Number.isNaN(start.getTime())) return null;
    const now = new Date();
    const elapsedWeeks = Math.max(
      1,
      Math.min(
        STANDARD_ATTACHMENT_WEEKS,
        Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7))
      )
    );
    return `Week ${elapsedWeeks} of ${STANDARD_ATTACHMENT_WEEKS}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={s.safeArea} edges={['top']}>
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={TEAL} />
          <Text style={s.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const activeStudents = data?.applications?.filter(a => ['approved', 'ongoing'].includes(a.status)) ?? [];
  const pendingApps    = data?.applications?.filter(a => a.status === 'pending') ?? [];
  const recentApps     = pendingApps.slice(0, 3);
  const effectiveUser = { ...user, permissions: data?.permissions || user?.permissions };
  const canPostPlacements = hasRolePermission(effectiveUser, 'postPlacements');
  const canViewAnalytics = hasRolePermission(effectiveUser, 'viewAnalytics');
  const canEditOrgProfile = hasRolePermission(effectiveUser, 'editOrgProfile');
  const analyticsVisible = canViewAnalytics && settings.showAnalytics;
  const ongoingCount = data?.stats?.ongoing ?? activeStudents.length;
  const pendingCount = data?.stats?.pending ?? pendingApps.length;
  const openVacancyCount = openVacancySlots;
  const avgRating = data?.org?.avg_rating ?? data?.stats?.avg_rating ?? null;
  const orgLogoUrl = data?.org?.logo_url ?? null;
  const orgName = data?.org?.org_name || 'Host Portal';

  return (
    <SafeAreaView style={s.safeArea} edges={['top']}>
      <View style={s.root}>

        {/* Drawer Modal  */}
        <Modal
          visible={menuOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setMenuOpen(false)}
        >
          <Pressable style={s.menuOverlay} onPress={() => setMenuOpen(false)}>
            <Pressable style={s.menuDrawer} onPress={() => {}}>
              <View style={s.drawerHeader}>
                <View style={s.drawerAvatar}>
                  <Text style={s.drawerAvatarText}>
                    {data?.org?.org_name?.charAt(0).toUpperCase() || 'O'}
                  </Text>
                </View>
                <Text style={s.drawerOrgName}>{data?.org?.org_name || 'Organization'}</Text>
                <Text style={s.drawerOrgSub}>{data?.org?.contact_person || ''}</Text>
              </View>

              <View style={s.drawerDivider} />

              <TouchableOpacity
                style={s.drawerItem}
                onPress={() => {
                  setMenuOpen(false);
                  canEditOrgProfile
                    ? navigation.navigate('HostProfile', { org: data?.org })
                    : Alert.alert('Permission Disabled', 'Editing organization profile is currently disabled.');
                }}
              >
                <Ionicons name="person-outline" size={20} color="#333" />
                <View style={s.drawerItemBody}>
                  <Text style={s.drawerItemLabel}>Profile</Text>
                  <Text style={s.drawerItemSub}>View & edit org details</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#ccc" />
              </TouchableOpacity>

              <TouchableOpacity
                style={s.drawerItem}
                onPress={() => {
                  setMenuOpen(false);
                  navigation.navigate('HostSettings');
                }}
              >
                <Ionicons name="settings-outline" size={20} color="#333" />
                <View style={s.drawerItemBody}>
                  <Text style={s.drawerItemLabel}>Settings</Text>
                  <Text style={s.drawerItemSub}>Preferences & configuration</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#ccc" />
              </TouchableOpacity>

              <View style={s.drawerDivider} />

              <TouchableOpacity style={s.drawerLogout} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={20} color="#C62828" />
                <Text style={s.drawerLogoutText}>Logout</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>

        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={s.scrollContent}
        >

          {/* ── Top bar ─────────────────────────────────────────────────── */}
          <View style={s.topBar}>
            <View style={s.topBarLeft}>
              <View style={s.logoBox}>
                {orgLogoUrl ? (
                  <Image source={{ uri: orgLogoUrl }} style={s.logoImg} />
                ) : (
                  <MaterialCommunityIcons name="school" size={18} color="#fff" />
                )}
              </View>
              <Text style={s.topBarTitle} numberOfLines={1}>{orgName}</Text>
            </View>

            <View style={s.topBarRight}>
              <TouchableOpacity style={s.iconBtn} onPress={() => setMenuOpen(true)}>
                <Ionicons name="ellipsis-vertical" size={20} color="#333" />
              </TouchableOpacity>
              <TouchableOpacity style={s.iconBtn} onPress={() => navigation.navigate('Notifications')}>
                <Ionicons name="notifications-outline" size={22} color="#333" />
                {unreadCount > 0 && (
                  <View style={s.notifBadge}>
                    <Text style={s.notifBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Welcome heading ─────────────────────────────────────────── */}
          <View style={s.welcomeBlock}>
            <Text style={s.welcomeText}>
              Welcome back,{' '}
              <Text style={s.welcomeOrg}>{data?.org?.org_name || 'Organization'}</Text>
            </Text>
            <Text style={s.welcomeSub}>Here's what's happening with your placements today.</Text>
          </View>

          {/* ── Hero card ─────────────────────────────────────────── */}
          <View style={s.hero}>
            <Text style={s.heroLabel}>OVERVIEW</Text>
            <Text style={s.heroValue}>Active Placements: {ongoingCount}</Text>
            <TouchableOpacity
              style={[s.postBtn, !canPostPlacements && { opacity: 0.55 }]}
              onPress={() => (
                canPostPlacements
                  ? navigation.navigate('PostVacancy')
                  : Alert.alert('Permission Disabled', 'Posting new vacancies is currently disabled.')
              )}
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={s.postBtnText}>Post New Vacancy</Text>
            </TouchableOpacity>
          </View>

          {/* ── Stat cards row ──────────────────────────────────────────── */}
          {!canViewAnalytics && (
            <View style={s.permissionCard}>
              <Text style={s.permissionTitle}>Analytics Disabled</Text>
              <Text style={s.permissionText}>
                Placement analytics are hidden for your organization account.
              </Text>
            </View>
          )}

          {canViewAnalytics && !settings.showAnalytics && (
            <View style={s.permissionCard}>
              <Text style={s.permissionTitle}>Analytics Hidden</Text>
              <Text style={s.permissionText}>
                Analytics cards are hidden in your Settings preferences.
              </Text>
            </View>
          )}

          {analyticsVisible && (
            <View style={s.statRow}>
              <View style={s.statCardSm}>
                <Text style={s.statCardSmVal}>{String(openVacancyCount).padStart(2, '0')}</Text>
                <Text style={s.statCardSmLabel}>OPEN{'\n'}VACANCIES</Text>
              </View>
              <View style={s.statCardSm}>
                <Text style={s.statCardSmVal}>{String(pendingCount).padStart(2, '0')}</Text>
                <Text style={s.statCardSmLabel}>PENDING{'\n'}APPS</Text>
              </View>
              <View style={s.statCardSm}>
                <View style={s.ratingRow}>
                  <Text style={s.statCardSmVal}>{avgRating != null ? Number(avgRating).toFixed(1) : '—'}</Text>
                  {avgRating != null && <Ionicons name="star" size={14} color={AMBER} style={{ marginLeft: 2 }} />}
                </View>
                <Text style={s.statCardSmLabel}>AVG{'\n'}RATING</Text>
              </View>
            </View>
          )}

          {/* ── Recent Applications ──────────────────────────────────────── */}
          <View style={s.sectionHead}>
            <Text style={s.sectionTitle}>Recent Applications</Text>
            <TouchableOpacity onPress={() => navigation.navigate('HostApplicants')}>
              <Text style={s.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {recentApps.length === 0 ? (
            <View style={s.emptyCard}>
              <Ionicons name="mail-open-outline" size={32} color="#ccc" />
              <Text style={s.emptyTitle}>No Recent Applications</Text>
              <Text style={s.emptyText}>New applications will appear here.</Text>
            </View>
          ) : (
            recentApps.map((app, index) => {
              const timeAgo = getTimeAgo(app.created_at || app.applied_at);
              const hasMatch = Number.isFinite(app.match_percent);
              return (
                <TouchableOpacity
                  key={app.attachment_id ?? index}
                  style={s.recentRow}
                  onPress={() => navigation.navigate('StudentDetail', { studentId: app.student_id })}
                >
                  {app.photo_url ? (
                    <Image source={{ uri: app.photo_url }} style={s.recentAvatarImg} />
                  ) : (
                    <View style={s.recentAvatar}>
                      <Text style={s.recentAvatarText}>{app.full_name?.charAt(0).toUpperCase()}</Text>
                    </View>
                  )}
                  <View style={s.recentInfo}>
                    <Text style={s.recentName}>{app.full_name}</Text>
                    <Text style={s.recentRole}>{app.department || 'Applicant'}</Text>
                  </View>
                  <View style={s.recentRight}>
                    <View style={[s.matchPill, !hasMatch && { backgroundColor: AMBER_LIGHT }]}>
                      <Text style={[s.matchPillText, !hasMatch && { color: AMBER }]}>
                        {hasMatch ? `${Math.round(app.match_percent)}% MATCH` : 'PENDING'}
                      </Text>
                    </View>
                    {timeAgo && <Text style={s.recentTime}>{timeAgo}</Text>}
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          {/* ── Pending Applications (actionable) ─────────────────────────── */}
          {pendingApps.length > 0 && (
            <>
              <View style={[s.sectionHead, { marginTop: 8 }]}>
                <Text style={s.sectionTitle}>Pending Applications</Text>
              </View>
              {pendingApps.map((app, index) => (
                <View key={app.attachment_id ?? index} style={s.appCard}>
                  <View style={s.internTop}>
                    {app.photo_url ? (
                      <Image source={{ uri: app.photo_url }} style={s.internAvatarImg} />
                    ) : (
                      <View style={[s.internAvatar, { backgroundColor: AMBER }]}>
                        <Text style={s.internAvatarText}>{app.full_name?.charAt(0).toUpperCase()}</Text>
                      </View>
                    )}
                    <View style={s.internInfo}>
                      <Text style={s.internName}>{app.full_name}</Text>
                      <Text style={s.internRole}>{app.reg_number}</Text>
                      <Text style={[s.internRole, { color: TEAL }]}>
                        {app.department} · Year {app.year_of_study}
                      </Text>
                    </View>
                    <View style={[s.statusBadge, { backgroundColor: AMBER_LIGHT }]}>
                      <Text style={[s.statusBadgeText, { color: AMBER }]}>PENDING</Text>
                    </View>
                  </View>
                  <View style={s.appActions}>
                    <TouchableOpacity
                      style={s.rejectBtn}
                      onPress={() => handleUpdateStatus(app.attachment_id, app.full_name, 'rejected')}
                    >
                      <Ionicons name="close" size={16} color="#C62828" />
                      <Text style={s.rejectBtnText}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={s.confirmBtn}
                      onPress={() => handleUpdateStatus(app.attachment_id, app.full_name, 'approved')}
                    >
                      <Ionicons name="checkmark" size={16} color="#fff" />
                      <Text style={s.confirmBtnText}>Confirm Placement</Text>
                    </TouchableOpacity>
                  </View>
                  {app.phone && (
                    <View style={s.appPhoneRow}>
                      <Ionicons name="call-outline" size={13} color="#888" />
                      <Text style={s.appPhone}>{app.phone}</Text>
                    </View>
                  )}
                </View>
              ))}
            </>
          )}

          {/* ── Ongoing Internships ───────────────────────────────────────── */}
          <View style={[s.sectionHead, { marginTop: 8 }]}>
            <Text style={s.sectionTitle}>Ongoing Internships</Text>
          </View>

          {activeStudents.length === 0 ? (
            <View style={s.emptyCard}>
              <Ionicons name="briefcase-outline" size={32} color="#ccc" />
              <Text style={s.emptyTitle}>No Active Interns</Text>
              <Text style={s.emptyText}>Accepted students will appear here.</Text>
            </View>
          ) : (
            activeStudents.map((app, index) => {
              const progress = calculateProgress(app);
              const weekSummary = getWeekSummary(app);
              return (
                <TouchableOpacity
                  key={app.attachment_id ?? index}
                  style={s.internCard}
                  onPress={() => navigation.navigate('InternDetail', { attachmentId: app.attachment_id })}
                >
                  <View style={s.ongoingTop}>
                    <View style={s.ongoingInfo}>
                      <Text style={s.internName}>{app.full_name}</Text>
                      <Text style={s.internRole}>
                        {app.institution || app.department || 'Intern'}
                        {weekSummary ? ` · ${weekSummary}` : ''}
                      </Text>
                    </View>
                    <TouchableOpacity hitSlop={8}>
                      <Ionicons name="ellipsis-vertical" size={18} color="#999" />
                    </TouchableOpacity>
                  </View>
                  <View style={s.progressRow}>
                    <Text style={s.progressLabel}>PROGRESS</Text>
                    <Text style={s.progressPct}>{progress === null ? '—' : `${progress}%`}</Text>
                  </View>
                  <View style={s.progressTrack}>
                    <View style={[s.progressFill, { width: `${progress ?? 0}%` }]} />
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* ── Bottom nav ──────────────────────────────────────────────────── */}
        <View style={s.bottomNav}>
          {[
            { label: 'Dashboard', icon: 'grid-outline', iconActive: 'grid', screen: null },
            { label: 'Vacancies', icon: 'briefcase-outline', iconActive: 'briefcase', screen: 'HostSlots' },
            { label: 'Interns', icon: 'people-outline', iconActive: 'people', screen: 'HostInterns' },
            { label: 'Profile', icon: 'person-circle-outline', iconActive: 'person-circle', screen: 'HostProfile' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.label}
              style={s.navTab}
              onPress={() => tab.screen && navigation.navigate(tab.screen)}
            >
              <Ionicons
                name={tab.screen ? tab.icon : tab.iconActive}
                size={22}
                color={tab.screen ? '#999' : TEAL}
              />
              <Text style={[s.navLabel, !tab.screen && { color: TEAL, fontWeight: '600' }]}>
                {tab.label}
              </Text>
              {!tab.screen && <View style={s.navActiveDot} />}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F0F4F3' },
  root: { flex: 1, backgroundColor: '#F0F4F3' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#888' },
  scrollContent: { paddingBottom: 20 },

  // drawer modal
  menuOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-start', alignItems: 'flex-end',
  },
  menuDrawer: {
    width: 280,
    backgroundColor: '#fff',
    height: '100%',
    paddingTop: 60,
    paddingBottom: 40,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  drawerHeader: { paddingHorizontal: 24, paddingBottom: 20, alignItems: 'flex-start' },
  drawerAvatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: TEAL,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  drawerAvatarText: { color: '#fff', fontSize: 22, fontWeight: '700' },
  drawerOrgName: { fontSize: 16, fontWeight: '800', color: '#111', marginBottom: 2 },
  drawerOrgSub: { fontSize: 12, color: '#888' },
  drawerDivider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 8 },
  drawerItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 16, gap: 14,
  },
  drawerItemBody: { flex: 1 },
  drawerItemLabel: { fontSize: 15, fontWeight: '700', color: '#111' },
  drawerItemSub: { fontSize: 12, color: '#888', marginTop: 2 },
  drawerLogout: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 16, gap: 14,
    marginTop: 8,
  },
  drawerLogoutText: { fontSize: 15, fontWeight: '700', color: '#C62828' },

  // top bar
  topBar: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14,
  },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginRight: 8 },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  logoBox: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: TEAL,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImg: { width: 34, height: 34, borderRadius: 17 },
  topBarTitle: { fontSize: 16, fontWeight: '800', color: '#111', flexShrink: 1 },
  iconBtn: { padding: 6, position: 'relative' },
  notifBadge: {
    position: 'absolute', right: 2, top: 2,
    backgroundColor: CORAL,
    borderRadius: 10, minWidth: 16, height: 16,
    paddingHorizontal: 3,
    alignItems: 'center', justifyContent: 'center',
  },
  notifBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },

  // welcome
  welcomeBlock: { paddingHorizontal: 16, marginBottom: 16 },
  welcomeText: { fontSize: 28, fontWeight: '800', color: '#111', lineHeight: 34 },
  welcomeOrg: { color: TEAL },
  welcomeSub: { color: '#888', fontSize: 14, marginTop: 6 },

  // hero
  hero: {
    backgroundColor: TEAL,
    marginHorizontal: 16, marginBottom: 16,
    borderRadius: 20, padding: 22, overflow: 'hidden',
  },
  heroLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  heroValue: { color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 8, marginBottom: 18 },
  postBtn: {
    flexDirection: 'row', alignItems: 'center',
    alignSelf: 'flex-start', gap: 6,
    backgroundColor: CORAL,
    paddingHorizontal: 18, paddingVertical: 12,
    borderRadius: 30,
  },
  postBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // stat row
  statRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 20 },
  statCardSm: {
    flex: 1, backgroundColor: '#fff',
    borderRadius: 14, padding: 14,
    borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.07)',
  },
  statCardSmVal: { fontSize: 22, fontWeight: '800', color: '#111' },
  statCardSmLabel: { fontSize: 9, fontWeight: '600', color: '#888', marginTop: 6, letterSpacing: 0.3 },
  ratingRow: { flexDirection: 'row', alignItems: 'center' },

  // section head
  sectionHead: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16, marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#111' },
  viewAllText: { fontSize: 13, color: TEAL, fontWeight: '700' },

  // recent applications row
  recentRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16, marginBottom: 10,
    borderRadius: 14, padding: 12,
    borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.07)',
  },
  recentAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: TEAL,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  recentAvatarImg: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  recentAvatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  recentInfo: { flex: 1 },
  recentName: { fontSize: 14, fontWeight: '700', color: '#111' },
  recentRole: { fontSize: 12, color: '#888', marginTop: 2 },
  recentRight: { alignItems: 'flex-end', gap: 6 },
  matchPill: { backgroundColor: TEAL_LIGHT, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  matchPillText: { fontSize: 10, fontWeight: '700', color: TEAL },
  recentTime: { fontSize: 11, color: '#aaa' },

  // intern card (ongoing)
  internCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16, marginBottom: 12,
    borderRadius: 16, padding: 16,
    borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.07)',
  },
  ongoingTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  ongoingInfo: { flex: 1 },
  internTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  internAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: TEAL,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  internAvatarImg: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  internAvatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  internInfo: { flex: 1 },
  internName: { fontSize: 15, fontWeight: '700', color: '#111' },
  internRole: { fontSize: 12, color: '#888', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: 11, color: '#888', fontWeight: '600', letterSpacing: 0.3 },
  progressPct: { fontSize: 12, fontWeight: '700', color: '#111' },
  progressTrack: { height: 6, backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 3 },
  progressFill: { height: 6, backgroundColor: TEAL, borderRadius: 3 },

  // pending app card
  appCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16, marginBottom: 12,
    borderRadius: 16, padding: 16,
    borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.07)',
  },
  appActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  rejectBtn: {
    flex: 1, flexDirection: 'row', gap: 4, padding: 10, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#C62828',
  },
  rejectBtnText: { color: '#C62828', fontWeight: '700', fontSize: 13 },
  confirmBtn: {
    flex: 2, flexDirection: 'row', gap: 4, padding: 10, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', backgroundColor: TEAL,
  },
  confirmBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  appPhoneRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  appPhone: { fontSize: 12, color: '#888' },

  // permission card
  permissionCard: {
    backgroundColor: '#FFF8E1',
    marginHorizontal: 16, marginBottom: 12,
    borderRadius: 16, padding: 16,
    borderLeftWidth: 4, borderLeftColor: CORAL,
  },
  permissionTitle: { fontSize: 15, fontWeight: '700', color: '#111', marginBottom: 4 },
  permissionText: { fontSize: 13, color: '#666', lineHeight: 19 },

  // empty
  emptyCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16, marginBottom: 12,
    padding: 30, borderRadius: 16,
    alignItems: 'center',
    borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.07)',
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#333', marginTop: 10 },
  emptyText: { fontSize: 13, color: '#888', textAlign: 'center', marginTop: 6 },

  // bottom nav
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 0.5, borderTopColor: 'rgba(0,0,0,0.08)',
    paddingTop: 10, paddingBottom: 24,
  },
  navTab: { flex: 1, alignItems: 'center', gap: 3 },
  navLabel: { fontSize: 10, color: '#999', letterSpacing: 0.3 },
  navActiveDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: TEAL },
});