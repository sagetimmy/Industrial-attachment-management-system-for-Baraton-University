import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, RefreshControl
} from 'react-native';
import { COLORS } from '../../constants/colors';
import api from '../../api/axios';
import Spinner from '../../components/Spinner';

export default function ManageAttachmentsScreen({ navigation }) {
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  const fetchAttachments = async () => {
    try {
      const res = await api.get('/admin/all-attachments');
      setAttachments(res.data);
    } catch (err) {
      Alert.alert('Error', 'Failed to load attachments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchAttachments(); }, []);

  const filtered = activeFilter === 'all'
    ? attachments
    : attachments.filter(a => a.status === activeFilter);

  const handleStatusChange = (att) => {
    const options = ['ongoing', 'completed', 'rejected'].filter(s => s !== att.status);
    Alert.alert(
      'Update Attachment Status',
      `Current: ${att.status}\nStudent: ${att.student_name}`,
      [
        { text: 'Cancel', style: 'cancel' },
        ...options.map(status => ({
          text: `Mark as ${status}`,
          style: status === 'rejected' ? 'destructive' : 'default',
          onPress: () => confirmStatusChange(att, status),
        }))
      ]
    );
  };

  const confirmStatusChange = (att, status) => {
    Alert.alert(
      'Confirm Status Change',
      `Mark ${att.student_name}'s attachment as "${status}"?\n\nThis will notify the student.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await api.put(`/admin/attachment-status/${att.attachment_id}`, { status });
              Alert.alert('Updated!', `Attachment marked as ${status}`);
              fetchAttachments();
            } catch (err) {
              Alert.alert('Error', 'Failed to update status');
            }
          }
        }
      ]
    );
  };

  const statusColor = (status) => {
    switch (status) {
      case 'ongoing': return { bg: '#E8F5E9', text: '#2E7D32' };
      case 'pending': return { bg: '#FFF3E0', text: COLORS.primary };
      case 'completed': return { bg: '#E3F2FD', text: COLORS.secondary };
      case 'rejected': return { bg: '#FFEBEE', text: '#C62828' };
      case 'approved': return { bg: '#E8F5E9', text: '#2E7D32' };
      default: return { bg: '#F4F4F4', text: COLORS.gray };
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAttachments();
  };

  const filters = ['all', 'pending', 'ongoing', 'completed', 'rejected'];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Spinner size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Monitor Attachments 📋</Text>
        <Text style={styles.subtitle}>{filtered.length} attachments</Text>
      </View>

      {/* Filter */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
      >
        {filters.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, activeFilter === f && styles.filterBtnActive]}
            onPress={() => setActiveFilter(f)}
          >
            <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>No attachments found</Text>
          </View>
        ) : (
          filtered.map((att, index) => (
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
                  {att.supervisor_name && (
                    <Text style={styles.attSup}>👨‍🏫 {att.supervisor_name}</Text>
                  )}
                </View>
                <View style={[styles.statusBadge, {
                  backgroundColor: statusColor(att.status).bg
                }]}>
                  <Text style={[styles.statusText, {
                    color: statusColor(att.status).text
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
                style={styles.updateBtn}
                onPress={() => handleStatusChange(att)}
              >
                <Text style={styles.updateBtnText}>⚙️ Update Status</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
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
  filterRow: { marginTop: 16, marginBottom: 8 },
  filterBtn: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, backgroundColor: COLORS.white,
    borderWidth: 1, borderColor: COLORS.gray,
  },
  filterBtnActive: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  filterText: { fontSize: 13, color: COLORS.darkGray, fontWeight: '600' },
  filterTextActive: { color: COLORS.white },
  emptyCard: {
    backgroundColor: COLORS.white,
    margin: 16, padding: 30,
    borderRadius: 16, alignItems: 'center',
  },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyText: { color: COLORS.gray, fontSize: 14 },
  attCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16, marginBottom: 12,
    padding: 14, borderRadius: 16, elevation: 2,
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
  attSup: { fontSize: 12, color: '#2E7D32', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  attDates: { fontSize: 12, color: COLORS.gray, marginBottom: 10 },
  updateBtn: {
    backgroundColor: '#F0F4FF',
    padding: 10, borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.secondary,
  },
  updateBtnText: { color: COLORS.secondary, fontWeight: '700', fontSize: 13 },
});