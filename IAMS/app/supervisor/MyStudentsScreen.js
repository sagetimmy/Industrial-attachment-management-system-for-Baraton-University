import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert,
  ActivityIndicator, RefreshControl, TextInput, useWindowDimensions,
  Image
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../constants/colors';
import api from '../../api/axios';
import Card from '../../components/Card';
import Button from '../../components/Button';

function AvatarPlaceholder({ initials, color = '#0F6E56', size = 48 }) {
  return (
    <View
      style={[
        styles.avatar,
        { backgroundColor: color, width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={[styles.avatarText, { fontSize: size * 0.33 }]}>{initials}</Text>
    </View>
  );
}

function ProgressBar({ percentage = 0, height = 8, color = '#0F6E56' }) {
  return (
    <View style={[styles.progressBarContainer, { height }]}>
      <View
        style={[
          styles.progressBarFill,
          {
            width: `${Math.min(percentage, 100)}%`,
            backgroundColor: color,
            height,
          },
        ]}
      />
    </View>
  );
}

function StatusBadge({ status }) {
  const statusConfig = {
    'urgent-review': {
      label: 'URGENT REVIEW',
      backgroundColor: '#FFF3E0',
      textColor: '#E67E22',
    },
    'on-track': {
      label: 'ON TRACK',
      backgroundColor: '#E8F5E9',
      textColor: '#27AE60',
    },
    'idle': {
      label: 'IDLE',
      backgroundColor: '#F4F4F4',
      textColor: '#999999',
    },
    'new-content': {
      label: 'NEW CONTENT',
      backgroundColor: '#E0F2F1',
      textColor: '#00897B',
    },
    'pending-approval': {
      label: 'PENDING APPROVAL',
      backgroundColor: '#FFF9E6',
      textColor: '#F39C12',
    },
  };

  const config = statusConfig[status] || statusConfig['pending-approval'];

  return (
    <View style={[styles.badge, { backgroundColor: config.backgroundColor }]}>
      <Text style={[styles.badgeText, { color: config.textColor }]}>
        {config.label}
      </Text>
    </View>
  );
}

function StudentCard({ student, onPress, isTablet }) {
  // Calculate progress based on logbook entries
  const progress = Math.min((student.logbook_count || 0) * 15, 100);

  // Determine status
  const getStatus = () => {
    if (student.status === 'pending') return 'pending-approval';
    if (progress < 30) return 'urgent-review';
    if (progress >= 80) return 'on-track';
    if (progress === 0) return 'new-content';
    return 'on-track';
  };

  const initials = (student.full_name || 'S')
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const progressColor = progress >= 80 ? '#27AE60' : progress >= 30 ? '#0F6E56' : '#E67E22';
  const lastActive = student.lastActive || 'Never';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={isTablet ? styles.studentCardTabletWrapper : undefined}
    >
      <Card style={styles.studentCard}>
        <View style={styles.studentHeader}>
          <View style={styles.studentInfo}>
            <AvatarPlaceholder initials={initials} color="#0F6E56" />
            <View style={styles.studentName}>
              <Text style={styles.name} numberOfLines={1}>{student.full_name}</Text>
              <Text style={styles.company} numberOfLines={1}>{student.org_name || 'N/A'}</Text>
            </View>
          </View>
          <StatusBadge status={getStatus()} />
        </View>

        <View style={styles.progressSection}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>PROGRAM PROGRESS</Text>
            <View style={styles.progressContainer}>
              <ProgressBar percentage={progress} color={progressColor} />
              <Text style={[styles.percentage, { color: progressColor }]}
              >
                {Math.round(progress)}%
              </Text>
            </View>
          </View>

          <View style={styles.lastActive}>
            <Text style={styles.label}>LAST ACTIVE</Text>
            <Text style={styles.activeTime}>{lastActive}</Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

export default function MyStudentsScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const isTablet = width >= 768;
  const horizontalPadding = width >= 1024 ? 32 : width >= 768 ? 24 : 16;
  const maxContentWidth = 1000;

  const fetchStudents = async () => {
    try {
      // Fetch both students and logbooks in parallel
      const [studentsRes, logbooksRes] = await Promise.all([
        api.get('/supervisors/students'),
        api.get('/supervisors/logbooks'),
      ]);

      const studentsData = studentsRes.data || [];
      const logbooksData = logbooksRes.data || [];

      // Calculate last active for each student based on their logbook submissions
      const studentsWithLastActive = studentsData.map(student => {
        const studentLogbooks = logbooksData.filter(
          log => log.attachment_id === student.attachment_id
        );

        let lastActive = 'Never';
        if (studentLogbooks.length > 0) {
          // Get the most recent logbook submission
          const latestLog = studentLogbooks.reduce((latest, current) => {
            const latestDate = new Date(latest.submitted_at || 0);
            const currentDate = new Date(current.submitted_at || 0);
            return currentDate > latestDate ? current : latest;
          });

          if (latestLog.submitted_at) {
            const diff = Math.floor((Date.now() - new Date(latestLog.submitted_at)) / 1000);
            if (diff < 60) lastActive = 'Just now';
            else if (diff < 3600) lastActive = `${Math.floor(diff / 60)}m ago`;
            else if (diff < 86400) lastActive = `${Math.floor(diff / 3600)}h ago`;
            else if (diff < 604800) lastActive = `${Math.floor(diff / 86400)}d ago`;
            else lastActive = `${Math.floor(diff / 604800)}w ago`;
          }
        }

        return {
          ...student,
          lastActive,
        };
      });

      setStudents(studentsWithLastActive);
      applyFilters(studentsWithLastActive, activeFilter, searchQuery);
    } catch (err) {
      console.error('Fetch error:', err);
      Alert.alert('Error', err.response?.data?.message || 'Failed to load students');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const applyFilters = (data, filter, query) => {
    let filtered = data;

    // Apply status filter
    if (filter === 'pending') {
      filtered = filtered.filter(s => s.status === 'pending');
    } else if (filter === 'low-progress') {
      filtered = filtered.filter(s => {
        const progress = Math.min((s.logbook_count || 0) * 15, 100);
        return progress < 50;
      });
    }

    // Apply search query
    if (query.trim()) {
      filtered = filtered.filter(
        s =>
          (s.full_name || '').toLowerCase().includes(query.toLowerCase()) ||
          (s.org_name || '').toLowerCase().includes(query.toLowerCase())
      );
    }

    setFilteredStudents(filtered);
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    applyFilters(students, activeFilter, text);
  };

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    applyFilters(students, filter, searchQuery);
  };

  const handleStudentPress = (student) => {
    navigation.navigate('StudentDetail', {
      student,
      attachmentId: student.attachment_id,
    });
  };

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchStudents();
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
    >
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal: horizontalPadding,
            paddingBottom: insets.bottom + 24,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.contentInner, { maxWidth: maxContentWidth, alignSelf: 'center', width: '100%' }]}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={handleBack}
              style={styles.backButton}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.backButtonIcon}>←</Text>
            </TouchableOpacity>

            <View style={styles.headerTitleRow}>
              <Text style={[styles.title, isTablet && styles.titleTablet]}>My Students</Text>
              <View style={styles.totalBadge}>
                <Text style={styles.totalText}>{students.length} TOTAL</Text>
              </View>
            </View>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or company..."
              value={searchQuery}
              onChangeText={handleSearch}
              placeholderTextColor="#CCCCCC"
            />
          </View>

          {/* Filter Tabs */}
          <View style={styles.filterContainer}>
            {[
              { id: 'all', label: 'All Students' },
              { id: 'pending', label: 'Pending Approval' },
              { id: 'low-progress', label: 'Low Progress' },
            ].map(filter => (
              <TouchableOpacity
                key={filter.id}
                style={[
                  styles.filterTab,
                  activeFilter === filter.id && styles.filterTabActive,
                ]}
                onPress={() => handleFilterChange(filter.id)}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    activeFilter === filter.id && styles.filterTabTextActive,
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Students List */}
          {filteredStudents.length > 0 ? (
            <View style={[styles.studentsList, isTablet && styles.studentsListTablet]}>
              {filteredStudents.map((student, index) => (
                <StudentCard
                  key={`${student.attachment_id}-${index}`}
                  student={student}
                  onPress={() => handleStudentPress(student)}
                  isTablet={isTablet}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No students found</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F4F4',
  },
  content: {
    flexGrow: 1,
  },
  contentInner: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F4F4',
  },

  // Header
  header: {
    marginBottom: 24,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  backButtonIcon: {
    fontSize: 18,
    color: '#1A3A33',
    fontWeight: '700',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
  },
  titleTablet: {
    fontSize: 32,
  },
  totalBadge: {
    backgroundColor: '#E0F2F1',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  totalText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00897B',
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 12,
    marginBottom: 16,
    height: 48,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333333',
  },

  // Filters
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#F4F4F4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: 4,
    marginBottom: 16,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterTabActive: {
    backgroundColor: '#0F6E56',
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },

  // Students list & cards
  studentsList: {},
  studentsListTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  studentCardTabletWrapper: {
    width: '48.5%',
  },
  studentCard: {
    marginBottom: 12,
  },
  studentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  studentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  studentName: {
    marginLeft: 12,
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A3A33',
  },
  company: {
    fontSize: 13,
    color: '#888888',
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  progressSection: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 9,
    fontWeight: '700',
    color: '#AAAAAA',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBarContainer: {
    flex: 1,
    backgroundColor: '#E8F0EE',
    borderRadius: 10,
    overflow: 'hidden',
  },
  progressBarFill: {
    borderRadius: 10,
  },
  percentage: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 8,
  },
  lastActive: {
    alignItems: 'flex-end',
    minWidth: 80,
    marginLeft: 12,
  },
  activeTime: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A3A33',
  },

  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#888888',
  },
});