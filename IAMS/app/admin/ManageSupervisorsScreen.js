import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../../api/axios';

// ---- Design tokens (IAMS) ----
const T = {
  navy: '#0F2419',
  teal: '#1B7A65',
  bg: '#EEF2F0',
  orange: '#E8711A',
  white: '#FFFFFF',
  textDark: '#13231C',
  textMuted: '#6B7A73',
  border: '#E2E8E4',
  danger: '#C0392B',
  trackBg: '#E5E9E6',
};

// TODO: backend endpoint for supervisor list with workload/student-count stats
// does not exist yet. This screen uses GET /admin/supervisors for the base list
// (same source as SupervisorsScreen.js) and falls back to MOCK workload data
// (activeLoad %, pendingReviews, studentCount/capacity) until a dedicated
// /admin/supervisors/workload-summary route is built.
const MOCK_STATS = {
  totalSupervisors: 18,
  activeLoads: 12,
  activeLoadsTrend: '+8%',
  pendingReviews: 45,
  pendingReviewsLevel: 'High',
};

const MOCK_WORKLOAD_BY_ID = {};

function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('');
}

function WorkloadBar({ filled, total, statusColor }) {
  const pct = total > 0 ? Math.min(100, (filled / total) * 100) : 0;
  return (
    <View style={styles.workloadBarTrack}>
      <View
        style={[
          styles.workloadBarFill,
          { width: `${pct}%`, backgroundColor: statusColor },
        ]}
      />
    </View>
  );
}

