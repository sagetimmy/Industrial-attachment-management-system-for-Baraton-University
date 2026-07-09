import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { hasRolePermission } from '../../utils/permissions';

// Exact palette from the design mockup — hardcoded intentionally so this
// screen always matches the spec regardless of what constants/colors.js defines.
const PALETTE = {
  header: '#0E4E3B',      // dark teal header bar
  headerText: '#FFFFFF',
  bg: '#EEF2F0',           // page background
  logoBg: '#0E4E3B',
  orange: '#E8711A',       // camera badge, save button
  cardWhite: '#FFFFFF',
  borderGray: '#DDE3DF',
  labelGray: '#7A7A7A',
  textDark: '#1A1A1A',
  hintGray: '#8A8A8A',
  permissionBg: '#FCEFD6',
  permissionTitle: '#7A3B12',
  permissionText: '#8A6D4C',
  errorRed: '#C62828',
  cancelBorder: '#D5D5D5',
  cancelText: '#6B6B6B',
};

const InputField = ({ label, field, placeholder, keyboardType = 'default', maxLength, icon, value, onChangeText, error, editable, iconColor }) => (
  <View style={styles.formGroup}>
    <Text style={styles.label}>{label.toUpperCase()}</Text>
    <View style={[styles.inputWrap, error && styles.inputError]}>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#A8A8A8"
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        maxLength={maxLength}
        editable={editable}
      />
      {icon && <Ionicons name={icon} size={18} color={iconColor} style={styles.inputIcon} />}
    </View>
    {error && <Text style={styles.errorText}>{error}</Text>}
  </View>
);

