import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../api/axios';
import Spinner from '../../components/Spinner';

const NAVY = '#0F2419';
const BG = '#EEF2F0';
const WHITE = '#FFFFFF';
const TEAL = '#1B7A65';
const PRIMARY = '#005F53';
const PRIMARY_LIGHT = '#E0F5F1';
const TEXT = '#1A1A2E';
const MUTED = '#5A6A7A';
const BORDER = '#D8E4DF';
const ORANGE = '#E8711A';
const RED = '#EF4444';
const SUCCESS = '#10B981';

const TOTAL_WEEKS = 12;

const statusMeta = (status, isActive = true) => {
  if (!isActive) return { label: 'Inactive', bg: '#FFEBEE', color: RED };

  switch (String(status || '').toLowerCase()) {
    case 'ongoing':
    case 'placed':
    case 'approved':
    case 'active':
      return { label: 'Active', bg: '#DDF8ED', color: '#057A55' };
    case 'pending':
      return { label: 'Pending', bg: '#FFF3E0', color: '#C65D00' };
    case 'completed':
      return { label: 'Completed', bg: '#E3F2FD', color: '#1565C0' };
    case 'rejected':
      return { label: 'Rejected', bg: '#FFEBEE', color: RED };
    default:
      return { label: 'Unplaced', bg: '#F3F4F6', color: MUTED };
  }
};

const initialsFor = (name) => {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '?';
  return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase();
};

const formatDate = (value) => {
  if (!value) return 'TBD';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'TBD';
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
};

const valueOrDash = (value) => {
  if (value === 0) return '0';
  return value ? String(value) : '-';
};

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={2}>{valueOrDash(value)}</Text>
    </View>
  );
}

function DetailBlock({ icon, tint, label, value }) {
  return (
    <View style={styles.detailBlock}>
      <View style={[styles.detailIcon, { backgroundColor: `${tint}18` }]}>
        <MaterialCommunityIcons name={icon} size={23} color={tint} />
      </View>
      <View style={styles.detailTextWrap}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue} numberOfLines={2}>{valueOrDash(value)}</Text>
      </View>
    </View>
  );
}

function DateTile({ label, value }) {
  return (
    <View style={styles.dateTile}>
      <Text style={styles.dateLabel}>{label}</Text>
      <Text style={styles.dateValue}>{formatDate(value)}</Text>
    </View>
  );
}

