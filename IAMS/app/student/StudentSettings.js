import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../../components/Spinner';

const PRIMARY = '#005f53';
const PRIMARY_LIGHT = '#E0F5F1';
const BG = '#F6FAF8';
const SURFACE = '#FFFFFF';
const OUTLINE = '#BDC9C5';
const OUTLINE_SOFT = 'rgba(189, 201, 197, 0.4)';
const TEXT = '#181D1B';
const TEXT_SUB = '#6E7976';
const ERROR = '#EF4444';

const SETTINGS_KEY = 'iams_student_settings';
const DEFAULT_SETTINGS = {
  logbookReminders: true,
};

const Storage = {
  getItem: async (key) => {
    if (Platform.OS === 'web') return localStorage.getItem(key);
    return AsyncStorage.getItem(key);
  },
  setItem: async (key, value) => {
    if (Platform.OS === 'web') return localStorage.setItem(key, value);
    return AsyncStorage.setItem(key, value);
  },
};

export default function StudentSettings({ navigation }) {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [attachment, setAttachment] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const initials = useMemo(() => {
    const base = profile?.full_name || user?.full_name || '';
    return base.trim().charAt(0).toUpperCase() || '?';
  }, [profile, user]);

  const loadSettings = useCallback(async () => {
    try {
      const stored = await Storage.getItem(SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } else {
        setSettings(DEFAULT_SETTINGS);
      }
    } catch (err) {
      setSettings(DEFAULT_SETTINGS);
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [profileRes, attachmentRes, unreadRes] = await Promise.all([
        api.get('/students/profile'),
        api.get('/students/my-attachment').catch(() => ({ data: null })),
        api.get('/notifications/unread-count').catch(() => ({ data: { count: 0 } })),
      ]);
      setProfile(profileRes.data);
      setAttachment(attachmentRes.data);
      setUnreadCount(unreadRes.data?.count || 0);
    } catch (err) {
      Alert.alert('Error', 'Failed to load settings data.');
      setProfile(user || null);
    }
  }, [user]);

  useEffect(() => {
    let mounted = true;
    const loadAll = async () => {
      if (!mounted) return;
      setLoading(true);
      await Promise.all([loadSettings(), fetchData()]);
      if (mounted) setLoading(false);
    };
    loadAll();
    return () => { mounted = false; };
  }, [loadSettings, fetchData]);

  const toggleSetting = async (key) => {
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    try {
      await Storage.setItem(SETTINGS_KEY, JSON.stringify(next));
    } catch (err) {
      setSettings(settings);
      Alert.alert('Error', 'Failed to update settings. Please try again.');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setActionLoading(true);
      await api.put('/notifications/read-all');
      setUnreadCount(0);
      Alert.alert('Updated', 'All notifications marked as read.');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to mark all as read.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear Notifications',
      'Clear all notifications for this account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);
              await api.delete('/notifications/clear-all');
              setUnreadCount(0);
              Alert.alert('Cleared', 'All notifications were cleared.');
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to clear notifications.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleSupervisorInfo = () => {
    if (!attachment) {
      Alert.alert('No Attachment', 'You do not have an active attachment yet.');
      return;
    }
    Alert.alert(
      attachment.org_name || 'Organization',
      [
        attachment.contact_person ? `Contact: ${attachment.contact_person}` : null,
        attachment.org_phone ? `Phone: ${attachment.org_phone}` : null,
        attachment.location ? `Location: ${attachment.location}` : null,
      ].filter(Boolean).join('\n') || 'No organization contact info available.'
    );
  };
 
  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Spinner size="large" color={PRIMARY} />
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <SectionTitle icon="account-outline" title="Account" />
        <View style={styles.card}>
          <RowButton
            icon="card-account-details-outline"
            title="Profile Info"
            subtitle={profile?.full_name ? `Student: ${profile.full_name}` : 'Manage your personal details'}
            onPress={() => navigation.navigate('Profile')}
          />
          <Divider />
          <RowButton
            icon="lock-reset"
            title="Change Password"
            subtitle="Use password reset email"
            onPress={() => Alert.alert('Info', 'Password updates are handled via email verification.')}
          />
          <Divider />
          <RowButton
            icon="bell-outline"
            title="Notifications"
            subtitle={unreadCount ? `${unreadCount} unread` : 'All caught up'}
            onPress={() => navigation.navigate('Notifications')}
          />
        </View>

        <SectionTitle icon="book-open-variant" title="Attachment Settings" />
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={styles.rowInfo}>
              <View style={styles.iconBadge}>
                <MaterialCommunityIcons name="book-open-variant" size={20} color={PRIMARY} />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>Logbook Reminders</Text>
                <Text style={styles.rowSub}>Evening reminders to submit logbook</Text>
              </View>
            </View>
            <Switch
              value={settings.logbookReminders}
              onValueChange={() => toggleSetting('logbookReminders')}
              trackColor={{ false: '#D0D7D4', true: PRIMARY }}
              thumbColor="#FFFFFF"
            />
          </View>
          <Divider />
          <RowButton
            icon="phone-outline"
            title="Organization Info"
            subtitle={attachment?.org_name ? attachment.org_name : 'No attachment assigned'}
            onPress={handleSupervisorInfo}
          />
        </View>

        <SectionTitle icon="cog-outline" title="App Settings" />
        <View style={styles.card}>
          <RowButton
            icon="translate"
            title="Language"
            subtitle="English"
            onPress={() => Alert.alert('Info', 'Language settings are coming soon.')}
          />
          <Divider />
          <RowButton
            icon="help-circle-outline"
            title="Help & Support"
            subtitle="FAQs and support"
            onPress={() => Alert.alert('Support', 'Please contact your department for assistance.')}
          />
          <Divider />
          <RowButton
            icon="shield-check-outline"
            title="Privacy Policy"
            subtitle="Data and usage terms"
            onPress={() => navigation.navigate('PrivacyPolicy')}
          />
        </View>

        <SectionTitle icon="bell-ring-outline" title="Notification Actions" />
        <View style={styles.card}>
          <RowButton
            icon="check-circle-outline"
            title="Mark all as read"
            subtitle="Clear unread badge"
            onPress={handleMarkAllRead}
            disabled={actionLoading}
          />
          <Divider />
          <RowButton
            icon="delete-outline"
            title="Clear all notifications"
            subtitle="Remove all notifications"
            onPress={handleClearAll}
            disabled={actionLoading}
            danger
          />
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={18} color={ERROR} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
        <Text style={styles.versionText}>IAMS Version 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionTitle({ icon, title }) {
  return (
    <View style={styles.sectionTitleRow}>
      <MaterialCommunityIcons name={icon} size={18} color={PRIMARY} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function RowButton({ icon, title, subtitle, onPress, disabled, danger }) {
  return (
    <TouchableOpacity
      style={[styles.rowButton, disabled && styles.rowDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <View style={styles.rowInfo}>
        <View style={[styles.iconBadge, danger && styles.iconBadgeDanger]}>
          <MaterialCommunityIcons name={icon} size={20} color={danger ? ERROR : PRIMARY} />
        </View>
        <View style={styles.rowText}>
          <Text style={[styles.rowTitle, danger && styles.rowTitleDanger]}>{title}</Text>
          <Text style={styles.rowSub}>{subtitle}</Text>
        </View>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={22} color={TEXT_SUB} />
    </TouchableOpacity>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: OUTLINE_SOFT,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: PRIMARY,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: PRIMARY, fontWeight: '700' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  sectionTitleRow: {
    marginTop: 18,
    marginBottom: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT,
  },
  card: {
    marginHorizontal: 16,
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: OUTLINE_SOFT,
    shadowColor: '#0D7A6B',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  rowButton: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadgeDanger: { backgroundColor: '#FEE2E2' },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: '700', color: TEXT },
  rowTitleDanger: { color: ERROR },
  rowSub: { fontSize: 12, color: TEXT_SUB, marginTop: 2 },
  divider: { height: 1, backgroundColor: OUTLINE_SOFT, marginHorizontal: 16 },
  toggleRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowDisabled: { opacity: 0.6 },
  logoutBtn: {
    marginTop: 24,
    marginHorizontal: 16,
    borderWidth: 1.5,
    borderColor: ERROR,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: SURFACE,
  },
  logoutText: { color: ERROR, fontWeight: '700' },
  versionText: {
    marginTop: 12,
    textAlign: 'center',
    color: TEXT_SUB,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: BG },
  loadingText: { marginTop: 10, color: TEXT_SUB },
});
