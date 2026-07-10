import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, Modal,
  RefreshControl, TextInput,
} from 'react-native';
import { COLORS } from '../../constants/colors';
import api from '../../api/axios';
import Spinner from '../../components/Spinner';

const MAX_STUDENTS_PER_SUPERVISOR = 15;

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function getCapacityColor(assigned, max) {
  const ratio = assigned / max;
  if (ratio >= 1) return '#E53935';
  if (ratio >= 0.7) return '#FB8C00';
  return '#1A6B5A';
}

function StudentCard({ student, selected, onPress }) {
  const isSelected = selected?.attachment_id === student.attachment_id;
  return (
    <TouchableOpacity
      style={[styles.studentCard, isSelected && styles.studentCardSelected]}
      onPress={() => onPress(student)}
      activeOpacity={0.85}
    >
      <View style={[styles.studentAvatar, isSelected && styles.studentAvatarSelected]}>
        <Text style={styles.studentAvatarText}>{getInitials(student.student_name)}</Text>
      </View>
      <View style={styles.studentInfo}>
        <Text style={[styles.studentName, isSelected && styles.studentNameSelected]} numberOfLines={1}>
          {student.student_name}
        </Text>
        <Text style={[styles.studentSub, isSelected && styles.studentSubSelected]} numberOfLines={1}>
          {student.department} • {student.org_name}
        </Text>
      </View>
      {isSelected ? (
        <View style={styles.checkIcon}>
          <Text style={styles.checkText}>✓</Text>
        </View>
      ) : (
        <View style={[styles.statusPill, { backgroundColor: student.status === 'active' ? '#E8F5E9' : '#FFF8E1' }]}>
          <Text style={[styles.statusPillText, { color: student.status === 'active' ? '#2E7D32' : '#F57F17' }]}>
            {student.status === 'active' ? 'NEW' : 'PENDING'}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function SupervisorCard({ supervisor, selected, onPress, onFullPress }) {
  const isSelected = selected?.supervisor_id === supervisor.supervisor_id;
  const assigned = supervisor.assigned_count ?? 0;
  const capColor = getCapacityColor(assigned, MAX_STUDENTS_PER_SUPERVISOR);
  const isFull = assigned >= MAX_STUDENTS_PER_SUPERVISOR;
  const fillPct = Math.min((assigned / MAX_STUDENTS_PER_SUPERVISOR) * 100, 100);

  return (
    <TouchableOpacity
      style={[styles.supCard, isSelected && styles.supCardSelected, isFull && styles.supCardFull]}
      onPress={() => (isFull ? onFullPress(supervisor) : onPress(supervisor))}
      activeOpacity={0.85}
    >
      <View style={[styles.supInitialBox, { backgroundColor: isSelected ? '#1A6B5A' : '#E8F5F2' }]}>
        <Text style={[styles.supInitialText, { color: isSelected ? '#fff' : '#1A6B5A' }]}>
          {getInitials(supervisor.full_name)}
        </Text>
      </View>
      <View style={styles.supInfo}>
        <Text style={styles.supName}>{supervisor.full_name}</Text>
        <Text style={styles.supDept}>
          <Text style={styles.deptIcon}>⚙ </Text>{supervisor.department}
        </Text>
        <View style={styles.capBarBg}>
          <View style={[styles.capBarFill, { width: `${fillPct}%`, backgroundColor: capColor }]} />
        </View>
      </View>
      <View style={styles.supCount}>
        <Text style={[styles.supCountNum, { color: capColor }]}>
          {assigned}/{MAX_STUDENTS_PER_SUPERVISOR}
        </Text>
        <Text style={styles.supCountLabel}>
          {isFull ? 'FULL\nCAPACITY' : 'STUDENTS\nASSIGNED'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function AssignSupervisorsScreen({ navigation, route }) {
  const [attachments, setAttachments] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState(null);
  const [selectedSupervisor, setSelectedSupervisor] = useState(null);
  const [assigning, setAssigning] = useState(false);
  const [search, setSearch] = useState('');
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [fullNotice, setFullNotice] = useState(null);

  const preselectAttachmentId = route?.params?.attachmentId;
  const preselectSupervisorId = route?.params?.supervisorId;

  const fetchData = async () => {
    try {
      const [attRes, supRes] = await Promise.all([
        api.get('/admin/unassigned-attachments'),
        api.get('/admin/supervisors'),
      ]);

      const attData = Array.isArray(attRes.data) ? attRes.data : (attRes.data?.data || []);
      // GET /admin/supervisors returns { supervisors, totals } — not a bare
      // array and not { data: [...] } — so both previous fallbacks always
      // missed it and silently left this list empty.
      const supData = Array.isArray(supRes.data)
        ? supRes.data
        : (supRes.data?.supervisors || supRes.data?.data || []);

      setAttachments(attData.map(a => ({
        attachment_id: a.attachment_id,
        student_name: a.student_name || a.students?.full_name || 'Unknown',
        reg_number: a.reg_number,
        department: a.department,
        org_name: a.org_name || a.host_organizations?.org_name,
        location: a.location,
        status: a.status,
      })));

      setSupervisors(supData.map(s => ({
        supervisor_id: s.supervisor_id,
        full_name: s.full_name,
        department: s.department,
        phone: s.phone,
        assigned_count: typeof s.assigned_count === 'number' ? s.assigned_count : (s.assigned_count || 0),
      })));
    } catch (err) {
      console.error('Failed to load assign supervisors data', err);
      Alert.alert('Error', err.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (preselectAttachmentId && attachments.length > 0) {
      const match = attachments.find(a => a.attachment_id === preselectAttachmentId);
      if (match) setSelectedAttachment(match);
    }
  }, [attachments, preselectAttachmentId]);

  useEffect(() => {
    if (preselectSupervisorId && supervisors.length > 0) {
      const match = supervisors.find(s => s.supervisor_id === preselectSupervisorId);
      if (match) setSelectedSupervisor(match);
    }
  }, [supervisors, preselectSupervisorId]);

  const filteredAttachments = attachments.filter(a =>
    a.student_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.org_name?.toLowerCase().includes(search.toLowerCase())
  );

  const noAttachmentsAtAll = attachments.length === 0;
  const noSearchMatches = attachments.length > 0 && filteredAttachments.length === 0;

  const openConfirm = () => {
    if (!selectedAttachment || !selectedSupervisor) {
      Alert.alert('Incomplete', 'Please select both a student and a supervisor.');
      return;
    }
    setConfirmVisible(true);
  };

  const handleFullPress = (supervisor) => {
    setFullNotice(supervisor.full_name);
  };

  const confirmAssign = async () => {
    setConfirmVisible(false);
    setAssigning(true);
    try {
      await api.put('/admin/assign-supervisor', {
        attachment_id: selectedAttachment.attachment_id,
        supervisor_id: selectedSupervisor.supervisor_id,
      });
      Alert.alert('Success ✅', `${selectedSupervisor.full_name} assigned successfully!`);
      setSelectedAttachment(null);
      setSelectedSupervisor(null);
      fetchData();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to assign supervisor');
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Spinner size="large" color="#1A6B5A" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>IAMS Admin</Text>
          <View style={styles.headerRight}>
            <Text style={styles.bellIcon}>🔔</Text>
            <View style={styles.headerAvatar}>
              <Text style={styles.headerAvatarText}>A</Text>
            </View>
          </View>
        </View>
        <Text style={styles.placementLabel}>PLACEMENT MANAGEMENT</Text>
        <Text style={styles.pageTitle}>Assign Supervisor</Text>
        <Text style={styles.pageSubtitle}>
          Connect a student with an available academic supervisor for their current placement.
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
      >
        <View style={styles.stepHeader}>
          <View style={styles.stepLeft}>
            <Text style={styles.stepIcon}>🎓</Text>
            <Text style={styles.stepTitle}>Select Student</Text>
          </View>
          <Text style={styles.stepBadge}>Step 1 of 2</Text>
        </View>

        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search students by name or company..."
            placeholderTextColor="#AAA"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <View style={styles.listWrap}>
          {noAttachmentsAtAll ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>✅</Text>
              <Text style={styles.emptyTitle}>All Assigned!</Text>
              <Text style={styles.emptyText}>All active attachments have supervisors.</Text>
            </View>
          ) : noSearchMatches ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyTitle}>No matches</Text>
              <Text style={styles.emptyText}>No students match "{search}". Try a different search.</Text>
            </View>
          ) : (
            filteredAttachments.map((att, i) => (
              <StudentCard
                key={i}
                student={att}
                selected={selectedAttachment}
                onPress={setSelectedAttachment}
              />
            ))
          )}
        </View>

        <View style={styles.stepHeader}>
          <View style={styles.stepLeft}>
            <Text style={styles.stepIcon}>📋</Text>
            <Text style={styles.stepTitle}>Select Supervisor</Text>
          </View>
          <Text style={styles.stepBadge}>Step 2 of 2</Text>
        </View>

        <View style={styles.listWrap}>
          {supervisors.map((sup, i) => (
            <SupervisorCard
              key={i}
              supervisor={sup}
              selected={selectedSupervisor}
              onPress={setSelectedSupervisor}
              onFullPress={handleFullPress}
            />
          ))}
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[
            styles.assignBtn,
            (!selectedAttachment || !selectedSupervisor || assigning) && styles.assignBtnDisabled,
          ]}
          onPress={openConfirm}
          disabled={!selectedAttachment || !selectedSupervisor || assigning}
        >
          {assigning
            ? <Spinner color="#fff" />
            : <Text style={styles.assignBtnText}>Assign Supervisor  👤+</Text>
          }
        </TouchableOpacity>
        <Text style={styles.assignNote}>An email notification will be sent to both parties.</Text>
      </View>

      {/* Custom confirm modal — Alert.alert with a multi-button actions array
          doesn't reliably render on web, which is why the assign button
          previously appeared to do nothing. Same pattern as confirmLogout. */}
      <Modal
        visible={confirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirm Assignment</Text>
            <Text style={styles.modalBody}>
              Assign {selectedSupervisor?.full_name} to {selectedAttachment?.student_name}?
              {'\n\n'}An email notification will be sent to both parties.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setConfirmVisible(false)}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnConfirm]}
                onPress={confirmAssign}
              >
                <Text style={styles.modalBtnConfirmText}>Assign</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Full-capacity notice — gives feedback instead of a silent no-op tap */}
      <Modal
        visible={!!fullNotice}
        transparent
        animationType="fade"
        onRequestClose={() => setFullNotice(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>At Full Capacity</Text>
            <Text style={styles.modalBody}>
              {fullNotice} is already supervising the maximum of {MAX_STUDENTS_PER_SUPERVISOR} students.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnConfirm, { flex: 1 }]}
                onPress={() => setFullNotice(null)}
              >
                <Text style={styles.modalBtnConfirmText}>Got it</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F6F5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F2F6F5' },
  loadingText: { marginTop: 12, color: '#888', fontSize: 14 },
  header: {
    backgroundColor: '#fff',
    paddingTop: 52, paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: '#E8EFED',
  },
  headerTop: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 16,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: '#F0F4F3',
    justifyContent: 'center', alignItems: 'center',
  },
  backIcon: { fontSize: 18, color: '#1A3A33', fontWeight: '700' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1A3A33' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bellIcon: { fontSize: 20 },
  headerAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#1A6B5A',
    justifyContent: 'center', alignItems: 'center',
  },
  headerAvatarText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  placementLabel: { fontSize: 10, fontWeight: '700', color: '#1A6B5A', letterSpacing: 1.2, marginBottom: 4 },
  pageTitle: { fontSize: 26, fontWeight: '800', color: '#1A3A33', marginBottom: 4 },
  pageSubtitle: { fontSize: 13, color: '#7A9490', lineHeight: 18 },
  stepHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 22, paddingBottom: 10,
  },
  stepLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepIcon: { fontSize: 18 },
  stepTitle: { fontSize: 16, fontWeight: '700', color: '#1A3A33' },
  stepBadge: {
    fontSize: 12, fontWeight: '600', color: '#1A6B5A',
    backgroundColor: '#E4F2EE', paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: 20,
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', marginHorizontal: 16,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11,
    marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#333' },
  listWrap: { paddingHorizontal: 16, gap: 10 },
  studentCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 16,
    padding: 14, marginBottom: 2,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  studentCardSelected: {
    backgroundColor: '#1A6B5A',
    borderColor: '#1A6B5A',
  },
  studentAvatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: '#C8E6DF',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  studentAvatarSelected: { backgroundColor: 'rgba(255,255,255,0.25)' },
  studentAvatarText: { fontSize: 16, fontWeight: '700', color: '#1A6B5A' },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 15, fontWeight: '700', color: '#1A3A33' },
  studentNameSelected: { color: '#fff' },
  studentSub: { fontSize: 12, color: '#888', marginTop: 2 },
  studentSubSelected: { color: 'rgba(255,255,255,0.75)' },
  checkIcon: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center',
  },
  checkText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  statusPill: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8,
  },
  statusPillText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  supCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 16,
    padding: 14, marginBottom: 2,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  supCardSelected: { borderColor: '#1A6B5A' },
  supCardFull: { opacity: 0.6 },
  supInitialBox: {
    width: 48, height: 48, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  supInitialText: { fontSize: 16, fontWeight: '800' },
  supInfo: { flex: 1 },
  supName: { fontSize: 15, fontWeight: '700', color: '#1A3A33', marginBottom: 2 },
  supDept: { fontSize: 12, color: '#888', marginBottom: 6 },
  deptIcon: { fontSize: 11 },
  capBarBg: {
    height: 5, backgroundColor: '#E8EFED',
    borderRadius: 10, overflow: 'hidden', width: '85%',
  },
  capBarFill: { height: '100%', borderRadius: 10 },
  supCount: { alignItems: 'flex-end', marginLeft: 10 },
  supCountNum: { fontSize: 22, fontWeight: '800' },
  supCountLabel: { fontSize: 9, color: '#999', fontWeight: '600', textAlign: 'right', lineHeight: 13 },
  bottomBar: {
    position: 'absolute', bottom: 0,
    left: 0, right: 0,
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#F2F6F5',
  },
  assignBtn: {
    backgroundColor: '#1A6B5A',
    paddingVertical: 16, borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#1A6B5A', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  assignBtnDisabled: { backgroundColor: '#B0CECA' },
  assignBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  assignNote: { textAlign: 'center', fontSize: 12, color: '#999', marginTop: 8 },
  emptyCard: {
    backgroundColor: '#fff', padding: 30,
    borderRadius: 16, alignItems: 'center', elevation: 1,
  },
  emptyIcon: { fontSize: 36, marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1A3A33' },
  emptyText: { fontSize: 13, color: '#888', marginTop: 4, textAlign: 'center' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(15,36,25,0.5)',
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: '#fff', borderRadius: 18,
    padding: 22, width: '100%', maxWidth: 380,
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#1A3A33', marginBottom: 8 },
  modalBody: { fontSize: 14, color: '#555', lineHeight: 20, marginBottom: 20 },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    alignItems: 'center',
  },
  modalBtnCancel: { backgroundColor: '#F0F2F1' },
  modalBtnCancelText: { color: '#555', fontWeight: '700', fontSize: 14 },
  modalBtnConfirm: { backgroundColor: '#1A6B5A' },
  modalBtnConfirmText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});