import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, StatusBar, RefreshControl, ActivityIndicator, Image,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNotifications } from '../../hooks/useNotifications';
import api from '../../api/axios';
import Spinner from '../../components/Spinner';
import AnnouncementBanner from '../shared/AnnouncementBanner';


const TEAL       = '#0F6E56';
const TEAL_LIGHT = '#E1F5EE';
const TEAL_MID   = '#9FE1CB';
const AMBER      = '#BA7517';
const AMBER_LIGHT= '#FAEEDA';
const CORAL      = '#D85A30';
const AMBER_DARK = '#92400E';

// Session Banner
function SessionBanner({ session, sessionActive, sessionLoading, onDetails }) {
  if (sessionLoading) {
    return (
      <View style={[sb.banner, sb.loadingBanner]}>
        <ActivityIndicator size="small" color={TEAL} />
        <Text style={sb.loadingText}>Checking session status…</Text>
      </View>
    );
  }

  if (sessionActive && session) {
    const endDate = session.end_date
      ? new Date(session.end_date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })
      : '—';
    return (
      <View style={[sb.banner, sb.activeBanner]}>
        <Ionicons name="checkmark-circle" size={20} color={TEAL} />
        <View style={sb.bannerBody}>
          <Text style={sb.activeTitle}>{session.name}</Text>
          <Text style={sb.activeSub}>Open until {endDate}</Text>
        </View>
        <TouchableOpacity onPress={onDetails} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={sb.detailsLink}>DETAILS</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[sb.banner, sb.inactiveBanner]}>
      <MaterialCommunityIcons name="calendar-remove-outline" size={20} color={AMBER} />
      <View style={sb.bannerBody}>
        <Text style={sb.inactiveTitle}>No Active Attachment Session</Text>
        <Text style={sb.inactiveSub}>Applications and logbooks are currently closed.</Text>
      </View>
    </View>
  );
}

const sb = StyleSheet.create({
  banner: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 8,
    borderRadius: 12, padding: 12,
    borderWidth: 1, gap: 10,
  },
  loadingBanner:  { backgroundColor: '#F9FAFB', borderColor: '#E5E7EB' },
  activeBanner:   { backgroundColor: TEAL_LIGHT, borderColor: '#A7F3D0' },
  inactiveBanner: { backgroundColor: AMBER_LIGHT, borderColor: '#FDE68A' },
  bannerBody:     { flex: 1 },
  activeTitle:    { fontSize: 13, fontWeight: '700', color: TEAL },
  activeSub:      { fontSize: 12, color: '#065F46', marginTop: 1 },
  inactiveTitle:  { fontSize: 13, fontWeight: '700', color: AMBER },
  inactiveSub:    { fontSize: 12, color: AMBER_DARK, marginTop: 1 },
  loadingText:    { fontSize: 13, color: '#6B7280' },
  detailsLink:    { fontSize: 11, fontWeight: '700', color: TEAL, letterSpacing: 0.4 },
});

