import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/axios';

// ── Design Tokens ────────────────────────────────────────────────────────────
const BG      = '#EEF2F0';
const WHITE   = '#FFFFFF';
const TEAL    = '#1B7A65';
const DARK    = '#0F2419';
const GRAY    = '#7A8F86';
const BORDER  = '#D8E4DF';

// ── Role config (mirrors ManageUsersScreen) ──────────────────────────────────
const roleConfig = (role) => {
  switch (role) {
    case 'student':    return { bg: '#E8F5E9', color: '#1B6B5A', label: 'STUDENT' };
    case 'supervisor': return { bg: '#EDE7F6', color: '#6A1B9A', label: 'SUPERVISOR' };
    case 'host_org':   return { bg: '#E3F2FD', color: '#1565C0', label: 'HOST ORG' };
    case 'admin':      return { bg: '#FFF3E0', color: '#E65100', label: 'ADMIN' };
    default:           return { bg: '#F4F4F4', color: '#888',    label: role || '—' };
  }
};

export default function UserDetailScreen({ navigation, route }) {
  const { user } = route.params;
  const cfg = roleConfig(user.role);

  const initials = user.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  const photoUrl = user.avatar_url || null;

  const joined = user.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
    : '—';

  const handleResetPassword = () => {
    Alert.alert('Reset Password', `Send password reset to ${user.email}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send',
        onPress: () => api.post(`/admin/reset-password/${user.user_id}`)
          .then(() => Alert.alert('Sent', `Reset email sent to ${user.email}`))
          .catch(() => Alert.alert('Error', 'Failed to send reset email')),
      },
    ]);
  };

  const InfoRow = ({ label, value, isLast }) => (
    <View style={[styles.infoRow, isLast && styles.infoRowLast]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '—'}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={16} color={TEAL} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* ── Avatar block ── */}
        <View style={styles.avatarBlock}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          )}
          <Text style={styles.userName}>{user.name || 'Unknown'}</Text>
          <Text style={styles.userEmail}>{user.email || '—'}</Text>
          <View style={[styles.roleBadge, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.roleText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>

        {/* ── Info card ── */}
        <View style={styles.card}>
          <InfoRow label="Department" value={user.department || user.supervisor_dept} />
          <InfoRow label="Phone" value={user.phone || user.supervisor_phone} />
          <InfoRow label="Status" value={user.is_active ? 'Active' : 'Inactive'} />
          <InfoRow label="Verified" value={user.is_verified ? 'Yes' : 'No'} />
          <InfoRow label="Joined Date" value={joined} isLast />
        </View>

        {/* ── Actions ── */}
        <TouchableOpacity style={styles.resetBtn} onPress={handleResetPassword}>
          <Text style={styles.resetBtnText}>Reset Password</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: DARK, flex: 1, textAlign: 'center' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, width: 70 },
  backText: { fontSize: 15, color: TEAL, fontWeight: '600' },
  headerSpacer: { width: 70 },

  content: { paddingHorizontal: 20 },

  // Avatar block
  avatarBlock: { alignItems: 'center', marginTop: 16, marginBottom: 24 },
  avatar: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: TEAL,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: { color: WHITE, fontSize: 32, fontWeight: '800' },
  avatarImage: {
    width: 90, height: 90, borderRadius: 45,
    marginBottom: 16,
    borderWidth: 2, borderColor: WHITE,
  },
  userName: { fontSize: 22, fontWeight: '800', color: DARK, marginBottom: 6 },
  userEmail: { fontSize: 14, color: GRAY, marginBottom: 14 },
  roleBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  roleText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.4 },

  // Info card
  card: {
    backgroundColor: WHITE,
    borderRadius: 18,
    paddingHorizontal: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  infoRowLast: { borderBottomWidth: 0 },
  infoLabel: { fontSize: 14, color: GRAY, fontWeight: '500' },
  infoValue: { fontSize: 15, color: DARK, fontWeight: '700' },

  // Buttons
  resetBtn: {
    backgroundColor: WHITE,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: BORDER,
  },
  resetBtnText: { color: TEAL, fontSize: 15, fontWeight: '700' },
});