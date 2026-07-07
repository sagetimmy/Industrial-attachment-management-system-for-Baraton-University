import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../api/axios';
import Spinner from '../../components/Spinner';
import StatusBadge from '../../components/StatusBadge';

// Design system colors (consistent with rest of IAMS app)
const NAVY = '#0F2419';
const TEAL = '#1B7A65';
const TEAL_DARK = '#0E5C4A';
const BACKGROUND = '#EEF2F0';
const ORANGE = '#E8711A';
const CORAL = '#E85D4C';
const WHITE = '#FFFFFF';
const GRAY_TEXT = '#6B7280';
const LIGHT_TEAL_BG = '#E3F2EE';
const AMBER = '#BA7517';
const RED = '#C0392B';

const TOTAL_WEEKS = 12;

const initialsFor = (name) => {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '?';
  return parts.slice(0, 2).map((p) => p[0]).join('').toUpperCase();
};

const formatDate = (value) => {
  if (!value) return 'TBD';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'TBD';
  return date.toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' });
};

const daysUntil = (value) => {
  if (!value) return null;
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return null;
  const diff = Math.ceil((target.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return diff;
};

const scoreColor = (score) => {
  if (score >= 70) return TEAL;
  if (score >= 50) return AMBER;
  return RED;
};

export default function StudentDetailScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const initialStudent = route.params?.student || {};
  const attachmentId = route.params?.attachmentId || initialStudent.attachment_id;

  const [logbooks, setLogbooks] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [siteVisits, setSiteVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!attachmentId) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const [logbookRes, evalRes, visitRes] = await Promise.all([
        api.get('/supervisors/logbooks'),
        api.get('/supervisors/evaluations'),
        api.get('/supervisors/site-visits'),
      ]);

      const myLogbooks = (logbookRes.data || [])
        .filter((e) => e.attachment_id === attachmentId)
        .sort((a, b) => (b.week_number || 0) - (a.week_number || 0));
      const myEvaluations = (evalRes.data || []).filter((e) => e.attachment_id === attachmentId);
      const myVisits = (visitRes.data || [])
        .filter((v) => v.attachment_id === attachmentId)
        .sort((a, b) => new Date(b.visit_date || 0) - new Date(a.visit_date || 0));

      setLogbooks(myLogbooks);
      setEvaluations(myEvaluations);
      setSiteVisits(myVisits);
    } catch (err) {
      console.error('Failed to load student detail data:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [attachmentId]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const name = initialStudent.full_name || initialStudent.name || 'Student';
  const status = String(initialStudent.status || 'pending').toLowerCase();

  const completedWeeks = Math.min(logbooks.length, TOTAL_WEEKS);
  const progressPercent = Math.round((completedWeeks / TOTAL_WEEKS) * 100);
  const remainingDays = daysUntil(initialStudent.end_date);

  const totalHours = useMemo(
    () => logbooks.reduce((sum, e) => sum + (Number(e.hours_worked) || 0), 0),
    [logbooks]
  );

  const overallScore = useMemo(() => {
    const evalScores = evaluations.filter((e) => e.score != null).map((e) => Number(e.score));
    if (evalScores.length) {
      return Math.round(evalScores.reduce((a, b) => a + b, 0) / evalScores.length);
    }
    const logScores = logbooks.filter((e) => e.supervisor_score != null).map((e) => Number(e.supervisor_score));
    if (logScores.length) {
      return Math.round(logScores.reduce((a, b) => a + b, 0) / logScores.length);
    }
    return null;
  }, [evaluations, logbooks]);

  const pendingCount = logbooks.filter((e) => !e.status || e.status === 'pending').length;

  const handleReviewLogbooks = () => navigation.navigate('ReviewLogbooks', { attachmentId, studentName: name });
  const handleEvaluations = () => navigation.navigate('Evaluations', { attachmentId, studentName: name });
  const handleScheduleVisit = () => navigation.navigate('SiteVisits', { attachmentId, studentName: name });

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.loadingWrap}>
          <Spinner size="large" color={TEAL} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={NAVY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Student Details</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + (attachmentId ? 100 : 24) }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[TEAL]} tintColor={TEAL} />}
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <LinearGradient colors={[TEAL, TEAL_DARK]} style={styles.avatar}>
            <Text style={styles.avatarText}>{initialsFor(name)}</Text>
          </LinearGradient>
          <Text style={styles.studentName}>{name}</Text>
          <Text style={styles.studentRole}>
            {initialStudent.org_name ? `Intern at ${initialStudent.org_name}` : (initialStudent.department || 'Attachment student')}
          </Text>
          <StatusBadge status={status} size="medium" style={{ marginTop: 4 }} />

          <View style={styles.profileInfoGrid}>
            <ProfileInfo icon="school-outline" label="Reg No." value={initialStudent.reg_number} />
            <ProfileInfo icon="account-hard-hat-outline" label="Course" value={initialStudent.course || initialStudent.department} />
            <ProfileInfo icon="calendar-account-outline" label="Year" value={initialStudent.year_of_study ? `Year ${initialStudent.year_of_study}` : null} />
            <ProfileInfo icon="phone-outline" label="Phone" value={initialStudent.phone} />
          </View>
          {initialStudent.email ? (
            <View style={styles.emailRow}>
              <Ionicons name="mail-outline" size={15} color={GRAY_TEXT} />
              <Text style={styles.emailText} numberOfLines={1}>{initialStudent.email}</Text>
            </View>
          ) : null}
        </View>

        {!attachmentId ? (
          <View style={styles.card}>
            <View style={styles.noAttachmentRow}>
              <MaterialCommunityIcons name="information-outline" size={20} color={GRAY_TEXT} />
              <Text style={styles.noAttachmentText}>
                This student has no active attachment on record yet, so there's no logbook or visit history to show.
              </Text>
            </View>
          </View>
        ) : (
          <>
            {/* Attachment / Organization Card */}
            <View style={styles.card}>
              <Text style={styles.cardSectionTitle}>Attachment</Text>
              <View style={styles.orgRow}>
                <View style={styles.orgIconCircle}>
                  <MaterialCommunityIcons name="domain" size={18} color={TEAL} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.orgName}>{initialStudent.org_name || 'Not assigned'}</Text>
                  {initialStudent.location ? <Text style={styles.orgLocation}>{initialStudent.location}</Text> : null}
                </View>
              </View>
              <View style={styles.dateGrid}>
                <View style={styles.dateTile}>
                  <Text style={styles.dateLabel}>Start Date</Text>
                  <Text style={styles.dateValue}>{formatDate(initialStudent.start_date)}</Text>
                </View>
                <View style={styles.dateTile}>
                  <Text style={styles.dateLabel}>End Date</Text>
                  <Text style={styles.dateValue}>{formatDate(initialStudent.end_date)}</Text>
                </View>
              </View>
            </View>

            {/* Progress Card */}
            <View style={styles.card}>
              <View style={styles.progressHeaderRow}>
                <Text style={styles.progressLabel}>LOGBOOK PROGRESS</Text>
                <Text style={styles.progressPercent}>{progressPercent}%</Text>
              </View>
              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
              </View>
              <View style={styles.daysRemainingRow}>
                <Ionicons name="calendar-outline" size={16} color={GRAY_TEXT} />
                <Text style={styles.daysRemainingText}>
                  {completedWeeks} of {TOTAL_WEEKS} weeks logged
                  {remainingDays != null && remainingDays >= 0 ? ` · ${remainingDays} days remaining` : ''}
                  {pendingCount > 0 ? ` · ${pendingCount} awaiting review` : ''}
                </Text>
              </View>
            </View>

            {/* Stat Cards Row */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <View style={styles.statIconCircle}>
                  <Ionicons name="time-outline" size={20} color={TEAL} />
                </View>
                <Text style={styles.statValue}>{totalHours}</Text>
                <Text style={styles.statLabel}>Hours Logged</Text>
              </View>
              <View style={styles.statCard}>
                <View style={styles.statIconCircle}>
                  <MaterialCommunityIcons name="notebook-edit-outline" size={20} color={TEAL} />
                </View>
                <Text style={styles.statValue}>{logbooks.length}</Text>
                <Text style={styles.statLabel}>Logbook Entries</Text>
              </View>
            </View>

            {/* Rating Card */}
            <TouchableOpacity style={styles.ratingCard} activeOpacity={0.7} onPress={handleEvaluations}>
              <View style={[styles.ratingIconCircle, overallScore != null && { backgroundColor: `${scoreColor(overallScore)}1F` }]}>
                <Ionicons name="star" size={20} color={overallScore != null ? scoreColor(overallScore) : ORANGE} />
              </View>
              <View style={styles.ratingTextWrap}>
                <View style={styles.ratingValueRow}>
                  <Text style={styles.ratingValue}>{overallScore != null ? `${overallScore}%` : 'No score yet'}</Text>
                </View>
                <Text style={styles.ratingLabel}>
                  {evaluations.length ? `Based on ${evaluations.length} evaluation(s)` : 'Average logbook review score'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={GRAY_TEXT} />
            </TouchableOpacity>

            {/* Quick Actions */}
            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.actionBtn} onPress={handleReviewLogbooks}>
                <MaterialCommunityIcons name="notebook-check-outline" size={20} color={TEAL} />
                <Text style={styles.actionText}>Logbooks</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={handleScheduleVisit}>
                <MaterialCommunityIcons name="map-marker-check-outline" size={20} color={TEAL} />
                <Text style={styles.actionText}>Site Visits</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={handleEvaluations}>
                <MaterialCommunityIcons name="star-check-outline" size={20} color={TEAL} />
                <Text style={styles.actionText}>Evaluations</Text>
              </TouchableOpacity>
            </View>

            {/* Site Visit History */}
            <View style={styles.sectionHeaderRow}>
              <MaterialCommunityIcons name="map-marker-radius-outline" size={18} color={CORAL} />
              <Text style={styles.sectionHeaderText}>Site Visit History</Text>
            </View>

            {siteVisits.length === 0 ? (
              <View style={styles.card}>
                <Text style={styles.emptyText}>No site visits scheduled yet.</Text>
              </View>
            ) : (
              siteVisits.slice(0, 5).map((visit) => (
                <View key={visit.visit_id} style={styles.visitCard}>
                  <View style={styles.visitCardHeaderRow}>
                    <Text style={styles.visitTitle}>{formatDate(visit.visit_date)}</Text>
                    <StatusBadge status={String(visit.status || 'scheduled').toLowerCase()} size="small" />
                  </View>
                  {visit.visit_time ? <Text style={styles.visitMeta}>{visit.visit_time}</Text> : null}
                  {visit.notes ? <Text style={styles.visitNote}>"{visit.notes}"</Text> : null}
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>

      {/* Schedule Visit FAB Button */}
      {attachmentId ? (
        <View style={[styles.fabContainer, { paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity style={styles.scheduleButton} activeOpacity={0.85} onPress={handleScheduleVisit}>
            <Ionicons name="calendar" size={18} color={WHITE} />
            <Text style={styles.scheduleButtonText}>Schedule Visit</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function ProfileInfo({ icon, label, value }) {
  return (
    <View style={styles.profileInfoItem}>
      <MaterialCommunityIcons name={icon} size={16} color={TEAL} />
      <View style={{ flex: 1 }}>
        <Text style={styles.profileInfoLabel}>{label}</Text>
        <Text style={styles.profileInfoValue} numberOfLines={1}>{value || '-'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BACKGROUND },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: BACKGROUND,
  },
  backButton: { width: 36, height: 36, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: NAVY },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4 },
  profileCard: {
    backgroundColor: WHITE,
    borderRadius: 20,
    paddingVertical: 26,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 16,
    ...cardShadow(),
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarText: { color: WHITE, fontSize: 28, fontWeight: '800' },
  studentName: { fontSize: 20, fontWeight: '700', color: NAVY, textAlign: 'center' },
  studentRole: { fontSize: 13, color: GRAY_TEXT, marginTop: 2, marginBottom: 10, textAlign: 'center' },
  profileInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    marginTop: 18,
    gap: 12,
  },
  profileInfoItem: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  profileInfoLabel: { fontSize: 11, color: GRAY_TEXT, fontWeight: '600' },
  profileInfoValue: { fontSize: 13, color: NAVY, fontWeight: '700', marginTop: 1 },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F0',
    width: '100%',
    justifyContent: 'center',
  },
  emailText: { fontSize: 13, color: GRAY_TEXT },
  card: {
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    ...cardShadow(),
  },
  cardSectionTitle: { fontSize: 13, fontWeight: '700', color: GRAY_TEXT, letterSpacing: 0.5, marginBottom: 14, textTransform: 'uppercase' },
  noAttachmentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  noAttachmentText: { flex: 1, fontSize: 13, color: GRAY_TEXT, lineHeight: 19 },
  orgRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  orgIconCircle: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: LIGHT_TEAL_BG, justifyContent: 'center', alignItems: 'center',
  },
  orgName: { fontSize: 15, fontWeight: '700', color: NAVY },
  orgLocation: { fontSize: 12, color: GRAY_TEXT, marginTop: 2 },
  dateGrid: { flexDirection: 'row', gap: 12 },
  dateTile: { flex: 1, backgroundColor: BACKGROUND, borderRadius: 12, padding: 12 },
  dateLabel: { fontSize: 11, color: GRAY_TEXT, fontWeight: '600', marginBottom: 4 },
  dateValue: { fontSize: 13, color: NAVY, fontWeight: '700' },
  progressHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  progressLabel: { fontSize: 12, fontWeight: '700', color: GRAY_TEXT, letterSpacing: 0.5 },
  progressPercent: { fontSize: 18, fontWeight: '700', color: NAVY },
  progressBarTrack: { height: 8, borderRadius: 4, backgroundColor: '#DDE3E0', overflow: 'hidden', marginBottom: 12 },
  progressBarFill: { height: 8, borderRadius: 4, backgroundColor: TEAL },
  daysRemainingRow: { flexDirection: 'row', alignItems: 'flex-start' },
  daysRemainingText: { fontSize: 13, color: GRAY_TEXT, marginLeft: 6, flex: 1, lineHeight: 18 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: WHITE, borderRadius: 16, padding: 16, ...cardShadow() },
  statIconCircle: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: LIGHT_TEAL_BG, justifyContent: 'center', alignItems: 'center', marginBottom: 10,
  },
  statValue: { fontSize: 24, fontWeight: '700', color: NAVY, marginBottom: 2 },
  statLabel: { fontSize: 12, color: GRAY_TEXT },
  ratingCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: WHITE,
    borderRadius: 16, padding: 16, marginBottom: 16, ...cardShadow(),
  },
  ratingIconCircle: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#FCEBDD', justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  ratingTextWrap: { flex: 1 },
  ratingValueRow: { flexDirection: 'row', alignItems: 'baseline' },
  ratingValue: { fontSize: 17, fontWeight: '700', color: NAVY },
  ratingLabel: { fontSize: 12, color: GRAY_TEXT, marginTop: 2 },
  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  actionBtn: {
    flex: 1, backgroundColor: WHITE, borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', gap: 6, ...cardShadow(),
  },
  actionText: { fontSize: 11, fontWeight: '700', color: NAVY },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionHeaderText: { fontSize: 16, fontWeight: '700', color: NAVY, marginLeft: 8 },
  emptyText: { fontSize: 13, color: GRAY_TEXT, textAlign: 'center', paddingVertical: 4 },
  visitCard: {
    backgroundColor: WHITE, borderRadius: 12, padding: 16, marginBottom: 14,
    borderLeftWidth: 4, borderLeftColor: TEAL, ...cardShadow(),
  },
  visitCardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  visitTitle: { fontSize: 15, fontWeight: '700', color: NAVY, flex: 1 },
  visitMeta: { fontSize: 13, color: GRAY_TEXT, marginBottom: 8 },
  visitNote: { fontSize: 13, color: '#4B5563', fontStyle: 'italic', lineHeight: 19 },
  fabContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 12, backgroundColor: 'transparent' },
  scheduleButton: {
    flexDirection: 'row', backgroundColor: ORANGE, borderRadius: 30, paddingVertical: 16,
    justifyContent: 'center', alignItems: 'center', gap: 8,
    shadowColor: ORANGE, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  scheduleButtonText: { color: WHITE, fontSize: 16, fontWeight: '700' },
});

function cardShadow() {
  return Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
    android: { elevation: 2 },
    web: { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  });
}