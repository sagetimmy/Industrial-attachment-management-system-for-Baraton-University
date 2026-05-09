import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, RefreshControl
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../constants/colors';
import api from '../../api/axios';

export default function AdminDashboard({ navigation }) {
  const { user, logout } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [form, setForm] = useState({
    full_name: '', reg_number: '', email: '',
    password: '', department: '', year_of_study: '',
    phone: '',
    // Host org fields
    org_name: '', industry: '', location: '',
    official_email: '', website: '', description: '',
    contact_person: '', contact_position: '',
    department_offering: '', roles_tasks: '',
    required_skills: '', available_slots: '',
    attachment_duration: '', work_mode: 'onsite',
    internal_supervisor: '', supervisor_position: '',
    allowance: '', resources_provided: '',
  });

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/admin/dashboard');
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

  const handleApproveOrg = async (orgId, orgName) => {
    Alert.alert('Approve Organization', `Approve ${orgName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          try {
            await api.put(`/admin/approve-org/${orgId}`);
            Alert.alert('Success!', `${orgName} has been approved.`);
            fetchDashboard();
          } catch (err) {
            Alert.alert('Error', 'Failed to approve organization');
          }
        }
      }
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

  const statCards = [
    { label: 'Students', value: data?.stats?.totalStudents || 0, icon: '🎓', color: COLORS.secondary },
    { label: 'Supervisors', value: data?.stats?.totalSupervisors || 0, icon: '👨‍🏫', color: '#2E7D32' },
    { label: 'Host Orgs', value: data?.stats?.totalOrgs || 0, icon: '🏢', color: '#6A1B9A' },
    { label: 'Active', value: data?.stats?.activeAttachments || 0, icon: '📋', color: COLORS.primary },
    { label: 'Pending Orgs', value: data?.stats?.pendingOrgs || 0, icon: '⏳', color: '#C62828' },
    { label: 'Attachments', value: data?.stats?.totalAttachments || 0, icon: '📊', color: '#00695C' },
  ];

  const menuItems = [
    { label: 'Manage Users', icon: '👥', screen: 'ManageUsers', color: COLORS.secondary },
    { label: 'Attachments', icon: '📋', screen: 'ManageAttachments', color: COLORS.primary },
    { label: 'Assign Supervisors', icon: '👨‍🏫', screen: 'AssignSupervisors', color: '#2E7D32' },
    { label: 'Reports', icon: '📊', screen: 'Reports', color: '#6A1B9A' },
  ];

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
            <Text style={styles.greeting}>Admin Panel 🛡️</Text>
            <Text style={styles.name}>{user?.full_name || 'Administrator'}</Text>
            <Text style={styles.email}>{user?.email}</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Alert if pending orgs */}
        {data?.stats?.pendingOrgs > 0 && (
          <View style={styles.alertBanner}>
            <Text style={styles.alertText}>
              ⚠️ {data.stats.pendingOrgs} organization(s) pending approval
            </Text>
          </View>
        )}
      </View>

      {/* Stats Grid */}
      <Text style={styles.sectionTitle}>System Overview</Text>
      <View style={styles.statsGrid}>
        {statCards.map((stat, index) => (
          <View key={index} style={[styles.statCard, { borderLeftColor: stat.color }]}>
            <Text style={styles.statIcon}>{stat.icon}</Text>
            <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.menuGrid}>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.screen}
            style={styles.menuCard}
            onPress={() => navigation.navigate(item.screen)}
          >
            <View style={[styles.menuIcon, { backgroundColor: item.color }]}>
              <Text style={{ fontSize: 24 }}>{item.icon}</Text>
            </View>
            <Text style={styles.menuLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Pending Organizations */}
      {data?.pendingOrgList?.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>⏳ Pending Organization Approvals</Text>
          {data.pendingOrgList.map((org, index) => (
            <View key={index} style={styles.orgCard}>
              <View style={styles.orgInfo}>
                <Text style={styles.orgName}>{org.org_name}</Text>
                <Text style={styles.orgDetail}>📍 {org.location}</Text>
                <Text style={styles.orgDetail}>👤 {org.contact_person}</Text>
                <Text style={styles.orgDetail}>📧 {org.email}</Text>
              </View>
              <TouchableOpacity
                style={styles.reviewBtn}
                onPress={() => navigation.navigate('OrgDetails', {
                  orgId: org.org_id,
                  orgName: org.org_name
                })}
              >
                <Text style={styles.reviewBtnText}>Review →</Text>
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}

      {/* Recent Users */}
      <Text style={styles.sectionTitle}>Recent Registrations</Text>
      {data?.recentUsers?.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No users registered yet</Text>
        </View>
      ) : (
        data?.recentUsers?.map((u, index) => (
          <TouchableOpacity
            key={index}
            style={styles.userCard}
            onPress={() => navigation.navigate('ManageUsers')}
            activeOpacity={0.7}
          >
            <View style={[styles.userAvatar, { backgroundColor: 
              u.role === 'student' ? COLORS.secondary :
              u.role === 'supervisor' ? '#2E7D32' : '#6A1B9A'
            }]}>
              <Text style={styles.avatarText}>
                {u.name?.charAt(0).toUpperCase() || '?'}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{u.name || 'Unknown'}</Text>
              <Text style={styles.userEmail}>{u.email}</Text>
              <Text style={styles.userDate}>
                {new Date(u.created_at).toLocaleDateString()}
              </Text>
            </View>
            <View style={[styles.roleBadge, {
              backgroundColor:
                u.role === 'student' ? '#E3F2FD' :
                u.role === 'supervisor' ? '#E8F5E9' : '#F3E5F5'
            }]}>
              <Text style={[styles.roleText, {
                color:
                  u.role === 'student' ? COLORS.secondary :
                  u.role === 'supervisor' ? '#2E7D32' : '#6A1B9A'
              }]}>
                {u.role}
              </Text>
            </View>
          </TouchableOpacity>
        ))
      )}

      {/* Recent Attachments */}
      <Text style={styles.sectionTitle}>Recent Attachments</Text>
      {data?.recentAttachments?.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No attachments yet</Text>
        </View>
      ) : (
        data?.recentAttachments?.map((att, index) => (
          <TouchableOpacity
            key={index}
            style={styles.attachCard}
            onPress={() => navigation.navigate('ManageAttachments')}
            activeOpacity={0.7}
          >
            <View style={styles.attachLeft}>
              <Text style={styles.attachStudent}>{att.student_name}</Text>
              <Text style={styles.attachReg}>{att.reg_number}</Text>
              <Text style={styles.attachOrg}>🏢 {att.org_name}</Text>
              {att.supervisor_name && (
                <Text style={styles.attachSupervisor}>👨‍🏫 {att.supervisor_name}</Text>
              )}
            </View>
            <View style={[styles.attachStatus, {
              backgroundColor:
                att.status === 'ongoing' ? '#E8F5E9' :
                att.status === 'pending' ? '#FFF3E0' :
                att.status === 'completed' ? '#E3F2FD' : '#FFEBEE'
            }]}>
              <Text style={[styles.attachStatusText, {
                color:
                  att.status === 'ongoing' ? '#2E7D32' :
                  att.status === 'pending' ? COLORS.primary :
                  att.status === 'completed' ? COLORS.secondary : '#C62828'
              }]}>
                {att.status}
              </Text>
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
  },
  greeting: { color: '#8899AA', fontSize: 13 },
  name: { color: COLORS.white, fontSize: 22, fontWeight: 'bold', marginTop: 2 },
  email: { color: COLORS.primary, fontSize: 12, marginTop: 3 },
  logoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  logoutText: { color: COLORS.white, fontSize: 13 },
  alertBanner: {
    backgroundColor: '#FFF3E0',
    borderRadius: 10,
    padding: 10,
    marginTop: 15,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  alertText: { color: COLORS.primary, fontWeight: '600', fontSize: 13 },
  sectionTitle: {
    fontSize: 16, fontWeight: '700',
    color: COLORS.darkGray,
    marginLeft: 16, marginTop: 20, marginBottom: 10,
  },
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 10,
  },
  statCard: {
    backgroundColor: COLORS.white,
    width: '30%', margin: '1.5%',
    padding: 14, borderRadius: 14,
    alignItems: 'center',
    borderLeftWidth: 4,
    elevation: 2,
  },
  statIcon: { fontSize: 24, marginBottom: 6 },
  statValue: { fontSize: 22, fontWeight: 'bold' },
  statLabel: { fontSize: 10, color: COLORS.gray, marginTop: 3, textAlign: 'center' },
  menuGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 10,
  },
  menuCard: {
    backgroundColor: COLORS.white,
    width: '46%', margin: '2%',
    padding: 16, borderRadius: 16,
    alignItems: 'center', elevation: 2,
  },
  menuIcon: {
    width: 50, height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  menuLabel: { fontSize: 12, fontWeight: '700', color: COLORS.darkGray, textAlign: 'center' },
  orgCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16, marginBottom: 10,
    padding: 14, borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#C62828',
  },
  orgInfo: { flex: 1 },
  orgName: { fontSize: 14, fontWeight: '700', color: COLORS.darkGray },
  orgDetail: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  approveBtn: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginLeft: 10,
  },
  approveBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 12 },
  reviewBtn: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginLeft: 10,
  },
  reviewBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 12 },
  emptyCard: {
    backgroundColor: COLORS.white,
    margin: 16, padding: 20,
    borderRadius: 16, alignItems: 'center',
  },
  emptyText: { color: COLORS.gray, fontSize: 14 },
  userCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16, marginBottom: 10,
    padding: 14, borderRadius: 16,
    flexDirection: 'row', alignItems: 'center',
    elevation: 2,
  },
  userAvatar: {
    width: 44, height: 44,
    borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
  userInfo: { flex: 1 },
  userName: { fontSize: 14, fontWeight: '700', color: COLORS.darkGray },
  userEmail: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  userDate: { fontSize: 11, color: COLORS.gray, marginTop: 1 },
  roleBadge: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 10,
  },
  roleText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  attachCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16, marginBottom: 10,
    padding: 14, borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
  },
  attachLeft: { flex: 1 },
  attachStudent: { fontSize: 14, fontWeight: '700', color: COLORS.darkGray },
  attachReg: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  attachOrg: { fontSize: 12, color: COLORS.primary, marginTop: 2 },
  attachSupervisor: { fontSize: 12, color: '#2E7D32', marginTop: 2 },
  attachStatus: {
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 10, marginLeft: 10,
  },
  attachStatusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  workModeRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  workModeBtn: {
    flex: 1, padding: 10, borderRadius: 10,
    borderWidth: 2, borderColor: COLORS.gray,
    alignItems: 'center', backgroundColor: COLORS.lightGray,
  },
  workModeBtnActive: { borderColor: COLORS.primary, backgroundColor: '#FFF3E0' },
  workModeBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.darkGray },
  workModeBtnTextActive: { color: COLORS.primary },
});