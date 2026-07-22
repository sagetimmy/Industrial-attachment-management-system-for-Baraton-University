import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton, SkeletonLines, SkeletonCircle } from './Skeletonloader';

function StatCard() {
  return (
    <View style={styles.statCard}>
      <Skeleton width={36} height={36} radius={8} />
      <Skeleton width="70%" height={20} style={{ marginTop: 12 }} />
      <Skeleton width="40%" height={12} style={{ marginTop: 6 }} />
    </View>
  );
}

function StatGrid({ count = 4 }) {
  return (
    <View style={styles.statGrid}>
      {Array.from({ length: count }).map((_, i) => (
        <StatCard key={i} />
      ))}
    </View>
  );
}

function QuickActionsRow({ count = 4 }) {
  return (
    <View style={styles.quickActions}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} width={64} height={64} radius={12} />
      ))}
    </View>
  );
}

function ListCard() {
  return (
    <View style={styles.listCard}>
      <SkeletonCircle size={40} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <SkeletonLines count={2} lineHeight={12} gap={6} lastLineWidth="50%" />
      </View>
      <Skeleton width={60} height={24} radius={12} />
    </View>
  );
}

function ListSection({ rows = 4 }) {
  return (
    <View style={{ marginTop: 20 }}>
      <Skeleton width={140} height={16} style={{ marginBottom: 12 }} />
      {Array.from({ length: rows }).map((_, i) => (
        <ListCard key={i} />
      ))}
    </View>
  );
}

function StudentTopBar() {
  return (
    <View style={stuStyles.topBar}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <SkeletonCircle size={44} />
        <View>
          <Skeleton width={140} height={15} />
          <Skeleton width={90} height={11} style={{ marginTop: 6 }} />
        </View>
      </View>
      <Skeleton width={38} height={38} radius={19} />
    </View>
  );
}

function StudentSessionBanner() {
  return (
    <View style={stuStyles.sessionBanner}>
      <Skeleton width={20} height={20} radius={10} />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Skeleton width="50%" height={13} />
        <Skeleton width="70%" height={11} style={{ marginTop: 5 }} />
      </View>
    </View>
  );
}

function StudentHeroCard() {
  return (
    <View style={stuStyles.heroCard}>
      <Skeleton width={70} height={18} radius={20} style={{ marginBottom: 10, backgroundColor: 'rgba(255,255,255,0.3)' }} />
      <Skeleton width="60%" height={20} style={{ marginBottom: 6, backgroundColor: 'rgba(255,255,255,0.3)' }} />
      <Skeleton width="40%" height={13} style={{ marginBottom: 18, backgroundColor: 'rgba(255,255,255,0.3)' }} />
      <Skeleton width="100%" height={6} radius={3} style={{ backgroundColor: 'rgba(255,255,255,0.25)' }} />
    </View>
  );
}

function StudentStatsRow() {
  return (
    <View style={stuStyles.statsRow}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={stuStyles.statCard}>
          <Skeleton width={28} height={20} style={{ marginBottom: 6 }} />
          <Skeleton width="60%" height={9} />
        </View>
      ))}
    </View>
  );
}

function StudentQuickActionsGrid() {
  return (
    <View style={stuStyles.grid}>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={stuStyles.actionCard}>
          <Skeleton width={42} height={42} radius={12} style={{ marginBottom: 10 }} />
          <Skeleton width="70%" height={12} />
          <Skeleton width="90%" height={10} style={{ marginTop: 5 }} />
        </View>
      ))}
    </View>
  );
}

function StudentActivityList() {
  return (
    <View style={{ paddingHorizontal: 16, gap: 10 }}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={stuStyles.activityItem}>
          <Skeleton width={40} height={40} radius={10} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Skeleton width="55%" height={12} />
            <Skeleton width="75%" height={11} style={{ marginTop: 5 }} />
          </View>
          <Skeleton width={30} height={10} />
        </View>
      ))}
    </View>
  );
}

