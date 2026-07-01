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
const BG          = '#EEF2F0';
const WHITE       = '#FFFFFF';
const TEAL        = '#1B7A65';
const DARK        = '#0F2419';
const GRAY        = '#7A8F86';
const BORDER      = '#D8E4DF';
const ORANGE      = '#E8711A';
const ORANGE_TEXT = '#E65100';
const ORANGE_SOFT = '#FFF3E0';

const { width } = Dimensions.get('window');
const STAT_W = (width - 48) / 2;

// ── Org type badge config ─────────────────────────────────────────────────────
const orgBadgeConfig = (type) => {
  switch ((type || '').toLowerCase()) {
    case 'premium':
      return { bg: '#E8F5E9', color: TEAL,        label: 'PREMIUM'  };
    case 'gov':
    case 'government':
      return { bg: '#F5F5F5', color: '#616161',   label: 'GOV'      };
    case 'startup':
      return { bg: ORANGE_SOFT, color: ORANGE_TEXT, label: 'STARTUP' };
    case 'ngo':
      return { bg: '#E3F2FD', color: '#1565C0',   label: 'NGO'      };
    case 'corporate':
      return { bg: '#EDE7F6', color: '#6A1B9A',   label: 'CORPORATE'};
    default:
      return { bg: '#F5F5F5', color: GRAY,        label: type?.toUpperCase() || 'ORG' };
  }
};

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

// ── Org Logo Placeholder ──────────────────────────────────────────────────────
function OrgLogo({ name, sector }) {
  const initial = (name || '?')[0].toUpperCase();
  // pick a soft bg based on sector
  const colors = {
    technology: { bg: '#E8F0FE', color: '#1A73E8' },
    healthcare:  { bg: '#E8F5E9', color: TEAL      },
    finance:     { bg: '#FFF8E1', color: '#F9A825' },
    education:   { bg: '#EDE7F6', color: '#7B1FA2' },
    media:       { bg: ORANGE_SOFT, color: ORANGE_TEXT },
  };
  const key = Object.keys(colors).find(k => (sector || '').toLowerCase().includes(k));
  const scheme = colors[key] || { bg: '#F0F4F3', color: GRAY };

  return (
    <View style={[styles.orgLogo, { backgroundColor: scheme.bg }]}>
      <Text style={[styles.orgLogoText, { color: scheme.color }]}>{initial}</Text>
    </View>
  );
}

