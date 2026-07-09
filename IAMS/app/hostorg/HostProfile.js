import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { hasRolePermission } from '../../utils/permissions';

// Exact palette from the design mockup — hardcoded intentionally so this
// screen always matches the spec regardless of what constants/colors.js defines.
const PALETTE = {
  header: '#0E4E3B',
  headerText: '#FFFFFF',
  bg: '#EEF2F0',
  logoBg: '#0E4E3B',
  orange: '#E8711A',
  cardWhite: '#FFFFFF',
  textDark: '#1A1A1A',
  hintGray: '#8A8A8A',
  labelGray: '#A0A0A0',
  permissionBg: '#FCEFD6',
  permissionTitle: '#7A3B12',
  permissionText: '#8A6D4C',
  warning: '#B8590A',
};

const HostProfile = ({ navigation }) => {
  const { user } = useAuth();
  const canEditOrgProfile = hasRolePermission(user, 'editOrgProfile');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [org, setOrg] = useState(null);
  const [activeInterns, setActiveInterns] = useState(0);
  const [availableSlots, setAvailableSlots] = useState(0);

  const fetchOrgData = useCallback(async () => {
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
      setOrg(dashboardRes.data.org || null);
      setActiveInterns(dashboardRes.data.active_interns ?? 0);
      setAvailableSlots(slotsRes.data?.available_slots ?? 0);
    } catch (error) {
      Alert.alert('Error', 'Failed to load profile data');
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrgData();
  }, [fetchOrgData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrgData();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={24} color={PALETTE.headerText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Organization Profile</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={PALETTE.orange} />
        </View>
      </View>
    );
  }

  const orgInitial = org?.org_name?.trim().charAt(0).toUpperCase() || '?';

  const InfoRow = ({ icon, label, value }) => (
    <View style={styles.infoRow}>
      <View style={styles.infoIconWrap}>
        <Ionicons name={icon} size={18} color={PALETTE.header} />
      </View>
      <View style={styles.infoTextWrap}>
        <Text style={styles.infoLabel}>{label.toUpperCase()}</Text>
        <Text style={styles.infoValue}>{value || '—'}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={PALETTE.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Organization Profile</Text>
        {canEditOrgProfile ? (
          <TouchableOpacity
            onPress={() => navigation.navigate('HostEditProfile', { org })}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="create-outline" size={22} color={PALETTE.headerText} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PALETTE.orange]} tintColor={PALETTE.orange} />
        }
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.logoCircle}>
            {org?.org_logo_url ? (
              <Image source={{ uri: org.org_logo_url }} style={styles.logoImage} />
            ) : (
              <Text style={styles.logoInitial}>{orgInitial}</Text>
            )}
          </View>
          <Text style={styles.orgName}>{org?.org_name || 'Organization'}</Text>
          {!!org?.location && (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={14} color={PALETTE.hintGray} />
              <Text style={styles.orgLocation}>{org.location}</Text>
            </View>
          )}
        </View>

        {/* Stat Cards */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{availableSlots}</Text>
            <Text style={styles.statLabel}>Available Slots</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{activeInterns}</Text>
            <Text style={styles.statLabel}>Active Interns</Text>
          </View>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoTitleRow}>
            <Ionicons name="clipboard-outline" size={20} color={PALETTE.header} />
            <Text style={styles.infoCardTitle}>Organization Details</Text>
          </View>
          <InfoRow icon="business-outline" label="Organization Name" value={org?.org_name} />
          <InfoRow icon="location-outline" label="Location" value={org?.location} />
          <InfoRow icon="person-outline" label="Contact Person" value={org?.contact_person} />
          <InfoRow icon="call-outline" label="Phone Number" value={org?.phone} />
        </View>

        {!canEditOrgProfile && (
          <View style={styles.permissionCard}>
            <View style={styles.permissionTitleRow}>
              <Ionicons name="warning-outline" size={18} color={PALETTE.warning} />
              <Text style={styles.permissionTitle}>Profile Editing Disabled</Text>
            </View>
            <Text style={styles.permissionText}>
              Permissions restricted by your primary administrator.
            </Text>
          </View>
        )}

        {canEditOrgProfile && (
          <TouchableOpacity
            style={styles.editProfileButton}
            onPress={() => navigation.navigate('HostEditProfile', { org })}
          >
            <Text style={styles.editProfileButtonText}>Edit Profile</Text>
            <Ionicons name="create-outline" size={18} color="white" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PALETTE.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: PALETTE.header,
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 16,
  },
  headerTitle: {
    color: PALETTE.headerText,
    fontSize: 20,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCard: {
    alignItems: 'center',
    backgroundColor: PALETTE.cardWhite,
    borderRadius: 16,
    paddingVertical: 28,
    marginBottom: 20,
  },
  logoCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: PALETTE.logoBg,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 14,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  logoInitial: {
    color: 'white',
    fontSize: 36,
    fontWeight: '700',
  },
  orgName: {
    fontSize: 20,
    fontWeight: '700',
    color: PALETTE.textDark,
    marginBottom: 6,
    textAlign: 'center',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  orgLocation: {
    fontSize: 14,
    color: PALETTE.hintGray,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: PALETTE.cardWhite,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 26,
    fontWeight: '700',
    color: PALETTE.orange,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: PALETTE.hintGray,
  },
  infoCard: {
    backgroundColor: PALETTE.cardWhite,
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: PALETTE.header,
  },
  infoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  infoCardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: PALETTE.textDark,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoIconWrap: {
    width: 30,
  },
  infoTextWrap: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: PALETTE.labelGray,
    letterSpacing: 0.4,
    marginBottom: 3,
  },
  infoValue: {
    fontSize: 15,
    color: PALETTE.textDark,
    fontWeight: '500',
  },
  editProfileButton: {
    flexDirection: 'row',
    backgroundColor: PALETTE.orange,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editProfileButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  permissionCard: {
    backgroundColor: PALETTE.permissionBg,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  permissionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  permissionTitle: {
    color: PALETTE.permissionTitle,
    fontSize: 14.5,
    fontWeight: '700',
  },
  permissionText: {
    color: PALETTE.permissionText,
    fontSize: 13,
    lineHeight: 19,
  },
});

export default HostProfile;