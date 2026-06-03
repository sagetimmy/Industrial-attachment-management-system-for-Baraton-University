import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, RefreshControl
} from 'react-native';
import { COLORS } from '../../constants/colors';
import api from '../../api/axios';
import Spinner from '../../components/Spinner';

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch (err) {
      Alert.alert('Error', 'Failed to load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchNotifications(); }, []);

  const handleMarkRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => n.notif_id === id ? { ...n, is_read: true } : n)
      );
    } catch (err) {
      console.error('Failed to mark as read');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      Alert.alert('Error', 'Failed to mark all as read');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.notif_id !== id));
    } catch (err) {
      Alert.alert('Error', 'Failed to delete notification');
    }
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to clear all notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete('/notifications/clear-all');
              setNotifications([]);
            } catch (err) {
              Alert.alert('Error', 'Failed to clear notifications');
            }
          }
        }
      ]
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const getNotifIcon = (message) => {
    if (message.includes('🎉') || message.includes('confirmed')) return '🎉';
    if (message.includes('❌') || message.includes('rejected')) return '❌';
    if (message.includes('👨‍🏫') || message.includes('supervisor')) return '👨‍🏫';
    if (message.includes('📋') || message.includes('logbook')) return '📖';
    if (message.includes('⭐') || message.includes('evaluation')) return '⭐';
    if (message.includes('🗓') || message.includes('visit')) return '🗓️';
    if (message.includes('✅') || message.includes('approved')) return '✅';
    if (message.includes('⚠️')) return '⚠️';
    return '🔔';
  };

  const getTimeAgo = (dateStr) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Spinner size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Notifications 🔔</Text>
            <Text style={styles.subtitle}>
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
            </Text>
          </View>
          {notifications.length > 0 && (
            <View style={styles.headerActions}>
              {unreadCount > 0 && (
                <TouchableOpacity
                  style={styles.markAllBtn}
                  onPress={handleMarkAllRead}
                >
                  <Text style={styles.markAllText}>Mark all read</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={handleClearAll}
              >
                <Text style={styles.clearText}>Clear all</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyTitle}>No Notifications</Text>
            <Text style={styles.emptyText}>
              You're all caught up! Notifications will appear here.
            </Text>
          </View>
        ) : (
          <>
            {/* Unread */}
            {notifications.filter(n => !n.is_read).length > 0 && (
              <Text style={styles.sectionLabel}>NEW</Text>
            )}
            {notifications
              .filter(n => !n.is_read)
              .map((notif, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.notifCard, styles.notifUnread]}
                  onPress={() => handleMarkRead(notif.notif_id)}
                >
                  <View style={styles.notifIcon}>
                    <Text style={styles.notifIconText}>
                      {getNotifIcon(notif.message)}
                    </Text>
                  </View>
                  <View style={styles.notifContent}>
                    <Text style={styles.notifMessage}>{notif.message}</Text>
                    <Text style={styles.notifTime}>
                      {getTimeAgo(notif.created_at)}
                    </Text>
                  </View>
                  <View style={styles.unreadDot} />
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDelete(notif.notif_id)}
                  >
                    <Text style={styles.deleteText}>✕</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))
            }

            {/* Read */}
            {notifications.filter(n => n.is_read).length > 0 && (
              <Text style={styles.sectionLabel}>EARLIER</Text>
            )}
            {notifications
              .filter(n => n.is_read)
              .map((notif, index) => (
                <View key={index} style={styles.notifCard}>
                  <View style={[styles.notifIcon, styles.notifIconRead]}>
                    <Text style={styles.notifIconText}>
                      {getNotifIcon(notif.message)}
                    </Text>
                  </View>
                  <View style={styles.notifContent}>
                    <Text style={[styles.notifMessage, styles.notifMessageRead]}>
                      {notif.message}
                    </Text>
                    <Text style={styles.notifTime}>
                      {getTimeAgo(notif.created_at)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDelete(notif.notif_id)}
                  >
                    <Text style={styles.deleteText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))
            }
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: { color: COLORS.white, fontSize: 24, fontWeight: 'bold' },
  subtitle: { color: '#8899AA', fontSize: 13, marginTop: 4 },
  headerActions: { alignItems: 'flex-end', gap: 6 },
  markAllBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20,
  },
  markAllText: { color: COLORS.white, fontSize: 12, fontWeight: '600' },
  clearBtn: {
    backgroundColor: 'rgba(200,121,65,0.3)',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20,
  },
  clearText: { color: COLORS.primary, fontSize: 12, fontWeight: '600' },
  sectionLabel: {
    fontSize: 11, fontWeight: '700',
    color: COLORS.gray, letterSpacing: 1,
    marginLeft: 16, marginTop: 16, marginBottom: 8,
  },
  emptyCard: {
    backgroundColor: COLORS.white,
    margin: 16, padding: 40,
    borderRadius: 16, alignItems: 'center', elevation: 2,
    marginTop: 40,
  },
  emptyIcon: { fontSize: 50, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.darkGray },
  emptyText: {
    fontSize: 14, color: COLORS.gray,
    textAlign: 'center', marginTop: 8, lineHeight: 20,
  },
  notifCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16, marginBottom: 8,
    padding: 14, borderRadius: 16,
    flexDirection: 'row', alignItems: 'center',
    elevation: 1,
  },
  notifUnread: {
    backgroundColor: '#FFF9F5',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    elevation: 3,
  },
  notifIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  notifIconRead: { backgroundColor: '#F4F4F4' },
  notifIconText: { fontSize: 20 },
  notifContent: { flex: 1 },
  notifMessage: {
    fontSize: 13, color: COLORS.darkGray,
    lineHeight: 19, fontWeight: '600',
  },
  notifMessageRead: { fontWeight: '400', color: COLORS.gray },
  notifTime: { fontSize: 11, color: COLORS.gray, marginTop: 4 },
  unreadDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginRight: 8,
  },
  deleteBtn: {
    padding: 6,
  },
  deleteText: { color: COLORS.gray, fontSize: 14, fontWeight: '600' },
});