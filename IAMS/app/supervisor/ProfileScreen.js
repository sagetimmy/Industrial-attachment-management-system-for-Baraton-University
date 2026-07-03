import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert,
  ActivityIndicator, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { confirmLogout } from '../../utils/confirmLogout';

const TEAL = '#1B6B5A';
const TEAL_LIGHT = '#E3F1EE';
const ORANGE = '#C77B2E';
const ORANGE_LIGHT = '#FBEFE3';
const BG = '#F4F8F7';
const ONLINE_GREEN = '#2ECC71';
const NEEDS_REVIEW_BG = '#FBEAE3';
const NEEDS_REVIEW_TEXT = '#C0552B';
const ON_TRACK_BG = '#E3F1EE';
const ON_TRACK_TEXT = '#1B6B5A';

export default function SupervisorProfileScreen({ navigation }) {
  const { user, logout, fetchUserProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ activeStudents: 0, reviewsPending: 0, avgScore: 0 });
  const [students, setStudents] = useState([]);

  useEffect(() => {
    fetchProfile();
  }, []);

  // Keep local `profile` photo in sync whenever the global user object
  // changes (e.g. after fetchUserProfile() runs post-upload)
  useEffect(() => {
    if (user?.avatar_url) {
      setProfile(prev => (prev ? { ...prev, photo_url: user.avatar_url } : prev));
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get('/supervisors/dashboard');
      const data = res.data || {};
      const supervisorData = data.supervisor || {};

      setProfile({
        full_name: user?.full_name || supervisorData.full_name || 'Supervisor',
        email: user?.email || supervisorData.email || '',
        phone: user?.phone || supervisorData.phone || '',
        department: user?.department || supervisorData.department || '',
        staff_id: supervisorData.staff_id || '',
        office: supervisorData.office || '',
        title: supervisorData.title || 'Supervisor',
        // avatar_url (set via /avatar upload) is the source of truth; photo_url is a legacy fallback
        photo_url: user?.avatar_url || supervisorData.photo_url || null,
      });

      setStats({
        activeStudents: data.active_students_count ?? data.stats?.active_students ?? 0,
        reviewsPending: data.reviews_pending_count ?? data.stats?.reviews_pending ?? 0,
        avgScore: data.average_score ?? data.stats?.average_score ?? 0,
      });

      setStudents(data.recent_students || []);
    } catch (err) {
      console.log('Profile fetch error:', err.message);
      setProfile({
        full_name: user?.full_name || 'Supervisor',
        email: user?.email || '',
        phone: user?.phone || '',
        department: user?.department || '',
        title: 'Supervisor',
        photo_url: user?.avatar_url || null,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePhoto = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Please allow photo library access to upload a profile photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled) return;

      setUploadingPhoto(true);

      const manipulated = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 512, height: 512 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );

      const photoFormData = new FormData();
      photoFormData.append('photo', {
        uri: manipulated.uri,
        name: 'avatar.jpg',
        type: 'image/jpeg',
      });

      await api.post('/avatar', photoFormData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Refresh the global user object so the new avatar_url
      // propagates everywhere (header, drawer, other screens)
      await fetchUserProfile();
    } catch (err) {
      const message = err.response?.data?.message || 'Could not upload photo. Please try again.';
      Alert.alert('Upload Failed', message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleLogout = () => confirmLogout(logout);
  
  const profileData = profile || {
    full_name: user?.full_name || 'Supervisor',
    email: user?.email || '',
    title: 'Supervisor',
    photo_url: user?.avatar_url || null,
  };

  const initials = profileData.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'S';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Supervisor Profile</Text>
          <TouchableOpacity onPress={() => navigation.navigate('SupervisorEditProfile')}>
            <Text style={styles.editButton}>✎</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={TEAL} />
          </View>
        ) : (
          <>
            {/* Avatar + Name */}
            <View style={styles.avatarSection}>
              <TouchableOpacity
                style={styles.avatarWrap}
                onPress={handleChangePhoto}
                disabled={uploadingPhoto}
                activeOpacity={0.8}
              >
                {profileData.photo_url ? (
                  <Image source={{ uri: profileData.photo_url }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initials}</Text>
                  </View>
                )}

                {uploadingPhoto && (
                  <View style={styles.avatarLoadingOverlay}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  </View>
                )}

                <View style={styles.cameraBadge}>
                  <Text style={styles.cameraBadgeText}>📷</Text>
                </View>
              </TouchableOpacity>
              <Text style={styles.name}>{profileData.full_name}</Text>
              <Text style={styles.role}>{profileData.title}</Text>
              {!!profileData.department && (
                <Text style={styles.department}>{profileData.department}</Text>
              )}
            </View>

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats.activeStudents}</Text>
                <Text style={styles.statLabel}>ACTIVE{'\n'}STUDENTS</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: ORANGE }]}>
                  {String(stats.reviewsPending).padStart(2, '0')}
                </Text>
                <Text style={styles.statLabel}>REVIEWS{'\n'}PENDING</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>
                  {stats.avgScore} <Text style={styles.star}>★</Text>
                </Text>
                <Text style={styles.statLabel}>AVG.{'\n'}SCORE</Text>
              </View>
            </View>

            {/* Institutional Details */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Institutional Details</Text>

              {!!profileData.staff_id && (
                <View style={styles.infoRow}>
                  <View style={styles.iconCircle}><Text>🪪</Text></View>
                  <View>
                    <Text style={styles.label}>STAFF ID</Text>
                    <Text style={styles.value}>{profileData.staff_id}</Text>
                  </View>
                </View>
              )}

              {!!profileData.office && (
                <View style={styles.infoRow}>
                  <View style={styles.iconCircle}><Text>🏢</Text></View>
                  <View>
                    <Text style={styles.label}>OFFICE NUMBER</Text>
                    <Text style={styles.value}>{profileData.office}</Text>
                  </View>
                </View>
              )}

              <View style={styles.infoRow}>
                <View style={styles.iconCircle}><Text>✉️</Text></View>
                <View>
                  <Text style={styles.label}>OFFICIAL EMAIL</Text>
                  <Text style={styles.value}>{profileData.email || 'Not provided'}</Text>
                </View>
              </View>
            </View>

            {/* Recent Students */}
            <View style={styles.studentsHeader}>
              <Text style={styles.studentsTitle}>Recent Students</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Students')}>
                <Text style={styles.viewAll}>VIEW ALL</Text>
              </TouchableOpacity>
            </View>

            {students.length === 0 ? (
              <Text style={styles.emptyText}>No recent students to show.</Text>
            ) : (
              students.map((s, idx) => {
                const needsReview = s.status === 'needs_review';
                const progress = Math.max(0, Math.min(100, s.progress ?? 0));
                return (
                  <View key={s.id || idx} style={styles.studentCard}>
                    <View style={styles.studentTopRow}>
                      <View style={styles.studentAvatarWrap}>
                        {s.photo_url ? (
                          <Image source={{ uri: s.photo_url }} style={styles.studentAvatarImage} />
                        ) : (
                          <View style={styles.studentAvatar}>
                            <Text style={styles.studentAvatarText}>
                              {(s.full_name || '?').charAt(0).toUpperCase()}
                            </Text>
                          </View>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.studentName}>{s.full_name}</Text>
                        <Text style={styles.studentProgram}>{s.program}</Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: needsReview ? NEEDS_REVIEW_BG : ON_TRACK_BG },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            { color: needsReview ? NEEDS_REVIEW_TEXT : ON_TRACK_TEXT },
                          ]}
                        >
                          {needsReview ? 'NEEDS REVIEW' : 'ON TRACK'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.progressRow}>
                      <Text style={styles.progressLabel}>PROGRESS</Text>
                      <Text style={styles.progressPercent}>{progress}%</Text>
                    </View>
                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${progress}%`,
                            backgroundColor: needsReview ? '#C0552B' : TEAL,
                          },
                        ]}
                      />
                    </View>
                  </View>
                );
              })
            )}

            {/* Settings */}
            <View style={styles.section}>
              <TouchableOpacity style={styles.settingRow}>
                <Text style={styles.settingIcon}>🔔</Text>
                <Text style={styles.settingLabel}>Notification Preferences</Text>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.settingRow}>
                <Text style={styles.settingIcon}>🔒</Text>
                <Text style={styles.settingLabel}>Change Password</Text>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.settingRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.settingIcon}>🛡️</Text>
                <Text style={styles.settingLabel}>Security</Text>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Logout Button */}
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutText}>⎋  Logout Session</Text>
            </TouchableOpacity>

            <Text style={styles.versionText}>Version 2.4.0 (Build 1082)</Text>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backButton: {
    fontSize: 20,
    color: '#000000',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEAL,
  },
  editButton: {
    fontSize: 18,
    color: TEAL,
  },

  // Avatar
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 14,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: TEAL,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  avatarLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 50,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: TEAL,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: BG,
  },
  cameraBadgeText: {
    fontSize: 12,
  },
  name: {
    fontSize: 19,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 2,
  },
  role: {
    fontSize: 14,
    color: TEAL,
    fontWeight: '600',
    marginBottom: 2,
  },
  department: {
    fontSize: 13,
    color: '#555555',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 18,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 6,
  },
  star: {
    color: '#F2B705',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#999999',
    textAlign: 'center',
    lineHeight: 13,
  },

  // Section
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: TEAL,
    marginBottom: 12,
  },

  // Info Row
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: TEAL_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 11,
    color: '#999999',
    fontWeight: '600',
    marginBottom: 2,
  },
  value: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '600',
  },

  // Students
  studentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 10,
  },
  studentsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
  viewAll: {
    fontSize: 12,
    fontWeight: '700',
    color: TEAL,
  },
  emptyText: {
    fontSize: 13,
    color: '#999999',
    textAlign: 'center',
    paddingVertical: 12,
  },
  studentCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 14,
  },
  studentTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  studentAvatarWrap: {},
  studentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: TEAL,
    justifyContent: 'center',
    alignItems: 'center',
  },
  studentAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  studentAvatarText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  studentName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
  },
  studentProgram: {
    fontSize: 12,
    color: '#777777',
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#999999',
  },
  progressPercent: {
    fontSize: 11,
    fontWeight: '700',
    color: '#555555',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EEEEEE',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Settings
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingIcon: {
    fontSize: 16,
  },
  settingLabel: {
    flex: 1,
    fontSize: 14,
    color: '#000000',
    fontWeight: '500',
  },
  chevron: {
    fontSize: 20,
    color: '#999999',
  },

  // Logout Button
  logoutButton: {
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8B3A3',
    borderRadius: 30,
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#C0552B',
  },
  versionText: {
    fontSize: 11,
    color: '#AAAAAA',
    textAlign: 'center',
    marginTop: 16,
  },
});