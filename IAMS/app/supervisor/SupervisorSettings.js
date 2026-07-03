import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { confirmLogout } from '../../utils/confirmLogout';

const PRIMARY = '#005f53';
const PRIMARY_LIGHT = '#E0F5F1';
const BG = '#F6FAF8';
const SURFACE = '#FFFFFF';
const OUTLINE = '#BDC9C5';
const OUTLINE_SOFT = 'rgba(189, 201, 197, 0.4)';
const TEXT = '#181D1B';
const TEXT_SUB = '#6E7976';
const ERROR = '#EF4444';
const ACCENT = '#FEF3E8';

const SETTINGS_KEY = 'iams_supervisor_settings';
const DEFAULT_SETTINGS = {
  emailNotifications: true,
  reviewReminders: true,
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

export default function SupervisorSettings({ navigation }) {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const [profile, setProfile] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const appVersion = useMemo(() => {
    return Constants?.expoConfig?.version || Constants?.manifest?.version || '1.0.0';
  }, []);

  const initials = useMemo(() => {
    const base = profile?.full_name || user?.full_name || '';
    return base.trim().charAt(0).toUpperCase() || 'S';
  }, [profile, user]);

  const displayName = profile?.full_name || user?.full_name || 'Supervisor';
  const displayEmail = profile?.email || user?.email || 'Not provided';

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

  const fetchProfile = useCallback(async () => {
    try {
      const res = await api.get('/supervisors/dashboard');
      setProfile(res.data?.supervisor || null);
    } catch (err) {
      setProfile(user || null);
    }
  }, [user]);

  useEffect(() => {
    let mounted = true;
    const loadAll = async () => {
      if (!mounted) return;
      setLoading(true);
      await Promise.all([loadSettings(), fetchProfile()]);
      if (mounted) setLoading(false);
    };
    loadAll();
    return () => { mounted = false; };
  }, [loadSettings, fetchProfile]);

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

  const handleLogout = () => confirmLogout(logout);

  const handleBack = () => {
    if (navigation.canGoBack()) return navigation.goBack();
    return navigation.navigate('SupervisorDashboard');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY} />
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.menuBtn} onPress={handleBack}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <SectionLabel title="Account Details" />
        <View style={styles.card}>
          <RowButton
            icon="account-circle-outline"
            title="Personal Details"
            subtitle={`Signed in as ${displayName}`}
            onPress={() => navigation.navigate('Profile')}
          />
          <Divider />
          <RowButton
            icon="badge-account-outline"
            title="Professional Bio"
            subtitle="Update your expertise & credentials"
            onPress={() => Alert.alert('Coming Soon', 'Professional bio updates will be available soon.')}
          />
          <Divider />
          <ToggleRow
            icon="bell-outline"
            title="Email Notifications"
            subtitle="Activity alerts and summaries"
            value={settings.emailNotifications}
            onValueChange={() => toggleSetting('emailNotifications')}
          />
        </View>

        <SectionLabel title="Management Preferences" />
        <View style={styles.card}>
          <ToggleRow
            icon="calendar-clock"
            title="Review Reminders"
            subtitle="Weekly logbook review pings"
            value={settings.reviewReminders}
            onValueChange={() => toggleSetting('reviewReminders')}
            accent
          />
          <Divider />
          <RowButton
            icon="eye-outline"
            title="Student Batch Visibility"
            subtitle="Manage active student cohorts"
            onPress={() => navigation.navigate('MyStudents')}
          />
        </View>

        <SectionLabel title="App Settings" />
        <View style={styles.card}>
          <RowValue
            icon="theme-light-dark"
            title="Theme"
            value={isDarkMode ? 'Dark Mode' : 'Light Mode'}
            onPress={toggleTheme}
          />
          <Divider />
          <RowButton
            icon="gavel"
            title="Terms of Service"
            subtitle="Read our policies"
            trailingIcon="open-in-new"
            onPress={() => navigation.navigate('PrivacyPolicy')}
          />
          <Divider />
          <RowValue
            icon="information-outline"
            title="About IAMS"
            value={`v${appVersion}`}
          />
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={18} color={ERROR} />
          <Text style={styles.logoutText}>Logout from IAMS</Text>
        </TouchableOpacity>
        <Text style={styles.footerText}>Connected as {displayEmail}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionLabel({ title }) {
  return <Text style={styles.sectionLabel}>{title}</Text>;
}

function RowButton({ icon, title, subtitle, onPress, trailingIcon = 'chevron-right' }) {
  return (
    <TouchableOpacity style={styles.rowButton} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.rowInfo}>
        <View style={styles.iconBadge}>
          <MaterialCommunityIcons name={icon} size={20} color={PRIMARY} />
        </View>
        <View style={styles.rowText}>
          <Text style={styles.rowTitle}>{title}</Text>
          <Text style={styles.rowSub}>{subtitle}</Text>
        </View>
      </View>
      <MaterialCommunityIcons name={trailingIcon} size={20} color={TEXT_SUB} />
    </TouchableOpacity>
  );
}

function RowValue({ icon, title, value, onPress }) {
  const content = (
    <View style={styles.rowValue}>
      <View style={styles.rowValueInfo}>
        <MaterialCommunityIcons name={icon} size={20} color={TEXT_SUB} />
        <Text style={styles.rowValueTitle}>{title}</Text>
      </View>
      <Text style={styles.rowValueText}>{value}</Text>
    </View>
  );
  if (!onPress) return <View style={styles.rowButton}>{content}</View>;
  return (
    <TouchableOpacity style={styles.rowButton} onPress={onPress} activeOpacity={0.7}>
      {content}
    </TouchableOpacity>
  );
}

function ToggleRow({ icon, title, subtitle, value, onValueChange, accent }) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.rowInfo}>
        <View style={[styles.iconBadge, accent && styles.iconBadgeAccent]}>
          <MaterialCommunityIcons name={icon} size={20} color={accent ? '#9D4300' : PRIMARY} />
        </View>
        <View style={styles.rowText}>
          <Text style={styles.rowTitle}>{title}</Text>
          <Text style={styles.rowSub}>{subtitle}</Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: OUTLINE, true: PRIMARY }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(246, 250, 248, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: OUTLINE_SOFT,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  menuBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: PRIMARY },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: PRIMARY_LIGHT,
  },
  avatarText: { color: PRIMARY, fontWeight: '700' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  sectionLabel: {
    marginTop: 18,
    marginBottom: 10,
    paddingHorizontal: 16,
    fontSize: 12,
    fontWeight: '700',
    color: TEXT_SUB,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  card: {
    marginHorizontal: 16,
    backgroundColor: SURFACE,
    borderRadius: 18,
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
  iconBadgeAccent: { backgroundColor: ACCENT },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: '700', color: TEXT },
  rowSub: { fontSize: 12, color: TEXT_SUB, marginTop: 2 },
  rowValue: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  rowValueInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowValueTitle: { fontSize: 14, fontWeight: '600', color: TEXT },
  rowValueText: { fontSize: 13, color: PRIMARY, fontWeight: '700' },
  divider: { height: 1, backgroundColor: OUTLINE_SOFT, marginHorizontal: 16 },
  toggleRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  logoutBtn: {
    marginTop: 24,
    marginHorizontal: 16,
    borderWidth: 1.5,
    borderColor: ERROR,
    borderRadius: 24,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: SURFACE,
  },
  logoutText: { color: ERROR, fontWeight: '700' },
  footerText: {
    marginTop: 14,
    textAlign: 'center',
    color: TEXT_SUB,
    fontSize: 12,
  },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: BG },
  loadingText: { marginTop: 10, color: TEXT_SUB },
});