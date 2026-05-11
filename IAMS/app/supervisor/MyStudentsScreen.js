import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, RefreshControl
} from 'react-native';
import { COLORS } from '../../constants/colors';
import api from '../../api/axios';

export default function MyStudentsScreen({ navigation }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStudents = async () => {
    try {
      const res = await api.get('/supervisors/students');
      setStudents(res.data);
    } catch (err) {
      Alert.alert('Error', 'Failed to load students');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchStudents(); }, []);

  const onRefresh = () => { setRefreshing(true); fetchStudents(); };

  const statusColor = (status) => {
    switch (status) {
      case 'ongoing': return { bg: '#E8F5E9', text: '#2E7D32' };
      case 'pending': return { bg: '#FFF3E0', text: COLORS.primary };
      case 'completed': return { bg: '#E3F2FD', text: COLORS.secondary };
      default: return { bg: '#F4F4F4', text: COLORS.gray };
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>My Students 👥</Text>
        <Text style={styles.subtitle}>{students.length} student(s) assigned</Text>
      </View>

      {students.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>👥</Text>
          <Text style={styles.emptyTitle}>No Students Assigned</Text>
          <Text style={styles.emptyText}>
            You have no students assigned yet. Contact the administrator.
          </Text>
        </View>
      ) : (
        students.map((student, index) => (
          <View key={index} style={styles.studentCard}>
            <View style={styles.cardHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {student.full_name?.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.studentInfo}>
                <Text style={styles.studentName}>{student.full_name}</Text>
                <Text style={styles.studentReg}>{student.reg_number}</Text>
                <Text style={styles.studentDept}>{student.department}</Text>
              </View>
              <View style={[styles.statusBadge, {
                backgroundColor: statusColor(student.status).bg
              }]}>
                <Text style={[styles.statusText, {
                  color: statusColor(student.status).text
                }]}>
                  {student.status}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.cardDetails}>
              <Text style={styles.detailItem}>🏢 {student.org_name}</Text>
              <Text style={styles.detailItem}>📍 {student.location}</Text>
              {student.phone && (
                <Text style={styles.detailItem}>📞 {student.phone}</Text>
              )}
              <Text style={styles.detailItem}>
                📧 {student.email}
              </Text>
              <Text style={styles.detailItem}>
                📖 {student.logbook_count} logbook entries
              </Text>
              {student.start_date && (
                <Text style={styles.detailItem}>
                  📅 {new Date(student.start_date).toLocaleDateString()} —{' '}
                  {student.end_date
                    ? new Date(student.end_date).toLocaleDateString()
                    : 'TBD'}
                </Text>
              )}
            </View>

            <View style={styles.cardActions}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => navigation.navigate('ReviewLogbooks', {
                  attachmentId: student.attachment_id,
                  studentName: student.full_name,
                })}
              >
                <Text style={styles.actionBtnText}>📖 Logbooks</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#E8F5E9' }]}
                onPress={() => navigation.navigate('Evaluations', {
                  attachmentId: student.attachment_id,
                  studentName: student.full_name,
                })}
              >
                <Text style={[styles.actionBtnText, { color: '#2E7D32' }]}>
                  ⭐ Evaluate
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#F3E5F5' }]}
                onPress={() => navigation.navigate('SiteVisits', {
                  attachmentId: student.attachment_id,
                  studentName: student.full_name,
                })}
              >
                <Text style={[styles.actionBtnText, { color: '#6A1B9A' }]}>
                  🗓 Visit
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
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
  emptyCard: {
    backgroundColor: COLORS.white,
    margin: 16, padding: 30,
    borderRadius: 16, alignItems: 'center', elevation: 2,
  },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.darkGray },
  emptyText: { fontSize: 13, color: COLORS.gray, textAlign: 'center', marginTop: 6 },
  studentCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16, marginTop: 16,
    borderRadius: 16, elevation: 2, overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { color: COLORS.white, fontSize: 20, fontWeight: 'bold' },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 15, fontWeight: '700', color: COLORS.darkGray },
  studentReg: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  studentDept: { fontSize: 12, color: COLORS.primary, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  divider: { height: 1, backgroundColor: '#F4F4F4' },
  cardDetails: { padding: 14 },
  detailItem: { fontSize: 13, color: COLORS.darkGray, marginBottom: 6 },
  cardActions: {
    flexDirection: 'row', gap: 8,
    padding: 14, paddingTop: 0,
  },
  actionBtn: {
    flex: 1, padding: 10,
    borderRadius: 10, alignItems: 'center',
    backgroundColor: '#E3F2FD',
  },
  actionBtnText: {
    fontSize: 12, fontWeight: '700',
    color: COLORS.secondary,
  },
});