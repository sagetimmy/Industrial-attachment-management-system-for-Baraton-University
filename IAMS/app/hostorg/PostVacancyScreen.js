import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, TextInput, Alert, ActivityIndicator,
  Modal, FlatList, Platform
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { hasRolePermission } from '../../utils/permissions';

// Palette matches HostDashboard exactly
const TEAL = '#0F6E56';
const TEAL_LIGHT = '#DCEFEA';
const CORAL = '#D85A30';
const CORAL_LIGHT = '#FBEAE3';
const AMBER = '#BA7517';
const AMBER_LIGHT = '#FAEEDA';
const BG = '#F0F4F3';
const WHITE = '#FFFFFF';
const TEXT = '#111111';
const TEXT_SUB = '#888888';
const BORDER = 'rgba(0,0,0,0.07)';
const ERROR = '#C62828';

const DEPARTMENTS = [
  'Engineering', 'Finance', 'HR', 'Marketing',
  'Operations', 'Product', 'Sales', 'Support', 'Other'
];

export default function PostVacancyScreen({ navigation }) {
  const { user } = useAuth();
  const canPostPlacements = hasRolePermission(user, 'postPlacements');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showDeptDropdown, setShowDeptDropdown] = useState(false);

  // Form state
  const [roleTitle, setRoleTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [availableSlots, setAvailableSlots] = useState('1');
  const [deadline, setDeadline] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState(['']);

  const handleAddRequirement = () => {
    setRequirements([...requirements, '']);
  };

  const handleUpdateRequirement = (index, value) => {
    const updated = [...requirements];
    updated[index] = value;
    setRequirements(updated);
  };

  const handleRemoveRequirement = (index) => {
    setRequirements(requirements.filter((_, i) => i !== index));
  };

  const validateStep1 = () => {
    if (!roleTitle.trim()) {
      Alert.alert('Error', 'Please enter a role title');
      return false;
    }
    if (!department.trim()) {
      Alert.alert('Error', 'Please select a department');
      return false;
    }
    if (!availableSlots || parseInt(availableSlots) <= 0) {
      Alert.alert('Error', 'Please set a valid number of slots');
      return false;
    }
    if (!deadline.trim()) {
      Alert.alert('Error', 'Please set an application deadline');
      return false;
    }
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a job description');
      return false;
    }
    return true;
  };

  const validateRequirements = () => {
    const nonEmpty = requirements.filter(r => r.trim());
    if (nonEmpty.length === 0) {
      Alert.alert('Error', 'Please add at least one requirement');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateRequirements()) {
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handlePostVacancy = async () => {
    if (!canPostPlacements) {
      Alert.alert('Permission Disabled', 'Posting new vacancies is currently disabled for host organizations.');
      return;
    }

    if (!validateRequirements()) return;

    setLoading(true);
    try {
      const filteredRequirements = requirements.filter(r => r.trim());
      console.log('Posting vacancy with:', {
        role_title: roleTitle,
        department,
        available_slots: parseInt(availableSlots),
        application_deadline: deadline,
        description,
        requirements: filteredRequirements,
      });

      await api.post('/host-orgs/vacancies', {
        role_title: roleTitle,
        department,
        available_slots: parseInt(availableSlots),
        application_deadline: deadline,
        description,
        requirements: filteredRequirements,
      });

      Alert.alert('Success! 🎉', 'Your vacancy has been posted successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      console.error('Vacancy posting error:', err);
      console.error('Response data:', err.response?.data);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to post vacancy';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    // Draft saving logic
    Alert.alert('Draft Saved', 'Your vacancy draft has been saved.');
  };

  const progressWidth = (step / 3) * 100;

  if (!canPostPlacements) {
    return (
      <View style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Ionicons name="chevron-back" size={28} color={WHITE} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Post New Vacancy</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={s.permissionBox}>
          <MaterialCommunityIcons name="lock-outline" size={42} color={TEAL} />
          <Text style={s.permissionTitle}>Vacancy Posting Disabled</Text>
          <Text style={s.permissionText}>
            Your organization can view existing placement activity, but posting new vacancies is currently disabled.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={28} color={WHITE} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Post New Vacancy</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Progress indicator */}
      <View style={s.progressContainer}>
        <View style={s.progressBar}>
          <View style={[s.progressFillBar, { width: `${progressWidth}%` }]} />
        </View>
        <View style={s.stepIndicators}>
          {[1, 2, 3].map((num) => (
            <View
              key={num}
              style={[
                s.stepDot,
                step >= num ? { backgroundColor: TEAL } : { backgroundColor: '#E0E0E0' },
              ]}
            />
          ))}
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={s.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {step === 1 && (
          <>
            <Text style={s.stepTitle}>Basic Information</Text>
            <Text style={s.stepSubtitle}>
              Tell us about the core details of the role.
            </Text>

            {/* Role Title */}
            <Text style={s.label}>Role Title</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. Senior Software Engineer"
              placeholderTextColor={TEXT_SUB}
              value={roleTitle}
              onChangeText={setRoleTitle}
            />

            {/* Department Dropdown */}
            <Text style={s.label}>Department</Text>
            <TouchableOpacity
              style={s.dropdown}
              onPress={() => setShowDeptDropdown(!showDeptDropdown)}
            >
              <Text style={[s.dropdownText, { color: department ? TEXT : TEXT_SUB }]}>
                {department || 'Select department'}
              </Text>
              <Ionicons
                name={showDeptDropdown ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={TEAL}
              />
            </TouchableOpacity>

            {showDeptDropdown && (
              <Modal visible={showDeptDropdown} transparent animationType="fade">
                <TouchableOpacity
                  style={s.deptModalOverlay}
                  activeOpacity={1}
                  onPress={() => setShowDeptDropdown(false)}
                >
                  <TouchableOpacity activeOpacity={1} style={s.deptModalContent}>
                    <FlatList
                      data={DEPARTMENTS}
                      keyExtractor={(item) => item}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={[s.deptOption, item === department && s.deptOptionActive]}
                          onPress={() => {
                            setDepartment(item);
                            setShowDeptDropdown(false);
                          }}
                        >
                          <Text style={[s.deptOptionText, item === department && { color: TEAL, fontWeight: '700' }]}>
                            {item}
                          </Text>
                          {item === department && (
                            <MaterialCommunityIcons name="check" size={20} color={TEAL} />
                          )}
                        </TouchableOpacity>
                      )}
                      scrollEnabled
                      nestedScrollEnabled
                    />
                  </TouchableOpacity>
                </TouchableOpacity>
              </Modal>
            )}

            {/* Number of Slots */}
            <Text style={s.label}>Number of Slots</Text>
            <View style={s.slotsBox}>
              <TouchableOpacity
                style={s.slotsBtn}
                onPress={() => {
                  const val = parseInt(availableSlots) || 0;
                  setAvailableSlots(Math.max(1, val - 1).toString());
                }}
              >
                <Text style={s.slotsBtnText}>−</Text>
              </TouchableOpacity>
              <TextInput
                style={s.slotsInput}
                value={availableSlots}
                onChangeText={(val) => {
                  const num = parseInt(val) || 1;
                  setAvailableSlots(Math.max(1, num).toString());
                }}
                keyboardType="number-pad"
              />
              <TouchableOpacity
                style={s.slotsBtn}
                onPress={() => {
                  const val = parseInt(availableSlots) || 0;
                  setAvailableSlots((val + 1).toString());
                }}
              >
                <Text style={s.slotsBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            {/* Application Deadline */}
            <Text style={s.label}>Application Deadline</Text>
            <TextInput
              style={s.input}
              placeholder="mm/dd/yyyy"
              placeholderTextColor={TEXT_SUB}
              value={deadline}
              onChangeText={setDeadline}
            />

            {/* Description */}
            <Text style={s.label}>Description</Text>
            <TextInput
              style={s.textarea}
              placeholder="Describe the responsibilities and day-to-day tasks..."
              placeholderTextColor={TEXT_SUB}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={5}
            />
          </>
        )}

        {step === 2 && (
          <>
            <Text style={s.stepTitle}>Key Requirements</Text>
            <Text style={s.stepSubtitle}>
              Add the skills and experience needed for this role.
            </Text>

            {requirements.map((req, index) => (
              <View key={index} style={s.requirementItem}>
                <TouchableOpacity
                  style={[s.requirementCheck, req.trim() && s.requirementCheckActive]}
                  disabled
                >
                  {req.trim() && (
                    <MaterialCommunityIcons name="check" size={16} color={TEAL} />
                  )}
                </TouchableOpacity>
                <TextInput
                  style={[s.requirementInput, { flex: 1 }]}
                  placeholder="Type a requirement..."
                  placeholderTextColor={TEXT_SUB}
                  value={req}
                  onChangeText={(val) => handleUpdateRequirement(index, val)}
                />
                {requirements.length > 1 && (
                  <TouchableOpacity
                    style={s.requirementRemove}
                    onPress={() => handleRemoveRequirement(index)}
                  >
                    <MaterialCommunityIcons name="close" size={20} color={CORAL} />
                  </TouchableOpacity>
                )}
              </View>
            ))}

            <TouchableOpacity
              style={s.addReqBtn}
              onPress={handleAddRequirement}
            >
              <Text style={s.addReqBtnText}>+ Add Requirement</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 3 && (
          <>
            <Text style={s.stepTitle}>Review & Post</Text>
            <Text style={s.stepSubtitle}>
              Review your vacancy details before posting.
            </Text>

            <View style={s.reviewCard}>
              <View style={s.reviewRow}>
                <Text style={s.reviewLabel}>Role Title:</Text>
                <Text style={s.reviewValue}>{roleTitle}</Text>
              </View>
              <View style={s.reviewRow}>
                <Text style={s.reviewLabel}>Department:</Text>
                <Text style={s.reviewValue}>{department}</Text>
              </View>
              <View style={s.reviewRow}>
                <Text style={s.reviewLabel}>Slots:</Text>
                <Text style={s.reviewValue}>{availableSlots}</Text>
              </View>
              <View style={s.reviewRow}>
                <Text style={s.reviewLabel}>Deadline:</Text>
                <Text style={s.reviewValue}>{deadline}</Text>
              </View>
            </View>

            <View style={s.reviewCard}>
              <Text style={s.reviewSubtitle}>Description</Text>
              <Text style={s.reviewDesc}>{description}</Text>
            </View>

            <View style={s.reviewCard}>
              <Text style={s.reviewSubtitle}>Requirements</Text>
              {requirements
                .filter((r) => r.trim())
                .map((req, idx) => (
                  <View key={idx} style={s.reviewReqItem}>
                    <Text style={s.reviewReqBullet}>✓</Text>
                    <Text style={s.reviewReqText}>{req}</Text>
                  </View>
                ))}
            </View>
          </>
        )}
      </ScrollView>

      {/* Buttons */}
      <View style={s.buttonContainer}>
        {step > 1 && (
          <TouchableOpacity
            style={s.backNavBtn}
            onPress={handleBack}
          >
            <Text style={s.backNavBtnText}>← Back</Text>
          </TouchableOpacity>
        )}

        {step < 3 ? (
          <TouchableOpacity
            style={[s.nextBtn, { marginLeft: step > 1 ? 12 : 0 }, step === 1 && { flex: 1 }]}
            onPress={handleNext}
          >
            <Text style={s.nextBtnText}>Next</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              style={s.draftBtn}
              onPress={handleSaveDraft}
            >
              <Text style={s.draftBtnText}>Save Draft</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.postBtn, { marginLeft: 12 }]}
              disabled={loading}
              onPress={handlePostVacancy}
            >
              {loading ? (
                <ActivityIndicator color={WHITE} />
              ) : (
                <Text style={s.postBtnText}>Post Vacancy →</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: {
    backgroundColor: TEAL,
    paddingTop: 16, paddingBottom: 16, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: '700', flex: 1, textAlign: 'center', color: WHITE },

  progressContainer: { paddingHorizontal: 16, paddingVertical: 16 },
  progressBar: { height: 4, backgroundColor: '#E0E0E0', borderRadius: 2, overflow: 'hidden', marginBottom: 12 },
  progressFillBar: { height: '100%', borderRadius: 2, backgroundColor: TEAL },
  stepIndicators: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  stepDot: { width: 8, height: 8, borderRadius: 4 },

  content: { flex: 1, paddingHorizontal: 16 },
  stepTitle: { fontSize: 18, fontWeight: '700', marginTop: 20, marginBottom: 4, color: TEXT },
  stepSubtitle: { fontSize: 14, marginBottom: 20, color: TEXT_SUB },

  label: { fontSize: 14, fontWeight: '600', marginTop: 16, marginBottom: 8, color: TEXT },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14, backgroundColor: WHITE, color: TEXT, borderColor: BORDER },
  textarea: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14, textAlignVertical: 'top', minHeight: 100, backgroundColor: WHITE, color: TEXT, borderColor: BORDER },

  dropdown: { borderWidth: 1, borderRadius: 10, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: WHITE, borderColor: BORDER },
  dropdownText: { fontSize: 14, flex: 1 },
  deptModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
  deptModalContent: { borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '70%', paddingBottom: 16, backgroundColor: WHITE },
  deptOption: { flexDirection: 'row', padding: 12, alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  deptOptionActive: { backgroundColor: TEAL_LIGHT },
  deptOptionText: { fontSize: 14, flex: 1, color: TEXT },

  slotsBox: { flexDirection: 'row', borderWidth: 1, borderRadius: 10, alignItems: 'center', paddingHorizontal: 8, backgroundColor: WHITE, borderColor: BORDER },
  slotsBtn: { borderWidth: 1, borderRadius: 6, width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderColor: BORDER },
  slotsBtnText: { fontSize: 18, fontWeight: '600', color: TEXT },
  slotsInput: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: TEXT },

  requirementItem: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  requirementCheck: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center' },
  requirementCheckActive: { backgroundColor: TEAL_LIGHT, borderColor: TEAL },
  requirementInput: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 13, backgroundColor: WHITE, color: TEXT, borderColor: BORDER },
  requirementRemove: { padding: 6 },
  addReqBtn: { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 10, paddingVertical: 12, marginTop: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: WHITE, borderColor: TEAL },
  addReqBtnText: { fontSize: 14, fontWeight: '600', color: TEAL },

  reviewCard: { borderRadius: 10, padding: 14, marginTop: 12, backgroundColor: WHITE, borderWidth: 0.5, borderColor: BORDER },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  reviewLabel: { fontSize: 12, fontWeight: '600', color: TEXT_SUB },
  reviewValue: { fontSize: 13, fontWeight: '700', textAlign: 'right', color: TEXT },
  reviewSubtitle: { fontSize: 13, fontWeight: '700', marginBottom: 8, color: TEXT },
  reviewDesc: { fontSize: 13, lineHeight: 20, color: TEXT_SUB },
  reviewReqItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  reviewReqBullet: { fontSize: 14, fontWeight: '700', marginTop: 2, color: TEAL },
  reviewReqText: { fontSize: 13, flex: 1, color: TEXT },

  buttonContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 14, gap: 12, backgroundColor: BG },
  backNavBtn: { borderWidth: 1.5, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center', minWidth: 60, borderColor: BORDER },
  backNavBtnText: { fontSize: 13, fontWeight: '600', color: TEXT },
  nextBtn: { flex: 1, borderRadius: 10, paddingVertical: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: TEAL },
  nextBtnText: { fontSize: 14, fontWeight: '700', color: WHITE },
  draftBtn: { borderWidth: 1.5, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 20, justifyContent: 'center', alignItems: 'center', borderColor: TEAL },
  draftBtnText: { fontSize: 13, fontWeight: '700', color: TEAL },
  postBtn: { flex: 1, borderRadius: 10, paddingVertical: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: CORAL },
  postBtnText: { fontSize: 14, fontWeight: '700', color: WHITE },
  permissionBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  permissionTitle: { fontSize: 18, fontWeight: '700', marginTop: 14, marginBottom: 8, color: TEXT },
  permissionText: { fontSize: 14, lineHeight: 21, textAlign: 'center', color: TEXT_SUB },
});