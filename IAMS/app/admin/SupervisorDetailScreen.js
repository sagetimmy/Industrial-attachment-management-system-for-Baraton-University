import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Image, Dimensions, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../../api/axios';

// ── Design Tokens (matches admin design system) ────────────────────────────
const BG           = '#EEF2F0';
const WHITE        = '#FFFFFF';
const TEAL         = '#1B7A65';
const TEAL_LIGHT   = '#E0F5F1';
const DARK         = '#0F2419';
const GRAY         = '#7A8F86';
const BORDER       = '#D8E4DF';
const ORANGE       = '#E8711A';
const SUCCESS      = '#10B981';
const ICON_BG      = '#E0F5F1';

const { width } = Dimensions.get('window');

function getInitials(name = '') {
  return name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '??';
}

function StudentRow({ student, onPress }) {
  return (
    <TouchableOpacity style={styles.studentCard} onPress={onPress} activeOpacity={0.7}>
      {student.avatarUrl ? (
        <Image source={{ uri: student.avatarUrl }} style={styles.studentAvatar} />
      ) : (
        <View style={[styles.studentAvatar, styles.studentAvatarFallback]}>
          <Text style={styles.studentAvatarText}>{getInitials(student.name)}</Text>
        </View>
      )}
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.studentName}>{student.name}</Text>
        <View style={styles.studentOrgRow}>
          <MaterialCommunityIcons name="office-building-outline" size={13} color={GRAY} />
          <Text style={styles.studentOrg}>{student.org}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={GRAY} />
    </TouchableOpacity>
  );
}

