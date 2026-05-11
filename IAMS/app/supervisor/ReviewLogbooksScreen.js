import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, RefreshControl
} from 'react-native';
import { COLORS } from '../../constants/colors';
import api from '../../api/axios';

export default function ReviewLogbooksScreen({ navigation, route }) {
  const { attachmentId, studentName } = route.params || {};
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState(null);

  const fetchLogbooks = async () => {
    try {
      const res = await api.get('/supervisors/logbooks');
      // Filter by attachment if provided
      const filtered = attachmentId
        ? res.data.filter(e => e.attachment_id === attachmentId)
        : res.data;
      setEntries(filtered);
    } catch (err) {
      Alert.alert('Error', 'Failed to load logbooks');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchLogbooks(); }, []);

  const onRefresh = () => { setRefreshing(true); fetchLogbooks(); };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Review Logbooks 📖</Text>
        <Text style={styles.subtitle}>
          {studentName ? `${studentName} • ` : ''}{entries.length} entries
        </Text>
      </View>

      {entries.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>📝</Text>
          <Text style={styles.emptyTitle}>No Logbook Entries</Text>
          <Text style={styles.emptyText}>
            No entries submitted yet.
          </Text>
        </View>
      ) : (
        entries.map((entry, index) => (
          <TouchableOpacity
            key={index}
            style={styles.entryCard}
            onPress={() => setExpanded(expanded === index ? null : index)}
          >
            <View style={styles.entryHeader}>
              <View style={styles.weekBadge}>
                <Text style={styles.weekNum}>W{entry.week_number}</Text>
              </View>
              <View style={styles.entryMeta}>
                <Text style={styles.entryStudent}>{entry.full_name}</Text>
                <Text style={styles.entryReg}>{entry.reg_number}</Text>
                <Text style={styles.entryDate}>
                  {new Date(entry.submitted_at).toLocaleDateString()}
                </Text>
              </View>
              <Text style={styles.expandIcon}>
                {expanded === index ? '▲' : '▼'}
              </Text>
            </View>

            {expanded === index && (
              <View style={styles.entryDetails}>
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>📝 Description</Text>
                  <Text style={styles.detailText}>{entry.description}</Text>
                </View>
                {entry.tasks_done ? (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>✅ Tasks Done</Text>
                    <Text style={styles.detailText}>{entry.tasks_done}</Text>
                  </View>
                ) : null}
                {entry.challenges ? (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>⚠️ Challenges</Text>
                    <Text style={styles.detailText}>{entry.challenges}</Text>
                  </View>
                ) : null}
                {entry.document_url && (
                  <View style={styles.docAttached}>
                    <Text style={styles.docText}>📎 Document attached</Text>
                  </View>
                )}
              </View>
            )}
          </TouchableOpacity>
        ))
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F4F4' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: COLORS.secondary,
    paddingTop: 55, paddingBottom: 25,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  backBtn: { marginBottom: 10 },
  backText: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
  title: { color: COLORS.white, fontSize: 24, fontWeight: 'bold' },
  subtitle: { color: '#8899AA', fontSize: 13, marginTop: 4 },
  emptyCard: {
    backgroundColor: COLORS.white,
    margin: 16, padding: 30,
    borderRadius: 16, alignItems: 'center', elevation: 2,
  },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.darkGray },
  emptyText: { fontSize: 13, color: COLORS.gray, textAlign: 'center', marginTop: 6 },
  entryCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16, marginTop: 12,
    borderRadius: 16, elevation: 2, overflow: 'hidden',
  },
  entryHeader: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14,
  },
  weekBadge: {
    width: 46, height: 46, borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  weekNum: { color: COLORS.white, fontWeight: 'bold', fontSize: 14 },
  entryMeta: { flex: 1 },
  entryStudent: { fontSize: 14, fontWeight: '700', color: COLORS.darkGray },
  entryReg: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  entryDate: { fontSize: 11, color: COLORS.primary, marginTop: 2 },
  expandIcon: { fontSize: 14, color: COLORS.gray },
  entryDetails: {
    padding: 14, paddingTop: 0,
    borderTopWidth: 1, borderTopColor: '#F4F4F4',
  },
  detailSection: { marginTop: 12 },
  detailLabel: { fontSize: 13, fontWeight: '700', color: COLORS.secondary, marginBottom: 4 },
  detailText: { fontSize: 13, color: COLORS.darkGray, lineHeight: 20 },
  docAttached: {
    backgroundColor: '#FFF3E0',
    padding: 10, borderRadius: 10, marginTop: 12,
  },
  docText: { color: COLORS.primary, fontWeight: '600', fontSize: 13 },
});