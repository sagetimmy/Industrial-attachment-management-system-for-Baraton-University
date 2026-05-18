import { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import api from '../../api/axios';

const TEAL = '#0F6E56';
const AMBER = '#BA7517';
const RED = '#C62828';
const BLUE = '#185FA5';
const DARK = '#111827';
const GRAY = '#6B7280';

const statusMeta = (status) => {
  switch (status) {
    case 'pending':
      return { label: 'PENDING', bg: '#FAEEDA', color: AMBER };
    case 'ongoing':
      return { label: 'ACCEPTED', bg: '#E1F5EE', color: TEAL };
    case 'completed':
      return { label: 'COMPLETED', bg: '#E3F2FD', color: BLUE };
    case 'rejected':
      return { label: 'REJECTED', bg: '#FCE8E8', color: RED };
    default:
      return { label: String(status || 'UNKNOWN').toUpperCase(), bg: '#F3F4F6', color: GRAY };
  }
};

export default function HostApplicants() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchApplicants = async () => {
    try {
      const res = await api.get('/host-orgs/dashboard');
      setApplications(res.data?.applications || []);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load applicants');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchApplicants(); }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchApplicants();
  };

  const sortedApplications = useMemo(
    () => [...applications].sort((a, b) => {
      const rank = { pending: 0, ongoing: 1, completed: 2, rejected: 3 };
      return (rank[a.status] ?? 9) - (rank[b.status] ?? 9);
    }),
    [applications]
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={TEAL} />
        <Text style={styles.loadingText}>Loading applicants...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Applicants</Text>
        <Text style={styles.subtitle}>
          {sortedApplications.length} application{sortedApplications.length === 1 ? '' : 's'}
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {sortedApplications.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>No applications yet</Text>
            <Text style={styles.emptyText}>Students who apply for placement will appear here.</Text>
          </View>
        ) : (
          sortedApplications.map((app, index) => {
            const meta = statusMeta(app.status);
            return (
              <View key={app.attachment_id ?? index} style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.name}>{app.full_name || 'Applicant'}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
                    <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
                  </View>
                </View>
                <Text style={styles.detail}>Reg No: {app.reg_number || '—'}</Text>
                <Text style={styles.detail}>Department: {app.department || '—'}</Text>
                <Text style={styles.detail}>Year of Study: {app.year_of_study || '—'}</Text>
                <Text style={styles.detail}>Phone: {app.phone || '—'}</Text>
              </View>
            );
          })
        )}
        <View style={{ height: 28 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F3' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#6B7280' },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 52,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: { fontSize: 22, fontWeight: '700', color: DARK },
  subtitle: { marginTop: 4, color: GRAY, fontSize: 13 },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 14,
    padding: 26,
    alignItems: 'center',
  },
  emptyIcon: { fontSize: 44, marginBottom: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: DARK },
  emptyText: { marginTop: 6, color: GRAY, textAlign: 'center', lineHeight: 20 },
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  name: { fontSize: 16, fontWeight: '700', color: DARK, flex: 1, paddingRight: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '700' },
  detail: { color: GRAY, fontSize: 13, marginTop: 2 },
});
