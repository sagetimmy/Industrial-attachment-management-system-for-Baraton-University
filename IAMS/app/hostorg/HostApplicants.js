import { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  RefreshControl, ActivityIndicator, Alert, TextInput, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/axios';

const TEAL = '#0F6E56';
const AMBER = '#BA7517';
const RED = '#C62828';
const BLUE = '#185FA5';
const DARK = '#111827';
const GRAY = '#6B7280';

const statusMeta = (status) => {
  switch (status) {
    case 'pending':
      return { label: 'PENDING', bg: '#FAEEDA', color: AMBER };
    case 'accepted':
      return { label: 'ACCEPTED', bg: '#E1F5EE', color: TEAL };
    case 'more_info':
      return { label: 'MORE INFO', bg: '#E3F2FD', color: BLUE };
    case 'rejected':
      return { label: 'REJECTED', bg: '#FCE8E8', color: RED };
    default:
      return { label: String(status || 'UNKNOWN').toUpperCase(), bg: '#F3F4F6', color: GRAY };
  }
};

export default function HostApplicants({ navigation }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [responses, setResponses] = useState({});
  const [submittingId, setSubmittingId] = useState(null);

  const fetchApplicants = async () => {
    try {
      const res = await api.get('/applications');
      setApplications(res.data?.applications || []);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load applicants');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchApplicants(); }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchApplicants();
  };

  const handleRespond = async (app, status) => {
    const message = (responses[app.application_id] || '').trim();
    if (!message) {
      Alert.alert('Message required', 'Please include a response message for the student.');
      return;
    }

    setSubmittingId(app.application_id);
    try {
      await api.patch(`/applications/${app.application_id}/respond`, { status, message });
      setApplications(prev => prev.map(item => (
        item.application_id === app.application_id
          ? { ...item, status, response_message: message, responded_at: new Date().toISOString() }
          : item
      )));
      setResponses(prev => ({ ...prev, [app.application_id]: '' }));
      Alert.alert('Response sent', 'Your response has been sent to the student.');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to send response');
    } finally {
      setSubmittingId(null);
    }
  };

  const sortedApplications = useMemo(
    () => [...applications].sort((a, b) => {
      const rank = { pending: 0, more_info: 1, accepted: 2, rejected: 3 };
      return (rank[a.status] ?? 9) - (rank[b.status] ?? 9);
    }),
    [applications]
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={TEAL} />
        <Text style={styles.loadingText}>Loading applicants...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={22} color={DARK} />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Applicants</Text>
            <Text style={styles.subtitle}>
              {sortedApplications.length} application{sortedApplications.length === 1 ? '' : 's'}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {sortedApplications.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>No applications yet</Text>
            <Text style={styles.emptyText}>Students who apply for placement will appear here.</Text>
          </View>
        ) : (
          sortedApplications.map((app, index) => {
            const meta = statusMeta(app.status);
            const isResponded = app.status === 'accepted' || app.status === 'rejected';
            const isSubmitting = submittingId === app.application_id;
            return (
            <View key={app.application_id ?? index} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.name}>{app.full_name || 'Applicant'}</Text>
                <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
                  <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
                </View>
              </View>
              <Text style={styles.detail}>Reg No: {app.reg_number || '—'}</Text>
              <Text style={styles.detail}>Department: {app.department || '—'}</Text>
              <Text style={styles.detail}>Year of Study: {app.year_of_study || '—'}</Text>
              <Text style={styles.detail}>Phone: {app.phone || '—'}</Text>
              <Text style={styles.detail}>Period: {app.start_date} — {app.end_date}</Text>
              <Text style={styles.detail}>Skills: {app.skills || '—'}</Text>
              {!!app.supporting_info && (
                <Text style={styles.detail}>Info: {app.supporting_info}</Text>
              )}

              {!!app.response_message && (
                <View style={styles.responseBox}>
                  <Text style={styles.responseLabel}>Latest Response</Text>
                  <Text style={styles.responseText}>{app.response_message}</Text>
                </View>
              )}

              <View style={styles.responseArea}>
                <Text style={styles.responseTitle}>Respond to Applicant</Text>
                <TextInput
                  style={styles.responseInput}
                  value={responses[app.application_id] || ''}
                  onChangeText={(text) => setResponses(prev => ({ ...prev, [app.application_id]: text }))}
                  placeholder="Write feedback or next steps..."
                  placeholderTextColor={GRAY}
                  multiline
                  numberOfLines={3}
                  editable={!isResponded && !isSubmitting}
                />
                <View style={styles.responseActions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.acceptBtn, (isResponded || isSubmitting) && styles.actionDisabled]}
                    onPress={() => handleRespond(app, 'accepted')}
                    disabled={isResponded || isSubmitting}
                  >
                    <Text style={styles.actionText}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.moreBtn, (isResponded || isSubmitting) && styles.actionDisabled]}
                    onPress={() => handleRespond(app, 'more_info')}
                    disabled={isResponded || isSubmitting}
                  >
                    <Text style={styles.actionText}>More Info</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.rejectBtn, (isResponded || isSubmitting) && styles.actionDisabled]}
                    onPress={() => handleRespond(app, 'rejected')}
                    disabled={isResponded || isSubmitting}
                  >
                    <Text style={styles.actionText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
          })
        )}
        <View style={{ height: 28 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F3' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#6B7280' },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 52,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  title: { fontSize: 22, fontWeight: '700', color: DARK },
  subtitle: { marginTop: 4, color: GRAY, fontSize: 13 },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 14,
    padding: 26,
    alignItems: 'center',
  },
  emptyIcon: { fontSize: 44, marginBottom: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: DARK },
  emptyText: { marginTop: 6, color: GRAY, textAlign: 'center', lineHeight: 20 },
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  name: { fontSize: 16, fontWeight: '700', color: DARK, flex: 1, paddingRight: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '700' },
  detail: { color: GRAY, fontSize: 13, marginTop: 2 },
  responseBox: {
    marginTop: 10,
    backgroundColor: '#F7F9FB',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  responseLabel: { fontSize: 12, fontWeight: '700', color: DARK, marginBottom: 4 },
  responseText: { fontSize: 12, color: GRAY },
  responseArea: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 10,
  },
  responseTitle: { fontSize: 13, fontWeight: '700', color: DARK, marginBottom: 6 },
  responseInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 10,
    minHeight: 70,
    fontSize: 13,
    color: DARK,
    backgroundColor: '#FFFFFF',
    textAlignVertical: 'top',
  },
  responseActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  acceptBtn: { backgroundColor: TEAL },
  moreBtn: { backgroundColor: BLUE },
  rejectBtn: { backgroundColor: RED },
  actionText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  actionDisabled: { opacity: 0.5 },
});