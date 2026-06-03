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
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../constants/colors';
import api from '../../api/axios';
import { hasRolePermission } from '../../utils/permissions';

const HostProfile = ({ navigation, route }) => {
  const { user } = useAuth();
  const canEditOrgProfile = hasRolePermission(user, 'editOrgProfile');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    org_name: '',
    location: '',
    contact_person: '',
    phone: '',
    available_slots: 0,
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    // If org data passed via route, use it
    if (route?.params?.org) {
      setFormData({
        org_name: route.params.org.org_name || '',
        location: route.params.org.location || '',
        contact_person: route.params.org.contact_person || '',
        phone: route.params.org.phone || '',
        available_slots: route.params.org.available_slots || 0,
      });
    } else {
      // Otherwise fetch from dashboard
      fetchOrgData();
    }
  }, []);

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
          available_slots: response.data.org.available_slots || 0,
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load profile data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.org_name.trim()) newErrors.org_name = 'Organization name is required';
    if (!formData.location.trim()) newErrors.location = 'Location is required';
    if (!formData.contact_person.trim()) newErrors.contact_person = 'Contact person is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    if (formData.available_slots < 0) newErrors.available_slots = 'Available slots cannot be negative';

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
        available_slots: parseInt(formData.available_slots),
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

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  const InputField = ({ label, field, placeholder, keyboardType = 'default', maxLength }) => (
    <View style={styles.formGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, errors[field] && styles.inputError]}
        placeholder={placeholder}
        value={formData[field].toString()}
        onChangeText={value => handleInputChange(field, value)}
        keyboardType={keyboardType}
        maxLength={maxLength}
        editable={!saving && canEditOrgProfile}
      />
      {errors[field] && <Text style={styles.errorText}>{errors[field]}</Text>}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Update Profile</Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Update Profile</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>📋 Organization Information</Text>
          <Text style={styles.infoText}>
            Update your organization's details that students will see when browsing for placements.
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <InputField
            label="Organization Name"
            field="org_name"
            placeholder="e.g., Tech Solutions Ltd"
          />

          <InputField
            label="Location"
            field="location"
            placeholder="e.g., Nairobi, Kenya"
          />

          <InputField
            label="Contact Person"
            field="contact_person"
            placeholder="e.g., John Doe"
          />

          <InputField
            label="Phone Number"
            field="phone"
            placeholder="e.g., +254 712 345 678"
            keyboardType="phone-pad"
            maxLength={20}
          />

          <View style={styles.formGroup}>
            <Text style={styles.label}>Available Placement Slots</Text>
            <View style={styles.slotsInfo}>
              <Text style={styles.slotsLabel}>
                How many students can you accept for placement?
              </Text>
            </View>
            <TextInput
              style={[styles.input, errors.available_slots && styles.inputError]}
              placeholder="e.g., 5"
              value={formData.available_slots.toString()}
              onChangeText={value =>
                handleInputChange('available_slots', value.replace(/[^0-9]/g, ''))
              }
              keyboardType="number-pad"
              editable={!saving && canEditOrgProfile}
            />
            {errors.available_slots && (
              <Text style={styles.errorText}>{errors.available_slots}</Text>
            )}
            <Text style={styles.slotHint}>
              💡 Each accepted student will decrease this count. You can increase it anytime.
            </Text>
          </View>
        </View>

        {/* Save Button */}
        {!canEditOrgProfile && (
          <View style={styles.permissionCard}>
            <Text style={styles.permissionTitle}>Profile Editing Disabled</Text>
            <Text style={styles.permissionText}>
              You can view this profile, but editing is currently disabled by the administrator.
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.saveButton, (saving || !canEditOrgProfile) && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving || !canEditOrgProfile}
        >
          {saving ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes ✓</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 16,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  backButton: {
    color: 'white',
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
  form: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.secondary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.darkGray,
  },
  inputError: {
    borderColor: '#C62828',
    backgroundColor: '#FFEBEE',
  },
  errorText: {
    color: '#C62828',
    fontSize: 12,
    marginTop: 4,
  },
  slotsInfo: {
    backgroundColor: '#FFF8E1',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  slotsLabel: {
    fontSize: 12,
    color: '#666',
  },
  slotHint: {
    fontSize: 12,
    color: COLORS.primary,
    marginTop: 8,
    fontStyle: 'italic',
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  permissionCard: {
    backgroundColor: '#FFF8E1',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
  },
  permissionTitle: {
    color: COLORS.secondary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  permissionText: {
    color: '#666',
    fontSize: 13,
    lineHeight: 19,
  },
});

export default HostProfile;
