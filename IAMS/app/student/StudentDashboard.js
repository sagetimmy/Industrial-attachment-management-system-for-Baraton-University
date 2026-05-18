import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, StatusBar, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNotifications } from '../../hooks/useNotifications';
import api from '../../api/axios';

const TEAL = '#0F6E56';
const TEAL_LIGHT = '#E1F5EE';
const TEAL_MID = '#9FE1CB';
const AMBER = '#BA7517';
const AMBER_LIGHT = '#FAEEDA';
const CORAL = '#D85A30';

export default function StudentDashboard({ navigation }) {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const { unreadCount } = useNotifications();

  const [attachment, setAttachment] = useState(null);
  const [logbookEntries, setLogbookEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [attachRes, logbookRes] = await Promise.all([
        api.get('/students/my-attachment'),
        api.get('/students/logbook'),
      ]);
      setAttachment(attachRes.data);
      setLogbookEntries(logbookRes.data ?? []);
    } catch (err) {
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  // ── Derived stats from API data ──────────────────────────────────────────
  const hasAttachment = !!attachment;
  const isOngoing = attachment?.status === 'ongoing';

  const startDate = attachment?.start_date ? new Date(attachment.start_date) : null;
  const endDate   = attachment?.end_date   ? new Date(attachment.end_date)   : null;
  const today     = new Date();

  const totalDays = startDate && endDate
    ? Math.max(1, Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)))
    : null;
  const daysElapsed = startDate
    ? Math.max(0, Math.round((today - startDate) / (1000 * 60 * 60 * 24)))
    : null;
  const daysLeft = endDate
    ? Math.max(0, Math.round((endDate - today) / (1000 * 60 * 60 * 24)))
    : null;
  const progressPct = totalDays && daysElapsed !== null
    ? Math.min(100, Math.round((daysElapsed / totalDays) * 100))
    : 0;

  const logbookCount = logbookEntries.length;

  // Latest 3 logbook entries as recent activity
  const recentActivity = [...logbookEntries]
    .sort((a, b) => new Date(b.submitted_at ?? b.created_at) - new Date(a.submitted_at ?? a.created_at))
    .slice(0, 3);

  const menuItems = [
    { title: 'Apply for Placement', icon: '📋', screen: 'Apply',         color: '#1E3A5F' },
    { title: 'My Logbook',          icon: '📖', screen: 'Logbook',       color: '#C87941' },
    { title: 'My Profile',          icon: '👤', screen: 'Profile',       color: '#2E7D32' },
    { title: 'Feedback & Grades',   icon: '⭐', screen: 'Feedback',      color: '#2E7D32' },
    {
      title: 'Notifications', icon: '🔔', screen: 'Notifications', color: '#6A1B9A',
      badge: unreadCount,
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

  const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 172800) return 'Yesterday';
    return `${Math.floor(diff / 86400)}d ago`;
  };

  if (loading) {
    return (
      <View style={[s.loadingContainer, { backgroundColor: theme.surface }]}>
        <ActivityIndicator size="large" color={TEAL} />
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
            <View style={s.avatar}>
              <Text style={s.avatarText}>
                {(user?.full_name ?? 'S')[0].toUpperCase()}
              </Text>
            </View>
            <Text style={[s.greetingText, { color: theme.text }]}>
              Good morning, {user?.full_name?.split(' ')[0] ?? 'Student'} 👋
            </Text>
          </View>
          <TouchableOpacity
            style={[s.notifBtn, { backgroundColor: theme.background }]}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Text style={s.notifIcon}>🔔</Text>
            {unreadCount > 0 && (
              <View style={s.notifBadge}>
                <Text style={s.notifBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Hero card ─────────────────────────────────────────────────── */}
        {hasAttachment ? (
          <View style={s.heroCard}>
            <View style={s.heroTop}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={s.heroCompany}>{attachment.org_name ?? 'Organization'}</Text>
                <Text style={s.heroRole}>
                  {attachment.supervisor_name
                    ? `Supervisor: ${attachment.supervisor_name}`
                    : 'No supervisor assigned'}
                </Text>
              </View>
              <View style={[s.statusPill, { backgroundColor: statusColor(attachment.status).bg }]}>
                <Text style={[s.statusPillText, { color: statusColor(attachment.status).text }]}>
                  {attachment.status?.toUpperCase()}
                </Text>
              </View>
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
        ) : (
          <View style={s.noAttachCard}>
            <Text style={s.noAttachTitle}>No Active Attachment</Text>
            <Text style={s.noAttachSub}>Apply for placement to get started</Text>
            <TouchableOpacity
              style={s.applyBtn}
              onPress={() => navigation.navigate('Apply')}
            >
              <Text style={s.applyBtnText}>Apply Now →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Stats row ─────────────────────────────────────────────────── */}
        <View style={[s.statsRow, { backgroundColor: theme.background }]}>
          <View style={s.statCell}>
            <Text style={[s.statLabel, { color: theme.textSecondary }]}>DAYS LEFT</Text>
            <Text style={[s.statVal, { color: theme.text }]}>
              {daysLeft ?? '—'}
            </Text>
          </View>
          <View style={[s.statCell, s.statBorder]}>
            <Text style={[s.statLabel, { color: theme.textSecondary }]}>LOGBOOK</Text>
            <Text style={[s.statVal, { color: TEAL }]}>{logbookCount}</Text>
          </View>
          <View style={[s.statCell, s.statBorder]}>
            <Text style={[s.statLabel, { color: theme.textSecondary }]}>PROGRESS</Text>
            <Text style={[s.statVal, { color: TEAL }]}>{progressPct}%</Text>
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
              key={item.screen}
              style={[s.card, { backgroundColor: theme.background, borderLeftColor: item.color }]}
              onPress={() => navigation.navigate(item.screen)}
              activeOpacity={0.7}
            >
              <Text style={s.cardIcon}>{item.icon}</Text>
              <Text style={[s.cardTitle, { color: theme.text }]}>{item.title}</Text>
              {item.badge > 0 && (
                <View style={s.badge}>
                  <Text style={s.badgeText}>{item.badge}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Recent Activity ───────────────────────────────────────────── */}
        <View style={[s.sectionHead, { marginTop: 20 }]}>
          <View style={s.dot} />
          <Text style={[s.sectionTitle, { color: theme.text }]}>Recent Activity</Text>
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
                  <Text style={s.actIconEmoji}>📖</Text>
                </View>
                <View style={s.actBody}>
                  <Text style={[s.actTitle, { color: theme.text }]}>
                    Week {entry.week_number} Logbook
                  </Text>
                  <Text style={[s.actSub, { color: theme.textSecondary }]} numberOfLines={1}>
                    {entry.description}
                  </Text>
                </View>
                <View style={s.actRight}>
                  <Text style={[s.actTime, { color: theme.textSecondary }]}>
                    {timeAgo(entry.submitted_at ?? entry.created_at)}
                  </Text>
                  <View style={[
                    s.actStatusDot,
                    { backgroundColor: statusColor(entry.status ?? 'pending').text }
                  ]} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {recentActivity.length > 0 && (
          <TouchableOpacity onPress={() => navigation.navigate('Logbook')}>
            <Text style={[s.viewAll, { color: TEAL }]}>View All Activity</Text>
          </TouchableOpacity>
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
          { label: 'HOME',    icon: '🏠', screen: null },
          { label: 'LOGBOOK', icon: '📖', screen: 'Logbook' },
          { label: 'REPORTS', icon: '📄', screen: 'Reports' },
          { label: 'PROFILE', icon: '👤', screen: 'Profile' },
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
  root: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 14 },
  scrollContent: { paddingBottom: 20 },

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
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  greetingText: { fontSize: 15, fontWeight: '500' },
  notifBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.1)',
  },
  notifIcon: { fontSize: 18 },
  notifBadge: {
    position: 'absolute', top: 2, right: 2,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: CORAL,
    alignItems: 'center', justifyContent: 'center',
  },
  notifBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  // hero
  heroCard: {
    margin: 16, marginTop: 4,
    backgroundColor: TEAL,
    borderRadius: 18, padding: 20,
  },
  heroTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 20,
  },
  heroCompany: { color: '#fff', fontSize: 17, fontWeight: '600' },
  heroRole: { color: TEAL_MID, fontSize: 13, marginTop: 3 },
  statusPill: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  statusPillText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  progressLabelRow: {
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8,
  },
  progressLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 12 },
  progressPct: { color: '#fff', fontSize: 12, fontWeight: '600' },
  progressTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3 },
  progressFill: { height: 6, backgroundColor: '#5DCAA5', borderRadius: 3 },
  daysRemainingText: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 8 },

  noAttachCard: {
    margin: 16, marginTop: 4,
    backgroundColor: AMBER_LIGHT,
    borderRadius: 18, padding: 20,
    borderWidth: 1, borderColor: AMBER,
    alignItems: 'center',
  },
  noAttachTitle: { fontSize: 16, fontWeight: '700', color: AMBER },
  noAttachSub: { fontSize: 13, color: '#666', marginTop: 4 },
  applyBtn: {
    marginTop: 14, backgroundColor: AMBER,
    paddingHorizontal: 24, paddingVertical: 10,
    borderRadius: 20,
  },
  applyBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // stats
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16, marginBottom: 20,
    borderRadius: 14,
    borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.08)',
    overflow: 'hidden',
  },
  statCell: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  statBorder: { borderLeftWidth: 0.5, borderLeftColor: 'rgba(0,0,0,0.08)' },
  statLabel: { fontSize: 10, letterSpacing: 0.5, marginBottom: 4 },
  statVal: { fontSize: 24, fontWeight: '500' },

  // section
  sectionHead: {
    flexDirection: 'row', alignItems: 'center',
    gap: 8, paddingHorizontal: 16, marginBottom: 10,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: CORAL },
  sectionTitle: { fontSize: 15, fontWeight: '600' },

  // grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10 },
  card: {
    width: '46%', margin: '2%',
    padding: 20, borderRadius: 16,
    borderLeftWidth: 4, elevation: 2,
    alignItems: 'center',
  },
  cardIcon: { fontSize: 32, marginBottom: 10 },
  cardTitle: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  badge: {
    position: 'absolute', top: -5, right: -5,
    backgroundColor: '#C62828',
    width: 20, height: 20, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },

  // activity
  emptyActivity: {
    marginHorizontal: 16, padding: 16,
    borderRadius: 14, marginBottom: 8,
  },
  emptyActivityText: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  activityList: { paddingHorizontal: 16, gap: 10 },
  activityItem: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, borderRadius: 14,
    borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.06)', gap: 12,
  },
  actIconWrap: {
    width: 40, height: 40, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  actIconEmoji: { fontSize: 20 },
  actBody: { flex: 1 },
  actTitle: { fontSize: 13, fontWeight: '600' },
  actSub: { fontSize: 12, marginTop: 2 },
  actRight: { alignItems: 'flex-end', gap: 4 },
  actTime: { fontSize: 11 },
  actStatusDot: { width: 6, height: 6, borderRadius: 3 },

  viewAll: {
    textAlign: 'center', paddingVertical: 16,
    fontSize: 13, fontWeight: '600',
  },

  infoCard: {
    margin: 16, padding: 20,
    borderRadius: 16, marginBottom: 20,
  },
  infoTitle: { fontWeight: '700', fontSize: 15, marginBottom: 8 },
  infoText: { fontSize: 13, lineHeight: 20 },

  bottomNav: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    paddingTop: 10, paddingBottom: 24,
  },
  navTab: { flex: 1, alignItems: 'center', gap: 3 },
  navIcon: { fontSize: 22 },
  navLabel: { fontSize: 10, color: '#888', letterSpacing: 0.3 },
  navActiveDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: TEAL },
});