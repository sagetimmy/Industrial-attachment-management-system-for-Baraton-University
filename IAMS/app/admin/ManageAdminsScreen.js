import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import api from '../../api/axios';

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  navy:        '#0F2419',
  teal:        '#1B7A65',
  tealLight:   '#E0F5F1',
  bg:          '#EEF2F0',
  orange:      '#E8711A',
  white:       '#FFFFFF',
  cardBorder:  '#D6E4DF',
  textPrimary: '#0F2419',
  textSub:     '#4A6B5D',
  textMuted:   '#8FA89F',
  red:         '#D94F3B',
  redLight:    '#FDECEA',
  amber:       '#D97706',
  green:       '#1B7A65',
  surface:     '#F6FAF8',
  outline:     '#BDC9C5',
  superBg:     '#0D7A6B',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
// Admins have no separate profile table, so we derive a readable display name
// from the name field (if enriched) or the email prefix.
const displayName = (item) =>
  item.name?.trim() ||
  (item.email ? item.email.split('@')[0].replace(/[._-]/g, ' ') : 'Admin User');

const initials = (name = '') =>
  name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');

const avatarColor = (name = '') => {
  const palette = ['#1B7A65', '#2E86AB', '#8B5CF6', '#D97706', '#E8711A', '#0F2419'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
};

const formatJoined = (iso) => {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-KE', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

// ─── Avatar ───────────────────────────────────────────────────────────────────
const Avatar = ({ name, size = 48 }) => (
  <View style={[
    styles.avatar,
    { width: size, height: size, borderRadius: size / 2, backgroundColor: avatarColor(name) },
  ]}>
    <Text style={[styles.avatarText, { fontSize: size * 0.35 }]}>{initials(name)}</Text>
  </View>
);

// ─── Admin Card ───────────────────────────────────────────────────────────────
const AdminCard = ({ item, currentUser, onToggleActive, onToggleSuperAdmin, onDelete, onResetPassword }) => {
  const name         = displayName(item);
  const isActive     = item.is_active !== false;
  const isSuperAdmin = !!item.is_super_admin;
  const joined       = formatJoined(item.created_at ?? item.joined_at);
  const isSelf       = String(item.id) === String(currentUser?.user_id);
  // Only super admins can toggle the super-admin flag, and never on themselves
  const canToggleRole = !!currentUser?.is_super_admin && !isSelf;

  return (
    <View style={styles.card}>
      {/* ── Top row ── */}
      <View style={styles.cardTop}>
        <Avatar name={name} size={48} />

        <View style={styles.cardInfo}>
          <View style={styles.cardNameRow}>
            <Text style={styles.cardName} numberOfLines={1}>{name}</Text>
            {/* Super Admin / System Admin pill */}
            <View style={[styles.rolePill, isSuperAdmin ? styles.rolePillSuper : styles.rolePillAdmin]}>
              <Text style={[styles.rolePillText, isSuperAdmin ? styles.rolePillTextSuper : styles.rolePillTextAdmin]}>
                {isSuperAdmin ? 'SUPER ADMIN' : 'SYSTEM ADMIN'}
              </Text>
            </View>
          </View>

          <Text style={styles.cardEmail} numberOfLines={1}>{item.email ?? '—'}</Text>

          {joined ? <Text style={styles.cardJoined}>Joined: {joined}</Text> : null}

          {/* Active / Inactive status pill */}
          <View style={[styles.statusPill, isActive ? styles.statusPillActive : styles.statusPillInactive]}>
            <Text style={[styles.statusPillText, isActive ? styles.statusPillTextActive : styles.statusPillTextInactive]}>
              {isActive ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Role toggle row (Super Admin only, not self) ── */}
      {canToggleRole && (
        <TouchableOpacity
          style={[styles.roleToggleBtn, isSuperAdmin ? styles.roleToggleBtnDemote : styles.roleToggleBtnPromote]}
          onPress={() => onToggleSuperAdmin(item)}
          activeOpacity={0.75}
        >
          <MaterialCommunityIcons
            name={isSuperAdmin ? 'shield-remove-outline' : 'shield-star-outline'}
            size={16}
            color={isSuperAdmin ? C.amber : C.teal}
          />
          <Text style={[styles.roleToggleBtnText, isSuperAdmin ? styles.roleToggleBtnTextDemote : styles.roleToggleBtnTextPromote]}>
            {isSuperAdmin ? 'Remove Super Admin' : 'Make Super Admin'}
          </Text>
        </TouchableOpacity>
      )}

      {/* ── Primary action buttons ── */}
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnPrimary]}
          onPress={() => onToggleActive(item)}
          activeOpacity={0.75}
        >
          <Text style={styles.actionBtnPrimaryText} numberOfLines={1}>
            {isActive ? 'Deactivate' : 'Reactivate'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnSecondary]}
          onPress={() => onResetPassword(item)}
          activeOpacity={0.75}
        >
          <Text style={styles.actionBtnSecondaryText} numberOfLines={1}>Reset Password</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnDanger]}
          onPress={() => onDelete(item)}
          activeOpacity={0.75}
        >
          <MaterialCommunityIcons name="trash-can-outline" size={20} color={C.red} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, color, fillFraction, accent }) => (
  <View style={styles.statCard}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={[styles.statValue, { color }]}>{String(value).padStart(2, '0')}</Text>
    <View style={[styles.statBar, { backgroundColor: accent }]}>
      <View style={[styles.statBarFill, { width: `${Math.round(fillFraction * 100)}%`, backgroundColor: color }]} />
    </View>
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ManageAdminsScreen({ navigation }) {
  const [admins, setAdmins]         = useState([]);
  const [filtered, setFiltered]     = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [search, setSearch]         = useState('');
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilter]   = useState('all');
  const [error, setError]           = useState(null);

  // ── Fetch ──
  const fetchAdmins = useCallback(async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError(null);

      // Fetch current user (to know if they are super admin + to block self-demotion)
      if (!currentUser) {
        try {
          const meRes = await api.get('/auth/me');
          setCurrentUser(meRes.data);
        } catch { /* non-fatal — role toggle button will simply be hidden */ }
      }

      let data = [];
      try {
        // Primary: dedicated admins-only endpoint
        const res = await api.get('/admin/admins');
        data = res.data?.admins ?? res.data?.users ?? res.data ?? [];
      } catch (e) {
        if (e.response?.status === 404) {
          // Fallback: generic users endpoint filtered to admin role
          const res = await api.get('/admin/users', { params: { role: 'admin' } });
          data = res.data?.users ?? res.data ?? [];
        } else {
          throw e;
        }
      }

      // Normalise id field
      const normalised = data.map((u) => ({
        ...u,
        id: u.user_id ?? u.id,
        is_super_admin: u.is_super_admin ?? false,
      }));

      setAdmins(normalised);
      applyFilters(normalised, search, filterStatus);
    } catch {
      setError('Failed to load admins. Pull down to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, filterStatus, currentUser]);

  useFocusEffect(useCallback(() => { fetchAdmins(); }, [fetchAdmins]));

  // ── Filters ──
  const applyFilters = (list, q, status) => {
    let result = [...list];
    if (q.trim()) {
      const lower = q.toLowerCase();
      result = result.filter(
        (a) =>
          displayName(a).toLowerCase().includes(lower) ||
          a.email?.toLowerCase().includes(lower)
      );
    }
    if (status === 'active')   result = result.filter((a) => a.is_active !== false);
    if (status === 'inactive') result = result.filter((a) => a.is_active === false);
    setFiltered(result);
  };

  const handleSearch    = (q)   => { setSearch(q);   applyFilters(admins, q, filterStatus); };
  const handleFilterTab = (tab) => { setFilter(tab); applyFilters(admins, search, tab); };

  // ── Toggle active status ──
  const handleToggleActive = (item) => {
    const name     = displayName(item);
    const isActive = item.is_active !== false;
    Alert.alert(
      isActive ? 'Deactivate Admin' : 'Reactivate Admin',
      `${isActive ? 'Deactivate' : 'Reactivate'} ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isActive ? 'Deactivate' : 'Reactivate',
          style: isActive ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await api.patch(`/admin/users/${item.id}/status`, { is_active: !isActive });
              fetchAdmins(true);
            } catch {
              Alert.alert('Error', 'Could not update status. Please try again.');
            }
          },
        },
      ]
    );
  };

  // ── Toggle super admin ──
  const handleToggleSuperAdmin = (item) => {
    const name         = displayName(item);
    const isSuperAdmin = !!item.is_super_admin;
    Alert.alert(
      isSuperAdmin ? 'Remove Super Admin' : 'Make Super Admin',
      isSuperAdmin
        ? `Remove Super Admin privileges from ${name}? They will become a System Admin.`
        : `Grant Super Admin privileges to ${name}? They will have full system access.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isSuperAdmin ? 'Remove' : 'Make Super Admin',
          style: isSuperAdmin ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await api.patch(`/admin/users/${item.id}/super-admin`);
              fetchAdmins(true);
            } catch (e) {
              Alert.alert('Error', e.response?.data?.message || 'Could not update role. Please try again.');
            }
          },
        },
      ]
    );
  };

  // ── Delete ──
  const handleDelete = (item) => {
    const name = displayName(item);
    Alert.alert(
      'Delete Admin',
      `Permanently delete ${name}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/admin/users/${item.id}`);
              fetchAdmins(true);
            } catch {
              Alert.alert('Error', 'Could not delete admin. Please try again.');
            }
          },
        },
      ]
    );
  };

  // ── Reset password ──
  const handleResetPassword = (item) => {
    const name = displayName(item);
    Alert.alert(
      'Reset Password',
      `Send a password reset email to ${name} at ${item.email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Reset Email',
          onPress: async () => {
            try {
              try {
                await api.post(`/admin/users/${item.id}/reset-password`);
              } catch (e) {
                if (e.response?.status === 404) {
                  await api.post('/auth/reset-password', { email: item.email });
                } else throw e;
              }
              Alert.alert('Email Sent', `A reset link has been sent to ${item.email}.`);
            } catch {
              Alert.alert('Error', 'Could not send reset email. Please try again.');
            }
          },
        },
      ]
    );
  };

  // ── Counts ──
  const totalCount      = admins.length;
  const superAdminCount = admins.filter((a) => !!a.is_super_admin).length;
  const activeCount     = admins.filter((a) => a.is_active !== false).length;

  // ── Loading state ──
  if (loading) {
    return (
      <SafeAreaView edges={['top']} style={styles.centered}>
        <ActivityIndicator size="large" color={C.teal} />
        <Text style={styles.loadingText}>Loading admins…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

      {/* ── Dark navy header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIconBtn}>
          <Ionicons name="arrow-back" size={22} color={C.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Admins</Text>
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={() => navigation.navigate('AddAdmin')}
        >
          <Ionicons name="person-add-outline" size={20} color={C.white} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id ?? item.user_id)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchAdmins(true)}
            colors={[C.teal]}
            tintColor={C.teal}
          />
        }

        ListHeaderComponent={
          <>
            {/* ── 2-col stat cards ── */}
            <View style={styles.statsRow}>
              <StatCard
                label="Total Admins"
                value={totalCount}
                color={C.teal}
                fillFraction={totalCount > 0 ? activeCount / totalCount : 0}
                accent={C.tealLight}
              />
              <StatCard
                label="Super Admins"
                value={superAdminCount}
                color={C.orange}
                fillFraction={totalCount > 0 ? superAdminCount / totalCount : 0}
                accent="#FEF3E8"
              />
            </View>

            {/* ── Search bar ── */}
            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={18} color={C.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search admins…"
                placeholderTextColor={C.textMuted}
                value={search}
                onChangeText={handleSearch}
                returnKeyType="search"
                clearButtonMode="while-editing"
              />
              <TouchableOpacity style={styles.filterIconBtn}>
                <Ionicons name="options-outline" size={20} color={C.teal} />
              </TouchableOpacity>
            </View>

            {/* ── Filter tabs ── */}
            <View style={styles.filterRow}>
              {['all', 'active', 'inactive'].map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={[styles.filterTab, filterStatus === tab && styles.filterTabActive]}
                  onPress={() => handleFilterTab(tab)}
                >
                  <Text style={[styles.filterTabText, filterStatus === tab && styles.filterTabTextActive]}>
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionLabel}>Directory</Text>
          </>
        }

        ListEmptyComponent={
          error ? (
            <View style={styles.emptyWrap}>
              <MaterialCommunityIcons name="alert-circle-outline" size={48} color={C.textMuted} />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => fetchAdmins()}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <MaterialCommunityIcons name="shield-account-outline" size={56} color={C.outline} />
              <Text style={styles.emptyTitle}>
                {search ? 'No admins match your search' : 'No admins yet'}
              </Text>
              <Text style={styles.emptyText}>
                {search ? 'Try a different name or email.' : 'Tap + to add the first admin.'}
              </Text>
            </View>
          )
        }

        renderItem={({ item }) => (
          <AdminCard
            item={item}
            currentUser={currentUser}
            onToggleActive={handleToggleActive}
            onToggleSuperAdmin={handleToggleSuperAdmin}
            onDelete={handleDelete}
            onResetPassword={handleResetPassword}
          />
        )}
      />

      {/* ── FAB ── */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddAdmin')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color={C.white} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:     { flex: 1, backgroundColor: C.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg, padding: 24 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.navy,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  headerIconBtn: {
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 20,
  },
  headerTitle: {
    color: C.white, fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center',
  },

  list: { paddingBottom: 110 },

  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
  },
  statCard: {
    flex: 1,
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.cardBorder,
    padding: 14,
    elevation: 2,
    shadowColor: '#0D7A6B',
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  statLabel:   { fontSize: 12, color: C.textSub, marginBottom: 4 },
  statValue:   { fontSize: 32, fontWeight: '700', lineHeight: 38 },
  statBar:     { height: 4, borderRadius: 4, marginTop: 10, overflow: 'hidden' },
  statBarFill: { height: '100%', borderRadius: 4 },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.cardBorder,
    marginHorizontal: 16,
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput:   { flex: 1, fontSize: 14, color: C.textPrimary },
  filterIconBtn: {
    width: 36, height: 36,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.tealLight,
    borderRadius: 10,
  },

  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  filterTab: {
    paddingHorizontal: 16, paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: C.white,
    borderWidth: 1, borderColor: C.cardBorder,
  },
  filterTabActive:     { backgroundColor: C.teal, borderColor: C.teal },
  filterTabText:       { fontSize: 13, color: C.textSub, fontWeight: '500' },
  filterTabTextActive: { color: C.white, fontWeight: '600' },

  sectionLabel: {
    fontSize: 16, fontWeight: '700', color: C.textPrimary,
    marginHorizontal: 16, marginTop: 20, marginBottom: 10,
  },

  card: {
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.cardBorder,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    elevation: 2,
    shadowColor: '#0D7A6B',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  cardTop:     { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  cardInfo:    { flex: 1 },
  cardNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  cardName:    { fontSize: 15, fontWeight: '600', color: C.textPrimary, flex: 1 },

  rolePill:          { borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 },
  rolePillSuper:     { backgroundColor: C.tealLight },
  rolePillAdmin:     { backgroundColor: '#F0F0F0' },
  rolePillText:      { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  rolePillTextSuper: { color: C.teal },
  rolePillTextAdmin: { color: C.textSub },

  cardEmail:  { fontSize: 12, color: C.textSub, marginBottom: 4 },
  cardJoined: { fontSize: 10, color: C.textMuted, fontStyle: 'italic', marginBottom: 4 },

  statusPill:             { alignSelf: 'flex-start', borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2 },
  statusPillActive:       { backgroundColor: '#E6F4F1' },
  statusPillInactive:     { backgroundColor: C.redLight },
  statusPillText:         { fontSize: 10, fontWeight: '700' },
  statusPillTextActive:   { color: C.teal },
  statusPillTextInactive: { color: C.red },

  // Role toggle button (Make / Remove Super Admin)
  roleToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  roleToggleBtnPromote:     { borderColor: C.teal,  backgroundColor: C.tealLight },
  roleToggleBtnDemote:      { borderColor: '#F59E0B', backgroundColor: '#FFFBEB' },
  roleToggleBtnText:        { fontSize: 12, fontWeight: '600' },
  roleToggleBtnTextPromote: { color: C.teal },
  roleToggleBtnTextDemote:  { color: C.amber },

  cardActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: {
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  actionBtnPrimary:      { flex: 1, borderColor: C.teal },
  actionBtnPrimaryText:  { color: C.teal, fontSize: 12, fontWeight: '600' },
  actionBtnSecondary:    { flex: 1, borderColor: C.cardBorder },
  actionBtnSecondaryText:{ color: C.textSub, fontSize: 12, fontWeight: '600' },
  actionBtnDanger:       { width: 38, borderColor: '#FFD5D0', backgroundColor: '#FFF5F4' },

  avatar:     { alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: C.white, fontWeight: '700' },

  emptyWrap:  { alignItems: 'center', paddingTop: 60, gap: 8, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: C.textSub, marginTop: 8, textAlign: 'center' },
  emptyText:  { fontSize: 13, color: C.textMuted, textAlign: 'center' },
  loadingText:{ marginTop: 12, color: C.textSub, fontSize: 14 },
  errorText:  { color: C.textSub, fontSize: 14, textAlign: 'center', marginTop: 10 },
  retryBtn:   { marginTop: 16, backgroundColor: C.teal, borderRadius: 8, paddingHorizontal: 24, paddingVertical: 10 },
  retryBtnText: { color: C.white, fontWeight: '600', fontSize: 14 },

  fab: {
    position: 'absolute',
    bottom: 28, right: 22,
    width: 56, height: 56,
    borderRadius: 28,
    backgroundColor: C.orange,
    alignItems: 'center', justifyContent: 'center',
    elevation: 6,
    shadowColor: C.orange,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
});