export default function ManageSupervisorScreen({ navigation }) {
  const [supervisors, setSupervisors] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSupervisors = useCallback(async () => {
    try {
      // Reuses the same endpoint as SupervisorsScreen.js
      const res = await api.get('/admin/supervisors');
      const raw = Array.isArray(res.data) ? res.data : res.data?.supervisors || [];

      const normalized = raw.map((s, idx) => {
        // Normalize API shape (full_name/supervisor_id) -> screen shape (name/id)
        const id = s.supervisor_id || s.user_id || s.id;
        const mock = MOCK_WORKLOAD_BY_ID[id] || {
          studentCount: (idx * 3) % 10,
          capacity: 10,
        };
        return {
          id,
          name: s.full_name || s.name || 'Unknown',
          department: s.department || s.dept || 'N/A',
          avatarUrl: s.avatar_url || s.photo_url || null,
          studentCount: mock.studentCount,
          capacity: mock.capacity,
          raw: s,
        };
      });

      setSupervisors(normalized);
    } catch (err) {
      console.error('Failed to fetch supervisors:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSupervisors();
  }, [fetchSupervisors]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSupervisors();
  };

  const filtered = supervisors.filter((s) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      s.department.toLowerCase().includes(q)
    );
  });

  const statusColorFor = (filled, capacity) => {
    if (filled >= capacity) return T.orange;
    if (filled === 0) return T.textMuted;
    return T.teal;
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={T.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Supervisors</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('AdminAnnouncements')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="notifications-outline" size={22} color={T.white} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.teal} />
        }
      >
        {/* Total Supervisors stat */}
        <View style={styles.statCardLarge}>
          <View style={{ flex: 1 }}>
            <Text style={styles.statLabel}>TOTAL SUPERVISORS</Text>
            <Text style={styles.statValueLarge}>{supervisors.length || MOCK_STATS.totalSupervisors}</Text>
          </View>
          <View style={styles.statIconCircle}>
            <Ionicons name="people" size={26} color={T.teal} />
          </View>
        </View>

        {/* Active Loads / Pending Reviews row */}
        <View style={styles.statRow}>
          <View style={[styles.statCardSmall, { marginRight: 12 }]}>
            <Text style={styles.statLabel}>ACTIVE LOADS</Text>
            <View style={styles.statSmallRow}>
              <Text style={styles.statValueSmall}>{MOCK_STATS.activeLoads}</Text>
              <Text style={styles.statTrendUp}>
                {'  '}
                <MaterialCommunityIcons name="trending-up" size={14} color={T.teal} />
                {' ' + MOCK_STATS.activeLoadsTrend}
              </Text>
            </View>
          </View>
          <View style={styles.statCardSmall}>
            <Text style={styles.statLabel}>PENDING REVIEWS</Text>
            <View style={styles.statSmallRow}>
              <Text style={styles.statValueSmall}>{MOCK_STATS.pendingReviews}</Text>
              <Text style={styles.statTagHigh}>{'  ' + MOCK_STATS.pendingReviewsLevel}</Text>
            </View>
          </View>
        </View>

        {/* Search + filter */}
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={T.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              placeholder="Search by name or dept..."
              placeholderTextColor={T.textMuted}
              value={search}
              onChangeText={setSearch}
              style={styles.searchInput}
            />
          </View>
          <TouchableOpacity style={styles.filterButton}>
            {/* TODO: wire up real filter options (department, workload status) */}
            <MaterialCommunityIcons name="tune-variant" size={20} color={T.navy} />
          </TouchableOpacity>
        </View>

        {/* Section header */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>All Supervisors</Text>
          <Text style={styles.sectionCount}>Showing {filtered.length} results</Text>
        </View>

        {/* List */}
        {loading ? (
          <ActivityIndicator color={T.teal} style={{ marginTop: 40 }} />
        ) : filtered.length === 0 ? (
          <Text style={styles.emptyText}>No supervisors found.</Text>
        ) : (
          filtered.map((s) => {
            const color = statusColorFor(s.studentCount, s.capacity);
            return (
              <View key={s.id} style={styles.card}>
                <View style={styles.cardTopRow}>
                  {s.avatarUrl ? (
                    <Image source={{ uri: s.avatarUrl }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <Text style={styles.avatarInitials}>{getInitials(s.name)}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.cardName}>{s.name}</Text>
                    <Text style={styles.cardDept}>{s.department}</Text>
                  </View>
                  <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="ellipsis-vertical" size={18} color={T.textMuted} />
                  </TouchableOpacity>
                </View>

                <View style={styles.cardBottomRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.workloadLabel}>WORKLOAD STATUS</Text>
                    <View style={styles.workloadRow}>
                      <View style={[styles.statusDot, { backgroundColor: color }]} />
                      <WorkloadBar
                        filled={s.studentCount}
                        total={s.capacity}
                        statusColor={color}
                      />
                      <Text style={styles.workloadCount}>
                        {s.studentCount}/{s.capacity} Students
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() =>
                      navigation.navigate('SupervisorDetail', { supervisor: s.raw })
                    }
                  >
                    <Text style={styles.detailsLink}>Details</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() =>
          // Reuses existing 2-step registration flow, preset to supervisor role
          navigation.navigate('AddUser', { presetRole: 'supervisor' })
        }
      >
        <Ionicons name="person-add" size={18} color={T.white} />
        <Text style={styles.fabText}>Add New Supervisor</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: T.bg },
  header: {
    backgroundColor: T.navy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: { color: T.white, fontSize: 18, fontWeight: '700' },
  scrollContent: { padding: 16, paddingBottom: 24 },

  statCardLarge: {
    backgroundColor: T.white,
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statLabel: { color: T.textMuted, fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
  statValueLarge: { color: T.navy, fontSize: 32, fontWeight: '800', marginTop: 6 },
  statIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E3F1ED',
    alignItems: 'center',
    justifyContent: 'center',
  },

  statRow: { flexDirection: 'row', marginBottom: 16 },
  statCardSmall: {
    flex: 1,
    backgroundColor: T.white,
    borderRadius: 16,
    padding: 16,
  },
  statSmallRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 6, flexWrap: 'wrap' },
  statValueSmall: { color: T.navy, fontSize: 24, fontWeight: '800' },
  statTrendUp: { color: T.teal, fontSize: 12, fontWeight: '600' },
  statTagHigh: { color: T.danger, fontSize: 12, fontWeight: '700' },

  searchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  searchBar: {
    flex: 1,
    backgroundColor: T.white,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: T.textDark },
  filterButton: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: T.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: T.navy },
  sectionCount: { fontSize: 13, color: T.textMuted },

  emptyText: { textAlign: 'center', color: T.textMuted, marginTop: 40 },

  card: {
    backgroundColor: T.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  cardTopRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: T.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: { color: T.white, fontWeight: '700', fontSize: 16 },
  cardName: { fontSize: 16, fontWeight: '700', color: T.navy },
  cardDept: { fontSize: 13, color: T.textMuted, marginTop: 2 },

  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  workloadLabel: { fontSize: 11, color: T.textMuted, fontWeight: '600', letterSpacing: 0.5, marginBottom: 6 },
  workloadRow: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  workloadBarTrack: {
    width: 90,
    height: 6,
    borderRadius: 3,
    backgroundColor: T.trackBg,
    overflow: 'hidden',
    marginRight: 8,
  },
  workloadBarFill: { height: '100%', borderRadius: 3 },
  workloadCount: { fontSize: 12, color: T.textDark, fontWeight: '500' },
  detailsLink: { color: T.teal, fontWeight: '700', fontSize: 14 },

  fab: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    backgroundColor: T.orange,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  fabText: { color: T.white, fontWeight: '700', fontSize: 15, marginLeft: 8 },
});