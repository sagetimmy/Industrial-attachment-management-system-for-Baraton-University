import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Alert, Dimensions,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
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

const SECTOR_COLORS = ['#13362C', '#FB8C00', '#5AC8A8', '#F4B183'];

const AVATAR_COLORS = [
  { bg: '#C8E6DF', text: '#1A6B5A' },
  { bg: '#FBE2CE', text: '#D2691E' },
  { bg: '#E3E3E3', text: '#555' },
  { bg: '#D9E4FB', text: '#3B6FE0' },
];

const RECENT_REPORTS = [
  { title: 'Q3 Attachment Summary', lastGenerated: '2h ago', icon: 'chart-bar', iconBg: '#E8F5F2', iconColor: '#1A6B5A' },
  { title: 'Org Performance Review', lastGenerated: '1d ago', icon: 'office-building-outline', iconBg: '#FFF3E0', iconColor: '#E8711A' },
  { title: 'Student Completion Audit', lastGenerated: '3d ago', icon: 'clipboard-check-outline', iconBg: '#EDE7F6', iconColor: '#7B3FE4' },
];

// ─── Donut Chart ──────────────────────────────────────────────────────────
function DonutChart({ data }) {
  const size = 140;
  const strokeWidth = 22;
  const total = data.reduce((s, d) => s + d.value, 0);
  const topSector = data.reduce((max, d) => (d.value > max.value ? d : max), data[0]);

  let offset = 0;
  const segments = data.map((d, i) => {
    const pct = d.value / total;
    const deg = pct * 360;
    const rotation = offset * 360 - 90;
    offset += pct;
    return { ...d, deg, rotation, color: SECTOR_COLORS[i % SECTOR_COLORS.length] };
  });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: size, height: size, borderRadius: size / 2,
        position: 'absolute',
        borderWidth: strokeWidth, borderColor: '#F0F0F0',
      }} />
      {segments.map((seg, i) => (
        <View key={i} style={{
          width: size, height: size, borderRadius: size / 2,
          position: 'absolute',
          borderWidth: strokeWidth,
          borderColor: 'transparent',
          borderTopColor: seg.deg > 0 ? seg.color : 'transparent',
          borderRightColor: seg.deg > 90 ? seg.color : 'transparent',
          borderBottomColor: seg.deg > 180 ? seg.color : 'transparent',
          borderLeftColor: seg.deg > 270 ? seg.color : 'transparent',
          transform: [{ rotate: `${seg.rotation}deg` }],
        }} />
      ))}
      <View style={{
        width: size - strokeWidth * 2 - 8,
        height: size - strokeWidth * 2 - 8,
        borderRadius: (size - strokeWidth * 2 - 8) / 2,
        backgroundColor: '#fff',
        alignItems: 'center', justifyContent: 'center',
        position: 'absolute',
      }}>
        <Text style={{ fontSize: 10, fontWeight: '700', color: '#AAA', letterSpacing: 0.5 }}>TOP SECTOR</Text>
        <Text style={{ fontSize: 16, fontWeight: '800', color: '#1A3A33', marginTop: 2 }}>{topSector?.label}</Text>
      </View>
    </View>
  );
}

// ─── Star rating row ──────────────────────────────────────────────────────
function StarRow({ value, size = 16 }) {
  const stars = [1, 2, 3, 4, 5];
  return (
    <View style={{ flexDirection: 'row', marginTop: 6 }}>
      {stars.map(i => (
        <MaterialCommunityIcons
          key={i}
          name={value && i <= Math.round(value) ? 'star' : 'star-outline'}
          size={size}
          color={value && i <= Math.round(value) ? '#E8711A' : '#D8D8D8'}
          style={{ marginRight: 2 }}
        />
      ))}
    </View>
  );
}

// ─── Big Stat Card ────────────────────────────────────────────────────────
function HeroCard({ label, value, change, icon }) {
  return (
    <View style={styles.heroCard}>
      <View style={{ flex: 1 }}>
        <Text style={styles.heroLabel}>{label}</Text>
        <Text style={styles.heroValue}>{value}</Text>
        {change && (
          <View style={styles.changePill}>
            <Ionicons name="trending-up" size={12} color="#1A6B5A" />
            <Text style={styles.changeText}> {change}</Text>
            <Text style={styles.changeNote}> vs last month</Text>
          </View>
        )}
      </View>
      <View style={styles.heroIcon}>
        <MaterialCommunityIcons name={icon} size={24} color="#1A6B5A" />
      </View>
    </View>
  );
}

