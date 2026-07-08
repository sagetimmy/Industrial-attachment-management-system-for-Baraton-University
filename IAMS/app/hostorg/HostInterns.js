import { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  RefreshControl, ActivityIndicator, Alert, TouchableOpacity, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/axios';

const TEAL = '#0F6E56';
const DARK = '#111827';
const GRAY = '#6B7280';
const BORDER = '#E5E7EB';

function getWeekSummary(application) {
  if (Number.isFinite(application?.current_week)) return `Week ${application.current_week}`;
  const start = application?.start_date ? new Date(application.start_date) : null;
  const end = application?.end_date ? new Date(application.end_date) : null;
  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return null;
  const now = new Date();
  const totalWeeks = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7)));
  const elapsedWeeks = Math.max(1, Math.min(totalWeeks, Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7))));
  return `Week ${elapsedWeeks} of ${totalWeeks}`;
}

function calculateProgress(application) {
  if (Number.isFinite(application?.progress_percent)) {
    return Math.max(0, Math.min(100, Math.round(application.progress_percent)));
  }
  const start = application?.start_date ? new Date(application.start_date) : null;
  const end = application?.end_date ? new Date(application.end_date) : null;
  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return null;
  const now = new Date();
  const totalMs = end.getTime() - start.getTime();
  const elapsedMs = Math.max(0, Math.min(totalMs, now.getTime() - start.getTime()));
  return Math.max(0, Math.min(100, Math.round((elapsedMs / totalMs) * 100)));
}

export default function HostInterns({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/host-orgs/dashboard');
      setData(res.data);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load interns');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchDashboard(); }, []);

  const onRefresh = () => { setRefreshing(true); fetchDashboard(); };

  const interns = useMemo(() => {
    const list = (data?.applications || []).filter(a => ['approved', 'ongoing'].includes(a.status));
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(a =>
      a.full_name?.toLowerCase().includes(q) ||
      a.department?.toLowerCase().includes(q) ||
      a.reg_number?.toLowerCase().includes(q)
    );
  }, [data, query]);

  if (loading) {
    return (
      <View style={s.loadingContainer}>
        <ActivityIndicator size="large" color={TEAL} />
        <Text style={s.loadingText}>Loading interns...</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <View style={s.headerRow}>
          <TouchableOpacity
            style={s.backBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={22} color={DARK} />
          </TouchableOpacity>
          <View>
            <Text style={s.title}>Interns</Text>
            <Text style={s.subtitle}>
              {interns.length} active intern{interns.length === 1 ? '' : 's'}
            </Text>
          </View>
        </View>

        <View style={s.searchBox}>
          <Ionicons name="search" size={16} color={GRAY} />
          <TextInput
            style={s.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search by name, department, reg no..."
            placeholderTextColor={GRAY}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={16} color={GRAY} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: 28 }}
      >
        {interns.length === 0 ? (
          <View style={s.emptyCard}>
            <Ionicons name="people-outline" size={36} color="#ccc" />
            <Text style={s.emptyTitle}>{query ? 'No matches' : 'No Active Interns'}</Text>
            <Text style={s.emptyText}>
              {query ? 'Try a different search term.' : 'Accepted students will appear here once placed.'}
            </Text>
          </View>
        ) : (
          interns.map((app, index) => {
            const progress = calculateProgress(app);
            const weekSummary = getWeekSummary(app);
            return (
              <TouchableOpacity
                key={app.attachment_id ?? index}
                style={s.card}
                onPress={() => navigation.navigate('StudentDetail', { studentId: app.student_id })}
              >
                <View style={s.cardTop}>
                  <View style={s.avatar}>
                    <Text style={s.avatarText}>{app.full_name?.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={s.info}>
                    <Text style={s.name}>{app.full_name}</Text>
                    <Text style={s.meta}>
                      {app.department || 'Intern'}
                      {app.reg_number ? ` · ${app.reg_number}` : ''}
                    </Text>
                    {weekSummary && <Text style={s.week}>{weekSummary}</Text>}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#ccc" />
                </View>
                <View style={s.progressRow}>
                  <Text style={s.progressLabel}>PROGRESS</Text>
                  <Text style={s.progressPct}>{progress === null ? '—' : `${progress}%`}</Text>
                </View>
                <View style={s.progressTrack}>
                  <View style={[s.progressFill, { width: `${progress ?? 0}%` }]} />
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F3' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: GRAY },

  header: {
    backgroundColor: '#fff',
    paddingTop: 52, paddingBottom: 14, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  backBtn: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  title: { fontSize: 22, fontWeight: '700', color: DARK },
  subtitle: { marginTop: 2, color: GRAY, fontSize: 13 },

  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9,
  },
  searchInput: { flex: 1, fontSize: 13, color: DARK, padding: 0 },

  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16, marginTop: 12,
    borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: BORDER,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: TEAL,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: DARK },
  meta: { fontSize: 12, color: GRAY, marginTop: 2 },
  week: { fontSize: 12, color: TEAL, marginTop: 2, fontWeight: '600' },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: 11, color: GRAY, fontWeight: '600', letterSpacing: 0.3 },
  progressPct: { fontSize: 12, fontWeight: '700', color: DARK },
  progressTrack: { height: 6, backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 3 },
  progressFill: { height: 6, backgroundColor: TEAL, borderRadius: 3 },

  emptyCard: {
    backgroundColor: '#fff',
    margin: 16, padding: 30, borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1, borderColor: BORDER,
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#333', marginTop: 10 },
  emptyText: { fontSize: 13, color: GRAY, textAlign: 'center', marginTop: 6 },
});