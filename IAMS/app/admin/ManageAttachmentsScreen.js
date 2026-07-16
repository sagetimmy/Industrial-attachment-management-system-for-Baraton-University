import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, RefreshControl,
  TextInput, Modal, FlatList, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import api from '../../api/axios';
import Spinner from '../../components/Spinner';

const STATUS_COLORS = {
  pending:   { bg: '#FAEEDA', text: '#BA7517' },
  approved:  { bg: '#E1F5EE', text: '#0F6E56' },
  ongoing:   { bg: '#E1F5EE', text: '#0F6E56' },
  completed: { bg: '#E3F2FD', text: '#185FA5' },
  rejected:  { bg: '#FCE8E8', text: '#C62828' },
};

const STATUS_OPTIONS = ['pending', 'approved', 'ongoing', 'completed', 'rejected'];
const FILTERS = ['all', ...STATUS_OPTIONS];

/* ─── Tokens ─── */
const NAVY  = '#0F6E56';
const TEAL  = '#0F6E56';
const BG    = '#F7F9FB';
const ORANGE = '#D85A30';
const GRAY  = '#6B7280';
const BORDER = '#E5E7EB';

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString() : 'TBD';
}

function fmtDateLong(d) {
  if (!d) return 'TBD';
  const date = new Date(d);
  const day = date.getDate();
  const suffix = (day % 10 === 1 && day !== 11) ? 'st'
    : (day % 10 === 2 && day !== 12) ? 'nd'
    : (day % 10 === 3 && day !== 13) ? 'rd' : 'th';
  const month = date.toLocaleString('default', { month: 'short' });
  return `${day}${suffix} ${month} ${date.getFullYear()}`;
}

function initials(name) {
  return name?.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() ?? '?';
}

