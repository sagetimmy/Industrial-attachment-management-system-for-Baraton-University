import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';

const NAVY = '#0D1B2E';
const TEAL = '#2EC4A0';
const WHITE = '#FFFFFF';
const GRAY = '#8899AA';
const LIGHT_BG = '#F7F8FA';
const DARK = '#111827';
const BORDER = '#E5E7EB';

function DetailRow({ icon, label, value }) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.iconBox}>
        <Ionicons name={icon} size={18} color={TEAL} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value || 'Not provided'}</Text>
      </View>
    </View>
  );
}

export default function AdminProfile({ navigation }) {
  const { user, logout } = useAuth();
  const displayName = user?.full_name || user?.name || 'System Administrator';
  const initials = displayName
    .split(' ')
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color={WHITE} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Profile</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials || 'A'}</Text>
          </View>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.role}>Administrator</Text>
        </View>

        <View style={styles.card}>
          <DetailRow icon="mail-outline" label="EMAIL" value={user?.email} />
          <View style={styles.divider} />
          <DetailRow icon="shield-checkmark-outline" label="ROLE" value={user?.role || 'admin'} />
          <View style={styles.divider} />
          <DetailRow icon="call-outline" label="PHONE" value={user?.phone} />
        </View>

        <View style={styles.card}>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => Alert.alert('Coming Soon', 'Admin profile editing is coming soon.')}
          >
            <MaterialCommunityIcons name="account-edit-outline" size={20} color={TEAL} />
            <Text style={styles.actionText}>Edit Profile</Text>
            <Ionicons name="chevron-forward" size={18} color={GRAY} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => Alert.alert('Coming Soon', 'Password change is coming soon.')}
          >
            <MaterialCommunityIcons name="lock-reset" size={20} color={TEAL} />
            <Text style={styles.actionText}>Change Password</Text>
            <Ionicons name="chevron-forward" size={18} color={GRAY} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color="#FF5252" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: NAVY },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
    backgroundColor: NAVY,
  },
  headerBtn: { width: 40 },
  headerTitle: { flex: 1, textAlign: 'center', color: WHITE, fontSize: 18, fontWeight: '700' },
  scroll: { flex: 1, backgroundColor: LIGHT_BG, paddingHorizontal: 16 },
  profileCard: {
    alignItems: 'center',
    backgroundColor: WHITE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 24,
    marginTop: 20,
    marginBottom: 16,
  },
  avatar: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  avatarText: { color: WHITE, fontSize: 28, fontWeight: '800' },
  name: { fontSize: 20, fontWeight: '800', color: DARK },
  role: { fontSize: 13, color: GRAY, marginTop: 4 },
  card: {
    backgroundColor: WHITE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
    marginBottom: 16,
  },
  detailRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(46,196,160,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  detailLabel: { fontSize: 11, color: GRAY, fontWeight: '700', marginBottom: 3 },
  detailValue: { fontSize: 14, color: DARK, fontWeight: '600' },
  divider: { height: 1, backgroundColor: BORDER, marginHorizontal: 16 },
  actionRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  actionText: { flex: 1, fontSize: 14, color: DARK, fontWeight: '600' },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FF5252',
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
    marginBottom: 40,
  },
  logoutText: { color: '#FF5252', fontSize: 15, fontWeight: '700' },
});