// ─── Dark Stat Card (used in Detailed tab) ───────────────────────────────
function DarkStatCard({ label, value, change }) {
  return (
    <View style={styles.darkStatCard}>
      <Text style={styles.darkStatLabel}>{label}</Text>
      <Text style={styles.darkStatValue}>{value}</Text>
      {change && (
        <View style={styles.darkChangePill}>
          <Ionicons name="trending-up" size={11} color="#fff" />
          <Text style={styles.darkChangeText}> {change}</Text>
          <Text style={styles.darkChangeNote}> vs last month</Text>
        </View>
      )}
    </View>
  );
}

// ─── Small Stat Card ──────────────────────────────────────────────────────
function MiniCard({ label, value, sub, valueColor, icon }) {
  return (
    <View style={styles.miniCard}>
      <Text style={styles.miniLabel}>{label}</Text>
      <View style={styles.miniValueRow}>
        <Text style={[styles.miniValue, valueColor && { color: valueColor }]}>{value}</Text>
        {icon && (
          <MaterialCommunityIcons name={icon} size={18} color={valueColor || '#9AB5AD'} />
        )}
      </View>
      {sub && <Text style={styles.miniSub}>{sub}</Text>}
    </View>
  );
}

// ─── Recent Report Row ────────────────────────────────────────────────────
function ReportRow({ item, onDownload }) {
  return (
    <View style={styles.reportRow}>
      <View style={[styles.reportIconWrap, { backgroundColor: item.iconBg }]}>
        <MaterialCommunityIcons name={item.icon} size={20} color={item.iconColor} />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.reportTitle}>{item.title}</Text>
        <Text style={styles.reportMeta}>Last generated: {item.lastGenerated}</Text>
      </View>
      <TouchableOpacity style={styles.downloadBtn} onPress={onDownload}>
        <Ionicons name="download-outline" size={16} color="#555" />
      </TouchableOpacity>
    </View>
  );
}

