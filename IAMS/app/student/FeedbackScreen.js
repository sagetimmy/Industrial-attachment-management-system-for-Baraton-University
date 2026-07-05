import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, RefreshControl
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import api from '../../api/axios';
import Spinner from '../../components/Spinner';

const TEAL = '#1B7A65';
const TEAL_DARK = '#166354';
const AMBER = '#BA7517';
const AMBER_LIGHT = '#FAEEDA';
const RED = '#C0392B';
const RED_LIGHT = '#FCE8E8';

// ── Circular progress ring for the overall score badge ──
function ScoreRing({ percent, color, size = 90, strokeWidth = 6 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(100, percent));
  const dashOffset = circumference * (1 - progress / 100);

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E3F1EE"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={{ alignItems: 'center' }}>
        <Text style={[styles.ringGrade, { color }]}>{getGradeLetter(percent)}</Text>
        <Text style={[styles.ringPercent, { color }]}>{percent}%</Text>
      </View>
    </View>
  );
}

// ── Helpers (module-level so ScoreRing can use them too) ──
const getGradeColor = (score) => {
  if (score >= 70) return TEAL;
  if (score >= 50) return AMBER;
  return RED;
};

const getGradeLetter = (score) => {
  if (score >= 70) return 'A';
  if (score >= 60) return 'B+';
  if (score >= 50) return 'C';
  if (score >= 40) return 'D';
  return 'F';
};

const weekStatusMeta = (status) => {
  switch (status) {
    case 'approved': return { label: '✓ APPROVED', bg: '#E1F5EE', text: TEAL };
    case 'rejected': return { label: '✕ REJECTED', bg: RED_LIGHT, text: RED };
    case 'revision': return { label: '↺ REVISION REQUESTED', bg: AMBER_LIGHT, text: AMBER };
    default:         return { label: '⏳ PENDING REVIEW', bg: '#F4F4F4', text: '#888' };
  }
};

