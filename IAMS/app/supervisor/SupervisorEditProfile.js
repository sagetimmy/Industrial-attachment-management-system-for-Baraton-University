import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert,
  ActivityIndicator, Image, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

const NAVY = '#0F2419';
const TEAL = '#1B7A65';
const TEAL_LIGHT = '#E1F5EE';
const BG = '#EEF2F0';
const SURFACE = '#FFFFFF';
const TEXT = '#181D1B';
const TEXT_SUB = '#6E7976';
const BORDER = '#DCE3E0';
const DISABLED_BG = '#EEF2F0';

export default function SupervisorEditProfile({ navigation }) {
  const { user, fetchUserProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [profile, setProfile] = useState({
    full_name: '',
    title: '',
    department: '',
    phone: '',
    email: '',
    avatar_url: null,
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get('/supervisors/dashboard');
      const data = res.data?.supervisor || {};
      setProfile({
        full_name: user?.full_name || data.full_name || '',
        title: data.title || '',
        department: data.department || user?.department || '',
        phone: data.phone || user?.phone || '',
        email: user?.email || data.email || '',
        avatar_url: user?.avatar_url || data.photo_url || null,
      });
    } catch (err) {
      setProfile(prev => ({
        ...prev,
        full_name: user?.full_name || '',
        email: user?.email || '',
        avatar_url: user?.avatar_url || null,
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleChangePhoto = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Please allow photo library access to update your photo.');
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

      const res = await api.post('/avatar', photoFormData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setProfile(prev => ({ ...prev, avatar_url: res.data.avatar_url }));
      await fetchUserProfile();
    } catch (err) {
      const message = err.response?.data?.message || 'Could not upload photo. Please try again.';
      Alert.alert('Upload Failed', message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.put('/supervisors/profile', {
        title: profile.title,
        department: profile.department,
        phone: profile.phone,
      });

      await fetchUserProfile();

      Alert.alert('Success', 'Profile updated successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const initials = profile.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'S';

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={{ width: 22 }} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={TEAL} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <TouchableOpacity onPress={() => Alert.alert('More Options', 'Nothing here yet.')}>
            <MaterialCommunityIcons name="dots-vertical" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <TouchableOpacity
              style={styles.avatarCircle}
              onPress={handleChangePhoto}
              disabled={uploadingPhoto}
              activeOpacity={0.8}
            >
              {profile.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{initials}</Text>
              )}

              {uploadingPhoto && (
                <View style={styles.avatarLoadingOverlay}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                </View>
              )}

              <View style={styles.cameraBadge}>
                <Ionicons name="camera" size={13} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            <Text style={styles.avatarHint}>Tap to update photo</Text>
          </View>

          {/* Full Name — locked */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>FULL NAME</Text>
            <View style={[styles.input, styles.inputDisabled]}>
              <Text style={styles.disabledText}>{profile.full_name || 'Not provided'}</Text>
            </View>
          </View>

          {/* Professional Title */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>PROFESSIONAL TITLE</Text>
            <TextInput
              style={styles.input}
              value={profile.title}
              onChangeText={value => handleChange('title', value)}
              placeholder="e.g., Professor"
              placeholderTextColor={TEXT_SUB}
              editable={!saving}
            />
          </View>

          {/* Department */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>DEPARTMENT</Text>
            <TextInput
              style={styles.input}
              value={profile.department}
              onChangeText={value => handleChange('department', value)}
              placeholder="e.g., Computer Science & IT"
              placeholderTextColor={TEXT_SUB}
              editable={!saving}
            />
          </View>

          {/* Phone Number */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>PHONE NUMBER</Text>
            <TextInput
              style={styles.input}
              value={profile.phone}
              onChangeText={value => handleChange('phone', value)}
              placeholder="+254 700 000 000"
              placeholderTextColor={TEXT_SUB}
              keyboardType="phone-pad"
              editable={!saving}
            />
          </View>

          {/* Institution Email — locked, this is the auth login credential */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>INSTITUTION EMAIL</Text>
            <View style={[styles.input, styles.inputDisabled]}>
              <Text style={styles.disabledText}>{profile.email || 'Not provided'}</Text>
            </View>
          </View>

          {/* Institutional info card */}
          <View style={styles.infoCard}>
            <View style={styles.infoIconWrap}>
              <Ionicons name="shield-checkmark" size={18} color={TEAL} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>Institutional Information</Text>
              <Text style={styles.infoText}>
                Your full name and staff ID are verified by the administration.
                Contact the registrar for changes to core academic data.
              </Text>
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        <View style={styles.saveBar}>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: NAVY,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },

  scrollContent: { paddingHorizontal: 16, paddingTop: 24 },

  avatarSection: { alignItems: 'center', marginBottom: 28 },
  avatarCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: TEAL_LIGHT,
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { fontSize: 34, fontWeight: '700', color: TEAL },
  avatarLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center',
  },
  cameraBadge: {
    position: 'absolute', bottom: -2, right: -2,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: TEAL,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: BG,
  },
  avatarHint: { marginTop: 10, fontSize: 13, color: TEXT_SUB },

  formGroup: { marginBottom: 20 },
  label: {
    fontSize: 11, fontWeight: '700', color: TEXT_SUB,
    letterSpacing: 0.6, marginBottom: 8, textTransform: 'uppercase',
  },
  input: {
    backgroundColor: SURFACE,
    borderWidth: 1, borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, color: TEXT,
  },
  inputDisabled: {
    backgroundColor: DISABLED_BG,
    justifyContent: 'center',
  },
  disabledText: { fontSize: 15, color: TEXT_SUB },

  infoCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: SURFACE,
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: TEAL,
    marginTop: 4,
  },
  infoIconWrap: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: TEAL_LIGHT,
    justifyContent: 'center', alignItems: 'center',
  },
  infoTitle: { fontSize: 14, fontWeight: '700', color: TEXT, marginBottom: 4 },
  infoText: { fontSize: 12, color: TEXT_SUB, lineHeight: 18 },

  saveBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: BG,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20,
    borderTopWidth: 1, borderTopColor: BORDER,
  },
  saveButton: {
    flexDirection: 'row', gap: 8,
    backgroundColor: TEAL,
    borderRadius: 30,
    paddingVertical: 15,
    justifyContent: 'center', alignItems: 'center',
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});