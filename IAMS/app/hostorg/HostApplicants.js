import { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  RefreshControl, ActivityIndicator, TextInput, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../../api/axios';
import { showAlert } from '../../utils/crossPlatformAlert';

const TEAL       = '#0F6E56';
const TEAL_DARK  = '#0B5A47';
const AMBER      = '#BA7517';
const AMBER_BG   = '#FAEEDA';
const RED        = '#C62828';
const RED_BG     = '#FCE8E8';
const BLUE       = '#185FA5';
const BLUE_BG    = '#E3F2FD';
const TEAL_BG    = '#E1F5EE';
const DARK       = '#111827';
const GRAY       = '#6B7280';
const BORDER     = '#E5E7EB';
const BG         = '#F0F4F3';

const statusMeta = (status) => {
  switch (status) {
    case 'pending':
      return { label: 'PENDING', bg: AMBER_BG, color: AMBER };
    case 'accepted':
      return { label: 'ACCEPTED', bg: TEAL_BG, color: TEAL };
    case 'more_info':
      return { label: 'MORE INFO', bg: BLUE_BG, color: BLUE };
    case 'rejected':
      return { label: 'REJECTED', bg: RED_BG, color: RED };
    default:
      return { label: String(status || 'UNKNOWN').toUpperCase(), bg: '#F3F4F6', color: GRAY };
  }
};

function DetailPair({ leftLabel, leftValue, rightLabel, rightValue }) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailCol}>
        <Text style={styles.detailLabel}>{leftLabel}</Text>
        <Text style={styles.detailValue}>{leftValue || '—'}</Text>
      </View>
      <View style={styles.detailCol}>
        <Text style={styles.detailLabel}>{rightLabel}</Text>
        <Text style={styles.detailValue}>{rightValue || '—'}</Text>
      </View>
    </View>
  );
}

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
      showAlert('Error', err.response?.data?.message || 'Failed to load applicants');
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
      showAlert('Message required', 'Please include a response message for the student.');
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
      showAlert('Response sent', 'Your response has been sent to the student.');
    } catch (err) {
      showAlert('Error', err.response?.data?.message || 'Failed to send response');
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
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>Applicants</Text>
          <Text style={styles.subtitle}>
            {sortedApplications.length} application{sortedApplications.length === 1 ? '' : 's'} total
          </Text>
        </View>
        <View style={styles.avatarCircle}>
          <MaterialCommunityIcons name="office-building" size={18} color="#FFFFFF" />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[TEAL]} tintColor={TEAL} />}
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
                  <Text style={styles.name} numberOfLines={1}>{app.full_name || 'Applicant'}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
                    <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
                  </View>
                </View>
                <Text style={styles.regNo}>Reg No: {app.reg_number || '—'}</Text>

                <View style={styles.detailBlock}>
                  <DetailPair
                    leftLabel="DEPARTMENT" leftValue={app.department}
                    rightLabel="YEAR OF STUDY" rightValue={app.year_of_study ? `Year ${app.year_of_study}` : null}
                  />
                  <DetailPair
                    leftLabel="PERIOD" leftValue={app.start_date && app.end_date ? `${app.start_date} — ${app.end_date}` : null}
                    rightLabel="PHONE" rightValue={app.phone}
                  />
                  <View style={styles.detailFullRow}>
                    <Text style={styles.detailLabel}>SKILLS</Text>
                    <Text style={styles.detailValue}>{app.skills || '—'}</Text>
                  </View>
                  {!!app.supporting_info && (
                    <View style={styles.detailFullRow}>
                      <Text style={styles.detailLabel}>SUPPORTING INFO</Text>
                      <Text style={styles.detailValue}>{app.supporting_info}</Text>
                    </View>
                  )}
                </View>

                {!!app.response_message && (
                  <View style={styles.responseBox}>
                    <Text style={styles.responseLabel}>LATEST RESPONSE</Text>
                    <Text style={styles.responseText}>"{app.response_message}"</Text>
                  </View>
                )}

                {!isResponded && (
                  <View style={styles.responseArea}>
                    <Text style={styles.responseTitle}>RESPOND TO APPLICANT</Text>
                    <TextInput
                      style={styles.responseInput}
                      value={responses[app.application_id] || ''}
                      onChangeText={(text) => setResponses(prev => ({ ...prev, [app.application_id]: text }))}
                      placeholder="Write feedback or next steps..."
                      placeholderTextColor={GRAY}
                      multiline
                      numberOfLines={3}
                      editable={!isSubmitting}
                    />
                    <View style={styles.responseActions}>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.acceptBtn, isSubmitting && styles.actionDisabled]}
                        onPress={() => handleRespond(app, 'accepted')}
                        disabled={isSubmitting}
                      >
                        <Text style={styles.actionText}>Accept</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.moreBtn, isSubmitting && styles.actionDisabled]}
                        onPress={() => handleRespond(app, 'more_info')}
                        disabled={isSubmitting}
                      >
                        <Text style={styles.actionText}>More Info</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.rejectBtn, isSubmitting && styles.actionDisabled]}
                        onPress={() => handleRespond(app, 'rejected')}
                        disabled={isSubmitting}
                      >
                        <Text style={styles.actionText}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            );
          })
        )}
        <View style={{ height: 28 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG },
  loadingText: { marginTop: 10, color: GRAY },

  // Header
  header: {
    backgroundColor: TEAL_DARK,
    paddingTop: 10,
    paddingBottom: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTextWrap: { flex: 1, alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  subtitle: { marginTop: 3, color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600' },
  avatarCircle: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },

  scrollContent: { paddingTop: 16 },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 26,
    alignItems: 'center',
  },
  emptyIcon: { fontSize: 44, marginBottom: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: DARK },
  emptyText: { marginTop: 6, color: GRAY, textAlign: 'center', lineHeight: 20 },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 18,
    padding: 18,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontSize: 17, fontWeight: '800', color: DARK, flex: 1, paddingRight: 8 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
  statusText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
  regNo: { color: GRAY, fontSize: 13, marginTop: 4, marginBottom: 14 },

  // Detail grid
  detailBlock: { marginBottom: 4 },
  detailRow: { flexDirection: 'row', marginBottom: 14 },
  detailCol: { flex: 1 },
  detailFullRow: { marginBottom: 14 },
  detailLabel: { fontSize: 10, fontWeight: '800', color: GRAY, letterSpacing: 0.5, marginBottom: 4 },
  detailValue: { fontSize: 14, fontWeight: '600', color: DARK },

  // Latest response box
  responseBox: {
    backgroundColor: '#F7FBF9',
    borderWidth: 1,
    borderColor: '#DCEEE6',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  responseLabel: { fontSize: 10, fontWeight: '800', color: TEAL, letterSpacing: 0.5, marginBottom: 4 },
  responseText: { fontSize: 13, color: DARK, fontStyle: 'italic', lineHeight: 19 },

  // Respond area
  responseArea: {
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 14,
  },
  responseTitle: { fontSize: 11, fontWeight: '800', color: GRAY, letterSpacing: 0.5, marginBottom: 8 },
  responseInput: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    padding: 12,
    minHeight: 72,
    fontSize: 13,
    color: DARK,
    backgroundColor: '#F9FAFB',
    textAlignVertical: 'top',
  },
  responseActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  acceptBtn: { backgroundColor: TEAL },
  moreBtn: { backgroundColor: BLUE },
  rejectBtn: { backgroundColor: RED },
  actionText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  actionDisabled: { opacity: 0.5 },
});