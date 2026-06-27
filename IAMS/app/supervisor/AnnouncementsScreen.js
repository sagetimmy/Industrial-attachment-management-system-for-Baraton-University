// app/supervisor/AnnouncementsScreen.js
// Supervisors can view announcements addressed to them + send announcements to their students.
import React, { useState, useCallback } from 'react';
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
  teal: '#1B7A65',
  tealLight: '#E8F5F1',
  navy: '#0F2419',
  orange: '#E8711A',
  bg: '#EEF2F0',
  white: '#FFFFFF',
  text: '#1A2E25',
  textMuted: '#6B8F7E',
  border: '#D4E4DE',
  red: '#D94040',
};

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
}

// ─── Compose Modal ────────────────────────────────────────────────────────────
function ComposeModal({ visible, onClose, onSent }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const reset = () => { setTitle(''); setBody(''); };
  const handleClose = () => { reset(); onClose(); };

  const handleSend = async () => {
    if (!title.trim()) return Alert.alert('Missing title', 'Please enter a title.');
    if (!body.trim()) return Alert.alert('Missing body', 'Please enter a message.');
    setSending(true);
    try {
      // audience is locked to STUDENTS server-side for supervisors
      await api.post('/announcements', { title: title.trim(), body: body.trim() });
      reset();
      onSent();
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to send.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView style={styles.modalSafe} edges={['top']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={24} color={C.text} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>Message Your Students</Text>
              <Text style={styles.modalSub}>Sent to your assigned students only</Text>
            </View>
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
            {/* Audience notice */}
            <View style={styles.scopeNotice}>
              <Ionicons name="people" size={16} color={C.teal} />
              <Text style={styles.scopeText}>
                This message will only be visible to students assigned to you.
              </Text>
            </View>

            <Text style={styles.fieldLabel}>Title</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Logbook Submission Reminder"
              placeholderTextColor={C.textMuted}
              value={title}
              onChangeText={setTitle}
              maxLength={120}
            />
            <Text style={styles.fieldLabel}>Message</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Write your message here..."
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

// ─── Card ─────────────────────────────────────────────────────────────────────
function AnnouncementCard({ item, onRead, onDelete, isMine }) {
  const [expanded, setExpanded] = useState(false);

  const handlePress = () => {
    setExpanded((v) => !v);
    if (!item.is_read) onRead(item.id);
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.85}
      style={[styles.card, !item.is_read && styles.cardUnread]}
    >
      <View style={styles.cardRow}>
        <View style={styles.iconWrap}>
          <Ionicons
            name={isMine ? 'megaphone' : 'notifications'}
            size={18}
            color={isMine ? C.orange : C.teal}
          />
        </View>

        <View style={styles.cardMain}>
          <View style={styles.cardTopRow}>
            <Text style={styles.cardTitle} numberOfLines={expanded ? undefined : 1}>{item.title}</Text>
            {!item.is_read && <View style={styles.unreadDot} />}
          </View>
          {isMine && <Text style={styles.sentByYouLabel}>Sent by you</Text>}
          <Text style={styles.cardBody} numberOfLines={expanded ? undefined : 2}>{item.body}</Text>
          <View style={styles.cardMeta}>
            <Text style={styles.metaText}>{formatDate(item.created_at)}</Text>
            {isMine && (
              <TouchableOpacity
                onPress={() => onDelete(item)}
                style={styles.deleteBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="trash-outline" size={14} color={C.red} />
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={C.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function SupervisorAnnouncementsScreen({ navigation }) {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [composeVisible, setComposeVisible] = useState(false);
  const [tab, setTab] = useState('all'); // 'all' | 'mine'

  // We use the auth context to know our own user_id for isMine check
  // If you have useAuth(), use it; otherwise compare sent_by_role === 'supervisor' and sent_by === self
  // For simplicity we track mine by sent_by_role === 'supervisor' AND from the list returned
  const userId = null; // replace with useAuth().user?.user_id if available

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

  const handleRead = async (id) => {
    setAnnouncements((prev) => prev.map((a) => a.id === id ? { ...a, is_read: true } : a));
    try { await api.patch(`/announcements/${id}/read`); } catch (_) {}
  };

  const handleDelete = (item) => {
    Alert.alert('Delete Announcement', `Delete "${item.title}"?`, [
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
    ]);
  };

  const handleRefresh = () => { setRefreshing(true); fetch(true); };

  const mine = announcements.filter((a) => a.sent_by_role === 'supervisor');
  const displayed = tab === 'mine' ? mine : announcements;
  const unreadCount = announcements.filter((a) => !a.is_read).length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.white} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Announcements</Text>
          {unreadCount > 0 && <Text style={styles.headerSub}>{unreadCount} unread</Text>}
        </View>
        <TouchableOpacity
          onPress={() => setComposeVisible(true)}
          style={styles.headerAddBtn}
          accessibilityLabel="Compose announcement"
        >
          <Ionicons name="add" size={22} color={C.white} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {[{ key: 'all', label: 'All' }, { key: 'mine', label: 'Sent by Me' }].map((t) => (
          <TouchableOpacity
            key={t.key}
            onPress={() => setTab(t.key)}
            style={[styles.tab, tab === t.key && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.teal} />
        </View>
      ) : displayed.length === 0 ? (
        <View style={styles.center}>
          <MaterialCommunityIcons name="bullhorn-outline" size={48} color={C.border} />
          <Text style={styles.emptyTitle}>{tab === 'mine' ? "You haven't sent anything" : 'No announcements'}</Text>
          <Text style={styles.emptyBody}>
            {tab === 'mine' ? 'Tap + to message your students.' : 'Check back later for updates.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <AnnouncementCard
              item={item}
              onRead={handleRead}
              onDelete={handleDelete}
              isMine={item.sent_by_role === 'supervisor' && item.scope_supervisor_id !== null}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.teal} />}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setComposeVisible(true)}
        activeOpacity={0.85}
        accessibilityLabel="Compose announcement"
      >
        <Ionicons name="megaphone-outline" size={22} color={C.white} />
      </TouchableOpacity>

      <ComposeModal
        visible={composeVisible}
        onClose={() => setComposeVisible(false)}
        onSent={() => { setComposeVisible(false); fetch(); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.navy },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: C.navy, gap: 12,
  },
  backBtn: { padding: 4 },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: C.white },
  headerSub: { fontSize: 12, color: C.orange, marginTop: 1 },
  headerAddBtn: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },

  tabsRow: {
    flexDirection: 'row', backgroundColor: C.navy,
    paddingHorizontal: 16, paddingBottom: 12, gap: 8,
  },
  tab: {
    paddingHorizontal: 18, paddingVertical: 7,
    borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)',
  },
  tabActive: { backgroundColor: C.teal },
  tabText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
  tabTextActive: { color: C.white },

  listContent: { padding: 16, paddingBottom: 100, backgroundColor: C.bg },

  card: {
    backgroundColor: C.white, borderRadius: 14, padding: 14,
    borderLeftWidth: 3, borderLeftColor: 'transparent',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  cardUnread: { borderLeftColor: C.orange, backgroundColor: '#FFFDFB' },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  iconWrap: {
    width: 36, height: 36, borderRadius: 9,
    backgroundColor: C.tealLight,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  cardMain: { flex: 1 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  cardTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: C.text },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.orange },
  sentByYouLabel: { fontSize: 11, color: C.orange, fontWeight: '600', marginBottom: 3 },
  cardBody: { fontSize: 13, color: C.textMuted, lineHeight: 19 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  metaText: { fontSize: 11, color: C.textMuted },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  deleteText: { fontSize: 11, color: C.red, fontWeight: '600' },

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
  emptyBody: { fontSize: 13, color: C.textMuted, textAlign: 'center', paddingHorizontal: 40 },

  modalSafe: { flex: 1, backgroundColor: C.white },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.border, gap: 12,
  },
  modalTitle: { fontSize: 16, fontWeight: '800', color: C.text },
  modalSub: { fontSize: 11, color: C.textMuted, marginTop: 1 },
  sendBtn: {
    backgroundColor: C.teal, paddingHorizontal: 18, paddingVertical: 8,
    borderRadius: 20, minWidth: 60, alignItems: 'center',
  },
  sendBtnText: { color: C.white, fontSize: 14, fontWeight: '700' },
  modalBody: { padding: 20, gap: 6, paddingBottom: 40 },
  scopeNotice: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: C.tealLight, borderRadius: 10,
    padding: 12, marginBottom: 8,
  },
  scopeText: { flex: 1, fontSize: 13, color: C.teal, lineHeight: 18 },
  fieldLabel: {
    fontSize: 12, fontWeight: '700', color: C.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 12, marginBottom: 4,
  },
  input: {
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: C.text,
  },
  textArea: { height: 140, paddingTop: 12 },
});