export default function StudentDetailScreen({ navigation, route }) {
  const initialStudent = route.params?.student || {};
  const [student, setStudent] = useState(initialStudent);
  const [details, setDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(!!initialStudent.attachment_id);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const fetchAttachmentDetails = async () => {
      if (!initialStudent.attachment_id) {
        setLoadingDetails(false);
        return;
      }

      try {
        const res = await api.get(`/admin/attachment/${initialStudent.attachment_id}`);
        if (!mounted) return;
        setDetails(res.data);
        if (res.data?.attachment) {
          setStudent((prev) => ({
            ...prev,
            name: res.data.attachment.student_name || prev.name,
            full_name: res.data.attachment.student_name || prev.full_name,
            reg_number: res.data.attachment.reg_number || prev.reg_number,
            department: res.data.attachment.department || prev.department,
            year_of_study: res.data.attachment.year_of_study || prev.year_of_study,
            phone: res.data.attachment.student_phone || prev.phone,
            attachment_status: res.data.attachment.status || prev.attachment_status,
            org_name: res.data.attachment.org_name || prev.org_name,
          }));
        }
      } catch (err) {
        console.error('Failed to load student attachment details:', err.message);
      } finally {
        if (mounted) setLoadingDetails(false);
      }
    };

    fetchAttachmentDetails();
    return () => { mounted = false; };
  }, [initialStudent.attachment_id]);

  const attachment = details?.attachment || {};
  const logbookEntries = details?.logbookEntries || [];
  const name = student.name || student.full_name || attachment.student_name || 'Student';
  const currentStatus = attachment.status || student.attachment_status || student.status;
  const meta = statusMeta(currentStatus, student.is_active !== false);
  const latestWeek = Math.max(0, ...logbookEntries.map((entry) => Number(entry.week_number) || 0));
  const completedWeeks = Math.min(latestWeek || logbookEntries.length, TOTAL_WEEKS);
  const progress = Math.round((completedWeeks / TOTAL_WEEKS) * 100);
  const assignmentAvailable = !!(attachment.attachment_id || student.attachment_id);

  const profileRows = useMemo(() => ([
    ['Department', student.department || attachment.department],
    ['Year of Study', student.year_of_study ? `Year ${student.year_of_study}` : attachment.year_of_study ? `Year ${attachment.year_of_study}` : null],
    ['Phone Number', student.phone || attachment.student_phone],
    ['Email', student.email],
  ]), [student, attachment]);

  const handleToggleActive = () => {
    if (!student.user_id) {
      Alert.alert('Unavailable', 'This student record has no linked user account.');
      return;
    }

    const isActive = student.is_active !== false;
    Alert.alert(
      isActive ? 'Deactivate Student' : 'Reactivate Student',
      `${isActive ? 'Deactivate' : 'Reactivate'} ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isActive ? 'Deactivate' : 'Reactivate',
          style: isActive ? 'destructive' : 'default',
          onPress: async () => {
            try {
              setActionLoading(true);
              await api.put(`/admin/toggle-user/${student.user_id}`);
              setStudent((prev) => ({ ...prev, is_active: !isActive }));
            } catch {
              Alert.alert('Error', 'Failed to update student status.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleResetPassword = () => {
    if (!student.email) {
      Alert.alert('Unavailable', 'This student record has no email address.');
      return;
    }

    Alert.alert(
      'Reset Password',
      `Send a reset code to ${student.email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            try {
              setActionLoading(true);
              await api.post('/auth/resend-code', { email: student.email });
              Alert.alert('Code Sent', `A reset code has been sent to ${student.email}.`);
            } catch {
              Alert.alert('Error', 'Failed to send reset code.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleAssign = () => {
    if (!assignmentAvailable) {
      Alert.alert('No Attachment', 'This student does not have an attachment to assign yet.');
      return;
    }

    navigation.navigate('AssignSupervisor', {
      attachmentId: attachment.attachment_id || student.attachment_id,
      studentName: name,
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={22} color={WHITE} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{name}</Text>
        </View>
        <View style={[styles.headerStatus, { backgroundColor: meta.bg, borderColor: `${meta.color}44` }]}>
          <Text style={[styles.headerStatusText, { color: meta.color }]}>{meta.label}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.profileHead}>
            <LinearGradient colors={[PRIMARY, TEAL]} style={styles.avatar}>
              <Text style={styles.avatarText}>{initialsFor(name)}</Text>
            </LinearGradient>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.regText}>Registration: {valueOrDash(student.reg_number || attachment.reg_number)}</Text>
          </View>

          <View style={styles.divider} />
          {profileRows.map(([label, value]) => (
            <InfoRow key={label} label={label} value={value} />
          ))}
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Current Attachment</Text>
            <View style={[styles.pill, { backgroundColor: meta.bg }]}>
              <Text style={[styles.pillText, { color: meta.color }]}>{String(currentStatus || 'Unplaced')}</Text>
            </View>
          </View>

          {loadingDetails ? (
            <View style={styles.inlineLoading}>
              <Spinner size="small" color={TEAL} />
              <Text style={styles.inlineLoadingText}>Loading attachment details...</Text>
            </View>
          ) : (
            <>
              <DetailBlock
                icon="domain"
                tint={TEAL}
                label="Organization"
                value={attachment.org_name || student.org_name || 'Not assigned'}
              />
              <DetailBlock
                icon="account-tie-outline"
                tint={ORANGE}
                label="Supervisor"
                value={attachment.supervisor_name || (student.has_supervisor ? 'Assigned' : 'Not assigned')}
              />
              <View style={styles.dateGrid}>
                <DateTile label="Start Date" value={attachment.start_date} />
                <DateTile label="End Date" value={attachment.end_date} />
              </View>
            </>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.progressHeader}>
            <Text style={styles.sectionTitle}>Logbook Progress</Text>
            <Text style={styles.progressText}>Week {completedWeeks} of {TOTAL_WEEKS}</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <View style={styles.notice}>
            <MaterialCommunityIcons name="information" size={18} color={PRIMARY} />
            <Text style={styles.noticeText}>
              {logbookEntries.length
                ? `Latest logbook submission: week ${completedWeeks}.`
                : 'No logbook submissions recorded yet.'}
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.footerBtn, styles.deactivateBtn]}
          onPress={handleToggleActive}
          disabled={actionLoading}
        >
          <MaterialCommunityIcons name={student.is_active === false ? 'account-check-outline' : 'account-off-outline'} size={21} color={ORANGE} />
          <Text style={[styles.footerBtnText, { color: ORANGE }]}>
            {student.is_active === false ? 'Reactivate' : 'Deactivate'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.footerBtn, styles.resetBtn]}
          onPress={handleResetPassword}
          disabled={actionLoading}
        >
          <MaterialCommunityIcons name="lock-reset" size={21} color={TEAL} />
          <Text style={[styles.footerBtnText, { color: TEAL }]}>Reset Pwd</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.footerBtn, styles.assignBtn]}
          onPress={handleAssign}
          disabled={actionLoading}
        >
          <MaterialCommunityIcons name="account-plus-outline" size={21} color={WHITE} />
          <Text style={[styles.footerBtnText, { color: WHITE }]}>Assign</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: NAVY },
  header: {
    backgroundColor: NAVY,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: { flex: 1, color: WHITE, fontSize: 20, fontWeight: '800' },
  headerStatus: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  headerStatusText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  scroll: { flex: 1, backgroundColor: BG },
  scrollContent: { padding: 16, paddingBottom: 132, gap: 14 },
  card: {
    backgroundColor: WHITE,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(216,228,223,0.65)',
    shadowColor: '#0D7A6B',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  profileHead: { alignItems: 'center' },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  avatarText: { color: WHITE, fontSize: 30, fontWeight: '800' },
  name: { color: TEXT, fontSize: 22, fontWeight: '800', textAlign: 'center' },
  regText: { color: MUTED, fontSize: 13, marginTop: 5, textAlign: 'center' },
  divider: { height: 1, backgroundColor: BORDER, marginVertical: 16 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    gap: 12,
  },
  infoLabel: { flex: 1, color: MUTED, fontSize: 13, fontWeight: '600' },
  infoValue: { flex: 1.2, color: TEXT, fontSize: 14, fontWeight: '700', textAlign: 'right' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  sectionTitle: { color: TEXT, fontSize: 17, fontWeight: '800' },
  pill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  pillText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  inlineLoading: { alignItems: 'center', justifyContent: 'center', paddingVertical: 24, gap: 10 },
  inlineLoadingText: { color: MUTED, fontSize: 13, fontWeight: '600' },
  detailBlock: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  detailIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailTextWrap: { flex: 1 },
  detailLabel: { color: MUTED, fontSize: 12, fontWeight: '600', marginBottom: 3 },
  detailValue: { color: TEXT, fontSize: 15, fontWeight: '800' },
  dateGrid: { flexDirection: 'row', gap: 12, marginTop: 2 },
  dateTile: {
    flex: 1,
    backgroundColor: BG,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
  },
  dateLabel: { color: MUTED, fontSize: 12, fontWeight: '600', marginBottom: 6 },
  dateValue: { color: TEXT, fontSize: 14, fontWeight: '800' },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  progressText: { color: PRIMARY, fontSize: 13, fontWeight: '800' },
  progressTrack: {
    height: 12,
    borderRadius: 999,
    backgroundColor: '#E5E9E6',
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: PRIMARY,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: PRIMARY_LIGHT,
    borderRadius: 12,
    padding: 12,
  },
  noticeText: { flex: 1, color: PRIMARY, fontSize: 13, fontWeight: '600' },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 18,
    flexDirection: 'row',
    gap: 8,
  },
  footerBtn: {
    flex: 1,
    minHeight: 58,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  footerBtnText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  deactivateBtn: { borderWidth: 1.5, borderColor: ORANGE, backgroundColor: WHITE },
  resetBtn: { borderWidth: 1.5, borderColor: TEAL, backgroundColor: WHITE },
  assignBtn: {
    backgroundColor: TEAL,
    shadowColor: TEAL,
    shadowOpacity: 0.28,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
});
