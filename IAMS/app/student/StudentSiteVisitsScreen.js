import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../../api/axios';
import Spinner from '../../components/Spinner';

const TEAL = '#0F6E56';
const TEAL_LIGHT = '#E1F5EE';
const AMBER = '#BA7517';
const AMBER_LIGHT = '#FAEEDA';
const CORAL = '#D85A30';
const CORAL_LIGHT = '#FAECE7';
const GRAY = '#6B7280';

function statusMeta(status) {
  switch (status) {
    case 'completed': return { label: '✓ COMPLETED', bg: TEAL_LIGHT, text: TEAL };
    case 'cancelled':
    case 'canceled':  return { label: '✕ CANCELLED', bg: CORAL_LIGHT, text: CORAL };
    case 'scheduled':
    default:          return { label: '📅 SCHEDULED', bg: AMBER_LIGHT, text: AMBER };
  }
}

function formatVisitDate(dateStr) {
  if (!dateStr) return { day: '--', month: '---' };
  const d = new Date(dateStr);
  return {
    day: d.getDate(),
    month: d.toLocaleString('en', { month: 'short' }).toUpperCase(),
  };
}

export default function SiteVisitsScreen({ navigation }) {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const res = await api.get('/students/site-visits');
      setVisits(res.data || []);
    } catch (err) {
      Alert.alert('Error', 'Failed to load site visits');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);
  useFocusEffect(useCallback(() => { fetchData(); }, []));

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  if (loading) {
    return (
      <View style={s.loadingContainer}>
        <Spinner size="large" color={TEAL} />
        <Text style={s.loadingText}>Loading site visits...</Text>
      </View>
    );
  }

  const today = new Date();
  const upcoming = visits
    .filter(v => v.status === 'scheduled' && new Date(v.visit_date) >= new Date(today.toDateString()))
    .sort((a, b) => new Date(a.visit_date) - new Date(b.visit_date));
  const past = visits
    .filter(v => !(v.status === 'scheduled' && new Date(v.visit_date) >= new Date(today.toDateString())))
    .sort((a, b) => new Date(b.visit_date) - new Date(a.visit_date));

  const renderVisit = (visit) => {
    const { day, month } = formatVisitDate(visit.visit_date);
    const meta = statusMeta(visit.status);
    return (
      <View key={visit.visit_id} style={s.visitCard}>
        <View style={s.dateBadge}>
          <Text style={s.dateMonth}>{month}</Text>
          <Text style={s.dateDay}>{day}</Text>
        </View>

        <View style={s.visitBody}>
          <View style={s.visitTopRow}>
            <Text style={s.visitTime}>
              {visit.visit_time ? visit.visit_time : 'Time not specified'}
            </Text>
            <View style={[s.statusBadge, { backgroundColor: meta.bg }]}>
              <Text style={[s.statusText, { color: meta.text }]}>{meta.label}</Text>
            </View>
          </View>

          <View style={s.supervisorRow}>
            <Ionicons name="person-outline" size={14} color={GRAY} />
            <Text style={s.supervisorText}>
              {visit.supervisor_name}
              {visit.supervisor_phone ? ` · ${visit.supervisor_phone}` : ''}
            </Text>
          </View>

          {!!visit.notes && (
            <View style={s.notesBox}>
              <Text style={s.notesLabel}>NOTES</Text>
              <Text style={s.notesText}>{visit.notes}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#333" />
          <Text style={s.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Site Visits</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={s.scrollContent}
      >
        <View style={s.sectionHead}>
          <View style={s.dot} />
          <Text style={s.sectionTitle}>Upcoming Visits</Text>
        </View>

        {upcoming.length === 0 ? (
          <View style={s.emptyCard}>
            <MaterialCommunityIcons name="calendar-blank-outline" size={36} color="#B0BEC5" />
            <Text style={s.emptyTitle}>No Upcoming Visits</Text>
            <Text style={s.emptyText}>
              Your supervisor hasn't scheduled any upcoming site visits yet.
            </Text>
          </View>
        ) : (
          upcoming.map(renderVisit)
        )}

        <View style={[s.sectionHead, { marginTop: 24 }]}>
          <View style={s.dot} />
          <Text style={s.sectionTitle}>Past Visits</Text>
        </View>

        {past.length === 0 ? (
          <View style={s.emptyCard}>
            <MaterialCommunityIcons name="history" size={36} color="#B0BEC5" />
            <Text style={s.emptyTitle}>No Past Visits</Text>
            <Text style={s.emptyText}>Completed or cancelled visits will show up here.</Text>
          </View>
        ) : (
          past.map(renderVisit)
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F0F4F3' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#888' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 52, paddingBottom: 14,
    backgroundColor: '#F0F4F3',
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, width: 80 },
  backText: { fontSize: 15, fontWeight: '600', color: '#333' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#111' },

  scrollContent: { padding: 16 },

  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: TEAL },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1A2E29' },

  emptyCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 28,
    alignItems: 'center', marginBottom: 8,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)', borderStyle: 'dashed',
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#333', marginTop: 10 },
  emptyText: { fontSize: 12, color: '#888', textAlign: 'center', marginTop: 6, lineHeight: 18 },

  visitCard: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderRadius: 16, padding: 14, marginBottom: 12,
    borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.07)', gap: 14,
  },
  dateBadge: {
    width: 54, height: 54, borderRadius: 12,
    backgroundColor: TEAL_LIGHT, alignItems: 'center', justifyContent: 'center',
  },
  dateMonth: { fontSize: 10, fontWeight: '700', color: TEAL, letterSpacing: 0.4 },
  dateDay: { fontSize: 20, fontWeight: '800', color: TEAL, marginTop: 2 },

  visitBody: { flex: 1 },
  visitTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  visitTime: { fontSize: 14, fontWeight: '700', color: '#111' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },

  supervisorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  supervisorText: { fontSize: 12, color: GRAY },

  notesBox: { marginTop: 10, backgroundColor: '#F7F9F8', borderRadius: 10, padding: 10 },
  notesLabel: { fontSize: 10, fontWeight: '700', color: GRAY, letterSpacing: 0.4, marginBottom: 4 },
  notesText: { fontSize: 12, color: '#333', lineHeight: 18 },
});