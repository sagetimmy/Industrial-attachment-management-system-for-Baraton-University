import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, RefreshControl, TextInput, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../../api/axios';
import Spinner from '../../components/Spinner';

// ── Design Tokens ────────────────────────────────────────────────────────────
const BG        = '#EEF2F0';
const WHITE     = '#FFFFFF';
const TEAL      = '#1B7A65';
const TEAL_DARK = '#145C4C';
const DARK      = '#0F2419';
const GRAY      = '#7A8F86';
const BORDER    = '#D8E4DF';
const RED       = '#E53935';

// ── Role config ───────────────────────────────────────────────────────────────
const roleConfig = (role) => {
  switch (role) {
    case 'student':    return { bg: '#E8F5E9', color: '#1B6B5A', label: 'STUDENT',    icon: 'school-outline' };
    case 'supervisor': return { bg: '#EDE7F6', color: '#6A1B9A', label: 'SUPERVISOR', icon: 'ribbon-outline' };
    case 'host_org':   return { bg: '#E3F2FD', color: '#1565C0', label: 'HOST ORG',   icon: 'business-outline' };
    case 'admin':      return { bg: '#FFF3E0', color: '#E65100', label: 'ADMIN',      icon: 'shield-outline' };
    default:           return { bg: '#F4F4F4', color: '#888',    label: role,         icon: 'person-outline' };
  }
};

// ── Avatar initials ───────────────────────────────────────────────────────────
function InitialsAvatar({ name, role }) {
  const cfg = roleConfig(role);
  const initials = name
    ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '??';
  return (
    <View style={[styles.avatar, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.avatarText, { color: cfg.color }]}>{initials}</Text>
    </View>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ isActive }) {
  return (
    <View style={[styles.statusBadge, isActive ? styles.statusActive : styles.statusDisabled]}>
      <Text style={[styles.statusText, isActive ? styles.statusActiveText : styles.statusDisabledText]}>
        {isActive ? 'ACTIVE' : 'DISABLED'}
      </Text>
    </View>
  );
}

