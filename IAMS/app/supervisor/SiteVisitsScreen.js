import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, RefreshControl,
  useWindowDimensions, Modal, Image, Platform
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

// Light tints derived from COLORS.primary / COLORS.secondary (not present in constants/colors.js)
const ORANGE_LIGHT = '#FBEAE0';
const NAVY_LIGHT = '#E7ECF2';
// Screen-specific override: header + hero card use this green per mockup, rather than
// COLORS.secondary (navy) used elsewhere in the app. Sampled from the mockup image.
const HERO_GREEN = '#0E7A6B';

export default function SiteVisitsScreen({ navigation, route }) {
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const { attachmentId, studentName } = route.params || {};
  const [visits, setVisits] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    attachment_id: attachmentId || '',
    visit_date: '',
    visit_time: '',
    notes: '',
  });
  const isTablet = width >= 768;
  const isDesktop = width >= 1100;

  const fetchData = async () => {
    try {
      const [visitsRes, studentsRes] = await Promise.all([
        api.get('/supervisors/site-visits'),
        api.get('/supervisors/students'),
      ]);
      setVisits(visitsRes.data);
      setStudents(studentsRes.data);
    } catch (err) {
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async () => {
    if (!form.attachment_id || !form.visit_date) {
      Alert.alert('Error', 'Please select a student and visit date');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/supervisors/site-visits', form);
      Alert.alert('Success! 🎉', 'Site visit scheduled successfully!');
      setShowForm(false);
      setForm({ attachment_id: attachmentId || '', visit_date: '', visit_time: '', notes: '' });
      fetchData();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to schedule visit');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = (visitId, status) => {
    Alert.alert('Update Visit', `Mark this visit as ${status}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          try {
            await api.put(`/supervisors/site-visits/${visitId}`, { status });
            fetchData();
          } catch (err) {
            Alert.alert('Error', 'Failed to update visit');
          }
        }
      }
    ]);
  };

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  // --- Group visits: next / upcoming / past ---
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const isUpcoming = (v) => v.status === 'scheduled' && new Date(v.visit_date) >= today;

  const upcomingSorted = visits
    .filter(isUpcoming)
    .sort((a, b) => new Date(a.visit_date) - new Date(b.visit_date));

  const nextVisit = upcomingSorted[0] || null;
  const restUpcoming = upcomingSorted.slice(1);
  const pastVisits = visits
    .filter((v) => !isUpcoming(v))
    .sort((a, b) => new Date(b.visit_date) - new Date(a.visit_date));

  const dayNum = (d) => {
    const date = new Date(d);
    return isNaN(date) ? '--' : date.toLocaleDateString('en', { day: '2-digit' });
  };
  const monthAbbr = (d) => {
    const date = new Date(d);
    return isNaN(date) ? '' : date.toLocaleDateString('en', { month: 'short' }).toUpperCase();
  };
  const fullDate = (d) => {
    const date = new Date(d);
    return isNaN(date) ? 'Date TBD' : date.toLocaleDateString('en', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  // Initials fallback for header avatar when no photo URL is available
  const getInitials = (name) => {
    if (!name) return '';
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0].toUpperCase())
      .join('');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.lightGray }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={[styles.contentWrap, isTablet && styles.contentWrapTablet, isDesktop && styles.contentWrapDesktop]}>

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color={HERO_GREEN} />
            </TouchableOpacity>
            <Text style={styles.title}>Site Visits</Text>
            {user?.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={styles.avatarCircle} />
            ) : (
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarInitials}>{getInitials(user?.full_name) || '?'}</Text>
              </View>
            )}
          </View>

          {/* Hero: Next Scheduled Visit */}
          {nextVisit ? (
            <View style={[styles.heroCard, isTablet && styles.cardNarrow]}>
              <View style={styles.heroTopRow}>
                <View style={styles.heroBadge}>
                  <Text style={styles.heroBadgeText}>NEXT SCHEDULED VISIT</Text>
                </View>
                <TouchableOpacity
                  style={styles.heroIconBtn}
                  onPress={() => {
                    Alert.alert(nextVisit.student_name, 'Update this visit', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Mark Completed', onPress: () => handleUpdateStatus(nextVisit.visit_id, 'completed') },
                      { text: 'Cancel Visit', style: 'destructive', onPress: () => handleUpdateStatus(nextVisit.visit_id, 'cancelled') },
                    ]);
                  }}
                >
                  <MaterialCommunityIcons name="calendar-arrow-right" size={18} color={COLORS.white} />
                </TouchableOpacity>
              </View>
              <Text style={styles.heroName}>{nextVisit.student_name}</Text>
              <Text style={styles.heroOrg}>{nextVisit.org_name}</Text>
              <View style={styles.heroMetaRow}>
                <View style={styles.heroMetaItem}>
                  <Ionicons name="calendar-outline" size={14} color={COLORS.white} />
                  <Text style={styles.heroMetaText}>{fullDate(nextVisit.visit_date)}</Text>
                </View>
                {Boolean(nextVisit.visit_time) && (
                  <View style={styles.heroMetaItem}>
                    <Ionicons name="time-outline" size={14} color={COLORS.white} />
                    <Text style={styles.heroMetaText}>{nextVisit.visit_time}</Text>
                  </View>
                )}
              </View>
            </View>
          ) : (
            <View style={[styles.emptyCard, isTablet && styles.cardNarrow]}>
              <Ionicons name="calendar-outline" size={34} color={COLORS.gray} style={{ marginBottom: 8 }} />
              <Text style={styles.emptyTitle}>No Upcoming Visits</Text>
              <Text style={styles.emptyText}>Tap "+ Schedule" to plan your next site visit.</Text>
            </View>
          )}

          {/* Upcoming Visits */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Upcoming Visits</Text>
            <View style={styles.totalPill}>
              <Text style={styles.totalPillText}>{upcomingSorted.length} TOTAL</Text>
            </View>
          </View>

          {restUpcoming.length === 0 ? (
            <Text style={styles.noneText}>No other upcoming visits.</Text>
          ) : (
            <View style={[styles.cardsGrid, isTablet && styles.cardsGridTablet]}>
              {restUpcoming.map((visit, index) => (
                <TouchableOpacity
                  key={index}
                  activeOpacity={0.7}
                  style={[styles.visitCard, isTablet && styles.visitCardTablet, isDesktop && styles.visitCardDesktop]}
                  onPress={() => {
                    Alert.alert(visit.student_name, 'Update this visit', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Mark Completed', onPress: () => handleUpdateStatus(visit.visit_id, 'completed') },
                      { text: 'Cancel Visit', style: 'destructive', onPress: () => handleUpdateStatus(visit.visit_id, 'cancelled') },
                    ]);
                  }}
                >
                  <View style={styles.visitCardTopRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.visitStudent}>{visit.student_name}</Text>
                      <Text style={styles.visitOrg}>{visit.org_name}</Text>
                    </View>
                    <View style={styles.dateBadge}>
                      <Text style={styles.dateBadgeText}>{monthAbbr(visit.visit_date)} {dayNum(visit.visit_date)}</Text>
                    </View>
                  </View>
                  <View style={styles.visitDetailRow}>
                    <Ionicons name="location-outline" size={13} color={COLORS.gray} />
                    <Text style={styles.visitLocation}>{visit.location}</Text>
                  </View>
                  {Boolean(visit.notes) && (
                    <View style={styles.visitDetailRow}>
                      <Ionicons name="document-text-outline" size={13} color={COLORS.gray} />
                      <Text style={styles.visitNotes}>{visit.notes}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Past Visits */}
          <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Past Visits</Text>
          {pastVisits.length === 0 ? (
            <Text style={styles.noneText}>No past visits yet.</Text>
          ) : (
            <View style={[styles.pastListCard, isTablet && styles.cardNarrow]}>
              {pastVisits.map((visit, index) => (
                <View
                  key={index}
                  style={[styles.pastRow, index === pastVisits.length - 1 && { borderBottomWidth: 0 }]}
                >
                  <Text style={styles.pastName}>{visit.student_name}</Text>
                  <Text style={styles.pastMeta}>
                    {visit.org_name} • {monthAbbr(visit.visit_date)} {dayNum(visit.visit_date)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Floating Schedule Button */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowForm(true)}>
        <Ionicons name="add" size={18} color={COLORS.white} />
        <Text style={styles.fabText}>Schedule</Text>
      </TouchableOpacity>

      {/* Schedule Form Modal */}
      <Modal
        visible={showForm}
        transparent
        animationType="slide"
        onRequestClose={() => setShowForm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Schedule Site Visit</Text>

            {!attachmentId && (
              <>
                <Text style={styles.label}>Select Student *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                  {students.map((s, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[styles.studentChip, form.attachment_id === s.attachment_id && styles.studentChipActive]}
                      onPress={() => setForm({ ...form, attachment_id: s.attachment_id })}
                    >
                      <Text style={[styles.studentChipText, form.attachment_id === s.attachment_id && styles.studentChipTextActive]}>
                        {s.full_name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            {attachmentId && studentName && (
              <View style={styles.selectedStudent}>
                <Ionicons name="person-outline" size={14} color={COLORS.secondary} />
                <Text style={styles.selectedStudentText}>{studentName}</Text>
              </View>
            )}

            <Text style={styles.label}>Visit Date * (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 2026-06-15"
              value={form.visit_date}
              onChangeText={(v) => setForm({ ...form, visit_date: v })}
            />

            <Text style={styles.label}>Visit Time</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 10:00 AM"
              value={form.visit_time}
              onChangeText={(v) => setForm({ ...form, visit_time: v })}
            />

            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Any notes about the visit..."
              value={form.notes}
              onChangeText={(v) => setForm({ ...form, notes: v })}
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
              {submitting
                ? <ActivityIndicator color={COLORS.white} />
                : (
                  <View style={styles.submitBtnRow}>
                    <Text style={styles.submitBtnText}>Schedule Visit</Text>
                    <Ionicons name="checkmark" size={16} color={COLORS.white} />
                  </View>
                )
              }
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowForm(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.lightGray },
  scrollContent: { paddingBottom: 16 },
  contentWrap: { width: '100%', alignSelf: 'center' },
  contentWrapTablet: { maxWidth: 960 },
  contentWrapDesktop: { maxWidth: 1160 },
  cardNarrow: { marginHorizontal: '4.5%' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.lightGray },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 55, paddingBottom: 16, paddingHorizontal: '5%',
  },
  backBtn: { marginRight: 4 },
  title: { flex: 1, color: HERO_GREEN, fontSize: 22, fontWeight: 'bold', marginLeft: 8 },
  avatarCircle: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: COLORS.lightGray, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  avatarInitials: { fontSize: 14, fontWeight: '700', color: COLORS.secondary },

  heroCard: {
    backgroundColor: HERO_GREEN,
    marginHorizontal: '4.5%', marginBottom: 20,
    borderRadius: 22, padding: 20,
  },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  heroBadge: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
  },
  heroBadgeText: { color: COLORS.white, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  heroIconBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroName: { color: COLORS.white, fontSize: 26, fontWeight: 'bold', marginBottom: 4 },
  heroOrg: { color: COLORS.subtitle, fontSize: 15, marginBottom: 14 },
  heroMetaRow: { flexDirection: 'row', gap: 16 },
  heroMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroMetaText: { color: COLORS.white, fontSize: 13, fontWeight: '600' },

  sectionHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginHorizontal: '4.5%', marginBottom: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.secondary },
  totalPill: { backgroundColor: NAVY_LIGHT, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  totalPillText: { color: COLORS.secondary, fontSize: 11, fontWeight: '700' },
  noneText: { color: COLORS.gray, fontSize: 13, marginHorizontal: '4.5%', marginBottom: 10 },

  emptyCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: '4.5%', marginBottom: 20,
    padding: '8%', borderRadius: 16, alignItems: 'center', elevation: 2,
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: COLORS.darkGray },
  emptyText: { fontSize: 12, color: COLORS.gray, textAlign: 'center', marginTop: 6 },

  cardsGrid: { width: '100%' },
  cardsGridTablet: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: '3.5%' },
  visitCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: '4.5%', marginBottom: 12,
    padding: 14, borderRadius: 16, elevation: 2,
  },
  visitCardTablet: { width: '48%', marginHorizontal: 0 },
  visitCardDesktop: { width: '31.8%' },
  visitCardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  visitStudent: { fontSize: 14, fontWeight: '700', color: COLORS.darkGray },
  visitOrg: { fontSize: 12, color: COLORS.secondary, marginTop: 2 },
  visitDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  visitLocation: { fontSize: 12, color: COLORS.gray },
  visitNotes: { fontSize: 12, color: COLORS.gray, fontStyle: 'italic' },
  dateBadge: { backgroundColor: NAVY_LIGHT, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  dateBadgeText: { color: COLORS.secondary, fontSize: 11, fontWeight: '700' },


  pastListCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: '4.5%',
    borderRadius: 16, elevation: 1, paddingHorizontal: 16,
  },
  pastRow: {
    paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  pastName: { fontSize: 14, fontWeight: '700', color: COLORS.darkGray },
  pastMeta: { fontSize: 12, color: COLORS.gray, marginTop: 2 },

  fab: {
    position: 'absolute', bottom: 24, right: 20,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.primary,
    paddingVertical: 14, paddingHorizontal: 22,
    borderRadius: 28, elevation: 4,
    ...Platform.select({
      web: { boxShadow: '0px 3px 4px rgba(0,0,0,0.2)' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 4 },
    }),
  },
  fabText: { color: COLORS.white, fontWeight: '700', fontSize: 15 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  formCard: {
    backgroundColor: COLORS.white,
    padding: '5%', paddingBottom: 30,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  formTitle: { fontSize: 16, fontWeight: '700', color: COLORS.secondary, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.darkGray, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: COLORS.gray, borderRadius: 10,
    padding: 12, fontSize: 14, marginBottom: 14, backgroundColor: COLORS.lightGray,
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  studentChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: COLORS.gray, marginRight: 8, backgroundColor: COLORS.white,
  },
  studentChipActive: { borderColor: COLORS.primary, backgroundColor: ORANGE_LIGHT },
  studentChipText: { fontSize: 13, color: COLORS.darkGray, fontWeight: '600' },
  studentChipTextActive: { color: COLORS.primary },
  selectedStudent: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: NAVY_LIGHT, padding: 10, borderRadius: 10, marginBottom: 14 },
  selectedStudentText: { color: COLORS.secondary, fontWeight: '600', fontSize: 13 },
  submitBtn: { backgroundColor: COLORS.primary, padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 4 },
  submitBtnRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  submitBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 15 },
  cancelBtn: { padding: 12, borderRadius: 12, alignItems: 'center', marginTop: 8, borderWidth: 1, borderColor: COLORS.gray },
  cancelBtnText: { color: COLORS.gray, fontWeight: '600' },
});