import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/axios';
import Spinner from '../../components/Spinner';

const NAVY = '#0D1B2E';
const TEAL = '#2EC4A0';
const WHITE = '#FFFFFF';
const GRAY = '#8899AA';
const LIGHT_BG = '#F7F8FA';
const DARK = '#111827';
const BORDER = '#E5E7EB';
const RED = '#FF5252';

const formatDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-KE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function AdminActivities({ navigation }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clearing, setClearing] = useState(false);

  const fetchActivities = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await api.get('/activities');
      setActivities(res.data?.activities || []);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Could not load activities.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const handleClearAll = async () => {
    setClearing(true);
    try {
      await api.delete('/activities');
      setActivities([]);
      Alert.alert('Success', 'All activities cleared.');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to clear activities.');
    } finally {
      setClearing(false);
    }
  };

  const confirmClearAll = () => {
    if (clearing || activities.length === 0) return;
    Alert.alert(
      'Clear all activities',
      'Are you sure you want to clear all activities? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear All', style: 'destructive', onPress: handleClearAll },
      ]
    );
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{item.action || 'ACTIVITY'}</Text>
        </View>
        <Text style={styles.timeText}>{formatDate(item.created_at)}</Text>
      </View>
      <Text style={styles.descText}>{item.description || item.action || '—'}</Text>
      <View style={styles.metaRow}>
        <Ionicons name="person-outline" size={12} color={GRAY} />
        <Text style={styles.metaText}>{item.actor_email || 'System'}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={WHITE} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Activities</Text>
        <TouchableOpacity
          style={[
            styles.clearBtn,
            (activities.length === 0 || clearing) && styles.clearBtnDisabled,
          ]}
          onPress={confirmClearAll}
          disabled={activities.length === 0 || clearing}
        >
          {clearing ? (
            <Spinner size="small" color={WHITE} />
          ) : (
            <Text style={styles.clearBtnText}>Clear All</Text>
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loaderBox}>
          <Spinner size="large" color={TEAL} />
          <Text style={styles.loaderText}>Loading activities…</Text>
        </View>
      ) : (
        <FlatList
          data={activities}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={activities.length ? styles.listContent : styles.emptyContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchActivities(true)} tintColor={TEAL} />}
          ListEmptyComponent={<Text style={styles.emptyText}>No activities yet</Text>}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: LIGHT_BG },
  header: {
    backgroundColor: NAVY,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { color: WHITE, fontSize: 18, fontWeight: '800' },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  clearBtn: {
    backgroundColor: RED,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 92,
    alignItems: 'center',
  },
  clearBtnDisabled: { opacity: 0.5 },
  clearBtnText: { color: WHITE, fontWeight: '700', fontSize: 12 },
  listContent: { padding: 16, paddingBottom: 24 },
  emptyContent: { padding: 16, paddingTop: 60 },
  card: {
    backgroundColor: WHITE,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER,
    elevation: 1,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  typeBadge: { backgroundColor: 'rgba(46,196,160,0.15)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  typeBadgeText: { color: TEAL, fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
  timeText: { fontSize: 11, color: GRAY },
  descText: { fontSize: 13, color: DARK, lineHeight: 20, marginBottom: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12, color: GRAY },
  loaderBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loaderText: { fontSize: 14, color: GRAY },
  emptyText: { fontSize: 15, color: GRAY, textAlign: 'center' },
});
