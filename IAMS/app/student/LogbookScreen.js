import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, RefreshControl,
  FlatList, Image, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../constants/colors';
import api, { requestWithRetry } from '../../api/axios';
import { hasRolePermission } from '../../utils/permissions';
import Spinner from '../../components/Spinner';

const TEAL = '#0F6E56';
const TEAL_LIGHT = '#E1F5EE';
const CORAL = '#D85A30';
const CORAL_LIGHT = '#FAECE7';
const AMBER = '#BA7517';
const AMBER_LIGHT = '#FAEEDA';

function formatDateLabel(dateStr) {
  const d = new Date(dateStr);
  return {
    month: d.toLocaleString('en', { month: 'short' }).toUpperCase(),
    day: d.getDate(),
  };
}

function computeDueWeek(startDate) {
  if (!startDate) return 1;
  const start = new Date(startDate);
  const now = new Date();
  const diffDays = Math.floor((now - start) / (1000 * 60 * 60 * 24));
  const week = Math.floor(diffDays / 7) + 1;
  return week < 1 ? 1 : week;
}

export default function LogbookScreen({ navigation }) {
  const { user } = useAuth();
  const canEditLogbooks = hasRolePermission(user, 'editLogbooks');
  const [entries, setEntries] = useState([]);
  const [attachment, setAttachment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [document, setDocument] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [form, setForm] = useState({
    week_number: '',
    description: '',
    tasks_done: '',
    challenges: '',
    hours_worked: '',
  });

  const dueWeek = attachment ? computeDueWeek(attachment.start_date) : 1;
  const dueWeekAlreadySubmitted = entries.some((e) => e.week_number === dueWeek);

  const fetchData = async () => {
    try {
      const [entriesRes, attachRes] = await Promise.all([
        api.get('/students/logbook'),
        api.get('/students/my-attachment'),
      ]);
      setEntries(entriesRes.data);
      setAttachment(attachRes.data);
      if (entriesRes.data.length > 0) {
        setSelectedWeek(entriesRes.data[0].week_number);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to load logbook');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled) setDocument(result.assets[0]);
    } catch (err) {
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const openForm = () => {
    if (!canEditLogbooks) {
      Alert.alert('Permission Disabled', 'Logbook submissions are currently disabled for students.');
      return;
    }
    if (dueWeekAlreadySubmitted) {
      Alert.alert('Already Submitted', `You've already submitted your Week ${dueWeek} entry.`);
      return;
    }
    setForm({ ...form, week_number: String(dueWeek) });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!canEditLogbooks) {
      Alert.alert('Permission Disabled', 'Logbook submissions are currently disabled for students.');
      return;
    }

    const weekToSubmit = attachment ? computeDueWeek(attachment.start_date) : form.week_number;

    if (!weekToSubmit || !form.description) {
      Alert.alert('Error', 'Week number and description are required');
      return;
    }

    if (!form.hours_worked || isNaN(Number(form.hours_worked)) || Number(form.hours_worked) <= 0) {
      Alert.alert('Error', 'Please enter a valid number of hours worked this week');
      return;
    }

    setSubmitting(true);
    try {
      const buildFormData = async () => {
        const formData = new FormData();
        formData.append('week_number', weekToSubmit);
        formData.append('description', form.description);
        formData.append('tasks_done', form.tasks_done);
        formData.append('challenges', form.challenges);
        formData.append('hours_worked', form.hours_worked);
        if (document) {
          if (Platform.OS === 'web') {
            // Some expo-document-picker versions don't populate `.file` on
            // web at all — only `.uri` (a blob: URL). Fetching that URI and
            // reading it back as a Blob works regardless of whether `.file`
            // is present, so it's the more reliable path than depending on
            // a property that may or may not exist depending on SDK version.
            let webBlob = document.file;
            if (!webBlob) {
              const fetched = await fetch(document.uri);
              webBlob = await fetched.blob();
            }
            formData.append('document', webBlob, document.name);
          } else {
            formData.append('document', {
              uri: document.uri,
              name: document.name,
              type: document.mimeType || 'application/octet-stream',
            });
          }
        }
        return formData;
      };

      const res = await requestWithRetry(
        async () => api.post('/students/logbook', await buildFormData(), {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 45000,
        }),
        { retries: 3, baseDelay: 800 }
      );
      setForm({ week_number: '', description: '', tasks_done: '', challenges: '', hours_worked: '' });
      setDocument(null);
      setShowForm(false);
      fetchData();
      // Backend returns the created entry on POST /students/logbook — fall back
      // to what we submitted locally if a field is missing, since submitted_at
      // in particular is server-assigned.
      navigation.navigate('LogbookSubmitted', {
        logbook: {
          week_number: res?.data?.week_number ?? weekToSubmit,
          hours_worked: res?.data?.hours_worked ?? form.hours_worked,
          submitted_at: res?.data?.submitted_at ?? new Date().toISOString(),
        },
      });
    } catch (err) {
      console.error('Logbook submit failed:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
        url: err.config?.url,
        baseURL: err.config?.baseURL,
        timeout: err.config?.timeout,
        fileSize: document?.size,
        fileType: document?.mimeType,
      });
      const message = err.response?.data?.message
        || (err.request && !err.response
          ? 'Network error while submitting. Please check your connection and try again.'
          : 'Failed to submit entry');
      Alert.alert('Error', message);
    } finally {
      setSubmitting(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const weekDates = entries.map((e) => ({
    week_number: e.week_number,
    submitted_at: e.submitted_at,
  }));

  const filteredEntries = selectedWeek
    ? entries.filter((e) => e.week_number === selectedWeek)
    : entries;

  if (loading) {
    return (
      <View style={s.loadingContainer}>
        <Spinner size="large" color={TEAL} />
        <Text style={s.loadingText}>Loading logbook...</Text>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#333" />
          <Text style={s.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Logbook</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={s.profileAvatar}>
          {user?.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} style={s.profileAvatarImage} />
          ) : (
            <Text style={s.profileIcon}>👤</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={s.weekStripWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.weekStrip}
        >
          {weekDates.map((item) => {
            const { month, day } = formatDateLabel(item.submitted_at);
            const active = selectedWeek === item.week_number;
            return (
              <TouchableOpacity
                key={item.week_number}
                style={[s.weekCell, active && s.weekCellActive]}
                onPress={() => setSelectedWeek(item.week_number)}
              >
                <Text style={[s.weekMonth, active && s.weekMonthActive]}>{month}</Text>
                <Text style={[s.weekDay, active && s.weekDayActive]}>{day}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={s.scrollContent}
      >

        {!canEditLogbooks ? (
          <View style={s.warningCard}>
            <Text style={s.warningIcon}>🔒</Text>
            <Text style={s.warningTitle}>Logbook Editing Disabled</Text>
            <Text style={s.warningText}>
              Students can view existing logbook entries, but new submissions are currently disabled.
            </Text>
          </View>
        ) : !attachment || attachment.status !== 'ongoing' ? (
          <View style={s.warningCard}>
            <Text style={s.warningIcon}>⚠️</Text>
            <Text style={s.warningTitle}>No Active Attachment</Text>
            <Text style={s.warningText}>
              You need an active (ongoing) attachment to submit logbook entries.
            </Text>
          </View>
        ) : (
          <>
            <View style={s.attachCard}>
              <Text style={s.attachOrg}>{attachment.org_name}</Text>
              <Text style={s.attachDetails}>
                {dueWeekAlreadySubmitted
                  ? `Week ${dueWeek} submitted · ${attachment.supervisor_name || 'No supervisor assigned'}`
                  : `Week ${dueWeek} is due · ${attachment.supervisor_name || 'No supervisor assigned'}`}
              </Text>
            </View>

            {!showForm && !dueWeekAlreadySubmitted && (
              <TouchableOpacity style={s.newEntryBtn} onPress={openForm}>
                <Text style={s.newEntryBtnText}>+ Submit Week {dueWeek} Entry</Text>
              </TouchableOpacity>
            )}

            {!showForm && dueWeekAlreadySubmitted && (
              <View style={s.attachCard}>
                <Text style={s.attachDetails}>
                  ✓ Week {dueWeek} entry already submitted. Next entry unlocks next week.
                </Text>
              </View>
            )}

            {showForm && (
              <View style={s.formCard}>
                <Text style={s.formTitle}>Week {dueWeek} Entry</Text>

                <Text style={s.label}>Week Number</Text>
                <View style={s.input}>
                  <Text style={{ fontSize: 14, color: '#333', fontWeight: '600' }}>
                    Week {dueWeek}
                  </Text>
                </View>

                <Text style={s.label}>Hours Worked This Week *</Text>
                <TextInput
                  style={s.input}
                  placeholder="e.g. 40"
                  value={form.hours_worked}
                  onChangeText={(v) => setForm({ ...form, hours_worked: v })}
                  keyboardType="numeric"
                />

                <Text style={s.label}>What did you do this week? *</Text>
                <TextInput
                  style={[s.input, s.textArea]}
                  placeholder="Describe your activities this week..."
                  value={form.description}
                  onChangeText={(v) => setForm({ ...form, description: v })}
                  multiline
                  numberOfLines={4}
                />

                <Text style={s.label}>Tasks Completed</Text>
                <TextInput
                  style={[s.input, s.textArea]}
                  placeholder="List the tasks you completed..."
                  value={form.tasks_done}
                  onChangeText={(v) => setForm({ ...form, tasks_done: v })}
                  multiline
                  numberOfLines={3}
                />

                <Text style={s.label}>Challenges Faced</Text>
                <TextInput
                  style={[s.input, s.textArea]}
                  placeholder="Any challenges you encountered..."
                  value={form.challenges}
                  onChangeText={(v) => setForm({ ...form, challenges: v })}
                  multiline
                  numberOfLines={3}
                />

                <Text style={s.label}>Supporting Document (optional)</Text>
                <TouchableOpacity style={s.uploadBtn} onPress={pickDocument}>
                  <Text style={s.uploadBtnText}>
                    {document ? `📎 ${document.name}` : '📎 Attach Document (PDF/Image)'}
                  </Text>
                </TouchableOpacity>
                {document && (
                  <TouchableOpacity onPress={() => setDocument(null)}>
                    <Text style={s.removeDoc}>✕ Remove document</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={s.submitBtn}
                  onPress={handleSubmit}
                  disabled={submitting}
                >
                  {submitting
                    ? <Spinner color="#fff" size="small" />
                    : <Text style={s.submitBtnText}>Submit Entry ✓</Text>
                  }
                </TouchableOpacity>

                <TouchableOpacity
                  style={s.cancelBtn}
                  onPress={() => {
                    setShowForm(false);
                    setForm({ week_number: '', description: '', tasks_done: '', challenges: '', hours_worked: '' });
                    setDocument(null);
                  }}
                >
                  <Text style={s.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {filteredEntries.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={s.emptyIcon}>📝</Text>
            <Text style={s.emptyTitle}>No Entries Found</Text>
            <Text style={s.emptyText}>
              Tap the button below to add a new entry.
            </Text>
            {canEditLogbooks && attachment?.status === 'ongoing' && !dueWeekAlreadySubmitted && (
              <TouchableOpacity style={s.addManuallyBtn} onPress={openForm}>
                <Text style={s.addManuallyText}>ADD MANUALLY</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredEntries.map((entry, index) => (
            <View key={index} style={s.entryCard}>
              <View style={s.entryTopRow}>
                <View style={s.entryDateBadge}>
                  <Text style={s.entryDateText}>
                    {new Date(entry.submitted_at).toLocaleDateString('en-GB', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    }).toUpperCase()}
                  </Text>
                </View>
                {entry.hours_worked ? (
                  <View style={s.hoursBadge}>
                    <Text style={s.hoursText}>
                      {entry.hours_worked} HOURS
                    </Text>
                  </View>
                ) : null}
              </View>

              <Text style={s.entryTitle}>
                Week {entry.week_number} — {attachment?.org_name ?? 'Logbook Entry'}
              </Text>

              <Text style={s.entryDesc} numberOfLines={3}>{entry.description}</Text>

              <View style={s.entryFooter}>
                <View style={[
                  s.statusBadge,
                  entry.status === 'approved' ? s.statusApproved
                  : entry.status === 'rejected' ? s.statusRejected
                  : entry.status === 'revision' ? s.statusRevision
                  : s.statusPending,
                ]}>
                  <Text style={[
                    s.statusText,
                    entry.status === 'approved' ? s.statusTextApproved
                    : entry.status === 'rejected' ? s.statusTextRejected
                    : entry.status === 'revision' ? s.statusTextRevision
                    : s.statusTextPending,
                  ]}>
                    {entry.status === 'approved' ? '✓ APPROVED'
                      : entry.status === 'rejected' ? '✕ REJECTED'
                      : entry.status === 'revision' ? '↺ REVISION REQUESTED'
                      : '⏳ PENDING'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => navigation.navigate('LogbookDetail', {
                    entry,
                    attachment,
                    totalEntries: entries.length,
                  })}
                >
                  <Text style={s.viewDetails}>View Details</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {canEditLogbooks && attachment?.status === 'ongoing' && !showForm && !dueWeekAlreadySubmitted && (
        <TouchableOpacity style={s.fab} onPress={openForm}>
          <Text style={s.fabIcon}>+</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F0F4F3' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#888' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 52, paddingBottom: 14,
    backgroundColor: '#F0F4F3',
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backText: { fontSize: 15, fontWeight: '600', color: '#333' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#111' },
  profileIcon: { fontSize: 22 },
  profileAvatar: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', backgroundColor: TEAL_LIGHT,
  },
  profileAvatarImage: { width: '100%', height: '100%' },
  weekStripWrap: {
    backgroundColor: '#F0F4F3',
    paddingVertical: 12,
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  weekStrip: { paddingHorizontal: 16, gap: 8 },
  weekCell: {
    width: 54, paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: TEAL_LIGHT,
    alignItems: 'center',
  },
  weekCellActive: { backgroundColor: TEAL },
  weekMonth: { fontSize: 10, fontWeight: '600', color: TEAL, letterSpacing: 0.3 },
  weekMonthActive: { color: '#9FE1CB' },
  weekDay: { fontSize: 20, fontWeight: '700', color: TEAL, marginTop: 2 },
  weekDayActive: { color: '#fff' },
  scrollContent: { padding: 16 },
  warningCard: {
    backgroundColor: '#FFF3E0',
    padding: 20, borderRadius: 16,
    alignItems: 'center',
    borderLeftWidth: 4, borderLeftColor: CORAL,
    marginBottom: 16,
  },
  warningIcon: { fontSize: 28, marginBottom: 8 },
  warningTitle: { fontSize: 15, fontWeight: '700', color: '#333' },
  warningText: { fontSize: 13, color: '#666', textAlign: 'center', marginTop: 6 },
  attachCard: {
    backgroundColor: TEAL,
    padding: 14, borderRadius: 14, marginBottom: 12,
  },
  attachOrg: { color: '#fff', fontSize: 14, fontWeight: '700' },
  attachDetails: { color: '#9FE1CB', fontSize: 12, marginTop: 3 },
  newEntryBtn: {
    backgroundColor: TEAL,
    padding: 14, borderRadius: 14,
    alignItems: 'center', marginBottom: 16,
  },
  newEntryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  formCard: {
    backgroundColor: '#fff',
    padding: 16, borderRadius: 16,
    borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.08)',
    marginBottom: 16,
  },
  formTitle: { fontSize: 15, fontWeight: '700', color: TEAL, marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', color: '#444', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: 10, padding: 12,
    fontSize: 14, marginBottom: 14,
    backgroundColor: '#F8F8F8',
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  uploadBtn: {
    borderWidth: 1.5, borderColor: TEAL,
    borderStyle: 'dashed', borderRadius: 10,
    padding: 14, alignItems: 'center',
    backgroundColor: TEAL_LIGHT, marginBottom: 8,
  },
  uploadBtnText: { color: TEAL, fontWeight: '600', fontSize: 13 },
  removeDoc: { color: CORAL, fontSize: 12, marginBottom: 14, textAlign: 'center' },
  submitBtn: {
    backgroundColor: TEAL,
    padding: 14, borderRadius: 12,
    alignItems: 'center', marginTop: 8,
  },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  cancelBtn: {
    padding: 12, borderRadius: 12,
    alignItems: 'center', marginTop: 8,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.15)',
  },
  cancelBtnText: { color: '#888', fontWeight: '600' },
  emptyCard: {
    backgroundColor: '#E8F0EE',
    padding: 32, borderRadius: 16,
    alignItems: 'center', marginBottom: 16,
    borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.06)',
    borderStyle: 'dashed',
  },
  emptyIcon: { fontSize: 48, marginBottom: 14, opacity: 0.4 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#333' },
  emptyText: { fontSize: 13, color: '#666', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  addManuallyBtn: {
    marginTop: 20, paddingHorizontal: 32, paddingVertical: 12,
    backgroundColor: TEAL_LIGHT, borderRadius: 10,
  },
  addManuallyText: { color: TEAL, fontWeight: '700', fontSize: 13, letterSpacing: 0.5 },
  entryCard: {
    backgroundColor: '#fff',
    borderRadius: 16, padding: 16,
    marginBottom: 12,
    borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.07)',
  },
  entryTopRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10,
  },
  entryDateBadge: {
    backgroundColor: TEAL_LIGHT,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20,
  },
  entryDateText: { color: TEAL, fontSize: 11, fontWeight: '600' },
  hoursBadge: {
    backgroundColor: CORAL_LIGHT,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20,
  },
  hoursText: { color: CORAL, fontSize: 11, fontWeight: '600' },
  entryTitle: { fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 6 },
  entryDesc: { fontSize: 13, color: '#555', lineHeight: 20 },
  entryFooter: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 14,
  },
  statusBadge: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, flexDirection: 'row', alignItems: 'center',
  },
  statusApproved: { backgroundColor: TEAL_LIGHT },
  statusPending: { backgroundColor: CORAL_LIGHT },
  statusRejected: { backgroundColor: '#FCE8E8' },
  statusRevision: { backgroundColor: AMBER_LIGHT },
  statusText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  statusTextApproved: { color: TEAL },
  statusTextPending: { color: CORAL },
  statusTextRejected: { color: '#C62828' },
  statusTextRevision: { color: AMBER },
  viewDetails: {
    fontSize: 13, color: '#333', fontWeight: '600',
    textDecorationLine: 'underline',
  },
  fab: {
    position: 'absolute', bottom: 100, right: 10,
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: CORAL,
    alignItems: 'center', justifyContent: 'center',
    elevation: 4,
  },
  fabIcon: { color: '#fff', fontSize: 28, fontWeight: '300', lineHeight: 32 },
});