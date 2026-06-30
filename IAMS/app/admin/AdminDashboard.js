import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert,
  RefreshControl, StatusBar, Dimensions,
  Modal, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../../components/Spinner';

const NAVY      = '#0D1B2E';
const NAVY_CARD = '#162338';
const TEAL      = '#2EC4A0';
const TEAL_DIM  = 'rgba(46,196,160,0.15)';
const GREEN     = '#2EC4A0';
const RED       = '#FF5252';
const WHITE     = '#FFFFFF';
const GRAY      = '#8899AA';
const LIGHT_BG  = '#F7F8FA';
const DARK      = '#111827';
const BORDER    = '#E5E7EB';

const { width } = Dimensions.get('window');

function Sparkline({ up }) {
  const color = up ? 'rgba(46,196,160,0.4)' : 'rgba(255,82,82,0.4)';
  const d = up
    ? 'M0 30 C20 28, 35 15, 50 18 C65 21, 75 8, 90 5 C105 2, 115 10, 130 8'
    : 'M0 8 C20 10, 35 5, 50 12 C65 19, 75 22, 90 20 C105 18, 115 26, 130 30';
  return (
    <Svg width={130} height={36} style={styles.sparkline}>
      <Path d={d} stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" />
    </Svg>
  );
}

function ActionIcon({ name }) {
  const icons = {
    'Manage Attachments': { name: 'clipboard-edit-outline' },
    'Assign Supervisor':  { name: 'account-arrow-right-outline' },
    'System Reports':     { name: 'chart-bar' },
    'Manage Users':       { name: 'account-group-outline' },
    'Manage Orgs':        { name: 'office-building-outline' },
    'Settings':           { name: 'cog-outline' },
    'Announcements':      { name: 'bullhorn-outline' },          // ← NEW
  };
  const icon = icons[name] || { name: 'dots-horizontal' };
  return <MaterialCommunityIcons name={icon.name} size={28} color={TEAL} />;
}

// ── User Menu Panel ─────────────────────────────────────────────────────────
function UserMenuPanel({ visible, user, onClose, onLogout, onAnnouncements }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.userMenuPanel}>
          <View style={styles.userMenuHeader}>
            <View style={[styles.avatar, { backgroundColor: '#1A3A6E', width: 48, height: 48 }]}>
              <Text style={styles.avatarText}>{user?.full_name?.charAt(0).toUpperCase() || 'A'}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.userMenuName}>{user?.full_name || 'Admin'}</Text>
              <Text style={styles.userMenuEmail}>{user?.email}</Text>
            </View>
          </View>
          <View style={styles.userMenuDivider} />

          {/* ── NEW: Announcements menu item ── */}
          <TouchableOpacity
            style={styles.userMenuItem}
            onPress={() => { onClose(); onAnnouncements(); }}
          >
            <MaterialCommunityIcons name="bullhorn-outline" size={20} color={TEAL} />
            <Text style={styles.userMenuItemText}>Announcements</Text>
          </TouchableOpacity>

          <View style={styles.userMenuDivider} />
          <TouchableOpacity style={styles.userMenuItem} onPress={() => { onClose(); onLogout(); }}>
            <MaterialCommunityIcons name="logout-variant" size={20} color={RED} />
            <Text style={[styles.userMenuItemText, { color: RED }]}>Logout</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Notification Panel ──────────────────────────────────────────────────────
function NotificationPanel({ visible, notifications, unreadCount, onClose, onMarkAllRead, onMarkRead }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.notifPanel}>
          <View style={styles.notifHeader}>
            <Text style={styles.notifTitle}>Notifications</Text>
            {unreadCount > 0 && (
              <TouchableOpacity onPress={onMarkAllRead}>
                <Text style={styles.markAllText}>Mark all read</Text>
              </TouchableOpacity>
            )}
          </View>
          {notifications.length === 0 ? (
            <View style={styles.notifEmpty}>
              <Ionicons name="notifications-off-outline" size={40} color={GRAY} />
              <Text style={styles.notifEmptyText}>No notifications</Text>
            </View>
          ) : (
            <FlatList
              data={notifications}
              keyExtractor={(item) => String(item.notif_id)}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.notifItem, !item.is_read && styles.notifItemUnread]}
                  onPress={() => onMarkRead(item.notif_id)}
                >
                  <View style={styles.notifItemLeft}>
                    <View style={[styles.notifDot, item.is_read && styles.notifDotRead]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.notifMessage, !item.is_read && styles.notifMessageUnread]}>
                        {item.message}
                      </Text>
                      <Text style={styles.notifTime}>{timeAgo(item.created_at)}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.notifDivider} />}
            />
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

