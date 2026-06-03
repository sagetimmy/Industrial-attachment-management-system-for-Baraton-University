import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, RefreshControl, useWindowDimensions,
  Modal, Pressable
} from 'react-native';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../constants/colors';
import api from '../../api/axios';

function ProgressRing({ percent = 0, size = 52, color = '#0F6E56' }) {
  const radius = 21;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  return (
    <Svg width={size} height={size} viewBox="0 0 52 52">
      <Circle cx="26" cy="26" r={radius} fill="none" stroke="#E1F5EE" strokeWidth="4" />
      <Circle
        cx="26" cy="26" r={radius}
        fill="none" stroke={color} strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={`${circumference}`}
        strokeDashoffset={offset}
        rotation="-90" originX="26" originY="26"
      />
      <SvgText x="26" y="30" textAnchor="middle" fontSize="11" fontWeight="500" fill={color}>
        {percent}%
      </SvgText>
    </Svg>
  );
}

export default function SupervisorDashboard({ navigation }) {
  const { width } = useWindowDimensions();
  const { user, logout } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const isTablet = width >= 768;
  const isDesktop = width >= 1100;

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

  const onRefresh = () => { setRefreshing(true); fetchDashboard(); };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0F6E56" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  const getInitialColor = (name) => {
    const colors = ['#5DCAA5', '#378ADD', '#888780', '#7F77DD', '#D85A30'];
    const i = (name?.charCodeAt(0) || 0) % colors.length;
    return colors[i];
  };

  const getProgress = (student) => {
    // Calculate from attachment dates if available, else default 50
    if (student.start_date && student.end_date) {
      const start = new Date(student.start_date);
      const end = new Date(student.end_date);
      const now = new Date();
      const total = end - start;
      const elapsed = now - start;
      return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
    }
    return student.progress || 50;
  };

  const openMenuScreen = (screen) => {
    setMenuOpen(false);
    navigation.navigate(screen);
  };

  const overflowItems = [
    { label: 'Reports', icon: 'bar-chart-outline', screen: 'Reports' },
    { label: 'Settings', icon: 'settings-outline', screen: 'SupervisorSettings' },
    { label: 'Site Visits', icon: 'calendar-outline', screen: 'SiteVisits' },
  ];

  return (
    <View style={styles.wrapper}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.menuBtn} onPress={() => setMenuOpen(true)}>
          <Ionicons name="menu" size={22} color="#1A3A33" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Supervisor Dashboard</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          <View style={styles.profileIcon}>
            <Text style={styles.profileInitial}>
              {user?.full_name?.charAt(0).toUpperCase() || 'S'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <Modal
        transparent
        visible={menuOpen}
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable style={styles.menuOverlay} onPress={() => setMenuOpen(false)}>
          <View style={styles.overflowMenu}>
            <Text style={styles.overflowTitle}>Supervisor Tools</Text>
            {overflowItems.map((item) => (
              <TouchableOpacity
                key={item.screen}
                style={styles.overflowItem}
                onPress={() => openMenuScreen(item.screen)}
                activeOpacity={0.75}
              >
                <View style={styles.overflowIcon}>
                  <Ionicons name={item.icon} size={18} color="#0F6E56" />
                </View>
                <Text style={styles.overflowLabel}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={17} color="#8899AA" />
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={[styles.contentWrap, isTablet && styles.contentWrapTablet, isDesktop && styles.contentWrapDesktop]}>
        {/* Stats Card */}
        <View style={styles.statsCard}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Active Students</Text>
              <Text style={[styles.statNum, { color: '#0F6E56' }]}>
                {String(data?.stats?.totalStudents || 0).padStart(2, '0')}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Pending Reviews</Text>
              <Text style={[styles.statNum, { color: '#BA7517' }]}>
                {String(data?.stats?.pendingLogs || 0).padStart(2, '0')}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Reports Due</Text>
              <Text style={[styles.statNum, { color: '#D85A30' }]}>
                {String(data?.stats?.reportsDue || 0).padStart(2, '0')}
              </Text>
            </View>
          </View>
        </View>

        {/* Urgent Alert */}
        {data?.stats?.pendingLogs > 0 && (
          <View style={styles.alertCard}>
            <View style={styles.alertIconWrap}>
              <Text style={styles.alertIconText}>!</Text>
            </View>
            <View style={styles.alertBody}>
              <Text style={styles.alertTitle}>Urgent: Monthly Reviews</Text>
              <Text style={styles.alertDesc}>
                {data.stats.pendingLogs} student report{data.stats.pendingLogs !== 1 ? 's are' : ' is'} reaching
                their final deadline tonight.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.alertBtn}
              onPress={() => navigation.navigate('ReviewLogbooks')}
            >
              <Text style={styles.alertBtnText}>Review</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Students Section */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.greenDot} />
            <Text style={styles.sectionTitle}>MY STUDENTS</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('MyStudents')}>
            <Text style={styles.viewAll}>View All →</Text>
          </TouchableOpacity>
        </View>

        {!data?.students?.length ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyText}>No students assigned yet</Text>
          </View>
        ) : (
          <View style={[styles.cardsGrid, isTablet && styles.cardsGridTablet]}>
            {data.students.map((student, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.studentCard, isTablet && styles.studentCardTablet, isDesktop && styles.studentCardDesktop]}
              onPress={() => navigation.navigate('StudentDetail', { student })}
              activeOpacity={0.7}
            >
              <View style={styles.avatarWrap}>
                <View style={[styles.avatar, { backgroundColor: getInitialColor(student.full_name) }]}>
                  <Text style={styles.avatarText}>
                    {student.full_name?.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={[
                  styles.statusDot,
                  { backgroundColor: student.status === 'ongoing' ? '#0F6E56' : '#ccc' }
                ]} />
              </View>
              <View style={styles.studentInfo}>
                <Text style={styles.studentName}>{student.full_name}</Text>
                <Text style={styles.studentSub} numberOfLines={1}>
                  {student.org_name} • {student.department}
                </Text>
              </View>
              <ProgressRing percent={getProgress(student)} />
            </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Recent Logbook Entries */}
        {data?.pendingLogs?.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={styles.greenDot} />
                <Text style={styles.sectionTitle}>RECENT SUBMISSIONS</Text>
              </View>
            </View>
            <View style={[styles.cardsGrid, isTablet && styles.cardsGridTablet]}>
              {data.pendingLogs.map((log, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.logCard, isTablet && styles.logCardTablet, isDesktop && styles.logCardDesktop]}
                onPress={() => navigation.navigate('ReviewLogbooks')}
                activeOpacity={0.7}
              >
                <View>
                  <Text style={styles.logWeek}>Week {log.week_number}</Text>
                  <Text style={styles.logStudent}>{log.full_name}</Text>
                  <Text style={styles.logReg}>{log.reg_number}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.logDate}>
                    {new Date(log.submitted_at).toLocaleDateString()}
                  </Text>
                  <View style={styles.reviewBtn}>
                    <Text style={styles.reviewBtnText}>Review →</Text>
                  </View>
                </View>
              </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <View style={{ height: 24 }} />
        </View>
      </ScrollView>

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        {[
          { label: 'Home', icon: '⌂', screen: 'Dashboard', active: true },
          { label: 'Students', icon: '👥', screen: 'MyStudents' },
          { label: 'Reviews', icon: '📋', screen: 'ReviewLogbooks' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.screen}
            style={styles.tabItem}
            onPress={() => !tab.active && navigation.navigate(tab.screen)}
          >
            <Text style={[styles.tabIcon, tab.active && styles.tabIconActive]}>{tab.icon}</Text>
            <Text style={[styles.tabLabel, tab.active && styles.tabLabelActive]}>{tab.label}</Text>
            {tab.active && <View style={styles.tabDot} />}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#EEF4F1' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 10 },
  contentWrap: { width: '100%', alignSelf: 'center' },
  contentWrapTablet: { maxWidth: 960 },
  contentWrapDesktop: { maxWidth: 1160 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#EEF4F1' },
  loadingText: { marginTop: 10, color: '#888', fontSize: 14 },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: '5%', paddingTop: 55, paddingBottom: 14, backgroundColor: '#EEF4F1',
  },
  menuBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  topBarTitle: { fontSize: 17, fontWeight: '600', color: '#111' },
  profileIcon: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#0F6E56', justifyContent: 'center', alignItems: 'center',
  },
  profileInitial: { color: '#fff', fontSize: 14, fontWeight: '600' },

  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.26)',
    paddingTop: 86,
    paddingHorizontal: 16,
  },
  overflowMenu: {
    width: 236,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  overflowTitle: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    fontWeight: '700',
    color: '#8899AA',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  overflowItem: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  overflowIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#E1F5EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overflowLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1A3A33',
  },

  statsCard: {
    backgroundColor: '#fff', marginHorizontal: '4.5%', marginBottom: 14,
    borderRadius: 16, borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.07)',
    padding: 18,
  },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 12, color: '#888', textAlign: 'center', marginBottom: 6, lineHeight: 16 },
  statNum: { fontSize: 26, fontWeight: '500' },
  statDivider: { width: 0.5, height: 40, backgroundColor: 'rgba(0,0,0,0.1)' },

  alertCard: {
    marginHorizontal: '4.5%', marginBottom: 14, backgroundColor: '#fff',
    borderRadius: 16, borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.07)',
    borderLeftWidth: 4, borderLeftColor: '#0F6E56',
    padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  alertIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#E1F5EE', justifyContent: 'center', alignItems: 'center',
  },
  alertIconText: { fontSize: 18, fontWeight: '700', color: '#0F6E56' },
  alertBody: { flex: 1 },
  alertTitle: { fontSize: 14, fontWeight: '600', color: '#111', marginBottom: 3 },
  alertDesc: { fontSize: 12, color: '#666', lineHeight: 17 },
  alertBtn: {
    backgroundColor: '#0F6E56', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  alertBtnText: { color: '#fff', fontSize: 13, fontWeight: '500' },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: '5%', marginBottom: 10, marginTop: 4,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  greenDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#0F6E56' },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#111', letterSpacing: 0.5 },
  viewAll: { fontSize: 13, color: '#0F6E56', fontWeight: '500' },

  emptyCard: {
    backgroundColor: '#fff', marginHorizontal: '4.5%', padding: 30,
    borderRadius: 16, alignItems: 'center',
    borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.07)',
  },
  cardsGrid: { width: '100%' },
  cardsGridTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: '3.5%',
  },
  emptyIcon: { fontSize: 36, marginBottom: 10 },
  emptyText: { color: '#888', fontSize: 14 },

  studentCard: {
    backgroundColor: '#fff', marginHorizontal: '4.5%', marginBottom: 10,
    borderRadius: 16, borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.07)',
    padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  studentCardTablet: { width: '48%', marginHorizontal: 0 },
  studentCardDesktop: { width: '31.8%' },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '600' },
  statusDot: {
    position: 'absolute', bottom: 2, right: 2,
    width: 11, height: 11, borderRadius: 6,
    borderWidth: 2, borderColor: '#fff',
  },
  studentInfo: { flex: 1, minWidth: 0 },
  studentName: { fontSize: 14, fontWeight: '600', color: '#111' },
  studentSub: { fontSize: 12, color: '#888', marginTop: 2 },

  logCard: {
    backgroundColor: '#fff', marginHorizontal: '4.5%', marginBottom: 10,
    borderRadius: 16, borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.07)',
    padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  logCardTablet: { width: '48%', marginHorizontal: 0 },
  logCardDesktop: { width: '31.8%' },
  logWeek: { fontSize: 14, fontWeight: '600', color: '#0F6E56' },
  logStudent: { fontSize: 13, color: '#111', marginTop: 2 },
  logReg: { fontSize: 11, color: '#888', marginTop: 1 },
  logDate: { fontSize: 11, color: '#888' },
  reviewBtn: {
    backgroundColor: '#0F6E56', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5, marginTop: 6,
  },
  reviewBtnText: { color: '#fff', fontSize: 11, fontWeight: '600' },

  tabBar: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderTopWidth: 0.5, borderTopColor: 'rgba(0,0,0,0.1)',
    paddingTop: 8, paddingBottom: 24,
  },
  tabItem: { flex: 1, alignItems: 'center', gap: 4 },
  tabIcon: { fontSize: 20, color: '#aaa' },
  tabIconActive: { color: '#0F6E56' },
  tabLabel: { fontSize: 11, color: '#aaa' },
  tabLabelActive: { color: '#0F6E56', fontWeight: '500' },
  tabDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#0F6E56' },
});
