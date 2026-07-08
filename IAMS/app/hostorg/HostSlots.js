import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

const TEAL   = '#0F6E56';
const CORAL  = '#A0430A';
const BG     = '#EFF4F3';
const WHITE  = '#FFFFFF';
const GRAY   = '#8899AA';

const TABS = ['Active', 'Drafts', 'Closed'];

// Maps tab label to vacancy status values from the API.
// 'open' is in Active because that's the status the backend inserts on
// POST /host-orgs/vacancies.
const TAB_STATUS = {
  Active:  ['active', 'ongoing', 'open'],
  Drafts:  ['draft'],
  Closed:  ['closed', 'filled'],
};

export default function HostSlots({ navigation }) {
  const { user } = useAuth();
  const [loading, setLoading]       = useState(true);
  const [vacancies, setVacancies]   = useState([]);
  const [slotsData, setSlotsData]   = useState(null);
  const [activeTab, setActiveTab]   = useState('Active');
  const [search, setSearch]         = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [vacRes, slotRes] = await Promise.all([
        api.get('/host-orgs/vacancies').catch(() => ({ data: [] })),
        api.get('/host-orgs/available-slots').catch(() => ({ data: null })),
      ]);
      setVacancies(vacRes.data || []);
      setSlotsData(slotRes.data);
    } catch (err) {
      Alert.alert('Error', 'Failed to load vacancies');
    } finally {
      setLoading(false);
    }
  };

  // A vacancy counts as expired once its deadline has passed, regardless
  // of what its `status` column currently says (nothing auto-updates it
  // on the backend yet).
  const isExpired = (v) => {
    if (!v.application_deadline) return false;
    const deadline = new Date(v.application_deadline);
    const today = new Date(new Date().toDateString()); // strip time
    return deadline < today;
  };

  // Filter by tab + search
  const filtered = vacancies.filter(v => {
    const status = v.status?.toLowerCase();
    const expired = isExpired(v);

    let matchesTab;
    if (activeTab === 'Closed') {
      // Explicitly closed/filled OR past its deadline
      matchesTab = TAB_STATUS.Closed.includes(status) || expired;
    } else if (activeTab === 'Active') {
      // Active status AND not expired
      matchesTab = TAB_STATUS.Active.includes(status) && !expired;
    } else {
      matchesTab = TAB_STATUS[activeTab]?.includes(status) ?? true;
    }

    const matchesSearch = !search.trim() ||
      (v.role_title || v.title || '').toLowerCase().includes(search.toLowerCase()) ||
      v.department?.toLowerCase().includes(search.toLowerCase());

    return matchesTab && matchesSearch;
  });

  const getFilledLabel = (v) => {
    const used  = v.used_slots  ?? v.applicants_accepted ?? 0;
    const total = v.total_slots ?? v.available_slots ?? 0;
    return { used, total, label: `${used}/${total} FILLED` };
  };

  const getProgress = (v) => {
    const { used, total } = getFilledLabel(v);
    if (!total) return 0;
    return Math.min(1, used / total);
  };

  // Build stacked avatar initials from applicant list or generate placeholders
  const getAvatarSeeds = (v) => {
    if (Array.isArray(v.recent_applicants) && v.recent_applicants.length) {
      return v.recent_applicants.slice(0, 3).map(a =>
        a.full_name?.charAt(0).toUpperCase() || '?'
      );
    }
    // fallback: show 2 placeholder letters
    return ['A', 'B'];
  };

  const getExtraCount = (v) => {
    const total = v.applicant_count ?? v.application_count ?? 0;
    return Math.max(0, total - 3);
  };

  if (loading) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={s.backIcon}>‹</Text>
          </TouchableOpacity>
        </View>
        <View style={s.centered}>
          <ActivityIndicator size="large" color={TEAL} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.root}>

        {/* ── Header ── */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Text style={s.backIcon}>‹</Text>
          </TouchableOpacity>
        </View>

        {/* ── Page title ── */}
        <View style={s.titleRow}>
          <Text style={s.pageTitle}>Vacancy Management</Text>
        </View>

        {/* ── Search + Filter ── */}
        <View style={s.searchRow}>
          <View style={s.searchBox}>
            <Text style={s.searchIcon}>🔍</Text>
            <TextInput
              style={s.searchInput}
              placeholder="Search vacancies..."
              placeholderTextColor={GRAY}
              value={search}
              onChangeText={setSearch}
            />
          </View>
          <TouchableOpacity style={s.filterBtn}>
            <Text style={s.filterIcon}>≡</Text>
          </TouchableOpacity>
        </View>

        {/* ── Tabs ── */}
        <View style={s.tabRow}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab}
              style={[s.tab, activeTab === tab && s.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Vacancy list ── */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scrollContent}
        >
          {filtered.length === 0 ? (
            <View style={s.emptyCard}>
              <Text style={s.emptyIcon}>📭</Text>
              <Text style={s.emptyTitle}>No {activeTab} Vacancies</Text>
              <Text style={s.emptyText}>Tap + to post a new vacancy.</Text>
            </View>
          ) : (
            filtered.map((v, i) => {
              const { label: filledLabel } = getFilledLabel(v);
              const progress  = getProgress(v);
              const avatars   = getAvatarSeeds(v);
              const extra     = getExtraCount(v);
              const appCount  = v.applicant_count ?? v.application_count ?? 0;
              const expired   = isExpired(v);

              return (
                <View key={v.vacancy_id ?? v.id ?? i} style={s.card}>

                  {/* Top row: title + applicant badge */}
                  <View style={s.cardTopRow}>
                    <Text style={s.vacancyTitle} numberOfLines={2}>
                      {v.role_title || v.title || 'Untitled'}
                    </Text>
                    <View style={s.applicantBadge}>
                      <Text style={s.applicantBadgeIcon}>≡</Text>
                      <Text style={s.applicantBadgeCount}>{appCount}</Text>
                      <Text style={s.applicantBadgeLabel}>APPLICANT{appCount !== 1 ? 'S' : ''}</Text>
                    </View>
                  </View>

                  {/* Department */}
                  <Text style={s.department}>{v.department || v.description || '—'}</Text>

                  {/* Expired flag, shown only in the Closed tab for deadline-expired items */}
                  {activeTab === 'Closed' && expired && (
                    <Text style={s.expiredTag}>EXPIRED — deadline passed</Text>
                  )}

                  {/* Slots row */}
                  <View style={s.slotsRow}>
                    <Text style={s.slotsLabel}>SLOTS AVAILABLE</Text>
                    <Text style={s.slotsFilled}>{filledLabel}</Text>
                  </View>

                  {/* Progress bar */}
                  <View style={s.progressTrack}>
                    <View style={[s.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
                  </View>

                  {/* Bottom row: avatars + CTA */}
                  <View style={s.cardBottomRow}>
                    <View style={s.avatarStack}>
                      {avatars.map((letter, idx) => (
                        <View
                          key={idx}
                          style={[s.avatarCircle, { marginLeft: idx === 0 ? 0 : -10, zIndex: avatars.length - idx }]}
                        >
                          <Text style={s.avatarLetter}>{letter}</Text>
                        </View>
                      ))}
                      {extra > 0 && (
                        <View style={[s.avatarCircle, s.avatarExtra, { marginLeft: -10 }]}>
                          <Text style={s.avatarExtraText}>+{extra}</Text>
                        </View>
                      )}
                    </View>

                    <TouchableOpacity
                      style={s.viewBtn}
                      onPress={() => navigation.navigate('HostApplicants', { vacancyId: v.vacancy_id ?? v.id })}
                    >
                      <Text style={s.viewBtnText}>VIEW APPLICANTS</Text>
                    </TouchableOpacity>
                  </View>

                </View>
              );
            })
          )}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* ── FAB ── */}
        <TouchableOpacity
          style={s.fab}
          onPress={() => navigation.navigate('PostVacancy')}
        >
          <Text style={s.fabIcon}>+</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  root: { flex: 1, backgroundColor: BG },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // header
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  backBtn: { alignSelf: 'flex-start' },
  backIcon: { fontSize: 32, color: TEAL, fontWeight: '300', lineHeight: 36 },

  // title
  titleRow: { paddingHorizontal: 16, marginBottom: 16 },
  pageTitle: { fontSize: 24, fontWeight: '800', color: TEAL },

  // search
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 14,
    gap: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHITE,
    borderRadius: 30,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: 14, color: '#111' },
  filterBtn: {
    width: 44, height: 44,
    backgroundColor: WHITE,
    borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  filterIcon: { fontSize: 20, color: TEAL, fontWeight: '700' },

  // tabs
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 0,
    backgroundColor: '#DCE8E5',
    marginHorizontal: 16,
    borderRadius: 30,
    padding: 4,
  },
  tab: {
    flex: 1, paddingVertical: 10,
    borderRadius: 26,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: TEAL },
  tabText: { fontSize: 14, fontWeight: '600', color: GRAY },
  tabTextActive: { color: WHITE, fontWeight: '700' },

  // scroll
  scrollContent: { paddingHorizontal: 16, paddingTop: 4 },

  // card
  card: {
    backgroundColor: WHITE,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },

  // card top row
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
    gap: 10,
  },
  vacancyTitle: {
    flex: 1, fontSize: 17, fontWeight: '800', color: TEAL, lineHeight: 24,
  },
  applicantBadge: {
    backgroundColor: CORAL,
    borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 6,
    alignItems: 'center',
    minWidth: 66,
  },
  applicantBadgeIcon: { color: WHITE, fontSize: 10, marginBottom: 1 },
  applicantBadgeCount: { color: WHITE, fontSize: 15, fontWeight: '800', lineHeight: 18 },
  applicantBadgeLabel: { color: WHITE, fontSize: 9, fontWeight: '700', letterSpacing: 0.3 },

  // department
  department: { fontSize: 13, color: GRAY, marginBottom: 14 },

  // expired tag
  expiredTag: {
    fontSize: 11, fontWeight: '700', color: CORAL,
    marginTop: -8, marginBottom: 12, letterSpacing: 0.3,
  },

  // slots
  slotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  slotsLabel: { fontSize: 11, fontWeight: '700', color: GRAY, letterSpacing: 0.5 },
  slotsFilled: { fontSize: 11, fontWeight: '700', color: TEAL, letterSpacing: 0.4 },

  // progress
  progressTrack: {
    height: 7, backgroundColor: '#E0EDE9',
    borderRadius: 4, marginBottom: 14,
  },
  progressFill: {
    height: 7, backgroundColor: TEAL,
    borderRadius: 4,
  },

  // card bottom row
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatarStack: { flexDirection: 'row', alignItems: 'center' },
  avatarCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#B2D4CA',
    borderWidth: 2, borderColor: WHITE,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarLetter: { fontSize: 12, fontWeight: '800', color: TEAL },
  avatarExtra: { backgroundColor: '#E0EDE9' },
  avatarExtraText: { fontSize: 10, fontWeight: '800', color: TEAL },

  // view button
  viewBtn: {
    backgroundColor: CORAL,
    borderRadius: 30,
    paddingHorizontal: 18, paddingVertical: 11,
  },
  viewBtnText: { color: WHITE, fontWeight: '800', fontSize: 12, letterSpacing: 0.5 },

  // FAB
  fab: {
    position: 'absolute', bottom: 28, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: CORAL,
    alignItems: 'center', justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8,
  },
  fabIcon: { color: WHITE, fontSize: 30, fontWeight: '300', lineHeight: 34 },

  // empty
  emptyCard: {
    backgroundColor: WHITE, borderRadius: 20,
    padding: 40, alignItems: 'center', marginTop: 10,
    elevation: 2,
  },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#333', marginBottom: 4 },
  emptyText: { fontSize: 13, color: GRAY, textAlign: 'center' },
});