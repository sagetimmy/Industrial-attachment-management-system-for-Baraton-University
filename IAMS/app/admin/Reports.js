import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { COLORS } from '../../constants/colors';

const { width } = Dimensions.get('window');

const Reports = ({ navigation }) => {
  const { user } = useAuth();
  const [reportType, setReportType] = useState('summary');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const [detailedData, setDetailedData] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const statusOptions = ['pending', 'approved', 'ongoing', 'completed', 'rejected'];
  const statusColors = {
    pending: '#FF9800',
    approved: '#2E7D32',
    ongoing: '#2196F3',
    completed: '#4CAF50',
    rejected: '#F44336',
  };

  useEffect(() => {
    if (reportType === 'summary') {
      fetchSummaryReport();
    } else {
      fetchDetailedReport();
    }
  }, [reportType, statusFilter, dateRange]);

  const fetchSummaryReport = async () => {
    try {
      setLoading(true);
      const params = {};
      if (dateRange.start) params.startDate = dateRange.start;
      if (dateRange.end) params.endDate = dateRange.end;

      const response = await api.get('/admin/reports/summary', { params });
      setSummaryData(response.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load report');
      console.error(error);
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
    } catch (error) {
      Alert.alert('Error', 'Failed to load detailed report');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (reportType === 'summary') {
      fetchSummaryReport().then(() => setRefreshing(false));
    } else {
      fetchDetailedReport().then(() => setRefreshing(false));
    }
  }, [reportType, statusFilter, dateRange]);

  const handleExport = async (format) => {
    try {
      Alert.alert('Export', `Exporting report as ${format.toUpperCase()}...`);
      // In a real app, you would generate the export file here
      Alert.alert('Success', `Report exported as ${format.toUpperCase()}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to export report');
    }
  };

  const renderStatCard = (title, value, color = COLORS.primary) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={styles.statLabel}>{title}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );

  const renderSummaryReport = () => {
    if (!summaryData) return null;

    // Calculate status counts
    const statusCounts = {};
    summaryData.statusBreakdown.forEach(item => {
      statusCounts[item.status] = item.count;
    });
    const totalAttachments = summaryData.totalAttachments || 0;

    return (
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Key Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Statistics</Text>
          {renderStatCard('Total Attachments', summaryData.totalAttachments, COLORS.primary)}
          {renderStatCard('Total Students', summaryData.totalStudents, '#2196F3')}
          {renderStatCard('Total Supervisors', summaryData.totalSupervisors, '#4CAF50')}
          {renderStatCard('Total Organizations', summaryData.totalOrgs, '#FF9800')}
        </View>

        {/* Status Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Attachment Status Breakdown</Text>
          {statusOptions.map(status => (
            <View key={status} style={styles.breakdownRow}>
              <View
                style={[styles.statusDot, { backgroundColor: statusColors[status] }]}
              />
              <Text style={styles.statusLabel}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
              <Text style={styles.breakdownCount}>
                {statusCounts[status] || 0} ({totalAttachments ? Math.round(((statusCounts[status] || 0) / totalAttachments) * 100) : 0}%)
              </Text>
            </View>
          ))}
        </View>

        {/* Top Organizations */}
        {summaryData.orgBreakdown && summaryData.orgBreakdown.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Host Organizations</Text>
            {summaryData.orgBreakdown.map((org, index) => (
              <View key={index} style={styles.breakdownRow}>
                <Text style={styles.rank}>{index + 1}</Text>
                <Text style={[styles.statusLabel, { flex: 1 }]}>{org.org_name}</Text>
                <Text style={styles.breakdownCount}>{org.count} placements</Text>
              </View>
            ))}
          </View>
        )}

        {/* Department Distribution */}
        {summaryData.deptBreakdown && summaryData.deptBreakdown.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Placements by Department</Text>
            {summaryData.deptBreakdown.map((dept, index) => (
              <View key={index} style={styles.breakdownRow}>
                <Text style={[styles.statusLabel, { flex: 1 }]}>{dept.department}</Text>
                <Text style={styles.breakdownCount}>{dept.count} students</Text>
              </View>
            ))}
          </View>
        )}

        {/* Export Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Export Report</Text>
          <View style={styles.exportButtons}>
            <TouchableOpacity
              style={styles.exportButton}
              onPress={() => handleExport('csv')}
            >
              <Text style={styles.exportButtonText}>📊 CSV</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.exportButton}
              onPress={() => handleExport('json')}
            >
              <Text style={styles.exportButtonText}>📄 JSON</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.exportButton}
              onPress={() => handleExport('pdf')}
            >
              <Text style={styles.exportButtonText}>📋 PDF</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderDetailedReport = () => {
    if (!detailedData) return null;

    return (
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Filters */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Filters</Text>
          <View style={styles.filterOptions}>
            <TouchableOpacity
              style={[
                styles.filterChip,
                !statusFilter && styles.filterChipActive,
              ]}
              onPress={() => setStatusFilter('')}
            >
              <Text style={styles.filterChipText}>All Status</Text>
            </TouchableOpacity>
            {statusOptions.map(status => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filterChip,
                  statusFilter === status && styles.filterChipActive,
                ]}
                onPress={() => setStatusFilter(status)}
              >
                <Text style={styles.filterChipText}>{status}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Detailed List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Detailed Report ({detailedData.pagination.total} records)
          </Text>
          {detailedData.details.length > 0 ? (
            detailedData.details.map((item, index) => (
              <View key={item.attachment_id} style={styles.detailRow}>
                <View style={styles.detailContent}>
                  <Text style={styles.studentName}>{item.student_name}</Text>
                  <Text style={styles.detail}>Reg: {item.reg_number}</Text>
                  <Text style={styles.detail}>Dept: {item.department}</Text>
                  <Text style={styles.detail}>Org: {item.org_name}</Text>
                  <Text style={styles.detail}>Logbooks: {item.logbook_count}</Text>
                  {item.evaluation_rating && (
                    <Text style={styles.detail}>Rating: {item.evaluation_rating}/5 ⭐</Text>
                  )}
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusColors[item.status] }]}>
                  <Text style={styles.statusBadgeText}>
                    {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.noData}>No data matching the filters</Text>
          )}
        </View>

        {/* Export Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Export Detailed Report</Text>
          <View style={styles.exportButtons}>
            <TouchableOpacity
              style={styles.exportButton}
              onPress={() => handleExport('csv')}
            >
              <Text style={styles.exportButtonText}>📊 CSV</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.exportButton}
              onPress={() => handleExport('json')}
            >
              <Text style={styles.exportButtonText}>📄 JSON</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reports</Text>
        <TouchableOpacity onPress={() => setShowFilters(!showFilters)}>
          <Text style={styles.filterIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Report Type Selector */}
      <View style={styles.reportTypeContainer}>
        <TouchableOpacity
          style={[
            styles.reportTypeButton,
            reportType === 'summary' && styles.reportTypeButtonActive,
          ]}
          onPress={() => setReportType('summary')}
        >
          <Text style={styles.reportTypeButtonText}>Summary</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.reportTypeButton,
            reportType === 'detailed' && styles.reportTypeButtonActive,
          ]}
          onPress={() => setReportType('detailed')}
        >
          <Text style={styles.reportTypeButtonText}>Detailed</Text>
        </TouchableOpacity>
      </View>

      {/* Loading State */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading report...</Text>
        </View>
      ) : (
        <>
          {reportType === 'summary' ? renderSummaryReport() : renderDetailedReport()}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 16,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  backButton: {
    color: 'white',
    fontSize: 16,
  },
  filterIcon: {
    fontSize: 18,
  },
  reportTypeContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    paddingHorizontal: 12,
  },
  reportTypeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  reportTypeButtonActive: {
    borderBottomColor: COLORS.primary,
  },
  reportTypeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.secondary,
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: 'white',
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 8,
    padding: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    paddingBottom: 8,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#888',
    fontSize: 14,
  },
  statCard: {
    backgroundColor: '#F9F9F9',
    borderLeftWidth: 4,
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  statusLabel: {
    fontSize: 14,
    color: COLORS.secondary,
    fontWeight: '500',
  },
  breakdownCount: {
    fontSize: 13,
    color: '#666',
    marginLeft: 'auto',
    fontWeight: '600',
  },
  rank: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: 'bold',
    marginRight: 10,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 12,
    color: COLORS.secondary,
    fontWeight: '500',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  detailContent: {
    flex: 1,
  },
  studentName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: 4,
  },
  detail: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
  noData: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
  },
  exportButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  exportButton: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    alignItems: 'center',
  },
  exportButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default Reports;
