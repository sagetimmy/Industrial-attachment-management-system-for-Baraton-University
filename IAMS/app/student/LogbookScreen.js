import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, RefreshControl
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { COLORS } from '../../constants/colors';
import api from '../../api/axios';

export default function LogbookScreen({ navigation }) {
  const [entries, setEntries] = useState([]);
  const [attachment, setAttachment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [document, setDocument] = useState(null);
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
      if (!result.canceled) {
        setDocument(result.assets[0]);
      }
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

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading logbook...</Text>
      </View>
    );
  }

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
        <Text style={styles.title}>My Logbook 📖</Text>
        <Text style={styles.subtitle}>
          {entries.length} entr{entries.length === 1 ? 'y' : 'ies'} submitted
        </Text>
      </View>

      {/* No active attachment warning */}
      {!attachment || attachment.status !== 'ongoing' ? (
        <View style={styles.warningCard}>
          <Text style={styles.warningIcon}>⚠️</Text>
          <Text style={styles.warningTitle}>No Active Attachment</Text>
          <Text style={styles.warningText}>
            You need an active (ongoing) attachment to submit logbook entries.
          </Text>
        </View>
      ) : (
        <>
          {/* Attachment info */}
          <View style={styles.attachCard}>
            <Text style={styles.attachOrg}>{attachment.org_name}</Text>
            <Text style={styles.attachDetails}>
              Week {entries.length + 1} is next • {attachment.supervisor_name || 'No supervisor assigned'}
            </Text>
          </View>

          {/* Submit button */}
          {!showForm ? (
            <TouchableOpacity
              style={styles.newEntryBtn}
              onPress={() => setShowForm(true)}
            >
              <Text style={styles.newEntryBtnText}>+ Submit Week {entries.length + 1} Entry</Text>
            </TouchableOpacity>
          ) : (
            /* Submission Form */
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Week {entries.length + 1} Entry</Text>

              <Text style={styles.label}>Week Number *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 1"
                value={form.week_number}
                onChangeText={(v) => setForm({ ...form, week_number: v })}
                keyboardType="numeric"
              />

              <Text style={styles.label}>What did you do this week? *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe your activities this week..."
                value={form.description}
                onChangeText={(v) => setForm({ ...form, description: v })}
                multiline
                numberOfLines={4}
              />

              <Text style={styles.label}>Tasks Completed</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="List the tasks you completed..."
                value={form.tasks_done}
                onChangeText={(v) => setForm({ ...form, tasks_done: v })}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.label}>Challenges Faced</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Any challenges you encountered..."
                value={form.challenges}
                onChangeText={(v) => setForm({ ...form, challenges: v })}
                multiline
                numberOfLines={3}
              />

              {/* Document Upload */}
              <Text style={styles.label}>Supporting Document (optional)</Text>
              <TouchableOpacity style={styles.uploadBtn} onPress={pickDocument}>
                <Text style={styles.uploadBtnText}>
                  {document ? `📎 ${document.name}` : '📎 Attach Document (PDF/Image)'}
                </Text>
              </TouchableOpacity>
              {document && (
                <TouchableOpacity onPress={() => setDocument(null)}>
                  <Text style={styles.removeDoc}>✕ Remove document</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting
                  ? <ActivityIndicator color={COLORS.white} />
                  : <Text style={styles.submitBtnText}>Submit Entry ✓</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setShowForm(false);
                  setForm({ week_number: '', description: '', tasks_done: '', challenges: '' });
                  setDocument(null);
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      {/* Entries List */}
      <Text style={styles.sectionTitle}>Previous Entries</Text>
      {entries.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>📝</Text>
          <Text style={styles.emptyTitle}>No Entries Yet</Text>
          <Text style={styles.emptyText}>Submit your first weekly logbook entry above.</Text>
        </View>
      ) : (
        entries.map((entry, index) => (
          <View key={index} style={styles.entryCard}>
            <View style={styles.entryHeader}>
              <View style={styles.weekBadge}>
                <Text style={styles.weekNum}>W{entry.week_number}</Text>
              </View>
              <View style={styles.entryMeta}>
                <Text style={styles.entryDate}>
                  {new Date(entry.submitted_at).toLocaleDateString()}
                </Text>
                {entry.document_url && (
                  <Text style={styles.docAttached}>📎 Document attached</Text>
                )}
              </View>
            </View>
            <Text style={styles.entryDesc} numberOfLines={3}>
              {entry.description}
            </Text>
            {entry.tasks_done ? (
              <Text style={styles.entryTasks} numberOfLines={2}>
                ✓ {entry.tasks_done}
              </Text>
            ) : null}
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
  warningCard: {
    backgroundColor: '#FFF3E0',
    margin: 16, padding: 20,
    borderRadius: 16, alignItems: 'center',
    borderLeftWidth: 4, borderLeftColor: COLORS.primary,
  },
  warningIcon: { fontSize: 30, marginBottom: 8 },
  warningTitle: { fontSize: 16, fontWeight: '700', color: COLORS.darkGray },
  warningText: { fontSize: 13, color: COLORS.gray, textAlign: 'center', marginTop: 6 },
  attachCard: {
    backgroundColor: COLORS.secondary,
    margin: 16, padding: 14,
    borderRadius: 16,
  },
  attachOrg: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
  attachDetails: { color: '#8899AA', fontSize: 12, marginTop: 4 },
  newEntryBtn: {
    backgroundColor: COLORS.primary,
    marginHorizontal: 16, marginBottom: 16,
    padding: 15, borderRadius: 14,
    alignItems: 'center',
  },
  newEntryBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 15 },
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
  textArea: { height: 100, textAlignVertical: 'top' },
  uploadBtn: {
    borderWidth: 1.5, borderColor: COLORS.primary,
    borderStyle: 'dashed', borderRadius: 10,
    padding: 14, alignItems: 'center',
    backgroundColor: '#FFF9F5', marginBottom: 8,
  },
  uploadBtnText: { color: COLORS.primary, fontWeight: '600', fontSize: 13 },
  removeDoc: { color: '#C62828', fontSize: 12, marginBottom: 14, textAlign: 'center' },
  submitBtn: {
    backgroundColor: COLORS.primary,
    padding: 14, borderRadius: 12,
    alignItems: 'center', marginTop: 8,
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
    marginLeft: 16, marginTop: 20, marginBottom: 10,
  },
  emptyCard: {
    backgroundColor: COLORS.white,
    margin: 16, padding: 30,
    borderRadius: 16, alignItems: 'center', elevation: 2,
  },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.darkGray },
  emptyText: { fontSize: 13, color: COLORS.gray, textAlign: 'center', marginTop: 6 },
  entryCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16, marginBottom: 10,
    padding: 14, borderRadius: 16, elevation: 2,
  },
  entryHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  weekBadge: {
    backgroundColor: COLORS.primary,
    width: 44, height: 44,
    borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  weekNum: { color: COLORS.white, fontWeight: 'bold', fontSize: 14 },
  entryMeta: { flex: 1 },
  entryDate: { fontSize: 12, color: COLORS.gray },
  docAttached: { fontSize: 11, color: COLORS.primary, marginTop: 2 },
  entryDesc: { fontSize: 13, color: COLORS.darkGray, lineHeight: 20 },
  entryTasks: { fontSize: 12, color: '#2E7D32', marginTop: 6 },
});