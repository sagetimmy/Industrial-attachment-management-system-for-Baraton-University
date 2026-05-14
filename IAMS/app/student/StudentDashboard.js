import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNotifications } from '../../hooks/useNotifications';

export default function StudentDashboard({ navigation }) {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const { unreadCount } = useNotifications();

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const menuItems = [
    { title: 'Apply for Placement', icon: '📋', screen: 'Apply', color: '#1E3A5F' },
    { title: 'My Logbook', icon: '📖', screen: 'Logbook', color: '#C87941' },
    { title: 'My Profile', icon: '👤', screen: 'Profile', color: '#2E7D32' },
    { title: 'Feedback & Grades', icon: '⭐', screen: 'Feedback', color: '#2E7D32', desc: 'View supervisor evaluations' },
    {
      title: 'Notifications', icon: '🔔', screen: 'Notifications', color: '#6A1B9A',
      desc: unreadCount > 0 ? `${unreadCount} unread` : 'No new notifications',
      badge: unreadCount,
    },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.surface }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.secondary }]}>
        <View>
          <Text style={[styles.greeting, { color: theme.textSecondary }]}>Hello 👋</Text>
          <Text style={[styles.name, { color: theme.white }]}>{user?.full_name || 'Student'}</Text>
          <Text style={[styles.regNo, { color: theme.primary }]}>{user?.reg_number}</Text>
        </View>
        <TouchableOpacity style={[styles.logoutBtn, { backgroundColor: theme.primary }]} onPress={handleLogout}>
          <Text style={[styles.logoutText, { color: theme.white }]}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Status Card */}
      <View style={[styles.statusCard, { backgroundColor: theme.background }]}>
        <Text style={[styles.statusTitle, { color: theme.text }]}>Attachment Status</Text>
        <View style={[styles.statusBadge, { backgroundColor: '#FFF3E0' }]}>
          <Text style={[styles.statusText, { color: theme.primary }]}>No Active Attachment</Text>
        </View>
        <Text style={[styles.statusHint, { color: theme.textSecondary }]}>Apply for placement to get started</Text>
      </View>

      {/* Menu Grid */}
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Quick Actions</Text>
      <View style={styles.grid}>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.screen}
            style={[styles.card, { backgroundColor: theme.background, borderLeftColor: item.color }]}
            onPress={() => navigation.navigate(item.screen)}
          >
            <Text style={styles.cardIcon}>{item.icon}</Text>
            <Text style={[styles.cardTitle, { color: theme.text }]}>{item.title}</Text>
            {item.badge > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.badge}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Info */}
      <View style={[styles.infoCard, { backgroundColor: theme.secondary }]}>
        <Text style={[styles.infoTitle, { color: theme.primary }]}>📌 UEAB Industrial Attachment</Text>
        <Text style={[styles.infoText, { color: theme.white }]}>
          Submit your weekly logbook entries, track your attachment progress,
          and receive feedback from your supervisor all in one place.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    padding: 24,
    paddingTop: 55,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  greeting: { fontSize: 14 },
  name: { fontSize: 22, fontWeight: 'bold', marginTop: 2 },
  regNo: { fontSize: 13, marginTop: 2 },
  logoutBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  logoutText: { fontSize: 13, fontWeight: '600' },
  statusCard: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 3,
  },
  statusTitle: { fontSize: 16, fontWeight: '700' },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 10,
  },
  statusText: { fontWeight: '600' },
  statusHint: { fontSize: 12, marginTop: 8 },
  sectionTitle: {
    fontSize: 16, fontWeight: '700',
    marginLeft: 16, marginBottom: 10,
  },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 10,
  },
  card: {
    width: '46%', margin: '2%',
    padding: 20, borderRadius: 16,
    borderLeftWidth: 4, elevation: 2,
    alignItems: 'center',
  },
  cardIcon: { fontSize: 32, marginBottom: 10 },
  cardTitle: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  infoCard: {
    margin: 16, padding: 20,
    borderRadius: 16, marginBottom: 40,
  },
  infoTitle: { fontWeight: '700', fontSize: 15, marginBottom: 8 },
  infoText: { fontSize: 13, lineHeight: 20 },
  badge: {
    position: 'absolute',
    top: -5, right: -5,
    backgroundColor: '#C62828',
    width: 20, height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
});