export default function AdminDashboard({ navigation }) {
  const { user, logout } = useAuth();
  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unassigned, setUnassigned] = useState([]);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [notifVisible, setNotifVisible]   = useState(false);
  const [userMenuVisible, setUserMenuVisible] = useState(false);

  const fetchDashboard = async () => {
    try {
      const [dashRes, unassignedRes] = await Promise.all([
        api.get('/admin/dashboard'),
        api.get('/admin/unassigned-attachments'),
      ]);
      setData(dashRes.data);
      setUnassigned(unassignedRes.data || []);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const [notifRes, countRes] = await Promise.all([
        api.get('/notifications'),
        api.get('/notifications/unread-count'),
      ]);
      setNotifications(notifRes.data || []);
      setUnreadCount(countRes.data?.count || 0);
    } catch (err) {
      console.error('Failed to fetch notifications:', err.message);
    }
  };

  useEffect(() => {
    fetchDashboard();
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleBellPress = () => {
    setNotifVisible(true);
    fetchNotifications();
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try { await logout(); } catch { Alert.alert('Error', 'Failed to logout'); }
        },
      },
    ]);
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      Alert.alert('Error', 'Failed to mark notifications as read');
    }
  };

  const handleMarkRead = async (notifId) => {
    try {
      await api.put(`/notifications/${notifId}/read`);
      setNotifications(prev =>
        prev.map(n => n.notif_id === notifId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(prev - 1, 0));
    } catch {
      console.error('Failed to mark notification as read');
    }
  };

  const handleApproveOrg = async (orgId, orgName) => {
    Alert.alert('Approve Organization', `Approve ${orgName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          try {
            await api.put(`/admin/approve-org/${orgId}`);
            Alert.alert('Success!', `${orgName} approved.`);
            fetchDashboard();
          } catch {
            Alert.alert('Error', 'Failed to approve organization');
          }
        },
      },
    ]);
  };

  const onRefresh = () => { setRefreshing(true); fetchDashboard(); fetchNotifications(); };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Spinner size="large" color={TEAL} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  const stats = data?.stats || {};
  const totalStudents     = stats.totalStudents    || 0;
  const totalSupervisors  = stats.totalSupervisors || 0;
  const totalOrgs         = stats.totalOrgs        || 0;
  const totalAttachments  = stats.totalAttachments || 0;
  const activeAttachments = stats.activeAttachments || 0;
  const pendingOrgs       = stats.pendingOrgs      || 0;
  const totalUsers        = totalStudents + totalSupervisors + totalOrgs;
  const approvedOrgs      = Math.max(totalOrgs - pendingOrgs, 0);

  const percentOf = (value, total) => (!total ? 0 : Math.round((value / total) * 100));

  const statCards = [
    {
      label: 'TOTAL STUDENTS',
      value: totalStudents,
      change: `${percentOf(totalStudents, totalUsers)}% of users`,
      up: true,
      icon: 'people-outline',
    },
    {
      label: 'ACTIVE',
      value: activeAttachments,
      change: `${percentOf(activeAttachments, totalAttachments)}% active`,
      up: true,
      icon: 'person-outline',
    },
    {
      label: 'PENDING',
      value: pendingOrgs,
      change: `${percentOf(pendingOrgs, totalOrgs)}% pending`,
      up: false,
      icon: 'time-outline',
    },
    {
      label: 'HOST ORGS',
      value: totalOrgs,
      change: `${percentOf(approvedOrgs, totalOrgs)}% approved`,
      up: true,
      icon: 'business-outline',
    },
  ];

  // ── CHANGE: "Review Pending" renamed to "Manage Attachments" ──
  const quickActions = [
    { label: 'Manage\nAttachments', screen: 'ManageAttachments'   },
    { label: 'Assign\nSupervisor',  screen: 'AssignSupervisor'    },
    { label: 'System\nReports',     screen: 'Reports'             },
    { label: 'Manage\nUsers',       screen: 'ManageUsers'         },
    { label: 'Manage\nOrgs',        screen: 'ManageOrgs'          },
    { label: 'Settings',            screen: 'Settings'            },
    { label: 'Announcements',       screen: 'AdminAnnouncements'  },
  ];

  const recentActivity = [
    ...(data?.recentAttachments || []).map((att) => ({
      id: `att-${att.attachment_id || att.student_name}`,
      type: 'attachment',
      name: att.student_name,
      time: att.created_at ? timeAgo(att.created_at) : '',
      desc: 'Submitted a new internship application for',
      highlight: att.org_name,
      initials: att.student_name?.charAt(0).toUpperCase() || '?',
      avatarBg: '#1A4A6E',
      online: att.status === 'ongoing',
      showApprove: att.status === 'pending',
      showAssign: !att.supervisor_name,
      itemId: att.attachment_id,
      orgName: att.org_name,
    })),
    ...(data?.recentUsers || []).map((u) => ({
      id: `user-${u.email}`,
      type: 'user',
      name: u.name || 'Unknown',
      time: u.created_at ? timeAgo(u.created_at) : '',
      desc: `Registered as a new ${u.role}`,
      highlight: '',
      initials: u.name?.charAt(0).toUpperCase() || '?',
      avatarBg: u.role === 'student' ? '#1A3A6E' : u.role === 'supervisor' ? '#1A4A3A' : '#3A1A6E',
      online: false,
      showApprove: false,
      showAssign: false,
    })),
    ...(data?.pendingOrgList || []).map((org) => ({
      id: `org-${org.org_id}`,
      type: 'org',
      name: 'New Organization',
      time: org.created_at ? timeAgo(org.created_at) : '',
      desc: '',
      highlight: org.org_name,
      extra: 'joined as a Host Organization.',
      initials: '🏢',
      avatarBg: '#2A2A1A',
      isOrg: true,
      online: false,
      showApprove: true,
      showAssign: false,
      badge: 'PENDING VERIFICATION',
      itemId: org.org_id,
      orgName: org.org_name,
    })),
  ];

  // ── CHANGE: "Users" tab removed from bottom tab bar ──
  const tabs = [
    { label: 'Home',        icon: 'home',             active: true,  screen: null          },
    { label: 'Students',    icon: 'people-outline',   active: false, screen: 'Students'    },
    { label: 'Supervisors', icon: 'ribbon-outline',   active: false, screen: 'Supervisors' },
    { label: 'Orgs',        icon: 'business-outline', active: false, screen: 'ManageOrgs'  },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />

      <NotificationPanel
        visible={notifVisible}
        notifications={notifications}
        unreadCount={unreadCount}
        onClose={() => setNotifVisible(false)}
        onMarkAllRead={handleMarkAllRead}
        onMarkRead={handleMarkRead}
      />

      {/* ── CHANGE 2: onAnnouncements prop wired ── */}
      <UserMenuPanel
        visible={userMenuVisible}
        user={user}
        onClose={() => setUserMenuVisible(false)}
        onLogout={handleLogout}
        onAnnouncements={() => navigation.navigate('AdminAnnouncements')}
      />

      {/* ── DARK NAVY TOP SECTION ── */}
      <View style={styles.navySection}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.bellWrap} onPress={handleBellPress}>
              <Ionicons name="notifications-outline" size={24} color={WHITE} />
              {unreadCount > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.profileWrap} onPress={() => setUserMenuVisible(true)}>
              <View style={[styles.avatar, { width: 36, height: 36, backgroundColor: TEAL }]}>
                <Text style={[styles.avatarText, { fontSize: 16 }]}>
                  {user?.full_name?.charAt(0).toUpperCase() || 'A'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statsGrid}>
          {statCards.map((s, i) => (
            <View key={i} style={styles.statCard}>
              <View style={styles.statTopRow}>
                <View style={styles.statIconCircle}>
                  <Ionicons name={s.icon} size={18} color={TEAL} />
                </View>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
              <Text style={styles.statValue}>{Number(s.value).toLocaleString()}</Text>
              <View style={styles.statBottom}>
                <View style={styles.statChangeRow}>
                  <Ionicons name={s.up ? 'trending-up' : 'trending-down'} size={14} color={s.up ? GREEN : RED} />
                  <Text style={[styles.statChange, { color: s.up ? GREEN : RED }]}>{' '}{s.change}</Text>
                </View>
                <Sparkline up={s.up} />
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* ── WHITE BOTTOM SECTION ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TEAL} />}
      >
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {quickActions.map((a, i) => (
            <TouchableOpacity
              key={i}
              style={styles.actionCard}
              onPress={() => navigation.navigate(a.screen)}
            >
              <ActionIcon name={a.label.replace('\n', ' ')} />
              <Text style={styles.actionLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Needs Supervisor */}
        {unassigned.length > 0 && (
          <>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Needs Supervisor</Text>
              <TouchableOpacity style={styles.viewAllBtn} onPress={() => navigation.navigate('AssignSupervisor')}>
                <Text style={styles.viewAllText}>View All</Text>
                <Ionicons name="chevron-forward" size={14} color={GRAY} />
              </TouchableOpacity>
            </View>
            {unassigned.slice(0, 3).map((att) => (
              <View key={att.attachment_id} style={styles.activityCard}>
                <View style={styles.activityRow}>
                  <View style={[styles.avatar, { backgroundColor: '#1A3A6E', marginRight: 14 }]}>
                    <Text style={styles.avatarText}>{att.student_name?.charAt(0).toUpperCase() || '?'}</Text>
                  </View>
                  <View style={styles.activityContent}>
                    <View style={styles.activityNameRow}>
                      <Text style={styles.activityName}>{att.student_name}</Text>
                      <View style={styles.unassignedBadge}>
                        <Text style={styles.unassignedBadgeText}>NO SUPERVISOR</Text>
                      </View>
                    </View>
                    <Text style={styles.activityDesc}>
                      {att.department} · <Text style={styles.activityHighlight}>{att.org_name}</Text>
                    </Text>
                  </View>
                </View>
                <View style={styles.activityActions}>
                  <TouchableOpacity
                    style={styles.approveBtn}
                    onPress={() => navigation.navigate('AssignSupervisor', {
                      attachmentId: att.attachment_id,
                      studentName: att.student_name,
                    })}
                  >
                    <Text style={styles.approveBtnText}>Assign</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.detailsBtn}
                    onPress={() => navigation.navigate('ManageAttachments', { attachmentId: att.attachment_id })}
                  >
                    <Text style={styles.detailsBtnText}>Details</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}

        {/* Recent Activity */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <TouchableOpacity style={styles.viewAllBtn} onPress={() => navigation.navigate('AdminActivities')}>
            <Text style={styles.viewAllText}>View All</Text>
            <Ionicons name="chevron-forward" size={14} color={GRAY} />
          </TouchableOpacity>
        </View>

        {recentActivity.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No recent activity</Text>
          </View>
        ) : (
          recentActivity.map((a) => (
            <View key={a.id} style={styles.activityCard}>
              <View style={styles.activityRow}>
                <View style={styles.avatarWrap}>
                  <View style={[styles.avatar, { backgroundColor: a.avatarBg }]}>
                    <Text style={styles.avatarText}>{a.isOrg ? '🏢' : a.initials}</Text>
                  </View>
                  {a.online && <View style={styles.onlineDot} />}
                </View>
                <View style={styles.activityContent}>
                  <View style={styles.activityNameRow}>
                    <Text style={styles.activityName}>{a.name}</Text>
                    <Text style={styles.activityTime}>{a.time}</Text>
                  </View>
                  <Text style={styles.activityDesc}>
                    {a.desc}
                    {a.highlight ? <Text style={styles.activityHighlight}> {a.highlight}</Text> : null}
                    {a.extra ? <Text style={styles.activityDescNormal}> {a.extra}</Text> : null}
                  </Text>
                  {a.badge && (
                    <View style={styles.pendingBadge}>
                      <Text style={styles.pendingBadgeText}>{a.badge}</Text>
                    </View>
                  )}
                </View>
              </View>

              {(a.showApprove || a.showAssign) && (
                <View style={styles.activityActions}>
                  {a.showApprove && (
                    <TouchableOpacity
                      style={styles.approveBtn}
                      onPress={() => handleApproveOrg(a.itemId, a.orgName)}
                    >
                      <Text style={styles.approveBtnText}>Approve</Text>
                    </TouchableOpacity>
                  )}
                  {a.showAssign && (
                    <TouchableOpacity
                      style={styles.approveBtn}
                      onPress={() => navigation.navigate('AssignSupervisor', {
                        attachmentId: a.itemId,
                        studentName: a.name,
                      })}
                    >
                      <Text style={styles.approveBtnText}>Assign</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.detailsBtn}
                    onPress={() =>
                      navigation.navigate(
                        a.type === 'org' ? 'OrgDetails' : 'ManageAttachments',
                        a.type === 'org' ? { orgId: a.itemId, orgName: a.orgName } : undefined
                      )
                    }
                  >
                    <Text style={styles.detailsBtnText}>Details</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* ── Bottom Tab Bar ── */}
      <View style={styles.tabBar}>
        {tabs.map((t, i) => (
          <TouchableOpacity
            key={i}
            style={styles.tabItem}
            onPress={() => t.screen && navigation.navigate(t.screen)}
          >
            <Ionicons
              name={t.active ? t.icon.replace('-outline', '') : t.icon}
              size={22}
              color={t.active ? TEAL : GRAY}
            />
            <Text style={[styles.tabLabel, t.active && styles.tabLabelActive]}>{t.label}</Text>
            {t.active && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const CARD_W   = (width - 48) / 2;
const ACTION_W = (width - 56) / 3;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: NAVY },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: LIGHT_BG },
  loadingText: { marginTop: 12, color: GRAY, fontSize: 14 },

  navySection: {
    backgroundColor: NAVY, paddingHorizontal: 16, paddingBottom: 24,
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 8, paddingBottom: 20, justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: WHITE },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },

  bellWrap: { position: 'relative', padding: 4 },
  profileWrap: { padding: 4 },
  bellBadge: {
    position: 'absolute', top: 0, right: 0,
    backgroundColor: RED, borderRadius: 10,
    minWidth: 18, height: 18,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4, borderWidth: 1.5, borderColor: NAVY,
  },
  bellBadgeText: { color: WHITE, fontSize: 10, fontWeight: '800' },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  statCard: {
    width: CARD_W, backgroundColor: NAVY_CARD,
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', overflow: 'hidden',
  },
  statTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  statIconCircle: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: TEAL_DIM, alignItems: 'center', justifyContent: 'center', marginRight: 8,
  },
  statLabel: { fontSize: 11, color: GRAY, fontWeight: '600', letterSpacing: 0.5, flex: 1 },
  statValue: { fontSize: 32, fontWeight: '800', color: WHITE, marginBottom: 6 },
  statBottom: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  statChangeRow: { flexDirection: 'row', alignItems: 'center' },
  statChange: { fontSize: 13, fontWeight: '600' },
  sparkline: { position: 'absolute', bottom: -4, right: -8, opacity: 0.8 },

  scroll: { flex: 1, backgroundColor: LIGHT_BG, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: DARK, marginTop: 20, marginBottom: 14 },
  sectionRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 20, marginBottom: 14,
  },
  viewAllBtn: { flexDirection: 'row', alignItems: 'center' },
  viewAllText: { fontSize: 14, color: GRAY, marginRight: 2 },

  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionCard: {
    width: ACTION_W, backgroundColor: WHITE, borderRadius: 14,
    paddingVertical: 18, alignItems: 'center', justifyContent: 'center',
    elevation: 1, borderWidth: 1, borderColor: BORDER,
  },
  actionLabel: { fontSize: 11, fontWeight: '500', color: DARK, textAlign: 'center', marginTop: 8, lineHeight: 16 },

  emptyCard: {
    backgroundColor: WHITE, borderRadius: 14,
    padding: 24, alignItems: 'center', borderWidth: 1, borderColor: BORDER,
  },
  emptyText: { color: GRAY, fontSize: 14 },

  activityCard: {
    backgroundColor: WHITE, borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: BORDER, elevation: 1,
  },
  activityRow: { flexDirection: 'row' },
  avatarWrap: { position: 'relative', marginRight: 14 },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: WHITE, fontSize: 20, fontWeight: '700' },
  onlineDot: {
    position: 'absolute', bottom: 2, right: 2,
    width: 13, height: 13, borderRadius: 7,
    backgroundColor: GREEN, borderWidth: 2, borderColor: WHITE,
  },
  activityContent: { flex: 1 },
  activityNameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  activityName: { fontSize: 15, fontWeight: '700', color: DARK },
  activityTime: { fontSize: 12, color: GRAY },
  activityDesc: { fontSize: 13, color: '#555', lineHeight: 20 },
  activityDescNormal: { color: '#555' },
  activityHighlight: { color: TEAL, fontWeight: '600' },
  pendingBadge: {
    alignSelf: 'flex-start', marginTop: 8,
    backgroundColor: '#FFF3E0', borderRadius: 4,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  pendingBadgeText: { fontSize: 10, fontWeight: '700', color: '#E65100', letterSpacing: 0.6 },
  unassignedBadge: {
    backgroundColor: '#EDE9FE', borderRadius: 4,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  unassignedBadgeText: { fontSize: 10, fontWeight: '700', color: '#6D28D9', letterSpacing: 0.6 },
  activityActions: { flexDirection: 'row', gap: 10, marginTop: 14, marginLeft: 66 },
  approveBtn: { backgroundColor: TEAL, borderRadius: 8, paddingHorizontal: 22, paddingVertical: 9 },
  approveBtnText: { color: WHITE, fontSize: 13, fontWeight: '700' },
  detailsBtn: {
    borderWidth: 1.5, borderColor: '#D1D5DB', borderRadius: 8,
    paddingHorizontal: 22, paddingVertical: 9,
  },
  detailsBtnText: { color: DARK, fontSize: 13, fontWeight: '600' },

  // Notification panel
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-start', alignItems: 'flex-end',
  },
  notifPanel: {
    backgroundColor: WHITE, borderRadius: 16,
    width: width * 0.88, maxHeight: 480,
    marginTop: 60, marginRight: 12,
    elevation: 8, overflow: 'hidden',
  },
  notifHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  notifTitle: { fontSize: 16, fontWeight: '700', color: DARK },
  markAllText: { fontSize: 13, color: TEAL, fontWeight: '600' },
  notifEmpty: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  notifEmptyText: { color: GRAY, fontSize: 14 },
  notifItem: { paddingHorizontal: 16, paddingVertical: 14 },
  notifItemUnread: { backgroundColor: '#F0FDF9' },
  notifItemLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  notifDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: TEAL, marginTop: 5, flexShrink: 0,
  },
  notifDotRead: { backgroundColor: 'transparent' },
  notifMessage: { fontSize: 13, color: '#444', lineHeight: 20 },
  notifMessageUnread: { color: DARK, fontWeight: '600' },
  notifTime: { fontSize: 11, color: GRAY, marginTop: 4 },
  notifDivider: { height: 1, backgroundColor: BORDER, marginHorizontal: 16 },

  // User Menu Panel
  userMenuPanel: {
    backgroundColor: WHITE, borderRadius: 16,
    width: width * 0.75, maxHeight: 300,      // ← slightly taller to fit new item
    marginTop: 60, marginRight: 12,
    elevation: 8, overflow: 'hidden',
  },
  userMenuHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 16,
  },
  userMenuName: { fontSize: 15, fontWeight: '700', color: DARK },
  userMenuEmail: { fontSize: 12, color: GRAY, marginTop: 2 },
  userMenuDivider: { height: 1, backgroundColor: BORDER },
  userMenuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  userMenuItemText: { fontSize: 14, fontWeight: '600', color: DARK },

  // Tab bar
  tabBar: {
    flexDirection: 'row', backgroundColor: WHITE,
    borderTopWidth: 1, borderTopColor: BORDER,
    paddingTop: 10, paddingBottom: 6,
  },
  tabItem: { flex: 1, alignItems: 'center', paddingBottom: 2 },
  tabLabel: { fontSize: 10, color: GRAY, marginTop: 3 },
  tabLabelActive: { color: TEAL, fontWeight: '700' },
  tabUnderline: { width: 24, height: 3, borderRadius: 2, backgroundColor: TEAL, marginTop: 4 },
});