const HostEditProfile = ({ navigation, route }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [orgLogoUrl, setOrgLogoUrl] = useState(null);
  // Real permissions from the backend (same source /host-orgs/dashboard uses
  // for its requireRolePermission middleware). We fetch this ourselves
  // instead of trusting whatever is on the AuthContext `user` object, since
  // that can be stale/empty and silently made the "Change Logo" button look
  // enabled when the backend would reject the upload with a 403.
  const [permissions, setPermissions] = useState(null);

  const [formData, setFormData] = useState({
    org_name: '',
    location: '',
    contact_person: '',
    phone: '',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (route?.params?.org) {
      setFormData({
        org_name: route.params.org.org_name || '',
        location: route.params.org.location || '',
        contact_person: route.params.org.contact_person || '',
        phone: route.params.org.phone || '',
      });
      setOrgLogoUrl(route.params.org.org_logo_url || null);
      // route.params only ever carries `org`, never `permissions`, so we
      // still need to fetch the real permissions ourselves here.
      fetchPermissions();
    } else {
      fetchOrgData();
    }
  }, []);

  const fetchPermissions = async () => {
    try {
      const response = await api.get('/host-orgs/dashboard');
      setPermissions(response.data?.permissions || null);
    } catch (error) {
      // Non-fatal: canEditOrgProfile below just falls back to denying edits
      // if we couldn't confirm permissions.
      console.error('Failed to fetch permissions:', error);
    }
  };

  const fetchOrgData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/host-orgs/dashboard');
      if (response.data.org) {
        setFormData({
          org_name: response.data.org.org_name || '',
          location: response.data.org.location || '',
          contact_person: response.data.org.contact_person || '',
          phone: response.data.org.phone || '',
        });
        setOrgLogoUrl(response.data.org.org_logo_url || null);
      }
      setPermissions(response.data?.permissions || null);
    } catch (error) {
      Alert.alert('Error', 'Failed to load profile data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Merge real fetched permissions over whatever's on the auth user object,
  // same pattern as HostSettings — this is what makes canEditOrgProfile
  // actually agree with what the backend will allow.
  const effectiveUser = { ...user, permissions: permissions || user?.permissions };
  const canEditOrgProfile = hasRolePermission(effectiveUser, 'editOrgProfile');

  const validateForm = () => {
    const newErrors = {};

    if (!formData.org_name.trim()) newErrors.org_name = 'Organization name is required';
    if (!formData.location.trim()) newErrors.location = 'Location is required';
    if (!formData.contact_person.trim()) newErrors.contact_person = 'Contact person is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!canEditOrgProfile) {
      Alert.alert('Permission Disabled', 'Editing the organization profile is currently disabled.');
      return;
    }

    if (!validateForm()) return;

    try {
      setSaving(true);
      await api.put('/host-orgs/profile', {
        org_name: formData.org_name,
        location: formData.location,
        contact_person: formData.contact_person,
        phone: formData.phone,
      });

      Alert.alert('Success', 'Profile updated successfully!', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to update profile'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleChangeLogo = async () => {
    if (!canEditOrgProfile) {
      Alert.alert('Permission Disabled', 'Editing the organization profile is currently disabled.');
      return;
    }

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Please allow photo library access to upload a logo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled) return;

      setUploadingLogo(true);

      const manipulated = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 512, height: 512 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );

      const logoFormData = new FormData();
      logoFormData.append('logo', {
        uri: manipulated.uri,
        name: 'logo.jpg',
        type: 'image/jpeg',
      });

      const response = await api.post('/host-orgs/logo', logoFormData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setOrgLogoUrl(response.data.org_logo_url);
    } catch (error) {
      const message = error.response?.data?.message || 'Could not upload logo. Please try again.';
      Alert.alert('Upload Failed', message);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={24} color={PALETTE.headerText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Update Profile</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={PALETTE.orange} />
        </View>
      </View>
    );
  }

  const orgInitial = formData.org_name?.trim().charAt(0).toUpperCase() || '?';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={PALETTE.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Update Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoWrapper}>
          <TouchableOpacity
            style={styles.logoCircle}
            onPress={handleChangeLogo}
            disabled={uploadingLogo || !canEditOrgProfile}
            activeOpacity={0.8}
          >
            {orgLogoUrl ? (
              <Image source={{ uri: orgLogoUrl }} style={styles.logoImage} />
            ) : (
              <Text style={styles.logoInitial}>{orgInitial}</Text>
            )}

            {uploadingLogo && (
              <View style={styles.logoLoadingOverlay}>
                <ActivityIndicator size="small" color="white" />
              </View>
            )}

            {canEditOrgProfile && (
              <View style={styles.cameraBadge}>
                <Ionicons name="camera" size={14} color="white" />
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.logoHint}>
            {canEditOrgProfile ? 'Tap to change logo' : 'Organization Logo'}
          </Text>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoTitleRow}>
            <Ionicons name="clipboard-outline" size={20} color={PALETTE.header} />
            <Text style={styles.infoTitle}>Organization Information</Text>
          </View>
          <Text style={styles.infoText}>
            Ensure your organizational details are up to date. This information is visible to students looking for internship placements.
          </Text>
        </View>

        {/* Form */}
        <InputField
          label="Organization Name"
          field="org_name"
          placeholder="e.g., Tech Solutions Ltd"
          value={formData.org_name}
          onChangeText={value => handleInputChange('org_name', value)}
          error={errors.org_name}
          editable={!saving && canEditOrgProfile}
        />

        <InputField
          label="Location"
          field="location"
          placeholder="e.g., Nairobi, Kenya"
          icon="location-outline"
          iconColor={PALETTE.header}
          value={formData.location}
          onChangeText={value => handleInputChange('location', value)}
          error={errors.location}
          editable={!saving && canEditOrgProfile}
        />

        <InputField
          label="Contact Person"
          field="contact_person"
          placeholder="e.g., John Doe"
          value={formData.contact_person}
          onChangeText={value => handleInputChange('contact_person', value)}
          error={errors.contact_person}
          editable={!saving && canEditOrgProfile}
        />

        <InputField
          label="Phone Number"
          field="phone"
          placeholder="e.g., +254 712 345 678"
          keyboardType="phone-pad"
          maxLength={20}
          icon="call-outline"
          iconColor={PALETTE.header}
          value={formData.phone}
          onChangeText={value => handleInputChange('phone', value)}
          error={errors.phone}
          editable={!saving && canEditOrgProfile}
        />

        {/* Permission Disabled */}
        {!canEditOrgProfile && (
          <View style={styles.permissionCard}>
            <View style={styles.permissionTitleRow}>
              <Ionicons name="warning-outline" size={18} color={PALETTE.permissionTitle} />
              <Text style={styles.permissionTitle}>Profile Editing Disabled</Text>
            </View>
            <Text style={styles.permissionText}>
              Permissions restricted by your primary administrator.
            </Text>
          </View>
        )}

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, (saving || !canEditOrgProfile) && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving || !canEditOrgProfile}
        >
          {saving ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <>
              <Text style={styles.saveButtonText}>Save Changes</Text>
              <Ionicons name="checkmark-circle-outline" size={20} color="white" style={{ marginLeft: 8 }} />
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={saving}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
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
  logoWrapper: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  logoCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: PALETTE.logoBg,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
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
  logoLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: PALETTE.orange,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: PALETTE.bg,
  },
  logoHint: {
    fontSize: 14,
    color: PALETTE.hintGray,
    marginTop: 10,
  },
  infoCard: {
    backgroundColor: PALETTE.cardWhite,
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: PALETTE.header,
  },
  infoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  infoTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: PALETTE.textDark,
  },
  infoText: {
    fontSize: 13.5,
    color: '#6B6B6B',
    lineHeight: 20,
  },
  formGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: PALETTE.labelGray,
    marginBottom: 8,
    letterSpacing: 0.4,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PALETTE.cardWhite,
    borderWidth: 1,
    borderColor: PALETTE.borderGray,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: PALETTE.textDark,
  },
  inputIcon: {
    marginLeft: 8,
  },
  inputError: {
    borderColor: PALETTE.errorRed,
    backgroundColor: '#FFF5F5',
  },
  errorText: {
    color: PALETTE.errorRed,
    fontSize: 12,
    marginTop: 6,
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
  saveButton: {
    flexDirection: 'row',
    backgroundColor: PALETTE.orange,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    backgroundColor: PALETTE.cardWhite,
    borderWidth: 1,
    borderColor: PALETTE.cancelBorder,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: PALETTE.cancelText,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default HostEditProfile;