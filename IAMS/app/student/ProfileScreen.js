import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

const TEAL = '#2EC4A0';
const DARK = '#111827';
const GRAY = '#8899AA';
const WHITE = '#FFFFFF';
const LIGHT = '#F4F7F6';
const BORDER = '#E5E7EB';
const RED = '#E53935';

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [attachment, setAttachment] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [attachRes, docsRes] = await Promise.all([
        api.get('/students/my-attachment').catch(() => ({ data: null })),
        api.get('/students/documents').catch(() => ({ data: [] })),
      ]);
      setAttachment(attachRes.data);
      setDocuments(docsRes.data || []);
      setProfile(user);
    } catch (err) {
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={TEAL} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  const initials = profile?.full_name?.trim().charAt(0).toUpperCase() || '?';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[TEAL]} />}
      >
        <View style={styles.banner}>
          <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate('EditProfile')}>
            <Ionicons name="pencil-outline" size={14} color={TEAL} />
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.avatarWrapper}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        </View>

        <View style={styles.nameSection}>
          <Text style={styles.name}>{profile?.full_name || 'Student'}</Text>
          <Text style={styles.regNumber}>Reg: {profile?.reg_number || 'N/A'}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <MaterialCommunityIcons name="card-account-details-outline" size={18} color={TEAL} />
            <Text style={styles.cardTitle}>Personal Details</Text>
          </View>
          <InfoRow icon="person-outline" label="FULL NAME" value={profile?.full_name || 'N/A'} />
          <View style={styles.divider} />
          <InfoRow icon="school-outline" label="COURSE" value={profile?.department || 'N/A'} />
          <View style={styles.divider} />
          <InfoRow icon="calendar-outline" label="YEAR OF STUDY" value={profile?.year_of_study || 'N/A'} />
          <View style={styles.divider} />
          <InfoRow icon="mail-outline" label="UNIVERSITY EMAIL" value={profile?.email || 'N/A'} />
        </View>

        <Text style={styles.sectionHeading}>Documents</Text>
        {documents.length === 0 ? (
          <View style={styles.emptyDocCard}><Text style={styles.emptyText}>No documents uploaded yet</Text></View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.docsRow}>
            {documents.map((doc, i) => (
              <View key={i} style={styles.docCard}>
                <View style={[styles.docIconBox, { backgroundColor: doc.status === 'verified' ? '#E8F5F1' : '#FFF3ED' }]}>
                  <MaterialCommunityIcons name="cloud-upload-outline" size={26} color={doc.status === 'verified' ? TEAL : '#EA580C'} />
                </View>
                <Text style={styles.docName} numberOfLines={2}>{doc.document_type}</Text>
                <View style={[styles.docBadge, { backgroundColor: doc.status === 'verified' ? '#E8F5F1' : '#FFF3ED' }]}>
                  <Text style={[styles.docBadgeText, { color: doc.status === 'verified' ? TEAL : '#EA580C' }]}>
                    {doc.status?.toUpperCase()}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        )}

        <Text style={styles.sectionHeading}>Attachment History</Text>
        {!attachment ? (
          <View style={styles.emptyDocCard}><Text style={styles.emptyText}>No attachment history</Text></View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.docsRow}>
            <View style={[styles.attachCard, styles.attachCardActive]}>
              <View style={styles.attachCardTop}>
                <MaterialCommunityIcons name="office-building-outline" size={20} color={TEAL} />
                {attachment.status === 'ongoing' && <View style={styles.currentBadge}><Text style={styles.currentBadgeText}>CURRENT</Text></View>}
              </View>
              <Text style={styles.attachOrg}>{attachment.org_name}</Text>
              <Text style={styles.attachRole}>{attachment.role || 'Intern'}</Text>
            </View>
          </ScrollView>
        )}

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={18} color={RED} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color={GRAY} style={{ marginRight: 12 }} />
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: LIGHT },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: GRAY },
  banner: { height: 130, backgroundColor: TEAL, justifyContent: 'flex-start', alignItems: 'flex-end', paddingHorizontal: 20, paddingTop: 16 },
  editBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: TEAL, backgroundColor: WHITE, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, gap: 6 },
  editBtnText: { fontSize: 13, color: TEAL, fontWeight: '600' },
  avatarWrapper: { alignItems: 'center', marginTop: -50, marginBottom: 12 },
  avatarCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: DARK, borderWidth: 4, borderColor: WHITE, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: WHITE, fontSize: 38, fontWeight: '800' },
  nameSection: { alignItems: 'center', marginBottom: 20 },
  name: { fontSize: 22, fontWeight: '800', color: DARK, marginBottom: 4 },
  regNumber: { fontSize: 13, color: GRAY },
  card: { backgroundColor: WHITE, borderRadius: 16, marginHorizontal: 16, marginBottom: 20, padding: 16, elevation: 2, borderWidth: 1, borderColor: BORDER },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: TEAL },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  infoLabel: { fontSize: 11, color: GRAY, fontWeight: '700', letterSpacing: 0.5, marginBottom: 3 },
  infoValue: { fontSize: 14, color: DARK, fontWeight: '600' },
  divider: { height: 1, backgroundColor: BORDER },
  sectionHeading: { fontSize: 17, fontWeight: '800', color: DARK, marginHorizontal: 16, marginBottom: 12 },
  docsRow: { paddingHorizontal: 16, gap: 12, paddingBottom: 4 },
  docCard: { width: 130, backgroundColor: WHITE, borderRadius: 16, padding: 14, alignItems: 'center', elevation: 2, borderWidth: 1, borderColor: BORDER, marginBottom: 16 },
  docIconBox: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  docName: { fontSize: 13, fontWeight: '700', color: DARK, textAlign: 'center', marginBottom: 8 },
  docBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  docBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  emptyDocCard: { backgroundColor: WHITE, borderRadius: 16, marginHorizontal: 16, padding: 20, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: BORDER },
  emptyText: { color: GRAY, fontSize: 13 },
  attachCard: { width: 160, backgroundColor: WHITE, borderRadius: 16, padding: 14, elevation: 2, borderWidth: 1, borderColor: BORDER, marginBottom: 16 },
  attachCardActive: { borderLeftWidth: 4, borderLeftColor: TEAL },
  attachCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  currentBadge: { backgroundColor: '#E8F5F1', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  currentBadgeText: { fontSize: 9, fontWeight: '800', color: TEAL },
  attachOrg: { fontSize: 14, fontWeight: '800', color: DARK, marginBottom: 4 },
  attachRole: { fontSize: 12, color: GRAY },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 16, paddingVertical: 16, borderRadius: 30, borderWidth: 1.5, borderColor: RED, gap: 8, marginBottom: 10 },
  logoutText: { color: RED, fontSize: 15, fontWeight: '700' },
});
