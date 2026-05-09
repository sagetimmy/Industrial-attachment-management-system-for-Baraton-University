import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, RefreshControl, Modal
} from 'react-native';
import { COLORS } from '../../constants/colors';
import api from '../../api/axios';

export default function AssignSupervisorsScreen({ navigation }) {
  const [attachments, setAttachments] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState(null);
  const [assigning, setAssigning] = useState(false);

  const fetchData = async () => {
    try {
      const [attRes, supRes] = await Promise.all([
        api.get('/admin/unassigned-attachments'),
        api.get('/admin/supervisors'),
      ]);
      setAttachments(attRes.data);
      setSupervisors(supRes.data);
    } catch (err) {
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAssign = async (supervisorId, supervisorName) => {
    Alert.alert(
      'Assign Supervisor',
      `Assign ${supervisorName} to ${selectedAttachment?.student_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Assign',
          onPress: async () => {
            setAssigning(true);
            try {
              await api.put('/admin/assign-supervisor', {
                attachment_id: selectedAttachment.attachment_id,
                supervisor_id: supervisorId,
              });
              Alert.alert('Success! ✅', `${supervisorName} assigned successfully!`);
              setModalVisible(false);
              setSelectedAttachment(null);
              fetchData();
            } catch (err) {
              Alert.alert('Error', 'Failed to assign supervisor');
            } finally {
              setAssigning(false);
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Assign Supervisors 👨‍🏫</Text>
        <Text style={styles.subtitle}>
          {attachments.length} attachment(s) need a supervisor
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Supervisors Summary */}
        <Text style={styles.sectionTitle}>Available Supervisors ({supervisors.length})</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
        >
          {supervisors.map((sup, index) => (
            <View key={index} style={styles.supCard}>
              <View style={styles.supAvatar}>
                <Text style={styles.supAvatarText}>
                  {sup.full_name?.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.supName}>{sup.full_name}</Text>
              <Text style={styles.supDept}>{sup.department}</Text>
              <View style={styles.supLoadBadge}>
                <Text style={styles.supLoadText}>
                  {sup.assigned_count} assigned
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Unassigned Attachments */}
        <Text style={styles.sectionTitle}>
          Unassigned Attachments ({attachments.length})
        </Text>

        {attachments.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>✅</Text>
            <Text style={styles.emptyTitle}>All Assigned!</Text>
            <Text style={styles.emptyText}>
              All active attachments have supervisors assigned.
            </Text>
          </View>
        ) : (
          attachments.map((att, index) => (
            <View key={index} style={styles.attCard}>
              <View style={styles.attHeader}>
                <View style={styles.attAvatar}>
                  <Text style={styles.attAvatarText}>
                    {att.student_name?.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.attInfo}>
                  <Text style={styles.attName}>{att.student_name}</Text>
                  <Text style={styles.attReg}>{att.reg_number} • {att.department}</Text>
                  <Text style={styles.attOrg}>🏢 {att.org_name}</Text>
                  <Text style={styles.attLocation}>📍 {att.location}</Text>
                </View>
                <View style={[styles.statusBadge, {
                  backgroundColor: att.status === 'ongoing' ? '#E8F5E9' : '#FFF3E0'
                }]}>
                  <Text style={[styles.statusText, {
                    color: att.status === 'ongoing' ? '#2E7D32' : COLORS.primary
                  }]}>
                    {att.status}
                  </Text>
                </View>
              </View>

              {att.start_date && (
                <Text style={styles.attDates}>
                  📅 {new Date(att.start_date).toLocaleDateString()} —{' '}
                  {att.end_date ? new Date(att.end_date).toLocaleDateString() : 'TBD'}
                </Text>
              )}

              <TouchableOpacity
                style={styles.assignBtn}
                onPress={() => {
                  setSelectedAttachment(att);
                  setModalVisible(true);
                }}
              >
                <Text style={styles.assignBtnText}>👨‍🏫 Assign Supervisor</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Supervisor Selection Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Supervisor</Text>
            <Text style={styles.modalSubtitle}>
              For: {selectedAttachment?.student_name}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {supervisors.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>No supervisors registered yet</Text>
                </View>
              ) : (
                supervisors.map((sup, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.modalSupCard}
                    onPress={() => handleAssign(sup.supervisor_id, sup.full_name)}
                    disabled={assigning}
                  >
                    <View style={styles.modalSupAvatar}>
                      <Text style={styles.modalSupAvatarText}>
                        {sup.full_name?.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.modalSupInfo}>
                      <Text style={styles.modalSupName}>{sup.full_name}</Text>
                      <Text style={styles.modalSupDept}>{sup.department}</Text>
                      <Text style={styles.modalSupEmail}>{sup.email}</Text>
                    </View>
                    <View style={styles.modalSupLoad}>
                      <Text style={styles.modalSupLoadNum}>{sup.assigned_count}</Text>
                      <Text style={styles.modalSupLoadLabel}>students</Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalCloseBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
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
  sectionTitle: {
    fontSize: 16, fontWeight: '700',
    color: COLORS.darkGray,
    marginLeft: 16, marginTop: 20, marginBottom: 12,
  },
  supCard: {
    backgroundColor: COLORS.white,
    padding: 14, borderRadius: 16,
    alignItems: 'center', width: 130, elevation: 2,
  },
  supAvatar: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 8,
  },
  supAvatarText: { color: COLORS.white, fontSize: 20, fontWeight: 'bold' },
  supName: { fontSize: 13, fontWeight: '700', color: COLORS.darkGray, textAlign: 'center' },
  supDept: { fontSize: 11, color: COLORS.gray, textAlign: 'center', marginTop: 2 },
  supLoadBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 8, marginTop: 6,
  },
  supLoadText: { fontSize: 11, color: COLORS.secondary, fontWeight: '600' },
  emptyCard: {
    backgroundColor: COLORS.white,
    margin: 16, padding: 30,
    borderRadius: 16, alignItems: 'center', elevation: 2,
  },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.darkGray },
  emptyText: { fontSize: 13, color: COLORS.gray, textAlign: 'center', marginTop: 6 },
  attCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16, marginBottom: 12,
    padding: 14, borderRadius: 16, elevation: 2,
    borderLeftWidth: 4, borderLeftColor: COLORS.primary,
  },
  attHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  attAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  attAvatarText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
  attInfo: { flex: 1 },
  attName: { fontSize: 14, fontWeight: '700', color: COLORS.darkGray },
  attReg: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  attOrg: { fontSize: 12, color: COLORS.primary, marginTop: 2 },
  attLocation: { fontSize: 11, color: COLORS.gray, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  attDates: { fontSize: 12, color: COLORS.primary, marginBottom: 10 },
  assignBtn: {
    backgroundColor: COLORS.secondary,
    padding: 12, borderRadius: 12,
    alignItems: 'center',
  },
  assignBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 25, borderTopRightRadius: 25,
    padding: 20, maxHeight: '75%',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.secondary },
  modalSubtitle: { fontSize: 13, color: COLORS.gray, marginBottom: 16 },
  modalSupCard: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, borderRadius: 16,
    backgroundColor: '#F8F9FA', marginBottom: 10,
    borderWidth: 1, borderColor: COLORS.gray,
  },
  modalSupAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  modalSupAvatarText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
  modalSupInfo: { flex: 1 },
  modalSupName: { fontSize: 14, fontWeight: '700', color: COLORS.darkGray },
  modalSupDept: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  modalSupEmail: { fontSize: 11, color: COLORS.primary, marginTop: 2 },
  modalSupLoad: { alignItems: 'center' },
  modalSupLoadNum: { fontSize: 20, fontWeight: 'bold', color: COLORS.secondary },
  modalSupLoadLabel: { fontSize: 10, color: COLORS.gray },
  modalCloseBtn: {
    backgroundColor: '#F4F4F4',
    padding: 14, borderRadius: 12,
    alignItems: 'center', marginTop: 10,
  },
  modalCloseBtnText: { color: COLORS.darkGray, fontWeight: '700', fontSize: 15 },
});