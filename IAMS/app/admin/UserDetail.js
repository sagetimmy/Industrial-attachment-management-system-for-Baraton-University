import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function UserDetailScreen({ navigation, route }) {
  const { user } = route.params;

  const infoRow = (label, value) => (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '—'}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.notifBtn} />
        <Text style={styles.headerTitle}>User Details</Text>
        <TouchableOpacity style={styles.notifBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user.name?.charAt(0).toUpperCase() || '?'}
            </Text>
          </View>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{user.role?.toUpperCase()}</Text>
          </View>
        </View>

        {/* Details Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account Info</Text>
          {infoRow('Department', user.department || user.supervisor_dept)}
          {infoRow('Phone', user.supervisor_phone)}
          {infoRow('Status', user.is_active ? 'Active' : 'Inactive')}
          {infoRow('Verified', user.is_verified ? 'Yes' : 'No')}
          {infoRow('Joined', new Date(user.created_at).toLocaleDateString())}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F3' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1B3A2F',
    flex: 1,
    textAlign: 'center',
  },
  notifBtn: { width: 60 },
  backText: { fontSize: 14, color: '#1B6B5A', fontWeight: '600' },
  content: { padding: 20 },
  avatarContainer: { alignItems: 'center', marginBottom: 24 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#1B6B5A',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  userName: { fontSize: 20, fontWeight: '800', color: '#1B3A2F', marginBottom: 4 },
  userEmail: { fontSize: 13, color: '#888', marginBottom: 10 },
  roleBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 14, paddingVertical: 4,
    borderRadius: 20,
  },
  roleText: { fontSize: 12, fontWeight: '700', color: '#1B6B5A' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16, padding: 20,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 15, fontWeight: '800',
    color: '#1B3A2F', marginBottom: 16,
  },
  infoRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingVertical: 10,
  borderBottomWidth: 1,
  borderBottomColor: '#F0F4F3',
},
infoLabel: {
  fontSize: 13,
  color: '#888',
  fontWeight: '600',
  flex: 1,
},
infoValue: {
  fontSize: 13,
  color: '#1B3A2F',
  fontWeight: '700',
  flex: 2,
  textAlign: 'right',
},
roleBadge: {
  backgroundColor: '#E8F5E9',
  paddingHorizontal: 14,
  paddingVertical: 4,
  borderRadius: 20,
  alignSelf: 'center',
},
roleText: {
  fontSize: 12,
  fontWeight: '700',
  color: '#1B6B5A',
  textAlign: 'center',
},
});