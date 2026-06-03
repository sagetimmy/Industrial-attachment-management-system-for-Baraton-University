import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator,
  RefreshControl, useWindowDimensions
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { hasRolePermission } from '../../utils/permissions';

const TEAL   = '#1B6B5A';
const LIGHT  = '#F0F4F3';
const WHITE  = '#FFFFFF';
const DARK   = '#111827';
const GRAY   = '#8899AA';
const BORDER = '#E5E7EB';
const RED    = '#C0392B';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)    return 'Just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `Today, ${new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  if (diff < 172800) return `Yesterday, ${new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  return `${Math.floor(diff / 86400)} days ago`;
}

function deadlineLabel(dateStr) {
  if (!dateStr) return null;
  const diff = Math.floor((new Date(dateStr) - Date.now()) / 1000 / 3600);
  if (diff < 0)   return { label: 'OVERDUE', urgent: true };
  if (diff < 24)  return { label: `DEADLINE: ${diff}H`, urgent: true };
  if (diff < 48)  return { label: 'DEADLINE: 1D', urgent: false };
  return { label: `DEADLINE: ${Math.floor(diff / 24)}D`, urgent: false };
}

export default function ReviewLogbooksScreen({ navigation, route }) {
  const { attachmentId, studentName } = route.params || {};
  const { user } = useAuth();
  const canEditLogbooks = hasRolePermission(user, 'editLogbooks');
  const { width } = useWindowDimensions();
  const [entries, setEntries]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded]   = useState(null);

  const fetchLogbooks = async () => {
    try {
      const res = await api.get('/supervisors/logbooks');
      const filtered = attachmentId
        ? res.data.filter(e => e.attachment_id === attachmentId)
        : res.data;
      setEntries(filtered);
    } catch (err) {
      console.error('Logbooks fetch error:', err);
      Alert.alert('Error', err.response?.data?.message || 'Failed to load logbooks');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleReview = (entry) => {
    navigation.navigate('LogbookDetail', {
      entry,
      totalEntries: entries.length,
    });
  };

  const handleReject = (entry) => {
    if (!canEditLogbooks) {
      Alert.alert('Permission Disabled', 'Logbook review actions are currently disabled for supervisors.');
      return;
    }

    Alert.alert(
      'Reject Entry',
      `Reject Week ${entry.week_number} entry from ${entry.full_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.put(`/supervisors/logbooks/${entry.entry_id}/reject`);
              Alert.alert('Rejected', 'Entry has been rejected.');
              fetchLogbooks();
            } catch (err) {
              console.error('Reject error:', err);
              Alert.alert('Error', err.response?.data?.message || 'Failed to reject entry');
            }
          }
        }
      ]
    );
  };

  useEffect(() => { fetchLogbooks(); }, []);
  useFocusEffect(
    useCallback(() => {
      fetchLogbooks();
    }, [attachmentId])
  );
  const onRefresh = () => { setRefreshing(true); fetchLogbooks(); };

  const isTablet = width >= 768;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={TEAL} />
        <Text style={styles.loadingText}>Loading reviews...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>

      {/* ── HEADER ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.menuBtn}>
          <Ionicons name="menu" size={24} color={DARK} />
        </TouchableOpacity>
        <Text style={styles.headerBrand}>IAMS</Text>
        <View style={styles.avatarSmall}>
          <Ionicons name="person" size={18} color={WHITE} />
        </View>
      </View>

      {/* ── PAGE TITLE ── */}
      <View style={styles.pageTitleSection}>
        <Text style={styles.pageTitle}>
          {studentName ? `${studentName}'s Logbooks` : 'Pending Reviews'}
        </Text>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>
            {entries.length} REQUESTS ACTIVE
          </Text>
        </View>
      </View>

      {/* ── LIST ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          isTablet && styles.listContentTablet,
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[TEAL]} />
        }
      >
        {entries.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="book-open-outline" size={48} color={GRAY} />
            <Text style={styles.emptyTitle}>No Pending Reviews</Text>
            <Text style={styles.emptyText}>All logbook entries have been reviewed.</Text>
          </View>
        ) : (
          entries.map((entry, index) => {
            const isExpanded = expanded === index;
            const initials = entry.full_name?.trim().charAt(0).toUpperCase() || '?';
            const submittedLabel = timeAgo(entry.submitted_at);
            const entryType = `LOGBOOK WEEK ${entry.week_number || '?'}`;

            return (
              <View
                key={index}
                style={[
                  styles.card,
                  isTablet && { width: '48%' },
                ]}
              >
                {/* Student Row */}
                <View style={styles.studentRow}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>{initials}</Text>
                  </View>
                  <View style={styles.studentInfo}>
                    <Text style={styles.studentName}>{entry.full_name || 'Unknown'}</Text>
                    <Text style={styles.studentDept}>{entry.reg_number || entry.org_name}</Text>
                  </View>
                </View>

                {/* Entry Row */}
                <TouchableOpacity
                  style={styles.entryRow}
                  onPress={() => setExpanded(isExpanded ? null : index)}
                  activeOpacity={0.8}
                >
                  <View style={styles.entryIconBox}>
                    <MaterialCommunityIcons
                      name="text-box-outline"
                      size={20}
                      color={TEAL}
                    />
                  </View>
                  <View style={styles.entryMeta}>
                    <Text style={styles.entryType}>{entryType}</Text>
                    <Text style={styles.entryDate}>Submitted {submittedLabel}</Text>
                  </View>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={GRAY}
                  />
                </TouchableOpacity>

                {/* Expanded Details */}
                {isExpanded && (
                  <View style={styles.expandedSection}>
                    {entry.description && (
                      <View style={styles.detailBlock}>
                        <Text style={styles.detailBlockLabel}>Description</Text>
                        <Text style={styles.detailBlockText}>{entry.description}</Text>
                      </View>
                    )}
                    {entry.tasks_done && (
                      <View style={styles.detailBlock}>
                        <Text style={styles.detailBlockLabel}>Tasks Done</Text>
                        <Text style={styles.detailBlockText}>{entry.tasks_done}</Text>
                      </View>
                    )}
                    {entry.challenges && (
                      <View style={styles.detailBlock}>
                        <Text style={styles.detailBlockLabel}>Challenges</Text>
                        <Text style={styles.detailBlockText}>{entry.challenges}</Text>
                      </View>
                    )}
                    {entry.document_url && (
                      <View style={styles.docAttached}>
                        <Ionicons name="attach-outline" size={14} color={TEAL} />
                        <Text style={styles.docAttachedText}>Document attached</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Action Buttons */}
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.reviewBtn}
                    onPress={() => handleReview(entry)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="checkmark-circle-outline" size={18} color={WHITE} />
                    <Text style={styles.reviewBtnText}>Review</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.rejectBtn}
                    onPress={() => handleReject(entry)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="close-circle-outline" size={18} color={RED} />
                    <Text style={styles.rejectBtnText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── BOTTOM TAB BAR ── */}
      <View style={styles.tabBar}>
        {[
          { label: 'Home',     icon: 'home-outline',        screen: 'SupervisorDashboard' },
          { label: 'Students', icon: 'people-outline',      screen: 'MyStudents' },
          { label: 'Reviews',  icon: 'document-text-outline', active: true },
          { label: 'Reports',  icon: 'bar-chart-outline',   screen: 'Reports' },
        ].map((t, i) => (
          <TouchableOpacity
            key={i}
            style={styles.tabItem}
            onPress={() => t.screen && navigation.navigate(t.screen)}
          >
            <Ionicons name={t.icon} size={22} color={t.active ? TEAL : GRAY} />
            <Text style={[styles.tabLabel, t.active && styles.tabLabelActive]}>{t.label}</Text>
            {t.active && <View style={styles.tabDot} />}
          </TouchableOpacity>
        ))}
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: LIGHT },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: LIGHT },
  loadingText: { marginTop: 10, color: GRAY, fontSize: 14 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: '5%',
    paddingVertical: 12,
    backgroundColor: LIGHT,
  },
  menuBtn: { padding: 4 },
  headerBrand: { fontSize: 22, fontWeight: '800', color: TEAL },
  avatarSmall: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: TEAL,
    justifyContent: 'center', alignItems: 'center',
  },

  // Page Title
  pageTitleSection: {
    paddingHorizontal: '5%',
    paddingBottom: 16,
    backgroundColor: LIGHT,
  },
  pageTitle: { fontSize: 26, fontWeight: '800', color: DARK, marginBottom: 8 },
  countBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#DDE8E5',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  countBadgeText: { fontSize: 11, fontWeight: '700', color: TEAL, letterSpacing: 0.5 },

  // List
  listContent: { paddingHorizontal: '4%' },
  listContentTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  // Card
  card: {
    backgroundColor: WHITE,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    width: '100%',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },

  // Student Row
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarCircle: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#1A3A4A',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { color: WHITE, fontSize: 20, fontWeight: '800' },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 16, fontWeight: '800', color: DARK },
  studentDept: { fontSize: 13, color: GRAY, marginTop: 2 },
  deadlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  deadlineBadgeUrgent: { backgroundColor: '#FEF2F2' },
  deadlineText: { fontSize: 10, fontWeight: '700', color: GRAY, letterSpacing: 0.3 },
  deadlineTextUrgent: { color: RED },

  // Entry Row
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F7F6',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  entryIconBox: {
    width: 40, height: 40,
    borderRadius: 10,
    backgroundColor: '#DDE8E5',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  entryMeta: { flex: 1 },
  entryType: { fontSize: 13, fontWeight: '800', color: TEAL, letterSpacing: 0.3 },
  entryDate: { fontSize: 12, color: GRAY, marginTop: 2 },

  // Expanded
  expandedSection: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    gap: 10,
  },
  detailBlock: { marginBottom: 6 },
  detailBlockLabel: { fontSize: 11, fontWeight: '700', color: TEAL, marginBottom: 4, letterSpacing: 0.4 },
  detailBlockText: { fontSize: 13, color: DARK, lineHeight: 20 },
  docAttached: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E8F5F1',
    borderRadius: 8,
    padding: 8,
  },
  docAttachedText: { fontSize: 13, color: TEAL, fontWeight: '600' },

  // Action Row
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  reviewBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TEAL,
    borderRadius: 30,
    paddingVertical: 13,
    gap: 8,
  },
  reviewBtnText: { color: WHITE, fontWeight: '700', fontSize: 15 },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: RED,
    borderRadius: 30,
    paddingVertical: 13,
    gap: 8,
  },
  rejectBtnText: { color: RED, fontWeight: '700', fontSize: 15 },

  // Empty
  emptyCard: {
    backgroundColor: WHITE,
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    marginTop: 20,
    gap: 10,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: DARK },
  emptyText: { fontSize: 13, color: GRAY, textAlign: 'center' },

  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: WHITE,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingVertical: 10,
    paddingHorizontal: '2%',
  },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  tabLabel: { fontSize: 11, color: GRAY, marginTop: 3, fontWeight: '500' },
  tabLabelActive: { color: TEAL, fontWeight: '700' },
  tabDot: {
    width: 5, height: 5, borderRadius: 3,
    backgroundColor: TEAL, marginTop: 3,
  },
});
