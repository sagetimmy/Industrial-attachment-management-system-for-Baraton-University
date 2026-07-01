import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, RefreshControl, TextInput,
  Pressable, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../../api/axios';
import Spinner from '../../components/Spinner';

// ── Design Tokens ─────────────────────────────────────────────────────────────
const BG     = '#EEF2F0';
const WHITE  = '#FFFFFF';
const TEAL   = '#1B7A65';
const DARK   = '#0F2419';
const GRAY   = '#7A8F86';
const BORDER = '#D8E4DF';
const ORANGE = '#E8711A';
const ORANGE_SOFT = '#FFF3E0';
const ORANGE_TEXT = '#E65100';

const { width } = Dimensions.get('window');

// ── Badge config ──────────────────────────────────────────────────────────────
const badgeConfig = (type) => {
  switch ((type || '').toLowerCase()) {
    case 'senior faculty':
    case 'senior':
      return { bg: '#E8F5E9', color: '#1B7A65', label: 'SENIOR FACULTY' };
    case 'new review':
    case 'pending':
      return { bg: ORANGE_SOFT, color: ORANGE_TEXT, label: 'NEW REVIEW' };
    case 'inactive':
      return { bg: '#FFEBEE', color: '#C62828', label: 'INACTIVE' };
    default:
      return { bg: '#EDE7F6', color: '#6A1B9A', label: type?.toUpperCase() || 'FACULTY' };
  }
};

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, subtext, subtextColor, icon, progressValue, progressMax, children }) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statCardHeader}>
        <Text style={styles.statLabel}>{label}</Text>
        {icon && <MaterialCommunityIcons name={icon} size={22} color={GRAY} />}
      </View>
      <Text style={[styles.statValue, subtextColor && !subtext?.includes('%') && {}]}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </Text>
      {subtext ? (
        <Text style={[styles.statSubtext, { color: subtextColor || TEAL }]}>{subtext}</Text>
      ) : null}
      {progressValue !== undefined && (
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${Math.min((progressValue / (progressMax || 1)) * 100, 100)}%` }]} />
        </View>
      )}
      {children}
    </View>
  );
}

// ── Supervisor Card ───────────────────────────────────────────────────────────
function SupervisorCard({ supervisor, onManage, onAssign }) {
  const badge = badgeConfig(supervisor.badge_type || supervisor.faculty_type);
  const initials = supervisor.name
    ? supervisor.name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  const studentCount = supervisor.student_count ?? supervisor.assigned_students ?? 0;

  return (
    <Pressable
      style={({ pressed }) => [styles.supCard, pressed && { opacity: 0.95 }]}
      onPress={() => onManage(supervisor)}
    >
      {/* Top row: avatar + name/dept + badge */}
      <View style={styles.supCardTop}>
        <View style={styles.supAvatar}>
          <Text style={styles.supAvatarText}>{initials}</Text>
        </View>

        <View style={styles.supInfo}>
          <Text style={styles.supName} numberOfLines={1}>{supervisor.name || 'Unknown'}</Text>
          <Text style={styles.supDept} numberOfLines={1}>
            {supervisor.department || supervisor.dept || '—'}
          </Text>
          <View style={[styles.supBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.supBadgeText, { color: badge.color }]}>{badge.label}</Text>
          </View>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.supDivider} />

      {/* Stats row — Rating removed, Students stat now centered alone */}
      <View style={styles.supStatsRow}>
        <View style={styles.supStat}>
          <Text style={styles.supStatValue}>{String(studentCount).padStart(2, '0')}</Text>
          <Text style={styles.supStatLabel}>Students</Text>
        </View>
      </View>

      {/* Action row */}
      <View style={styles.supActions}>
        <TouchableOpacity
          style={styles.manageBtn}
          onPress={() => onManage(supervisor)}
          accessibilityLabel={`Manage ${supervisor.name}`}
        >
          <Text style={styles.manageBtnText}>Manage</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.assignIconBtn}
          onPress={() => onAssign(supervisor)}
          accessibilityLabel={`Assign student to ${supervisor.name}`}
        >
          <MaterialCommunityIcons name="account-plus-outline" size={20} color={TEAL} />
        </TouchableOpacity>
      </View>
    </Pressable>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function SupervisorsScreen({ navigation }) {
  const [supervisors, setSupervisors]   = useState([]);
  const [filtered, setFiltered]         = useState([]);
  const [stats, setStats]               = useState({ total: 0, active: 0, pendingReview: 0 });
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [search, setSearch]             = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [departments, setDepartments]   = useState([]);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchSupervisors = async () => {
    try {
      const [supRes, dashRes] = await Promise.all([
        api.get('/admin/supervisors'),
        api.get('/admin/dashboard'),
      ]);

      // GET /admin/supervisors now returns { supervisors, totals } instead of
      // a bare array — fall back to the bare-array shape too, just in case.
      const rawList = Array.isArray(supRes.data)
        ? supRes.data
        : supRes.data?.supervisors || [];
      const apiTotals = Array.isArray(supRes.data) ? {} : supRes.data?.totals || {};

      // API returns full_name / supervisor_id; normalize to the name / user_id
      // fields this screen renders and passes along to the assign flow.
      const list = rawList.map(s => ({
        ...s,
        name: s.name || s.full_name || 'Unknown',
        user_id: s.user_id || s.supervisor_id,
      }));
      setSupervisors(list);
      setFiltered(list);

      // Extract unique departments for filter pills
      const depts = [...new Set(list.map(s => s.department || s.dept).filter(Boolean))];
      setDepartments(depts);

      // Compute stats — prefer totals returned by /admin/supervisors, then
      // /admin/dashboard, then fall back to client-side derivation.
      const dashStats = dashRes.data?.stats || {};
      const active        = list.filter(s => s.is_active !== false).length;
      const pendingReview = list.filter(s =>
        (s.badge_type || s.faculty_type || '').toLowerCase().includes('review') ||
        (s.badge_type || s.faculty_type || '').toLowerCase() === 'pending'
      ).length;

      setStats({
        total:         apiTotals.totalSupervisors ?? dashStats.totalSupervisors ?? list.length,
        active:        apiTotals.activeLoads ?? dashStats.activeSupervisors ?? active,
        pendingReview: apiTotals.pendingReviews ?? dashStats.pendingSupervisors ?? pendingReview,
      });
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load supervisors');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchSupervisors(); }, []);

  // ── Filter + search ───────────────────────────────────────────────────────
  useEffect(() => {
    let result = supervisors;

    if (activeFilter !== 'all') {
      result = result.filter(s =>
        (s.department || s.dept || '').toLowerCase() === activeFilter.toLowerCase()
      );
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(s =>
        s.name?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.department?.toLowerCase().includes(q)
      );
    }

    setFiltered(result);
  }, [search, activeFilter, supervisors]);

  const onRefresh = () => { setRefreshing(true); fetchSupervisors(); };

  // ── CHANGE: "Manage" now routes into the new ManageSupervisorsScreen
  // instead of SupervisorDetail.
  const handleManage = (supervisor) => {
    navigation.navigate('ManageSupervisors', { supervisor });
  };

  // "Assign Student" routes into the existing AssignSupervisor
  // screen (Step 2 pre-selects this supervisor) instead of the AssignStudent
  // placeholder screen.
  const handleAssign = (supervisor) => {
    navigation.navigate('AssignSupervisor', {
      supervisorId: supervisor.user_id,
      supervisorName: supervisor.name,
    });
  };

  // active % for progress bar
  const activePercent = stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0;

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Spinner size="large" color={TEAL} />
        <Text style={styles.loadingText}>Loading supervisors...</Text>
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
        <Text style={styles.topBarTitle}>Supervisor Directory</Text>
        <TouchableOpacity style={styles.iconBtn} accessibilityLabel="Notifications">
          <Ionicons name="notifications-outline" size={22} color={DARK} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[TEAL]} tintColor={TEAL} />}
      >
        {/* ── Stat Cards ── */}
        {/* Total Supervisors */}
        <StatCard
          label="TOTAL SUPERVISORS"
          value={stats.total}
          icon="account-group-outline"
        />

        {/* Active Now */}
        <StatCard
          label="ACTIVE NOW"
          value={stats.active}
          progressValue={stats.active}
          progressMax={stats.total}
        />

        {/* Pending Review */}
        <StatCard
          label="PENDING REVIEW"
          value={String(stats.pendingReview).padStart(2, '0')}
          icon="clipboard-clock-outline"
          subtext="Action required for approvals"
          subtextColor={ORANGE_TEXT}
        />

        {/* ── Search ── */}
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={GRAY} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, email or ID..."
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

        {/* ── Department filter pills ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterRow}
        >
          <TouchableOpacity
            style={[styles.filterPill, activeFilter === 'all' && styles.filterPillActive]}
            onPress={() => setActiveFilter('all')}
          >
            <Text style={[styles.filterPillText, activeFilter === 'all' && styles.filterPillTextActive]}>
              All Departments
            </Text>
          </TouchableOpacity>

          {departments.map((dept) => (
            <TouchableOpacity
              key={dept}
              style={[styles.filterPill, activeFilter === dept && styles.filterPillActive]}
              onPress={() => setActiveFilter(dept)}
              accessibilityLabel={`Filter by ${dept}`}
            >
              <Text style={[styles.filterPillText, activeFilter === dept && styles.filterPillTextActive]}>
                {dept}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Count ── */}
        <Text style={styles.countText}>{filtered.length} supervisor{filtered.length !== 1 ? 's' : ''}</Text>

        {/* ── Supervisor list ── */}
        {filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="account-tie-outline" size={48} color={GRAY} />
            <Text style={styles.emptyText}>No supervisors found</Text>
          </View>
        ) : (
          filtered.map((supervisor, index) => (
            <SupervisorCard
              key={supervisor.user_id || index}
              supervisor={supervisor}
              onManage={handleManage}
              onAssign={handleAssign}
            />
          ))
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ── FAB ── */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddSupervisor')}
        accessibilityLabel="Add new supervisor"
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
  backBtn: { padding: 4, marginRight: 8 },
  topBarTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: DARK },
  iconBtn: { padding: 6 },

  // Scroll
  scrollContent: { paddingHorizontal: 16, paddingBottom: 100 },

  // Stat Card
  statCard: {
    backgroundColor: WHITE,
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  statCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 12,
    color: GRAY,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  statValue: {
    fontSize: 42,
    fontWeight: '800',
    color: TEAL,
    lineHeight: 52,
  },
  statSubtext: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
    fontStyle: 'italic',
  },

  // Progress bar
  progressBar: {
    height: 8,
    backgroundColor: BORDER,
    borderRadius: 4,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: TEAL,
    borderRadius: 4,
  },

  // Search
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHITE,
    borderRadius: 30,
    paddingHorizontal: 16,
    paddingVertical: 13,
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  searchInput: { flex: 1, fontSize: 14, color: DARK },

  // Filter pills
  filterScroll: { marginBottom: 4 },
  filterRow: { flexDirection: 'row', gap: 8, paddingBottom: 14 },
  filterPill: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 30,
    backgroundColor: WHITE,
    borderWidth: 1.5,
    borderColor: BORDER,
  },
  filterPillActive: { backgroundColor: TEAL, borderColor: TEAL },
  filterPillText: { fontSize: 13, fontWeight: '600', color: GRAY },
  filterPillTextActive: { color: WHITE },

  // Count
  countText: { fontSize: 13, color: GRAY, fontWeight: '500', marginBottom: 12 },

  // Supervisor Card
  supCard: {
    backgroundColor: WHITE,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  supCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  supAvatar: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: DARK,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  supAvatarText: { fontSize: 20, fontWeight: '800', color: WHITE },
  supInfo: { flex: 1 },
  supName: { fontSize: 16, fontWeight: '700', color: DARK, marginBottom: 3 },
  supDept: { fontSize: 13, color: GRAY, marginBottom: 7 },
  supBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  supBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

  // Divider
  supDivider: { height: 1, backgroundColor: BORDER, marginBottom: 14 },

  // Stats row — single centered stat now that Rating is removed
  supStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  supStat: { alignItems: 'center' },
  supStatValue: { fontSize: 22, fontWeight: '800', color: TEAL },
  supStatLabel: { fontSize: 12, color: GRAY, marginTop: 2 },

  // Actions
  supActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  manageBtn: {
    flex: 1,
    backgroundColor: TEAL,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  manageBtnText: { fontSize: 14, fontWeight: '700', color: WHITE },
  assignIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WHITE,
  },

  // Empty
  emptyCard: {
    backgroundColor: WHITE,
    padding: 40,
    borderRadius: 18,
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
  },
  emptyText: { color: GRAY, fontSize: 14, fontWeight: '500' },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 20,
    width: 56, height: 56,
    borderRadius: 28,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
});