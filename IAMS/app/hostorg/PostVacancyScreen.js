import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, TextInput, Alert, ActivityIndicator,
  Modal, FlatList, Platform
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../api/axios';
import { COLORS } from '../../constants/colors';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { hasRolePermission } from '../../utils/permissions';

const DEPARTMENTS = [
  'Engineering', 'Finance', 'HR', 'Marketing',
  'Operations', 'Product', 'Sales', 'Support', 'Other'
];

export default function PostVacancyScreen({ navigation }) {
  const { user } = useAuth();
  const { theme } = useTheme();
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
      <View style={[s.container, { backgroundColor: theme.background }]}>
        <View style={[s.header, { backgroundColor: theme.secondary }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Ionicons name="chevron-back" size={28} color={theme.white} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: theme.white }]}>Post New Vacancy</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={s.permissionBox}>
          <MaterialCommunityIcons name="lock-outline" size={42} color={theme.secondary} />
          <Text style={[s.permissionTitle, { color: theme.text }]}>Vacancy Posting Disabled</Text>
          <Text style={[s.permissionText, { color: theme.textSecondary }]}>
            Your organization can view existing placement activity, but posting new vacancies is currently disabled.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: theme.secondary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={28} color={theme.white} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: theme.white }]}>Post New Vacancy</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Progress indicator */}
      <View style={s.progressContainer}>
        <View style={s.progressBar}>
          <View style={[s.progressFill, { width: `${progressWidth}%`, backgroundColor: theme.secondary }]} />
        </View>
        <View style={s.stepIndicators}>
          {[1, 2, 3].map((num) => (
            <View
              key={num}
              style={[
                s.stepDot,
                step >= num && { backgroundColor: theme.secondary },
                step < num && { backgroundColor: '#E0E0E0' },
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
            <Text style={[s.stepTitle, { color: theme.text }]}>Basic Information</Text>
            <Text style={[s.stepSubtitle, { color: theme.textSecondary }]}>
              Tell us about the core details of the role.
            </Text>

            {/* Role Title */}
            <Text style={[s.label, { color: theme.text }]}>Role Title</Text>
            <TextInput
              style={[s.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.gray }]}
              placeholder="e.g. Senior Software Engineer"
              placeholderTextColor={theme.textSecondary}
              value={roleTitle}
              onChangeText={setRoleTitle}
            />

            {/* Department Dropdown */}
            <Text style={[s.label, { color: theme.text }]}>Department</Text>
            <TouchableOpacity
              style={[s.dropdown, { backgroundColor: theme.surface, borderColor: theme.gray }]}
              onPress={() => setShowDeptDropdown(!showDeptDropdown)}
            >
              <Text style={[{ color: department ? theme.text : theme.textSecondary }, s.dropdownText]}>
                {department || 'Select department'}
              </Text>
              <Ionicons
                name={showDeptDropdown ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={theme.secondary}
              />
            </TouchableOpacity>

            {showDeptDropdown && (
              <Modal visible={showDeptDropdown} transparent animationType="fade">
                <TouchableOpacity
                  style={s.deptModalOverlay}
                  activeOpacity={1}
                  onPress={() => setShowDeptDropdown(false)}
                >
                  <TouchableOpacity activeOpacity={1} style={[s.deptModalContent, { backgroundColor: theme.surface }]}>
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
                          <Text style={[s.deptOptionText, { color: theme.text }, item === department && { color: theme.secondary, fontWeight: '700' }]}>
                            {item}
                          </Text>
                          {item === department && (
                            <MaterialCommunityIcons name="check" size={20} color={theme.secondary} />
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
            <Text style={[s.label, { color: theme.text }]}>Number of Slots</Text>
            <View style={[s.slotsBox, { backgroundColor: theme.surface, borderColor: theme.gray }]}>
              <TouchableOpacity
                style={[s.slotsBtn, { borderColor: theme.gray }]}
                onPress={() => {
                  const val = parseInt(availableSlots) || 0;
                  setAvailableSlots(Math.max(1, val - 1).toString());
                }}
              >
                <Text style={[s.slotsBtnText, { color: theme.text }]}>−</Text>
              </TouchableOpacity>
              <TextInput
                style={[s.slotsInput, { color: theme.text }]}
                value={availableSlots}
                onChangeText={(val) => {
                  const num = parseInt(val) || 1;
                  setAvailableSlots(Math.max(1, num).toString());
                }}
                keyboardType="number-pad"
              />
              <TouchableOpacity
                style={[s.slotsBtn, { borderColor: theme.gray }]}
                onPress={() => {
                  const val = parseInt(availableSlots) || 0;
                  setAvailableSlots((val + 1).toString());
                }}
              >
                <Text style={[s.slotsBtnText, { color: theme.text }]}>+</Text>
              </TouchableOpacity>
            </View>

            {/* Application Deadline */}
            <Text style={[s.label, { color: theme.text }]}>Application Deadline</Text>
            <TextInput
              style={[s.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.gray }]}
              placeholder="mm/dd/yyyy"
              placeholderTextColor={theme.textSecondary}
              value={deadline}
              onChangeText={setDeadline}
            />

            {/* Description */}
            <Text style={[s.label, { color: theme.text }]}>Description</Text>
            <TextInput
              style={[s.textarea, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.gray }]}
              placeholder="Describe the responsibilities and day-to-day tasks..."
              placeholderTextColor={theme.textSecondary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={5}
            />
          </>
        )}

        {step === 2 && (
          <>
            <Text style={[s.stepTitle, { color: theme.text }]}>Key Requirements</Text>
            <Text style={[s.stepSubtitle, { color: theme.textSecondary }]}>
              Add the skills and experience needed for this role.
            </Text>

            {requirements.map((req, index) => (
              <View key={index} style={s.requirementItem}>
                <TouchableOpacity
                  style={[s.requirementCheck, req.trim() && s.requirementCheckActive]}
                  disabled
                >
                  {req.trim() && (
                    <MaterialCommunityIcons name="check" size={16} color={theme.secondary} />
                  )}
                </TouchableOpacity>
                <TextInput
                  style={[s.requirementInput, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.gray, flex: 1 }]}
                  placeholder="Type a requirement..."
                  placeholderTextColor={theme.textSecondary}
                  value={req}
                  onChangeText={(val) => handleUpdateRequirement(index, val)}
                />
                {requirements.length > 1 && (
                  <TouchableOpacity
                    style={s.requirementRemove}
                    onPress={() => handleRemoveRequirement(index)}
                  >
                    <MaterialCommunityIcons name="close" size={20} color={theme.primary} />
                  </TouchableOpacity>
                )}
              </View>
            ))}

            <TouchableOpacity
              style={[s.addReqBtn, { backgroundColor: theme.surface, borderColor: theme.secondary }]}
              onPress={handleAddRequirement}
            >
              <Text style={[s.addReqBtnText, { color: theme.secondary }]}>+ Add Requirement</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 3 && (
          <>
            <Text style={[s.stepTitle, { color: theme.text }]}>Review & Post</Text>
            <Text style={[s.stepSubtitle, { color: theme.textSecondary }]}>
              Review your vacancy details before posting.
            </Text>

            <View style={[s.reviewCard, { backgroundColor: theme.surface }]}>
              <View style={s.reviewRow}>
                <Text style={[s.reviewLabel, { color: theme.textSecondary }]}>Role Title:</Text>
                <Text style={[s.reviewValue, { color: theme.text }]}>{roleTitle}</Text>
              </View>
              <View style={s.reviewRow}>
                <Text style={[s.reviewLabel, { color: theme.textSecondary }]}>Department:</Text>
                <Text style={[s.reviewValue, { color: theme.text }]}>{department}</Text>
              </View>
              <View style={s.reviewRow}>
                <Text style={[s.reviewLabel, { color: theme.textSecondary }]}>Slots:</Text>
                <Text style={[s.reviewValue, { color: theme.text }]}>{availableSlots}</Text>
              </View>
              <View style={s.reviewRow}>
                <Text style={[s.reviewLabel, { color: theme.textSecondary }]}>Deadline:</Text>
                <Text style={[s.reviewValue, { color: theme.text }]}>{deadline}</Text>
              </View>
            </View>

            <View style={[s.reviewCard, { backgroundColor: theme.surface }]}>
              <Text style={[s.reviewSubtitle, { color: theme.text }]}>Description</Text>
              <Text style={[s.reviewDesc, { color: theme.textSecondary }]}>{description}</Text>
            </View>

            <View style={[s.reviewCard, { backgroundColor: theme.surface }]}>
              <Text style={[s.reviewSubtitle, { color: theme.text }]}>Requirements</Text>
              {requirements
                .filter((r) => r.trim())
                .map((req, idx) => (
                  <View key={idx} style={s.reviewReqItem}>
                    <Text style={[s.reviewReqBullet, { color: theme.secondary }]}>✓</Text>
                    <Text style={[s.reviewReqText, { color: theme.text }]}>{req}</Text>
                  </View>
                ))}
            </View>
          </>
        )}
      </ScrollView>

      {/* Buttons */}
      <View style={[s.buttonContainer, { backgroundColor: theme.background }]}>
        {step > 1 && (
          <TouchableOpacity
            style={[s.backNavBtn, { borderColor: theme.gray }]}
            onPress={handleBack}
          >
            <Text style={[s.backNavBtnText, { color: theme.text }]}>← Back</Text>
          </TouchableOpacity>
        )}

        {step < 3 ? (
          <TouchableOpacity
            style={[s.nextBtn, { backgroundColor: theme.secondary, marginLeft: step > 1 ? 12 : 0 }, step === 1 && { flex: 1 }]}
            onPress={handleNext}
          >
            <Text style={[s.nextBtnText, { color: theme.white }]}>Next</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              style={[s.draftBtn, { borderColor: theme.secondary }]}
              onPress={handleSaveDraft}
            >
              <Text style={[s.draftBtnText, { color: theme.secondary }]}>Save Draft</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.postBtn, { backgroundColor: theme.secondary, marginLeft: 12 }]}
              disabled={loading}
              onPress={handlePostVacancy}
            >
              {loading ? (
                <ActivityIndicator color={theme.white} />
              ) : (
                <Text style={[s.postBtnText, { color: theme.white }]}>Post Vacancy →</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 16, paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: '700', flex: 1, textAlign: 'center' },

  progressContainer: { paddingHorizontal: 16, paddingVertical: 16 },
  progressBar: { height: 4, backgroundColor: '#E0E0E0', borderRadius: 2, overflow: 'hidden', marginBottom: 12 },
  progressFill: { height: '100%', borderRadius: 2 },
  stepIndicators: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  stepDot: { width: 8, height: 8, borderRadius: 4 },

  content: { flex: 1, paddingHorizontal: 16 },
  stepTitle: { fontSize: 18, fontWeight: '700', marginTop: 20, marginBottom: 4 },
  stepSubtitle: { fontSize: 14, marginBottom: 20 },

  label: { fontSize: 14, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14 },
  textarea: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14, textAlignVertical: 'top', minHeight: 100 },

  dropdown: { borderWidth: 1, borderRadius: 10, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dropdownText: { fontSize: 14, flex: 1 },
  deptModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
  deptModalContent: { borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '70%', paddingBottom: 16 },
  deptOption: { flexDirection: 'row', padding: 12, alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  deptOptionActive: { backgroundColor: 'rgba(0,0,0,0.05)' },
  deptOptionText: { fontSize: 14, flex: 1 },

  slotsBox: { flexDirection: 'row', borderWidth: 1, borderRadius: 10, alignItems: 'center', paddingHorizontal: 8 },
  slotsBtn: { borderWidth: 1, borderRadius: 6, width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  slotsBtnText: { fontSize: 18, fontWeight: '600' },
  slotsInput: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700' },

  requirementItem: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  requirementCheck: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center' },
  requirementCheckActive: { backgroundColor: 'rgba(15, 110, 86, 0.1)', borderColor: '#0F6E56' },
  requirementInput: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 13 },
  requirementRemove: { padding: 6 },
  addReqBtn: { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 10, paddingVertical: 12, marginTop: 16, justifyContent: 'center', alignItems: 'center' },
  addReqBtnText: { fontSize: 14, fontWeight: '600' },

  reviewCard: { borderRadius: 10, padding: 14, marginTop: 12 },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  reviewLabel: { fontSize: 12, fontWeight: '600' },
  reviewValue: { fontSize: 13, fontWeight: '700', textAlign: 'right' },
  reviewSubtitle: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  reviewDesc: { fontSize: 13, lineHeight: 20 },
  reviewReqItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  reviewReqBullet: { fontSize: 14, fontWeight: '700', marginTop: 2 },
  reviewReqText: { fontSize: 13, flex: 1 },

  buttonContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  backNavBtn: { borderWidth: 1.5, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center', minWidth: 60 },
  backNavBtnText: { fontSize: 13, fontWeight: '600' },
  nextBtn: { flex: 1, borderRadius: 10, paddingVertical: 12, justifyContent: 'center', alignItems: 'center' },
  nextBtnText: { fontSize: 14, fontWeight: '700' },
  draftBtn: { borderWidth: 1.5, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 20, justifyContent: 'center', alignItems: 'center' },
  draftBtnText: { fontSize: 13, fontWeight: '700' },
  postBtn: { flex: 1, borderRadius: 10, paddingVertical: 12, justifyContent: 'center', alignItems: 'center' },
  postBtnText: { fontSize: 14, fontWeight: '700' },
  permissionBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  permissionTitle: { fontSize: 18, fontWeight: '700', marginTop: 14, marginBottom: 8 },
  permissionText: { fontSize: 14, lineHeight: 21, textAlign: 'center' },
});
