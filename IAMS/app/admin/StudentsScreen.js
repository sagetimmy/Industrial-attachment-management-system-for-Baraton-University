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
const BG       = '#EEF2F0';
const WHITE    = '#FFFFFF';
const TEAL     = '#1B7A65';
const DARK     = '#0F2419';
const GRAY     = '#7A8F86';
const BORDER   = '#D8E4DF';
const ORANGE   = '#E8711A';
const RED_TEXT = '#C0392B';

const { width } = Dimensions.get('window');
const STAT_W = (width - 48) / 2;   // two-column stat cards

// ── Status config ─────────────────────────────────────────────────────────────
const statusConfig = (status) => {
  switch ((status || '').toLowerCase()) {
    case 'placed':
    case 'ongoing':
    case 'active':
      return { bg: '#E8F5E9', color: '#1B7A65', label: 'PLACED' };
    case 'pending':
      return { bg: '#FFF3E0', color: '#E65100', label: 'PENDING' };
    case 'unplaced':
    case 'unassigned':
      return { bg: '#F5F5F5', color: '#616161', label: 'UNPLACED' };
    case 'completed':
      return { bg: '#E3F2FD', color: '#1565C0', label: 'COMPLETED' };
    default:
      return { bg: '#F5F5F5', color: '#888', label: status || 'UNKNOWN' };
  }
};

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, valueColor, icon, wide }) {
  return (
    <View style={[styles.statCard, wide && styles.statCardWide]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color: valueColor || TEAL }]}>
        {Number(value || 0).toLocaleString()}
      </Text>
      <View style={styles.statIconWrap}>
        <MaterialCommunityIcons name={icon} size={40} color={BORDER} />
      </View>
    </View>
  );
}

