import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, TextInput
} from 'react-native';
import { COLORS } from '../../constants/colors';
import api from '../../api/axios';
import Spinner from '../../components/Spinner';

export default function OrgDetailsScreen({ navigation, route }) {
  const { orgId, orgName } = route.params;
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  useEffect(() => {
    api.get(`/admin/org-details/${orgId}`)
      .then(res => setOrg(res.data))
      .catch(() => Alert.alert('Error', 'Failed to load organization details'))
      .finally(() => setLoading(false));
  }, []);

  const handleApprove = () => {
    Alert.alert('Approve Organization', `Approve ${orgName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve ✓',
        onPress: async () => {
          try {
            await api.put(`/admin/approve-org/${orgId}`);
            Alert.alert('Success!', `${orgName} has been approved!`);
            navigation.goBack();
          } catch (err) {
            Alert.alert('Error', 'Failed to approve organization');
          }
        }
      }
    ]);
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for rejection');
      return;
    }
    setRejecting(true);
    try {
      await api.put(`/admin/reject-org/${orgId}`, { reason: rejectReason });
      Alert.alert('Rejected', `${orgName} has been rejected.`);
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', 'Failed to reject organization');
    } finally {
      setRejecting(false);
    }
  };

  const renderStars = (rating) => {
    const stars = Math.round(rating || 0);
    return '⭐'.repeat(stars) + '☆'.repeat(5 - stars);
  };

  const DetailRow = ({ label, value }) => (
    value ? (
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    ) : null
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Spinner size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Organization Review</Text>
        <Text style={styles.subtitle}>Review before approving</Text>
      </View>

      {/* Approval Status */}
      <View style={[styles.statusBanner, {
        backgroundColor: org?.is_approved ? '#E8F5E9' : '#FFF3E0'
      }]}>
        <Text style={[styles.statusBannerText, {
          color: org?.is_approved ? '#2E7D32' : COLORS.primary
        }]}>
          {org?.is_approved ? '✅ Already Approved' : '⏳ Pending Approval'}
        </Text>
      </View>

      {/* Rating */}
      {org?.total_reviews > 0 && (
        <View style={styles.ratingCard}>
          <Text style={styles.ratingStars}>{renderStars(org.avg_rating)}</Text>
          <Text style={styles.ratingNum}>{Number(org.avg_rating).toFixed(1)}/5</Text>
          <Text style={styles.ratingCount}>({org.total_reviews} reviews)</Text>
        </View>
      )}

      {/* Organization Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🏢 Organization Information</Text>
        <DetailRow label="Organization Name" value={org?.org_name} />
        <DetailRow label="Industry/Sector" value={org?.industry} />
        <DetailRow label="Physical Address" value={org?.location} />
        <DetailRow label="Official Email" value={org?.official_email || org?.email} />
        <DetailRow label="Phone" value={org?.phone} />
        <DetailRow label="Website" value={org?.website} />
        {org?.description && (
          <View style={styles.descBox}>
            <Text style={styles.descLabel}>Description</Text>
            <Text style={styles.descText}>{org.description}</Text>
          </View>
        )}
      </View>

      {/* Contact Person */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👤 Contact Person</Text>
        <DetailRow label="Full Name" value={org?.contact_person} />
        <DetailRow label="Position" value={org?.contact_position} />
        <DetailRow label="Email" value={org?.email} />
        <DetailRow label="Phone" value={org?.phone} />
      </View>

      {/* Attachment Opportunity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 Attachment Opportunity</Text>
        <DetailRow label="Department" value={org?.department_offering} />
        <DetailRow label="Available Slots" value={org?.available_slots?.toString()} />
        <DetailRow label="Duration" value={org?.attachment_duration} />
        <DetailRow label="Work Mode" value={org?.work_mode} />
        <DetailRow label="Required Skills" value={org?.required_skills} />
        {org?.roles_tasks && (
          <View style={styles.descBox}>
            <Text style={styles.descLabel}>Roles & Tasks</Text>
            <Text style={styles.descText}>{org.roles_tasks}</Text>
          </View>
        )}
      </View>

      {/* Internal Supervision */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👨‍💼 Internal Supervision</Text>
        <DetailRow label="Supervisor Name" value={org?.internal_supervisor} />
        <DetailRow label="Position" value={org?.supervisor_position} />
        <DetailRow
          label="Mentorship Available"
          value={org?.mentorship_available ? 'Yes ✓' : 'No'}
        />
      </View>

      {/* Support */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💰 Support Provided</Text>
        <DetailRow label="Allowance/Stipend" value={org?.allowance} />
        {org?.resources_provided && (
          <View style={styles.descBox}>
            <Text style={styles.descLabel}>Resources/Equipment</Text>
            <Text style={styles.descText}>{org.resources_provided}</Text>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      {!org?.is_approved && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.approveBtn}
            onPress={handleApprove}
          >
            <Text style={styles.approveBtnText}>✓ Approve Organization</Text>
          </TouchableOpacity>

          {!showRejectInput ? (
            <TouchableOpacity
              style={styles.rejectBtn}
              onPress={() => setShowRejectInput(true)}
            >
              <Text style={styles.rejectBtnText}>✗ Reject Organization</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.rejectForm}>
              <Text style={styles.rejectLabel}>Reason for Rejection *</Text>
              <TextInput
                style={styles.rejectInput}
                placeholder="Provide a reason..."
                value={rejectReason}
                onChangeText={setRejectReason}
                multiline
                numberOfLines={3}
              />
              <View style={styles.rejectActions}>
                <TouchableOpacity
                  style={styles.cancelRejectBtn}
                  onPress={() => setShowRejectInput(false)}
                >
                  <Text style={styles.cancelRejectText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmRejectBtn}
                  onPress={handleReject}
                  disabled={rejecting}
                >
                  {rejecting
                    ? <Spinner color={COLORS.white} size="small" />
                    : <Text style={styles.confirmRejectText}>Confirm Reject</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F4F4' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  statusBanner: {
    margin: 16, padding: 12,
    borderRadius: 12, alignItems: 'center',
  },
  statusBannerText: { fontWeight: '700', fontSize: 14 },
  ratingCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16, marginBottom: 8,
    padding: 16, borderRadius: 16,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    elevation: 2,
  },
  ratingStars: { fontSize: 18 },
  ratingNum: { fontSize: 16, fontWeight: '700', color: COLORS.darkGray },
  ratingCount: { fontSize: 13, color: COLORS.gray },
  section: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16, marginBottom: 12,
    padding: 16, borderRadius: 16, elevation: 2,
  },
  sectionTitle: {
    fontSize: 15, fontWeight: '700',
    color: COLORS.secondary, marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F4F4F4',
  },
  detailLabel: { fontSize: 13, color: COLORS.gray, flex: 1 },
  detailValue: { fontSize: 13, fontWeight: '600', color: COLORS.darkGray, flex: 1, textAlign: 'right' },
  descBox: {
    backgroundColor: '#F8F9FA',
    padding: 12, borderRadius: 10, marginTop: 8,
  },
  descLabel: { fontSize: 12, color: COLORS.gray, marginBottom: 6 },
  descText: { fontSize: 13, color: COLORS.darkGray, lineHeight: 20 },
  actions: { marginHorizontal: 16, marginBottom: 16 },
  approveBtn: {
    backgroundColor: '#2E7D32',
    padding: 15, borderRadius: 14,
    alignItems: 'center', marginBottom: 10,
  },
  approveBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 15 },
  rejectBtn: {
    borderWidth: 2, borderColor: '#C62828',
    padding: 15, borderRadius: 14,
    alignItems: 'center',
  },
  rejectBtnText: { color: '#C62828', fontWeight: '700', fontSize: 15 },
  rejectForm: {
    backgroundColor: COLORS.white,
    padding: 16, borderRadius: 14,
    borderWidth: 2, borderColor: '#C62828',
  },
  rejectLabel: { fontSize: 13, fontWeight: '600', color: COLORS.darkGray, marginBottom: 8 },
  rejectInput: {
    borderWidth: 1, borderColor: COLORS.gray,
    borderRadius: 10, padding: 12,
    fontSize: 14, backgroundColor: COLORS.lightGray,
    height: 80, textAlignVertical: 'top',
    marginBottom: 12,
  },
  rejectActions: { flexDirection: 'row', gap: 10 },
  cancelRejectBtn: {
    flex: 1, padding: 12,
    borderRadius: 10, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.gray,
  },
  cancelRejectText: { color: COLORS.gray, fontWeight: '600' },
  confirmRejectBtn: {
    flex: 1, padding: 12,
    borderRadius: 10, alignItems: 'center',
    backgroundColor: '#C62828',
  },
  confirmRejectText: { color: COLORS.white, fontWeight: '700' },
});