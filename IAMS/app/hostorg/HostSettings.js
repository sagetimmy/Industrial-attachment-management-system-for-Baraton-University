import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
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
import { hasRolePermission } from '../../utils/permissions';

const PRIMARY = '#005f53';
const PRIMARY_LIGHT = '#E0F5F1';
const BG = '#F6FAF8';
const SURFACE = '#FFFFFF';
const OUTLINE = '#6E7976';
const OUTLINE_SOFT = 'rgba(189, 201, 197, 0.4)';
const TEXT = '#181D1B';
const TEXT_SUB = '#6E7976';
const ERROR = '#EF4444';

const SETTINGS_KEY = 'iams_host_settings';
const DEFAULT_SETTINGS = {
  autoRefresh: true,
  showAnalytics: true,
  vacancyExpiryNotifications: true,
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

export default function HostSettings({ navigation }) {
  const { user, logout } = useAuth();
  const [org, setOrg] = useState(null);
  const [availableSlots, setAvailableSlots] = useState(0);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [permissions, setPermissions] = useState(null);
  const [loading, setLoading] = useState(true);

  const appVersion = useMemo(() => {
    return Constants?.expoConfig?.version || Constants?.manifest?.version || '1.0.0';
  }, []);

  const initials = useMemo(() => {
    const base = org?.org_name || user?.full_name || '';
    return base.trim().charAt(0).toUpperCase() || 'O';
  }, [org, user]);

  const loadSettings = useCallback(async () => {
    try {
      const stored = await Storage.getItem(SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } else {
        setSettings(DEFAULT_SETTINGS);
      }
    } catch {
      setSettings(DEFAULT_SETTINGS);
    }
  }, []);

  const fetchOrg = useCallback(async () => {
    try {
      // available_slots is fetched separately from /host-orgs/available-slots
      // rather than read off org.available_slots — that field is the
      // manually-typed host_organizations.available_slots value, which has
      // no real connection to actual open vacancies. /available-slots sums
      // slots across the org's currently open vacancy postings instead.
      const [dashboardRes, slotsRes] = await Promise.all([
        api.get('/host-orgs/dashboard'),
        api.get('/host-orgs/available-slots').catch(() => ({ data: { available_slots: 0 } })),
      ]);
      setOrg(dashboardRes.data?.org || null);
      setPermissions(dashboardRes.data?.permissions || null);
      setAvailableSlots(slotsRes.data?.available_slots ?? 0);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load organization details.');
      setOrg(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadAll = async () => {
      if (!mounted) return;
      setLoading(true);
      await Promise.all([loadSettings(), fetchOrg()]);
      if (mounted) setLoading(false);
    };
    loadAll();
    return () => { mounted = false; };
  }, [loadSettings, fetchOrg]);

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

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const handleBack = () => {
    if (navigation.canGoBack()) return navigation.goBack();
    return navigation.navigate('HostDashboard');
  };

  const effectiveUser = { ...user, permissions: permissions || user?.permissions };
  const canEditOrgProfile = hasRolePermission(effectiveUser, 'editOrgProfile');

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
          <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Organization Settings</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <SectionTitle icon="office-building" title="Company Profile" />
        <View style={styles.card}>
          <View style={styles.logoRow}>
            <View style={styles.logoPreview}>
              <Text style={styles.logoText}>{initials}</Text>
            </View>
            <View style={styles.logoInfo}>
              <Text style={styles.logoTitle}>Organization Logo</Text>
              <Text style={styles.logoSub}>Recommended size: 512x512px (PNG, SVG, or JPG)</Text>
              <TouchableOpacity
                style={[styles.logoButton, !canEditOrgProfile && styles.logoButtonDisabled]}
                onPress={() => navigation.navigate('HostProfile', { org })}
                disabled={!canEditOrgProfile}
              >
                <Text style={[styles.logoButtonText, !canEditOrgProfile && styles.logoButtonTextDisabled]}>
                  Change Logo
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.infoGrid}>
            <InfoRow label="Organization Name" value={org?.org_name || 'Not set'} />
            <InfoRow label="Location" value={org?.location || 'Not set'} />
            <InfoRow label="Contact Person" value={org?.contact_person || 'Not set'} />
            <InfoRow label="Phone" value={org?.phone || 'Not set'} />
            <InfoRow label="Available Slots" value={String(availableSlots)} />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Company Description</Text>
            <TextInput
              style={styles.textArea}
              value={org?.description || org?.org_description || ''}
              placeholder="Describe your organization's mission and industry focus..."
              placeholderTextColor={TEXT_SUB}
              editable={false}
              multiline
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Website</Text>
            <View style={styles.inputRow}>
              <MaterialCommunityIcons name="web" size={18} color={OUTLINE} />
              <TextInput
                style={styles.input}
                value={org?.website || org?.org_website || ''}
                placeholder="https://www.yourcompany.com"
                placeholderTextColor={TEXT_SUB}
                editable={false}
              />
            </View>
          </View>
        </View>

        <SectionTitle icon="bullhorn" title="Recruitment Settings" />
        <View style={styles.card}>
          <ToggleRow
            title="Vacancy Expiry Notifications"
            subtitle="Get notified 3 days before a vacancy posting expires"
            value={settings.vacancyExpiryNotifications}
            onValueChange={() => toggleSetting('vacancyExpiryNotifications')}
          />
        </View>

        <SectionTitle icon="cog" title="App Settings" />
        <View style={styles.card}>
          <RowButton
            icon="file-document-outline"
            title="Legal & Privacy Policy"
            onPress={() => navigation.navigate('PrivacyPolicy')}
          />
          <Divider />
          <ToggleRow
            title="Auto-refresh Dashboard"
            subtitle="Keeps your dashboard up to date every 30 seconds"
            value={settings.autoRefresh}
            onValueChange={() => toggleSetting('autoRefresh')}
          />
          <Divider />
          <ToggleRow
            title="Show Analytics Cards"
            subtitle="Display dashboard stats like interns and vacancies"
            value={settings.showAnalytics}
            onValueChange={() => toggleSetting('showAnalytics')}
          />
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={18} color={ERROR} />
          <Text style={styles.logoutText}>Logout from Organization</Text>
        </TouchableOpacity>
        <Text style={styles.footerText}>
          IAMS Platform v{appVersion} — Host Organization Module
        </Text>
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

function RowButton({ icon, title, onPress }) {
  return (
    <TouchableOpacity style={styles.rowButton} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.rowInfo}>
        <MaterialCommunityIcons name={icon} size={20} color={TEXT_SUB} />
        <Text style={styles.rowTitle}>{title}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={OUTLINE} />
    </TouchableOpacity>
  );
}

function ToggleRow({ title, subtitle, value, onValueChange }) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleText}>
        <Text style={styles.toggleTitle}>{title}</Text>
        <Text style={styles.toggleSub}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: OUTLINE_SOFT, true: PRIMARY }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: BG },
  loadingText: { marginTop: 10, color: TEXT_SUB },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: OUTLINE_SOFT,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: PRIMARY, flexShrink: 1 },
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
  scrollContent: { paddingBottom: 32 },
  sectionTitleRow: {
    marginTop: 18,
    marginBottom: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: PRIMARY },
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
    padding: 16,
  },
  logoRow: { flexDirection: 'row', gap: 16, alignItems: 'center', marginBottom: 16 },
  logoPreview: {
    width: 88,
    height: 88,
    borderRadius: 18,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: PRIMARY,
  },
  logoText: { fontSize: 28, fontWeight: '700', color: PRIMARY },
  logoInfo: { flex: 1 },
  logoTitle: { fontSize: 14, fontWeight: '700', color: TEXT },
  logoSub: { fontSize: 12, color: TEXT_SUB, marginTop: 4 },
  logoButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: PRIMARY_LIGHT,
  },
  logoButtonDisabled: { backgroundColor: '#E5E7EB' },
  logoButtonText: { color: PRIMARY, fontWeight: '700', fontSize: 12 },
  logoButtonTextDisabled: { color: '#9CA3AF' },
  infoGrid: { marginBottom: 14 },
  infoRow: { marginBottom: 10 },
  infoLabel: { fontSize: 11, color: TEXT_SUB, textTransform: 'uppercase', letterSpacing: 0.6 },
  infoValue: { fontSize: 14, fontWeight: '600', color: TEXT, marginTop: 2 },
  fieldGroup: { marginTop: 12 },
  fieldLabel: { fontSize: 11, color: TEXT_SUB, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
  textArea: {
    minHeight: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: OUTLINE_SOFT,
    backgroundColor: SURFACE,
    padding: 12,
    color: TEXT,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: OUTLINE_SOFT,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  input: { flex: 1, paddingVertical: 10, color: TEXT },
  rowButton: {
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: '600', color: TEXT },
  divider: { height: 1, backgroundColor: OUTLINE_SOFT, marginVertical: 10 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 6,
  },
  toggleText: { flex: 1 },
  toggleTitle: { fontSize: 14, fontWeight: '600', color: TEXT },
  toggleSub: { fontSize: 12, color: TEXT_SUB, marginTop: 4 },
  logoutBtn: {
    marginTop: 24,
    marginHorizontal: 16,
    borderWidth: 1.5,
    borderColor: ERROR,
    borderRadius: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: SURFACE,
  },
  logoutText: { color: ERROR, fontWeight: '700' },
  footerText: {
    marginTop: 12,
    textAlign: 'center',
    color: TEXT_SUB,
    fontSize: 11,
    letterSpacing: 0.4,
  },
});