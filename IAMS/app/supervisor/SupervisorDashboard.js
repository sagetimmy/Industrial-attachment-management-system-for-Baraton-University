import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, RefreshControl
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../constants/colors';
import api from '../../api/axios';

export default function SupervisorDashboard({ navigation }) {
  const { user, logout } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/supervisors/dashboard');
      setData(res.data);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchDashboard(); }, []);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Welcome back 👋</Text>
            <Text style={styles.name}>{user?.full_name || 'Supervisor'}</Text>
            <Text style={styles.dept}>{data?.supervisor?.department}</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{data?.stats?.totalStudents || 0}</Text>
            <Text style={styles.statLabel}>Total{'\n'}Students</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{data?.stats?.activeStudents || 0}</Text>
            <Text style={styles.statLabel}>Active{'\n'}Attachments</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{data?.stats?.pendingLogs || 0}</Text>
            <Text style={styles.statLabel}>Pending{'\n'}Logbooks</Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsRow}>
        {[
          { label: 'My Students', icon: '👥', screen: 'MyStudents', color: COLORS.secondary },
          { label: 'Review Logbooks', icon: '📖', screen: 'ReviewLogbooks', color: COLORS.primary },
          { label: 'Site Visits', icon: '🗓️', screen: 'SiteVisits', color: '#2E7D32' },
          { label: 'Evaluations', icon: '⭐', screen: 'Evaluations', color: '#6A1B9A' },
        ].map((item) => (
          <TouchableOpacity
            key={item.screen}
            style={styles.actionCard}
            onPress={() => navigation.navigate(item.screen)}
          >
            <View style={[styles.actionIcon, { backgroundColor: item.color }]}>
              <Text style={{ fontSize: 22 }}>{item.icon}</Text>
            </View>
            <Text style={styles.actionLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Assigned Students */}
      <Text style={styles.sectionTitle}>Assigned Students</Text>
      {data?.students?.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>👥</Text>
          <Text style={styles.emptyText}>No students assigned yet</Text>
        </View>
      ) : (
        data?.students?.map((student, index) => (
          <TouchableOpacity
            key={index}
            style={styles.studentCard}
            onPress={() => navigation.navigate('StudentDetail', { student })}
          >
            <View style={styles.studentAvatar}>
              <Text style={styles.avatarText}>
                {student.full_name?.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.studentInfo}>
              <Text style={styles.studentName}>{student.full_name}</Text>
              <Text style={styles.studentReg}>{student.reg_number} • {student.department}</Text>
              <Text style={styles.studentOrg}>🏢 {student.org_name}</Text>
            </View>
            <View style={[styles.statusBadge,
              { backgroundColor: student.status === 'ongoing' ? '#E8F5E9' : '#FFF3E0' }
            ]}>
              <Text style={[styles.statusText,
                { color: student.status === 'ongoing' ? '#2E7D32' : COLORS.primary }
              ]}>
                {student.status}
              </Text>
            </View>
          </TouchableOpacity>
        ))
      )}

      {/* Recent Logbook Entries */}
      <Text style={styles.sectionTitle}>Recent Logbook Submissions</Text>
      {data?.pendingLogs?.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>📖</Text>
          <Text style={styles.emptyText}>No logbook submissions yet</Text>
        </View>
      ) : (
        data?.pendingLogs?.map((log, index) => (
          <TouchableOpacity
            key={index}
            style={styles.logCard}
            onPress={() => navigation.navigate('ReviewLogbooks')}
          >
            <View style={styles.logLeft}>
              <Text style={styles.logWeek}>Week {log.week_number}</Text>
              <Text style={styles.logStudent}>{log.full_name}</Text>
              <Text style={styles.logReg}>{log.reg_number}</Text>
            </View>
            <View style={styles.logRight}>
              <Text style={styles.logDate}>
                {new Date(log.submitted_at).toLocaleDateString()}
              </Text>
              <View style={styles.reviewBtn}>
                <Text style={styles.reviewBtnText}>Review →</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))
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
    paddingTop: 55,
    paddingHorizontal: 20,
    paddingBottom: 25,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  greeting: { color: '#8899AA', fontSize: 13 },
  name: { color: COLORS.white, fontSize: 22, fontWeight: 'bold', marginTop: 2 },
  dept: { color: COLORS.primary, fontSize: 12, marginTop: 3 },
  logoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  logoutText: { color: COLORS.white, fontSize: 13 },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 15,
    padding: 15,
    justifyContent: 'space-around',
  },
  statBox: { alignItems: 'center', flex: 1 },
  statNum: { color: COLORS.primary, fontSize: 22, fontWeight: 'bold' },
  statLabel: { color: '#AABBCC', fontSize: 11, textAlign: 'center', marginTop: 3 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  sectionTitle: {
    fontSize: 16, fontWeight: '700',
    color: COLORS.darkGray,
    marginLeft: 16, marginTop: 20, marginBottom: 10,
  },
  actionsRow: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 10,
  },
  actionCard: {
    backgroundColor: COLORS.white,
    width: '46%', margin: '2%',
    padding: 16, borderRadius: 16,
    alignItems: 'center',
    elevation: 2,
  },
  actionIcon: {
    width: 50, height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionLabel: { fontSize: 12, fontWeight: '700', color: COLORS.darkGray, textAlign: 'center' },
  emptyCard: {
    backgroundColor: COLORS.white,
    margin: 16, padding: 30,
    borderRadius: 16, alignItems: 'center',
  },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyText: { color: COLORS.gray, fontSize: 14 },
  studentCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16, marginBottom: 10,
    padding: 14, borderRadius: 16,
    flexDirection: 'row', alignItems: 'center',
    elevation: 2,
  },
  studentAvatar: {
    width: 44, height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 14, fontWeight: '700', color: COLORS.darkGray },
  studentReg: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  studentOrg: { fontSize: 12, color: COLORS.primary, marginTop: 2 },
  statusBadge: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 10,
  },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  logCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16, marginBottom: 10,
    padding: 14, borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
  },
  logLeft: { flex: 1 },
  logWeek: { fontSize: 14, fontWeight: '700', color: COLORS.secondary },
  logStudent: { fontSize: 13, color: COLORS.darkGray, marginTop: 2 },
  logReg: { fontSize: 11, color: COLORS.gray, marginTop: 1 },
  logRight: { alignItems: 'flex-end' },
  logDate: { fontSize: 11, color: COLORS.gray },
  reviewBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8, marginTop: 6,
  },
  reviewBtnText: { color: COLORS.white, fontSize: 11, fontWeight: '700' },
});