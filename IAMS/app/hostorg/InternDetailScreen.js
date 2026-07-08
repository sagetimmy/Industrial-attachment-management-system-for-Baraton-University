import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../../api/axios';

// Palette matches HostDashboard exactly
const TEAL = '#0F6E56';
const TEAL_LIGHT = '#DCEFEA';
const CORAL = '#D85A30';
const AMBER = '#BA7517';
const AMBER_LIGHT = '#FAEEDA';
const BG = '#F0F4F3';
const WHITE = '#FFFFFF';
const TEXT = '#111111';
const TEXT_SUB = '#888888';
const BORDER = 'rgba(0,0,0,0.07)';

function calculateProgress(startDate, endDate) {
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;
  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return null;
  const now = new Date();
  const totalMs = end.getTime() - start.getTime();
  const elapsedMs = Math.max(0, Math.min(totalMs, now.getTime() - start.getTime()));
  return Math.max(0, Math.min(100, Math.round((elapsedMs / totalMs) * 100)));
}

function daysRemaining(endDate) {
  const end = endDate ? new Date(endDate) : null;
  if (!end || Number.isNaN(end.getTime())) return null;
  const diffMs = end.getTime() - Date.now();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

export default function InternDetailScreen({ navigation, route }) {
  const { attachmentId } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [detail, setDetail] = useState(null);

  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState(0);
  const [errors, setErrors] = useState({});

  const fetchDetail = useCallback(async () => {
    if (!attachmentId) return;
    try {
      setLoading(true);
      const res = await api.get(`/host-orgs/intern/${attachmentId}`);
      setDetail(res.data);
      if (res.data.evaluation) {
        setFeedback(res.data.evaluation.comments || '');
        setRating(res.data.evaluation.rating || 0);
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load intern details');
    } finally {
      setLoading(false);
    }
  }, [attachmentId]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  const validate = () => {
    const newErrors = {};
    if (!rating || rating < 1 || rating > 5) newErrors.rating = 'Select a rating from 1 to 5';
    if (!feedback.trim()) newErrors.feedback = 'Feedback is required';
    else if (feedback.trim().length < 10) newErrors.feedback = 'Feedback must be at least 10 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      setSubmitting(true);
      await api.post(`/host-orgs/evaluate/${attachmentId}`, {
        rating,
        comments: feedback.trim(),
      });

      const supervisorName = detail?.supervisor?.full_name;
      Alert.alert(
        'Success',
        supervisorName
          ? `Evaluation submitted and sent to ${supervisorName}.`
          : 'Evaluation submitted successfully!',
        [{ text: 'OK', onPress: fetchDetail }]
      );
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to submit evaluation');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={TEAL} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Intern Details</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={s.centerContainer}>
          <ActivityIndicator size="large" color={TEAL} />
        </View>
      </SafeAreaView>
    );
  }

  if (!detail) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={TEAL} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Intern Details</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={s.centerContainer}>
          <Text style={{ color: TEXT_SUB }}>Couldn't load this intern's details.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { student, supervisor, evaluation, attachment } = detail;
  const initial = student?.full_name?.trim().charAt(0).toUpperCase() || '?';
  const progress = calculateProgress(attachment.start_date, attachment.end_date);
  const remaining = daysRemaining(attachment.end_date);
  const currentRating = evaluation?.rating ?? null;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={TEAL} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Intern Details</Text>
        <TouchableOpacity hitSlop={8}>
          <Ionicons name="ellipsis-vertical" size={20} color={TEXT} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
        {/* Intern header card */}
        <View style={s.card}>
          <View style={s.internRow}>
            <View style={s.avatarWrap}>
              <View style={s.avatar}>
                <Text style={s.avatarText}>{initial}</Text>
              </View>
              <View style={s.statusDot} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.internName}>{student?.full_name || 'Unknown'}</Text>
              <Text style={s.internSub}>{student?.department || 'N/A'}</Text>
              <View style={s.badge}>
                <Text style={s.badgeText}>
                  {student?.reg_number ? student.reg_number : 'Intern'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Progress card */}
        <View style={s.card}>
          <View style={s.progressHeadRow}>
            <Text style={s.cardTitle}>Internship Progress</Text>
            <Text style={s.progressPercent}>{progress === null ? '—' : `${progress}%`}</Text>
          </View>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${progress ?? 0}%` }]} />
          </View>
          <View style={s.progressMetaRow}>
            <Text style={s.progressMetaText}>
              {attachment.start_date
                ? `Started ${new Date(attachment.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                : 'Start date not set'}
            </Text>
            {remaining !== null && (
              <View style={s.daysPill}>
                <Text style={s.daysPillText}>{remaining} Days Remaining</Text>
              </View>
            )}
          </View>
        </View>

        {/* Supervisor info rows */}
        <View style={s.infoRow}>
          <MaterialCommunityIcons name="account-tie-outline" size={18} color={TEAL} style={{ marginRight: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={s.infoLabel}>ASSIGNED SUPERVISOR</Text>
            <Text style={s.infoValue}>{supervisor?.full_name || 'Not yet assigned'}</Text>
          </View>
        </View>
        <View style={s.infoRow}>
          <Ionicons name="call-outline" size={18} color={TEAL} style={{ marginRight: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={s.infoLabel}>SUPERVISOR CONTACT</Text>
            <Text style={s.infoValue}>{supervisor?.phone || 'N/A'}</Text>
          </View>
        </View>

        {/* Current performance rating */}
        <View style={s.ratingCard}>
          <View style={s.ratingIconBox}>
            <Ionicons name="star" size={20} color={WHITE} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.ratingLabel}>CURRENT PERFORMANCE{'\n'}RATING</Text>
            <Text style={s.ratingValue}>
              {currentRating !== null ? currentRating.toFixed(1) : '—'}
              <Text style={s.ratingOutOf}> / 5.0</Text>
            </Text>
          </View>
          <Ionicons name="trending-up" size={22} color={WHITE} />
        </View>

        {/* Evaluation form */}
        <View style={s.evalCard}>
          <Text style={s.evalTitle}>Performance Evaluation</Text>

          <Text style={s.formLabel}>PERFORMANCE FEEDBACK</Text>
          <TextInput
            style={[s.textarea, errors.feedback && s.inputError]}
            placeholder={`Describe ${student?.full_name?.split(' ')[0] || 'their'}'s achievements, strengths, and areas for improvement...`}
            placeholderTextColor={TEXT_SUB}
            value={feedback}
            onChangeText={(text) => {
              setFeedback(text);
              if (errors.feedback) setErrors(prev => ({ ...prev, feedback: undefined }));
            }}
            multiline
            numberOfLines={5}
            editable={!submitting}
          />
          {errors.feedback && <Text style={s.errorText}>{errors.feedback}</Text>}

          <Text style={[s.formLabel, { marginTop: 18 }]}>OVERALL RATING</Text>
          <View style={s.ratingSelectorRow}>
            {[1, 2, 3, 4, 5].map((num) => (
              <TouchableOpacity
                key={num}
                style={[s.ratingCircle, num <= rating && s.ratingCircleActive]}
                onPress={() => {
                  setRating(num);
                  if (errors.rating) setErrors(prev => ({ ...prev, rating: undefined }));
                }}
                disabled={submitting}
              />
            ))}
            <Text style={s.ratingCount}>{rating} / 5</Text>
          </View>
          {errors.rating && <Text style={s.errorText}>{errors.rating}</Text>}

          <TouchableOpacity
            style={[s.submitBtn, submitting && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={WHITE} size="small" />
            ) : (
              <Text style={s.submitBtnText}>Submit to Supervisor</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: BG,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: TEAL },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 20 },

  card: {
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 0.5,
    borderColor: BORDER,
  },
  internRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: TEAL,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: WHITE, fontSize: 24, fontWeight: '700' },
  statusDot: {
    position: 'absolute', bottom: 2, right: 2,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#3EBD6C',
    borderWidth: 2, borderColor: WHITE,
  },
  internName: { fontSize: 17, fontWeight: '800', color: TEAL },
  internSub: { fontSize: 13, color: TEXT_SUB, marginTop: 2, marginBottom: 8 },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: TEAL_LIGHT,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: TEAL, letterSpacing: 0.3 },

  cardTitle: { fontSize: 15, fontWeight: '700', color: TEXT },
  progressHeadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  progressPercent: { fontSize: 15, fontWeight: '800', color: TEAL },
  progressTrack: { height: 8, backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 4, marginBottom: 12 },
  progressFill: { height: 8, backgroundColor: TEAL, borderRadius: 4 },
  progressMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressMetaText: { fontSize: 12, color: TEXT_SUB },
  daysPill: { backgroundColor: AMBER_LIGHT, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  daysPillText: { fontSize: 11, fontWeight: '700', color: AMBER },

  infoRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: WHITE, borderRadius: 14,
    padding: 14, marginBottom: 10,
    borderWidth: 0.5, borderColor: BORDER,
  },
  infoLabel: { fontSize: 10, fontWeight: '700', color: TEXT_SUB, letterSpacing: 0.5, marginBottom: 3 },
  infoValue: { fontSize: 14, fontWeight: '600', color: TEXT },

  ratingCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: TEAL,
    borderRadius: 16, padding: 18,
    marginTop: 4, marginBottom: 16,
  },
  ratingIconBox: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  ratingLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '700', letterSpacing: 0.4, marginBottom: 4 },
  ratingValue: { color: WHITE, fontSize: 26, fontWeight: '800' },
  ratingOutOf: { fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },

  evalCard: {
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 18,
    borderWidth: 0.5,
    borderColor: BORDER,
  },
  evalTitle: { fontSize: 18, fontWeight: '800', color: TEAL, marginBottom: 16 },
  formLabel: { fontSize: 11, fontWeight: '700', color: TEXT_SUB, letterSpacing: 0.5, marginBottom: 8 },
  textarea: {
    borderWidth: 1, borderColor: BORDER, borderRadius: 12,
    padding: 12, fontSize: 14, color: TEXT,
    minHeight: 110, textAlignVertical: 'top',
  },
  inputError: { borderColor: '#C62828', backgroundColor: '#FFF5F5' },
  errorText: { color: '#C62828', fontSize: 12, marginTop: 6 },

  ratingSelectorRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ratingCircle: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 2, borderColor: BORDER,
    backgroundColor: WHITE,
  },
  ratingCircleActive: { backgroundColor: CORAL, borderColor: CORAL },
  ratingCount: { marginLeft: 6, fontSize: 14, fontWeight: '700', color: TEXT },

  submitBtn: {
    marginTop: 22,
    backgroundColor: CORAL,
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: { color: WHITE, fontSize: 15, fontWeight: '700' },
});