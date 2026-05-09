import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, RefreshControl, TextInput
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import api from '../../api/axios';
import { COLORS } from '../../constants/colors';

export default function ApplyScreen({ navigation }) {
  const { theme } = useTheme();
  const [organizations, setOrganizations] = useState([]);
  const [myAttachment, setMyAttachment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchData = async () => {
    try {
      const [orgsRes, attachRes] = await Promise.all([
        api.get('/students/organizations'),
        api.get('/students/my-attachment'),
      ]);
      setOrganizations(orgsRes.data);
      setMyAttachment(attachRes.data);
    } catch (err) {
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleApply = async () => {
    const normalizedStartDate = startDate.trim();
    const normalizedEndDate = endDate.trim();
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;

    if (!selectedOrg) {
      Alert.alert('Error', 'Please select an organization');
      return;
    }
    if (!normalizedStartDate || !normalizedEndDate) {
      Alert.alert('Error', 'Please enter start and end dates');
      return;
    }
    if (!datePattern.test(normalizedStartDate) || !datePattern.test(normalizedEndDate)) {
      Alert.alert('Error', 'Dates must be in YYYY-MM-DD format');
      return;
    }
    const parsedStartDate = new Date(normalizedStartDate);
    const parsedEndDate = new Date(normalizedEndDate);
    if (Number.isNaN(parsedStartDate.getTime()) || Number.isNaN(parsedEndDate.getTime())) {
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
              await api.post('/students/apply', {
                org_id: selectedOrg.org_id,
                start_date: normalizedStartDate,
                end_date: normalizedEndDate,
              });
              Alert.alert(
                'Application Submitted! 🎉',
                `Your application to ${selectedOrg.org_name} has been submitted. Wait for confirmation.`,
                [{ text: 'OK', onPress: () => fetchData() }]
              );
              setSelectedOrg(null);
              setStartDate('');
              setEndDate('');
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to submit application');
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
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

      {/* Only show apply form if no active application */}
      {(!myAttachment || myAttachment.status === 'rejected') && (
        <>
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
                onChangeText={setStartDate}
                placeholder="e.g. 2026-06-01"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="none"
              />

              <Text style={[styles.dateLabel, { color: theme.text }]}>End Date (YYYY-MM-DD)</Text>
              <TextInput
                style={[styles.dateInput, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.gray }]}
                value={endDate}
                onChangeText={setEndDate}
                placeholder="e.g. 2026-08-31"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="none"
              />

              <TouchableOpacity
                style={[styles.applyBtn, { backgroundColor: theme.primary }]}
                onPress={handleApply}
                disabled={applying}
              >
                {applying
                  ? <ActivityIndicator color={theme.white} />
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
                No approved organizations with available slots at the moment.
                Check back later!
              </Text>
            </View>
          ) : (
            organizations.map((org, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.orgCard,
                  { backgroundColor: theme.background },
                  selectedOrg?.org_id === org.org_id && [styles.orgCardSelected, { backgroundColor: '#FFF9F5', borderColor: theme.primary }]
                ]}
                onPress={() => setSelectedOrg(org)}
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
                  <View style={styles.slotsBox}>
                    <Text style={[styles.slotsNum, { color: '#2E7D32' }]}>{org.available_slots}</Text>
                    <Text style={[styles.slotsLabel, { color: '#2E7D32' }]}>slots</Text>
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
  slotsNum: { fontSize: 18, fontWeight: 'bold', color: '#2E7D32' },
  slotsLabel: { fontSize: 10, color: '#2E7D32' },
  selectedIndicator: {
    backgroundColor: '#E8F5E9',
    padding: 6, borderRadius: 8,
    alignSelf: 'flex-start', marginTop: 10,
  },
  selectedIndicatorText: { color: '#2E7D32', fontWeight: '700', fontSize: 12 },
});
