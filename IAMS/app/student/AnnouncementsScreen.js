// app/student/AnnouncementsScreen.js
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/axios';

const C = {
  teal: '#1B7A65',
  tealLight: '#E8F5F1',
  tealBorder: '#A8D5C8',
  navy: '#0F2419',
  orange: '#E8711A',
  orangeLight: '#FEF3EB',
  bg: '#EEF2F0',
  white: '#FFFFFF',
  text: '#1A2E25',
  textMuted: '#6B8F7E',
  border: '#D4E4DE',
  unreadDot: '#E8711A',
};

const audienceMeta = {
  ALL: { label: 'General', icon: 'earth', color: '#E8711A' },
  STUDENTS: { label: 'Students', icon: 'school', color: '#1B7A65' },
  SUPERVISORS: { label: 'Supervisors', icon: 'briefcase', color: '#6B4FBB' },
  HOST_ORGS: { label: 'Host Org', icon: 'business', color: '#2A7BB5' },
};

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
}

function AnnouncementCard({ item, onRead }) {
  const [expanded, setExpanded] = useState(false);
  const meta = audienceMeta[item.audience] || audienceMeta.ALL;

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
        {/* Icon */}
        <View style={[styles.iconWrap, { backgroundColor: meta.color + '18' }]}>
          <Ionicons name={meta.icon} size={18} color={meta.color} />
        </View>

        <View style={styles.cardMain}>
          <View style={styles.cardTopRow}>
            <Text style={styles.cardTitle} numberOfLines={expanded ? undefined : 1}>
              {item.title}
            </Text>
            {!item.is_read && <View style={styles.unreadDot} />}
          </View>
          <Text style={[styles.cardBody, expanded && styles.cardBodyExpanded]} numberOfLines={expanded ? undefined : 2}>
            {item.body}
          </Text>
          <View style={styles.cardMeta}>
            <Text style={styles.metaText}>{item.sender?.full_name || 'Admin'}</Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.metaText}>{formatDate(item.created_at)}</Text>
          </View>
        </View>

        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={C.textMuted}
          style={styles.chevron}
        />
      </View>
    </TouchableOpacity>
  );
}

export default function StudentAnnouncementsScreen({ navigation }) {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
    // optimistic update
    setAnnouncements((prev) =>
      prev.map((a) => (a.id === id ? { ...a, is_read: true } : a))
    );
    try {
      await api.patch(`/announcements/${id}/read`);
    } catch (_) {}
  };

  const handleRefresh = () => { setRefreshing(true); fetch(true); };

  const unreadCount = announcements.filter((a) => !a.is_read).length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.white} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Announcements</Text>
          {unreadCount > 0 && (
            <Text style={styles.headerSub}>{unreadCount} unread</Text>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.teal} />
        </View>
      ) : announcements.length === 0 ? (
        <View style={styles.center}>
          <MaterialCommunityIcons name="bullhorn-outline" size={48} color={C.border} />
          <Text style={styles.emptyTitle}>No announcements</Text>
          <Text style={styles.emptyBody}>Check back later for updates from your institution.</Text>
        </View>
      ) : (
        <FlatList
          data={announcements}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <AnnouncementCard item={item} onRead={handleRead} />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.teal} />
          }
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}
    </SafeAreaView>
  );
}

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
  headerSub: { fontSize: 12, color: C.orange, marginTop: 1 },

  listContent: { padding: 16, paddingBottom: 40, backgroundColor: C.bg },

  card: {
    backgroundColor: C.white,
    borderRadius: 14,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardUnread: {
    borderLeftColor: C.orange,
    backgroundColor: '#FFFDFB',
  },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  iconWrap: {
    width: 36, height: 36, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, marginTop: 1,
  },
  cardMain: { flex: 1 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  cardTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: C.text },
  unreadDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: C.unreadDot, flexShrink: 0,
  },
  cardBody: { fontSize: 13, color: C.textMuted, lineHeight: 19 },
  cardBodyExpanded: { marginBottom: 4 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  metaText: { fontSize: 11, color: C.textMuted },
  metaDot: { fontSize: 11, color: C.textMuted },
  chevron: { marginTop: 2, flexShrink: 0 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.bg },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: C.text },
  emptyBody: { fontSize: 13, color: C.textMuted, textAlign: 'center', paddingHorizontal: 40 },
});