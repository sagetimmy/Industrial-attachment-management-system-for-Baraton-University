import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, RefreshControl, TextInput,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import api, { requestWithRetry } from '../../api/axios';
import { COLORS } from '../../constants/colors';
import { hasRolePermission } from '../../utils/permissions';
import Spinner from '../../components/Spinner';

const formatDateDisplay = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const STEP_DESCRIPTIONS = {
  1: 'Personal & Academic Info',
  2: 'Supporting Documents',
  3: 'Review & Submit',
};

export default function ApplyScreen({ navigation }) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const canSelfPlace = hasRolePermission(user, 'selfPlacement');

  const [organizations, setOrganizations] = useState([]);
  const [myAttachment, setMyAttachment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [duration, setDuration] = useState('3');
  const [skills, setSkills] = useState('');
  const [supportingInfo, setSupportingInfo] = useState('');
  const [applications, setApplications] = useState([]);
  const [latestApplication, setLatestApplication] = useState(null);

  const [fullName, setFullName] = useState(user?.full_name || user?.name || '');
  const [regNumber, setRegNumber] = useState(user?.registration_number || user?.reg_no || '');
  const [course, setCourse] = useState(user?.course || user?.program || '');
  const [yearOfStudy, setYearOfStudy] = useState(user?.year_of_study || 1);

  const [currentStep, setCurrentStep] = useState(1);
  const [documents, setDocuments] = useState([]);

  const fetchData = async () => {
    try {
      const [orgsRes, attachRes, appsRes] = await Promise.all([
        api.get('/students/organizations'),
        api.get('/students/my-attachment'),
        api.get('/applications'),
      ]);
      setOrganizations(orgsRes.data);
      setMyAttachment(attachRes.data);
      const apps = appsRes.data?.applications || [];
      setApplications(apps);
      setLatestApplication(apps[0] || null);
    } catch (err) {
      console.error('Fetch error:', err);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const dateInputPattern = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/;
  const normalizeDateInput = (value) => {
    if (!value) return '';
    const trimmed = value.trim();
    const match = trimmed.match(dateInputPattern);
    if (!match) return value;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const normalized = new Date(Date.UTC(year, month - 1, day));
    if (
      normalized.getUTCFullYear() !== year ||
      normalized.getUTCMonth() !== month - 1 ||
      normalized.getUTCDate() !== day
    ) {
      return value;
    }
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const parseDateFromInput = (value) => {
    if (!value) return null;
    const trimmed = value.trim();
    const match = trimmed.match(dateInputPattern);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (isNaN(date.getTime())) return null;
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
      return null;
    }
    return date;
  };

  const formatDateYmd = (date) => {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const calculateEndDateFromDuration = (start, months) => {
    if (!start) return '';
    const startDateObj = parseDateFromInput(start);
    if (!startDateObj) return '';
    const endDateObj = new Date(startDateObj.getTime());
    endDateObj.setUTCMonth(endDateObj.getUTCMonth() + parseInt(months, 10));
    return formatDateYmd(endDateObj);
  };

  const handleStartDateChange = (value) => {
    const normalized = normalizeDateInput(value);
    setStartDate(normalized);
    if (normalized && duration) {
      setEndDate(calculateEndDateFromDuration(normalized, duration));
    } else {
      setEndDate('');
    }
  };

  const handleDurationChange = (months) => {
    setDuration(months);
    if (startDate) {
      setEndDate(calculateEndDateFromDuration(startDate, months));
    } else {
      setEndDate('');
    }
  };

  const handleYearCycle = () => {
    setYearOfStudy((prev) => (prev >= 4 ? 1 : prev + 1));
  };

  useEffect(() => {
    setStartDate('');
    setEndDate('');
    setSkills('');
    setSupportingInfo('');
    setDuration('3');
    setDocuments([]);
    setCurrentStep(1);
  }, [selectedOrg]);

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'image/*',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const picked = (result.assets || []).map((a) => ({
        name: a.name,
        uri: a.uri,
        mimeType: a.mimeType,
        size: a.size,
      }));
      setDocuments((prev) => [...prev, ...picked]);
    } catch (err) {
      console.error('Document pick error:', err);
      Alert.alert('Error', 'Failed to select document');
    }
  };

  const handleRemoveDocument = (index) => {
    setDocuments((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const validateStep1 = () => {
    if (!selectedOrg) {
      Alert.alert('Error', 'Please select an organization');
      return false;
    }
    if (selectedOrg.available_slots === 0) {
      Alert.alert('Error', 'This organization has no available slots');
      return false;
    }
    if (!fullName.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return false;
    }
    const normalizedStart = startDate.trim();
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!normalizedStart || !datePattern.test(normalizedStart)) {
      Alert.alert('Error', 'Please enter a valid start date (YYYY-MM-DD)');
      return false;
    }
    if (!parseDateFromInput(normalizedStart)) {
      Alert.alert('Error', 'Please enter a valid calendar date');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!skills.trim()) {
      Alert.alert('Error', 'Please add your skills');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2 && !validateStep2()) return;
    setCurrentStep((prev) => Math.min(prev + 1, 3));
  };

  const handleBackStep = () => {
    if (currentStep === 1) {
      navigation.goBack();
    } else {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleApply = async () => {
    if (!canSelfPlace) {
      Alert.alert('Permission Disabled', 'Self-placement applications are currently disabled.');
      return;
    }
    if (latestApplication && ['pending', 'more_info', 'accepted'].includes(latestApplication.status)) {
      Alert.alert('Application Pending', 'You already have an application under review.');
      return;
    }
    if (!validateStep1() || !validateStep2()) return;

    const normalizedStart = startDate.trim();
    const normalizedEnd = endDate.trim();
    const normalizedSkills = skills.trim();
    const parsedStart = parseDateFromInput(normalizedStart);
    const parsedEnd = parseDateFromInput(normalizedEnd);
    if (!parsedEnd || !parsedStart || parsedEnd < parsedStart) {
      Alert.alert('Error', 'End date must be after start date');
      return;
    }

    Alert.alert(
      'Confirm Application',
      `Apply to ${selectedOrg.org_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply',
          onPress: async () => {
            setApplying(true);
            try {
              const formData = new FormData();
              formData.append('org_id', selectedOrg.org_id);
              formData.append('full_name', fullName.trim());
              formData.append('reg_number', regNumber.trim());
              formData.append('course', course.trim());
              formData.append('year_of_study', String(yearOfStudy));
              formData.append('start_date', normalizedStart);
              formData.append('end_date', normalizedEnd);
              formData.append('skills', normalizedSkills);
              if (supportingInfo.trim()) {
                formData.append('supporting_info', supportingInfo.trim());
              }
              documents.forEach((doc) => {
                formData.append('documents', {
                  uri: doc.uri,
                  name: doc.name,
                  type: doc.mimeType || 'application/octet-stream',
                });
              });

              const res = await requestWithRetry(
                () => api.post('/applications', formData, {
                  headers: { 'Content-Type': 'multipart/form-data' },
                }),
                { retries: 3, baseDelay: 500 }
              );

              Alert.alert(
                'Application Submitted! 🎉',
                `Your application to ${selectedOrg.org_name} has been submitted.`,
                [{ text: 'OK', onPress: () => fetchData() }]
              );
              setSelectedOrg(null);
              setStartDate('');
              setEndDate('');
              setSkills('');
              setSupportingInfo('');
              setDuration('3');
              setDocuments([]);
              setCurrentStep(1);
              if (res?.data?.application) {
                setLatestApplication(res.data.application);
                setApplications((prev) => [res.data.application, ...prev]);
              }
            } catch (err) {
              console.error('Apply failed:', err);
              const message = err.response?.data?.message ||
                (err.request && !err.response
                  ? 'Network error. Please check your connection.'
                  : 'Failed to submit application');
              Alert.alert('Error', message);
            } finally {
              setApplying(false);
            }
          }
        }
      ]
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const statusColor = (status) => {
    switch (status) {
      case 'ongoing': return { bg: '#E8F5E9', text: '#2E7D32' };
      case 'pending': return { bg: '#FFF3E0', text: theme.primary };
      case 'completed': return { bg: '#E3F2FD', text: theme.secondary };
      case 'rejected': return { bg: '#FFEBEE', text: '#C62828' };
      default: return { bg: theme.surface, text: theme.textSecondary };
    }
  };

  const applicationMeta = (status) => {
    switch (status) {
      case 'accepted': return { label: 'ACCEPTED', bg: '#E8F5E9', text: '#2E7D32' };
      case 'rejected': return { label: 'REJECTED', bg: '#FFEBEE', text: '#C62828' };
      case 'more_info': return { label: 'MORE INFO', bg: '#E3F2FD', text: '#185FA5' };
      case 'pending':
      default: return { label: 'PENDING', bg: '#FFF3E0', text: theme.primary };
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.surface }]}>
        <Spinner size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading...</Text>
      </View>
    );
  }

  const showForm = (!myAttachment || myAttachment.status === 'rejected') &&
    canSelfPlace &&
    (!latestApplication || !['pending', 'more_info', 'accepted'].includes(latestApplication.status));

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ===== Top App Bar ===== */}
        <View style={[styles.topBar, { backgroundColor: theme.surface }]}>
          <View style={styles.topBarLeft}>
            <TouchableOpacity onPress={handleBackStep} style={styles.backButton}>
              <Ionicons name="arrow-back" size={22} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.screenTitle, { color: theme.text }]}>Apply for Attachment</Text>
          </View>
          <View style={styles.topBarDots}>
            {[1, 2, 3].map((step) => (
              <View
                key={step}
                style={[styles.dot, { backgroundColor: step <= currentStep ? theme.primary : theme.outlineVariant }]}
              />
            ))}
          </View>
        </View>

        {/* ===== Step Progress ===== */}
        {showForm && (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <Text style={[styles.stepLabel, { color: theme.primary }]}>STEP {currentStep} OF 3</Text>
              <Text style={[styles.stepDescription, { color: theme.textSecondary }]}>
                {STEP_DESCRIPTIONS[currentStep]}
              </Text>
            </View>
            <View style={styles.progressBar}>
              {[1, 2, 3].map((step) => (
                <View
                  key={step}
                  style={[
                    step <= currentStep ? styles.progressFill : styles.progressEmpty,
                    { backgroundColor: step <= currentStep ? theme.primary : theme.outlineVariant },
                  ]}
                />
              ))}
            </View>
          </View>
        )}

        {/* ===== Pending application / attachment status (Step 1 only) ===== */}
        {currentStep === 1 && myAttachment && (
          <View style={[styles.statusCard, { backgroundColor: theme.background, borderLeftColor: theme.primary }]}>
            <Text style={[styles.statusTitle, { color: theme.textSecondary }]}>Your Current Attachment</Text>
            <View style={styles.statusRow}>
              <View style={styles.statusLeft}>
                <Text style={[styles.orgName, { color: theme.text }]}>{myAttachment.org_name}</Text>
                <Text style={[styles.orgLocation, { color: theme.textSecondary }]}>📍 {myAttachment.location}</Text>
                {myAttachment.start_date && (
                  <Text style={[styles.dates, { color: theme.primary }]}>
                    📅 {formatDateDisplay(myAttachment.start_date)} — {formatDateDisplay(myAttachment.end_date)}
                  </Text>
                )}
              </View>
              <View style={[styles.statusBadge, { backgroundColor: statusColor(myAttachment.status).bg }]}>
                <Text style={[styles.statusText, { color: statusColor(myAttachment.status).text }]}>
                  {myAttachment.status}
                </Text>
              </View>
            </View>
          </View>
        )}

        {currentStep === 1 && !myAttachment && latestApplication && (
          <View style={[styles.statusCard, { backgroundColor: theme.background, borderLeftColor: theme.primary }]}>
            <Text style={[styles.statusTitle, { color: theme.textSecondary }]}>Your Application Status</Text>
            <View style={styles.statusRow}>
              <View style={styles.statusLeft}>
                <Text style={[styles.orgName, { color: theme.text }]}>{latestApplication.org_name}</Text>
                {latestApplication.start_date && (
                  <Text style={[styles.dates, { color: theme.primary }]}>
                    📅 {formatDateDisplay(latestApplication.start_date)} — {formatDateDisplay(latestApplication.end_date)}
                  </Text>
                )}
                {latestApplication.skills && (
                  <Text style={[styles.detailText, { color: theme.textSecondary }]}>
                    Skills: {latestApplication.skills}
                  </Text>
                )}
                {latestApplication.response_message && (
                  <Text style={[styles.responseText, { color: theme.text }]}>
                    💬 {latestApplication.response_message}
                  </Text>
                )}
              </View>
              <View style={[styles.statusBadge, { backgroundColor: applicationMeta(latestApplication.status).bg }]}>
                <Text style={[styles.statusText, { color: applicationMeta(latestApplication.status).text }]}>
                  {applicationMeta(latestApplication.status).label}
                </Text>
              </View>
            </View>
          </View>
        )}

        {!showForm && !myAttachment && !latestApplication && !canSelfPlace && (
          <View style={[styles.emptyCard, { backgroundColor: theme.background }]}>
            <Text style={styles.emptyIcon}>🔒</Text>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>Self‑Placement Disabled</Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Student applications are currently managed by the attachment office.
            </Text>
          </View>
        )}

        {/* ===== STEP 1: Personal & Academic Info ===== */}
        {showForm && currentStep === 1 && (
          <>
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Selected Organization</Text>
              {selectedOrg ? (
                <View style={[styles.orgCard, { backgroundColor: theme.surface }]}>
                  <View style={styles.orgCardContent}>
                    <View style={[styles.orgAvatar, { backgroundColor: theme.primaryLight || '#E3F1EE' }]}>
                      <MaterialCommunityIcons name="office-building" size={26} color={theme.primary} />
                    </View>
                    <View style={styles.orgCardInfo}>
                      <Text style={[styles.orgCardName, { color: theme.text }]}>{selectedOrg.org_name}</Text>
                      <View style={styles.orgLocationRow}>
                        <Ionicons name="location-outline" size={13} color={theme.textSecondary} />
                        <Text style={[styles.orgCardLocation, { color: theme.textSecondary }]}> {selectedOrg.location}</Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => setSelectedOrg(null)}>
                      <Text style={[styles.changeButtonText, { color: theme.primary }]}>CHANGE</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={[styles.selectOrgPlaceholder, { backgroundColor: theme.background }]}>
                  <Text style={[styles.selectOrgText, { color: theme.textSecondary }]}>
                    No organization selected — choose from list below
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Personal Information</Text>
              <View style={styles.stackedFields}>
                <View style={styles.formFieldFull}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>FULL NAME</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.outlineVariant }]}
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="e.g. John Doe"
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>
                <View style={styles.formFieldFull}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>REGISTRATION NUMBER</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.outlineVariant }]}
                    value={regNumber}
                    onChangeText={setRegNumber}
                    placeholder="SCT211-0000/2024"
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>
                <View style={styles.formFieldFull}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>COURSE / PROGRAM</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.outlineVariant }]}
                    value={course}
                    onChangeText={setCourse}
                    placeholder="BSc. Computer Science"
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>
                <View style={styles.formFieldFull}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>YEAR OF STUDY</Text>
                  <TouchableOpacity
                    style={[styles.selectField, { borderColor: theme.outlineVariant, backgroundColor: theme.surface }]}
                    onPress={handleYearCycle}
                  >
                    <Text style={[styles.selectFieldText, { color: theme.text }]}>Year {yearOfStudy}</Text>
                    <Ionicons name="chevron-down" size={18} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Attachment Details</Text>
              <View style={styles.stackedFields}>
                <View style={styles.formFieldFull}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>PREFERRED START DATE</Text>
                  <View style={[styles.dateInputWrap, { borderColor: theme.outlineVariant, backgroundColor: theme.surface }]}>
                    <TextInput
                      style={[styles.dateInput, { color: theme.text }]}
                      value={startDate}
                      onChangeText={handleStartDateChange}
                      placeholder="dd/mm/yyyy"
                      placeholderTextColor={theme.textSecondary}
                      autoCapitalize="none"
                    />
                    <Ionicons name="calendar-outline" size={18} color={theme.textSecondary} />
                  </View>
                </View>

                <View style={styles.formFieldFull}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>DURATION</Text>
                  <TouchableOpacity
                    style={[styles.selectField, { borderColor: theme.outlineVariant, backgroundColor: theme.surface }]}
                    onPress={() => handleDurationChange(duration === '3' ? '6' : '3')}
                  >
                    <Text style={[styles.selectFieldText, { color: theme.text }]}>
                      {duration === '3' ? '3 Months (Standard)' : '6 Months'}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.submitContainer}>
              <TouchableOpacity style={[styles.submitButton, { backgroundColor: theme.primary }]} onPress={handleNext}>
                <Text style={[styles.submitButtonText, { color: theme.white }]}>Next step</Text>
                <Ionicons name="arrow-forward" size={18} color={theme.white} style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <View style={styles.rowBetween}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  Other Organizations ({organizations.length})
                </Text>
                <TouchableOpacity>
                  <Text style={[styles.viewDirectory, { color: theme.primary }]}>View Directory</Text>
                </TouchableOpacity>
              </View>
              {organizations.length === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: theme.background }]}>
                  <Text style={styles.emptyIcon}>🏢</Text>
                  <Text style={[styles.emptyTitle, { color: theme.text }]}>No Organizations Available</Text>
                  <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                    No approved organizations at the moment.
                  </Text>
                </View>
              ) : (
                organizations.map((org) => (
                  <TouchableOpacity
                    key={org.org_id}
                    style={[
                      styles.orgListItem,
                      { backgroundColor: theme.background },
                      selectedOrg?.org_id === org.org_id && { borderColor: theme.primary, borderWidth: 2 }
                    ]}
                    onPress={() => org.available_slots > 0 && setSelectedOrg(org)}
                    disabled={org.available_slots === 0}
                  >
                    <View style={styles.orgListItemContent}>
                      <View style={[styles.orgAvatarSmall, { backgroundColor: theme.primaryLight || '#E3F1EE' }]}>
                        <MaterialCommunityIcons name="office-building" size={18} color={theme.primary} />
                      </View>
                      <View style={styles.orgListItemInfo}>
                        <Text style={[styles.orgListItemName, { color: theme.text }]}>{org.org_name}</Text>
                        <Text style={[styles.orgListItemLocation, { color: theme.textSecondary }]}>
                          📍 {org.location}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <View style={[
                          styles.slotBadge,
                          org.available_slots === 0 ? { backgroundColor: '#FFEBEE' } : { backgroundColor: '#E8F5E9' }
                        ]}>
                          <Text style={[
                            styles.slotBadgeText,
                            org.available_slots === 0 ? { color: '#C62828' } : { color: '#2E7D32' }
                          ]}>
                            {org.available_slots === 0 ? 'FULL' : `${org.available_slots} slots`}
                          </Text>
                        </View>
                        <Text style={[
                          styles.slotAction,
                          { color: org.available_slots === 0 ? theme.textSecondary : theme.primary }
                        ]}>
                          {org.available_slots === 0 ? 'UNAVAILABLE' : 'SELECT'}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </>
        )}

        {/* ===== STEP 2: Supporting Documents ===== */}
        {showForm && currentStep === 2 && (
          <>
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Skills</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.outlineVariant }]}
                value={skills}
                onChangeText={setSkills}
                placeholder="e.g. JavaScript, Data Analysis, Communication"
                placeholderTextColor={theme.textSecondary}
              />
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Supporting Documents</Text>
              <Text style={[styles.helperText, { color: theme.textSecondary }]}>
                Optional — attach your CV, introduction letter, or ID copy.
              </Text>

              {documents.map((doc, i) => (
                <View key={`${doc.name}-${i}`} style={[styles.docRow, { borderColor: theme.outlineVariant, backgroundColor: theme.background }]}>
                  <Ionicons name="document-text-outline" size={20} color={theme.primary} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.docName, { color: theme.text }]} numberOfLines={1}>{doc.name}</Text>
                    {!!doc.size && <Text style={[styles.docSize, { color: theme.textSecondary }]}>{formatFileSize(doc.size)}</Text>}
                  </View>
                  <TouchableOpacity onPress={() => handleRemoveDocument(i)}>
                    <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity
                style={[styles.uploadBox, { borderColor: theme.outlineVariant }]}
                onPress={handlePickDocument}
              >
                <Ionicons name="cloud-upload-outline" size={24} color={theme.primary} />
                <Text style={[styles.uploadBoxText, { color: theme.primary }]}>Tap to upload documents</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Supporting Information</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.outlineVariant }]}
                value={supportingInfo}
                onChangeText={setSupportingInfo}
                placeholder="Share relevant experience, projects, or documents..."
                placeholderTextColor={theme.textSecondary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.submitContainer}>
              <TouchableOpacity style={[styles.submitButton, { backgroundColor: theme.primary }]} onPress={handleNext}>
                <Text style={[styles.submitButtonText, { color: theme.white }]}>Next step</Text>
                <Ionicons name="arrow-forward" size={18} color={theme.white} style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ===== STEP 3: Review & Submit ===== */}
        {showForm && currentStep === 3 && (
          <>
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Review Your Application</Text>

              <View style={[styles.reviewCard, { backgroundColor: theme.background }]}>
                <Text style={[styles.reviewLabel, { color: theme.textSecondary }]}>APPLICANT</Text>
                <Text style={[styles.reviewValue, { color: theme.text }]}>{fullName} · {regNumber}</Text>
                <Text style={[styles.reviewValue, { color: theme.text }]}>{course} · Year {yearOfStudy}</Text>

                <Text style={[styles.reviewLabel, { color: theme.textSecondary, marginTop: 12 }]}>ORGANIZATION</Text>
                <Text style={[styles.reviewValue, { color: theme.text }]}>{selectedOrg?.org_name}</Text>

                <Text style={[styles.reviewLabel, { color: theme.textSecondary, marginTop: 12 }]}>ATTACHMENT PERIOD</Text>
                <Text style={[styles.reviewValue, { color: theme.text }]}>
                  {formatDateDisplay(startDate)} — {formatDateDisplay(endDate)} ({duration} months)
                </Text>

                <Text style={[styles.reviewLabel, { color: theme.textSecondary, marginTop: 12 }]}>SKILLS</Text>
                <Text style={[styles.reviewValue, { color: theme.text }]}>{skills}</Text>

                {!!supportingInfo && (
                  <>
                    <Text style={[styles.reviewLabel, { color: theme.textSecondary, marginTop: 12 }]}>SUPPORTING INFORMATION</Text>
                    <Text style={[styles.reviewValue, { color: theme.text }]}>{supportingInfo}</Text>
                  </>
                )}

                <Text style={[styles.reviewLabel, { color: theme.textSecondary, marginTop: 12 }]}>DOCUMENTS</Text>
                {documents.length === 0 ? (
                  <Text style={[styles.reviewValue, { color: theme.textSecondary }]}>No documents attached</Text>
                ) : (
                  documents.map((doc, i) => (
                    <Text key={i} style={[styles.reviewValue, { color: theme.text }]}>• {doc.name}</Text>
                  ))
                )}
              </View>
            </View>

            <View style={styles.submitContainer}>
              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: theme.primary }]}
                onPress={handleApply}
                disabled={applying}
              >
                {applying ? (
                  <Spinner color={theme.white} size="small" />
                ) : (
                  <Text style={[styles.submitButtonText, { color: theme.white }]}>
                    Submit Application 📋
                  </Text>
                )}
              </TouchableOpacity>
              <Text style={[styles.submitHelper, { color: theme.textSecondary }]}>
                You can save your progress and continue later.
              </Text>
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: COLORS.gray },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
  },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: { padding: 4 },
  screenTitle: { fontSize: 18, fontWeight: '700' },
  topBarDots: { flexDirection: 'row', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },

  stepContainer: { paddingHorizontal: 16, marginTop: 8, marginBottom: 16 },
  stepHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  stepLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  stepDescription: { fontSize: 13, fontWeight: '400' },
  progressBar: { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', gap: 4 },
  progressFill: { flex: 1, borderRadius: 3 },
  progressEmpty: { flex: 1, borderRadius: 3, opacity: 0.5 },

  statusCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    borderLeftWidth: 4,
  },
  statusTitle: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  statusLeft: { flex: 1 },
  orgName: { fontSize: 16, fontWeight: '700' },
  orgLocation: { fontSize: 13, marginTop: 2 },
  dates: { fontSize: 13, marginTop: 4 },
  detailText: { fontSize: 13, marginTop: 4 },
  responseText: { fontSize: 13, marginTop: 8, fontStyle: 'italic' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  statusText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },

  emptyCard: { margin: 16, padding: 30, borderRadius: 16, alignItems: 'center' },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptyText: { fontSize: 13, textAlign: 'center', marginTop: 6 },

  section: { paddingHorizontal: 16, marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  viewDirectory: { fontSize: 13, fontWeight: '600' },
  helperText: { fontSize: 12, marginBottom: 12, marginTop: -6 },

  orgCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  orgCardContent: { flexDirection: 'row', alignItems: 'center' },
  orgAvatar: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  orgCardInfo: { flex: 1 },
  orgCardName: { fontSize: 16, fontWeight: '700' },
  orgLocationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  orgCardLocation: { fontSize: 13 },
  changeButtonText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  selectOrgPlaceholder: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  selectOrgText: { fontSize: 14 },

  stackedFields: { gap: 14 },
  formFieldFull: { width: '100%' },
  fieldLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4, letterSpacing: 0.5 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    height: 48,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 100,
  },
  dateInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
  },
  dateInput: { flex: 1, fontSize: 15 },
  selectField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
  },
  selectFieldText: { fontSize: 15 },

  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  docName: { fontSize: 13, fontWeight: '600' },
  docSize: { fontSize: 11, marginTop: 2 },
  uploadBox: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 24,
    alignItems: 'center',
    gap: 6,
  },
  uploadBoxText: { fontSize: 13, fontWeight: '600' },

  reviewCard: { borderRadius: 16, padding: 16 },
  reviewLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  reviewValue: { fontSize: 14, marginTop: 4 },

  submitContainer: { paddingHorizontal: 16, marginTop: 8, marginBottom: 24 },
  submitButton: {
    height: 52,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  submitButtonText: { fontSize: 16, fontWeight: '700' },
  submitHelper: { fontSize: 13, textAlign: 'center', marginTop: 12 },

  orgListItem: {
    marginBottom: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  orgListItemContent: { flexDirection: 'row', alignItems: 'center' },
  orgAvatarSmall: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  orgListItemInfo: { flex: 1 },
  orgListItemName: { fontSize: 14, fontWeight: '600' },
  orgListItemLocation: { fontSize: 12, marginTop: 2 },
  slotBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  slotBadgeText: { fontSize: 12, fontWeight: '600' },
  slotAction: { fontSize: 11, fontWeight: '700' },
});