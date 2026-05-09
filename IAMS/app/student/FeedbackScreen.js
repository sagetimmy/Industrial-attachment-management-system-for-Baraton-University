import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, RefreshControl
} from 'react-native';
import { COLORS } from '../../constants/colors';
import api from '../../api/axios';

export default function FeedbackScreen({ navigation }) {
  const [feedback, setFeedback] = useState([]);
  const [attachment, setAttachment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [feedbackRes, attachRes] = await Promise.all([
        api.get('/students/feedback'),
        api.get('/students/my-attachment'),
      ]);
      setFeedback(feedbackRes.data);
      setAttachment(attachRes.data);
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading feedback...</Text>
      </View>
    );
  }

  const avgScore = feedback.length > 0
    ? (feedback.reduce((sum, f) => sum + Number(f.score || 0), 0) / feedback.length).toFixed(1)
    : null;

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Feedback & Grades ⭐</Text>
        <Text style={styles.subtitle}>View supervisor evaluations</Text>
      </View>

      {/* Score Summary */}
      {avgScore && (
        <View style={styles.scoreCard}>
          <View style={styles.scoreLeft}>
            <Text style={styles.scoreTitle}>Overall Performance</Text>
            <Text style={styles.scoreSubtitle}>Based on {feedback.length} evaluation(s)</Text>
          </View>
          <View style={[styles.scoreBadge, { borderColor: getGradeColor(avgScore) }]}>
            <Text style={[styles.scoreGrade, { color: getGradeColor(avgScore) }]}>
              {getGradeLetter(avgScore)}
            </Text>
            <Text style={[styles.scoreNum, { color: getGradeColor(avgScore) }]}>
              {avgScore}%
            </Text>
          </View>
        </View>
      )}

      {/* Attachment Info */}
      {attachment && (
        <View style={styles.attachCard}>
          <Text style={styles.attachTitle}>Current Attachment</Text>
          <Text style={styles.attachOrg}>{attachment.org_name}</Text>
          {attachment.supervisor_name && (
            <Text style={styles.attachSupervisor}>
              👨‍🏫 Supervisor: {attachment.supervisor_name}
            </Text>
          )}
          <View style={[styles.statusBadge, {
            backgroundColor: attachment.status === 'ongoing' ? '#E8F5E9' : '#FFF3E0'
          }]}>
            <Text style={[styles.statusText, {
              color: attachment.status === 'ongoing' ? '#2E7D32' : COLORS.primary
            }]}>
              {attachment.status}
            </Text>
          </View>
        </View>
      )}

      {/* Feedback List */}
      <Text style={styles.sectionTitle}>Evaluations</Text>
      {feedback.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>⭐</Text>
          <Text style={styles.emptyTitle}>No Feedback Yet</Text>
          <Text style={styles.emptyText}>
            Your supervisor hasn't submitted any evaluations yet.
            Keep submitting your weekly logbook entries!
          </Text>
        </View>
      ) : (
        feedback.map((item, index) => (
          <View key={index} style={styles.feedbackCard}>
            <View style={styles.feedbackHeader}>
              <View>
                <Text style={styles.supervisorName}>{item.supervisor_name}</Text>
                <Text style={styles.evalDate}>
                  {item.eval_date
                    ? new Date(item.eval_date).toLocaleDateString()
                    : new Date(item.created_at).toLocaleDateString()}
                </Text>
              </View>
              {item.score && (
                <View style={[styles.feedbackScore, {
                  backgroundColor: getGradeColor(item.score) + '20'
                }]}>
                  <Text style={[styles.feedbackScoreText, {
                    color: getGradeColor(item.score)
                  }]}>
                    {getGradeLetter(item.score)} • {item.score}%
                  </Text>
                </View>
              )}
            </View>

            {item.comments && (
              <View style={styles.commentsBox}>
                <Text style={styles.commentsLabel}>💬 Comments</Text>
                <Text style={styles.commentsText}>{item.comments}</Text>
              </View>
            )}

            {/* Score bar */}
            {item.score && (
              <View style={styles.scoreBarContainer}>
                <View style={styles.scoreBarBg}>
                  <View style={[styles.scoreBarFill, {
                    width: `${item.score}%`,
                    backgroundColor: getGradeColor(item.score),
                  }]} />
                </View>
                <Text style={styles.scoreBarLabel}>{item.score}%</Text>
              </View>
            )}
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
  loadingText: { marginTop: 10, color: COLORS.gray },
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
  scoreCard: {
    backgroundColor: COLORS.white,
    margin: 16, padding: 16,
    borderRadius: 16, elevation: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreLeft: { flex: 1 },
  scoreTitle: { fontSize: 16, fontWeight: '700', color: COLORS.darkGray },
  scoreSubtitle: { fontSize: 12, color: COLORS.gray, marginTop: 4 },
  scoreBadge: {
    width: 70, height: 70,
    borderRadius: 35,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreGrade: { fontSize: 22, fontWeight: 'bold' },
  scoreNum: { fontSize: 11, fontWeight: '600' },
  attachCard: {
    backgroundColor: COLORS.secondary,
    marginHorizontal: 16, marginBottom: 8,
    padding: 14, borderRadius: 16,
  },
  attachTitle: { color: '#8899AA', fontSize: 12, marginBottom: 4 },
  attachOrg: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
  attachSupervisor: { color: '#8899AA', fontSize: 12, marginTop: 4 },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8, marginTop: 8,
  },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  sectionTitle: {
    fontSize: 16, fontWeight: '700',
    color: COLORS.darkGray,
    marginLeft: 16, marginTop: 20, marginBottom: 10,
  },
  emptyCard: {
    backgroundColor: COLORS.white,
    margin: 16, padding: 30,
    borderRadius: 16, alignItems: 'center', elevation: 2,
  },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.darkGray },
  emptyText: { fontSize: 13, color: COLORS.gray, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  feedbackCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16, marginBottom: 12,
    padding: 16, borderRadius: 16, elevation: 2,
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  supervisorName: { fontSize: 15, fontWeight: '700', color: COLORS.darkGray },
  evalDate: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  feedbackScore: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 10,
  },
  feedbackScoreText: { fontSize: 13, fontWeight: '700' },
  commentsBox: {
    backgroundColor: '#F8F9FA',
    padding: 12, borderRadius: 10, marginBottom: 12,
  },
  commentsLabel: { fontSize: 12, color: COLORS.gray, marginBottom: 6 },
  commentsText: { fontSize: 13, color: COLORS.darkGray, lineHeight: 20 },
  scoreBarContainer: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  scoreBarBg: {
    flex: 1, height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4, overflow: 'hidden',
  },
  scoreBarFill: { height: '100%', borderRadius: 4 },
  scoreBarLabel: { fontSize: 12, fontWeight: '700', color: COLORS.darkGray, width: 35 },
});