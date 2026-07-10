import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, RefreshControl, useWindowDimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import api from '../../api/axios';

const TEAL = '#0F6E56';
const TEAL_LIGHT = '#E3F1EE';
const CORAL = '#D85A30';

export default function EvaluationsScreen({ navigation, route }) {
  const { width } = useWindowDimensions();
  const { attachmentId, studentName } = route.params || {};
  const [evaluations, setEvaluations] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('new'); // 'new' | 'history'
  const [selectedAttachmentId, setSelectedAttachmentId] = useState(attachmentId || null);
  const [form, setForm] = useState({
    attachment_id: attachmentId || '',
    score: '',
    comments: '',
    eval_date: new Date().toISOString().split('T')[0],
  });
  const isTablet = width >= 768;
  const isDesktop = width >= 1100;

  const fetchData = async () => {
    try {
      const [evalsRes, studentsRes] = await Promise.all([
        api.get('/supervisors/evaluations'),
        api.get('/supervisors/students'),
      ]);
      setEvaluations(evalsRes.data);
      const ongoing = studentsRes.data.filter(s => s.status === 'ongoing');
      setStudents(ongoing);

      // Default the selected student: keep passed-in attachmentId, else first ongoing student
      setSelectedAttachmentId(prev => prev || attachmentId || (ongoing[0]?.attachment_id ?? null));
    } catch (err) {
      Alert.alert('Error', 'Failed to load evaluations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    setForm(f => ({ ...f, attachment_id: selectedAttachmentId || '' }));
  }, [selectedAttachmentId]);

  const selectedStudent = useMemo(() => {
    if (attachmentId && studentName) {
      const match = students.find(s => s.attachment_id === selectedAttachmentId);
      return match || { full_name: studentName, attachment_id: selectedAttachmentId };
    }
    return students.find(s => s.attachment_id === selectedAttachmentId) || null;
  }, [students, selectedAttachmentId, attachmentId, studentName]);

  const studentEvaluations = useMemo(
    () => evaluations.filter(e => e.attachment_id === selectedAttachmentId),
    [evaluations, selectedAttachmentId]
  );

  const averageScore = useMemo(() => {
    if (studentEvaluations.length === 0) return null;
    const sum = studentEvaluations.reduce((acc, e) => acc + Number(e.score || 0), 0);
    return (sum / studentEvaluations.length).toFixed(1);
  }, [studentEvaluations]);

  const handleSubmit = async () => {
    if (!form.attachment_id || !form.score || !form.comments) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    if (Number(form.score) < 0 || Number(form.score) > 100) {
      Alert.alert('Error', 'Score must be between 0 and 100');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/supervisors/evaluations', form);
      Alert.alert('Success! ⭐', 'Evaluation submitted successfully!');
      setForm({
        attachment_id: selectedAttachmentId || '',
        score: '', comments: '',
        eval_date: new Date().toISOString().split('T')[0],
      });
      setActiveTab('history');
      fetchData();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to submit evaluation');
    } finally {
      setSubmitting(false);
    }
  };

  const getGradeColor = (score) => {
    if (score >= 70) return '#2E7D32';
    if (score >= 50) return TEAL;
    return '#C62828';
  };

  const getGradeLetter = (score) => {
    if (score >= 70) return 'A';
    if (score >= 60) return 'B';
    if (score >= 50) return 'C';
    if (score >= 40) return 'D';
    return 'F';
  };

  const getInitials = (name = '') =>
    name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]?.toUpperCase()).join('') || '?';

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={TEAL} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TEAL} />}
    >
      <View style={[styles.contentWrap, isTablet && styles.contentWrapTablet, isDesktop && styles.contentWrapDesktop]}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
              <Ionicons name="arrow-back" size={22} color={COLORS.white} />
            </TouchableOpacity>
            <Text style={styles.title}>Evaluations</Text>
            <TouchableOpacity onPress={onRefresh} style={styles.iconBtn}>
              <Ionicons name="ellipsis-vertical" size={20} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Selected Student Card */}
        {selectedStudent && (
          <View style={[styles.studentCard, isTablet && styles.cardNarrow]}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(selectedStudent.full_name)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.studentName}>{selectedStudent.full_name}</Text>
              <Text style={styles.studentMeta}>
                {studentEvaluations.length} evaluation(s)
                {selectedStudent.reg_number ? ` • ID: ${selectedStudent.reg_number}` : ''}
              </Text>
            </View>
          </View>
        )}

        {/* Switch Student */}
        {!attachmentId && students.length > 0 && (
          <>
            <Text style={styles.switchLabel}>Switch Student</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {students.map((s, i) => {
                const active = s.attachment_id === selectedAttachmentId;
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.studentChip, active && styles.studentChipActive]}
                    onPress={() => setSelectedAttachmentId(s.attachment_id)}
                  >
                    <Text style={[styles.studentChipText, active && styles.studentChipTextActive]}>
                      {s.full_name?.split(' ')[0]} {s.full_name?.split(' ')[1]?.[0] ? s.full_name.split(' ')[1][0] + '.' : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </>
        )}

        {/* Tabs */}
        <View style={[styles.tabBar, isTablet && styles.cardNarrow]}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'new' && styles.tabBtnActive]}
            onPress={() => setActiveTab('new')}
          >
            <Text style={[styles.tabText, activeTab === 'new' && styles.tabTextActive]}>New Evaluation</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'history' && styles.tabBtnActive]}
            onPress={() => setActiveTab('history')}
          >
            <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>Past History</Text>
          </TouchableOpacity>
        </View>

        {/* New Evaluation Form */}
        {activeTab === 'new' && (
          <View style={[styles.formCard, isTablet && styles.cardNarrow]}>
            <Text style={styles.label}>Evaluation Date</Text>
            <View style={styles.dateInputWrap}>
              <TextInput
                style={styles.dateInput}
                placeholder="YYYY-MM-DD"
                value={form.eval_date}
                onChangeText={(v) => setForm({ ...form, eval_date: v })}
              />
              <Ionicons name="calendar-outline" size={20} color={COLORS.gray} style={styles.dateIcon} />
            </View>

            <View style={styles.scoreRow}>
              <View style={styles.scoreCol}>
                <Text style={styles.label}>Score (0-100)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 85"
                  value={form.score}
                  onChangeText={(v) => setForm({ ...form, score: v })}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.scoreCol}>
                <Text style={styles.label}>Grade Preview</Text>
                <View style={[
                  styles.gradePreviewBox,
                  form.score && !isNaN(form.score)
                    ? { backgroundColor: getGradeColor(Number(form.score)) + '20' }
                    : { backgroundColor: '#F0F0F0' }
                ]}>
                  <Text style={[
                    styles.gradePreviewText,
                    form.score && !isNaN(form.score) && { color: getGradeColor(Number(form.score)) }
                  ]}>
                    {form.score && !isNaN(form.score) ? getGradeLetter(Number(form.score)) : '–'}
                  </Text>
                </View>
              </View>
            </View>

            <Text style={styles.label}>Feedback & Observations</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter detailed observations about the student's performance, behavior, and areas for improvement..."
              value={form.comments}
              onChangeText={(v) => setForm({ ...form, comments: v })}
              multiline
              numberOfLines={5}
            />

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting
                ? <ActivityIndicator color={COLORS.white} />
                : (
                  <>
                    <Text style={styles.submitBtnText}>Submit Evaluation</Text>
                    <Ionicons name="send" size={16} color={COLORS.white} style={{ marginLeft: 8 }} />
                  </>
                )
              }
            </TouchableOpacity>
          </View>
        )}

        {/* Past History */}
        {activeTab === 'history' && (
          studentEvaluations.length === 0 ? (
            <View style={[styles.emptyCard, isTablet && styles.cardNarrow]}>
              <Text style={styles.emptyIcon}>⭐</Text>
              <Text style={styles.emptyTitle}>No Evaluations Yet</Text>
              <Text style={styles.emptyText}>Submit your first evaluation above.</Text>
            </View>
          ) : (
            <View style={[styles.cardsGrid, isTablet && styles.cardsGridTablet]}>
              {studentEvaluations.map((eval_, index) => (
                <View key={index} style={[styles.evalCard, isTablet && styles.evalCardTablet, isDesktop && styles.evalCardDesktop]}>
                  <View style={styles.evalHeader}>
                    <View style={styles.evalLeft}>
                      <Text style={styles.evalStudent}>{eval_.student_name}</Text>
                      <Text style={styles.evalReg}>{eval_.reg_number}</Text>
                      <Text style={styles.evalOrg}>🏢 {eval_.org_name}</Text>
                      <Text style={styles.evalDate}>
                        📅 {eval_.eval_date
                          ? new Date(eval_.eval_date).toLocaleDateString()
                          : new Date(eval_.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={[styles.gradeBadge, { borderColor: getGradeColor(eval_.score) }]}>
                      <Text style={[styles.gradeText, { color: getGradeColor(eval_.score) }]}>
                        {getGradeLetter(eval_.score)}
                      </Text>
                      <Text style={[styles.gradeScore, { color: getGradeColor(eval_.score) }]}>
                        {eval_.score}%
                      </Text>
                    </View>
                  </View>

                  {eval_.comments && (
                    <View style={styles.commentsBox}>
                      <Text style={styles.commentsLabel}>💬 Feedback</Text>
                      <Text style={styles.commentsText}>{eval_.comments}</Text>
                    </View>
                  )}

                  <View style={styles.scoreBar}>
                    <View style={styles.scoreBarBg}>
                      <View style={[styles.scoreBarFill, {
                        width: `${eval_.score}%`,
                        backgroundColor: getGradeColor(eval_.score),
                      }]} />
                    </View>
                    <Text style={styles.scoreBarLabel}>{eval_.score}%</Text>
                  </View>
                </View>
              ))}
            </View>
          )
        )}

        {/* Recent Performance */}
        {studentEvaluations.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Recent Performance</Text>
            <View style={[styles.avgCard, isTablet && styles.cardNarrow]}>
              <Text style={styles.avgLabel}>AVERAGE</Text>
              <Text style={styles.avgValue}>{averageScore}%</Text>
            </View>
          </>
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
    backgroundColor: TEAL,
    paddingTop: 55, paddingBottom: 30,
    paddingHorizontal: '5%',
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBtn: { padding: 4 },
  title: { color: COLORS.white, fontSize: 20, fontWeight: 'bold' },

  studentCard: {
    backgroundColor: COLORS.white,
    marginTop: -30, marginHorizontal: 16,
    padding: 16, borderRadius: 18,
    flexDirection: 'row', alignItems: 'center',
    elevation: 3,
  },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: TEAL_LIGHT,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: { color: TEAL, fontWeight: '700', fontSize: 18 },
  studentName: { fontSize: 16, fontWeight: '700', color: COLORS.darkGray },
  studentMeta: { fontSize: 12, color: COLORS.gray, marginTop: 3 },

  switchLabel: {
    fontSize: 12, fontWeight: '600', color: COLORS.gray,
    marginLeft: 16, marginTop: 18, marginBottom: 10,
    textTransform: 'uppercase',
  },
  chipRow: { paddingHorizontal: 16 },
  studentChip: {
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 20, borderWidth: 1.5,
    borderColor: '#E0E0E0', marginRight: 8,
    backgroundColor: COLORS.white,
  },
  studentChipActive: { borderColor: TEAL, backgroundColor: TEAL },
  studentChipText: { fontSize: 13, color: COLORS.darkGray, fontWeight: '600' },
  studentChipTextActive: { color: COLORS.white },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#EDEDED',
    borderRadius: 14,
    margin: 16, padding: 4,
  },
  tabBtn: {
    flex: 1, paddingVertical: 10,
    borderRadius: 11, alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: COLORS.white,
    elevation: 1,
  },
  tabText: { fontSize: 13, fontWeight: '600', color: COLORS.gray },
  tabTextActive: { color: TEAL },

  formCard: {
    backgroundColor: COLORS.white,
    margin: 16, padding: '4%',
    borderRadius: 16, elevation: 2,
  },
  label: {
    fontSize: 11, fontWeight: '700', color: COLORS.gray,
    marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3,
  },
  input: {
    borderWidth: 1, borderColor: '#E0E0E0',
    borderRadius: 10, padding: 12,
    fontSize: 14, marginBottom: 16,
    backgroundColor: '#FAFAFA',
  },
  textArea: { height: 110, textAlignVertical: 'top' },
  dateInputWrap: { position: 'relative', justifyContent: 'center', marginBottom: 16 },
  dateInput: {
    borderWidth: 1, borderColor: '#E0E0E0',
    borderRadius: 10, padding: 12, paddingRight: 40,
    fontSize: 14, backgroundColor: '#FAFAFA',
  },
  dateIcon: { position: 'absolute', right: 12 },

  scoreRow: { flexDirection: 'row', gap: 12 },
  scoreCol: { flex: 1 },
  gradePreviewBox: {
    borderRadius: 10, paddingVertical: 12,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16, height: 46,
  },
  gradePreviewText: { fontSize: 18, fontWeight: '700', color: COLORS.gray },

  submitBtn: {
    backgroundColor: TEAL,
    flexDirection: 'row',
    padding: 15, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 4,
  },
  submitBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 15 },

  sectionTitle: {
    fontSize: 15, fontWeight: '700',
    color: COLORS.darkGray,
    marginLeft: 16, marginTop: 8, marginBottom: 10,
  },
  emptyCard: {
    backgroundColor: COLORS.white,
    margin: 16, padding: '8%',
    borderRadius: 16, alignItems: 'center', elevation: 2,
  },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.darkGray },
  emptyText: { fontSize: 13, color: COLORS.gray, textAlign: 'center', marginTop: 6 },

  cardsGrid: { width: '100%' },
  cardsGridTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: '3.5%',
  },
  evalCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: '4.5%', marginBottom: 12,
    padding: 14, borderRadius: 16, elevation: 2,
  },
  evalCardTablet: { width: '48%', marginHorizontal: 0 },
  evalCardDesktop: { width: '31.8%' },
  evalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  evalLeft: { flex: 1 },
  evalStudent: { fontSize: 15, fontWeight: '700', color: COLORS.darkGray },
  evalReg: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  evalOrg: { fontSize: 12, color: TEAL, marginTop: 2 },
  evalDate: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  gradeBadge: {
    width: 60, height: 60, borderRadius: 30,
    borderWidth: 3, alignItems: 'center',
    justifyContent: 'center',
  },
  gradeText: { fontSize: 20, fontWeight: 'bold' },
  gradeScore: { fontSize: 10, fontWeight: '600' },
  commentsBox: {
    backgroundColor: '#F8F9FA',
    padding: 12, borderRadius: 10, marginBottom: 12,
  },
  commentsLabel: { fontSize: 12, color: COLORS.gray, marginBottom: 6 },
  commentsText: { fontSize: 13, color: COLORS.darkGray, lineHeight: 20 },
  scoreBar: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  scoreBarBg: {
    flex: 1, height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4, overflow: 'hidden',
  },
  scoreBarFill: { height: '100%', borderRadius: 4 },
  scoreBarLabel: { fontSize: 12, fontWeight: '700', color: COLORS.darkGray, width: 35 },

  avgCard: {
    backgroundColor: COLORS.white,
    margin: 16, marginTop: 0,
    padding: 16, borderRadius: 16, elevation: 2,
    alignSelf: 'flex-start',
    minWidth: 140,
  },
  avgLabel: {
    fontSize: 11, fontWeight: '700', color: COLORS.gray,
    textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 6,
  },
  avgValue: { fontSize: 24, fontWeight: '700', color: TEAL },
});