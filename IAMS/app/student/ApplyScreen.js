import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, RefreshControl, TextInput,
  Image
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import api, { requestWithRetry } from '../../api/axios';
import { COLORS } from '../../constants/colors';
import { hasRolePermission } from '../../utils/permissions';
import Spinner from '../../components/Spinner';

// Helper to format date for display
const formatDateDisplay = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

export default function ApplyScreen({ navigation }) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const canSelfPlace = hasRolePermission(user, 'selfPlacement');

  // --- State ---
  const [organizations, setOrganizations] = useState([]);
  const [myAttachment, setMyAttachment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [duration, setDuration] = useState('3'); // months
  const [skills, setSkills] = useState('');
  const [supportingInfo, setSupportingInfo] = useState('');
  const [applications, setApplications] = useState([]);
  const [latestApplication, setLatestApplication] = useState(null);

  // --- Data fetching ---
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

  // --- Date utilities (same as before) ---
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

  // Calculate end date based on duration from start
  const calculateEndDateFromDuration = (start, months) => {
    if (!start) return '';
    const startDateObj = parseDateFromInput(start);
    if (!startDateObj) return '';
    const endDateObj = new Date(startDateObj.getTime());
    endDateObj.setUTCMonth(endDateObj.getUTCMonth() + parseInt(months, 10));
    return formatDateYmd(endDateObj);
  };

  // When start date changes, update end date based on duration
  const handleStartDateChange = (value) => {
    const normalized = normalizeDateInput(value);
    setStartDate(normalized);
    if (normalized && duration) {
      setEndDate(calculateEndDateFromDuration(normalized, duration));
    } else {
      setEndDate('');
    }
  };

  // When duration changes, recalc end date
  const handleDurationChange = (months) => {
    setDuration(months);
    if (startDate) {
      setEndDate(calculateEndDateFromDuration(startDate, months));
    } else {
      setEndDate('');
    }
  };

  // Reset form when selected org changes
  useEffect(() => {
    setStartDate('');
    setEndDate('');
    setSkills('');
    setSupportingInfo('');
    setDuration('3');
  }, [selectedOrg]);

  // --- Submit application (unchanged logic) ---
  const handleApply = async () => {
    if (!canSelfPlace) {
      Alert.alert('Permission Disabled', 'Self-placement applications are currently disabled.');
      return;
    }
    if (latestApplication && ['pending', 'more_info', 'accepted'].includes(latestApplication.status)) {
      Alert.alert('Application Pending', 'You already have an application under review.');
      return;
    }

    const normalizedStart = startDate.trim();
    const normalizedEnd = endDate.trim();
    const normalizedSkills = skills.trim();
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;

    if (!selectedOrg) {
      Alert.alert('Error', 'Please select an organization');
      return;
    }
    if (selectedOrg.available_slots === 0) {
      Alert.alert('Error', 'This organization has no available slots');
      return;
    }
    if (!normalizedStart || !normalizedEnd) {
      Alert.alert('Error', 'Please enter start and end dates');
      return;
    }
    if (!normalizedSkills) {
      Alert.alert('Error', 'Please add your skills');
      return;
    }
    if (!datePattern.test(normalizedStart) || !datePattern.test(normalizedEnd)) {
      Alert.alert('Error', 'Dates must be in YYYY-MM-DD format');
      return;
    }
    const parsedStart = parseDateFromInput(normalizedStart);
    const parsedEnd = parseDateFromInput(normalizedEnd);
    if (!parsedStart || !parsedEnd) {
      Alert.alert('Error', 'Please enter valid calendar dates');
      return;
    }
    if (parsedEnd < parsedStart) {
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
              const res = await requestWithRetry(
                () => api.post('/applications', {
                  org_id: selectedOrg.org_id,
                  start_date: normalizedStart,
                  end_date: normalizedEnd,
                  skills: normalizedSkills,
                  supporting_info: supportingInfo.trim() || undefined,
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
              if (res?.data?.application) {
                setLatestApplication(res.data.application);
                setApplications(prev => [res.data.application, ...prev]);
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

  // --- Helper for status colors ---
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

  // --- Loading state ---
  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.surface }]}>
        <Spinner size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading...</Text>
      </View>
    );
  }

  // --- Main render ---
  // Determine if we should show the form
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
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Text style={[styles.backText, { color: theme.primary }]}>← Back</Text>
            </TouchableOpacity>
            <Text style={[styles.screenTitle, { color: theme.text }]}>Apply for Attachment</Text>
          </View>
          <View style={styles.topBarDots}>
            <View style={[styles.dot, { backgroundColor: theme.primary }]} />
            <View style={[styles.dot, { backgroundColor: theme.outlineVariant }]} />
            <View style={[styles.dot, { backgroundColor: theme.outlineVariant }]} />
          </View>
        </View>

        {/* ===== Step Progress ===== */}
        <View style={styles.stepContainer}>
          <View style={styles.stepHeader}>
            <Text style={[styles.stepLabel, { color: theme.primary }]}>Step 1 of 3</Text>
            <Text style={[styles.stepDescription, { color: theme.textSecondary }]}>Personal & Academic Info</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { backgroundColor: theme.primary, width: '33%' }]} />
            <View style={[styles.progressEmpty, { backgroundColor: theme.outlineVariant }]} />
            <View style={[styles.progressEmpty, { backgroundColor: theme.outlineVariant }]} />
          </View>
        </View>

        {/* ===== Pending application / attachment status (if any) ===== */}
        {myAttachment && (
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

        {!myAttachment && latestApplication && (
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

        {/* ===== If form is not allowed ===== */}
        {!showForm && !myAttachment && !latestApplication && !canSelfPlace && (
          <View style={[styles.emptyCard, { backgroundColor: theme.background }]}>
            <Text style={styles.emptyIcon}>🔒</Text>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>Self‑Placement Disabled</Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Student applications are currently managed by the attachment office.
            </Text>
          </View>
        )}

        {/* ===== MAIN FORM ===== */}
        {showForm && (
          <>
            {/* ---- Selected Organization Card ---- */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Selected Organization</Text>
              {selectedOrg ? (
                <View style={[styles.orgCard, { backgroundColor: theme.surface }]}>
                  <View style={styles.orgCardContent}>
                    <View style={[styles.orgAvatar, { backgroundColor: theme.secondary }]}>
                      <Text style={[styles.orgAvatarText, { color: theme.white }]}>
                        {selectedOrg.org_name?.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.orgCardInfo}>
                      <Text style={[styles.orgCardName, { color: theme.text }]}>{selectedOrg.org_name}</Text>
                      <View style={styles.orgLocationRow}>
                        <Text style={[styles.orgCardLocation, { color: theme.textSecondary }]}>
                          📍 {selectedOrg.location}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={[styles.changeButton, { backgroundColor: theme.primaryLight }]}
                      onPress={() => setSelectedOrg(null)}
                    >
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

            {/* ---- Personal Information ---- */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Personal Information</Text>
              <View style={styles.formGrid}>
                {/* Full Name */}
                <View style={styles.formField}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>FULL NAME</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.outlineVariant }]}
                    value={user?.full_name || user?.name || ''}
                    editable={false}
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>
                {/* Registration Number */}
                <View style={styles.formField}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>REGISTRATION NUMBER</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.outlineVariant }]}
                    value={user?.registration_number || user?.reg_no || ''}
                    editable={false}
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>
                {/* Course / Program */}
                <View style={styles.formField}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>COURSE / PROGRAM</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.outlineVariant }]}
                    value={user?.course || user?.program || ''}
                    editable={false}
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>
                {/* Year of Study */}
                <View style={styles.formField}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>YEAR OF STUDY</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.outlineVariant }]}
                    value={user?.year_of_study ? `Year ${user.year_of_study}` : ''}
                    editable={false}
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>
              </View>
            </View>

            {/* ---- Attachment Details ---- */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Attachment Details</Text>
              <View style={styles.formGrid}>
                {/* Preferred Start Date */}
                <View style={styles.formField}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>PREFERRED START DATE</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.outlineVariant }]}
                    value={startDate}
                    onChangeText={handleStartDateChange}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={theme.textSecondary}
                    autoCapitalize="none"
                  />
                </View>
                {/* Duration */}
                <View style={styles.formField}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>DURATION</Text>
                  <View style={styles.durationPicker}>
                    <TouchableOpacity
                      style={[
                        styles.durationOption,
                        duration === '3' && { backgroundColor: theme.primary, borderColor: theme.primary }
                      ]}
                      onPress={() => handleDurationChange('3')}
                    >
                      <Text style={[
                        styles.durationText,
                        duration === '3' ? { color: theme.white } : { color: theme.text }
                      ]}>
                        3 Months
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.durationOption,
                        duration === '6' && { backgroundColor: theme.primary, borderColor: theme.primary }
                      ]}
                      onPress={() => handleDurationChange('6')}
                    >
                      <Text style={[
                        styles.durationText,
                        duration === '6' ? { color: theme.white } : { color: theme.text }
                      ]}>
                        6 Months
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                {/* End Date (auto-calculated) */}
                <View style={[styles.formField, styles.fullWidth]}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>END DATE (auto‑calculated)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.outlineVariant }]}
                    value={endDate}
                    editable={false}
                    placeholder="Will be set based on start + duration"
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>

                {/* Skills (additional field) */}
                <View style={[styles.formField, styles.fullWidth]}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>SKILLS (comma separated)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.outlineVariant }]}
                    value={skills}
                    onChangeText={setSkills}
                    placeholder="e.g. JavaScript, Data Analysis, Communication"
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>

                {/* Supporting Info */}
                <View style={[styles.formField, styles.fullWidth]}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>SUPPORTING INFORMATION</Text>
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
              </View>
            </View>

            {/* ---- Submit Button ---- */}
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

            {/* ---- Organization List (to select) ---- */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Available Organizations ({organizations.length})
              </Text>
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
                      <View style={[styles.orgAvatarSmall, { backgroundColor: theme.secondary }]}>
                        <Text style={[styles.orgAvatarTextSmall, { color: theme.white }]}>
                          {org.org_name?.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.orgListItemInfo}>
                        <Text style={[styles.orgListItemName, { color: theme.text }]}>{org.org_name}</Text>
                        <Text style={[styles.orgListItemLocation, { color: theme.textSecondary }]}>
                          📍 {org.location}
                        </Text>
                      </View>
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
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>

            <View style={{ height: 80 }} />
          </>
        )}
      </ScrollView>

      {/* ===== Bottom Navigation Shell ===== */}
      <View style={[styles.bottomNav, { backgroundColor: theme.surface, borderTopColor: theme.outlineVariant }]}>
        <TouchableOpacity style={styles.navItem}>
          <Text style={[styles.navIcon, { color: theme.textSecondary }]}>🏠</Text>
          <Text style={[styles.navLabel, { color: theme.textSecondary }]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Text style={[styles.navIcon, { color: theme.textSecondary }]}>🔍</Text>
          <Text style={[styles.navLabel, { color: theme.textSecondary }]}>Search</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navItem, styles.navItemActive]}>
          <Text style={[styles.navIcon, { color: theme.primary }]}>📖</Text>
          <Text style={[styles.navLabel, { color: theme.primary }]}>Logbook</Text>
          <View style={[styles.navIndicator, { backgroundColor: theme.primary }]} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Text style={[styles.navIcon, { color: theme.textSecondary }]}>📊</Text>
          <Text style={[styles.navLabel, { color: theme.textSecondary }]}>Reports</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Text style={[styles.navIcon, { color: theme.textSecondary }]}>👤</Text>
          <Text style={[styles.navLabel, { color: theme.textSecondary }]}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: COLORS.gray },

  // Top App Bar
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
  backText: { fontSize: 16, fontWeight: '600' },
  screenTitle: { fontSize: 18, fontWeight: '700' },
  topBarDots: { flexDirection: 'row', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },

  // Step Progress
  stepContainer: { paddingHorizontal: 16, marginTop: 8, marginBottom: 16 },
  stepHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  stepLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  stepDescription: { fontSize: 13, fontWeight: '400' },
  progressBar: { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { flex: 1 },
  progressEmpty: { flex: 1, opacity: 0.2 },

  // Status Cards
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

  // Empty / disabled
  emptyCard: { margin: 16, padding: 30, borderRadius: 16, alignItems: 'center' },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptyText: { fontSize: 13, textAlign: 'center', marginTop: 6 },

  // Sections
  section: { paddingHorizontal: 16, marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },

  // Selected Org Card
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
  orgAvatarText: { fontSize: 22, fontWeight: 'bold' },
  orgCardInfo: { flex: 1 },
  orgCardName: { fontSize: 16, fontWeight: '700' },
  orgLocationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  orgCardLocation: { fontSize: 13 },
  changeButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  changeButtonText: { fontSize: 12, fontWeight: '600' },
  selectOrgPlaceholder: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  selectOrgText: { fontSize: 14 },

  // Form
  formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  formField: { flex: 1, minWidth: '45%' },
  fullWidth: { flex: 1, minWidth: '100%' },
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
  durationPicker: { flexDirection: 'row', gap: 8 },
  durationOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  durationText: { fontSize: 14, fontWeight: '500' },

  // Submit
  submitContainer: { paddingHorizontal: 16, marginTop: 8, marginBottom: 24 },
  submitButton: {
    height: 52,
    borderRadius: 30,
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

  // Organization list items
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
  orgAvatarTextSmall: { fontSize: 16, fontWeight: 'bold' },
  orgListItemInfo: { flex: 1 },
  orgListItemName: { fontSize: 14, fontWeight: '600' },
  orgListItemLocation: { fontSize: 12, marginTop: 2 },
  slotBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  slotBadgeText: { fontSize: 12, fontWeight: '600' },

  // Bottom Navigation
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    height: 60,
    borderTopWidth: 1,
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navItemActive: {
    position: 'relative',
  },
  navIcon: { fontSize: 24, marginBottom: 2 },
  navLabel: { fontSize: 10, fontWeight: '600' },
  navIndicator: {
    position: 'absolute',
    bottom: 0,
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
});