// ─── Detail Record Card ───────────────────────────────────────────────────
function DetailCard({ item, colorIndex }) {
  const avatar = AVATAR_COLORS[colorIndex % AVATAR_COLORS.length];
  const initials = (item.student_name || '?')
    .split(' ')
    .map(p => p.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');

  return (
    <View style={styles.detailCard}>
      <View style={styles.detailTopRow}>
        <View style={[styles.detailAvatar, { backgroundColor: avatar.bg }]}>
          <Text style={[styles.detailAvatarText, { color: avatar.text }]}>{initials}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.detailName}>{item.student_name}</Text>
          <Text style={styles.detailReg}>REG: {item.reg_number}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${STATUS_COLORS[item.status] ?? '#999'}22` }]}>
          <Text style={[styles.statusBadgeText, { color: STATUS_COLORS[item.status] ?? '#999' }]}>
            {item.status?.charAt(0).toUpperCase() + item.status?.slice(1)}
          </Text>
        </View>
      </View>

      <View style={styles.detailDivider} />

      <View style={styles.detailGrid}>
        <View style={styles.detailGridCell}>
          <Text style={styles.detailGridLabel}>DEPARTMENT</Text>
          <Text style={styles.detailGridValue}>{item.department}</Text>
        </View>
        <View style={styles.detailGridCell}>
          <Text style={styles.detailGridLabel}>ORGANIZATION</Text>
          <Text style={styles.detailGridValue}>{item.org_name}</Text>
        </View>
      </View>
      <View style={styles.detailGrid}>
        <View style={styles.detailGridCell}>
          <Text style={styles.detailGridLabel}>LOGBOOKS</Text>
          <Text style={styles.detailGridValue}>{item.logbook_count} Entries</Text>
        </View>
        <View style={styles.detailGridCell}>
          <Text style={styles.detailGridLabel}>RATING</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.detailGridValue}>
              {item.evaluation_rating ? Number(item.evaluation_rating).toFixed(1) : '—'}
            </Text>
            {item.evaluation_rating ? (
              <MaterialCommunityIcons name="star" size={14} color="#E8711A" style={{ marginLeft: 4 }} />
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────
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

  // Average rating: prefer API-provided value, else derive from loaded detail rows
  const avgRating = summaryData?.avgRating
    ? Number(summaryData.avgRating)
    : (() => {
        const rated = (detailedData?.details ?? []).filter(d => d.evaluation_rating);
        if (!rated.length) return null;
        return rated.reduce((s, d) => s + Number(d.evaluation_rating), 0) / rated.length;
      })();

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
          icon="file-document-outline"
        />
      </View>

      {/* Mini Stats Grid */}
      <View style={styles.miniGrid}>
        <MiniCard
          label="Active Interns"
          value={summaryData?.totalStudents?.toLocaleString() ?? '—'}
          icon="account-group-outline"
          valueColor="#1A3A33"
        />
        <MiniCard
          label="Pending Approvals"
          value={summaryData?.statusBreakdown?.find(s => s.status === 'pending')?.count ?? '—'}
          sub="Action required"
          valueColor="#E53935"
          icon="clipboard-clock-outline"
        />
      </View>
      <View style={styles.miniGrid}>
        <MiniCard
          label="Partner Orgs"
          value={summaryData?.totalOrgs ?? '—'}
          sub="Across 8 sectors"
          icon="office-building-outline"
          valueColor="#1A3A33"
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
          icon="check-decagram-outline"
        />
      </View>

      {/* Sectors Distribution */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sectors Distribution</Text>
        <View style={styles.donutRow}>
          <DonutChart data={donutData} />
          <View style={styles.legendCol}>
            {donutData.map((d, i) => (
              <View key={i} style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: SECTOR_COLORS[i % SECTOR_COLORS.length] }]} />
                <Text style={styles.legendLabel} numberOfLines={1}>{d.label}</Text>
                <Text style={[styles.legendPct, { color: SECTOR_COLORS[i % SECTOR_COLORS.length] }]}>
                  {Math.round((d.value / totalDonut) * 100)}%
                </Text>
              </View>
            ))}
          </View>
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
        <TouchableOpacity style={styles.exportBtnLight} onPress={() => handleExport('csv')}>
          <MaterialCommunityIcons name="file-delimited-outline" size={16} color="#1A6B5A" />
          <Text style={styles.exportBtnLightText}> CSV</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.exportBtnLight} onPress={() => handleExport('json')}>
          <MaterialCommunityIcons name="code-json" size={16} color="#1A6B5A" />
          <Text style={styles.exportBtnLightText}> JSON</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.exportBtn} onPress={() => handleExport('pdf')}>
          <MaterialCommunityIcons name="file-pdf-box" size={16} color="#fff" />
          <Text style={styles.exportBtnText}> PDF</Text>
        </TouchableOpacity>
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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipBar}
      >
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

      {/* Stat row */}
      <View style={styles.statRow}>
        <DarkStatCard
          label="ACTIVE USERS"
          value={detailedData?.pagination?.total ?? summaryData?.totalStudents ?? '—'}
          change="+12%"
        />
        <View style={styles.avgScoreCard}>
          <Text style={styles.miniLabel}>AVERAGE SCORE</Text>
          <Text style={styles.miniValue}>{avgRating ? avgRating.toFixed(1) : '—'}</Text>
          <StarRow value={avgRating} />
        </View>
      </View>

      {/* Detail cards */}
      <View style={styles.padded}>
        <Text style={[styles.recentTitle, { marginBottom: 10 }]}>
          Detailed Records ({detailedData?.pagination?.total ?? 0})
        </Text>
        {detailedData?.details?.length > 0 ? (
          detailedData.details.map((item, i) => (
            <DetailCard key={item.attachment_id} item={item} colorIndex={i} />
          ))
        ) : (
          <View style={styles.card}>
            <Text style={styles.noData}>No records match the selected filter.</Text>
          </View>
        )}
      </View>

      {/* Export */}
      <View style={[styles.padded, { flexDirection: 'row', gap: 10 }]}>
        <TouchableOpacity style={[styles.exportBtn, { flex: 1 }]} onPress={() => handleExport('csv')}>
          <Ionicons name="download-outline" size={16} color="#fff" />
          <Text style={styles.exportBtnText}> Export CSV</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.exportBtnOutline, { flex: 1 }]} onPress={() => handleExport('json')}>
          <MaterialCommunityIcons name="code-json" size={16} color="#1A6B5A" />
          <Text style={styles.exportBtnOutlineText}> Export JSON</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#1A3A33" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>System Reports</Text>
        <View>
          <Ionicons name="notifications-outline" size={22} color="#1A3A33" />
          <View style={styles.notifDot} />
        </View>
      </View>

      {/* Segmented Tabs */}
      <View style={styles.segmentWrap}>
        {['summary', 'detailed'].map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.segment, reportType === t && styles.segmentActive]}
            onPress={() => setReportType(t)}
          >
            <Text style={[styles.segmentText, reportType === t && styles.segmentTextActive]}>
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
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1A3A33' },
  notifDot: {
    position: 'absolute', top: -1, right: -1,
    width: 7, height: 7, borderRadius: 4, backgroundColor: '#E53935',
  },

  // Segmented tabs
  segmentWrap: {
    flexDirection: 'row', backgroundColor: '#E7EDEB',
    marginHorizontal: 16, marginTop: 14, marginBottom: 4,
    borderRadius: 14, padding: 4,
  },
  segment: {
    flex: 1, paddingVertical: 11, alignItems: 'center', borderRadius: 10,
  },
  segmentActive: {
    backgroundColor: '#13362C',
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 4, elevation: 2,
  },
  segmentText: { fontSize: 14, fontWeight: '600', color: '#8A9B95' },
  segmentTextActive: { color: '#fff' },

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
  heroValue: { fontSize: 44, fontWeight: '800', color: '#1A3A33', lineHeight: 50 },
  changePill: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  changeText: { fontSize: 12, fontWeight: '700', color: '#1A6B5A' },
  changeNote: { fontSize: 12, color: '#AAA', marginLeft: 2 },
  heroIcon: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: '#E4F2EE',
    justifyContent: 'center', alignItems: 'center',
  },

  // Dark stat card (Detailed tab)
  statRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  darkStatCard: {
    flex: 1, backgroundColor: '#13362C', borderRadius: 18, padding: 16,
  },
  darkStatLabel: { fontSize: 10, fontWeight: '700', color: '#9AC2B6', letterSpacing: 1, marginBottom: 8 },
  darkStatValue: { fontSize: 28, fontWeight: '800', color: '#fff' },
  darkChangePill: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  darkChangeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  darkChangeNote: { fontSize: 11, color: '#9AC2B6', marginLeft: 2 },
  avgScoreCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 18, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
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
  miniLabel: { fontSize: 11, color: '#AAA', fontWeight: '700', letterSpacing: 0.5, marginBottom: 8 },
  miniValueRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  miniValue: { fontSize: 26, fontWeight: '800', color: '#1A3A33' },
  miniSub: { fontSize: 11, color: '#AAA', marginTop: 6 },

  // Card
  card: {
    backgroundColor: '#fff', borderRadius: 18,
    marginHorizontal: 16, marginTop: 16, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#1A3A33', marginBottom: 10 },

  // Donut + legend
  donutRow: { flexDirection: 'row', alignItems: 'center' },
  legendCol: { flex: 1, marginLeft: 18 },
  legendRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7 },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  legendLabel: { flex: 1, fontSize: 13, color: '#1A3A33', fontWeight: '500' },
  legendPct: { fontSize: 13, fontWeight: '800' },

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

  // Export buttons
  exportBtn: {
    flex: 1, backgroundColor: '#13362C',
    flexDirection: 'row',
    paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  exportBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  exportBtnLight: {
    flex: 1, backgroundColor: '#E4F2EE',
    flexDirection: 'row',
    paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  exportBtnLightText: { color: '#1A6B5A', fontWeight: '700', fontSize: 13 },
  exportBtnOutline: {
    flexDirection: 'row', borderWidth: 1.5, borderColor: '#13362C',
    paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  exportBtnOutlineText: { color: '#13362C', fontWeight: '700', fontSize: 13 },

  // Filter chips
  chipBar: { paddingHorizontal: 16, paddingTop: 14, gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#E0E0E0',
    backgroundColor: '#fff',
  },
  chipActive: { backgroundColor: '#13362C', borderColor: '#13362C' },
  chipText: { fontSize: 12, fontWeight: '600', color: '#666' },
  chipTextActive: { color: '#fff' },

  // Detail cards
  detailCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 5, elevation: 1,
  },
  detailTopRow: { flexDirection: 'row', alignItems: 'center' },
  detailAvatar: {
    width: 42, height: 42, borderRadius: 21,
    justifyContent: 'center', alignItems: 'center',
  },
  detailAvatarText: { fontSize: 15, fontWeight: '700' },
  detailName: { fontSize: 15, fontWeight: '700', color: '#1A3A33' },
  detailReg: { fontSize: 11, color: '#999', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  statusBadgeText: { fontSize: 10, fontWeight: '700' },
  detailDivider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 12 },
  detailGrid: { flexDirection: 'row', marginBottom: 10 },
  detailGridCell: { flex: 1 },
  detailGridLabel: { fontSize: 10, fontWeight: '700', color: '#AAA', letterSpacing: 0.5, marginBottom: 4 },
  detailGridValue: { fontSize: 13, fontWeight: '600', color: '#1A3A33' },
  noData: { textAlign: 'center', color: '#AAA', fontSize: 14, paddingVertical: 24 },
});

export default Reports;