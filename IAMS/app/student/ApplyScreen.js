import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, RefreshControl, TextInput
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import api, { requestWithRetry } from '../../api/axios';
import { COLORS } from '../../constants/colors';
import { hasRolePermission } from '../../utils/permissions';
import Spinner from '../../components/Spinner';

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
  const [skills, setSkills] = useState('');
  const [supportingInfo, setSupportingInfo] = useState('');
  const [applications, setApplications] = useState([]);
  const [latestApplication, setLatestApplication] = useState(null);

  const fetchData = async () => {
    try {
      console.log('Fetching organizations and attachment data...');
      const [orgsRes, attachRes, appsRes] = await Promise.all([
        api.get('/students/organizations'),
        api.get('/students/my-attachment'),
        api.get('/applications'),
      ]);
      console.log('Organizations response:', orgsRes.data);
      console.log('Attachment response:', attachRes.data);
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
      normalized.getUTCFullYear() !== year
      || normalized.getUTCMonth() !== month - 1
      || normalized.getUTCDate() !== day
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
    if (
      date.getUTCFullYear() !== year
      || date.getUTCMonth() !== month - 1
      || date.getUTCDate() !== day
    ) {
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

  // Calculate end date exactly 3 months from start date
  const calculateEndDate = (start) => {
    const startDateObj = parseDateFromInput(start);
    if (!startDateObj) return '';

    const endDateObj = new Date(startDateObj.getTime());
    endDateObj.setUTCMonth(endDateObj.getUTCMonth() + 3);

    return formatDateYmd(endDateObj);
  };

  const handleStartDateChange = (value) => {
    const normalizedValue = normalizeDateInput(value);
    setStartDate(normalizedValue);
    // Auto-fill end date when valid start date is entered
    const calculatedEndDate = calculateEndDate(normalizedValue);
    setEndDate(calculatedEndDate);
  };

  useEffect(() => { fetchData(); }, []);

  const handleApply = async () => {
    if (!canSelfPlace) {
      Alert.alert('Permission Disabled', 'Self-placement applications are currently disabled for students.');
      return;
    }

    if (latestApplication && ['pending', 'more_info', 'accepted'].includes(latestApplication.status)) {
      Alert.alert('Application Pending', 'You already have an application under review.');
      return;
    }

    const normalizedStartDate = startDate.trim();
    const normalizedEndDate = endDate.trim();
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
    if (!normalizedStartDate || !normalizedEndDate) {
      Alert.alert('Error', 'Please enter start and end dates');
      return;
    }
    if (!normalizedSkills) {
      Alert.alert('Error', 'Please add your skills');
      return;
    }
    if (!datePattern.test(normalizedStartDate) || !datePattern.test(normalizedEndDate)) {
      Alert.alert('Error', 'Dates must be in YYYY-MM-DD format');
      return;
    }
    const parsedStartDate = parseDateFromInput(normalizedStartDate);
    const parsedEndDate = parseDateFromInput(normalizedEndDate);
    if (!parsedStartDate || !parsedEndDate) {
      Alert.alert('Error', 'Please enter valid calendar dates');
      return;
    }
    if (parsedEndDate < parsedStartDate) {
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
                  start_date: normalizedStartDate,
                  end_date: normalizedEndDate,
                  skills: normalizedSkills,
                  supporting_info: supportingInfo.trim() || undefined,
                }),
                { retries: 3, baseDelay: 500 }
              );
              Alert.alert(
                'Application Submitted! 🎉',
                `Your application to ${selectedOrg.org_name} has been submitted. Wait for confirmation.`,
                [{ text: 'OK', onPress: () => fetchData() }]
              );
              setSelectedOrg(null);
              setStartDate('');
              setEndDate('');
              setSkills('');
              setSupportingInfo('');
              if (res?.data?.application) {
                setLatestApplication(res.data.application);
                setApplications(prev => [res.data.application, ...prev]);
              }
            } catch (err) {
              console.error('Apply submit failed:', {
                message: err.message,
                status: err.response?.status,
                data: err.response?.data,
                url: err.config?.url,
                baseURL: err.config?.baseURL,
                timeout: err.config?.timeout,
              });
              const message = err.response?.data?.message
                || (err.request && !err.response
                  ? 'Network error while submitting. Please check your connection and try again.'
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
      <View style={styles.loadingContainer}>
        <Spinner size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.surface }]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.secondary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: theme.primary }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.white }]}>Apply for Placement</Text>
        <Text style={[styles.subtitle, { color: '#8899AA' }]}>Find and apply for industrial attachment</Text>
      </View>

      {/* Current Attachment Status */}
      {myAttachment && (
        <View style={[styles.currentCard, { backgroundColor: theme.background, borderLeftColor: theme.primary }]}>
          <Text style={[styles.currentTitle, { color: theme.textSecondary }]}>Your Current Application</Text>
          <View style={styles.currentInfo}>
            <View style={styles.currentLeft}>
              <Text style={[styles.orgName, { color: theme.text }]}>{myAttachment.org_name}</Text>
              <Text style={[styles.orgLocation, { color: theme.textSecondary }]}>📍 {myAttachment.location}</Text>
              {myAttachment.supervisor_name && (
                <Text style={[styles.supervisor, { color: '#2E7D32' }]}>
                  👨‍🏫 {myAttachment.supervisor_name}
                </Text>
              )}
              {myAttachment.start_date && (
                <Text style={[styles.dates, { color: theme.primary }]}>
                  📅 {new Date(myAttachment.start_date).toLocaleDateString()} —{' '}
                  {new Date(myAttachment.end_date).toLocaleDateString()}
                </Text>
              )}
            </View>
            <View style={[styles.statusBadge, {
              backgroundColor: statusColor(myAttachment.status).bg
            }]}>
              <Text style={[styles.statusText, {
                color: statusColor(myAttachment.status).text
              }]}>
                {myAttachment.status}
              </Text>
            </View>
          </View>

          {myAttachment.status === 'rejected' && (
            <Text style={[styles.rejectedNote, { color: '#C62828' }]}>
              Your application was rejected. You can apply to another organization below.
            </Text>
          )}
        </View>
      )}

      {!myAttachment && latestApplication && (
        <View style={[styles.currentCard, { backgroundColor: theme.background, borderLeftColor: theme.primary }]}>
          <Text style={[styles.currentTitle, { color: theme.textSecondary }]}>Your Application Status</Text>
          <View style={styles.currentInfo}>
            <View style={styles.currentLeft}>
              <Text style={[styles.orgName, { color: theme.text }]}>{latestApplication.org_name || 'Host Organization'}</Text>
              {latestApplication.start_date && latestApplication.end_date && (
                <Text style={[styles.dates, { color: theme.primary }]}>
                  📅 {new Date(latestApplication.start_date).toLocaleDateString()} —{' '}
                  {new Date(latestApplication.end_date).toLocaleDateString()}
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

      {/* Only show apply form if no active application */}
      {(!myAttachment || myAttachment.status === 'rejected') && !canSelfPlace && (
        <View style={[styles.emptyCard, { backgroundColor: theme.background }]}>
          <Text style={styles.emptyIcon}>🔒</Text>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Self-Placement Disabled</Text>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            Student applications are currently managed by the attachment office.
          </Text>
        </View>
      )}

      {(!myAttachment || myAttachment.status === 'rejected') && canSelfPlace
        && (!latestApplication || !['pending', 'more_info', 'accepted'].includes(latestApplication.status)) && (
        <>
          {/* Available Organizations Count Card */}
          <View style={[styles.statsCard, { backgroundColor: theme.secondary }]}>
            <View style={styles.statsContent}>
              <Text style={[styles.statsLabel, { color: 'rgba(255,255,255,0.8)' }]}>Approved Host Organizations</Text>
              <View style={styles.statsRow}>
                <Text style={[styles.statsNumber, { color: theme.white }]}>{organizations.length}</Text>
                <Text style={[styles.statsSubtitle, { color: 'rgba(255,255,255,0.8)' }]}>
                  Available{organizations.length !== 1 ? ' positions' : ' position'}
                </Text>
              </View>
            </View>
            <View style={[styles.statsIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Text style={styles.statsIconEmoji}>🏢</Text>
            </View>
          </View>

          {/* Selected Org Preview */}
          {selectedOrg && (
            <View style={[styles.selectedCard, { backgroundColor: theme.background, borderLeftColor: '#2E7D32' }]}>
              <Text style={[styles.selectedLabel, { color: theme.textSecondary }]}>Selected Organization:</Text>
              <Text style={[styles.selectedName, { color: theme.text }]}>{selectedOrg.org_name}</Text>
              <Text style={[styles.selectedLocation, { color: theme.textSecondary }]}>📍 {selectedOrg.location}</Text>
              <Text style={[styles.selectedSlots, { color: theme.primary }]}>
                Available Slots: {selectedOrg.available_slots}
              </Text>

              {/* Date Inputs */}
              <Text style={[styles.dateLabel, { color: theme.text }]}>Start Date (YYYY-MM-DD)</Text>
              <TextInput
                style={[styles.dateInput, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.gray }]}
                value={startDate}
                onChangeText={handleStartDateChange}
                placeholder="e.g. 2026-06-01"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="none"
              />

              <Text style={[styles.dateLabel, { color: theme.text }]}>End Date (Auto-calculated: 3 months)</Text>
              <TextInput
                style={[styles.dateInput, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.gray }]}
                value={endDate}
                onChangeText={setEndDate}
                placeholder="Auto-filled from start date"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="none"
                editable={false}
                selectTextOnFocus={true}
              />

              <Text style={[styles.dateLabel, { color: theme.text }]}>Skills (comma-separated)</Text>
              <TextInput
                style={[styles.dateInput, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.gray }]}
                value={skills}
                onChangeText={setSkills}
                placeholder="e.g. JavaScript, Data Analysis, Communication"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="none"
              />

              <Text style={[styles.dateLabel, { color: theme.text }]}>Supporting Information</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.gray }]}
                value={supportingInfo}
                onChangeText={setSupportingInfo}
                placeholder="Share relevant experience, projects, or documents..."
                placeholderTextColor={theme.textSecondary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={[styles.applyBtn, { backgroundColor: theme.primary }]}
                onPress={handleApply}
                disabled={applying}
              >
                {applying
                  ? <Spinner color={theme.white} size="small" />
                  : <Text style={[styles.applyBtnText, { color: theme.white }]}>Submit Application 📋</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: theme.gray }]}
                onPress={() => setSelectedOrg(null)}
              >
                <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Organizations List */}
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Available Organizations ({organizations.length})
          </Text>

          {organizations.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.background }]}>
              <Text style={styles.emptyIcon}>🏢</Text>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No Organizations Available</Text>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                No approved organizations at the moment. Check back later!
              </Text>
            </View>
          ) : (
            organizations.map((org, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.orgCard,
                  { backgroundColor: theme.background },
                  selectedOrg?.org_id === org.org_id && [styles.orgCardSelected, { backgroundColor: '#FFF9F5', borderColor: theme.primary }],
                  org.available_slots === 0 && styles.orgCardDisabled
                ]}
                onPress={() => org.available_slots > 0 && setSelectedOrg(org)}
                disabled={org.available_slots === 0}
              >
                <View style={styles.orgHeader}>
                  <View style={[styles.orgAvatar, { backgroundColor: theme.secondary }]}>
                    <Text style={[styles.orgAvatarText, { color: theme.white }]}>
                      {org.org_name?.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.orgInfo}>
                    <Text style={[styles.orgCardName, { color: theme.text }]}>{org.org_name}</Text>
                    <Text style={[styles.orgCardLocation, { color: theme.textSecondary }]}>📍 {org.location}</Text>
                    <Text style={[styles.orgCardContact, { color: theme.primary }]}>
                      👤 {org.contact_person}
                    </Text>
                  </View>
                  <View style={[styles.slotsBox, org.available_slots === 0 && styles.slotsBoxFull]}>
                    <Text style={[styles.slotsNum, org.available_slots === 0 ? styles.slotsNumFull : { color: '#2E7D32' }]}>
                      {org.available_slots === 0 ? 'FULL' : org.available_slots}
                    </Text>
                    {org.available_slots > 0 && <Text style={[styles.slotsLabel, { color: '#2E7D32' }]}>slots</Text>}
                  </View>
                </View>

                {selectedOrg?.org_id === org.org_id && (
                  <View style={styles.selectedIndicator}>
                    <Text style={[styles.selectedIndicatorText, { color: '#2E7D32' }]}>✓ Selected</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))
          )}
        </>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F4F4' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: COLORS.gray },
  header: {
    backgroundColor: COLORS.secondary,
    paddingTop: 55, paddingBottom: 25,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  backBtn: { marginBottom: 10 },
  backText: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
  title: { color: COLORS.white, fontSize: 24, fontWeight: 'bold' },
  subtitle: { color: '#8899AA', fontSize: 13, marginTop: 4 },
  currentCard: {
    backgroundColor: COLORS.white,
    margin: 16, padding: 16,
    borderRadius: 16, elevation: 2,
    borderLeftWidth: 4, borderLeftColor: COLORS.primary,
  },
  currentTitle: { fontSize: 13, color: COLORS.gray, marginBottom: 10, fontWeight: '600' },
  currentInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  currentLeft: { flex: 1 },
  orgName: { fontSize: 16, fontWeight: '700', color: COLORS.darkGray },
  orgLocation: { fontSize: 12, color: COLORS.gray, marginTop: 4 },
  supervisor: { fontSize: 12, color: '#2E7D32', marginTop: 4 },
  dates: { fontSize: 12, color: COLORS.primary, marginTop: 4 },
  detailText: { fontSize: 12, color: COLORS.gray, marginTop: 4 },
  responseText: { fontSize: 12, color: COLORS.darkGray, marginTop: 8 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  statusText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  rejectedNote: {
    color: '#C62828', fontSize: 12,
    marginTop: 10, fontStyle: 'italic',
  },
  selectedCard: {
    backgroundColor: COLORS.white,
    margin: 16, padding: 16,
    borderRadius: 16, elevation: 2,
    borderLeftWidth: 4, borderLeftColor: '#2E7D32',
  },
  selectedLabel: { fontSize: 12, color: COLORS.gray, marginBottom: 4 },
  selectedName: { fontSize: 16, fontWeight: '700', color: COLORS.darkGray },
  selectedLocation: { fontSize: 13, color: COLORS.gray, marginTop: 4 },
  selectedSlots: { fontSize: 13, color: COLORS.primary, marginTop: 4, marginBottom: 16 },
  dateLabel: { fontSize: 13, fontWeight: '600', color: COLORS.darkGray, marginBottom: 6, marginTop: 10 },
  dateInput: {
    borderWidth: 1, borderColor: COLORS.gray,
    borderRadius: 10, padding: 12,
    backgroundColor: COLORS.lightGray,
    color: COLORS.darkGray,
  },
  textArea: {
    borderWidth: 1,
    borderColor: COLORS.gray,
    borderRadius: 10,
    padding: 12,
    backgroundColor: COLORS.lightGray,
    color: COLORS.darkGray,
    minHeight: 100,
  },
  applyBtn: {
    backgroundColor: COLORS.primary,
    padding: 14, borderRadius: 12,
    alignItems: 'center', marginTop: 16,
  },
  applyBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 15 },
  cancelBtn: {
    padding: 12, borderRadius: 12,
    alignItems: 'center', marginTop: 8,
    borderWidth: 1, borderColor: COLORS.gray,
  },
  cancelBtnText: { color: COLORS.gray, fontWeight: '600', fontSize: 14 },
  sectionTitle: {
    fontSize: 16, fontWeight: '700',
    color: COLORS.darkGray,
    marginLeft: 16, marginTop: 20, marginBottom: 10,
  },
  emptyCard: {
    backgroundColor: COLORS.white,
    margin: 16, padding: 30,
    borderRadius: 16, alignItems: 'center', elevation: 2,
  },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.darkGray },
  emptyText: { fontSize: 13, color: COLORS.gray, textAlign: 'center', marginTop: 6 },
  orgCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16, marginBottom: 12,
    padding: 14, borderRadius: 16, elevation: 2,
    borderWidth: 2, borderColor: 'transparent',
  },
  orgCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#FFF9F5',
  },
  orgCardDisabled: {
    opacity: 0.6,
  },
  orgHeader: { flexDirection: 'row', alignItems: 'center' },
  orgAvatar: {
    width: 46, height: 46,
    borderRadius: 14,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  orgAvatarText: { color: COLORS.white, fontSize: 20, fontWeight: 'bold' },
  orgInfo: { flex: 1 },
  orgCardName: { fontSize: 14, fontWeight: '700', color: COLORS.darkGray },
  orgCardLocation: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  orgCardContact: { fontSize: 12, color: COLORS.primary, marginTop: 2 },
  slotsBox: {
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 8, borderRadius: 10,
  },
  slotsBoxFull: {
    backgroundColor: '#FFEBEE',
  },
  slotsNum: { fontSize: 18, fontWeight: 'bold', color: '#2E7D32' },
  slotsNumFull: { fontSize: 12, fontWeight: 'bold', color: '#C62828' },
  slotsLabel: { fontSize: 10, color: '#2E7D32' },
  selectedIndicator: {
    backgroundColor: '#E8F5E9',
    padding: 6, borderRadius: 8,
    alignSelf: 'flex-start', marginTop: 10,
  },
  selectedIndicatorText: { color: '#2E7D32', fontWeight: '700', fontSize: 12 },
  statsCard: {
    marginHorizontal: 16, marginTop: 16, marginBottom: 20,
    paddingHorizontal: 16, paddingVertical: 16,
    borderRadius: 16, elevation: 3,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  statsContent: { flex: 1 },
  statsLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  statsRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  statsNumber: { fontSize: 32, fontWeight: '800' },
  statsSubtitle: { fontSize: 13, fontWeight: '500' },
  statsIcon: {
    width: 60, height: 60,
    borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
    marginLeft: 12,
  },
  statsIconEmoji: { fontSize: 28 },
});
