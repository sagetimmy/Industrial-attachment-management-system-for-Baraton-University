import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Switch, Alert, TextInput,
  FlatList, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { getApiBaseUrl } from '../../api/axios';
import { PrivacyPolicyContent } from '../shared/PrivacyPolicyScreen';
import Spinner from '../../components/Spinner';

const NAVY     = '#0D1B2E';
const TEAL     = '#2EC4A0';
const WHITE    = '#FFFFFF';
const GRAY     = '#8899AA';
const LIGHT_BG = '#F7F8FA';
const DARK     = '#111827';
const BORDER   = '#E5E7EB';
const RED      = '#FF5252';

const API_BASE = getApiBaseUrl();

// ─── Role permission helpers (unchanged) ─────────────────────────────────────
const ROLE_PERMISSION_KEYS = {
  student:    ['editLogbooks', 'exportReports', 'selfPlacement'],
  supervisor: ['approvePlacements', 'editLogbooks', 'exportData'],
  host_org:   ['postPlacements', 'viewAnalytics', 'editOrgProfile'],
};

const DEFAULT_ROLE_PERMISSIONS = {
  student:    { editLogbooks: true,  exportReports: true,      selfPlacement: true },
  supervisor: { approvePlacements: true, editLogbooks: true,   exportData: true },
  host_org:   { postPlacements: true, viewAnalytics: true,     editOrgProfile: true },
};

const pickRolePermissions = (role, source = {}) => {
  const keys = ROLE_PERMISSION_KEYS[role] || [];
  return keys.reduce((acc, key) => {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      acc[key] = Boolean(source[key]);
    }
    return acc;
  }, {});
};

const normalizeRolePermissions = (incoming = {}) => ({
  student: {
    ...DEFAULT_ROLE_PERMISSIONS.student,
    ...pickRolePermissions('student', incoming.student),
  },
  supervisor: {
    ...DEFAULT_ROLE_PERMISSIONS.supervisor,
    ...pickRolePermissions('supervisor', incoming.supervisor),
  },
  host_org: {
    ...DEFAULT_ROLE_PERMISSIONS.host_org,
    ...pickRolePermissions('host_org', incoming.host_org || incoming.hostOrg),
  },
});

