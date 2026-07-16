import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/axios';


const C = {
  teal: '#0F6E56',
  tealLight: '#E1F5EE',
  navy: '#0F6E56',
  orange: '#D85A30',
  orangeLight: 'rgba(216, 90, 48, 0.12)',
  bg: '#F7F9FB',
  white: '#FFFFFF',
  text: '#1F2937',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  red: '#C62828',
  redLight: '#FCE8E8',
  pillGreen: '#E1F5EE',
  pillGreenText: '#0F6E56',
  pillAmber: '#FAEEDA',
  pillAmberText: '#92400E',
  pillBlue: '#E3F2FD',
  pillBlueText: '#185FA5',
  pillGray: '#F4F4F4',
  pillGrayText: '#888888',
};

const AUDIENCE_OPTIONS = [
  { value: 'ALL', label: 'Everyone', icon: 'earth', color: C.orange },
  { value: 'STUDENTS', label: 'Students Only', icon: 'school', color: C.teal },
  { value: 'SUPERVISORS', label: 'Supervisors Only', icon: 'briefcase', color: '#8E44AD' },
  { value: 'HOST_ORGS', label: 'Host Orgs Only', icon: 'business', color: '#1E3A5F' },
];

const audienceMeta = {
  ALL: { label: 'Everyone', bg: C.pillAmber, text: C.pillAmberText },
  STUDENTS: { label: 'Students', bg: C.pillGreen, text: C.pillGreenText },
  SUPERVISORS: { label: 'Supervisors', bg: C.pillBlue, text: C.pillBlueText },
  HOST_ORGS: { label: 'Host Orgs', bg: C.pillGray, text: C.pillGrayText },
};

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Compose Modal ────────────────────────────────────────────────────────────
function ComposeModal({ visible, onClose, onSent }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState('ALL');
  const [sending, setSending] = useState(false);

  const reset = () => { setTitle(''); setBody(''); setAudience('ALL'); };

  const handleClose = () => { reset(); onClose(); };

  const handleSend = async () => {
    if (!title.trim()) return Alert.alert('Missing title', 'Please enter a title.');
    if (!body.trim()) return Alert.alert('Missing body', 'Please enter a message.');
    setSending(true);
    try {
      await api.post('/announcements', { title: title.trim(), body: body.trim(), audience });
      reset();
      onSent();
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to send announcement.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView style={styles.modalSafe} edges={['top']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={24} color={C.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Announcement</Text>
            <TouchableOpacity
              onPress={handleSend}
              disabled={sending}
              style={[styles.sendBtn, sending && { opacity: 0.6 }]}
            >
              {sending
                ? <ActivityIndicator size="small" color={C.white} />
                : <Text style={styles.sendBtnText}>Send</Text>
              }
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            {/* Audience picker */}
            <Text style={styles.fieldLabel}>Send to</Text>
            <View style={styles.audienceGrid}>
              {AUDIENCE_OPTIONS.map((opt) => {
                const selected = audience === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setAudience(opt.value)}
                    activeOpacity={0.75}
                    style={[
                      styles.audienceCard,
                      selected && { borderColor: opt.color, backgroundColor: opt.color + '12' },
                    ]}
                  >
                    <Ionicons name={opt.icon} size={20} color={selected ? opt.color : C.textMuted} />
                    <Text style={[styles.audienceLabel, selected && { color: opt.color, fontWeight: '700' }]}>
                      {opt.label}
                    </Text>
                    {selected && (
                      <Ionicons name="checkmark-circle" size={14} color={opt.color} style={styles.audienceCheck} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Title */}
            <Text style={styles.fieldLabel}>Title</Text>
            <TextInput
              style={styles.input}
              placeholder="Announcement title"
              placeholderTextColor={C.textMuted}
              value={title}
              onChangeText={setTitle}
              maxLength={120}
            />

            {/* Body */}
            <Text style={styles.fieldLabel}>Message</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Write your announcement here..."
              placeholderTextColor={C.textMuted}
              value={body}
              onChangeText={setBody}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Announcement Card ────────────────────────────────────────────────────────
function AnnouncementCard({ item, onDelete }) {
  const meta = audienceMeta[item.audience] || audienceMeta.ALL;

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={[styles.audiencePill, { backgroundColor: meta.bg }]}>
          <Text style={[styles.audiencePillText, { color: meta.text }]}>{meta.label}</Text>
        </View>
        <Text style={styles.cardDate}>{formatDate(item.created_at)}</Text>
      </View>

      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.cardBody} numberOfLines={3}>{item.body}</Text>

      <View style={styles.cardFooter}>
        <View style={styles.senderRow}>
          <Ionicons name="person-circle-outline" size={14} color={C.textMuted} />
          <Text style={styles.senderText}>
            {item.sender?.full_name || 'Admin'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => onDelete(item)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Delete announcement"
        >
          <Ionicons name="trash-outline" size={16} color={C.red} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AdminAnnouncementsScreen({ navigation }) {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [composeVisible, setComposeVisible] = useState(false);
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'STUDENTS' | 'SUPERVISORS' | 'HOST_ORGS'

  const fetch = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get('/announcements');
      setAnnouncements(res.data.announcements || []);
    } catch (err) {
      console.error('Fetch announcements:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetch(); }, [fetch]));

  const handleRefresh = () => { setRefreshing(true); fetch(true); };

  const handleDelete = (item) => {
    Alert.alert(
      'Delete Announcement',
      `Delete "${item.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/announcements/${item.id}`);
              setAnnouncements((prev) => prev.filter((a) => a.id !== item.id));
            } catch (err) {
              Alert.alert('Error', err?.response?.data?.error || 'Failed to delete.');
            }
          },
        },
      ]
    );
  };

  const filtered = filter === 'ALL'
    ? announcements
    : announcements.filter((a) => a.audience === filter);

  const tabs = [
    { key: 'ALL', label: 'All' },
    { key: 'STUDENTS', label: 'Students' },
    { key: 'SUPERVISORS', label: 'Supervisors' },
    { key: 'HOST_ORGS', label: 'Host Orgs' },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.white} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Announcements</Text>
          <Text style={styles.headerSub}>{announcements.length} total</Text>
        </View>
        <TouchableOpacity
          onPress={() => setComposeVisible(true)}
          style={styles.headerAddBtn}
          accessibilityLabel="Compose announcement"
        >
          <Ionicons name="add" size={22} color={C.white} />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContent}>
          {tabs.map((t) => (
            <TouchableOpacity
              key={t.key}
              onPress={() => setFilter(t.key)}
              style={[styles.tab, filter === t.key && styles.tabActive]}
            >
              <Text style={[styles.tabText, filter === t.key && styles.tabTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.teal} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <MaterialCommunityIcons name="bullhorn-outline" size={48} color={C.border} />
          <Text style={styles.emptyTitle}>No announcements yet</Text>
          <Text style={styles.emptyBody}>Tap + to send one to your users.</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <AnnouncementCard item={item} onDelete={handleDelete} />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.teal} />
          }
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setComposeVisible(true)}
        activeOpacity={0.85}
        accessibilityLabel="Compose announcement"
      >
        <Ionicons name="megaphone-outline" size={22} color={C.white} />
      </TouchableOpacity>

      {/* Compose Modal */}
      <ComposeModal
        visible={composeVisible}
        onClose={() => setComposeVisible(false)}
        onSent={() => {
          setComposeVisible(false);
          fetch();
        }}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.navy },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: C.navy,
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: C.white },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 1 },
  headerAddBtn: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },

  tabsRow: { backgroundColor: C.navy, paddingBottom: 12 },
  tabsContent: { paddingHorizontal: 16, gap: 8 },
  tab: {
    paddingHorizontal: 16, paddingVertical: 7,
    borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)',
  },
  tabActive: { backgroundColor: C.orange },
  tabText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
  tabTextActive: { color: C.white },

  listContent: { padding: 16, paddingBottom: 100 },

  card: {
    backgroundColor: C.white,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  audiencePill: {
    paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 20,
  },
  audiencePillText: { fontSize: 11, fontWeight: '700' },
  cardDate: { fontSize: 11, color: C.textMuted },
  cardTitle: { fontSize: 15, fontWeight: '800', color: C.text, marginBottom: 6 },
  cardBody: { fontSize: 13, color: C.textMuted, lineHeight: 19, marginBottom: 10 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: C.border, paddingTop: 10 },
  senderRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  senderText: { fontSize: 12, color: C.textMuted },

  fab: {
    position: 'absolute', bottom: 28, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: C.orange,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.orange, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 6,
  },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.bg },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: C.text },
  emptyBody: { fontSize: 13, color: C.textMuted },

  // Modal
  modalSafe: { flex: 1, backgroundColor: C.white },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.border,
    gap: 12,
  },
  modalTitle: { flex: 1, fontSize: 17, fontWeight: '800', color: C.text },
  sendBtn: {
    backgroundColor: C.teal, paddingHorizontal: 18, paddingVertical: 8,
    borderRadius: 20, minWidth: 60, alignItems: 'center',
  },
  sendBtnText: { color: C.white, fontSize: 14, fontWeight: '700' },
  modalBody: { padding: 20, gap: 6, paddingBottom: 40 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 12, marginBottom: 4 },
  audienceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  audienceCard: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 10, borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.bg,
  },
  audienceLabel: { fontSize: 13, fontWeight: '600', color: C.textMuted },
  audienceCheck: { marginLeft: 2 },
  input: {
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: C.text,
  },
  textArea: { height: 140, paddingTop: 12 },
});