export default function FeedbackScreen({ navigation }) {
  const [evaluations, setEvaluations] = useState([]);
  const [logbookEntries, setLogbookEntries] = useState([]);
  const [attachment, setAttachment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [feedbackRes, attachRes, logbookRes] = await Promise.all([
        api.get('/students/feedback'),
        api.get('/students/my-attachment'),
        api.get('/students/logbook'),
      ]);
      setEvaluations(feedbackRes.data || []);
      setAttachment(attachRes.data);
      setLogbookEntries(logbookRes.data || []);
    } catch (err) {
      Alert.alert('Error', 'Failed to load feedback');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Spinner size="large" color={TEAL} />
        <Text style={styles.loadingText}>Loading feedback...</Text>
      </View>
    );
  }

  // ── Weekly logbook grades: only entries the supervisor has actually scored ──
  const gradedWeeks = logbookEntries
    .filter((e) => e.supervisor_score !== null && e.supervisor_score !== undefined)
    .sort((a, b) => (b.week_number ?? 0) - (a.week_number ?? 0));

  const weeklyAverage = gradedWeeks.length > 0
    ? Math.round(gradedWeeks.reduce((sum, e) => sum + Number(e.supervisor_score || 0), 0) / gradedWeeks.length)
    : null;

  // ── Final evaluation: most recent standalone evaluation, treated as "final"
  // once the attachment has been marked completed ──
  const sortedEvaluations = [...evaluations].sort(
    (a, b) => new Date(b.eval_date ?? b.created_at) - new Date(a.eval_date ?? a.created_at)
  );
  const isCompleted = attachment?.status === 'completed';
  const finalEvaluation = isCompleted && sortedEvaluations.length > 0 ? sortedEvaluations[0] : null;

  // ── What the top ring shows ──
  const ringScore = finalEvaluation ? Number(finalEvaluation.score || 0) : weeklyAverage;
  const ringLabel = finalEvaluation ? 'Final Grade' : 'Performance So Far';

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* ===== Header ===== */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backCircle}>
          <Ionicons name="chevron-back" size={22} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerTitleRow}>
          <Text style={styles.title}>Feedback & Grades</Text>
          <Text style={styles.titleEmoji}> ⭐</Text>
        </View>
        <Text style={styles.subtitle}>Weekly logbook reviews & final evaluation</Text>
      </View>

      {/* ===== Overall Performance / Final Grade ===== */}
      {ringScore !== null && (
        <View style={styles.scoreCard}>
          <View style={styles.scoreLeft}>
            <Text style={styles.scoreTitle}>{ringLabel}</Text>
            {finalEvaluation ? (
              <View style={styles.finalPill}>
                <Text style={styles.finalPillText}>ATTACHMENT COMPLETE</Text>
              </View>
            ) : (
              <Text style={styles.scoreSubtext}>
                Based on {gradedWeeks.length} graded week{gradedWeeks.length === 1 ? '' : 's'}
              </Text>
            )}
          </View>
          <ScoreRing percent={ringScore} color={getGradeColor(ringScore)} />
        </View>
      )}

      {/* ===== Current Attachment ===== */}
      {attachment && (
        <View style={styles.attachCard}>
          <View style={styles.attachIconWrap}>
            <MaterialCommunityIcons name="briefcase-outline" size={22} color="rgba(255,255,255,0.35)" />
          </View>
          <Text style={styles.attachLabel}>CURRENT ATTACHMENT</Text>
          <Text style={styles.attachOrg}>{attachment.org_name}</Text>

          {attachment.supervisor_name && (
            <View style={styles.supervisorRow}>
              <View style={styles.supervisorAvatar}>
                <MaterialCommunityIcons name="account" size={18} color={TEAL_DARK} />
              </View>
              <View>
                <Text style={styles.supervisorLabel}>Supervisor</Text>
                <Text style={styles.supervisorName}>{attachment.supervisor_name}</Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* ===== Final Evaluation (only once attachment is complete) ===== */}
      {finalEvaluation && (
        <>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Final Evaluation</Text>
          </View>
          <View style={styles.feedbackCard}>
            <View style={styles.feedbackHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.evalTitle}>Final Supervisor Evaluation</Text>
                <Text style={styles.evalMeta}>
                  By {finalEvaluation.supervisor_name} •{' '}
                  {new Date(finalEvaluation.eval_date ?? finalEvaluation.created_at).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })}
                </Text>
              </View>
              <View style={[styles.feedbackScore, { backgroundColor: getGradeColor(finalEvaluation.score) + '20' }]}>
                <Text style={[styles.feedbackScoreText, { color: getGradeColor(finalEvaluation.score) }]}>
                  {getGradeLetter(finalEvaluation.score)} • {finalEvaluation.score}%
                </Text>
              </View>
            </View>
            {finalEvaluation.comments && (
              <View style={styles.commentsBox}>
                <View style={styles.commentsLabelRow}>
                  <Ionicons name="chatbubble-outline" size={13} color={TEAL} />
                  <Text style={styles.commentsLabel}> COMMENTS</Text>
                </View>
                <Text style={styles.commentsText}>"{finalEvaluation.comments}"</Text>
              </View>
            )}
          </View>
        </>
      )}

      {/* ===== Weekly Logbook Reviews ===== */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Weekly Logbook Reviews</Text>
      </View>

      {gradedWeeks.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>⭐</Text>
          <Text style={styles.emptyTitle}>No Graded Weeks Yet</Text>
          <Text style={styles.emptyText}>
            Your supervisor hasn't scored any logbook entries yet.
            Keep submitting your weekly logbook entries!
          </Text>
        </View>
      ) : (
        gradedWeeks.map((entry) => {
          const score = Number(entry.supervisor_score || 0);
          const gradeColor = getGradeColor(score);
          const statusMeta = weekStatusMeta(entry.status);
          return (
            <View key={entry.entry_id} style={styles.feedbackCard}>
              <View style={styles.feedbackHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.evalTitle}>Week {entry.week_number} Logbook</Text>
                  <Text style={styles.evalMeta}>
                    Reviewed {entry.reviewed_at
                      ? new Date(entry.reviewed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : '—'}
                  </Text>
                </View>
                <View style={[styles.feedbackScore, { backgroundColor: gradeColor + '20' }]}>
                  <Text style={[styles.feedbackScoreText, { color: gradeColor }]}>
                    {getGradeLetter(score)} • {score}%
                  </Text>
                </View>
              </View>

              <View style={[styles.statusPill, { backgroundColor: statusMeta.bg, alignSelf: 'flex-start', marginBottom: 12 }]}>
                <Text style={[styles.statusPillText, { color: statusMeta.text }]}>{statusMeta.label}</Text>
              </View>

              {entry.supervisor_feedback && (
                <View style={styles.commentsBox}>
                  <View style={styles.commentsLabelRow}>
                    <Ionicons name="chatbubble-outline" size={13} color={TEAL} />
                    <Text style={styles.commentsLabel}> SUPERVISOR FEEDBACK</Text>
                  </View>
                  <Text style={styles.commentsText}>"{entry.supervisor_feedback}"</Text>
                </View>
              )}

              <View style={styles.scoreBarSection}>
                <View style={styles.scoreBarLabelRow}>
                  <Text style={styles.scoreBarLabel}>WEEK SCORE</Text>
                  <Text style={[styles.scoreBarPercent, { color: gradeColor }]}>{score}%</Text>
                </View>
                <View style={styles.scoreBarBg}>
                  <View style={[styles.scoreBarFill, { width: `${score}%`, backgroundColor: gradeColor }]} />
                </View>
              </View>
            </View>
          );
        })
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F8F7' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: COLORS.gray },

  // Header
  header: {
    backgroundColor: TEAL,
    paddingTop: 55, paddingBottom: 28,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  backCircle: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center' },
  title: { color: COLORS.white, fontSize: 24, fontWeight: '700' },
  titleEmoji: { fontSize: 22 },
  subtitle: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 6 },

  // Score card
  scoreCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16, marginTop: -20,
    padding: 20, borderRadius: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  scoreLeft: { flex: 1, paddingRight: 10 },
  scoreTitle: { fontSize: 17, fontWeight: '700', color: TEAL_DARK },
  scoreSubtext: { fontSize: 12, color: COLORS.gray, marginTop: 4 },
  finalPill: {
    alignSelf: 'flex-start', backgroundColor: '#E1F5EE',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginTop: 6,
  },
  finalPillText: { fontSize: 10, fontWeight: '700', color: TEAL, letterSpacing: 0.4 },
  ringGrade: { fontSize: 22, fontWeight: '800' },
  ringPercent: { fontSize: 11, fontWeight: '600', marginTop: -2 },

  // Attachment card
  attachCard: {
    backgroundColor: TEAL,
    marginHorizontal: 16, marginTop: 16,
    padding: 18, borderRadius: 18,
    overflow: 'hidden',
  },
  attachIconWrap: {
    position: 'absolute', top: 16, right: 16,
  },
  attachLabel: {
    color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: '700',
    letterSpacing: 0.6, marginBottom: 6,
  },
  attachOrg: { color: COLORS.white, fontSize: 19, fontWeight: '700', lineHeight: 24, marginBottom: 16, maxWidth: '80%' },
  supervisorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  supervisorAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.85)',
    justifyContent: 'center', alignItems: 'center',
  },
  supervisorLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 11 },
  supervisorName: { color: COLORS.white, fontSize: 14, fontWeight: '700' },

  // Section header
  sectionRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginHorizontal: 16, marginTop: 24, marginBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1A2E29' },
  viewAll: { fontSize: 12, fontWeight: '700', color: TEAL, letterSpacing: 0.4 },

  // Empty state
  emptyCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16, padding: 30,
    borderRadius: 16, alignItems: 'center', elevation: 2,
  },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.darkGray },
  emptyText: { fontSize: 13, color: COLORS.gray, textAlign: 'center', marginTop: 6, lineHeight: 20 },

  // Feedback card
  feedbackCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16, marginBottom: 14,
    padding: 16, borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  evalTitle: { fontSize: 15, fontWeight: '700', color: '#1A2E29' },
  evalMeta: { fontSize: 12, color: COLORS.gray, marginTop: 3, lineHeight: 17 },
  feedbackScore: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20,
  },
  feedbackScoreText: { fontSize: 12, fontWeight: '700' },

  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusPillText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },

  // Comments box
  commentsBox: {
    backgroundColor: '#F4F8F7',
    padding: 12, borderRadius: 12, marginBottom: 14,
  },
  commentsLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  commentsLabel: { fontSize: 11, fontWeight: '700', color: TEAL, letterSpacing: 0.4 },
  commentsText: { fontSize: 13, color: '#3A4A46', lineHeight: 20, fontStyle: 'italic' },

  // Score bar
  scoreBarSection: {},
  scoreBarLabelRow: {
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6,
  },
  scoreBarLabel: { fontSize: 11, fontWeight: '700', color: COLORS.gray, letterSpacing: 0.4 },
  scoreBarPercent: { fontSize: 12, fontWeight: '700' },
  scoreBarBg: {
    height: 8,
    backgroundColor: '#EEF2F0',
    borderRadius: 4, overflow: 'hidden',
  },
  scoreBarFill: { height: '100%', borderRadius: 4 },
});