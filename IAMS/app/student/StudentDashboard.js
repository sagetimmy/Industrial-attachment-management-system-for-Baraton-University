import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../constants/colors';

export default function StudentDashboard({ navigation }) {
  const { user, logout } = useAuth();

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
    { title: 'Notifications', icon: '🔔', screen: 'Notifications', color: '#6A1B9A' },
  ];

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello 👋</Text>
          <Text style={styles.name}>{user?.full_name || 'Student'}</Text>
          <Text style={styles.regNo}>{user?.reg_number}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Status Card */}
      <View style={styles.statusCard}>
        <Text style={styles.statusTitle}>Attachment Status</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>No Active Attachment</Text>
        </View>
        <Text style={styles.statusHint}>Apply for placement to get started</Text>
      </View>

      {/* Menu Grid */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.grid}>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.screen}
            style={[styles.card, { borderLeftColor: item.color }]}
            onPress={() => navigation.navigate(item.screen)}
          >
            <Text style={styles.cardIcon}>{item.icon}</Text>
            <Text style={styles.cardTitle}>{item.title}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Info */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>📌 UEAB Industrial Attachment</Text>
        <Text style={styles.infoText}>
          Submit your weekly logbook entries, track your attachment progress,
          and receive feedback from your supervisor all in one place.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F4F4' },
  header: {
    backgroundColor: COLORS.secondary,
    padding: 24,
    paddingTop: 55,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  greeting: { color: COLORS.gray, fontSize: 14 },
  name: { color: COLORS.white, fontSize: 22, fontWeight: 'bold', marginTop: 2 },
  regNo: { color: COLORS.primary, fontSize: 13, marginTop: 2 },
  logoutBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  logoutText: { color: COLORS.white, fontSize: 13, fontWeight: '600' },
  statusCard: {
    backgroundColor: COLORS.white,
    margin: 16,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 3,
  },
  statusTitle: { fontSize: 16, fontWeight: '700', color: COLORS.darkGray },
  statusBadge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 10,
  },
  statusText: { color: COLORS.primary, fontWeight: '600' },
  statusHint: { color: COLORS.gray, fontSize: 12, marginTop: 8 },
  sectionTitle: {
    fontSize: 16, fontWeight: '700',
    color: COLORS.darkGray, marginLeft: 16, marginBottom: 10,
  },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 10,
  },
  card: {
    backgroundColor: COLORS.white,
    width: '46%', margin: '2%',
    padding: 20, borderRadius: 16,
    borderLeftWidth: 4, elevation: 2,
    alignItems: 'center',
  },
  cardIcon: { fontSize: 32, marginBottom: 10 },
  cardTitle: { fontSize: 13, fontWeight: '600', color: COLORS.darkGray, textAlign: 'center' },
  infoCard: {
    backgroundColor: COLORS.secondary,
    margin: 16, padding: 20,
    borderRadius: 16, marginBottom: 40,
  },
  infoTitle: { color: COLORS.primary, fontWeight: '700', fontSize: 15, marginBottom: 8 },
  infoText: { color: COLORS.white, fontSize: 13, lineHeight: 20 },
});