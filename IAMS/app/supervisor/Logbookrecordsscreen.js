import { useState, useCallback } from 'react';
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
import api from '../../api/axios';
import Spinner from '../../components/Spinner';
import StatusBadge from '../../components/StatusBadge';

const NAVY = '#0F2419';
const TEAL = '#1B7A65';
const BACKGROUND = '#EEF2F0';
const WHITE = '#FFFFFF';
const GRAY_TEXT = '#6B7280';
const LIGHT_TEAL_BG = '#E3F2EE';
const BORDER = '#E5E9E6';
const AMBER = '#BA7517';
const RED = '#C0392B';

const IS_WEB = Platform.OS === 'web';

const formatDate = (value, withTime = false) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
};

const scoreColor = (score) => {
  if (score == null) return GRAY_TEXT;
  if (score >= 70) return TEAL;
  if (score >= 50) return AMBER;
  return RED;
};

// Escapes a value for safe inclusion in a CSV cell
const csvCell = (value) => {
  const str = String(value ?? '').replace(/"/g, '""');
  return `"${str}"`;
};

export default function LogbookRecordsScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { attachmentId, studentName } = route.params || {};

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchEntries = useCallback(async () => {
    if (!attachmentId) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const res = await api.get('/supervisors/logbooks');
      const mine = (res.data || [])
        .filter((e) => e.attachment_id === attachmentId)
        .sort((a, b) => (a.week_number || 0) - (b.week_number || 0));
      setEntries(mine);
    } catch (err) {
      console.error('Failed to load logbook records:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [attachmentId]);

  useFocusEffect(
    useCallback(() => {
      fetchEntries();
    }, [fetchEntries])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchEntries();
  };

  const handlePrint = () => {
    if (IS_WEB && typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleExportCsv = () => {
    if (!IS_WEB || typeof document === 'undefined') return;

    const header = ['Week', 'Submitted At', 'Status', 'Hours Worked', 'Score', 'Feedback', 'Description', 'Tasks Done', 'Challenges'];
    const rows = entries.map((e) => [
      e.week_number ?? '',
      formatDate(e.submitted_at, true),
      e.status || 'pending',
      e.hours_worked ?? '',
      e.supervisor_score ?? '',
      e.supervisor_feedback || '',
      e.description || '',
      e.tasks_done || '',
      e.challenges || '',
    ]);

    const csvContent = [header, ...rows]
      .map((row) => row.map(csvCell).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeName = (studentName || 'student').replace(/[^a-z0-9]+/gi, '_');
    link.href = url;
    link.setAttribute('download', `${safeName}_logbook_records.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

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
      {/* Header (hidden when printed) */}
      <View style={styles.header} nativeID="logbook-records-no-print">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={NAVY} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.headerTitle} numberOfLines={1}>Logbook Records</Text>
          {studentName ? <Text style={styles.headerSubtitle} numberOfLines={1}>{studentName}</Text> : null}
        </View>
        <View style={styles.headerActions}>
          {IS_WEB && (
            <>
              <TouchableOpacity onPress={handleExportCsv} style={styles.iconButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="download-outline" size={20} color={NAVY} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handlePrint} style={styles.iconButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="print-outline" size={20} color={NAVY} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[TEAL]} tintColor={TEAL} />}
        nativeID="logbook-records-scroll"
      >
        <View nativeID="logbook-records-printable">
          {/* Print-only report header — invisible on screen, shown on the printed page */}
          <View style={styles.printOnlyHeader} nativeID="logbook-records-print-only">
            <Text style={styles.printTitle}>Logbook Records — {studentName || 'Student'}</Text>
            <Text style={styles.printMeta}>Generated {formatDate(new Date().toISOString(), true)} · {entries.length} entr{entries.length === 1 ? 'y' : 'ies'}</Text>
          </View>

          {!attachmentId ? (
            <View style={styles.card}>
              <Text style={styles.emptyText}>This student has no active attachment on record, so there are no logbook entries to show.</Text>
            </View>
          ) : entries.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.emptyText}>No logbook entries have been submitted yet.</Text>
            </View>
          ) : (
            entries.map((entry) => (
              <View key={entry.entry_id} style={styles.entryCard}>
                <View style={styles.entryHeaderRow}>
                  <Text style={styles.entryWeek}>Week {entry.week_number ?? '—'}</Text>
                  <StatusBadge status={String(entry.status || 'pending').toLowerCase()} size="small" />
                </View>
                <Text style={styles.entryDate}>Submitted {formatDate(entry.submitted_at, true)}</Text>

                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <MaterialCommunityIcons name="clock-outline" size={14} color={GRAY_TEXT} />
                    <Text style={styles.metaText}>{entry.hours_worked != null ? `${entry.hours_worked} hrs` : 'No hours logged'}</Text>
                  </View>
                  {entry.supervisor_score != null && (
                    <View style={styles.metaItem}>
                      <Ionicons name="star" size={14} color={scoreColor(Number(entry.supervisor_score))} />
                      <Text style={[styles.metaText, { color: scoreColor(Number(entry.supervisor_score)), fontWeight: '700' }]}>
                        {entry.supervisor_score}%
                      </Text>
                    </View>
                  )}
                </View>

                {entry.description ? (
                  <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Description</Text>
                    <Text style={styles.sectionText}>{entry.description}</Text>
                  </View>
                ) : null}

                {entry.tasks_done ? (
                  <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Tasks Completed</Text>
                    <Text style={styles.sectionText}>{entry.tasks_done}</Text>
                  </View>
                ) : null}

                {entry.challenges ? (
                  <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Challenges</Text>
                    <Text style={styles.sectionText}>{entry.challenges}</Text>
                  </View>
                ) : null}

                {entry.supervisor_feedback ? (
                  <View style={[styles.section, styles.feedbackBox]}>
                    <Text style={styles.sectionLabel}>Supervisor Feedback</Text>
                    <Text style={styles.sectionText}>{entry.supervisor_feedback}</Text>
                  </View>
                ) : null}

                {entry.document_url ? (
                  <Text style={styles.docLink} numberOfLines={1}>Attached document: {entry.document_url}</Text>
                ) : null}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
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
  headerTitle: { fontSize: 17, fontWeight: '700', color: NAVY },
  headerSubtitle: { fontSize: 12, color: GRAY_TEXT, marginTop: 1 },
  headerActions: { flexDirection: 'row', width: 76, justifyContent: 'flex-end', gap: 6 },
  iconButton: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4 },
  printOnlyHeader: { display: 'none' },
  printTitle: { fontSize: 18, fontWeight: '700', color: NAVY, marginBottom: 4 },
  printMeta: { fontSize: 12, color: GRAY_TEXT, marginBottom: 16 },
  card: {
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 18,
    ...cardShadow(),
  },
  emptyText: { fontSize: 13, color: GRAY_TEXT, textAlign: 'center', lineHeight: 19 },
  entryCard: {
    backgroundColor: WHITE,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  entryHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  entryWeek: { fontSize: 15, fontWeight: '700', color: NAVY },
  entryDate: { fontSize: 12, color: GRAY_TEXT, marginBottom: 10 },
  metaRow: { flexDirection: 'row', gap: 16, marginBottom: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: GRAY_TEXT, fontWeight: '600' },
  section: { marginTop: 8 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: GRAY_TEXT, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 3 },
  sectionText: { fontSize: 13, color: '#374151', lineHeight: 19 },
  feedbackBox: {
    backgroundColor: LIGHT_TEAL_BG,
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  docLink: { fontSize: 12, color: TEAL, marginTop: 10, fontWeight: '600' },
});

function cardShadow() {
  return Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
    android: { elevation: 2 },
    web: { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  });
}