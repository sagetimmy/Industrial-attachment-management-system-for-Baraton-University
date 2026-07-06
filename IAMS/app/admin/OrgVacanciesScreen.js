import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, RefreshControl, TextInput, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../../api/axios';
import Spinner from '../../components/Spinner';

// ── Design Tokens (matches ManageOrgsScreen) ───────────────────────────────────
const BG          = '#EEF2F0';
const WHITE       = '#FFFFFF';
const TEAL        = '#1B7A65';
const DARK        = '#0F2419';
const GRAY        = '#7A8F86';
const BORDER      = '#D8E4DF';
const ORANGE_TEXT = '#E65100';

// ── Org Logo Placeholder ────────────────────────────────────────────────────
// No `sector` column exists on host_organizations, so this uses a neutral
// scheme (same fallback ManageOrgsScreen uses when sector is null).
function OrgLogo({ name }) {
  const initial = (name || '?')[0].toUpperCase();
  return (
    <View style={styles.orgLogo}>
      <Text style={styles.orgLogoText}>{initial}</Text>
    </View>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, valueColor, icon }) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statCardHeader}>
        <MaterialCommunityIcons name={icon} size={28} color={valueColor || TEAL} />
        <Text style={styles.statLabel}>{label}</Text>
      </View>
      <Text style={[styles.statValue, { color: valueColor || TEAL }]}>
        {Number(value || 0).toLocaleString()}
      </Text>
    </View>
  );
}

// ── Vacancy Card ──────────────────────────────────────────────────────────────
function VacancyCard({ org, onPress }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.vacCard, pressed && { opacity: 0.95 }]}
      onPress={() => onPress(org)}
    >
      <View style={styles.vacTop}>
        <OrgLogo name={org.org_name} />

        <View style={styles.vacInfo}>
          <Text style={styles.vacTitle} numberOfLines={1}>
            {org.org_name || 'Unknown Org'}
          </Text>
          <Text style={styles.vacSubtext} numberOfLines={1}>
            {org.location || 'Location not specified'}
          </Text>
          {org.contact_person ? (
            <Text style={styles.vacSubtext} numberOfLines={1}>
              Contact: {org.contact_person}
            </Text>
          ) : null}
        </View>

        <View style={styles.openBadge}>
          <Text style={styles.openBadgeText}>OPEN</Text>
        </View>
      </View>

      <View style={styles.vacDivider} />

      <View style={styles.vacStatsRow}>
        <View style={styles.vacStat}>
          <Text style={styles.vacStatLabel}>OPEN SLOTS</Text>
          <Text style={[styles.vacStatValue, { color: ORANGE_TEXT }]}>
            {String(org.vacancy_count).padStart(2, '0')}
          </Text>
        </View>
        <View style={styles.vacStatDivider} />
        <View style={styles.vacStat}>
          <Text style={styles.vacStatLabel}>TOTAL SLOTS</Text>
          <Text style={styles.vacStatValue}>
            {String(org.available_slots).padStart(2, '0')}
          </Text>
        </View>
        <View style={styles.vacStatDivider} />
        <View style={styles.vacStat}>
          <Text style={styles.vacStatLabel}>CURRENT INTERNS</Text>
          <Text style={styles.vacStatValue}>
            {String(org.intern_count).padStart(2, '0')}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function OrgVacanciesScreen({ navigation, route }) {
  // Opened from an org's "Vacancies" button -> route.params.orgId scopes
  // the list to that org. Opened with no params -> shows every org that
  // currently has an open slot.
  const { orgId, orgName } = route?.params || {};

  const [vacancies, setVacancies]   = useState([]);
  const [filtered, setFiltered]     = useState([]);
  const [stats, setStats]           = useState({ totalVacancies: 0, orgsHiring: 0 });
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]         = useState('');

  const fetchVacancies = async () => {
    try {
      const params = {};
      if (orgId) params.orgId = orgId;

      const res = await api.get('/admin/vacancies', { params });

      setVacancies(res.data?.vacancies || []);
      setStats(res.data?.stats || { totalVacancies: 0, orgsHiring: 0 });
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load vacancies');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchVacancies(); }, [orgId]);

  useEffect(() => {
    let result = vacancies;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(v =>
        (v.org_name || '').toLowerCase().includes(q) ||
        (v.location || '').toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [search, vacancies]);

  const onRefresh = () => { setRefreshing(true); fetchVacancies(); };

  const handlePress = (org) => {
    navigation.navigate('OrgDetail', {
      orgId: org.org_id,
      orgName: org.org_name,
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Spinner size="large" color={TEAL} />
        <Text style={styles.loadingText}>Loading vacancies...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>

      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={TEAL} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>
          {orgName ? `${orgName} Vacancies` : 'All Vacancies'}
        </Text>
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[TEAL]} tintColor={TEAL} />
        }
      >
        <View style={styles.statsGrid}>
          <StatCard
            label="OPEN SLOTS"
            value={stats.totalVacancies}
            valueColor={ORANGE_TEXT}
            icon="briefcase-clock-outline"
          />
          <StatCard
            label="ORGS HIRING"
            value={stats.orgsHiring}
            valueColor={TEAL}
            icon="office-building-outline"
          />
        </View>

        {!orgId && (
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color={GRAY} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search organisation or location..."
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
        )}

        <Text style={styles.countText}>
          {filtered.length} organisation{filtered.length !== 1 ? 's' : ''} with open slots
        </Text>

        {filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="briefcase-search-outline" size={48} color={GRAY} />
            <Text style={styles.emptyText}>No open vacancies right now</Text>
          </View>
        ) : (
          filtered.map((org) => (
            <VacancyCard key={org.org_id} org={org} onPress={handlePress} />
          ))
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG },
  loadingText: { marginTop: 12, color: GRAY, fontSize: 14 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: BG,
  },
  backBtn: { padding: 4, marginRight: 8 },
  topBarTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: TEAL },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn: { padding: 6 },
  profileCircle: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: TEAL,
    alignItems: 'center', justifyContent: 'center',
  },

  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },

  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: WHITE,
    borderRadius: 18,
    padding: 18,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  statCardHeader: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 10,
  },
  statLabel: { fontSize: 11, color: GRAY, fontWeight: '700', letterSpacing: 0.6 },
  statValue: { fontSize: 36, fontWeight: '800' },

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

  countText: { fontSize: 13, color: GRAY, fontWeight: '500', marginBottom: 12 },

  vacCard: {
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
  vacTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  orgLogo: {
    width: 48, height: 48, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
    backgroundColor: '#F0F4F3',
  },
  orgLogoText: { fontSize: 18, fontWeight: '800', color: GRAY },
  vacInfo: { flex: 1 },
  vacTitle: { fontSize: 15, fontWeight: '700', color: DARK, marginBottom: 2 },
  vacSubtext: { fontSize: 12, color: GRAY, marginTop: 1 },
  openBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginLeft: 8,
  },
  openBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4, color: TEAL },

  vacDivider: { height: 1, backgroundColor: BORDER, marginBottom: 12 },

  vacStatsRow: { flexDirection: 'row', alignItems: 'center' },
  vacStat: { flex: 1, alignItems: 'center' },
  vacStatLabel: { fontSize: 10, color: GRAY, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  vacStatValue: { fontSize: 20, fontWeight: '800', color: TEAL },
  vacStatDivider: { width: 1, height: 32, backgroundColor: BORDER },

  emptyCard: {
    backgroundColor: WHITE,
    padding: 40,
    borderRadius: 18,
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
  },
  emptyText: { color: GRAY, fontSize: 14, fontWeight: '500' },
});