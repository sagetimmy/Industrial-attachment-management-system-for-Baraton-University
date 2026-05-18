import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, RefreshControl, useWindowDimensions
} from 'react-native';
import { COLORS } from '../../constants/colors';
import api from '../../api/axios';

export default function SiteVisitsScreen({ navigation, route }) {
  const { width } = useWindowDimensions();
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

  const statusColor = (status) => {
    switch (status) {
      case 'scheduled': return { bg: '#E3F2FD', text: COLORS.secondary };
      case 'completed': return { bg: '#E8F5E9', text: '#2E7D32' };
      case 'cancelled': return { bg: '#FFEBEE', text: '#C62828' };
      default: return { bg: '#F4F4F4', text: COLORS.gray };
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={[styles.contentWrap, isTablet && styles.contentWrapTablet, isDesktop && styles.contentWrapDesktop]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Site Visits 🗓️</Text>
        <Text style={styles.subtitle}>{visits.length} visit(s) scheduled</Text>
      </View>

      {/* Schedule Button */}
      {!showForm ? (
        <TouchableOpacity
          style={[styles.scheduleBtn, isTablet && styles.cardNarrow]}
          onPress={() => setShowForm(true)}
        >
          <Text style={styles.scheduleBtnText}>+ Schedule New Visit</Text>
        </TouchableOpacity>
      ) : (
        <View style={[styles.formCard, isTablet && styles.cardNarrow]}>
          <Text style={styles.formTitle}>Schedule Site Visit</Text>

          {/* Student Selector */}
          {!attachmentId && (
            <>
              <Text style={styles.label}>Select Student *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 14 }}
              >
                {students.map((s, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.studentChip,
                      form.attachment_id === s.attachment_id && styles.studentChipActive
                    ]}
                    onPress={() => setForm({ ...form, attachment_id: s.attachment_id })}
                  >
                    <Text style={[styles.studentChipText,
                      form.attachment_id === s.attachment_id && styles.studentChipTextActive
                    ]}>
                      {s.full_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          {attachmentId && studentName && (
            <View style={styles.selectedStudent}>
              <Text style={styles.selectedStudentText}>👤 {studentName}</Text>
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

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting
              ? <ActivityIndicator color={COLORS.white} />
              : <Text style={styles.submitBtnText}>Schedule Visit ✓</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => setShowForm(false)}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Visits List */}
      <Text style={styles.sectionTitle}>All Visits</Text>
      {visits.length === 0 ? (
        <View style={[styles.emptyCard, isTablet && styles.cardNarrow]}>
          <Text style={styles.emptyIcon}>🗓️</Text>
          <Text style={styles.emptyTitle}>No Visits Scheduled</Text>
          <Text style={styles.emptyText}>Schedule your first site visit above.</Text>
        </View>
      ) : (
        <View style={[styles.cardsGrid, isTablet && styles.cardsGridTablet]}>
          {visits.map((visit, index) => (
          <View key={index} style={[styles.visitCard, isTablet && styles.visitCardTablet, isDesktop && styles.visitCardDesktop]}>
            <View style={styles.visitHeader}>
              <View style={styles.visitDate}>
                <Text style={styles.visitDay}>
                  {new Date(visit.visit_date).toLocaleDateString('en', { day: '2-digit' })}
                </Text>
                <Text style={styles.visitMonth}>
                  {new Date(visit.visit_date).toLocaleDateString('en', { month: 'short' })}
                </Text>
              </View>
              <View style={styles.visitInfo}>
                <Text style={styles.visitStudent}>{visit.student_name}</Text>
                <Text style={styles.visitOrg}>🏢 {visit.org_name}</Text>
                <Text style={styles.visitLocation}>📍 {visit.location}</Text>
                {visit.visit_time && (
                  <Text style={styles.visitTime}>🕐 {visit.visit_time}</Text>
                )}
              </View>
              <View style={[styles.visitStatus, {
                backgroundColor: statusColor(visit.status).bg
              }]}>
                <Text style={[styles.visitStatusText, {
                  color: statusColor(visit.status).text
                }]}>
                  {visit.status}
                </Text>
              </View>
            </View>

            {visit.notes && (
              <Text style={styles.visitNotes}>📝 {visit.notes}</Text>
            )}

            {visit.status === 'scheduled' && (
              <View style={styles.visitActions}>
                <TouchableOpacity
                  style={styles.completeBtn}
                  onPress={() => handleUpdateStatus(visit.visit_id, 'completed')}
                >
                  <Text style={styles.completeBtnText}>✓ Mark Complete</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelVisitBtn}
                  onPress={() => handleUpdateStatus(visit.visit_id, 'cancelled')}
                >
                  <Text style={styles.cancelVisitBtnText}>✗ Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
          ))}
        </View>
      )}
      <View style={{ height: 40 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F4F4' },
  scrollContent: { paddingBottom: 16 },
  contentWrap: { width: '100%', alignSelf: 'center' },
  contentWrapTablet: { maxWidth: 960 },
  contentWrapDesktop: { maxWidth: 1160 },
  cardNarrow: { marginHorizontal: '4.5%' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: COLORS.secondary,
    paddingTop: 55, paddingBottom: 25,
    paddingHorizontal: '5%',
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  backBtn: { marginBottom: 10 },
  backText: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
  title: { color: COLORS.white, fontSize: 24, fontWeight: 'bold' },
  subtitle: { color: '#8899AA', fontSize: 13, marginTop: 4 },
  scheduleBtn: {
    backgroundColor: COLORS.primary,
    margin: 16, paddingVertical: 15, paddingHorizontal: '4%',
    borderRadius: 14, alignItems: 'center',
  },
  scheduleBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 15 },
  formCard: {
    backgroundColor: COLORS.white,
    margin: 16, padding: '4%',
    borderRadius: 16, elevation: 2,
  },
  formTitle: { fontSize: 16, fontWeight: '700', color: COLORS.secondary, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.darkGray, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: COLORS.gray,
    borderRadius: 10, padding: 12,
    fontSize: 14, marginBottom: 14,
    backgroundColor: COLORS.lightGray,
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  studentChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5,
    borderColor: COLORS.gray, marginRight: 8,
    backgroundColor: COLORS.white,
  },
  studentChipActive: { borderColor: COLORS.primary, backgroundColor: '#FFF3E0' },
  studentChipText: { fontSize: 13, color: COLORS.darkGray, fontWeight: '600' },
  studentChipTextActive: { color: COLORS.primary },
  selectedStudent: {
    backgroundColor: '#E3F2FD',
    padding: 10, borderRadius: 10, marginBottom: 14,
  },
  selectedStudentText: { color: COLORS.secondary, fontWeight: '600', fontSize: 13 },
  submitBtn: {
    backgroundColor: COLORS.primary,
    padding: 14, borderRadius: 12,
    alignItems: 'center', marginTop: 4,
  },
  submitBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 15 },
  cancelBtn: {
    padding: 12, borderRadius: 12,
    alignItems: 'center', marginTop: 8,
    borderWidth: 1, borderColor: COLORS.gray,
  },
  cancelBtnText: { color: COLORS.gray, fontWeight: '600' },
  sectionTitle: {
    fontSize: 16, fontWeight: '700',
    color: COLORS.darkGray,
    marginLeft: 16, marginTop: 8, marginBottom: 10,
  },
  emptyCard: {
    backgroundColor: COLORS.white,
    margin: 16, padding: '8%',
    borderRadius: 16, alignItems: 'center', elevation: 2,
  },
  cardsGrid: { width: '100%' },
  cardsGridTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: '3.5%',
  },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.darkGray },
  emptyText: { fontSize: 13, color: COLORS.gray, textAlign: 'center', marginTop: 6 },
  visitCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: '4.5%', marginBottom: 12,
    padding: 14, borderRadius: 16, elevation: 2,
  },
  visitCardTablet: { width: '48%', marginHorizontal: 0 },
  visitCardDesktop: { width: '31.8%' },
  visitHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  visitDate: {
    backgroundColor: COLORS.secondary,
    width: 50, borderRadius: 12,
    alignItems: 'center', padding: 8,
    marginRight: 12,
  },
  visitDay: { color: COLORS.white, fontSize: 20, fontWeight: 'bold' },
  visitMonth: { color: COLORS.primary, fontSize: 11, fontWeight: '600' },
  visitInfo: { flex: 1 },
  visitStudent: { fontSize: 14, fontWeight: '700', color: COLORS.darkGray },
  visitOrg: { fontSize: 12, color: COLORS.primary, marginTop: 2 },
  visitLocation: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  visitTime: { fontSize: 12, color: COLORS.secondary, marginTop: 2 },
  visitStatus: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  visitStatusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  visitNotes: {
    fontSize: 13, color: COLORS.gray,
    marginTop: 10, fontStyle: 'italic',
  },
  visitActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  completeBtn: {
    flex: 1, padding: 10,
    borderRadius: 10, alignItems: 'center',
    backgroundColor: '#E8F5E9',
  },
  completeBtnText: { color: '#2E7D32', fontWeight: '700', fontSize: 13 },
  cancelVisitBtn: {
    flex: 1, padding: 10,
    borderRadius: 10, alignItems: 'center',
    backgroundColor: '#FFEBEE',
  },
  cancelVisitBtnText: { color: '#C62828', fontWeight: '700', fontSize: 13 },
});