export function StudentDashboardSkeleton() {
  return (
    <View style={stuStyles.root}>
      <StudentTopBar />
      <StudentSessionBanner />
      <StudentHeroCard />
      <StudentStatsRow />
      <Skeleton width={120} height={13} style={{ marginLeft: 16, marginBottom: 10 }} />
      <StudentQuickActionsGrid />
      <Skeleton width={130} height={13} style={{ marginLeft: 16, marginTop: 10, marginBottom: 10 }} />
      <StudentActivityList />
    </View>
  );
}

const stuStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff', paddingTop: 52 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  sessionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#F9FAFB',
  },
  heroCard: {
    margin: 16,
    marginTop: 4,
    backgroundColor: '#0F6E56',
    borderRadius: 18,
    padding: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#F6F7F9',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
  },
  actionCard: {
    width: '46%',
    margin: '2%',
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#F6F7F9',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#F6F7F9',
  },
});

function SupervisorTopBar() {
  return (
    <View style={supStyles.topBar}>
      <Skeleton width={36} height={36} radius={18} />
      <Skeleton width={150} height={17} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Skeleton width={36} height={36} radius={18} />
        <Skeleton width={34} height={34} radius={17} />
      </View>
    </View>
  );
}

function SupervisorStatsCard() {
  return (
    <View style={supStyles.statsCard}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ flex: 1, alignItems: 'center' }}>
          <Skeleton width="70%" height={12} style={{ marginBottom: 8 }} />
          <Skeleton width={30} height={22} />
        </View>
      ))}
    </View>
  );
}

function SupervisorStudentCard() {
  return (
    <View style={supStyles.studentCard}>
      <SkeletonCircle size={52} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Skeleton width="60%" height={14} />
        <Skeleton width="80%" height={12} style={{ marginTop: 6 }} />
      </View>
      <SkeletonCircle size={44} />
    </View>
  );
}

export function SupervisorDashboardSkeleton() {
  return (
    <View style={supStyles.wrapper}>
      <SupervisorTopBar />
      <View style={{ paddingHorizontal: '4.5%' }}>
        <SupervisorStatsCard />
        <Skeleton width={140} height={13} style={{ marginBottom: 12, marginTop: 4 }} />
        {[0, 1, 2].map((i) => (
          <SupervisorStudentCard key={i} />
        ))}
      </View>
    </View>
  );
}

const supStyles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#EEF4F1', paddingTop: 55 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: '5%',
    paddingBottom: 14,
  },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.07)',
    padding: 18,
    flexDirection: 'row',
    marginBottom: 14,
  },
  studentCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.07)',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
});


function AdminNavyHeader() {
  return (
    <View style={adminStyles.navySection}>
      <View style={adminStyles.header}>
        <Skeleton width={140} height={17} style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Skeleton width={24} height={24} radius={12} style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />
          <Skeleton width={36} height={36} radius={18} style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />
        </View>
      </View>
      <View style={adminStyles.statsGrid}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={adminStyles.statCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <Skeleton width={34} height={34} radius={17} style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
              <Skeleton width={70} height={10} style={{ marginLeft: 8, backgroundColor: 'rgba(255,255,255,0.1)' }} />
            </View>
            <Skeleton width={50} height={26} style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />
          </View>
        ))}
      </View>
    </View>
  );
}

function AdminQuickActionsGrid() {
  return (
    <View style={adminStyles.actionsGrid}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={adminStyles.actionCard}>
          <Skeleton width={28} height={28} radius={8} />
          <Skeleton width="70%" height={10} style={{ marginTop: 10 }} />
        </View>
      ))}
    </View>
  );
}

function AdminActivityCard() {
  return (
    <View style={adminStyles.activityCard}>
      <View style={{ flexDirection: 'row' }}>
        <SkeletonCircle size={52} />
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Skeleton width="45%" height={14} />
          <Skeleton width="80%" height={12} style={{ marginTop: 8 }} />
        </View>
      </View>
    </View>
  );
}

