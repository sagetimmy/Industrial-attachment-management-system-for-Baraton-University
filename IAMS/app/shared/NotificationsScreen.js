import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../../api/axios';
import Spinner from '../../components/Spinner';

// Modern Teal Theme Colors
const PRIMARY = '#1b4332';
const PRIMARY_LIGHT = '#99f3e0';
const SECONDARY = '#ffb690';
const BG = '#F8FAFB';
const SURFACE = '#FFFFFF';
const TEXT = '#1A1A2E';
const TEXT_SUB = '#5A6A7A';
const OUTLINE = '#dfe3e1';
const ERROR = '#C62828';

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('All');
  const [expandedId, setExpandedId] = useState(null);

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

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.notif_id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark as read');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      Alert.alert('Error', 'Failed to mark all as read');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n.notif_id !== id));
      if (expandedId === id) setExpandedId(null);
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
              setExpandedId(null);
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
    const msg = message.toLowerCase();
    if (msg.includes('deadline') || msg.includes('due') || msg.includes('schedule')) {
      return { name: 'clock-outline', color: '#f97316', bg: '#fff7ed' };
    }
    if (msg.includes('approved') || msg.includes('confirmed') || msg.includes('success')) {
      return { name: 'check-circle-outline', color: PRIMARY, bg: PRIMARY_LIGHT };
    }
    if (msg.includes('rejected') || msg.includes('error') || msg.includes('failed')) {
      return { name: 'close-circle-outline', color: ERROR, bg: '#fee2e2' };
    }
    if (msg.includes('update') || msg.includes('feature') || msg.includes('new')) {
      return { name: 'auto-fix', color: '#7c3aed', bg: '#f5f3ff' };
    }
    return { name: 'bell-outline', color: '#64748b', bg: '#f1f5f9' };
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

  const getFullTimestamp = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const isToday = (dateStr) => {
    const today = new Date();
    const date = new Date(dateStr);
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isYesterday = (dateStr) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const date = new Date(dateStr);
    return (
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear()
    );
  };

  const filteredNotifications = useMemo(() => {
    let list = notifications;
    if (filter === 'Alerts') {
      list = notifications.filter(n => 
        n.message.toLowerCase().includes('deadline') || 
        n.message.toLowerCase().includes('due') ||
        n.message.toLowerCase().includes('warning') ||
        n.message.toLowerCase().includes('urgent')
      );
    }
    return list;
  }, [notifications, filter]);

  const groupedNotifications = useMemo(() => {
    const groups = {
      Today: [],
      Yesterday: [],
      Earlier: [],
    };

    filteredNotifications.forEach((notif) => {
      if (isToday(notif.created_at)) {
        groups.Today.push(notif);
      } else if (isYesterday(notif.created_at)) {
        groups.Yesterday.push(notif);
      } else {
        groups.Earlier.push(notif);
      }
    });

    return groups;
  }, [filteredNotifications]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Spinner size="large" color={PRIMARY} />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    );
  }

  const renderNotifCard = (notif) => {
    const iconConfig = getNotifIcon(notif.message);
    const unread = !notif.is_read;
    const expanded = expandedId === notif.notif_id;

    const handleCardPress = () => {
      if (unread) handleMarkRead(notif.notif_id);
      setExpandedId(expanded ? null : notif.notif_id);
    };

    return (
      <View key={notif.notif_id} style={styles.cardWrapper}>
        <TouchableOpacity
          style={styles.notifCard}
          onPress={handleCardPress}
          activeOpacity={0.7}
        >
          {unread && <View style={styles.unreadDot} />}
          <View style={styles.cardContent}>
            <View style={[styles.iconContainer, { backgroundColor: iconConfig.bg }]}>
              <MaterialCommunityIcons name={iconConfig.name} size={24} color={iconConfig.color} />
            </View>
            <View style={styles.textContainer}>
              <View style={styles.cardHeader}>
                <Text style={styles.notifTitle} numberOfLines={1}>
                  {notif.message.split('.')[0]}
                </Text>
                <Text style={styles.notifTime}>{getTimeAgo(notif.created_at)}</Text>
              </View>

              <Text
                style={styles.notifMessage}
                numberOfLines={expanded ? undefined : 3}
              >
                {notif.message}
              </Text>

              {expanded && (
                <View style={styles.expandedMeta}>
                  <MaterialCommunityIcons name="clock-outline" size={13} color={TEXT_SUB} />
                  <Text style={styles.expandedMetaText}>
                    {getFullTimestamp(notif.created_at)}
                  </Text>
                </View>
              )}

              {notif.message.toLowerCase().includes('logbook') && (
                <TouchableOpacity style={styles.actionLink}>
                  <Text style={styles.actionText}>VIEW LOGBOOK</Text>
                  <MaterialCommunityIcons name="chevron-right" size={16} color={PRIMARY} />
                </TouchableOpacity>
              )}
            </View>

            <MaterialCommunityIcons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={TEXT_SUB}
              style={styles.expandChevron}
            />
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => handleDelete(notif.notif_id)}
        >
          <MaterialCommunityIcons name="close" size={18} color={TEXT_SUB} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleMarkAllRead} style={styles.headerAction}>
            <Text style={styles.headerActionText}>MARK ALL READ</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleClearAll} style={styles.headerAction}>
            <Text style={[styles.headerActionText, { color: ERROR }]}>CLEAR ALL</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'All' && styles.filterTabActive]}
            onPress={() => setFilter('All')}
          >
            <Text style={[styles.filterTabText, filter === 'All' && styles.filterTabTextActive]}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'Alerts' && styles.filterTabActive]}
            onPress={() => setFilter('Alerts')}
          >
            <Text style={[styles.filterTabText, filter === 'Alerts' && styles.filterTabTextActive]}>Alerts</Text>
          </TouchableOpacity>
        </View>

        {notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <MaterialCommunityIcons name="bell-off-outline" size={60} color={OUTLINE} />
            </View>
            <Text style={styles.emptyText}>No more notifications for today</Text>
          </View>
        ) : (
          <>
            {Object.entries(groupedNotifications).map(([title, items]) => {
              if (items.length === 0) return null;
              return (
                <View key={title} style={styles.section}>
                  <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
                  <View style={styles.sectionContent}>
                    {items.map(renderNotifCard)}
                  </View>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: BG,
    borderBottomWidth: 1,
    borderBottomColor: OUTLINE,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: PRIMARY,
  },
  headerAction: {
    paddingVertical: 4,
  },
  headerActionText: {
    fontSize: 10,
    fontWeight: '800',
    color: PRIMARY,
    letterSpacing: 0.5,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 40,
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#ebefec',
    borderRadius: 25,
    padding: 4,
    marginBottom: 24,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 21,
  },
  filterTabActive: {
    backgroundColor: PRIMARY,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_SUB,
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: TEXT_SUB,
    letterSpacing: 1.5,
    marginBottom: 12,
    marginLeft: 4,
  },
  sectionContent: {
    gap: 12,
  },
  cardWrapper: {
    position: 'relative',
    marginBottom: 4,
  },
  notifCard: {
    backgroundColor: SURFACE,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: OUTLINE,
    shadowColor: '#1b4332',
    shadowOpacity: 0.05,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  unreadDot: {
    position: 'absolute',
    top: 16,
    right: 40, // Adjusted for delete button
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: SECONDARY,
    zIndex: 10,
  },
  deleteBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
    zIndex: 20,
  },
  cardContent: {
    flexDirection: 'row',
    gap: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    paddingRight: 20, // Space for delete button
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT,
    flex: 1,
    marginRight: 8,
  },
  notifTime: {
    fontSize: 10,
    fontWeight: '500',
    color: TEXT_SUB,
  },
  notifMessage: {
    fontSize: 13,
    color: TEXT_SUB,
    lineHeight: 18,
  },
  expandedMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  expandedMetaText: {
    fontSize: 11,
    color: TEXT_SUB,
    fontWeight: '500',
  },
  expandChevron: {
    alignSelf: 'center',
    marginLeft: 4,
  },
  actionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  actionText: {
    fontSize: 10,
    fontWeight: '800',
    color: PRIMARY,
    letterSpacing: 0.5,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    opacity: 0.4,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#ebefec',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_SUB,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BG,
  },
  loadingText: {
    marginTop: 12,
    color: TEXT_SUB,
    fontSize: 14,
  },
});