// ── User Card ─────────────────────────────────────────────────────────────────
function UserCard({ user, onToggle, onDelete, onNavigate }) {
  const cfg = roleConfig(user.role);
  const joined = user.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
    : '—';

  return (
    <Pressable
      style={({ pressed }) => [styles.userCard, pressed && { opacity: 0.95 }]}
      onPress={() => onNavigate(user)}
    >
      {/* Top row: avatar + name/email + status */}
      <View style={styles.cardTopRow}>
        <InitialsAvatar name={user.name} role={user.role} />

        <View style={styles.userInfo}>
          <Text style={styles.userName} numberOfLines={1}>{user.name || 'Unknown'}</Text>
          <Text style={styles.userEmail} numberOfLines={1}>{user.email || '—'}</Text>
        </View>

        <StatusBadge isActive={user.is_active} />
      </View>

      {/* Mid row: role badge + joined date */}
      <View style={styles.cardMidRow}>
        <View style={[styles.roleBadge, { backgroundColor: cfg.bg }]}>
          <Ionicons name={cfg.icon} size={12} color={cfg.color} style={{ marginRight: 4 }} />
          <Text style={[styles.roleText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
        <Text style={styles.joinedText}>Joined: {joined}</Text>
      </View>

      {/* Divider */}
      <View style={styles.cardDivider} />

      {/* Action row */}
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => onNavigate(user)}
          accessibilityLabel={`Edit role for ${user.name}`}
        >
          <Text style={styles.actionBtnText}>Deatails</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => Alert.alert('Reset Password', `Send password reset to ${user.email}?`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Send', onPress: () => api.post(`/admin/reset-password/${user.user_id}`)
                .then(() => Alert.alert('Sent', `Reset email sent to ${user.email}`))
                .catch(() => Alert.alert('Error', 'Failed to send reset email')) },
          ])}
          accessibilityLabel={`Reset password for ${user.name}`}
        >
          <Text style={styles.actionBtnText}>Reset Pwd</Text>
        </TouchableOpacity>

        {/* Toggle: teal (activate) or red outlined (deactivate) */}
        <TouchableOpacity
          style={[styles.toggleBtn, user.is_active ? styles.toggleBtnDeactivate : styles.toggleBtnActivate]}
          onPress={() => onToggle(user.user_id, user.name, user.is_active)}
          accessibilityLabel={`${user.is_active ? 'Deactivate' : 'Activate'} ${user.name}`}
        >
          {user.is_active
            ? <Ionicons name="ban-outline" size={18} color={RED} />
            : <Ionicons name="checkmark-circle-outline" size={18} color={WHITE} />
          }
        </TouchableOpacity>
      </View>
    </Pressable>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function ManageUsersScreen({ navigation, route }) {
  const initialRole = route?.params?.role || 'all';

  const [users, setUsers]           = useState([]);
  const [filtered, setFiltered]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]         = useState('');
  const [activeFilter, setActiveFilter] = useState(initialRole);

  // ── API ───────────────────────────────────────────────────────────────────
  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      // Super admins are managed in ManageAdminsScreen, not here.
      const nonSuperAdmins = res.data.filter(u => !u.is_super_admin);
      setUsers(nonSuperAdmins);
      setFiltered(nonSuperAdmins);
    } catch {
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  useEffect(() => {
    let result = users;
    if (activeFilter !== 'all') {
      result = result.filter(u => u.role === activeFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(u =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [search, activeFilter, users]);

  const handleToggleUser = (userId, name, isActive) => {
    Alert.alert(
      `${isActive ? 'Deactivate' : 'Activate'} User`,
      `${isActive ? 'Deactivate' : 'Activate'} ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isActive ? 'Deactivate' : 'Activate',
          style: isActive ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await api.put(`/admin/toggle-user/${userId}`);
              fetchUsers();
            } catch {
              Alert.alert('Error', 'Failed to update user');
            }
          },
        },
      ]
    );
  };

  const handleDeleteUser = (userId, name) => {
    Alert.alert(
      'Delete User',
      `Permanently delete ${name}? This cannot be undone!`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/admin/delete-user/${userId}`);
              Alert.alert('Deleted', `${name} has been deleted.`);
              fetchUsers();
            } catch {
              Alert.alert('Error', 'Failed to delete user');
            }
          },
        },
      ]
    );
  };

  const onRefresh = () => { setRefreshing(true); fetchUsers(); };

  const filters = [
    { key: 'all',        label: 'All' },
    { key: 'student',    label: 'Students' },
    { key: 'supervisor', label: 'Supervisors' },
    { key: 'admin',      label: 'Admins' },
  ];

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Spinner size="large" color={TEAL} />
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>

      {/* ── Top nav bar ── */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={TEAL} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>IAMS Admin</Text>
        <View style={styles.topBarRight}>
          <TouchableOpacity style={styles.iconBtn} accessibilityLabel="Notifications">
            <Ionicons name="notifications-outline" size={22} color={DARK} />
          </TouchableOpacity>
          <View style={styles.profileCircle}>
            <Ionicons name="person" size={16} color={WHITE} />
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[TEAL]} tintColor={TEAL} />}
      >
        {/* ── Page heading ── */}
        <View style={styles.pageHeading}>
          <Text style={styles.pageTitle}>User Management</Text>
          <Text style={styles.pageSubtitle}>Manage access levels and monitor system participants.</Text>
        </View>

        {/* ── Search ── */}
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={GRAY} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            placeholderTextColor={GRAY}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={GRAY} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Filter pills ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
          {filters.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterPill, activeFilter === f.key && styles.filterPillActive]}
              onPress={() => setActiveFilter(f.key)}
              accessibilityLabel={`Filter by ${f.label}`}
            >
              <Text style={[styles.filterPillText, activeFilter === f.key && styles.filterPillTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Count ── */}
        <Text style={styles.countText}>{filtered.length} user{filtered.length !== 1 ? 's' : ''}</Text>

        {/* ── List ── */}
        {filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="account-group-outline" size={48} color={GRAY} />
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        ) : (
          filtered.map((user, index) => (
            <UserCard
              key={user.user_id || index}
              user={user}
              onToggle={handleToggleUser}
              onDelete={handleDeleteUser}
              onNavigate={(u) => navigation.navigate('UserDetail', { user: u })}
            />
          ))
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ── FAB ── */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddUser')}
        accessibilityLabel="Add new user"
      >
        <Ionicons name="add" size={28} color={WHITE} />
      </TouchableOpacity>

    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG },
  loadingText: { marginTop: 12, color: GRAY, fontSize: 14 },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: BG,
  },
  backBtn: { padding: 4, marginRight: 4 },
  topBarTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: TEAL },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn: { padding: 4 },
  profileCircle: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: TEAL,
    alignItems: 'center', justifyContent: 'center',
  },

  // Scroll
  scrollContent: { paddingHorizontal: 16, paddingBottom: 100 },

  // Heading
  pageHeading: { marginTop: 8, marginBottom: 20 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: DARK, lineHeight: 34 },
  pageSubtitle: { fontSize: 14, color: GRAY, marginTop: 6, lineHeight: 20 },

  // Search
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHITE,
    borderRadius: 30,
    paddingHorizontal: 16,
    paddingVertical: 13,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  searchInput: { flex: 1, fontSize: 14, color: DARK },

  // Filter pills
  filterScroll: { marginBottom: 4 },
  filterRow: { flexDirection: 'row', gap: 8, paddingBottom: 12 },
  filterPill: {
    paddingHorizontal: 18, paddingVertical: 9,
    borderRadius: 30,
    backgroundColor: WHITE,
    borderWidth: 1.5, borderColor: BORDER,
  },
  filterPillActive: { backgroundColor: TEAL, borderColor: TEAL },
  filterPillText: { fontSize: 13, fontWeight: '600', color: GRAY },
  filterPillTextActive: { color: WHITE },

  // Count
  countText: { fontSize: 13, color: GRAY, fontWeight: '500', marginBottom: 12 },

  // User Card
  userCard: {
    backgroundColor: WHITE,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 52, height: 52, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 17, fontWeight: '800' },
  userInfo: { flex: 1, marginRight: 8 },
  userName: { fontSize: 15, fontWeight: '700', color: DARK, marginBottom: 3 },
  userEmail: { fontSize: 12, color: GRAY },

  // Status badge
  statusBadge: {
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 8,
  },
  statusActive: { backgroundColor: '#E8F5E9' },
  statusDisabled: { backgroundColor: '#FFEBEE' },
  statusText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
  statusActiveText: { color: '#1B7A65' },
  statusDisabledText: { color: RED },

  // Mid row
  cardMidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20,
  },
  roleText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  joinedText: { fontSize: 12, color: GRAY },

  // Divider
  cardDivider: { height: 1, backgroundColor: BORDER, marginBottom: 12 },

  // Card actions
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
  },
  actionBtnText: { fontSize: 13, fontWeight: '600', color: TEAL },
  toggleBtn: {
    width: 42, height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBtnActivate: { backgroundColor: TEAL },
  toggleBtnDeactivate: { backgroundColor: '#FFEBEE', borderWidth: 1.5, borderColor: '#FFCDD2' },

  // Empty
  emptyCard: {
    backgroundColor: WHITE,
    padding: 40,
    borderRadius: 18,
    alignItems: 'center',
    marginTop: 20,
    gap: 12,
  },
  emptyText: { color: GRAY, fontSize: 14, fontWeight: '500' },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 20,
    width: 56, height: 56,
    borderRadius: 28,
    backgroundColor: '#E8711A',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
});