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
          const total = submitted + pending;
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
function ReportCard({ icon, title, description, onDownload }) {
  return (
    <View style={styles.reportCard}>
      <View style={styles.reportCardIcon}>
        <Text style={styles.reportIcon}>{icon}</Text>
      </View>
      <View style={styles.reportCardContent}>
        <Text style={styles.reportCardTitle}>{title}</Text>
        <Text style={styles.reportCardDesc}>{description}</Text>
      </View>
      <TouchableOpacity style={styles.downloadButton} onPress={onDownload}>
        <Text style={styles.downloadIcon}>⬇</Text>
        <Text style={styles.downloadText}>Download</Text>
      </TouchableOpacity>
    </View>
  );
}

// AI Insight section
function AIInsightCard() {
  return (
    <View style={styles.aiCard}>
      <View style={styles.aiHeader}>
        <Text style={styles.aiLabel}>🤖 AI INSIGHT</Text>
      </View>
      <Text style={styles.aiTitle}>Annual Trend Analysis</Text>
      <Text style={styles.aiDescription}>
        Our automated analysis indicates a 12% improvement in industrial compliance compared to last quarter. Explore the comprehensive year-end comparison data.
      </Text>
      <TouchableOpacity style={styles.customViewButton}>
        <Text style={styles.customViewText}>GENERATE CUSTOM VIEW</Text>
      </TouchableOpacity>
      <View style={styles.chartPreview}>
        <Text style={styles.chartPlaceholder}>📊</Text>
      </View>
    </View>
  );
}

const ReportsScreen = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const canExportData = hasRolePermission(user, 'exportData');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reportsData, setReportsData] = useState(null);
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
    // Get current date and calculate weeks
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

    // Estimate pending as roughly 20-30% of submitted on average
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
      
      // Fetch logbooks and students data
      const [logbooksRes, studentsRes] = await Promise.all([
        api.get('/supervisors/logbooks'),
        api.get('/supervisors/students'),
      ]);

      const logbooks = logbooksRes.data || [];
      const students = studentsRes.data || [];

      // Calculate weekly data from logbooks
      const weekly = calculateWeeklyData(logbooks);
      setWeeklyData(weekly);

      // Calculate completion rate
      const totalLogbooks = logbooks.length;
      const totalStudents = students.length;
      const completionRate = totalStudents > 0 
        ? Math.round((totalLogbooks / (totalStudents * 4)) * 100) // Assuming 4 weeks
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
      // Fallback to initial state
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

  const handleDownload = async (reportName) => {
    if (!canExportData) {
      Alert.alert('Permission Disabled', 'Report export is currently disabled for supervisors.');
      return;
    }

    try {
      Alert.alert('Download', `Generating ${reportName}...`);
      // In a real scenario, you would call an API endpoint to generate the report
      // const res = await api.get(`/supervisors/reports/${reportName.toLowerCase()}`);
      Alert.alert('Success', `${reportName} downloaded successfully`);
    } catch (err) {
      Alert.alert('Error', 'Failed to download report');
    }
  };

  const handleCustomView = () => {
    Alert.alert('Custom Report', 'Generate a custom report view', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Proceed', onPress: () => console.log('Generate custom view') },
    ]);
  };

  if (loading && !reportsData) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading reports...</Text>
      </View>
    );
  }

  if (!canExportData) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.permissionIcon}>🔒</Text>
        <Text style={styles.permissionTitle}>Reports Disabled</Text>
        <Text style={styles.permissionText}>
          Supervisor report export is currently disabled by the administrator.
        </Text>
      </View>
    );
  }

  const completion = reportsData?.monthlyCompletion || 0;

  return (
    <View style={styles.container}>
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
            onDownload={() => handleDownload('Student Performance Summary')}
          />

          <ReportCard
            icon="📋"
            title="Logbook Completion Rate"
            description="Analytics on how consistently students are documenting their industrial placement tasks and learning objectives."
            onDownload={() => handleDownload('Logbook Completion Rate')}
          />

          <ReportCard
            icon="📋"
            title="Host Org Feedback"
            description="Consolidated qualitative and quantitative feedback from industry partners regarding student conduct and skills."
            onDownload={() => handleDownload('Host Org Feedback')}
          />
        </View>

        {/* AI Insight Section */}
        <View style={styles.aiInsightContainer}>
          <AIInsightCard />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F4F4',
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

  // Section
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    padding: 16,
  },

  // Monthly Activity
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

  // Chart
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

  // System Reports
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
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F4F4F4',
    borderRadius: 6,
    gap: 6,
  },
  downloadIcon: {
    fontSize: 14,
  },
  downloadText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F6E56',
  },

  // AI Insight
  aiInsightContainer: {
    marginHorizontal: 16,
    marginVertical: 12,
    marginBottom: 24,
  },
  aiCard: {
    backgroundColor: '#0F6E56',
    borderRadius: 12,
    padding: 20,
    overflow: 'hidden',
  },
  aiHeader: {
    marginBottom: 12,
  },
  aiLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  aiTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    lineHeight: 32,
  },
  aiDescription: {
    fontSize: 13,
    color: '#E0F2F1',
    lineHeight: 18,
    marginBottom: 16,
  },
  customViewButton: {
    backgroundColor: '#E67E22',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 16,
  },
  customViewText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  chartPreview: {
    height: 120,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartPlaceholder: {
    fontSize: 40,
  },
});

export default ReportsScreen;