// ── Org Card ──────────────────────────────────────────────────────────────────
function OrgCard({ org, onDetails, onVacancies }) {
  const badge = orgBadgeConfig(org.org_type || org.type);
  const interns    = org.intern_count    ?? org.current_interns    ?? 0;
  const vacancies  = org.vacancy_count   ?? org.available_slots    ?? 0;

  return (
    <Pressable
      style={({ pressed }) => [styles.orgCard, pressed && { opacity: 0.95 }]}
      onPress={() => onDetails(org)}
    >
      {/* Top: logo + name/sector + badge */}
      <View style={styles.orgCardTop}>
        <OrgLogo name={org.org_name || org.name} sector={org.sector || org.industry} />

        <View style={styles.orgInfo}>
          <View style={styles.orgNameRow}>
            <Text style={styles.orgName} numberOfLines={1}>
              {org.org_name || org.name || 'Unknown Org'}
            </Text>
            <View style={[styles.orgBadge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.orgBadgeText, { color: badge.color }]}>{badge.label}</Text>
            </View>
          </View>
          <Text style={styles.orgSector} numberOfLines={1}>
            {org.sector || org.industry || '—'}
          </Text>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.orgDivider} />

      {/* Stats row */}
      <View style={styles.orgStatsRow}>
        <View style={styles.orgStat}>
          <Text style={styles.orgStatLabel}>INTERNS</Text>
          <Text style={styles.orgStatValue}>{String(interns).padStart(2, '0')}</Text>
        </View>
        <View style={styles.orgStatDivider} />
        <View style={styles.orgStat}>
          <Text style={styles.orgStatLabel}>VACANCIES</Text>
          <Text style={[styles.orgStatValue, { color: ORANGE_TEXT }]}>
            {String(vacancies).padStart(2, '0')}
          </Text>
        </View>
      </View>

      {/* Action row */}
      <View style={styles.orgActions}>
        <TouchableOpacity
          style={styles.detailsBtn}
          onPress={() => onDetails(org)}
          accessibilityLabel={`View details for ${org.org_name || org.name}`}
        >
          <Text style={styles.detailsBtnText}>Details</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.vacanciesBtn}
          onPress={() => onVacancies(org)}
          accessibilityLabel={`View vacancies for ${org.org_name || org.name}`}
        >
          <Text style={styles.vacanciesBtnText}>Vacancies</Text>
        </TouchableOpacity>
      </View>
    </Pressable>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function ManageOrgsScreen({ navigation }) {
  const [orgs, setOrgs]                 = useState([]);
  const [filtered, setFiltered]         = useState([]);
  const [stats, setStats]               = useState({ total: 0, vacancies: 0 });
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [search, setSearch]             = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [sectors, setSectors]           = useState([]);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchOrgs = async () => {
    try {
      const [orgsRes, dashRes] = await Promise.all([
        api.get('/admin/orgs'),
        api.get('/admin/dashboard'),
      ]);

      const list = orgsRes.data || [];
      setOrgs(list);
      setFiltered(list);

      // Extract unique sectors for filter pills
      const uniqueSectors = [...new Set(
        list.map(o => o.sector || o.industry).filter(Boolean)
      )];
      setSectors(uniqueSectors);

      // Stats
      const dashStats = dashRes.data?.stats || {};
      const totalVacancies = list.reduce((sum, o) =>
        sum + (o.vacancy_count ?? o.available_slots ?? 0), 0
      );

      setStats({
        total:     dashStats.totalOrgs     || list.length,
        vacancies: dashStats.totalVacancies || totalVacancies,
      });
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load organisations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchOrgs(); }, []);

  // ── Filter + search ───────────────────────────────────────────────────────
  useEffect(() => {
    let result = orgs;

    if (activeFilter !== 'all') {
      result = result.filter(o =>
        (o.sector || o.industry || '').toLowerCase().includes(activeFilter.toLowerCase())
      );
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(o =>
        (o.org_name || o.name || '').toLowerCase().includes(q) ||
        (o.sector   || o.industry || '').toLowerCase().includes(q) ||
        (o.location || '').toLowerCase().includes(q)
      );
    }

    setFiltered(result);
  }, [search, activeFilter, orgs]);

  const onRefresh = () => { setRefreshing(true); fetchOrgs(); };

  // FIX: previously passed the whole org object as `{ org }`, but
  // OrgDetailsScreen reads route.params.orgId / route.params.orgName —
  // so orgId came through as undefined, the API call hit
  // /admin/org-details/undefined, and Supabase's .single() threw, causing
  // the "Failed to load organization details" error.
  const handleDetails = (org) => {
    navigation.navigate('OrgDetail', {
      orgId: org.org_id || org.host_org_id,
      orgName: org.org_name || org.name,
    });
  };

  const handleVacancies = (org) => {
    navigation.navigate('OrgVacancies', {
      orgId:   org.org_id   || org.host_org_id,
      orgName: org.org_name || org.name,
    });
  };

  const handleApproveOrg = (org) => {
    Alert.alert(
      'Approve Organisation',
      `Approve ${org.org_name || org.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              await api.put(`/admin/approve-org/${org.org_id || org.host_org_id}`);
              Alert.alert('Approved', `${org.org_name || org.name} has been approved.`);
              fetchOrgs();
            } catch {
              Alert.alert('Error', 'Failed to approve organisation');
            }
          },
        },
      ]
    );
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Spinner size="large" color={TEAL} />
        <Text style={styles.loadingText}>Loading organisations...</Text>
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
        <Text style={styles.topBarTitle}>Host Organizations</Text>
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
        {/* ── Stat Cards — two column ── */}
        <View style={styles.statsGrid}>
          <StatCard
            label="TOTAL ORGS"
            value={stats.total}
            valueColor={TEAL}
            icon="office-building-outline"
          />
          <StatCard
            label="VACANCIES"
            value={stats.vacancies}
            valueColor={ORANGE_TEXT}
            icon="briefcase-clock-outline"
          />
        </View>

        {/* ── Search ── */}
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={GRAY} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search sector or name..."
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

        {/* ── Sector filter pills ── */}
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
              All Sectors
            </Text>
          </TouchableOpacity>

          {sectors.map((sector) => (
            <TouchableOpacity
              key={sector}
              style={[styles.filterPill, activeFilter === sector && styles.filterPillActive]}
              onPress={() => setActiveFilter(sector)}
              accessibilityLabel={`Filter by ${sector}`}
            >
              <Text style={[styles.filterPillText, activeFilter === sector && styles.filterPillTextActive]}>
                {sector}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Count ── */}
        <Text style={styles.countText}>
          {filtered.length} organisation{filtered.length !== 1 ? 's' : ''}
        </Text>

        {/* ── Org list ── */}
        {filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="office-building-outline" size={48} color={GRAY} />
            <Text style={styles.emptyText}>No organisations found</Text>
          </View>
        ) : (
          filtered.map((org, index) => (
            <OrgCard
              key={org.org_id || org.host_org_id || index}
              org={org}
              onDetails={handleDetails}
              onVacancies={handleVacancies}
            />
          ))
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ── FAB ── */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddOrg')}
        accessibilityLabel="Add new organisation"
      >
        <MaterialCommunityIcons name="office-building-plus-outline" size={26} color={WHITE} />
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
  topBarTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: TEAL },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn: { padding: 6 },
  profileCircle: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: TEAL,
    alignItems: 'center', justifyContent: 'center',
  },

  // Scroll
  scrollContent: { paddingHorizontal: 16, paddingBottom: 100 },

  // Stats grid
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
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
  statLabel: {
    fontSize: 11,
    color: GRAY,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  statValue: {
    fontSize: 36,
    fontWeight: '800',
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

  // Org Card
  orgCard: {
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
  orgCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  orgLogo: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  orgLogoText: { fontSize: 22, fontWeight: '800' },
  orgInfo: { flex: 1 },
  orgNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  orgName: { fontSize: 16, fontWeight: '700', color: DARK, flex: 1 },
  orgBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  orgBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
  orgSector: { fontSize: 13, color: GRAY },

  // Org divider
  orgDivider: { height: 1, backgroundColor: BORDER, marginBottom: 14 },

  // Org stats row
  orgStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  orgStat: { flex: 1, alignItems: 'center' },
  orgStatLabel: {
    fontSize: 11,
    color: GRAY,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  orgStatValue: {
    fontSize: 24,
    fontWeight: '800',
    color: TEAL,
  },
  orgStatDivider: { width: 1, height: 40, backgroundColor: BORDER },

  // Org actions
  orgActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailsBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: BORDER,
    alignItems: 'center',
  },
  detailsBtnText: { fontSize: 14, fontWeight: '600', color: DARK },
  vacanciesBtn: {
    flex: 2,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: TEAL,
    alignItems: 'center',
  },
  vacanciesBtnText: { fontSize: 14, fontWeight: '700', color: WHITE },

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