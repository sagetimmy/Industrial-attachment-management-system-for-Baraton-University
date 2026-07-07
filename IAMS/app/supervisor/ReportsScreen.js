import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { COLORS } from '../../constants/colors';
import { hasRolePermission } from '../../utils/permissions';

// Chart component for weekly activity
function WeeklyActivityChart({ data }) {
  const weeks = ['WK 1', 'WK 2', 'WK 3', 'WK 4'];
  const maxValue = Math.max(...data.map(d => d.submitted + d.pending), 20);
  const chartHeight = 120;

  return (
    <View style={styles.chart}>
      <View style={styles.chartBars}>
        {weeks.map((week, index) => {
          const submitted = data[index]?.submitted || 0;
          const pending = data[index]?.pending || 0;
          const submittedHeight = (submitted / maxValue) * chartHeight;
          const pendingHeight = (pending / maxValue) * chartHeight;

          return (
            <View key={week} style={styles.barContainer}>
              <View style={styles.barStack}>
                {submittedHeight > 0 && (
                  <View
                    style={[
                      styles.barSegment,
                      { height: submittedHeight, backgroundColor: '#0F6E56' },
                    ]}
                  />
                )}
                {pendingHeight > 0 && (
                  <View
                    style={[
                      styles.barSegment,
                      { height: pendingHeight, backgroundColor: '#E67E22' },
                    ]}
                  />
                )}
              </View>
              <Text style={styles.weekLabel}>{week}</Text>
            </View>
          );
        })}
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#0F6E56' }]} />
          <Text style={styles.legendText}>Submitted</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#E67E22' }]} />
          <Text style={styles.legendText}>Pending</Text>
        </View>
      </View>
    </View>
  );
}

