import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Alert, Dimensions,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import Spinner from '../../components/Spinner';

const { width } = Dimensions.get('window');

const STATUS_COLORS = {
  pending: '#FF9800',
  approved: '#2E7D32',
  ongoing: '#2196F3',
  completed: '#4CAF50',
  rejected: '#F44336',
};

const STATUS_OPTIONS = ['pending', 'approved', 'ongoing', 'completed', 'rejected'];

const SECTOR_COLORS = ['#1A6B5A', '#FB8C00', '#3B6FE0', '#7B3FE4'];

const RECENT_REPORTS = [
  { title: 'Q3 Attachment Summary', date: 'Oct 12, 2023', size: '4.2 MB', icon: '📋', iconBg: '#E8F5F2' },
  { title: 'Org Performance Review', date: 'Oct 08, 2023', size: '2.8 MB', icon: '📊', iconBg: '#FFF3E0' },
  { title: 'Student Completion Audit', date: 'Sep 30, 2023', size: '5.1 MB', icon: '✅', iconBg: '#EDE7F6' },
];

// ─── Donut Chart (pure SVG-free, drawn with Views) ───────────────────────────
function DonutChart({ data }) {
  const size = 180;
  const strokeWidth = 28;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = data.reduce((s, d) => s + d.value, 0);

  let offset = 0;
  const segments = data.map((d, i) => {
    const pct = d.value / total;
    const dash = pct * circumference;
    const gap = circumference - dash;
    const rotation = offset * 360 - 90;
    offset += pct;
    return { ...d, dash, gap, rotation, color: SECTOR_COLORS[i % SECTOR_COLORS.length] };
  });

  // Build SVG string manually via View-based approach using absolute positioned arcs
  // We'll use a simpler visual: stacked arc-like bars in a circle using borderRadius trick
  return (
    <View style={{ alignItems: 'center', marginVertical: 16 }}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        {/* Outer ring simulation using overlapping views */}
        <View style={{
          width: size, height: size, borderRadius: size / 2,
          position: 'absolute',
          borderWidth: strokeWidth, borderColor: '#F0F0F0',
        }} />
        {segments.map((seg, i) => {
          const pct = seg.value / total;
          // We use a clip trick: two half-circles
          const deg = pct * 360;
          return (
            <View key={i} style={{
              width: size, height: size, borderRadius: size / 2,
              position: 'absolute',
              borderWidth: strokeWidth,
              borderColor: 'transparent',
              borderTopColor: deg > 0 ? seg.color : 'transparent',
              borderRightColor: deg > 90 ? seg.color : 'transparent',
              borderBottomColor: deg > 180 ? seg.color : 'transparent',
              borderLeftColor: deg > 270 ? seg.color : 'transparent',
              transform: [{ rotate: `${seg.rotation}deg` }],
            }} />
          );
        })}
        <View style={{
          width: size - strokeWidth * 2 - 10,
          height: size - strokeWidth * 2 - 10,
          borderRadius: (size - strokeWidth * 2 - 10) / 2,
          backgroundColor: '#fff',
          alignItems: 'center', justifyContent: 'center',
          position: 'absolute',
        }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#1A3A33' }}>Sectors</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Big Stat Card ────────────────────────────────────────────────────────────
function HeroCard({ label, value, change, icon }) {
  return (
    <View style={styles.heroCard}>
      <View style={{ flex: 1 }}>
        <Text style={styles.heroLabel}>{label}</Text>
        <Text style={styles.heroValue}>{value}</Text>
        {change && (
          <View style={styles.changePill}>
            <Text style={styles.changeText}>↗ {change}</Text>
            <Text style={styles.changeNote}> vs last month</Text>
          </View>
        )}
      </View>
      <View style={styles.heroIcon}>
        <Text style={{ fontSize: 22 }}>{icon}</Text>
      </View>
    </View>
  );
}

// ─── Small Stat Card ──────────────────────────────────────────────────────────
function MiniCard({ label, value, sub, valueColor, barColor }) {
  return (
    <View style={styles.miniCard}>
      <Text style={styles.miniLabel}>{label}</Text>
      <Text style={[styles.miniValue, valueColor && { color: valueColor }]}>{value}</Text>
      {barColor && (
        <View style={styles.miniBar}>
          <View style={[styles.miniBarFill, { backgroundColor: barColor, width: '60%' }]} />
        </View>
      )}
      {sub && <Text style={styles.miniSub}>{sub}</Text>}
    </View>
  );
}

// ─── Recent Report Row ────────────────────────────────────────────────────────
function ReportRow({ item, onDownload }) {
  return (
    <View style={styles.reportRow}>
      <View style={[styles.reportIconWrap, { backgroundColor: item.iconBg }]}>
        <Text style={{ fontSize: 18 }}>{item.icon}</Text>
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.reportTitle}>{item.title}</Text>
        <Text style={styles.reportMeta}>Generated: {item.date} • {item.size}</Text>
      </View>
      <TouchableOpacity style={styles.downloadBtn} onPress={onDownload}>
        <Text style={{ fontSize: 16, color: '#555' }}>⬇</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
const Reports = ({ navigation }) => {
  const { user } = useAuth();
  const [reportType, setReportType] = useState('summary');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const [detailedData, setDetailedData] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    if (reportType === 'summary') fetchSummaryReport();
    else fetchDetailedReport();
  }, [reportType, statusFilter]);

  const fetchSummaryReport = async () => {
    try {
      setLoading(true);
      const params = {};
      if (dateRange.start) params.startDate = dateRange.start;
      if (dateRange.end) params.endDate = dateRange.end;
      const response = await api.get('/admin/reports/summary', { params });
      setSummaryData(response.data);
    } catch {
      Alert.alert('Error', 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const fetchDetailedReport = async () => {
    try {
      setLoading(true);
      const params = { page: 1, limit: 50 };
      if (statusFilter) params.status = statusFilter;
      if (dateRange.start) params.startDate = dateRange.start;
      if (dateRange.end) params.endDate = dateRange.end;
      const response = await api.get('/admin/reports/detailed', { params });
      setDetailedData(response.data);
    } catch {
      Alert.alert('Error', 'Failed to load detailed report');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    const fn = reportType === 'summary' ? fetchSummaryReport : fetchDetailedReport;
    fn().then(() => setRefreshing(false));
  }, [reportType, statusFilter]);

  const handleExport = (format) => {
    Alert.alert('Export', `Exporting as ${format.toUpperCase()}...`, [
      { text: 'OK', onPress: () => Alert.alert('Success', `Report exported as ${format.toUpperCase()}`) },
    ]);
  };

  // Build donut data from summaryData or fallback
  const donutData = summaryData?.deptBreakdown?.length
    ? summaryData.deptBreakdown.slice(0, 4).map(d => ({ label: d.department, value: Number(d.count) }))
    : [
        { label: 'Tech', value: 35 },
        { label: 'Finance', value: 25 },
        { label: 'Healthcare', value: 25 },
        { label: 'Manufacturing', value: 15 },
      ];

  const totalDonut = donutData.reduce((s, d) => s + d.value, 0);

  const renderSummary = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Hero Card */}
      <View style={styles.padded}>
        <HeroCard
          label="TOTAL PLACEMENTS"
          value={summaryData?.totalAttachments ?? '—'}
          change="+12%"
          icon="📋"
        />
      </View>

      {/* Mini Stats Grid */}
      <View style={styles.miniGrid}>
        <MiniCard
          label="Active Interns"
          value={summaryData?.totalStudents?.toLocaleString() ?? '—'}
          barColor="#1A6B5A"
        />
        <MiniCard
          label="Pending Approvals"
          value={
            summaryData?.statusBreakdown?.find(s => s.status === 'pending')?.count ?? '—'
          }
          sub="Action required"
          valueColor="#E53935"
        />
      </View>
      <View style={styles.miniGrid}>
        <MiniCard
          label="Partner Orgs"
          value={summaryData?.totalOrgs ?? '—'}
          sub="Across 8 sectors"
        />
        <MiniCard
          label="Completion Rate"
          value={
            summaryData?.totalAttachments
              ? `${Math.round(
                  ((summaryData.statusBreakdown?.find(s => s.status === 'completed')?.count || 0) /
                    summaryData.totalAttachments) * 100
                )}%`
              : '—'
          }
          sub="High performance"
          valueColor="#1A6B5A"
        />
      </View>

      {/* Placement Distribution */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Placement Distribution</Text>
        <DonutChart data={donutData} />
        <View style={{ marginTop: 8 }}>
          {donutData.map((d, i) => (
            <View key={i} style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: SECTOR_COLORS[i % SECTOR_COLORS.length] }]} />
              <Text style={styles.legendLabel}>{d.label}</Text>
              <Text style={[styles.legendPct, { color: SECTOR_COLORS[i % SECTOR_COLORS.length] }]}>
                {Math.round((d.value / totalDonut) * 100)}%
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Recent Reports */}
      <View style={styles.recentHeader}>
        <Text style={styles.recentTitle}>Recent Reports</Text>
        <TouchableOpacity>
          <Text style={styles.viewAll}>View All</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.card}>
        {RECENT_REPORTS.map((r, i) => (
          <ReportRow key={i} item={r} onDownload={() => handleExport('pdf')} />
        ))}
      </View>

      {/* Export */}
      <View style={[styles.card, { flexDirection: 'row', gap: 10 }]}>
        {['csv', 'json', 'pdf'].map(fmt => (
          <TouchableOpacity key={fmt} style={styles.exportBtn} onPress={() => handleExport(fmt)}>
            <Text style={styles.exportBtnText}>{fmt.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );

  const renderDetailed = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Filter chips */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Filter by Status</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 8 }}>
          <TouchableOpacity
            style={[styles.chip, !statusFilter && styles.chipActive]}
            onPress={() => setStatusFilter('')}
          >
            <Text style={[styles.chipText, !statusFilter && styles.chipTextActive]}>All</Text>
          </TouchableOpacity>
          {STATUS_OPTIONS.map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.chip, statusFilter === s && styles.chipActive]}
              onPress={() => setStatusFilter(s)}
            >
              <Text style={[styles.chipText, statusFilter === s && styles.chipTextActive]}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Detail rows */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          Records ({detailedData?.pagination?.total ?? 0})
        </Text>
        {detailedData?.details?.length > 0 ? (
          detailedData.details.map((item) => (
            <View key={item.attachment_id} style={styles.detailRow}>
              <View style={styles.detailAvatar}>
                <Text style={styles.detailAvatarText}>
                  {item.student_name?.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.detailName}>{item.student_name}</Text>
                <Text style={styles.detailSub}>{item.reg_number} • {item.department}</Text>
                <Text style={styles.detailSub}>🏢 {item.org_name}</Text>
                <Text style={styles.detailSub}>
                  📒 {item.logbook_count} logbooks
                  {item.evaluation_rating ? `  ⭐ ${item.evaluation_rating}/5` : ''}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] ?? '#999' }]}>
                <Text style={styles.statusBadgeText}>
                  {item.status?.charAt(0).toUpperCase() + item.status?.slice(1)}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.noData}>No records match the selected filter.</Text>
        )}
      </View>

      {/* Export */}
      <View style={[styles.card, { flexDirection: 'row', gap: 10 }]}>
        {['csv', 'json'].map(fmt => (
          <TouchableOpacity key={fmt} style={styles.exportBtn} onPress={() => handleExport(fmt)}>
            <Text style={styles.exportBtnText}>{fmt.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.hamburger}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>System Reports</Text>
        <TouchableOpacity>
          <Text style={styles.bell}>🔔</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {['summary', 'detailed'].map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, reportType === t && styles.tabActive]}
            onPress={() => setReportType(t)}
          >
            <Text style={[styles.tabText, reportType === t && styles.tabTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <Spinner size="large" color="#1A6B5A" />
          <Text style={styles.loadingText}>Loading report...</Text>
        </View>
      ) : (
        reportType === 'summary' ? renderSummary() : renderDetailed()
      )}

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        {[
          { label: 'Home', icon: '🏠' },
          { label: 'Users', icon: '👥' },
          { label: 'Orgs', icon: '🏢' },
          { label: 'Profile', icon: '👤', active: true },
        ].map(tab => (
          <TouchableOpacity key={tab.label} style={styles.navTab}>
            <Text style={styles.navIcon}>{tab.icon}</Text>
            <Text style={[styles.navLabel, tab.active && styles.navLabelActive]}>{tab.label}</Text>
            {tab.active && <View style={styles.navDot} />}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F6F5' },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', backgroundColor: '#fff',
    paddingHorizontal: 20, paddingTop: 52, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#E8EFED',
  },
  hamburger: { fontSize: 20, color: '#1A3A33' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1A3A33' },
  bell: { fontSize: 20 },

  // Tabs
  tabs: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#E8EFED',
  },
  tab: {
    flex: 1, paddingVertical: 13, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#1A6B5A' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#AAA' },
  tabTextActive: { color: '#1A6B5A' },

  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#888', fontSize: 14 },

  padded: { paddingHorizontal: 16, paddingTop: 16 },

  // Hero Card
  heroCard: {
    backgroundColor: '#fff', borderRadius: 18,
    padding: 20, flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  heroLabel: { fontSize: 10, fontWeight: '700', color: '#AAA', letterSpacing: 1, marginBottom: 6 },
  heroValue: { fontSize: 48, fontWeight: '800', color: '#1A3A33', lineHeight: 54 },
  changePill: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  changeText: { fontSize: 12, fontWeight: '700', color: '#1A6B5A', backgroundColor: '#E4F2EE', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  changeNote: { fontSize: 12, color: '#AAA', marginLeft: 6 },
  heroIcon: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: '#E4F2EE',
    justifyContent: 'center', alignItems: 'center',
  },

  // Mini Grid
  miniGrid: {
    flexDirection: 'row', paddingHorizontal: 16,
    gap: 12, marginTop: 12,
  },
  miniCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 16,
    padding: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  miniLabel: { fontSize: 11, color: '#AAA', fontWeight: '600', marginBottom: 8 },
  miniValue: { fontSize: 28, fontWeight: '800', color: '#1A3A33' },
  miniBar: { height: 4, backgroundColor: '#E8EFED', borderRadius: 4, marginTop: 10, overflow: 'hidden' },
  miniBarFill: { height: '100%', borderRadius: 4 },
  miniSub: { fontSize: 11, color: '#AAA', marginTop: 6 },

  // Card
  card: {
    backgroundColor: '#fff', borderRadius: 18,
    marginHorizontal: 16, marginTop: 16, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#1A3A33', marginBottom: 4 },

  // Donut legend
  legendRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#F2F2F2',
  },
  legendDot: { width: 12, height: 12, borderRadius: 6, marginRight: 10 },
  legendLabel: { flex: 1, fontSize: 14, color: '#1A3A33', fontWeight: '500' },
  legendPct: { fontSize: 14, fontWeight: '800' },

  // Recent Reports
  recentHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 16, marginTop: 20,
  },
  recentTitle: { fontSize: 16, fontWeight: '800', color: '#1A3A33' },
  viewAll: { fontSize: 13, fontWeight: '600', color: '#1A6B5A' },
  reportRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F2F6F5',
  },
  reportIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  reportTitle: { fontSize: 14, fontWeight: '700', color: '#1A3A33' },
  reportMeta: { fontSize: 11, color: '#AAA', marginTop: 3 },
  downloadBtn: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 1.5, borderColor: '#E0E0E0',
    justifyContent: 'center', alignItems: 'center',
  },

  // Export
  exportBtn: {
    flex: 1, backgroundColor: '#1A6B5A',
    paddingVertical: 12, borderRadius: 12, alignItems: 'center',
  },
  exportBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // Filter chips
  chip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#E0E0E0',
    backgroundColor: '#F5F5F5',
  },
  chipActive: { backgroundColor: '#1A6B5A', borderColor: '#1A6B5A' },
  chipText: { fontSize: 12, fontWeight: '600', color: '#666' },
  chipTextActive: { color: '#fff' },

  // Detail rows
  detailRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F2F6F5',
  },
  detailAvatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#C8E6DF',
    justifyContent: 'center', alignItems: 'center',
  },
  detailAvatarText: { fontSize: 16, fontWeight: '700', color: '#1A6B5A' },
  detailName: { fontSize: 14, fontWeight: '700', color: '#1A3A33' },
  detailSub: { fontSize: 11, color: '#888', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, marginLeft: 8, marginTop: 4 },
  statusBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  noData: { textAlign: 'center', color: '#AAA', fontSize: 14, paddingVertical: 24 },

  // Bottom Nav
  bottomNav: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#E8EFED',
    paddingVertical: 8,
  },
  navTab: { flex: 1, alignItems: 'center', paddingVertical: 4, position: 'relative' },
  navIcon: { fontSize: 20 },
  navLabel: { fontSize: 10, color: '#AAA', fontWeight: '500', marginTop: 2 },
  navLabelActive: { color: '#1A6B5A', fontWeight: '700' },
  navDot: {
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: '#1A6B5A',
    position: 'absolute', bottom: 0,
  },
});

export default Reports;