export default function ManageAttachmentsScreen({ navigation }) {
  const [attachments, setAttachments]     = useState([]);
  const [totalRecords, setTotalRecords]   = useState(0);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [activeFilter, setActiveFilter]   = useState('all');
  const [searchQuery, setSearchQuery]     = useState('');
  const [page, setPage]                   = useState(1);
  const [totalPages, setTotalPages]       = useState(1);

  // Detail screen (shown as a full-screen modal)
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
      setTotalRecords(res.data.pagination?.total ?? res.data.attachments?.length ?? 0);
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
    } catch (err) {
      // Surface the backend's specific message when present (e.g. "This
      // vacancy has no remaining slots and cannot be approved") instead of
      // a generic failure — this is a real business-rule rejection, not
      // just a network/server error, and the admin needs to know why.
      Alert.alert('Error', err.response?.data?.message || 'Failed to update status');
    }
  };

  // TODO: no real "download report" endpoint exists yet — wire this up once
  // the backend can generate/export a PDF or CSV for a single attachment.
  const handleDownloadReport = () => {
    Alert.alert('Coming soon', 'Report download isn\u2019t wired up to the backend yet.');
  };

  /* ─── Status badge ─── */
  const StatusBadge = ({ status, style }) => {
    const c = STATUS_COLORS[status] ?? { bg: '#F4F4F4', text: '#666' };
    return (
      <View style={[styles.statusBadge, { backgroundColor: c.bg }, style]}>
        <Text style={[styles.statusBadgeText, { color: c.text }]}>{status?.toUpperCase()}</Text>
      </View>
    );
  };

  /* ─── Card ─── */
  const renderCard = ({ item: att }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(att.student_name)}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{att.student_name}</Text>
          <Text style={styles.cardReg}>REG: {att.reg_number}</Text>
          {att.department ? <Text style={styles.cardDept}>{att.department.toUpperCase()}</Text> : null}
        </View>
      </View>

      <View style={styles.cardMetaBlock}>
        <View style={styles.cardMetaRow}>
          <MaterialCommunityIcons name="domain" size={14} color={TEAL} />
          <Text style={styles.cardMetaText}>{att.org_name}</Text>
        </View>
        {att.supervisor_name ? (
          <View style={styles.cardMetaRow}>
            <MaterialCommunityIcons name="account-outline" size={14} color={GRAY} />
            <Text style={styles.cardMetaTextMuted}>{att.supervisor_name}</Text>
          </View>
        ) : null}
        {att.start_date ? (
          <View style={styles.cardMetaRow}>
            <MaterialCommunityIcons name="calendar-range" size={14} color={GRAY} />
            <Text style={styles.cardMetaTextMuted}>
              {fmtDate(att.start_date)} — {fmtDate(att.end_date)}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.cardFooter}>
        <StatusBadge status={att.status} />
        <TouchableOpacity style={styles.detailBtn} onPress={() => openDetails(att)}>
          <MaterialCommunityIcons name="magnify" size={14} color={TEAL} />
          <Text style={styles.detailBtnText}>VIEW FULL DETAILS</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  /* ─── Detail screen ─── */
  const renderModal = () => {
    const att = details?.attachment;

    // Derived progress (real, from start/end dates if present)
    let progressPct = null, daysElapsed = null, daysRemaining = null, totalDays = null;
    if (att?.start_date && att?.end_date) {
      const start = new Date(att.start_date);
      const end = new Date(att.end_date);
      const now = new Date();
      totalDays = Math.max(1, Math.round((end - start) / 86400000));
      daysElapsed = Math.min(totalDays, Math.max(0, Math.round((now - start) / 86400000)));
      daysRemaining = Math.max(0, totalDays - daysElapsed);
      progressPct = Math.round((daysElapsed / totalDays) * 100);
    }

    // TODO: logbook entries don't carry an approval status from the backend
    // yet — approved/pending counts below are placeholders until entries
    // expose a `status` field (e.g. 'approved' | 'pending').
    const logbookTotal = details?.logbookEntries?.length ?? 0;
    const logbookApproved = details?.logbookEntries?.filter(e => e.status === 'approved').length
      ?? Math.round(logbookTotal * 0.9);
    const logbookPending = logbookTotal - logbookApproved;

    // TODO: region and assessment-progress fields don't exist on the
    // attachment yet — falling back to org location / a static placeholder.
    const region = att?.location || 'Not specified';
    const assessmentProgress = 'Pending 1/2';

    return (
      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top']}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalClose}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Attachment Details</Text>
            <View style={styles.modalHeaderAvatar}>
              {att?.supervisor_photo_url ? (
                <Image source={{ uri: att.supervisor_photo_url }} style={styles.modalHeaderAvatarImg} />
              ) : (
                <View style={[styles.modalHeaderAvatarImg, styles.modalHeaderAvatarFallback]}>
                  <Text style={styles.modalHeaderAvatarText}>{initials(att?.supervisor_name)}</Text>
                </View>
              )}
            </View>
          </View>

          {detailsLoading ? (
            <View style={styles.center}>
              <Spinner size="large" color={TEAL} />
            </View>
          ) : att ? (
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

              {/* ── Profile ── */}
              <View style={styles.profileWrap}>
                <View style={styles.profileAvatarWrap}>
                  {att.student_photo_url ? (
                    <Image source={{ uri: att.student_photo_url }} style={styles.profileAvatar} />
                  ) : (
                    <View style={[styles.profileAvatar, styles.profileAvatarFallback]}>
                      <Text style={styles.profileAvatarText}>{initials(att.student_name)}</Text>
                    </View>
                  )}
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  </View>
                </View>
                <Text style={styles.profileName}>{att.student_name}</Text>
                <Text style={styles.profileReg}>Reg: {att.reg_number}</Text>
                {/* TODO: course/programme field doesn't exist on the backend
                    yet — falling back to department, uppercased to match the
                    template's "BACHELOR OF COMPUTER SCIENCE" style. */}
                <Text style={styles.profileProgram}>
                  {(att.programme || att.department || '—').toUpperCase()}
                </Text>
              </View>

              {/* ── Org card ── */}
              <View style={styles.orgCard}>
                <View style={styles.orgCardTop}>
                  <View style={styles.orgIconBox}>
                    <MaterialCommunityIcons name="briefcase-outline" size={20} color={TEAL} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.orgName}>{att.org_name}</Text>
                    {/* TODO: role/position title not exposed by backend yet */}
                    <Text style={styles.orgRole}>{att.position_title || 'Intern'}</Text>
                  </View>
                  <StatusBadge status={att.status} />
                </View>
                <View style={styles.orgDivider} />
                <View style={styles.orgStartRow}>
                  <Ionicons name="calendar-outline" size={14} color={GRAY} />
                  <Text style={styles.orgStartText}>Started on: {fmtDateLong(att.start_date)}</Text>
                </View>
              </View>

              {/* ── Progress ── */}
              {progressPct !== null && (
                <View style={styles.progressBlock}>
                  <View style={styles.progressHeaderRow}>
                    <Text style={styles.progressLabel}>CURRENT PROGRESS</Text>
                    <Text style={styles.progressPct}>{progressPct}%</Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
                  </View>
                  <View style={styles.progressFooterRow}>
                    <Text style={styles.progressFooterText}>{daysElapsed} of {totalDays} days elapsed</Text>
                    <Text style={styles.progressFooterText}>{daysRemaining} days remaining</Text>
                  </View>
                </View>
              )}

              {/* ── Supervisor card ── */}
              <View style={styles.supervisorCard}>
                {att.supervisor_photo_url ? (
                  <Image source={{ uri: att.supervisor_photo_url }} style={styles.supervisorAvatar} />
                ) : (
                  <View style={[styles.supervisorAvatar, styles.supervisorAvatarFallback]}>
                    <Text style={styles.supervisorAvatarText}>{initials(att.supervisor_name)}</Text>
                  </View>
                )}
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.supervisorName}>{att.supervisor_name || 'Not assigned'}</Text>
                  {/* TODO: supervisor title/dept on attachment record not exposed yet */}
                  <Text style={styles.supervisorRole}>
                    {att.supervisor_title || 'Faculty Supervisor'}
                    {att.department ? ` - ${att.department}` : ''}
                  </Text>
                </View>
                <TouchableOpacity style={styles.messageBtn} accessibilityLabel="Message supervisor">
                  <Ionicons name="chatbubble-outline" size={16} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* ── Logbook summary ── */}
              <Text style={styles.sectionTitle}>LOGBOOK SUMMARY</Text>
              <View style={styles.statRow}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{logbookTotal}</Text>
                  <Text style={styles.statLabel}>TOTAL</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={[styles.statValue, { color: TEAL }]}>{logbookApproved}</Text>
                  <Text style={styles.statLabel}>APPROVED</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={[styles.statValue, { color: ORANGE }]}>{logbookPending}</Text>
                  <Text style={styles.statLabel}>PENDING</Text>
                </View>
              </View>

              {/* ── Region / Assessment ── */}
              <View style={styles.miniRow}>
                <View style={styles.miniCard}>
                  <Ionicons name="location-outline" size={16} color={TEAL} />
                  <View style={{ marginLeft: 8 }}>
                    <Text style={styles.miniLabel}>REGION</Text>
                    <Text style={styles.miniValue}>{region}</Text>
                  </View>
                </View>
                <View style={styles.miniCard}>
                  <MaterialCommunityIcons name="checkbox-marked-outline" size={16} color={TEAL} />
                  <View style={{ marginLeft: 8 }}>
                    <Text style={styles.miniLabel}>ASSESSMENT</Text>
                    <Text style={styles.miniValue}>{assessmentProgress}</Text>
                  </View>
                </View>
              </View>

              {/* ── Status change (kept from admin workflow, template doesn't
                   show this but it's needed for the existing status-update
                   feature) ── */}
              <Text style={styles.changeStatusLabel}>Change status:</Text>
              <View style={styles.statusPills}>
                {STATUS_OPTIONS.map(s => {
                  const active = att.status === s;
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

              {/* ── Download report ── */}
              <TouchableOpacity style={styles.downloadBtn} onPress={handleDownloadReport}>
                <MaterialCommunityIcons name="tray-arrow-down" size={18} color="#fff" />
                <Text style={styles.downloadBtnText}>Download Report</Text>
              </TouchableOpacity>

            </ScrollView>
          ) : null}
        </SafeAreaView>
      </Modal>
    );
  };

  /* ─── Main render ─── */
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Manage Attachments</Text>
          {!loading && (
            <Text style={styles.headerSub}>
              {totalRecords.toLocaleString()} records · page {page} of {totalPages}
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.bellBtn}
          onPress={() => navigation.navigate('AdminAnnouncements')}
          accessibilityLabel="Notifications"
        >
          <Ionicons name="notifications-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <MaterialCommunityIcons name="magnify" size={18} color="#999" style={{ marginRight: 6 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, reg number, org…"
          placeholderTextColor="#AAA"
          value={searchQuery}
          onChangeText={(t) => setSearchQuery(t)}
          returnKeyType="search"
          onSubmitEditing={() => setPage(1)}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => { setSearchQuery(''); setPage(1); }} style={{ marginRight: 8 }}>
            <MaterialCommunityIcons name="close-circle" size={16} color="#AAA" />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.searchBtn} onPress={() => setPage(1)}>
          <Text style={styles.searchBtnText}>SEARCH</Text>
        </TouchableOpacity>
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
          <Text style={styles.pageInfo}>Page {page} of {totalPages}</Text>
          <View style={styles.pageBtnRow}>
            <TouchableOpacity
              style={[styles.pageBtnOutline, page === 1 && styles.pageBtnDisabled]}
              onPress={() => setPage(p => p - 1)}
              disabled={page === 1}
            >
              <Ionicons name="chevron-back" size={16} color={page === 1 ? '#CCC' : TEAL} />
              <Text style={[styles.pageBtnOutlineText, page === 1 && { color: '#CCC' }]}>Prev</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pageBtnSolid, page === totalPages && styles.pageBtnDisabled]}
              onPress={() => setPage(p => p + 1)}
              disabled={page === totalPages}
            >
              <Text style={[styles.pageBtnSolidText, page === totalPages && { color: '#888' }]}>Next</Text>
              <Ionicons name="chevron-forward" size={16} color={page === totalPages ? '#888' : '#fff'} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {renderModal()}
    </SafeAreaView>
  );
}

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
  bellBtn:     { padding: 4 },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 4,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#333', padding: 0 },
  searchBtn: {
    backgroundColor: TEAL,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
  },
  searchBtnText: { color: '#fff', fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },

  filterScroll:  { flexGrow: 0, marginTop: 10 },
  filterContent: { paddingHorizontal: 16, gap: 8, paddingVertical: 4 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#D0D9D5',
  },
  chipActive:    { backgroundColor: NAVY, borderColor: NAVY },
  chipText:      { fontSize: 13, fontWeight: '600', color: '#555' },
  chipTextActive:{ color: '#fff' },

  listContent: { padding: 16, paddingBottom: 24, gap: 12 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: NAVY,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  avatarText:  { color: '#fff', fontSize: 16, fontWeight: '700' },
  cardInfo:    { flex: 1 },
  cardName:    { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  cardReg:     { fontSize: 12, color: '#888', marginTop: 2 },
  cardDept:    { fontSize: 11, color: '#888', fontWeight: '700', letterSpacing: 0.3, marginTop: 1 },

  cardMetaBlock: { gap: 6, marginBottom: 12 },
  cardMetaRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardMetaText: { fontSize: 13, color: NAVY, fontWeight: '600' },
  cardMetaTextMuted: { fontSize: 13, color: GRAY },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  statusBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
  detailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C5D6D0',
  },
  detailBtnText: { color: TEAL, fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },

  pagination: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#E5EBE8',
  },
  pageInfo: { fontSize: 13, color: '#555', textAlign: 'center', marginBottom: 10 },
  pageBtnRow: { flexDirection: 'row', gap: 12 },
  pageBtnOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderColor: TEAL,
    paddingVertical: 10,
    borderRadius: 10,
  },
  pageBtnOutlineText: { color: TEAL, fontSize: 13, fontWeight: '700' },
  pageBtnSolid: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: TEAL,
    paddingVertical: 10,
    borderRadius: 10,
  },
  pageBtnSolidText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  pageBtnDisabled: { opacity: 0.5 },

  emptyCard: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: { fontSize: 14, color: '#AAA' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  /* ── Detail screen ── */
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: NAVY,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  modalClose: { padding: 4 },
  modalTitle: { flex: 1, color: '#fff', fontSize: 17, fontWeight: '700', marginLeft: 8 },
  modalHeaderAvatar: { width: 34, height: 34, borderRadius: 17, overflow: 'hidden' },
  modalHeaderAvatarImg: { width: 34, height: 34, borderRadius: 17 },
  modalHeaderAvatarFallback: { backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center' },
  modalHeaderAvatarText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  profileWrap: { alignItems: 'center', marginBottom: 18 },
  profileAvatarWrap: { marginBottom: 10 },
  profileAvatar: {
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 3, borderColor: TEAL,
  },
  profileAvatarFallback: { backgroundColor: '#E1F5EE', alignItems: 'center', justifyContent: 'center' },
  profileAvatarText: { fontSize: 30, fontWeight: '800', color: TEAL },
  verifiedBadge: {
    position: 'absolute', bottom: 2, right: 2,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: TEAL,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  profileName: { fontSize: 19, fontWeight: '700', color: NAVY, marginTop: 4 },
  profileReg:  { fontSize: 13, color: GRAY, marginTop: 2 },
  profileProgram: { fontSize: 13, fontWeight: '700', color: TEAL, textAlign: 'center', marginTop: 4 },

  orgCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
  },
  orgCardTop: { flexDirection: 'row', alignItems: 'center' },
  orgIconBox: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: '#E1F5EE',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  orgName: { fontSize: 14, fontWeight: '700', color: NAVY },
  orgRole: { fontSize: 12, color: GRAY, marginTop: 2 },
  orgDivider: { height: 1, backgroundColor: BORDER, marginVertical: 12 },
  orgStartRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  orgStartText: { fontSize: 12, color: GRAY },

  progressBlock: { marginBottom: 18 },
  progressHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { fontSize: 12, fontWeight: '700', color: NAVY, letterSpacing: 0.4 },
  progressPct: { fontSize: 13, fontWeight: '800', color: TEAL },
  progressTrack: { height: 8, backgroundColor: BORDER, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: TEAL, borderRadius: 4 },
  progressFooterRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  progressFooterText: { fontSize: 11, color: GRAY },

  supervisorCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  supervisorAvatar: { width: 44, height: 44, borderRadius: 22 },
  supervisorAvatarFallback: { backgroundColor: '#E1F5EE', alignItems: 'center', justifyContent: 'center' },
  supervisorAvatarText: { fontSize: 14, fontWeight: '800', color: TEAL },
  supervisorName: { fontSize: 14, fontWeight: '700', color: NAVY },
  supervisorRole: { fontSize: 12, color: GRAY, fontStyle: 'italic', marginTop: 2 },
  messageBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: TEAL,
    alignItems: 'center', justifyContent: 'center',
  },

  sectionTitle: { fontSize: 12, fontWeight: '800', color: GRAY, letterSpacing: 0.6, marginBottom: 10 },

  statRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
  },
  statValue: { fontSize: 20, fontWeight: '800', color: NAVY },
  statLabel: { fontSize: 10, fontWeight: '700', color: GRAY, letterSpacing: 0.4, marginTop: 4 },

  miniRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  miniCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14,
    padding: 12, flexDirection: 'row', alignItems: 'center',
  },
  miniLabel: { fontSize: 10, fontWeight: '700', color: GRAY, letterSpacing: 0.3 },
  miniValue: { fontSize: 12, fontWeight: '700', color: NAVY, marginTop: 2 },

  changeStatusLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
    fontWeight: '500',
  },
  statusPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
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

  downloadBtn: {
    backgroundColor: TEAL,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  downloadBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});