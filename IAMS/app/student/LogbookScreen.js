import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, RefreshControl,
  FlatList,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { COLORS } from '../../constants/colors';
import api from '../../api/axios';

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

export default function LogbookScreen({ navigation }) {
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
  });

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

  const handleSubmit = async () => {
    if (!form.week_number || !form.description) {
      Alert.alert('Error', 'Week number and description are required');
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('week_number', form.week_number);
      formData.append('description', form.description);
      formData.append('tasks_done', form.tasks_done);
      formData.append('challenges', form.challenges);
      if (document) {
        formData.append('document', {
          uri: document.uri,
          name: document.name,
          type: document.mimeType || 'application/octet-stream',
        });
      }
      await api.post('/students/logbook', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      Alert.alert('Success! 🎉', 'Logbook entry submitted successfully!');
      setForm({ week_number: '', description: '', tasks_done: '', challenges: '' });
      setDocument(null);
      setShowForm(false);
      fetchData();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to submit entry');
    } finally {
      setSubmitting(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  // Get unique weeks for the date strip
  const weekDates = entries.map((e) => ({
    week_number: e.week_number,
    submitted_at: e.submitted_at,
  }));

  // Entries filtered by selected week
  const filteredEntries = selectedWeek
    ? entries.filter((e) => e.week_number === selectedWeek)
    : entries;

  if (loading) {
    return (
      <View style={s.loadingContainer}>
        <ActivityIndicator size="large" color={TEAL} />
        <Text style={s.loadingText}>Loading logbook...</Text>
      </View>
    );
  }

  return (
    <View style={s.root}>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.menuIcon}>☰</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Logbook</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          <Text style={s.profileIcon}>👤</Text>
        </TouchableOpacity>
      </View>

      {/* Week strip */}
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

        {/* No active attachment */}
        {!attachment || attachment.status !== 'ongoing' ? (
          <View style={s.warningCard}>
            <Text style={s.warningIcon}>⚠️</Text>
            <Text style={s.warningTitle}>No Active Attachment</Text>
            <Text style={s.warningText}>
              You need an active (ongoing) attachment to submit logbook entries.
            </Text>
          </View>
        ) : (
          <>
            {/* Attachment info */}
            <View style={s.attachCard}>
              <Text style={s.attachOrg}>{attachment.org_name}</Text>
              <Text style={s.attachDetails}>
                Week {entries.length + 1} is next · {attachment.supervisor_name || 'No supervisor assigned'}
              </Text>
            </View>

            {/* New entry button */}
            {!showForm && (
              <TouchableOpacity style={s.newEntryBtn} onPress={() => setShowForm(true)}>
                <Text style={s.newEntryBtnText}>+ Submit Week {entries.length + 1} Entry</Text>
              </TouchableOpacity>
            )}

            {/* Form */}
            {showForm && (
              <View style={s.formCard}>
                <Text style={s.formTitle}>Week {entries.length + 1} Entry</Text>

                <Text style={s.label}>Week Number *</Text>
                <TextInput
                  style={s.input}
                  placeholder="e.g. 1"
                  value={form.week_number}
                  onChangeText={(v) => setForm({ ...form, week_number: v })}
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
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={s.submitBtnText}>Submit Entry ✓</Text>
                  }
                </TouchableOpacity>

                <TouchableOpacity
                  style={s.cancelBtn}
                  onPress={() => {
                    setShowForm(false);
                    setForm({ week_number: '', description: '', tasks_done: '', challenges: '' });
                    setDocument(null);
                  }}
                >
                  <Text style={s.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {/* Entries list */}
        {filteredEntries.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={s.emptyIcon}>📝</Text>
            <Text style={s.emptyTitle}>End of Entries</Text>
            <Text style={s.emptyText}>
              You have logged all activities for this week. Tap the button below to add a new session.
            </Text>
            {attachment?.status === 'ongoing' && (
              <TouchableOpacity style={s.addManuallyBtn} onPress={() => setShowForm(true)}>
                <Text style={s.addManuallyText}>ADD MANUALLY</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredEntries.map((entry, index) => (
            <View key={index} style={s.entryCard}>
              {/* Entry top row */}
              <View style={s.entryTopRow}>
                <View style={s.entryDateBadge}>
                  <Text style={s.entryDateText}>
                    {new Date(entry.submitted_at).toLocaleDateString('en-GB', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    }).toUpperCase()}
                  </Text>
                </View>
                {entry.tasks_done ? (
                  <View style={s.hoursBadge}>
                    <Text style={s.hoursText}>
                      {entry.tasks_done.split('\n').length}.0 HOURS
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Title */}
              <Text style={s.entryTitle}>
                Week {entry.week_number} — {attachment?.org_name ?? 'Logbook Entry'}
              </Text>

              {/* Description */}
              <Text style={s.entryDesc} numberOfLines={3}>{entry.description}</Text>

              {/* Status + View Details */}
              <View style={s.entryFooter}>
                <View style={[
                  s.statusBadge,
                  entry.status === 'approved' ? s.statusApproved
                  : entry.status === 'rejected' ? s.statusRejected
                  : s.statusPending,
                ]}>
                  <Text style={[
                    s.statusText,
                    entry.status === 'approved' ? s.statusTextApproved
                    : entry.status === 'rejected' ? s.statusTextRejected
                    : s.statusTextPending,
                  ]}>
                    {entry.status === 'approved' ? '✓ APPROVED'
                      : entry.status === 'rejected' ? '✕ REJECTED'
                      : '⏳ PENDING'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => navigation.navigate('LogbookDetail', { entry })}
                >
                  <Text style={s.viewDetails}>View Details</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB */}
      {attachment?.status === 'ongoing' && !showForm && (
        <TouchableOpacity style={s.fab} onPress={() => setShowForm(true)}>
          <Text style={s.fabIcon}>+</Text>
        </TouchableOpacity>
      )}

      {/* Bottom nav */}
      <View style={s.bottomNav}>
        {[
          { label: 'Home', icon: '🏠', screen: 'StudentDashboard' },
          { label: 'Logbook', icon: '📖', screen: null },
          { label: 'Stats', icon: '📊', screen: 'Stats' },
          { label: 'Profile', icon: '👤', screen: 'Profile' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.label}
            style={s.navTab}
            onPress={() => tab.screen && navigation.navigate(tab.screen)}
          >
            <Text style={s.navIcon}>{tab.icon}</Text>
            <Text style={[s.navLabel, !tab.screen && { color: TEAL, fontWeight: '600' }]}>
              {tab.label}
            </Text>
            {!tab.screen && <View style={s.navActiveDot} />}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F0F4F3' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#888' },

  // header
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 52, paddingBottom: 14,
    backgroundColor: '#F0F4F3',
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  menuIcon: { fontSize: 22, color: '#333' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#111' },
  profileIcon: { fontSize: 22 },

  // week strip
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

  // warning
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

  // attach card
  attachCard: {
    backgroundColor: TEAL,
    padding: 14, borderRadius: 14, marginBottom: 12,
  },
  attachOrg: { color: '#fff', fontSize: 14, fontWeight: '700' },
  attachDetails: { color: '#9FE1CB', fontSize: 12, marginTop: 3 },

  // new entry button
  newEntryBtn: {
    backgroundColor: TEAL,
    padding: 14, borderRadius: 14,
    alignItems: 'center', marginBottom: 16,
  },
  newEntryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // form
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

  // empty
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

  // entry card
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
  statusText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  statusTextApproved: { color: TEAL },
  statusTextPending: { color: CORAL },
  statusTextRejected: { color: '#C62828' },
  viewDetails: {
    fontSize: 13, color: '#333', fontWeight: '600',
    textDecorationLine: 'underline',
  },

  // FAB
  fab: {
    position: 'absolute', bottom: 90, right: 20,
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: CORAL,
    alignItems: 'center', justifyContent: 'center',
    elevation: 4,
  },
  fabIcon: { color: '#fff', fontSize: 28, fontWeight: '300', lineHeight: 32 },

  // bottom nav
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 0.5, borderTopColor: 'rgba(0,0,0,0.08)',
    paddingTop: 10, paddingBottom: 24,
  },
  navTab: { flex: 1, alignItems: 'center', gap: 3 },
  navIcon: { fontSize: 22 },
  navLabel: { fontSize: 10, color: '#888', letterSpacing: 0.3 },
  navActiveDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: TEAL },
});