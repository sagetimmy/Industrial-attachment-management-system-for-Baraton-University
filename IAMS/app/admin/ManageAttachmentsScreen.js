import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, RefreshControl,
  TextInput, Modal, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import api from '../../api/axios';
import Spinner from '../../components/Spinner';

const STATUS_COLORS = {
  pending:   { bg: '#FFF3E0', text: '#E65100' },
  approved:  { bg: '#E8F5E9', text: '#2E7D32' },
  ongoing:   { bg: '#E3F2FD', text: '#1565C0' },
  completed: { bg: '#E8F5E9', text: '#1B5E20' },
  rejected:  { bg: '#FFEBEE', text: '#C62828' },
};

const STATUS_OPTIONS = ['pending', 'approved', 'ongoing', 'completed', 'rejected'];
const FILTERS = ['all', ...STATUS_OPTIONS];

export default function ManageAttachmentsScreen({ navigation }) {
  const [attachments, setAttachments]     = useState([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [activeFilter, setActiveFilter]   = useState('all');
  const [searchQuery, setSearchQuery]     = useState('');
  const [page, setPage]                   = useState(1);
  const [totalPages, setTotalPages]       = useState(1);

  // Detail modal
  const [modalVisible, setModalVisible]   = useState(false);
  const [selected, setSelected]           = useState(null);
  const [details, setDetails]             = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    fetchAttachments();
  }, [page, activeFilter, searchQuery]);

  const fetchAttachments = async () => {
    try {
      setLoading(true);
      const params = { page, limit: 20 };
      if (activeFilter !== 'all') params.status = activeFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      const res = await api.get('/admin/attachments', { params });
      setAttachments(res.data.attachments);
      setTotalPages(res.data.pagination?.pages ?? 1);
    } catch (err) {
      Alert.alert('Error', 'Failed to load attachments');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(1);
    fetchAttachments().finally(() => setRefreshing(false));
  }, [activeFilter, searchQuery]);

  const openDetails = async (att) => {
    setSelected(att);
    setDetails(null);
    setModalVisible(true);
    try {
      setDetailsLoading(true);
      const res = await api.get(`/admin/attachment/${att.attachment_id}`);
      setDetails(res.data);
    } catch {
      Alert.alert('Error', 'Failed to load attachment details');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleStatusChange = async (attachmentId, newStatus) => {
    try {
      await api.put(`/admin/attachment/${attachmentId}/status`, { status: newStatus });
      if (details) {
        setDetails(prev => ({
          ...prev,
          attachment: { ...prev.attachment, status: newStatus },
        }));
      }
      fetchAttachments();
    } catch {
      Alert.alert('Error', 'Failed to update status');
    }
  };

  /* ─── Helpers ─── */
  const initials = (name) =>
    name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() ?? '?';

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : 'TBD';

  const StatusBadge = ({ status, style }) => {
    const c = STATUS_COLORS[status] ?? { bg: '#F4F4F4', text: '#666' };
    return (
      <View style={[{ backgroundColor: c.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }, style]}>
        <Text style={{ color: c.text, fontSize: 11, fontWeight: '700', textTransform: 'capitalize' }}>
          {status}
        </Text>
      </View>
    );
  };

  /* ─── Card ─── */
  const renderCard = ({ item: att }) => (
    <TouchableOpacity style={styles.card} onPress={() => openDetails(att)} activeOpacity={0.85}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(att.student_name)}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{att.student_name}</Text>
          <Text style={styles.cardSub}>{att.reg_number}{att.department ? ` · ${att.department}` : ''}</Text>
          <Text style={styles.cardOrg}>
            <MaterialCommunityIcons name="domain" size={12} color={TEAL} /> {att.org_name}
          </Text>
          {att.supervisor_name ? (
            <Text style={styles.cardSup}>
              <MaterialCommunityIcons name="account-tie" size={12} color="#2E7D32" /> {att.supervisor_name}
            </Text>
          ) : null}
        </View>
        <StatusBadge status={att.status} />
      </View>

      {att.start_date ? (
        <Text style={styles.cardDates}>
          <MaterialCommunityIcons name="calendar-range" size={12} color="#999" />{' '}
          {fmtDate(att.start_date)} — {fmtDate(att.end_date)}
        </Text>
      ) : null}

      <TouchableOpacity style={styles.detailBtn} onPress={() => openDetails(att)}>
        <MaterialCommunityIcons name="file-search-outline" size={14} color={TEAL} />
        <Text style={styles.detailBtnText}>View Full Details</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  /* ─── Detail Modal ─── */
  const renderModal = () => (
    <Modal
      visible={modalVisible}
      animationType="slide"
      onRequestClose={() => setModalVisible(false)}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top']}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalClose}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Attachment Details</Text>
          <View style={{ width: 36 }} />
        </View>

        {detailsLoading ? (
          <View style={styles.center}>
            <Spinner size="large" color={TEAL} />
          </View>
        ) : details ? (
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

            <Section title="Student Information">
              <InfoRow label="Name"       value={details.attachment.student_name} />
              <InfoRow label="Reg Number" value={details.attachment.reg_number} />
              <InfoRow label="Department" value={details.attachment.department} last />
            </Section>

            <Section title="Organisation">
              <InfoRow label="Name"     value={details.attachment.org_name} />
              <InfoRow label="Location" value={details.attachment.location} last />
            </Section>

            <Section title="Status & Dates">
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Current Status</Text>
                <StatusBadge status={details.attachment.status} />
              </View>
              <Text style={styles.changeStatusLabel}>Change status:</Text>
              <View style={styles.statusPills}>
                {STATUS_OPTIONS.map(s => {
                  const active = details.attachment.status === s;
                  return (
                    <TouchableOpacity
                      key={s}
                      style={[styles.statusPill, active && styles.statusPillActive]}
                      onPress={() => handleStatusChange(selected.attachment_id, s)}
                    >
                      <Text style={[styles.statusPillText, active && styles.statusPillTextActive]}>
                        {s}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <InfoRow label="Start Date" value={fmtDate(details.attachment.start_date)} />
              <InfoRow label="End Date"   value={fmtDate(details.attachment.end_date)} last />
            </Section>

            <Section title="Assigned Supervisor">
              <InfoRow label="Name" value={details.attachment.supervisor_name || 'Not assigned'} last />
            </Section>

            <Section title={`Logbook Entries (${details.logbookEntries?.length ?? 0})`}>
              {details.logbookEntries?.length > 0 ? (
                details.logbookEntries.map(entry => (
                  <View key={entry.entry_id} style={styles.logEntry}>
                    <Text style={styles.logWeek}>Week {entry.week_number}</Text>
                    <Text style={styles.logDesc}>{entry.description}</Text>
                    <Text style={styles.logDate}>Submitted {fmtDate(entry.submitted_at)}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.noData}>No logbook entries yet</Text>
              )}
            </Section>

            {details.evaluation && (
              <Section title="Supervisor Evaluation">
                <InfoRow label="Rating"   value={`${details.evaluation.rating} / 5`} />
                <InfoRow label="Comments" value={details.evaluation.comments} last />
              </Section>
            )}

          </ScrollView>
        ) : null}
      </SafeAreaView>
    </Modal>
  );

  /* ─── Main render ─── */
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Manage Attachments</Text>
          {!loading && (
            <Text style={styles.headerSub}>{attachments.length} records · page {page} of {totalPages}</Text>
          )}
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <MaterialCommunityIcons name="magnify" size={18} color="#999" style={{ marginRight: 6 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, reg number, org…"
          placeholderTextColor="#AAA"
          value={searchQuery}
          onChangeText={(t) => { setSearchQuery(t); setPage(1); }}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => { setSearchQuery(''); setPage(1); }}>
            <MaterialCommunityIcons name="close-circle" size={16} color="#AAA" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.chip, activeFilter === f && styles.chipActive]}
            onPress={() => { setActiveFilter(f); setPage(1); }}
          >
            <Text style={[styles.chipText, activeFilter === f && styles.chipTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      {loading && !refreshing ? (
        <View style={styles.center}><Spinner size="large" color={TEAL} /></View>
      ) : (
        <FlatList
          data={attachments}
          keyExtractor={item => item.attachment_id.toString()}
          renderItem={renderCard}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <MaterialCommunityIcons name="clipboard-text-off-outline" size={40} color="#CCC" />
              <Text style={styles.emptyText}>No attachments found</Text>
            </View>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TEAL} />}
        />
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <View style={styles.pagination}>
          <TouchableOpacity
            style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]}
            onPress={() => setPage(p => p - 1)}
            disabled={page === 1}
          >
            <MaterialCommunityIcons name="chevron-left" size={16} color={page === 1 ? '#CCC' : '#fff'} />
            <Text style={[styles.pageBtnText, page === 1 && { color: '#CCC' }]}>Prev</Text>
          </TouchableOpacity>
          <Text style={styles.pageInfo}>Page {page} of {totalPages}</Text>
          <TouchableOpacity
            style={[styles.pageBtn, page === totalPages && styles.pageBtnDisabled]}
            onPress={() => setPage(p => p + 1)}
            disabled={page === totalPages}
          >
            <Text style={[styles.pageBtnText, page === totalPages && { color: '#CCC' }]}>Next</Text>
            <MaterialCommunityIcons name="chevron-right" size={16} color={page === totalPages ? '#CCC' : '#fff'} />
          </TouchableOpacity>
        </View>
      )}

      {renderModal()}
    </SafeAreaView>
  );
}

/* ─── Sub-components ─── */
const Section = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

const InfoRow = ({ label, value, last }) => (
  <View style={[styles.infoRow, last && { borderBottomWidth: 0 }]}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value ?? '—'}</Text>
  </View>
);

/* ─── Tokens ─── */
const NAVY = '#0F2419';
const TEAL = '#1B7A65';
const BG   = '#EEF2F0';

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: BG },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: NAVY,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  backBtn:     { padding: 4 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerSub:   { color: 'rgba(255,255,255,0.55)', fontSize: 12, marginTop: 2 },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 4,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#333', padding: 0 },

  filterScroll:  { flexGrow: 0, marginTop: 10 },
  filterContent: { paddingHorizontal: 16, gap: 8, paddingVertical: 4 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#D0D9D5',
  },
  chipActive:    { backgroundColor: TEAL, borderColor: TEAL },
  chipText:      { fontSize: 13, fontWeight: '600', color: '#555' },
  chipTextActive:{ color: '#fff' },

  listContent: { padding: 16, paddingBottom: 24, gap: 12 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: NAVY,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  avatarText:  { color: '#fff', fontSize: 16, fontWeight: '700' },
  cardInfo:    { flex: 1, marginRight: 8 },
  cardName:    { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  cardSub:     { fontSize: 12, color: '#888', marginTop: 2 },
  cardOrg:     { fontSize: 12, color: TEAL, marginTop: 3 },
  cardSup:     { fontSize: 12, color: '#2E7D32', marginTop: 2 },
  cardDates:   { fontSize: 12, color: '#999', marginBottom: 10 },
  detailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EEF2F0',
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C5D6D0',
  },
  detailBtnText: { color: TEAL, fontSize: 13, fontWeight: '700' },

  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5EBE8',
  },
  pageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: TEAL,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  pageBtnDisabled: { backgroundColor: '#E0E0E0' },
  pageBtnText:     { color: '#fff', fontSize: 13, fontWeight: '600' },
  pageInfo:        { fontSize: 13, color: '#555' },

  emptyCard: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: { fontSize: 14, color: '#AAA' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: NAVY,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  modalClose: { padding: 4 },
  modalTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },

  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: TEAL,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F0',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4F2',
  },
  infoLabel: { fontSize: 13, color: '#777', fontWeight: '500' },
  infoValue: { fontSize: 13, color: '#1A1A1A', flex: 1, textAlign: 'right', marginLeft: 12 },

  changeStatusLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 10,
    marginBottom: 6,
    fontWeight: '500',
  },
  statusPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D0D9D5',
    backgroundColor: '#F5F8F6',
  },
  statusPillActive:     { backgroundColor: TEAL, borderColor: TEAL },
  statusPillText:       { fontSize: 12, color: '#555', fontWeight: '600', textTransform: 'capitalize' },
  statusPillTextActive: { color: '#fff' },

  logEntry: {
    borderLeftWidth: 3,
    borderLeftColor: TEAL,
    paddingLeft: 10,
    paddingVertical: 6,
    marginBottom: 10,
    backgroundColor: '#F5F9F7',
    borderRadius: 4,
  },
  logWeek:  { fontSize: 13, fontWeight: '700', color: TEAL, marginBottom: 3 },
  logDesc:  { fontSize: 12, color: '#555', marginBottom: 4, lineHeight: 17 },
  logDate:  { fontSize: 11, color: '#AAA' },
  noData:   { fontSize: 13, color: '#AAA', textAlign: 'center', paddingVertical: 16 },
});