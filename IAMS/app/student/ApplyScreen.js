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

// ── Design accents (match IAMS design system used elsewhere in the app) ─────
const TEAL       = '#1B7A65';
const TEAL_DARK  = '#0F2419';
const MINT_BG    = '#E3F1EE';
const ORANGE     = '#E8711A';
const GRAY       = '#7A8F86';
const BORDER     = '#D8E4DF';
const DISABLED_BG = '#EEF1F0';
const PILL_DARK  = '#123527';

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

  // ── Vacancy selection (within the chosen org) ──────────────────────────
  const [orgVacancies, setOrgVacancies] = useState([]);
  const [vacanciesLoading, setVacanciesLoading] = useState(false);
  const [selectedVacancy, setSelectedVacancy] = useState(null);

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

  // Fetch open vacancies whenever an org is selected, so the student can
  // pick a specific role instead of applying to the org generically.
  useEffect(() => {
    if (!selectedOrg) {
      setOrgVacancies([]);
      return;
    }
    let cancelled = false;
    setVacanciesLoading(true);
    api.get(`/students/organizations/${selectedOrg.org_id}/vacancies`)
      .then(res => {
        if (!cancelled) setOrgVacancies(res.data || []);
      })
      .catch(err => {
        console.error('Fetch vacancies error:', err);
        if (!cancelled) setOrgVacancies([]);
      })
      .finally(() => {
        if (!cancelled) setVacanciesLoading(false);
      });
    return () => { cancelled = true; };
  }, [selectedOrg]);

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

  // End date can still be overridden by hand — the segmented duration
  // control keeps re-deriving it from start date, but a manual edit here
  // takes precedence until start/duration change again.
  const handleEndDateChange = (value) => {
    setEndDate(normalizeDateInput(value));
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
    setSelectedVacancy(null);
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
    if (!selectedVacancy) {
      Alert.alert('Error', 'Please select a vacancy to apply for');
      return false;
    }
    if ((selectedVacancy.available_slots || 0) === 0) {
      Alert.alert('Error', 'This vacancy has no available slots');
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
      `Apply to ${selectedOrg.org_name} — ${selectedVacancy.role_title}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply',
          onPress: async () => {
            setApplying(true);
            try {
              const formData = new FormData();
              formData.append('org_id', selectedOrg.org_id);
              formData.append('vacancy_id', selectedVacancy.vacancy_id);
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
              setSelectedVacancy(null);
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

  const applicationMeta = (status) => {
    switch (status) {
      case 'accepted': return { label: 'ACCEPTED', bg: '#E8F5E9', text: '#2E7D32' };
      case 'rejected': return { label: 'REJECTED', bg: '#FFEBEE', text: '#C62828' };
      case 'more_info': return { label: 'MORE INFO', bg: '#E3F2FD', text: '#185FA5' };
      case 'pending':
      default: return { label: 'PENDING', bg: PILL_DARK, text: '#FFFFFF' };
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

  const percentComplete = Math.round((currentStep / 3) * 100);

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ===== Top App Bar ===== */}
        <View style={[styles.topBar, { backgroundColor: theme.surface }]}>
          <TouchableOpacity onPress={handleBackStep} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color={theme.text} />
          </TouchableOpacity>
          <View style={styles.topBarTextBlock}>
            <Text style={[styles.screenTitle, { color: theme.text }]}>Apply for Attachment</Text>
            {showForm && (
              <Text style={[styles.stepSubtitle, { color: theme.textSecondary }]}>
                STEP {currentStep} OF 3: {STEP_DESCRIPTIONS[currentStep].toUpperCase()}
              </Text>
            )}
          </View>
          {showForm && (
            <View style={styles.progressBlock}>
              <Text style={[styles.progressPercent, { color: theme.text }]}>{percentComplete}% Complete</Text>
              <View style={[styles.progressTrack, { backgroundColor: theme.outlineVariant }]}>
                <View style={[styles.progressTrackFill, { width: `${percentComplete}%`, backgroundColor: TEAL }]} />
              </View>
            </View>
          )}
        </View>

        {/* ===== Application Status (Step 1 only) ===== */}
        {currentStep === 1 && myAttachment && (
          <View style={styles.statusCard}>
            <View style={styles.statusIconBox}>
              <Ionicons name="information-circle-outline" size={20} color={TEAL} />
            </View>
            <View style={styles.statusTextBlock}>
              <Text style={styles.statusLabel}>APPLICATION STATUS</Text>
              <Text style={styles.statusHeadline}>{myAttachment.org_name}</Text>
              <Text style={styles.statusSubtext}>📍 {myAttachment.location}</Text>
              {myAttachment.start_date && (
                <Text style={styles.statusSubtext}>
                  📅 {formatDateDisplay(myAttachment.start_date)} — {formatDateDisplay(myAttachment.end_date)}
                </Text>
              )}
            </View>
            <View style={[styles.statusPill, { backgroundColor: PILL_DARK }]}>
              <Text style={styles.statusPillText}>{myAttachment.status?.toUpperCase()}</Text>
            </View>
          </View>
        )}

        {currentStep === 1 && !myAttachment && latestApplication && (
          <View style={styles.statusCard}>
            <View style={styles.statusIconBox}>
              <Ionicons name="information-circle-outline" size={20} color={TEAL} />
            </View>
            <View style={styles.statusTextBlock}>
              <Text style={styles.statusLabel}>APPLICATION STATUS</Text>
              <Text style={styles.statusHeadline}>{latestApplication.org_name}</Text>
              {latestApplication.start_date && (
                <Text style={styles.statusSubtext}>
                  📅 {formatDateDisplay(latestApplication.start_date)} — {formatDateDisplay(latestApplication.end_date)}
                </Text>
              )}
              {latestApplication.response_message && (
                <Text style={styles.statusResponse}>💬 {latestApplication.response_message}</Text>
              )}
            </View>
            <View style={[styles.statusPill, { backgroundColor: applicationMeta(latestApplication.status).bg }]}>
              <Text style={[styles.statusPillText, { color: applicationMeta(latestApplication.status).text }]}>
                {applicationMeta(latestApplication.status).label}
              </Text>
            </View>
          </View>
        )}

        {currentStep === 1 && !myAttachment && !latestApplication && showForm && (
          <View style={styles.statusCard}>
            <View style={styles.statusIconBox}>
              <Ionicons name="information-circle-outline" size={20} color={TEAL} />
            </View>
            <View style={styles.statusTextBlock}>
              <Text style={styles.statusLabel}>APPLICATION STATUS</Text>
              <Text style={styles.statusHeadline}>No Active Application Found</Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: PILL_DARK }]}>
              <Text style={styles.statusPillText}>PENDING</Text>
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
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Organization Details</Text>
              {selectedOrg ? (
                <View style={styles.orgCard}>
                  <View style={styles.orgCardContent}>
                    <View style={styles.orgAvatar}>
                      <MaterialCommunityIcons name="office-building" size={26} color={TEAL} />
                    </View>
                    <View style={styles.orgCardInfo}>
                      <Text style={styles.orgCardName}>{selectedOrg.org_name}</Text>
                      <Text style={styles.orgCardLocation}>{selectedOrg.location}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setSelectedOrg(null)}>
                      <Text style={styles.changeButtonText}>CHANGE</Text>
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

            {/* ── Vacancy picker — only shown once an org is selected ── */}
            {selectedOrg && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Select a Vacancy</Text>
                {vacanciesLoading ? (
                  <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                    <Spinner size="small" color={TEAL} />
                  </View>
                ) : orgVacancies.length === 0 ? (
                  <View style={[styles.emptyCard, { backgroundColor: theme.background }]}>
                    <Text style={styles.emptyIcon}>📭</Text>
                    <Text style={[styles.emptyTitle, { color: theme.text }]}>No Open Vacancies</Text>
                    <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                      This organization has no open roles right now.
                    </Text>
                  </View>
                ) : (
                  orgVacancies.map((vacancy) => {
                    const isSelected = selectedVacancy?.vacancy_id === vacancy.vacancy_id;
                    return (
                      <TouchableOpacity
                        key={vacancy.vacancy_id}
                        style={[
                          styles.orgListItem,
                          { backgroundColor: theme.surface },
                          isSelected && { borderColor: TEAL, borderWidth: 2 }
                        ]}
                        onPress={() => setSelectedVacancy(vacancy)}
                      >
                        <View style={styles.orgListItemContent}>
                          <View style={styles.orgAvatarSmall}>
                            <MaterialCommunityIcons name="briefcase-outline" size={18} color={GRAY} />
                          </View>
                          <View style={styles.orgListItemInfo}>
                            <Text style={[styles.orgListItemName, { color: theme.text }]}>{vacancy.role_title}</Text>
                            <Text style={[styles.orgListItemLocation, { color: theme.textSecondary }]}>
                              {vacancy.department}
                            </Text>
                          </View>
                          <View style={{ alignItems: 'flex-end', gap: 4 }}>
                            <View style={[styles.slotBadge, { backgroundColor: '#E8F5E9' }]}>
                              <Text style={[styles.slotBadgeText, { color: '#2E7D32' }]}>
                                {vacancy.available_slots} SLOTS
                              </Text>
                            </View>
                            <Text style={[styles.slotAction, { color: isSelected ? TEAL : ORANGE }]}>
                              {isSelected ? 'SELECTED' : 'SELECT'}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            )}

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Application Form</Text>
              <View style={styles.stackedFields}>
                <View style={styles.formFieldFull}>
                  <Text style={styles.fieldLabel}>FULL NAME (READ ONLY)</Text>
                  <View style={styles.readOnlyField}>
                    <Text style={styles.readOnlyFieldText}>{fullName || '—'}</Text>
                  </View>
                </View>

                <View style={styles.formFieldFull}>
                  <Text style={styles.fieldLabel}>STUDENT ID (READ ONLY)</Text>
                  <View style={styles.readOnlyField}>
                    <Text style={styles.readOnlyFieldText}>{regNumber || '—'}</Text>
                  </View>
                </View>

                <View style={styles.formFieldFull}>
                  <Text style={styles.fieldLabel}>ATTACHMENT ROLE</Text>
                  <View style={[styles.selectField, { borderColor: BORDER, backgroundColor: theme.surface }]}>
                    <MaterialCommunityIcons name="briefcase-outline" size={18} color={GRAY} style={{ marginRight: 8 }} />
                    <TextInput
                      style={[styles.selectFieldInput, { color: theme.text }]}
                      value={course}
                      onChangeText={setCourse}
                      placeholder="e.g. Software Engineering"
                      placeholderTextColor={theme.textSecondary}
                    />
                    <Ionicons name="chevron-down" size={18} color={theme.textSecondary} />
                  </View>
                </View>

                <View style={styles.formFieldFull}>
                  <Text style={styles.fieldLabel}>ATTACHMENT DURATION</Text>
                  <View style={styles.durationToggle}>
                    {['3', '6'].map((months) => {
                      const active = duration === months;
                      return (
                        <TouchableOpacity
                          key={months}
                          style={[
                            styles.durationOption,
                            active
                              ? { backgroundColor: theme.surface, borderColor: TEAL, borderWidth: 1.5 }
                              : { backgroundColor: DISABLED_BG, borderColor: 'transparent' },
                          ]}
                          onPress={() => handleDurationChange(months)}
                        >
                          <Text style={[styles.durationOptionText, active ? { color: theme.text } : { color: GRAY }]}>
                            {months} Months
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.formFieldFull}>
                  <Text style={styles.fieldLabel}>START DATE</Text>
                  <View style={[styles.dateInputWrap, { borderColor: BORDER, backgroundColor: theme.surface }]}>
                    <TextInput
                      style={[styles.dateInput, { color: theme.text }]}
                      value={startDate}
                      onChangeText={handleStartDateChange}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={theme.textSecondary}
                      autoCapitalize="none"
                    />
                    <Ionicons name="calendar-outline" size={18} color={GRAY} />
                  </View>
                </View>

                <View style={styles.formFieldFull}>
                  <Text style={styles.fieldLabel}>END DATE</Text>
                  <View style={[styles.dateInputWrap, { borderColor: BORDER, backgroundColor: theme.surface }]}>
                    <TextInput
                      style={[styles.dateInput, { color: theme.text }]}
                      value={endDate}
                      onChangeText={handleEndDateChange}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={theme.textSecondary}
                      autoCapitalize="none"
                    />
                    <Ionicons name="calendar-outline" size={18} color={GRAY} />
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.rowBetween}>
                <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 0 }]}>
                  Other Organizations
                </Text>
                <TouchableOpacity>
                  <Text style={styles.viewDirectory}>View Directory</Text>
                </TouchableOpacity>
              </View>
              <View style={{ height: 12 }} />
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
                      { backgroundColor: theme.surface },
                      selectedOrg?.org_id === org.org_id && { borderColor: TEAL, borderWidth: 2 }
                    ]}
                    onPress={() => org.available_slots > 0 && setSelectedOrg(org)}
                    disabled={org.available_slots === 0}
                  >
                    <View style={styles.orgListItemContent}>
                      <View style={styles.orgAvatarSmall}>
                        <MaterialCommunityIcons name="office-building" size={18} color={GRAY} />
                      </View>
                      <View style={styles.orgListItemInfo}>
                        <Text style={[styles.orgListItemName, { color: theme.text }]}>{org.org_name}</Text>
                        <Text style={[styles.orgListItemLocation, { color: theme.textSecondary }]}>
                          {org.location}
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
                            {org.available_slots === 0 ? 'FULL' : `${org.available_slots} SLOTS`}
                          </Text>
                        </View>
                        <Text style={[
                          styles.slotAction,
                          { color: org.available_slots === 0 ? theme.textSecondary : ORANGE }
                        ]}>
                          {org.available_slots === 0 ? 'UNAVAILABLE' : 'SELECT'}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>

            <View style={styles.submitContainer}>
              <TouchableOpacity style={styles.submitButton} onPress={handleNext}>
                <Text style={styles.submitButtonText}>Next Step</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ===== STEP 2: Supporting Documents ===== */}
        {showForm && currentStep === 2 && (
          <>
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Skills</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: BORDER }]}
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
                <View key={`${doc.name}-${i}`} style={[styles.docRow, { borderColor: BORDER, backgroundColor: theme.background }]}>
                  <Ionicons name="document-text-outline" size={20} color={TEAL} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.docName, { color: theme.text }]} numberOfLines={1}>{doc.name}</Text>
                    {!!doc.size && <Text style={[styles.docSize, { color: theme.textSecondary }]}>{formatFileSize(doc.size)}</Text>}
                  </View>
                  <TouchableOpacity onPress={() => handleRemoveDocument(i)}>
                    <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity style={[styles.uploadBox, { borderColor: BORDER }]} onPress={handlePickDocument}>
                <Ionicons name="cloud-upload-outline" size={24} color={TEAL} />
                <Text style={styles.uploadBoxText}>Tap to upload documents</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Supporting Information</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: theme.surface, color: theme.text, borderColor: BORDER }]}
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
              <TouchableOpacity style={styles.submitButton} onPress={handleNext}>
                <Text style={styles.submitButtonText}>Next Step</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
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
                <Text style={styles.reviewLabel}>APPLICANT</Text>
                <Text style={[styles.reviewValue, { color: theme.text }]}>{fullName} · {regNumber}</Text>
                <Text style={[styles.reviewValue, { color: theme.text }]}>{course} · Year {yearOfStudy}</Text>

                <Text style={[styles.reviewLabel, { marginTop: 12 }]}>ORGANIZATION</Text>
                <Text style={[styles.reviewValue, { color: theme.text }]}>{selectedOrg?.org_name}</Text>

                <Text style={[styles.reviewLabel, { marginTop: 12 }]}>VACANCY</Text>
                <Text style={[styles.reviewValue, { color: theme.text }]}>
                  {selectedVacancy?.role_title} · {selectedVacancy?.department}
                </Text>

                <Text style={[styles.reviewLabel, { marginTop: 12 }]}>ATTACHMENT PERIOD</Text>
                <Text style={[styles.reviewValue, { color: theme.text }]}>
                  {formatDateDisplay(startDate)} — {formatDateDisplay(endDate)} ({duration} months)
                </Text>

                <Text style={[styles.reviewLabel, { marginTop: 12 }]}>SKILLS</Text>
                <Text style={[styles.reviewValue, { color: theme.text }]}>{skills}</Text>

                {!!supportingInfo && (
                  <>
                    <Text style={[styles.reviewLabel, { marginTop: 12 }]}>SUPPORTING INFORMATION</Text>
                    <Text style={[styles.reviewValue, { color: theme.text }]}>{supportingInfo}</Text>
                  </>
                )}

                <Text style={[styles.reviewLabel, { marginTop: 12 }]}>DOCUMENTS</Text>
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
              <TouchableOpacity style={styles.submitButton} onPress={handleApply} disabled={applying}>
                {applying ? (
                  <Spinner color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit Application 📋</Text>
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

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
    gap: 8,
  },
  backButton: { padding: 4, marginTop: 2 },
  topBarTextBlock: { flex: 1 },
  screenTitle: { fontSize: 20, fontWeight: '800' },
  stepSubtitle: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3, marginTop: 4 },
  progressBlock: { alignItems: 'flex-end', width: 100 },
  progressPercent: { fontSize: 11, fontWeight: '700', marginBottom: 6 },
  progressTrack: { width: '100%', height: 4, borderRadius: 2, overflow: 'hidden' },
  progressTrackFill: { height: 4, borderRadius: 2 },

  // Application status card
  statusCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: MINT_BG,
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  statusIconBox: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
  },
  statusTextBlock: { flex: 1 },
  statusLabel: { fontSize: 11, fontWeight: '700', color: TEAL, letterSpacing: 0.4, marginBottom: 4 },
  statusHeadline: { fontSize: 16, fontWeight: '800', color: TEAL_DARK },
  statusSubtext: { fontSize: 12, color: TEAL_DARK, opacity: 0.75, marginTop: 4 },
  statusResponse: { fontSize: 12, color: TEAL_DARK, fontStyle: 'italic', marginTop: 6 },
  statusPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusPillText: { fontSize: 10, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.4 },

  emptyCard: { margin: 16, padding: 30, borderRadius: 16, alignItems: 'center' },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptyText: { fontSize: 13, textAlign: 'center', marginTop: 6 },

  section: { paddingHorizontal: 16, marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  viewDirectory: { fontSize: 13, fontWeight: '700', color: ORANGE },
  helperText: { fontSize: 12, marginBottom: 12, marginTop: -6 },

  // Organization details card
  orgCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  orgCardContent: { flexDirection: 'row', alignItems: 'center' },
  orgAvatar: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: MINT_BG,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  orgCardInfo: { flex: 1 },
  orgCardName: { fontSize: 16, fontWeight: '800', color: TEAL_DARK },
  orgCardLocation: { fontSize: 13, color: GRAY, marginTop: 2 },
  changeButtonText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.3, color: ORANGE },
  selectOrgPlaceholder: {
    padding: 16, borderRadius: 12,
    borderWidth: 1, borderColor: BORDER, borderStyle: 'dashed',
    alignItems: 'center',
  },
  selectOrgText: { fontSize: 14 },

  // Form fields
  stackedFields: { gap: 16 },
  formFieldFull: { width: '100%' },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: GRAY, marginBottom: 6, letterSpacing: 0.4 },
  readOnlyField: {
    backgroundColor: DISABLED_BG,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  readOnlyFieldText: { fontSize: 15, color: GRAY, fontWeight: '600' },
  input: {
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, height: 48,
  },
  textArea: {
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, minHeight: 100,
  },
  selectField: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 14, height: 50,
  },
  selectFieldInput: { flex: 1, fontSize: 15 },

  durationToggle: {
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
    gap: 8,
  },
  durationOption: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  durationOptionText: { fontSize: 14, fontWeight: '700' },

  dateInputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 14, height: 50,
  },
  dateInput: { flex: 1, fontSize: 15 },

  // Documents
  docRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 12,
    padding: 12, marginBottom: 10,
  },
  docName: { fontSize: 13, fontWeight: '600' },
  docSize: { fontSize: 11, marginTop: 2 },
  uploadBox: {
    borderWidth: 1, borderStyle: 'dashed', borderRadius: 12,
    paddingVertical: 24, alignItems: 'center', gap: 6,
  },
  uploadBoxText: { fontSize: 13, fontWeight: '700', color: TEAL },

  // Review
  reviewCard: { borderRadius: 16, padding: 16 },
  reviewLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, color: GRAY },
  reviewValue: { fontSize: 14, marginTop: 4 },

  // Submit button
  submitContainer: { paddingHorizontal: 16, marginTop: 8, marginBottom: 24 },
  submitButton: {
    height: 54,
    borderRadius: 30,
    backgroundColor: TEAL_DARK,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 3,
  },
  submitButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  submitHelper: { fontSize: 13, textAlign: 'center', marginTop: 12 },

  // Other organizations list
  orgListItem: {
    marginBottom: 10, padding: 12, borderRadius: 14,
    borderWidth: 1, borderColor: 'transparent',
  },
  orgListItemContent: { flexDirection: 'row', alignItems: 'center' },
  orgAvatarSmall: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: DISABLED_BG,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  orgListItemInfo: { flex: 1 },
  orgListItemName: { fontSize: 14, fontWeight: '700' },
  orgListItemLocation: { fontSize: 12, marginTop: 2 },
  slotBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  slotBadgeText: { fontSize: 11, fontWeight: '700' },
  slotAction: { fontSize: 11, fontWeight: '800' },
});