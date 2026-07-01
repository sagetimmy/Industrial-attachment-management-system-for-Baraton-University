import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/axios';

// ── Design Tokens (matches admin design system) ────────────────────────────
const BG         = '#EEF2F0';
const WHITE      = '#FFFFFF';
const TEAL       = '#1B7A65';
const TEAL_LIGHT = '#E0F5F1';
const MINT       = '#2EC4B6';
const DARK       = '#0F2419';
const GRAY       = '#7A8F86';
const BORDER     = '#D8E4DF';
const ORANGE     = '#E8711A';
const MAROON     = '#8B3A3A';

const STATUS_COLORS = {
  ongoing:   TEAL,
  approved:  TEAL,
  completed: GRAY,
  pending:   ORANGE,
  rejected:  MAROON,
};

function getInitials(name = '') {
  return name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '??';
}

function StatCard({ label, value, borderColor, suffix }) {
  return (
    <View style={[styles.statCard, { borderLeftColor: borderColor }]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color: borderColor }]}>
        {value}{suffix ? <Text style={styles.statSuffix}>{suffix}</Text> : null}
      </Text>
    </View>
  );
}

function PlacementRow({ placement }) {
  const statusColor = STATUS_COLORS[placement.status] || GRAY;
  return (
    <View style={styles.placementCard}>
      <View style={styles.placementAvatar}>
        <Text style={styles.placementAvatarText}>{getInitials(placement.student_name)}</Text>
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.placementName}>{placement.student_name}</Text>
        <Text style={styles.placementDept}>{placement.department || 'Department not set'}</Text>
      </View>
      <View style={[styles.statusPill, { backgroundColor: `${statusColor}1A` }]}>
        <Text style={[styles.statusPillText, { color: statusColor }]}>
          {placement.status?.toUpperCase() || 'UNKNOWN'}
        </Text>
      </View>
    </View>
  );
}

export default function OrgDetailsScreen({ navigation, route }) {
  const { orgId, orgName } = route.params;
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAllPlacements, setShowAllPlacements] = useState(false);

  const fetchOrg = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get(`/admin/org-details/${orgId}`);
      setOrg(res.data);
    } catch (err) {
      console.error('Failed to load organization details:', err);
      setError('Failed to load organization details.');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchOrg();
  }, [fetchOrg]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { justifyContent: 'center', alignItems: 'center' }]} edges={['top']}>
        <ActivityIndicator color={TEAL} size="large" />
      </SafeAreaView>
    );
  }

  if (error || !org) {
    return (
      <SafeAreaView style={[styles.safe, { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }]} edges={['top']}>
        <Text style={{ fontSize: 15, color: GRAY, textAlign: 'center', marginBottom: 16 }}>
          {error || 'Organization not found.'}
        </Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchOrg}>
          <Text style={styles.retryBtnText}>Try Again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const name = org.org_name || orgName || 'Unknown Organization';
  const location = org.location || 'Location not set';
  const placements = org.placements || [];
  const visiblePlacements = showAllPlacements ? placements : placements.slice(0, 3);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIconBtn}>
          <Ionicons name="arrow-back" size={22} color={WHITE} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Organization Details</Text>
        <TouchableOpacity style={styles.headerIconBtn}>
          <Ionicons name="ellipsis-vertical" size={20} color={WHITE} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* ── Profile Card ── */}
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>{getInitials(name)}</Text>
          </View>
          <Text style={styles.profileName}>{name}</Text>
          <Text style={styles.profileLocation}>{location}</Text>
        </View>

        {/* ── Stat Cards ── */}
        <View style={styles.statRow}>
          <StatCard label="TOTAL INTERNS"   value={org.total_interns ?? 0}                       borderColor={TEAL} />
          <StatCard label="OPEN VACANCIES"  value={String(org.open_vacancies ?? 0).padStart(2, '0')} borderColor={ORANGE} />
        </View>
        <View style={styles.statRow}>
          <StatCard
            label="COMPLETION RATE"
            value={org.completion_rate != null ? org.completion_rate : '—'}
            suffix={org.completion_rate != null ? '%' : ''}
            borderColor={MINT}
          />
          <StatCard
            label="AVG. RATING"
            value={org.avg_rating != null ? Number(org.avg_rating).toFixed(1) : '—'}
            borderColor={MAROON}
          />
        </View>

        {/* ── About ── */}
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.aboutCard}>
          <Text style={styles.aboutText}>
            {org.description || 'No description provided by this organization yet.'}
          </Text>
        </View>

        {/* ── Active Placements ── */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Active Placements</Text>
          {placements.length > 3 && (
            <TouchableOpacity onPress={() => setShowAllPlacements(v => !v)}>
              <Text style={styles.viewAllLink}>{showAllPlacements ? 'Show Less' : 'View All'}</Text>
            </TouchableOpacity>
          )}
        </View>

        {placements.length === 0 ? (
          <Text style={{ fontSize: 13, color: GRAY, marginBottom: 16 }}>
            No students have been placed at this organization yet.
          </Text>
        ) : (
          visiblePlacements.map((p) => (
            <PlacementRow key={p.attachment_id} placement={p} />
          ))
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },

  header: {
    backgroundColor: DARK,
    paddingVertical: 14,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerIconBtn: { padding: 8 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: WHITE, textAlign: 'left' },

  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 },

  profileCard: {
    backgroundColor: WHITE,
    borderRadius: 18,
    paddingVertical: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  profileAvatar: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: TEAL,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  profileAvatarText: { fontSize: 32, fontWeight: '800', color: WHITE },
  profileName: { fontSize: 20, fontWeight: '700', color: DARK, marginBottom: 4, textAlign: 'center' },
  profileLocation: { fontSize: 13, color: GRAY, textAlign: 'center' },

  statRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statCard: {
    flex: 1,
    backgroundColor: WHITE,
    borderRadius: 14,
    borderLeftWidth: 4,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  statLabel: { fontSize: 11, fontWeight: '700', color: GRAY, letterSpacing: 0.4, marginBottom: 6 },
  statValue: { fontSize: 26, fontWeight: '800' },
  statSuffix: { fontSize: 16, fontWeight: '700' },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: DARK, marginTop: 8, marginBottom: 12 },
  sectionRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8,
  },
  viewAllLink: { fontSize: 13, fontWeight: '700', color: TEAL, marginBottom: 12 },

  aboutCard: {
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
  },
  aboutText: { fontSize: 14, color: DARK, lineHeight: 22 },

  placementCard: {
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  placementAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: TEAL_LIGHT,
    alignItems: 'center', justifyContent: 'center',
  },
  placementAvatarText: { fontSize: 14, fontWeight: '800', color: TEAL },
  placementName: { fontSize: 15, fontWeight: '700', color: DARK },
  placementDept: { fontSize: 12, color: GRAY, marginTop: 2 },
  statusPill: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  statusPillText: { fontSize: 11, fontWeight: '700' },

  retryBtn: {
    backgroundColor: WHITE,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderWidth: 1.5,
    borderColor: TEAL,
  },
  retryBtnText: { color: TEAL, fontSize: 15, fontWeight: '700' },
});