// ─── Shared SubHeader ────────────────────────────────────────────────────────
function SubHeader({ title, onBack }) {
  return (
    <View style={styles.subHeader}>
      <View style={{ width: 40 }} />
      <Text style={styles.headerTitle}>{title}</Text>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Ionicons name="close" size={22} color={WHITE} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Sub-screen: Audit Logs (unchanged) ──────────────────────────────────────
function AuditLogs({ onBack, token }) {
  const [logs, setLogs]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch]         = useState('');
  const [filter, setFilter]         = useState('ALL');
  const [expanded, setExpanded]     = useState(null);

  const ACTION_FILTERS = [
    'ALL', 'APPROVE_ORG', 'REJECT_ORG', 'ASSIGN_SUPERVISOR',
    'UPDATE_ATTACHMENT_STATUS', 'ACTIVATE_USER', 'DEACTIVATE_USER', 'DELETE_USER',
    'UPDATE_ROLE_PERMISSIONS', 'VIEW_DASHBOARD', 'VIEW_SUMMARY_REPORT', 'VIEW_DETAILED_REPORT',
  ];

  const fetchLogs = useCallback(async (pageNum = 1, replace = true, query = {}) => {
    if (!token) {
      setLogs([]); setTotalPages(1); setPage(1);
      setLoading(false); setRefreshing(false);
      Alert.alert('Error', 'Missing authentication token.');
      return;
    }
    try {
      const nextFilter = query.filter ?? filter;
      const nextSearch = query.search ?? search;
      const params = new URLSearchParams({ page: pageNum, limit: 20 });
      if (nextFilter !== 'ALL') params.append('action', nextFilter);
      if (nextSearch.trim()) params.append('actor_email', nextSearch.trim());

      const res  = await fetch(`${API_BASE}/admin/audit-logs?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Could not load audit logs.');

      setLogs(prev => replace ? (json.logs || []) : [...prev, ...(json.logs || [])]);
      setTotalPages(json.pagination?.pages || 1);
      setPage(pageNum);
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not load audit logs.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter, search, token]);

  useEffect(() => { setLoading(true); fetchLogs(1, true); }, [filter, token]);

  const handleSearch      = () => { setLoading(true); fetchLogs(1, true, { search }); };
  const handleClearSearch = () => { setSearch(''); setLoading(true); fetchLogs(1, true, { search: '' }); };
  const handleRefresh     = () => { setRefreshing(true); fetchLogs(1, true); };
  const loadMore          = () => { if (page < totalPages) fetchLogs(page + 1, false); };

  const actionColor = (action = '') => {
    if (['DELETE_USER', 'REJECT_ORG', 'DEACTIVATE_USER'].includes(action)) return RED;
    if (['APPROVE_ORG', 'ACTIVATE_USER', 'ASSIGN_SUPERVISOR'].includes(action)) return TEAL;
    if (action.startsWith('VIEW_')) return '#6366F1';
    return '#EA580C';
  };

  const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-KE', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const renderLog = ({ item }) => {
    const isOpen = expanded === item.id;
    const color  = actionColor(item.action);
    return (
      <TouchableOpacity
        style={styles.logCard}
        onPress={() => setExpanded(isOpen ? null : item.id)}
        activeOpacity={0.8}
      >
        <View style={styles.logTop}>
          <View style={[styles.actionBadge, { backgroundColor: `${color}18` }]}>
            <Text style={[styles.actionBadgeText, { color }]}>{item.action}</Text>
          </View>
          <Text style={styles.logTime}>{formatDate(item.created_at)}</Text>
        </View>
        <Text style={styles.logDesc} numberOfLines={isOpen ? undefined : 2}>{item.description}</Text>
        <View style={styles.logMeta}>
          <Ionicons name="person-outline" size={12} color={GRAY} />
          <Text style={styles.logMetaText}>{item.actor_email || 'System'}  ·  {item.actor_role || '—'}</Text>
          {item.ip_address ? (
            <>
              <Ionicons name="globe-outline" size={12} color={GRAY} style={{ marginLeft: 8 }} />
              <Text style={styles.logMetaText}>{item.ip_address}</Text>
            </>
          ) : null}
        </View>
        {isOpen && (
          <View style={styles.logExpanded}>
            <View style={styles.divider} />
            {item.entity ? (
              <Text style={styles.logDetail}>
                <Text style={styles.logDetailKey}>Entity: </Text>
                {item.entity}{item.entity_id ? ` #${item.entity_id}` : ''}
              </Text>
            ) : null}
            {item.metadata && Object.keys(item.metadata).length > 0 ? (
              <Text style={styles.logDetail}>
                <Text style={styles.logDetailKey}>Metadata: </Text>
                {JSON.stringify(item.metadata)}
              </Text>
            ) : null}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SubHeader title="Audit Logs" onBack={onBack} />
      <View style={styles.auditSearchRow}>
        <View style={styles.auditSearchBox}>
          <Ionicons name="search-outline" size={16} color={GRAY} />
          <TextInput
            style={styles.auditSearchInput}
            placeholder="Search by email…"
            placeholderTextColor={GRAY}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={handleClearSearch}>
              <Ionicons name="close-circle" size={16} color={GRAY} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.auditSearchBtn} onPress={handleSearch}>
          <Text style={styles.auditSearchBtnText}>Search</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
      >
        {ACTION_FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
              {f === 'ALL' ? 'All Actions' : f.replace(/_/g, ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {loading ? (
        <View style={styles.loaderBox}>
          <Spinner size="large" color={TEAL} />
          <Text style={styles.loaderText}>Loading audit logs…</Text>
        </View>
      ) : logs.length === 0 ? (
        <View style={styles.emptyBox}>
          <MaterialCommunityIcons name="text-box-search-outline" size={48} color={BORDER} />
          <Text style={styles.emptyText}>No audit logs found</Text>
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item, i) => item.id?.toString() || String(i)}
          renderItem={renderLog}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            page < totalPages
              ? <Spinner color={TEAL} style={{ marginVertical: 16 }} />
              : <Text style={styles.endText}>— End of logs —</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

// ─── Sub-screen: Privacy Policy (unchanged) ──────────────────────────────────
function PrivacyPolicy({ onBack }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SubHeader title="Privacy Policy" onBack={onBack} />
      <PrivacyPolicyContent />
    </SafeAreaView>
  );
}

// ─── Sub-screen: Role Permissions ────────────────────────────────────────────
// CHANGE: receives `navigation` prop so the Manage Admins button can navigate
function RolePermissions({ onBack, token, navigation }) {
  const [perms, setPerms]   = useState(() => normalizeRolePermissions());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  const toggle = (role, key) => {
    if (loading || saving) return;
    setPerms(prev => ({ ...prev, [role]: { ...prev[role], [key]: !prev[role][key] } }));
  };

  const loadPermissions = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    setLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/admin/role-permissions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to load role permissions.');
      setPerms(normalizeRolePermissions(json.permissions || json));
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not load role permissions.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadPermissions(); }, [loadPermissions]);

  const persistPermissions = async (nextPerms, successMessage) => {
    if (!token) { Alert.alert('Error', 'Missing authentication token.'); return; }
    setSaving(true);
    try {
      const res  = await fetch(`${API_BASE}/admin/role-permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ permissions: nextPerms }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to update role permissions.');
      setPerms(normalizeRolePermissions(json.permissions || nextPerms));
      Alert.alert('Saved', successMessage);
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not update role permissions.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    Alert.alert('Reset Permissions', 'Reset all roles to system defaults?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset', style: 'destructive',
        onPress: () => persistPermissions(DEFAULT_ROLE_PERMISSIONS, 'Role permissions reset to defaults.'),
      },
    ]);
  };

  const PermToggle = ({ label, value, onToggle }) => (
    <View style={styles.permRow}>
      <Text style={styles.permLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        disabled={loading || saving}
        trackColor={{ false: BORDER, true: TEAL }}
        thumbColor={WHITE}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SubHeader title="Role Permissions" onBack={onBack} />
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageSubtitle}>
          Manage access levels and functional controls for all system users.
        </Text>
        {loading && <Spinner style={{ marginBottom: 12 }} color={TEAL} />}

        {/* Super Admin card */}
        <View style={styles.card}>
          <View style={styles.roleHeader}>
            <View style={styles.superBadge}>
              <Text style={styles.superBadgeText}>SUPER ADMIN</Text>
            </View>
            <Text style={styles.roleTitle}>System Administrator</Text>
          </View>
          <Text style={styles.roleDesc}>
            Full access to all modules, system configurations, audit logs, and security settings. This role cannot be restricted.
          </Text>

          {/* ── CHANGE: wired to navigation.navigate('ManageAdmins') ── */}
          <TouchableOpacity
            style={styles.manageBtn}
            onPress={() => navigation.navigate('ManageAdmins')}
          >
            <Text style={styles.manageBtnText}>Manage Admins</Text>
          </TouchableOpacity>

          <View style={styles.divider} />
          <View style={styles.permCheckGrid}>
            {['Global Access', 'User Deletion', 'System Billing', 'API Management'].map(p => (
              <View key={p} style={styles.permCheckItem}>
                <Ionicons name="checkmark-circle" size={18} color={TEAL} />
                <Text style={styles.permCheckText}>{p}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Student */}
        <View style={styles.card}>
          <View style={styles.roleHeader}>
            <View style={[styles.roleIconBox, { backgroundColor: '#EEF2FF' }]}>
              <MaterialCommunityIcons name="school-outline" size={22} color="#4F46E5" />
            </View>
            <Text style={styles.roleTitle}>Student</Text>
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultBadgeText}>DEFAULT</Text>
            </View>
          </View>
          <PermToggle label="Edit Logbooks"  value={perms.student.editLogbooks}  onToggle={() => toggle('student', 'editLogbooks')} />
          <View style={styles.divider} />
          <PermToggle label="Export Reports" value={perms.student.exportReports} onToggle={() => toggle('student', 'exportReports')} />
          <View style={styles.divider} />
          <PermToggle label="Self-Placement" value={perms.student.selfPlacement} onToggle={() => toggle('student', 'selfPlacement')} />
        </View>

        {/* Supervisor */}
        <View style={styles.card}>
          <View style={styles.roleHeader}>
            <View style={[styles.roleIconBox, { backgroundColor: '#F5F3FF' }]}>
              <MaterialCommunityIcons name="shield-account-outline" size={22} color="#7C3AED" />
            </View>
            <Text style={styles.roleTitle}>Supervisor</Text>
          </View>
          <PermToggle label="Approve Placements" value={perms.supervisor.approvePlacements} onToggle={() => toggle('supervisor', 'approvePlacements')} />
          <View style={styles.divider} />
          <PermToggle label="Can Edit Logbooks"  value={perms.supervisor.editLogbooks}      onToggle={() => toggle('supervisor', 'editLogbooks')} />
          <View style={styles.divider} />
          <PermToggle label="Export Data"        value={perms.supervisor.exportData}        onToggle={() => toggle('supervisor', 'exportData')} />
        </View>

        {/* Host Org */}
        <View style={styles.card}>
          <View style={styles.roleHeader}>
            <View style={[styles.roleIconBox, { backgroundColor: '#FFF7ED' }]}>
              <MaterialCommunityIcons name="office-building-outline" size={22} color="#EA580C" />
            </View>
            <Text style={styles.roleTitle}>Host Org</Text>
          </View>
          <PermToggle label="Post Placements"  value={perms.host_org.postPlacements}  onToggle={() => toggle('host_org', 'postPlacements')} />
          <View style={styles.divider} />
          <PermToggle label="View Analytics"   value={perms.host_org.viewAnalytics}   onToggle={() => toggle('host_org', 'viewAnalytics')} />
          <View style={styles.divider} />
          <PermToggle label="Edit Org Profile" value={perms.host_org.editOrgProfile}  onToggle={() => toggle('host_org', 'editOrgProfile')} />
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, (saving || loading) && { opacity: 0.7 }]}
          onPress={() => persistPermissions(perms, 'Role permissions updated successfully.')}
          disabled={saving || loading}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save All Permissions'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ alignItems: 'center', marginBottom: 40, opacity: (saving || loading) ? 0.7 : 1 }}
          onPress={handleReset}
          disabled={saving || loading}
        >
          <Text style={styles.resetText}>Reset all roles to system defaults</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Session Form Modal ───────────────────────────────────────────────────────
const EMPTY_FORM = { name: '', start_date: '', end_date: '', status: 'UPCOMING' };
const STATUS_OPTIONS = ['UPCOMING', 'ACTIVE', 'DRAFT', 'CLOSED'];

function SessionFormModal({ visible, session, token, onClose, onSaved }) {
  const isEdit = !!session?.id;
  const [form, setForm]     = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setForm(
        session
          ? {
              name:       session.name       || '',
              start_date: session.start_date || '',
              end_date:   session.end_date   || '',
              status:     session.status     || 'UPCOMING',
            }
          : EMPTY_FORM
      );
    }
  }, [visible, session]);

  const handleSave = async () => {
    if (!form.name.trim())       { Alert.alert('Validation', 'Session name is required.'); return; }
    if (!form.start_date.trim()) { Alert.alert('Validation', 'Start date is required (YYYY-MM-DD).'); return; }
    if (!form.end_date.trim())   { Alert.alert('Validation', 'End date is required (YYYY-MM-DD).'); return; }

    setSaving(true);
    try {
      const url    = isEdit
        ? `${API_BASE}/admin/attachment-sessions/${session.id}`
        : `${API_BASE}/admin/attachment-sessions`;
      const method = isEdit ? 'PUT' : 'POST';

      const res  = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to save session.');
      onSaved();
      onClose();
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not save session.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalSheet}>
          {/* Modal header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{isEdit ? 'Edit Session' : 'New Session'}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={DARK} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.inputLabel}>SESSION NAME</Text>
            <TextInput
              style={styles.textInput}
              value={form.name}
              onChangeText={v => setForm(p => ({ ...p, name: v }))}
              placeholder="e.g. Semester 1 2025/26"
              placeholderTextColor={GRAY}
            />

            <Text style={styles.inputLabel}>START DATE (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.textInput}
              value={form.start_date}
              onChangeText={v => setForm(p => ({ ...p, start_date: v }))}
              placeholder="2025-09-01"
              placeholderTextColor={GRAY}
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>END DATE (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.textInput}
              value={form.end_date}
              onChangeText={v => setForm(p => ({ ...p, end_date: v }))}
              placeholder="2025-12-20"
              placeholderTextColor={GRAY}
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>STATUS</Text>
            <View style={styles.statusPicker}>
              {STATUS_OPTIONS.map(s => (
                <TouchableOpacity
                  key={s}
                  style={[styles.statusOption, form.status === s && styles.statusOptionActive]}
                  onPress={() => setForm(p => ({ ...p, status: s }))}
                >
                  <Text style={[styles.statusOptionText, form.status === s && styles.statusOptionTextActive]}>
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.saveBtnText}>{saving ? 'Saving…' : isEdit ? 'Update Session' : 'Create Session'}</Text>
            </TouchableOpacity>
            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Sub-screen: Attachment Sessions (REWRITTEN — live API) ──────────────────
function AttachmentSessions({ onBack, token }) {
  const [sessions, setSessions]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats]           = useState({ active: null, pending: 0, upcoming: 0 });
  const [modalVisible, setModal]    = useState(false);
  const [editTarget, setEditTarget] = useState(null); // null = new, object = edit

  // ── Fetch all sessions + derive stats ──
  const fetchSessions = useCallback(async (isRefresh = false) => {
    if (!token) { setLoading(false); return; }
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/admin/attachment-sessions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to load sessions.');

      const list = json.sessions ?? json.data ?? json ?? [];
      setSessions(list);

      // Derive stats from list
      const active   = list.find(s => s.status === 'ACTIVE') || null;
      const pending  = list.filter(s => ['UPCOMING', 'DRAFT'].includes(s.status)).length;
      const upcoming = list.filter(s => s.status === 'UPCOMING').length;
      setStats({ active, pending, upcoming });
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not load sessions.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  // ── Delete a session ──
  const handleDelete = (session) => {
    Alert.alert(
      'Delete Session',
      `Delete "${session.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(`${API_BASE}/admin/attachment-sessions/${session.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
              });
              if (!res.ok) {
                const json = await res.json();
                throw new Error(json.message || 'Failed to delete session.');
              }
              fetchSessions(true);
            } catch (err) {
              Alert.alert('Error', err.message || 'Could not delete session.');
            }
          },
        },
      ]
    );
  };

  // ── Status colours ──
  const statusColor = (s) => {
    switch (s) {
      case 'ACTIVE':   return { bg: '#ECFDF5', color: TEAL };
      case 'UPCOMING': return { bg: '#EFF6FF', color: '#3B82F6' };
      case 'DRAFT':    return { bg: '#FFF7ED', color: '#EA580C' };
      case 'CLOSED':   return { bg: '#F3F4F6', color: GRAY };
      default:         return { bg: '#F3F4F6', color: GRAY };
    }
  };

  // ── Format date range ──
  const fmtDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const openAdd  = () => { setEditTarget(null); setModal(true); };
  const openEdit = (s)  => { setEditTarget(s);   setModal(true); };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SubHeader title="Attachment Sessions" onBack={onBack} />

      <SessionFormModal
        visible={modalVisible}
        session={editTarget}
        token={token}
        onClose={() => setModal(false)}
        onSaved={() => fetchSessions(true)}
      />

      {loading ? (
        <View style={styles.loaderBox}>
          <Spinner size="large" color={TEAL} />
          <Text style={styles.loaderText}>Loading sessions…</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            // react-native RefreshControl works inside ScrollView
            // eslint-disable-next-line react-native/sort-styles
            <View />
            // Pull-to-refresh via FlatList below; ScrollView handles manual refresh via button
          }
        >
          <Text style={styles.pageSubtitle}>
            Manage active, upcoming, and archived academic attachment periods.
          </Text>

          {/* Add button */}
          <TouchableOpacity style={styles.addSessionBtn} onPress={openAdd}>
            <Ionicons name="add-circle-outline" size={20} color={WHITE} />
            <Text style={styles.addSessionText}>Add New Session</Text>
          </TouchableOpacity>

          {/* Active session hero card */}
          {stats.active ? (
            <TouchableOpacity
              style={styles.activeSessionCard}
              onPress={() => openEdit(stats.active)}
              activeOpacity={0.85}
            >
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>CURRENT ACTIVE</Text>
              </View>
              <Text style={styles.activeSessionName}>{stats.active.name}</Text>
              <View style={styles.activeSessionMeta}>
                <View>
                  <Text style={styles.activeMetaLabel}>DURATION</Text>
                  <Text style={styles.activeMetaValue}>
                    {fmtDate(stats.active.start_date)} – {fmtDate(stats.active.end_date)}
                  </Text>
                </View>
                <View>
                  <Text style={styles.activeMetaLabel}>STUDENTS</Text>
                  <Text style={styles.activeMetaValue}>
                    {stats.active.student_count ?? '—'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={[styles.activeSessionCard, { backgroundColor: GRAY }]}>
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>NO ACTIVE SESSION</Text>
              </View>
              <Text style={[styles.activeSessionName, { fontSize: 18 }]}>
                No session is currently active
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>
                Create or activate a session below.
              </Text>
            </View>
          )}

          {/* Stats row */}
          <View style={styles.sessionStatsRow}>
            <View style={styles.sessionStatCard}>
              <MaterialCommunityIcons name="clipboard-clock-outline" size={22} color={RED} />
              <Text style={styles.sessionStatLabel}>PENDING / DRAFT</Text>
              <Text style={styles.sessionStatValue}>{String(stats.pending).padStart(2, '0')}</Text>
              <Text style={styles.sessionStatDesc}>Awaiting activation</Text>
            </View>
            <View style={styles.sessionStatCard}>
              <Ionicons name="calendar-outline" size={22} color={TEAL} />
              <Text style={styles.sessionStatLabel}>UPCOMING</Text>
              <Text style={styles.sessionStatValue}>{String(stats.upcoming).padStart(2, '0')}</Text>
              <Text style={styles.sessionStatDesc}>Scheduled sessions</Text>
            </View>
          </View>

          {/* Session list */}
          <Text style={styles.sectionTitle}>All Attachment Cycles</Text>

          {sessions.length === 0 ? (
            <View style={[styles.emptyBox, { paddingTop: 32 }]}>
              <MaterialCommunityIcons name="calendar-remove-outline" size={48} color={BORDER} />
              <Text style={styles.emptyText}>No sessions yet</Text>
              <Text style={{ fontSize: 13, color: GRAY, marginTop: 4 }}>
                Tap "Add New Session" to create one.
              </Text>
            </View>
          ) : (
            sessions.map((s) => {
              const sc = statusColor(s.status);
              return (
                <View key={s.id} style={styles.sessionCard}>
                  <View style={[styles.sessionIconBox, { backgroundColor: sc.bg }]}>
                    <Ionicons name="time-outline" size={20} color={sc.color} />
                  </View>
                  <View style={styles.sessionInfo}>
                    <Text style={styles.sessionName}>{s.name}</Text>
                    <View style={styles.sessionDateRow}>
                      <Ionicons name="calendar-outline" size={12} color={GRAY} />
                      <Text style={styles.sessionDates}>
                        {' '}{fmtDate(s.start_date)} – {fmtDate(s.end_date)}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                      <Text style={[styles.statusBadgeText, { color: sc.color }]}>{s.status}</Text>
                    </View>
                  </View>

                  {/* Action buttons */}
                  <View style={styles.sessionActions}>
                    {s.status !== 'CLOSED' && (
                      <TouchableOpacity
                        style={styles.editIconBtn}
                        onPress={() => openEdit(s)}
                      >
                        <Ionicons name="create-outline" size={17} color={TEAL} />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[styles.editIconBtn, { marginTop: 6, borderColor: '#FFE4E4' }]}
                      onPress={() => handleDelete(s)}
                    >
                      <Ionicons name="trash-outline" size={17} color={RED} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}

          {/* Archive policy note */}
          <View style={styles.archiveCard}>
            <View style={[styles.sessionIconBox, { backgroundColor: TEAL, marginRight: 14 }]}>
              <Ionicons name="information-circle-outline" size={20} color={WHITE} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.archiveTitle}>Automated Archive Policy</Text>
              <Text style={styles.archiveDesc}>
                Sessions are automatically marked as 'Closed' 48 hours after their end date. All student logs and assessments will be frozen for modifications but remain available for export.
              </Text>
            </View>
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── Sub-screen: System Config (unchanged) ───────────────────────────────────
function SystemConfig({ onBack }) {
  const [appName, setAppName]           = useState('Internship & Attachment Management');
  const [academicYear, setAcademicYear] = useState('2024 / 2025');
  const [semester, setSemester]         = useState('SEM1');
  const [sysAlerts, setSysAlerts]       = useState(true);
  const [emailFreq, setEmailFreq]       = useState('instant');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SubHeader title="System Settings" onBack={onBack} />
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageSubtitle}>
          Manage application configurations, role permissions, and academic sessions.
        </Text>

        <Text style={styles.sectionTitle}>⚙  System Configuration</Text>
        <View style={[styles.card, { padding: 16 }]}>
          <Text style={styles.inputLabel}>APP NAME</Text>
          <TextInput style={styles.textInput} value={appName} onChangeText={setAppName} />
          <View style={styles.rowTwoCol}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.inputLabel}>ACADEMIC YEAR</Text>
              <TextInput style={styles.textInput} value={academicYear} onChangeText={setAcademicYear} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>CURRENT SEMESTER</Text>
              <View style={styles.semesterRow}>
                {['SEM1', 'SEM2'].map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.semBtn, semester === s && styles.semBtnActive]}
                    onPress={() => setSemester(s)}
                  >
                    <Text style={[styles.semBtnText, semester === s && styles.semBtnTextActive]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>🔔  Notifications</Text>
        <View style={[styles.card, { padding: 16 }]}>
          <View style={styles.permRow}>
            <Text style={styles.permLabel}>System-wide Alerts</Text>
            <Switch
              value={sysAlerts}
              onValueChange={setSysAlerts}
              trackColor={{ false: BORDER, true: TEAL }}
              thumbColor={WHITE}
            />
          </View>
          <View style={styles.divider} />
          <Text style={[styles.inputLabel, { marginTop: 12 }]}>EMAIL FREQUENCY</Text>
          {[
            { key: 'instant', label: 'Instant (Critical only)' },
            { key: 'digest',  label: 'Daily Digest' },
          ].map(opt => (
            <TouchableOpacity key={opt.key} style={styles.radioRow} onPress={() => setEmailFreq(opt.key)}>
              <View style={[styles.radioCircle, emailFreq === opt.key && styles.radioCircleActive]}>
                {emailFreq === opt.key && <View style={styles.radioDot} />}
              </View>
              <Text style={styles.radioLabel}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>💾  Data Management</Text>
        <View style={[styles.card, { backgroundColor: TEAL }]}>
          <View style={styles.dataManagRow}>
            <TouchableOpacity style={styles.dataBtn} onPress={() => Alert.alert('Backup', 'Manual backup initiated.')}>
              <MaterialCommunityIcons name="cloud-upload-outline" size={26} color={WHITE} />
              <Text style={styles.dataBtnText}>MANUAL BACKUP</Text>
            </TouchableOpacity>
            <View style={styles.dataBtnDivider} />
            <TouchableOpacity style={styles.dataBtn} onPress={() => Alert.alert('Export', 'Exporting logs...')}>
              <MaterialCommunityIcons name="file-export-outline" size={26} color={WHITE} />
              <Text style={styles.dataBtnText}>EXPORT LOGS</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.lastBackupText}>Last backup: 12 mins ago</Text>
        </View>

        <TouchableOpacity
          style={styles.saveBtn}
          onPress={() => Alert.alert('Saved', 'System settings updated successfully.')}
        >
          <Text style={styles.saveBtnText}>Save Changes</Text>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Main Settings Screen ────────────────────────────────────────────────────
export default function AdminSettings({ navigation }) {
  const { logout, token } = useAuth();
  const [activeView, setActiveView] = useState('main');

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout', style: 'destructive',
        onPress: async () => {
          try { await logout(); }
          catch { Alert.alert('Error', 'Failed to logout. Please try again.'); }
        },
      },
    ]);
  };

  // ── CHANGE: pass navigation into RolePermissions so Manage Admins button works ──
  if (activeView === 'permissions')   return <RolePermissions   onBack={() => setActiveView('main')} token={token} navigation={navigation} />;
  if (activeView === 'sessions')      return <AttachmentSessions onBack={() => setActiveView('main')} token={token} />;
  if (activeView === 'sysconfig')     return <SystemConfig       onBack={() => setActiveView('main')} />;
  if (activeView === 'privacypolicy') return <PrivacyPolicy      onBack={() => setActiveView('main')} />;
  if (activeView === 'auditlogs')     return <AuditLogs          onBack={() => setActiveView('main')} token={token} />;

  const SettingRow = ({ icon, label, subtitle, onPress, danger }) => (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.iconBox, danger && styles.iconBoxDanger]}>
        <MaterialCommunityIcons name={icon} size={20} color={danger ? RED : TEAL} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]}>{label}</Text>
        {subtitle && <Text style={styles.rowSubtitle}>{subtitle}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={18} color={GRAY} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.subHeader}>
        <View style={{ width: 40 }} />
        <Text style={styles.headerTitle}>Settings</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="close" size={22} color={WHITE} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>SYSTEM</Text>
        <View style={styles.card}>
          <SettingRow icon="cog-outline"            label="System Configuration" subtitle="App name, academic year, semester"  onPress={() => setActiveView('sysconfig')} />
          <View style={styles.divider} />
          <SettingRow icon="shield-account-outline" label="Role Permissions"      subtitle="Manage access per user role"        onPress={() => setActiveView('permissions')} />
          <View style={styles.divider} />
          <SettingRow icon="calendar-clock"         label="Attachment Sessions"   subtitle="Manage academic attachment cycles"  onPress={() => setActiveView('sessions')} />
        </View>

        <Text style={styles.sectionTitle}>ACCOUNT</Text>
        <View style={styles.card}>
          <SettingRow icon="account-edit-outline" label="Edit Profile"    subtitle="Update your name and contact info" onPress={() => navigation.navigate('AdminProfile')} />
          <View style={styles.divider} />
          <SettingRow icon="lock-reset"           label="Change Password" subtitle="Update your account password"      onPress={() => Alert.alert('Coming Soon', 'Password change coming soon.')} />
        </View>

        <Text style={styles.sectionTitle}>REPORTS</Text>
        <View style={styles.card}>
          <SettingRow icon="chart-bar"              label="System Reports"    subtitle="View usage and activity reports" onPress={() => navigation.navigate('Reports')} />
          <View style={styles.divider} />
          <SettingRow icon="text-box-check-outline" label="Annual Audit Logs" subtitle="Review system audit trail"      onPress={() => setActiveView('auditlogs')} />
        </View>

        <Text style={styles.sectionTitle}>ABOUT</Text>
        <View style={styles.card}>
          <SettingRow icon="information-outline"  label="App Version"    subtitle="IAMS v1.0.0 · Baraton University" onPress={() => {}} />
          <View style={styles.divider} />
          <SettingRow icon="shield-check-outline" label="Privacy Policy" subtitle="Data protection & usage policy"   onPress={() => setActiveView('privacypolicy')} />
        </View>

        <View style={[styles.card, { marginBottom: 40 }]}>
          <SettingRow icon="logout" label="Logout" danger onPress={handleLogout} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: NAVY },
  scroll: { flex: 1, backgroundColor: LIGHT_BG, paddingHorizontal: 16 },

  subHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20, backgroundColor: NAVY,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: WHITE, flex: 1, textAlign: 'center' },
  backBtn: { width: 40, alignItems: 'flex-end' },

  sectionTitle: {
    fontSize: 12, fontWeight: '700', color: GRAY, letterSpacing: 0.8,
    textTransform: 'uppercase', marginTop: 24, marginBottom: 8, marginLeft: 4,
  },
  pageSubtitle: { fontSize: 13, color: GRAY, marginTop: 8, marginBottom: 4, lineHeight: 20 },

  card:    { backgroundColor: WHITE, borderRadius: 16, borderWidth: 1, borderColor: BORDER, overflow: 'hidden', elevation: 1 },
  divider: { height: 1, backgroundColor: BORDER, marginHorizontal: 16 },

  row:           { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  iconBox:       { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(46,196,160,0.12)', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  iconBoxDanger: { backgroundColor: 'rgba(255,82,82,0.10)' },
  rowContent:    { flex: 1 },
  rowLabel:      { fontSize: 14, fontWeight: '600', color: DARK },
  rowLabelDanger:{ color: RED },
  rowSubtitle:   { fontSize: 12, color: GRAY, marginTop: 2 },

  permRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  permLabel: { fontSize: 14, color: DARK, fontWeight: '500' },

  roleHeader:       { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 10 },
  roleTitle:        { fontSize: 16, fontWeight: '700', color: DARK, flex: 1 },
  roleIconBox:      { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  superBadge:       { backgroundColor: DARK, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  superBadgeText:   { color: WHITE, fontSize: 10, fontWeight: '800' },
  defaultBadge:     { borderWidth: 1, borderColor: BORDER, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  defaultBadgeText: { color: GRAY, fontSize: 10, fontWeight: '700' },
  roleDesc:         { fontSize: 13, color: GRAY, lineHeight: 20, paddingHorizontal: 16, marginBottom: 12 },
  manageBtn:        { borderWidth: 1.5, borderColor: TEAL, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 8, alignSelf: 'flex-start', marginHorizontal: 16, marginBottom: 14 },
  manageBtnText:    { color: TEAL, fontWeight: '600', fontSize: 13 },
  permCheckGrid:    { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 12 },
  permCheckItem:    { flexDirection: 'row', alignItems: 'center', width: '45%', gap: 6 },
  permCheckText:    { fontSize: 13, color: DARK, fontWeight: '500' },

  saveBtn:     { backgroundColor: NAVY, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 20, marginBottom: 10 },
  saveBtnText: { color: WHITE, fontSize: 15, fontWeight: '700' },
  resetText:   { fontSize: 13, color: GRAY, textDecorationLine: 'underline' },

  // Sessions
  addSessionBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: NAVY, borderRadius: 14, paddingVertical: 14, gap: 8, marginVertical: 12 },
  addSessionText:    { color: WHITE, fontWeight: '700', fontSize: 14 },
  activeSessionCard: { backgroundColor: TEAL, borderRadius: 16, padding: 20, marginBottom: 12 },
  activeBadge:       { backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 10 },
  activeBadgeText:   { color: WHITE, fontSize: 10, fontWeight: '800' },
  activeSessionName: { fontSize: 28, fontWeight: '800', color: WHITE, marginBottom: 16 },
  activeSessionMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  activeMetaLabel:   { fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: '700', marginBottom: 4 },
  activeMetaValue:   { fontSize: 13, color: WHITE, fontWeight: '600' },
  sessionStatsRow:   { flexDirection: 'row', gap: 12, marginBottom: 12 },
  sessionStatCard:   { flex: 1, backgroundColor: WHITE, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: BORDER, elevation: 1 },
  sessionStatLabel:  { fontSize: 10, color: GRAY, fontWeight: '700', marginTop: 6, letterSpacing: 0.5 },
  sessionStatValue:  { fontSize: 28, fontWeight: '800', color: DARK, marginTop: 2 },
  sessionStatDesc:   { fontSize: 12, color: GRAY, marginTop: 2 },
  sessionCard:       { flexDirection: 'row', alignItems: 'center', backgroundColor: WHITE, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: BORDER, elevation: 1 },
  sessionIconBox:    { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  sessionInfo:       { flex: 1 },
  sessionName:       { fontSize: 14, fontWeight: '700', color: DARK, marginBottom: 4 },
  sessionDateRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  sessionDates:      { fontSize: 12, color: GRAY },
  statusBadge:       { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  statusBadgeText:   { fontSize: 10, fontWeight: '700' },
  sessionActions:    { alignItems: 'center' },
  editIconBtn:       { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' },
  archiveCard:       { flexDirection: 'row', backgroundColor: WHITE, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: BORDER, marginBottom: 12, marginTop: 8 },
  archiveTitle:      { fontSize: 14, fontWeight: '700', color: DARK, marginBottom: 6 },
  archiveDesc:       { fontSize: 12, color: GRAY, lineHeight: 18 },

  // Session form modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet:   { backgroundColor: WHITE, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' },
  modalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle:   { fontSize: 18, fontWeight: '700', color: DARK },
  statusPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  statusOption: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: BORDER, backgroundColor: LIGHT_BG },
  statusOptionActive:     { backgroundColor: NAVY, borderColor: NAVY },
  statusOptionText:       { fontSize: 12, fontWeight: '600', color: GRAY },
  statusOptionTextActive: { color: WHITE },

  // System config
  inputLabel:  { fontSize: 11, color: GRAY, fontWeight: '700', marginBottom: 6, letterSpacing: 0.5 },
  textInput:   { borderWidth: 1, borderColor: BORDER, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: DARK, backgroundColor: LIGHT_BG, marginBottom: 8 },
  rowTwoCol:   { flexDirection: 'row', marginTop: 4 },
  semesterRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  semBtn:      { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: BORDER, alignItems: 'center', backgroundColor: LIGHT_BG },
  semBtnActive:     { backgroundColor: TEAL, borderColor: TEAL },
  semBtnText:       { fontSize: 13, fontWeight: '700', color: GRAY },
  semBtnTextActive: { color: WHITE },
  radioRow:         { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  radioCircle:      { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' },
  radioCircleActive:{ borderColor: TEAL },
  radioDot:         { width: 10, height: 10, borderRadius: 5, backgroundColor: TEAL },
  radioLabel:       { fontSize: 14, color: DARK },
  dataManagRow:     { flexDirection: 'row', padding: 16 },
  dataBtn:          { flex: 1, alignItems: 'center', gap: 8 },
  dataBtnDivider:   { width: 1, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 10 },
  dataBtnText:      { color: WHITE, fontWeight: '700', fontSize: 12 },
  lastBackupText:   { textAlign: 'center', color: 'rgba(255,255,255,0.7)', fontSize: 12, paddingBottom: 14 },

  // Audit logs
  auditSearchRow:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: LIGHT_BG, gap: 8 },
  auditSearchBox:      { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: WHITE, borderWidth: 1, borderColor: BORDER, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, gap: 6 },
  auditSearchInput:    { flex: 1, fontSize: 14, color: DARK },
  auditSearchBtn:      { backgroundColor: NAVY, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  auditSearchBtnText:  { color: WHITE, fontWeight: '700', fontSize: 13 },
  filterScroll:        { backgroundColor: LIGHT_BG, maxHeight: 48 },
  filterRow:           { paddingHorizontal: 16, paddingBottom: 8, gap: 8, flexDirection: 'row', alignItems: 'center' },
  filterChip:          { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: BORDER, backgroundColor: WHITE },
  filterChipActive:    { backgroundColor: NAVY, borderColor: NAVY },
  filterChipText:      { fontSize: 12, color: GRAY, fontWeight: '600' },
  filterChipTextActive:{ color: WHITE },
  logCard:        { backgroundColor: WHITE, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: BORDER, elevation: 1 },
  logTop:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  actionBadge:    { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  actionBadgeText:{ fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
  logTime:        { fontSize: 11, color: GRAY },
  logDesc:        { fontSize: 13, color: DARK, lineHeight: 20, marginBottom: 8 },
  logMeta:        { flexDirection: 'row', alignItems: 'center', gap: 4 },
  logMetaText:    { fontSize: 11, color: GRAY },
  logExpanded:    { marginTop: 8 },
  logDetail:      { fontSize: 12, color: GRAY, lineHeight: 18, marginTop: 6 },
  logDetailKey:   { fontWeight: '700', color: DARK },
  loaderBox:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 60 },
  loaderText:     { fontSize: 14, color: GRAY },
  emptyBox:       { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
  emptyText:      { fontSize: 15, color: GRAY },
  endText:        { textAlign: 'center', fontSize: 12, color: GRAY, paddingVertical: 16 },

  // Privacy Policy
  ppHero:          { alignItems: 'center', backgroundColor: NAVY, paddingHorizontal: 24, paddingBottom: 32, paddingTop: 8 },
  ppHeroTitle:     { fontSize: 22, fontWeight: '800', color: WHITE, marginTop: 12, marginBottom: 8 },
  ppHeroSub:       { fontSize: 13, color: 'rgba(255,255,255,0.65)', textAlign: 'center', lineHeight: 20 },
  ppEffectiveBadge:{ marginTop: 16, backgroundColor: 'rgba(46,196,160,0.15)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(46,196,160,0.3)' },
  ppEffectiveText: { color: TEAL, fontSize: 12, fontWeight: '600' },
  ppSection:       { padding: 20 },
  ppSectionTitle:  { fontSize: 14, fontWeight: '800', color: NAVY, marginBottom: 10 },
  ppBody:          { fontSize: 13, color: DARK, lineHeight: 22 },
  ppBullet:        { fontSize: 13, color: DARK, lineHeight: 22 },
  ppBold:          { fontWeight: '700', color: DARK },
  ppFooter:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 24, marginBottom: 8 },
  ppFooterText:    { fontSize: 11, color: GRAY },
});