export function AdminDashboardSkeleton() {
  return (
    <View style={{ flex: 1, backgroundColor: '#0D1B2E' }}>
      <AdminNavyHeader />
      <View style={adminStyles.scroll}>
        <Skeleton width={130} height={16} style={{ marginTop: 20, marginBottom: 14 }} />
        <AdminQuickActionsGrid />
        <Skeleton width={140} height={16} style={{ marginTop: 20, marginBottom: 14 }} />
        {[0, 1, 2].map((i) => (
          <AdminActivityCard key={i} />
        ))}
      </View>
    </View>
  );
}

const adminStyles = StyleSheet.create({
  navySection: {
    backgroundColor: '#0D1B2E',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    width: '47%',
    backgroundColor: '#162338',
    borderRadius: 16,
    padding: 16,
  },
  scroll: {
    flex: 1,
    backgroundColor: '#F7F8FA',
    paddingHorizontal: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionCard: {
    width: '31%',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activityCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
});

function HostTopBar() {
  return (
    <View style={hostStyles.topBar}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
        <Skeleton width={34} height={34} radius={17} />
        <Skeleton width={140} height={16} />
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Skeleton width={22} height={22} radius={11} />
        <Skeleton width={22} height={22} radius={11} />
      </View>
    </View>
  );
}

function HostWelcomeBlock() {
  return (
    <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
      <Skeleton width="70%" height={26} />
      <Skeleton width="85%" height={13} style={{ marginTop: 8 }} />
    </View>
  );
}

function HostHeroCard() {
  return (
    <View style={hostStyles.hero}>
      <Skeleton width={80} height={11} style={{ marginBottom: 10, backgroundColor: 'rgba(255,255,255,0.3)' }} />
      <Skeleton width="60%" height={22} style={{ marginBottom: 18, backgroundColor: 'rgba(255,255,255,0.3)' }} />
      <Skeleton width={160} height={38} radius={30} style={{ backgroundColor: 'rgba(255,255,255,0.3)' }} />
    </View>
  );
}

function HostStatRow() {
  return (
    <View style={hostStyles.statRow}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={hostStyles.statCardSm}>
          <Skeleton width={30} height={20} />
          <Skeleton width="80%" height={9} style={{ marginTop: 8 }} />
        </View>
      ))}
    </View>
  );
}

function HostRecentRow() {
  return (
    <View style={hostStyles.recentRow}>
      <SkeletonCircle size={44} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Skeleton width="55%" height={13} />
        <Skeleton width="40%" height={11} style={{ marginTop: 6 }} />
      </View>
      <Skeleton width={70} height={20} radius={20} />
    </View>
  );
}

function HostInternCard() {
  return (
    <View style={hostStyles.internCard}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <SkeletonCircle size={44} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Skeleton width="50%" height={14} />
          <Skeleton width="70%" height={11} style={{ marginTop: 6 }} />
        </View>
      </View>
      <Skeleton width="100%" height={6} radius={3} />
    </View>
  );
}

export function HostOrgDashboardSkeleton() {
  return (
    <View style={hostStyles.root}>
      <HostTopBar />
      <HostWelcomeBlock />
      <HostHeroCard />
      <HostStatRow />
      <Skeleton width={160} height={16} style={{ marginLeft: 16, marginBottom: 12 }} />
      {[0, 1].map((i) => (
        <HostRecentRow key={i} />
      ))}
      <Skeleton width={160} height={16} style={{ marginLeft: 16, marginTop: 12, marginBottom: 12 }} />
      {[0, 1].map((i) => (
        <HostInternCard key={i} />
      ))}
    </View>
  );
}

const hostStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F0F4F3', paddingTop: 14 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  hero: {
    backgroundColor: '#0F6E56',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    padding: 22,
  },
  statRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  statCardSm: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    padding: 12,
  },
  internCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
  },
});

const styles = StyleSheet.create({
  screen: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flexBasis: '47%',
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#F6F7F9',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F6F7F9',
    marginBottom: 10,
  },
});