// ── Student Card ──────────────────────────────────────────────────────────────
function StudentCard({ student, onViewProfile, onAssign }) {
  const status = statusConfig(student.attachment_status || student.status);
  const initials = student.name
    ? student.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  return (
    <Pressable
      style={({ pressed }) => [styles.studentCard, pressed && { opacity: 0.95 }]}
      onPress={() => onViewProfile(student)}
    >
      {/* Avatar */}
      <View style={styles.cardAvatarWrap}>
        <View style={styles.cardAvatar}>
          <Text style={styles.cardAvatarText}>{initials}</Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.cardContent}>
        {/* Name + status badge */}
        <View style={styles.cardNameRow}>
          <Text style={styles.cardName} numberOfLines={1}>{student.name || 'Unknown'}</Text>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        {/* Reg number */}
        <Text style={styles.cardReg}>
          Reg: {student.reg_number || student.student_id || '—'}
        </Text>

        {/* Department */}
        {student.department || student.course ? (
          <View style={styles.cardDeptRow}>
            <Ionicons name="school-outline" size={13} color={TEAL} style={{ marginRight: 4 }} />
            <Text style={styles.cardDept} numberOfLines={1}>
              {student.department || student.course}
            </Text>
          </View>
        ) : null}

        {/* Divider */}
        <View style={styles.cardDivider} />

        {/* Action buttons */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.viewProfileBtn}
            onPress={() => onViewProfile(student)}
            accessibilityLabel={`View profile of ${student.name}`}
          >
            <Text style={styles.viewProfileText}>View Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.assignBtn}
            onPress={() => onAssign(student)}
            accessibilityLabel={`Assign supervisor to ${student.name}`}
          >
            <Text style={styles.assignBtnText}>Assign</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Pressable>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function StudentsScreen({ navigation }) {
  const [students, setStudents]     = useState([]);
  const [filtered, setFiltered]     = useState([]);
  const [stats, setStats]           = useState({ total: 0, placed: 0, pending: 0 });
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]         = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchStudents = async () => {
    try {
      const [studentsRes, statsRes] = await Promise.all([
        api.get('/admin/students'),
        api.get('/admin/dashboard'),
      ]);

      const list = studentsRes.data || [];
      setStudents(list);
      setFiltered(list);

      // Pull stats from dashboard or compute from list
      const dashStats = statsRes.data?.stats || {};
      const placed  = list.filter(s => ['placed','ongoing','active'].includes((s.attachment_status || s.status || '').toLowerCase())).length;
      const pending = list.filter(s => (s.attachment_status || s.status || '').toLowerCase() === 'pending').length;

      setStats({
        total:   dashStats.totalStudents || list.length,
        placed:  dashStats.placedStudents || placed,
        pending: dashStats.pendingStudents || pending,
      });
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load students');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchStudents(); }, []);

  // ── Filter + search ───────────────────────────────────────────────────────
  useEffect(() => {
    let result = students;
    if (activeFilter !== 'all') {
      result = result.filter(s => {
        const st = (s.attachment_status || s.status || '').toLowerCase();
        if (activeFilter === 'placed')   return ['placed', 'ongoing', 'active'].includes(st);
        if (activeFilter === 'pending')  return st === 'pending';
        if (activeFilter === 'unplaced') return ['unplaced', 'unassigned', ''].includes(st);
        return true;
      });
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(s =>
        s.name?.toLowerCase().includes(q) ||
        s.reg_number?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.department?.toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [search, activeFilter, students]);

  const onRefresh = () => { setRefreshing(true); fetchStudents(); };

  const handleAssign = (student) => {
    navigation.navigate('AssignSupervisor', {
      attachmentId: student.attachment_id,
      studentName: student.name,
    });
  };

  const handleViewProfile = (student) => {
    navigation.navigate('StudentDetail', { student });
  };

  const filters = [
    { key: 'all',      label: 'All' },
    { key: 'placed',   label: 'Placed' },
    { key: 'pending',  label: 'Pending' },
    { key: 'unplaced', label: 'Unplaced' },
  ];

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Spinner size="large" color={TEAL} />
        <Text style={styles.loadingText}>Loading students...</Text>
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
        <View style={styles.topBarTitleWrap}>
          <Text style={styles.topBarTitle}>Student</Text>
          <Text style={styles.topBarTitle}>Management</Text>
        </View>
        <View style={styles.topBarRight}>
          <TouchableOpacity style={styles.iconBtn} accessibilityLabel="Search">
            <Ionicons name="search-outline" size={22} color={TEAL} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} accessibilityLabel="Notifications">
            <Ionicons name="notifications-outline" size={22} color={TEAL} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[TEAL]} tintColor={TEAL} />}
      >
        {/* ── Stats grid ── */}
        <View style={styles.statsGrid}>
          {/* Total Students + Placed — two column */}
          <StatCard
            label="Total Students"
            value={stats.total}
            valueColor={TEAL}
            icon="account-group-outline"
          />
          <StatCard
            label="Placed"
            value={stats.placed}
            valueColor={TEAL}
            icon="checkbox-marked-circle-outline"
          />
          {/* Pending — full width */}
          <StatCard
            label="Pending"
            value={stats.pending}
            valueColor={RED_TEXT}
            icon="clipboard-clock-outline"
            wide
          />
        </View>

        {/* ── Search + filter icon ── */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color={GRAY} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name..."
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
          <TouchableOpacity style={styles.filterIconBtn} accessibilityLabel="Filter options">
            <Ionicons name="filter-outline" size={20} color={DARK} />
          </TouchableOpacity>
        </View>

        {/* ── Filter pills ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterRow}
        >
          {filters.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterPill, activeFilter === f.key && styles.filterPillActive]}
              onPress={() => setActiveFilter(f.key)}
              accessibilityLabel={`Filter ${f.label}`}
            >
              <Text style={[styles.filterPillText, activeFilter === f.key && styles.filterPillTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Section header ── */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Recent Enrolments</Text>
          <TouchableOpacity onPress={() => setActiveFilter('all')}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {/* ── Student list ── */}
        {filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="account-school-outline" size={48} color={GRAY} />
            <Text style={styles.emptyText}>No students found</Text>
          </View>
        ) : (
          filtered.map((student, index) => (
            <StudentCard
              key={student.user_id || student.student_id || index}
              student={student}
              onViewProfile={handleViewProfile}
              onAssign={handleAssign}
            />
          ))
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ── FAB ── */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddStudent')}
        accessibilityLabel="Add new student"
      >
        <MaterialCommunityIcons name="account-plus-outline" size={26} color={WHITE} />
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
    paddingTop: 4,
    paddingBottom: 12,
    backgroundColor: BG,
  },
  backBtn: { padding: 4, marginRight: 8 },
  topBarTitleWrap: { flex: 1 },
  topBarTitle: { fontSize: 20, fontWeight: '800', color: TEAL, lineHeight: 26 },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { padding: 6 },

  // Scroll
  scrollContent: { paddingHorizontal: 16, paddingBottom: 100 },

  // Stats grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    width: STAT_W,
    backgroundColor: WHITE,
    borderRadius: 18,
    padding: 18,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  statCardWide: {
    width: '100%',
  },
  statLabel: {
    fontSize: 13,
    color: GRAY,
    fontWeight: '600',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 36,
    fontWeight: '800',
    color: TEAL,
  },
  statIconWrap: {
    position: 'absolute',
    bottom: 8,
    right: 12,
    opacity: 0.5,
  },

  // Search row
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHITE,
    borderRadius: 30,
    paddingHorizontal: 16,
    paddingVertical: 13,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  searchInput: { flex: 1, fontSize: 14, color: DARK },
  filterIconBtn: {
    width: 48, height: 48,
    backgroundColor: WHITE,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },

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

  // Section header
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: DARK },
  viewAllText: { fontSize: 14, color: TEAL, fontWeight: '600' },

  // Student card
  studentCard: {
    backgroundColor: WHITE,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  // Avatar
  cardAvatarWrap: { marginRight: 14, marginTop: 2 },
  cardAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#C8E6E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardAvatarText: { fontSize: 20, fontWeight: '800', color: TEAL },

  // Card content
  cardContent: { flex: 1 },
  cardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 8,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '700',
    color: DARK,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

  cardReg: { fontSize: 12, color: GRAY, marginBottom: 5 },

  cardDeptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardDept: { fontSize: 13, color: TEAL, fontWeight: '600', flex: 1 },

  cardDivider: { height: 1, backgroundColor: BORDER, marginVertical: 12 },

  // Card actions
  cardActions: { flexDirection: 'row', gap: 10 },
  viewProfileBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: BORDER,
    alignItems: 'center',
  },
  viewProfileText: { fontSize: 13, fontWeight: '600', color: DARK },
  assignBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 30,
    backgroundColor: TEAL,
    alignItems: 'center',
  },
  assignBtnText: { fontSize: 13, fontWeight: '700', color: WHITE },

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