export default function SupervisorDetailScreen({ navigation, route }) {
  const paramSupervisor = route?.params?.supervisor || {};
  const supervisorId = paramSupervisor.supervisor_id || paramSupervisor.id || route?.params?.supervisorId;

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDetail = useCallback(async () => {
    if (!supervisorId) {
      setError('No supervisor selected.');
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const res = await api.get(`/admin/supervisors/${supervisorId}`);
      setDetail(res.data);
    } catch (err) {
      console.error('Failed to fetch supervisor detail:', err);
      setError('Failed to load supervisor details.');
    } finally {
      setLoading(false);
    }
  }, [supervisorId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { justifyContent: 'center', alignItems: 'center' }]} edges={['top']}>
        <ActivityIndicator color={TEAL} size="large" />
      </SafeAreaView>
    );
  }

  if (error || !detail) {
    return (
      <SafeAreaView style={[styles.safe, { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }]} edges={['top']}>
        <Text style={{ fontSize: 15, color: GRAY, textAlign: 'center', marginBottom: 16 }}>
          {error || 'Supervisor not found.'}
        </Text>
        <TouchableOpacity style={styles.secondaryBtn} onPress={fetchDetail}>
          <Text style={styles.secondaryBtnText}>Try Again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const name        = detail.name || 'Unknown Supervisor';
  const department  = detail.department || 'Department not set';
  const email       = detail.email || 'Not available';
  const phone       = detail.phone || 'Not available';
  const activeStudents = detail.active_students ?? 0;
  const pendingReviews = detail.pending_reviews ?? 0;
  const students        = detail.students || [];

  const handleAssignStudent = () => {
    navigation.navigate('AssignSupervisor', {
      supervisorId: detail.supervisor_id,
      supervisorName: name,
    });
  };

  const handleViewReports = () => {
    navigation.navigate('Reports', { supervisorId: detail.supervisor_id });
  };

  const handleViewAllStudents = () => {
    navigation.navigate('MyStudents', { supervisorId: detail.supervisor_id });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIconBtn}>
          <Ionicons name="arrow-back" size={22} color={WHITE} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Supervisor Details</Text>
        <TouchableOpacity style={styles.headerIconBtn}>
          <Ionicons name="ellipsis-vertical" size={20} color={WHITE} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Profile Card ── */}
        <View style={styles.profileCard}>
          <View style={styles.profileAvatarWrap}>
            <View style={[styles.profileAvatar, styles.profileAvatarFallback]}>
              <Text style={styles.profileAvatarText}>{getInitials(name)}</Text>
            </View>
            <View style={[styles.statusDot, { backgroundColor: SUCCESS }]} />
          </View>
          <Text style={styles.profileName}>{name}</Text>
          <Text style={styles.profileFaculty}>{department}</Text>
          <Text style={styles.profileInstitution}>University of Eastern Africa, Baraton</Text>
        </View>

        {/* ── Workload Summary ── */}
        <Text style={styles.sectionTitle}>Workload Summary</Text>
        <View style={styles.workloadCard}>
          <View style={styles.workloadCol}>
            <Text style={[styles.workloadValue, { color: TEAL }]}>{activeStudents}</Text>
            <Text style={styles.workloadLabel}>ACTIVE STUDENTS</Text>
          </View>
          <View style={styles.workloadDivider} />
          <View style={styles.workloadCol}>
            <Text style={[styles.workloadValue, { color: ORANGE }]}>
              {String(pendingReviews).padStart(2, '0')}
            </Text>
            <Text style={styles.workloadLabel}>PENDING REVIEWS</Text>
          </View>
        </View>

        {/* ── Assigned Students ── */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Assigned Students</Text>
          <TouchableOpacity onPress={handleViewAllStudents}>
            <Text style={styles.viewAllLink}>View All</Text>
          </TouchableOpacity>
        </View>

        {students.length === 0 ? (
          <Text style={{ fontSize: 13, color: GRAY, marginBottom: 16 }}>
            No students currently assigned.
          </Text>
        ) : (
          students.map((s) => (
            <StudentRow
              key={s.id}
              student={s}
              onPress={() => navigation.navigate('StudentDetail', { studentId: s.id })}
            />
          ))
        )}

        {/* ── Contact Information ── */}
        <Text style={styles.sectionTitle}>Contact Information</Text>
        <View style={styles.contactCard}>
          <View style={styles.contactRow}>
            <View style={styles.contactIconCircle}>
              <Ionicons name="mail-outline" size={18} color={TEAL} />
            </View>
            <View>
              <Text style={styles.contactLabel}>EMAIL</Text>
              <Text style={styles.contactValue}>{email}</Text>
            </View>
          </View>
          <View style={styles.contactDivider} />
          <View style={styles.contactRow}>
            <View style={styles.contactIconCircle}>
              <Ionicons name="call-outline" size={18} color={TEAL} />
            </View>
            <View>
              <Text style={styles.contactLabel}>PHONE</Text>
              <Text style={styles.contactValue}>{phone}</Text>
            </View>
          </View>
        </View>

        {/* ── CTA Buttons ── */}
        <TouchableOpacity style={styles.primaryBtn} onPress={handleAssignStudent}>
          <Ionicons name="person-add" size={18} color={WHITE} />
          <Text style={styles.primaryBtnText}>Assign Student</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={handleViewReports}>
          <MaterialCommunityIcons name="poll" size={18} color={TEAL} />
          <Text style={styles.secondaryBtnText}>View Reports</Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },

  // Header
  header: {
    backgroundColor: DARK,
    paddingVertical: 14,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerIconBtn: { padding: 8 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: WHITE, textAlign: 'left' },

  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 },

  // Profile card
  profileCard: {
    backgroundColor: WHITE,
    borderRadius: 18,
    paddingVertical: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  profileAvatarWrap: { marginBottom: 12 },
  profileAvatar: {
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 2, borderColor: TEAL_LIGHT,
  },
  profileAvatarFallback: {
    backgroundColor: TEAL_LIGHT,
    alignItems: 'center', justifyContent: 'center',
  },
  profileAvatarText: { fontSize: 30, fontWeight: '800', color: TEAL },
  statusDot: {
    position: 'absolute', bottom: 4, right: 4,
    width: 16, height: 16, borderRadius: 8,
    borderWidth: 2, borderColor: WHITE,
  },
  profileName: { fontSize: 19, fontWeight: '700', color: DARK, marginBottom: 4, textAlign: 'center' },
  profileFaculty: { fontSize: 14, fontWeight: '700', color: TEAL, marginBottom: 2, textAlign: 'center' },
  profileInstitution: { fontSize: 13, color: GRAY, textAlign: 'center' },

  // Section header
  sectionTitle: { fontSize: 16, fontWeight: '700', color: DARK, marginBottom: 12 },
  sectionRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  viewAllLink: { fontSize: 13, fontWeight: '700', color: TEAL, marginBottom: 12 },

  // Workload summary
  workloadCard: {
    backgroundColor: WHITE,
    borderRadius: 18,
    paddingVertical: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    marginBottom: 24,
  },
  workloadCol: { flex: 1, alignItems: 'center' },
  workloadDivider: { width: 1, backgroundColor: BORDER, marginHorizontal: 8 },
  workloadValue: { fontSize: 26, fontWeight: '800', color: DARK },
  workloadLabel: { fontSize: 10, fontWeight: '700', color: GRAY, letterSpacing: 0.4, marginTop: 2 },

  // Student rows
  studentCard: {
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  studentAvatar: { width: 48, height: 48, borderRadius: 24 },
  studentAvatarFallback: { backgroundColor: TEAL_LIGHT, alignItems: 'center', justifyContent: 'center' },
  studentAvatarText: { fontSize: 15, fontWeight: '800', color: TEAL },
  studentName: { fontSize: 15, fontWeight: '700', color: DARK },
  studentOrgRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  studentOrg: { fontSize: 12, color: GRAY },

  // Contact info
  contactCard: {
    backgroundColor: WHITE,
    borderRadius: 18,
    padding: 16,
    marginBottom: 24,
  },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  contactIconCircle: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: ICON_BG,
    alignItems: 'center', justifyContent: 'center',
  },
  contactLabel: { fontSize: 10, fontWeight: '700', color: GRAY, letterSpacing: 0.4, marginBottom: 2 },
  contactValue: { fontSize: 14, fontWeight: '600', color: DARK },
  contactDivider: { height: 1, backgroundColor: BORDER, marginVertical: 14 },

  // CTA buttons
  primaryBtn: {
    backgroundColor: TEAL,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  primaryBtnText: { color: WHITE, fontSize: 15, fontWeight: '700' },
  secondaryBtn: {
    backgroundColor: WHITE,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: TEAL,
  },
  secondaryBtnText: { color: TEAL, fontSize: 15, fontWeight: '700' },
});