// Main Dashboard 
export default function StudentDashboard({ navigation }) {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const { unreadCount } = useNotifications();

  const [attachment, setAttachment]           = useState(null);
  const [logbookEntries, setLogbookEntries]   = useState([]);
  const [applications, setApplications]       = useState([]);
  const [latestApplication, setLatestApplication] = useState(null);
  const [loading, setLoading]                 = useState(true);
  const [refreshing, setRefreshing]           = useState(false);

  //  Session state 
  const [session, setSession]               = useState(null);
  const [sessionActive, setSessionActive]   = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);

  const fetchSession = useCallback(async () => {
    setSessionLoading(true);
    try {
      const res = await api.get('/students/active-session');
      setSession(res.data.session);
      setSessionActive(res.data.active === true);
    } catch {
      setSession(null);
      setSessionActive(false);
    } finally {
      setSessionLoading(false);
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [attachRes, logbookRes, appsRes] = await Promise.all([
        api.get('/students/my-attachment'),
        api.get('/students/logbook'),
        api.get('/applications'),
      ]);
      setAttachment(attachRes.data);
      setLogbookEntries(logbookRes.data ?? []);
      const apps = appsRes.data?.applications || [];
      setApplications(apps);
      setLatestApplication(apps[0] || null);
    } catch (err) {
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([fetchSession(), fetchData()]);
  };

  // ── Derived stats ──────────────────────────────────────────────────────────
  const hasAttachment = !!attachment;
  const isOngoing     = attachment?.status === 'ongoing';

  const startDate = attachment?.start_date ? new Date(attachment.start_date) : null;
  const endDate   = attachment?.end_date   ? new Date(attachment.end_date)   : null;
  const today     = new Date();

  const totalDays   = startDate && endDate
    ? Math.max(1, Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)))
    : null;
  const daysElapsed = startDate
    ? Math.max(0, Math.round((today - startDate) / (1000 * 60 * 60 * 24)))
    : null;
  const daysLeft    = endDate
    ? Math.max(0, Math.round((endDate - today) / (1000 * 60 * 60 * 24)))
    : null;
  const progressPct = totalDays && daysElapsed !== null
    ? Math.min(100, Math.round((daysElapsed / totalDays) * 100))
    : 0;

  const logbookCount  = logbookEntries.length;
  const recentActivity = [...logbookEntries]
    .sort((a, b) => new Date(b.submitted_at ?? b.created_at) - new Date(a.submitted_at ?? a.created_at))
    .slice(0, 3);

  // ── Quick action tiles ──────────────────────────────────────────────────────
  const menuItems = [
    {
      title:    sessionActive ? 'Apply Now' : 'Applications Closed',
      subtitle: sessionActive ? 'Find new opportunities' : 'Closed for this session',
      icon:     'business-outline',
      screen:   sessionActive ? 'Apply' : null,
      color:    sessionActive ? '#1E3A5F' : '#9CA3AF',
      circleBg: sessionActive ? 'rgba(30,58,95,0.1)' : 'rgba(156,163,175,0.15)',
      locked:   !sessionActive,
    },
    {
      title: 'Grades', subtitle: 'View performance',
      icon: 'star-outline', screen: 'Feedback',
      color: '#2E7D32', circleBg: 'rgba(46,125,50,0.12)',
    },
    {
      title: 'Site Visits', subtitle: 'Scheduled supervisor visits',
      icon: 'calendar-outline', screen: 'SiteVisits',
      color: '#8E44AD', circleBg: 'rgba(142,68,173,0.12)',
    },
    {
      title: 'Settings', subtitle: 'Account & preferences',
      icon: 'settings-outline', screen: 'StudentSettings',
      color: TEAL, circleBg: TEAL_LIGHT,
    },
  ];

  const statusColor = (status) => {
    switch (status) {
      case 'approved':  return { bg: TEAL_LIGHT,  text: TEAL };
      case 'rejected':  return { bg: '#FCE8E8',   text: '#C62828' };
      case 'pending':   return { bg: AMBER_LIGHT, text: AMBER };
      case 'ongoing':   return { bg: TEAL_LIGHT,  text: TEAL };
      case 'completed': return { bg: '#E3F2FD',   text: '#185FA5' };
      default:          return { bg: '#F4F4F4',   text: '#888' };
    }
  };

  const applicationMeta = (status) => {
    switch (status) {
      case 'accepted':  return { label: 'ACCEPTED',  bg: TEAL_LIGHT,  text: TEAL };
      case 'rejected':  return { label: 'REJECTED',  bg: '#FCE8E8',   text: '#C62828' };
      case 'more_info': return { label: 'MORE INFO', bg: '#E3F2FD',   text: '#185FA5' };
      case 'pending':
      default:          return { label: 'PENDING',   bg: AMBER_LIGHT, text: AMBER };
    }
  };

  const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 172800) return 'Yesterday';
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = (user?.full_name ?? '').trim().split(/\s+/)[0] || 'Student';
  const program = user?.program ?? user?.course ?? '';

  if (loading) {
    return (
      <View style={[s.loadingContainer, { backgroundColor: theme.surface }]}>
        <Spinner size="large" color={TEAL} />
        <Text style={[s.loadingText, { color: theme.textSecondary }]}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={[s.root, { backgroundColor: theme.surface }]}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TEAL} />}
        contentContainerStyle={s.scrollContent}
      >

        {/* ── Top bar ───────────────────────────────────────────────────── */}
        <View style={s.topBar}>
          <View style={s.avatarRow}>
            <TouchableOpacity onPress={() => navigation.navigate('Profile')} activeOpacity={0.8}>
              <View style={s.avatar}>
                {user?.avatar_url ? (
                  <Image source={{ uri: user.avatar_url }} style={s.avatarImage} />
                ) : (
                  <Text style={s.avatarText}>
                    {(user?.full_name ?? 'S')[0].toUpperCase()}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
            <View>
              <Text style={[s.greetingText, { color: theme.text }]}>
                {getGreeting()}, {firstName} 👋
              </Text>
              {!!program && (
                <Text style={[s.programText, { color: theme.textSecondary }]}>{program}</Text>
              )}
            </View>
          </View>
          <TouchableOpacity
            style={[s.notifBtn, { backgroundColor: theme.background }]}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Ionicons name="notifications-outline" size={20} color={theme.text} />
            {unreadCount > 0 && <View style={s.notifDot} />}
          </TouchableOpacity>
        </View>

        {/* ── Session banner ─────────────────────────────────────────────── */}
        <SessionBanner
          session={session}
          sessionActive={sessionActive}
          sessionLoading={sessionLoading}
          onDetails={() => navigation.navigate('SessionDetails')}
        />

        {/* ── Announcement banner ────────────────────────────────────────── */}
        <AnnouncementBanner navigation={navigation} role="student" />

        {/* ── Hero card ─────────────────────────────────────────────────── */}
        {hasAttachment ? (
          <View style={s.heroCard}>
            <View style={s.heroTop}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <View style={[s.statusPill, { backgroundColor: statusColor(attachment.status).bg }]}>
                  <Text style={[s.statusPillText, { color: statusColor(attachment.status).text }]}>
                    {attachment.status?.toUpperCase()}
                  </Text>
                </View>
                <Text style={s.heroCompany}>{attachment.org_name ?? 'Organization'}</Text>
                <Text style={s.heroRole}>{attachment.department ?? attachment.org_dept ?? ' '}</Text>
              </View>
              <View style={s.heroBadge}>
                {attachment.org_logo_url ? (
                  <Image source={{ uri: attachment.org_logo_url }} style={s.heroBadgeImg} />
                ) : (
                  <MaterialCommunityIcons name="card-account-details-outline" size={22} color={TEAL} />
                )}
              </View>
            </View>

            <View style={s.supervisorRow}>
              <Ionicons name="person-outline" size={14} color={TEAL_MID} />
              <Text style={s.supervisorText}>
                {attachment.supervisor_name
                  ? `Supervisor: ${attachment.supervisor_name}`
                  : 'No supervisor assigned'}
              </Text>
            </View>

            {isOngoing && daysLeft !== null && (
              <>
                <View style={s.progressLabelRow}>
                  <Text style={s.progressLabel}>Attachment Progress</Text>
                  <Text style={s.progressPct}>{progressPct}%</Text>
                </View>
                <View style={s.progressTrack}>
                  <View style={[s.progressFill, { width: `${progressPct}%` }]} />
                </View>
                <Text style={s.daysRemainingText}>{daysLeft} days remaining</Text>
              </>
            )}
          </View>
        ) : latestApplication ? (
          <View style={s.applicationCard}>
            <View style={s.heroTop}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={[s.heroCompany, { color: '#1F2937' }]}>
                  {latestApplication.org_name ?? 'Preferred Organization'}
                </Text>
                <Text style={[s.heroRole, { color: '#6B7280' }]}>
                  {latestApplication.start_date && latestApplication.end_date
                    ? `Period: ${new Date(latestApplication.start_date).toLocaleDateString()} — ${new Date(latestApplication.end_date).toLocaleDateString()}`
                    : 'Attachment period submitted'}
                </Text>
              </View>
              <View style={[s.appStatusPill, { backgroundColor: applicationMeta(latestApplication.status).bg }]}>
                <Text style={[s.appStatusPillText, { color: applicationMeta(latestApplication.status).text }]}>
                  {applicationMeta(latestApplication.status).label}
                </Text>
              </View>
            </View>
            {!!latestApplication.response_message && (
              <View style={s.responseBox}>
                <Text style={s.responseLabel}>Host Organization Response</Text>
                <Text style={s.responseText}>{latestApplication.response_message}</Text>
              </View>
            )}
          </View>
        ) : sessionActive ? (
          <View style={s.noAttachCard}>
            <Text style={s.noAttachTitle}>No Active Attachment</Text>
            <Text style={s.noAttachSub}>Apply for placement to get started</Text>
            <TouchableOpacity style={s.applyBtn} onPress={() => navigation.navigate('Apply')}>
              <Text style={s.applyBtnText}>Apply Now →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[s.noAttachCard, { borderColor: '#FDE68A', backgroundColor: AMBER_LIGHT }]}>
            <MaterialCommunityIcons name="lock-outline" size={28} color={AMBER} />
            <Text style={s.noAttachTitle}>Applications Closed</Text>
            <Text style={s.noAttachSub}>
              No attachment session is currently open. Check back later.
            </Text>
          </View>
        )}

        {/* ── Stats row ─────────────────────────────────────────────────── */}
        <View style={s.statsRow}>
          <View style={[s.statCard, { backgroundColor: theme.background }]}>
            <Text style={[s.statVal, { color: theme.text }]}>{daysLeft ?? '—'}</Text>
            <Text style={[s.statLabel, { color: theme.textSecondary }]}>DAYS LEFT</Text>
          </View>
          <View style={[s.statCard, { backgroundColor: theme.background }]}>
            <Text style={[s.statVal, { color: TEAL }]}>{logbookCount}</Text>
            <Text style={[s.statLabel, { color: theme.textSecondary }]}>LOGBOOK</Text>
          </View>
          <View style={[s.statCard, { backgroundColor: theme.background }]}>
            <Text style={[s.statVal, { color: TEAL }]}>{progressPct}%</Text>
            <Text style={[s.statLabel, { color: theme.textSecondary }]}>PROGRESS</Text>
          </View>
        </View>

        {/* ── Quick Actions ─────────────────────────────────────────────── */}
        <View style={s.sectionHead}>
          <View style={s.dot} />
          <Text style={[s.sectionTitle, { color: theme.text }]}>Quick Actions</Text>
        </View>

        <View style={s.grid}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.screen ?? item.title}
              style={[s.card, { backgroundColor: theme.background }, item.locked && s.cardLocked]}
              onPress={() => item.screen && navigation.navigate(item.screen)}
              activeOpacity={item.locked ? 1 : 0.7}
              disabled={item.locked}
            >
              <View style={[s.cardIconCircle, { backgroundColor: item.circleBg }]}>
                <Ionicons name={item.icon} size={22} color={item.color} />
              </View>
              <Text style={[s.cardTitle, { color: item.locked ? '#9CA3AF' : theme.text }]}>
                {item.title}
              </Text>
              <Text style={[s.cardSubtitle, { color: theme.textSecondary }]} numberOfLines={1}>
                {item.subtitle}
              </Text>
              {item.locked && (
                <View style={s.lockIcon}>
                  <Ionicons name="lock-closed" size={12} color="#9CA3AF" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Recent Activity ───────────────────────────────────────────── */}
        <View style={[s.sectionHead, { marginTop: 20, justifyContent: 'space-between' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={s.dot} />
            <Text style={[s.sectionTitle, { color: theme.text }]}>Recent Activity</Text>
          </View>
          {recentActivity.length > 0 && (
            <TouchableOpacity onPress={() => navigation.navigate('Logbook')}>
              <Text style={s.seeAll}>See All</Text>
            </TouchableOpacity>
          )}
        </View>

        {recentActivity.length === 0 ? (
          <View style={[s.emptyActivity, { backgroundColor: theme.background }]}>
            <Text style={[s.emptyActivityText, { color: theme.textSecondary }]}>
              No logbook entries yet. Start by submitting your first entry.
            </Text>
          </View>
        ) : (
          <View style={s.activityList}>
            {recentActivity.map((entry, i) => (
              <TouchableOpacity
                key={entry.entry_id ?? i}
                style={[s.activityItem, { backgroundColor: theme.background }]}
                onPress={() => navigation.navigate('Logbook')}
                activeOpacity={0.7}
              >
                <View style={[s.actIconWrap, { backgroundColor: TEAL_LIGHT }]}>
                  <Ionicons name="document-text-outline" size={18} color={TEAL} />
                </View>
                <View style={s.actBody}>
                  <Text style={[s.actTitle, { color: theme.text }]}>
                    Week {entry.week_number} Logbook Entry
                  </Text>
                  <Text style={[s.actSub, { color: theme.textSecondary }]} numberOfLines={1}>
                    {entry.description}
                  </Text>
                </View>
                <Text style={[s.actTime, { color: theme.textSecondary }]}>
                  {timeAgo(entry.submitted_at ?? entry.created_at)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Info card ─────────────────────────────────────────────────── */}
        <View style={[s.infoCard, { backgroundColor: theme.secondary }]}>
          <Text style={[s.infoTitle, { color: TEAL }]}>📌 UEAB Industrial Attachment</Text>
          <Text style={[s.infoText, { color: theme.white }]}>
            Submit your weekly logbook entries, track your attachment progress,
            and receive feedback from your supervisor all in one place.
          </Text>
        </View>

      </ScrollView>

      {/* ── Bottom nav ────────────────────────────────────────────────────── */}
      <View style={[s.bottomNav, { backgroundColor: theme.background, borderTopColor: theme.border ?? 'rgba(0,0,0,0.08)' }]}>
        {[
          { label: 'HOME',    icon: 'home-outline',           activeIcon: 'home',            screen: null },
          { label: 'LOGBOOK', icon: 'book-outline',           activeIcon: 'book',            screen: 'Logbook' },
          { label: 'PROFILE', icon: 'person-circle-outline',  activeIcon: 'person-circle',   screen: 'Profile' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.label}
            style={s.navTab}
            onPress={() => tab.screen && navigation.navigate(tab.screen)}
          >
            <Ionicons
              name={!tab.screen ? tab.activeIcon : tab.icon}
              size={22}
              color={!tab.screen ? TEAL : theme.textSecondary}
            />
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
  root:             { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText:      { marginTop: 10, fontSize: 14 },
  scrollContent:    { paddingBottom: 20 },

  topBar: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
  },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: TEAL,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage:  { width: '100%', height: '100%' },
  avatarText:   { color: '#fff', fontSize: 18, fontWeight: '600' },
  greetingText: { fontSize: 15, fontWeight: '500' },
  programText:  { fontSize: 12, marginTop: 2 },
  notifBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.1)',
  },
  notifDot: {
    position: 'absolute', top: 6, right: 6,
    width: 9, height: 9, borderRadius: 4.5,
    backgroundColor: CORAL,
  },

  // hero
  heroCard: {
    margin: 16, marginTop: 4,
    backgroundColor: TEAL,
    borderRadius: 18, padding: 20,
  },
  applicationCard: {
    margin: 16, marginTop: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 18, padding: 20,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)',
  },
  heroTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 14,
  },
  heroBadge: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  heroBadgeImg: { width: 44, height: 44, borderRadius: 12 },
  statusPill:  { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, marginBottom: 10 },
  statusPillText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  heroCompany: { color: '#fff', fontSize: 20, fontWeight: '600' },
  heroRole:    { color: TEAL_MID, fontSize: 13, marginTop: 3 },
  supervisorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 18 },
  supervisorText: { color: TEAL_MID, fontSize: 12 },
  progressLabelRow: {
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8,
  },
  progressLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 12 },
  progressPct:   { color: '#fff', fontSize: 12, fontWeight: '600' },
  progressTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3 },
  progressFill:  { height: 6, backgroundColor: '#5DCAA5', borderRadius: 3 },
  daysRemainingText: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 8 },
  responseBox: {
    marginTop: 12, backgroundColor: '#F7F9FB', borderRadius: 12, padding: 12,
  },
  responseLabel: { fontSize: 12, fontWeight: '700', color: '#5A6B7A', marginBottom: 4 },
  responseText:  { fontSize: 13, color: '#2B3B49', lineHeight: 18 },
  appStatusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  appStatusPillText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },

  noAttachCard: {
    margin: 16, marginTop: 4,
    backgroundColor: AMBER_LIGHT,
    borderRadius: 18, padding: 20,
    borderWidth: 1, borderColor: AMBER,
    alignItems: 'center', gap: 6,
  },
  noAttachTitle: { fontSize: 16, fontWeight: '700', color: AMBER },
  noAttachSub:   { fontSize: 13, color: '#666', marginTop: 2, textAlign: 'center' },
  applyBtn: {
    marginTop: 10, backgroundColor: AMBER,
    paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20,
  },
  applyBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // stats
  statsRow: { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginBottom: 20 },
  statCard: {
    flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center',
    borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.08)',
  },
  statLabel:  { fontSize: 10, letterSpacing: 0.5, marginBottom: 4 },
  statVal:    { fontSize: 24, fontWeight: '500' },

  // section
  sectionHead: {
    flexDirection: 'row', alignItems: 'center',
    gap: 8, paddingHorizontal: 16, marginBottom: 10,
  },
  dot:          { width: 8, height: 8, borderRadius: 4, backgroundColor: CORAL },
  sectionTitle: { fontSize: 15, fontWeight: '600' },
  seeAll:       { fontSize: 13, fontWeight: '600', color: TEAL },

  // grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10 },
  card: {
    width: '46%', margin: '2%',
    padding: 16, borderRadius: 16, elevation: 2,
  },
  cardLocked: { opacity: 0.6 },
  cardIconCircle: {
    width: 42, height: 42, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  cardTitle:    { fontSize: 13, fontWeight: '600' },
  cardSubtitle: { fontSize: 11, marginTop: 2 },
  lockIcon:     { position: 'absolute', top: 8, right: 8 },

  // activity
  emptyActivity: {
    marginHorizontal: 16, padding: 16, borderRadius: 14, marginBottom: 8,
  },
  emptyActivityText: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  activityList:      { paddingHorizontal: 16, gap: 10 },
  activityItem: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, borderRadius: 14,
    borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.06)', gap: 12,
  },
  actIconWrap: {
    width: 40, height: 40, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  actBody:  { flex: 1 },
  actTitle: { fontSize: 13, fontWeight: '600' },
  actSub:   { fontSize: 12, marginTop: 2 },
  actTime:  { fontSize: 11 },

  infoCard: { margin: 16, padding: 20, borderRadius: 16, marginBottom: 20 },
  infoTitle: { fontWeight: '700', fontSize: 15, marginBottom: 8 },
  infoText:  { fontSize: 13, lineHeight: 20 },

  bottomNav: {
    flexDirection: 'row', borderTopWidth: 0.5,
    paddingTop: 10, paddingBottom: 24,
  },
  navTab:       { flex: 1, alignItems: 'center', gap: 3 },
  navLabel:     { fontSize: 10, color: '#888', letterSpacing: 0.3 },
  navActiveDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: TEAL },
});