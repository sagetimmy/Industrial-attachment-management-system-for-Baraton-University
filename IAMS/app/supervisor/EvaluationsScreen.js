import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, RefreshControl
} from 'react-native';
import { COLORS } from '../../constants/colors';
import api from '../../api/axios';

export default function EvaluationsScreen({ navigation, route }) {
  const { attachmentId, studentName } = route.params || {};
  const [evaluations, setEvaluations] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    attachment_id: attachmentId || '',
    score: '',
    comments: '',
    eval_date: new Date().toISOString().split('T')[0],
  });

  const fetchData = async () => {
    try {
      const [evalsRes, studentsRes] = await Promise.all([
        api.get('/supervisors/evaluations'),
        api.get('/supervisors/students'),
      ]);
      const filtered = attachmentId
        ? evalsRes.data.filter(e => e.attachment_id === attachmentId)
        : evalsRes.data;
      setEvaluations(filtered);
      setStudents(studentsRes.data);
    } catch (err) {
      Alert.alert('Error', 'Failed to load evaluations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

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
      setShowForm(false);
      setForm({
        attachment_id: attachmentId || '',
        score: '', comments: '',
        eval_date: new Date().toISOString().split('T')[0],
      });
      fetchData();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to submit evaluation');
    } finally {
      setSubmitting(false);
    }
  };

  const getGradeColor = (score) => {
    if (score >= 70) return '#2E7D32';
    if (score >= 50) return COLORS.primary;
    return '#C62828';
  };

  const getGradeLetter = (score) => {
    if (score >= 70) return 'A';
    if (score >= 60) return 'B';
    if (score >= 50) return 'C';
    if (score >= 40) return 'D';
    return 'F';
  };

  const onRefresh = () => { setRefreshing(true); fetchData(); };

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
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Evaluations ⭐</Text>
        <Text style={styles.subtitle}>
          {studentName ? `${studentName} • ` : ''}{evaluations.length} evaluation(s)
        </Text>
      </View>

      {/* New Evaluation Button */}
      {!showForm ? (
        <TouchableOpacity
          style={styles.newEvalBtn}
          onPress={() => setShowForm(true)}
        >
          <Text style={styles.newEvalBtnText}>+ Submit New Evaluation</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>New Evaluation</Text>

          {/* Student Selector */}
          {!attachmentId && (
            <>
              <Text style={styles.label}>Select Student *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 14 }}
              >
                {students.filter(s => s.status === 'ongoing').map((s, i) => (
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

          {/* Score Input */}
          <Text style={styles.label}>Score (0-100) *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 75"
            value={form.score}
            onChangeText={(v) => setForm({ ...form, score: v })}
            keyboardType="numeric"
          />

          {/* Score Preview */}
          {form.score && !isNaN(form.score) && (
            <View style={[styles.scorePreview, {
              backgroundColor: getGradeColor(form.score) + '20'
            }]}>
              <Text style={[styles.scorePreviewGrade, {
                color: getGradeColor(form.score)
              }]}>
                Grade: {getGradeLetter(Number(form.score))} • {form.score}%
              </Text>
            </View>
          )}

          <Text style={styles.label}>Comments *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Provide detailed feedback on the student's performance..."
            value={form.comments}
            onChangeText={(v) => setForm({ ...form, comments: v })}
            multiline
            numberOfLines={5}
          />

          <Text style={styles.label}>Evaluation Date</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            value={form.eval_date}
            onChangeText={(v) => setForm({ ...form, eval_date: v })}
          />

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting
              ? <ActivityIndicator color={COLORS.white} />
              : <Text style={styles.submitBtnText}>Submit Evaluation ⭐</Text>
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

      {/* Evaluations List */}
      <Text style={styles.sectionTitle}>Past Evaluations</Text>
      {evaluations.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>⭐</Text>
          <Text style={styles.emptyTitle}>No Evaluations Yet</Text>
          <Text style={styles.emptyText}>Submit your first evaluation above.</Text>
        </View>
      ) : (
        evaluations.map((eval_, index) => (
          <View key={index} style={styles.evalCard}>
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
              <View style={[styles.gradeBadge, {
                borderColor: getGradeColor(eval_.score)
              }]}>
                <Text style={[styles.gradeText, {
                  color: getGradeColor(eval_.score)
                }]}>
                  {getGradeLetter(eval_.score)}
                </Text>
                <Text style={[styles.gradeScore, {
                  color: getGradeColor(eval_.score)
                }]}>
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

            {/* Score Bar */}
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
        ))
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F4F4' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: COLORS.secondary,
    paddingTop: 55, paddingBottom: 25,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  backBtn: { marginBottom: 10 },
  backText: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
  title: { color: COLORS.white, fontSize: 24, fontWeight: 'bold' },
  subtitle: { color: '#8899AA', fontSize: 13, marginTop: 4 },
  newEvalBtn: {
    backgroundColor: COLORS.primary,
    margin: 16, padding: 15,
    borderRadius: 14, alignItems: 'center',
  },
  newEvalBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 15 },
  formCard: {
    backgroundColor: COLORS.white,
    margin: 16, padding: 16,
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
  textArea: { height: 120, textAlignVertical: 'top' },
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
  scorePreview: {
    padding: 10, borderRadius: 10,
    alignItems: 'center', marginBottom: 14,
  },
  scorePreviewGrade: { fontSize: 16, fontWeight: '700' },
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
    margin: 16, padding: 30,
    borderRadius: 16, alignItems: 'center', elevation: 2,
  },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.darkGray },
  emptyText: { fontSize: 13, color: COLORS.gray, textAlign: 'center', marginTop: 6 },
  evalCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16, marginBottom: 12,
    padding: 14, borderRadius: 16, elevation: 2,
  },
  evalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  evalLeft: { flex: 1 },
  evalStudent: { fontSize: 15, fontWeight: '700', color: COLORS.darkGray },
  evalReg: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  evalOrg: { fontSize: 12, color: COLORS.primary, marginTop: 2 },
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
});