// Report card component
function ReportCard({ icon, title, description, onDownload, downloading }) {
  return (
    <View style={styles.reportCard}>
      <View style={styles.reportCardIcon}>
        <Text style={styles.reportIcon}>{icon}</Text>
      </View>
      <View style={styles.reportCardContent}>
        <Text style={styles.reportCardTitle}>{title}</Text>
        <Text style={styles.reportCardDesc}>{description}</Text>
      </View>
      <TouchableOpacity
        style={[styles.downloadButton, downloading && styles.downloadButtonDisabled]}
        onPress={onDownload}
        disabled={downloading}
      >
        {downloading ? (
          <ActivityIndicator size="small" color="#0F6E56" />
        ) : (
          <>
            <Text style={styles.downloadIcon}>⬇</Text>
            <Text style={styles.downloadText}>Download</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

// Maps card keys to backend endpoint + a friendly filename
const REPORT_CONFIG = {
  'student-performance': {
    title: 'Student Performance Summary',
    endpoint: '/supervisors/reports/student-performance',
    filename: 'student-performance-summary.pdf',
  },
  'logbook-completion': {
    title: 'Logbook Completion Rate',
    endpoint: '/supervisors/reports/logbook-completion',
    filename: 'logbook-completion-rate.pdf',
  },
  'host-org-feedback': {
    title: 'Host Org Feedback',
    endpoint: '/supervisors/reports/host-org-feedback',
    filename: 'host-org-feedback.pdf',
  },
};

const ReportsScreen = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const canExportData = hasRolePermission(user, 'exportData');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reportsData, setReportsData] = useState(null);
  const [downloadingKey, setDownloadingKey] = useState(null);
  const [weeklyData, setWeeklyData] = useState([
    { submitted: 0, pending: 0 },
    { submitted: 0, pending: 0 },
    { submitted: 0, pending: 0 },
    { submitted: 0, pending: 0 },
  ]);

  useEffect(() => {
    fetchReports();
  }, []);

  const calculateWeeklyData = (logbooks) => {
    const now = new Date();
    const currentWeek = Math.ceil((now.getDate() - now.getDay()) / 7);

    const weeks = [
      { submitted: 0, pending: 0 },
      { submitted: 0, pending: 0 },
      { submitted: 0, pending: 0 },
      { submitted: 0, pending: 0 },
    ];

    logbooks.forEach(log => {
      const logDate = new Date(log.submitted_at);
      const logWeek = Math.ceil((logDate.getDate() - logDate.getDay()) / 7);
      const weekDiff = currentWeek - logWeek;

      if (weekDiff >= 0 && weekDiff < 4) {
        weeks[3 - weekDiff].submitted += 1;
      }
    });

    weeks.forEach(week => {
      week.pending = Math.ceil(week.submitted * 0.25);
    });

    return weeks;
  };

  const fetchReports = async () => {
    if (!canExportData) {
      setReportsData(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const [logbooksRes, studentsRes] = await Promise.all([
        api.get('/supervisors/logbooks'),
        api.get('/supervisors/students'),
      ]);

      const logbooks = logbooksRes.data || [];
      const students = studentsRes.data || [];

      const weekly = calculateWeeklyData(logbooks);
      setWeeklyData(weekly);

      const totalLogbooks = logbooks.length;
      const totalStudents = students.length;
      const completionRate = totalStudents > 0
        ? Math.round((totalLogbooks / (totalStudents * 4)) * 100)
        : 0;

      setReportsData({
        monthlyCompletion: Math.min(completionRate, 100),
        totalStudents: totalStudents,
        totalLogbooks: totalLogbooks,
        pendingReviews: students.filter(s => s.status === 'ongoing').length,
        logbooks: logbooks,
        students: students,
      });
    } catch (err) {
      console.log('Error fetching reports:', err.message);
      setReportsData({
        monthlyCompletion: 0,
        totalStudents: 0,
        totalLogbooks: 0,
        pendingReviews: 0,
        logbooks: [],
        students: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchReports().then(() => setRefreshing(false));
  };

  const handleDownload = async (reportKey) => {
    if (!canExportData) {
      Alert.alert('Permission Disabled', 'Report export is currently disabled for supervisors.');
      return;
    }

    const config = REPORT_CONFIG[reportKey];
    if (!config) return;

    setDownloadingKey(reportKey);

    try {
      // Fetch the PDF as base64 so it can be written straight to disk with
      // expo-file-system — avoids needing to manually attach auth headers,
      // since the shared `api` axios instance already handles that.
      const response = await api.get(config.endpoint, {
        responseType: 'arraybuffer',
      });

      const base64 = arrayBufferToBase64(response.data);
      const fileUri = `${FileSystem.cacheDirectory}${config.filename}`;

      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/pdf',
          dialogTitle: config.title,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Downloaded', `Saved to ${fileUri}`);
      }
    } catch (err) {
      console.log('Error downloading report:', err.message);
      Alert.alert('Error', 'Failed to generate report. Please try again.');
    } finally {
      setDownloadingKey(null);
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="arrow-back" size={24} color="#0F2419" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Reports</Text>
      <View style={styles.headerSpacer} />
    </View>
  );

  if (loading && !reportsData) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading reports...</Text>
        </View>
      </View>
    );
  }

  if (!canExportData) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.centerContainer}>
          <Text style={styles.permissionIcon}>🔒</Text>
          <Text style={styles.permissionTitle}>Reports Disabled</Text>
          <Text style={styles.permissionText}>
            Supervisor report export is currently disabled by the administrator.
          </Text>
        </View>
      </View>
    );
  }

  const completion = reportsData?.monthlyCompletion || 0;

  return (
    <View style={styles.container}>
      {renderHeader()}
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Monthly Activity Section */}
        <View style={styles.section}>
          <View style={styles.monthlyHeader}>
            <View>
              <Text style={styles.monthlyLabel}>Monthly Activity</Text>
              <Text style={styles.monthlySubtext}>
                Logbooks ({reportsData?.totalLogbooks || 0}) submitted from {reportsData?.totalStudents || 0} students
              </Text>
            </View>
            <View style={styles.completionBadge}>
              <Text style={styles.completionValue}>{completion}%</Text>
              <Text style={styles.completionLabel}>COMPLETION</Text>
            </View>
          </View>
          <WeeklyActivityChart data={weeklyData} />
        </View>

        {/* System Reports Section */}
        <View style={styles.systemReportsContainer}>
          <Text style={styles.systemReportsTitle}>● SYSTEM REPORTS</Text>

          <ReportCard
            icon="📋"
            title="Student Performance Summary"
            description="A detailed aggregate of student grades, attendance records, and project milestones for the current semester."
            onDownload={() => handleDownload('student-performance')}
            downloading={downloadingKey === 'student-performance'}
          />

          <ReportCard
            icon="📋"
            title="Logbook Completion Rate"
            description="Analytics on how consistently students are documenting their industrial placement tasks and learning objectives."
            onDownload={() => handleDownload('logbook-completion')}
            downloading={downloadingKey === 'logbook-completion'}
          />

          <ReportCard
            icon="📋"
            title="Host Org Feedback"
            description="Consolidated qualitative and quantitative feedback from industry partners regarding student conduct and skills."
            onDownload={() => handleDownload('host-org-feedback')}
            downloading={downloadingKey === 'host-org-feedback'}
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

// Converts an ArrayBuffer (from axios responseType: 'arraybuffer') into a
// base64 string, chunked to avoid call-stack limits on large PDFs.
function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }

  return global.btoa ? global.btoa(binary) : Buffer.from(binary, 'binary').toString('base64');
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F4F4',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F2419',
  },
  headerSpacer: {
    width: 32,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F4F4',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#999999',
  },
  permissionIcon: { fontSize: 42, marginBottom: 12 },
  permissionTitle: { fontSize: 18, fontWeight: '700', color: '#000000', marginBottom: 8 },
  permissionText: { fontSize: 14, color: '#666666', textAlign: 'center', lineHeight: 20, paddingHorizontal: 28 },

  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    padding: 16,
  },

  monthlyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  monthlyLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  monthlySubtext: {
    fontSize: 12,
    color: '#999999',
  },
  completionBadge: {
    backgroundColor: '#E0F2F1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  completionValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F6E56',
  },
  completionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0F6E56',
    marginTop: 2,
  },

  chart: {
    marginTop: 12,
  },
  chartBars: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 160,
    marginBottom: 12,
  },
  barContainer: {
    alignItems: 'center',
    flex: 1,
  },
  barStack: {
    height: 120,
    width: 32,
    backgroundColor: 'transparent',
    flexDirection: 'column-reverse',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barSegment: {
    width: '100%',
  },
  weekLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999999',
    marginTop: 8,
  },
  legend: {
    flexDirection: 'row',
    gap: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: '#666666',
  },

  systemReportsContainer: {
    marginHorizontal: 16,
    marginVertical: 12,
  },
  systemReportsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 12,
    letterSpacing: 1,
  },
  reportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    flexDirection: 'column',
  },
  reportCardIcon: {
    width: 44,
    height: 44,
    backgroundColor: '#E0F2F1',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  reportIcon: {
    fontSize: 20,
  },
  reportCardContent: {
    marginBottom: 12,
  },
  reportCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  reportCardDesc: {
    fontSize: 12,
    color: '#999999',
    lineHeight: 16,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F4F4F4',
    borderRadius: 6,
    gap: 6,
    minHeight: 34,
  },
  downloadButtonDisabled: {
    opacity: 0.7,
  },
  downloadIcon: {
    fontSize: 14,
  },
  downloadText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F6E56',
  },
});

export default ReportsScreen;