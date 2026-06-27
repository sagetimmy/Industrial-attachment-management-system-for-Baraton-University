// components/AnnouncementBanner.js
// Shared component — drop onto any role dashboard to show latest unread announcement.
// Props:
//   navigation — React Navigation prop, used to navigate to AnnouncementsScreen
//   role       — 'student' | 'supervisor' | 'host' | 'admin'  (determines nav target)

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../utils/api'; // shared axios instance

const COLORS = {
  teal: '#1B7A65',
  tealLight: '#E8F5F1',
  tealBorder: '#A8D5C8',
  navy: '#0F2419',
  orange: '#E8711A',
  orangeLight: '#FEF3EB',
  orangeBorder: '#F5C09A',
  text: '#1A2E25',
  textMuted: '#6B8F7E',
  white: '#FFFFFF',
};

// Maps role to the screen name registered in App.js
const ANNOUNCEMENTS_SCREEN = {
  student: 'Announcements',
  supervisor: 'Announcements',
  host: 'Announcements',
  admin: 'AdminAnnouncements',
};

export default function AnnouncementBanner({ navigation, role = 'student' }) {
  const [latest, setLatest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  const fetchLatest = useCallback(async () => {
    try {
      const res = await api.get('/announcements');
      const list = res.data.announcements || [];
      // Show the most recent unread one
      const unread = list.find((a) => !a.is_read);
      setLatest(unread || null);
    } catch (err) {
      // Silently fail — banner is non-critical
      setLatest(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLatest();
  }, [fetchLatest]);

  const handleDismiss = async () => {
    setDismissed(true);
    if (latest) {
      try {
        await api.patch(`/announcements/${latest.id}/read`);
      } catch (_) {}
    }
  };

  const handleViewAll = () => {
    const screen = ANNOUNCEMENTS_SCREEN[role] || 'Announcements';
    navigation.navigate(screen);
  };

  if (loading || dismissed || !latest) return null;

  const isUrgent = latest.audience === 'ALL';

  return (
    <View style={[styles.container, isUrgent ? styles.urgentBorder : styles.normalBorder]}>
      <View style={[styles.iconWrap, { backgroundColor: isUrgent ? COLORS.orangeLight : COLORS.tealLight }]}>
        <Ionicons
          name={isUrgent ? 'megaphone' : 'notifications'}
          size={18}
          color={isUrgent ? COLORS.orange : COLORS.teal}
        />
      </View>

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {latest.title}
        </Text>
        <Text style={styles.body} numberOfLines={2}>
          {latest.body}
        </Text>
        <TouchableOpacity onPress={handleViewAll} activeOpacity={0.7}>
          <Text style={[styles.viewAll, { color: isUrgent ? COLORS.orange : COLORS.teal }]}>
            View all announcements →
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={handleDismiss}
        style={styles.closeBtn}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityLabel="Dismiss announcement"
      >
        <Ionicons name="close" size={16} color={COLORS.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  normalBorder: {
    borderColor: COLORS.tealBorder,
  },
  urgentBorder: {
    borderColor: COLORS.orangeBorder,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    lineHeight: 18,
  },
  body: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 17,
    marginTop: 1,
  },
  viewAll: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  closeBtn: {
    paddingTop: 2,
    flexShrink: 0,
  },
});