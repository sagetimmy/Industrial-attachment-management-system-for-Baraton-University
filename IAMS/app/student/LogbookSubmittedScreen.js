import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const NAVY = '#0F2419';
const TEAL = '#0F6E56';
const TEAL_LIGHT = '#DCEFEA';
const BG = '#EFF4F3';
const WHITE = '#FFFFFF';
const GRAY = '#8899AA';
const TEXT = '#111111';

export default function LogbookSubmittedScreen({ navigation, route }) {
  const { logbook } = route.params || {};

  const weekNumber = logbook?.week_number ?? '—';
  const hoursWorked = logbook?.hours_worked ?? '—';
  const submittedDate = logbook?.submitted_at
    ? new Date(logbook.submitted_at).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—';

  // Adjust the target route/nav name to match your student stack —
  // e.g. if StudentDashboard lives inside a Drawer nested in the outer
  // Stack (same shape as HostOrgDrawer -> HostDashboard below), you'll
  // need to navigate to the drawer route and pass { screen: '...' }
  // instead of navigating to 'StudentDashboard' directly.
  const goToDashboard = () => {
    navigation.navigate('StudentDashboard');
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={goToDashboard} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={WHITE} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Logbook</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={s.content}>
        <View style={s.checkCircle}>
          <MaterialCommunityIcons name="check" size={48} color={TEAL} />
        </View>

        <Text style={s.successTitle}>Logbook Entry{'\n'}Submitted!</Text>
        <Text style={s.successSubtitle}>
          Your weekly entry has been saved and is now visible to your supervisor.
        </Text>

        <View style={s.card}>
          <View style={s.cardTopRow}>
            <View style={s.iconBox}>
              <MaterialCommunityIcons name="notebook-outline" size={22} color={TEAL} />
            </View>
            <View style={s.liveBadge}>
              <Text style={s.liveBadgeText}>SUBMITTED</Text>
            </View>
          </View>

          <Text style={s.cardTitle}>Week {weekNumber}</Text>
          <View style={s.deptRow}>
            <MaterialCommunityIcons name="calendar-outline" size={14} color={GRAY} />
            <Text style={s.cardDept}>{submittedDate}</Text>
          </View>

          <View style={s.divider} />

          <View style={s.cardBottomRow}>
            <View style={s.slotsRow}>
              <MaterialCommunityIcons name="clock-outline" size={16} color={TEXT} />
              <Text style={s.slotsText}>{hoursWorked} Hours Logged</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Footer CTA */}
      <View style={s.footer}>
        <TouchableOpacity style={s.primaryBtn} onPress={goToDashboard}>
          <Text style={s.primaryBtnText}>Back to Dashboard</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  header: {
    backgroundColor: NAVY,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  backBtn: { padding: 4 },
  headerTitle: { color: WHITE, fontSize: 18, fontWeight: '700' },

  content: { flex: 1, alignItems: 'center', paddingHorizontal: 24, paddingTop: 36 },
  checkCircle: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: TEAL_LIGHT,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24, fontWeight: '800', color: TEAL,
    textAlign: 'center', lineHeight: 30, marginBottom: 12,
  },
  successSubtitle: {
    fontSize: 14, color: GRAY, textAlign: 'center',
    lineHeight: 20, marginBottom: 28,
  },

  card: {
    width: '100%', backgroundColor: WHITE, borderRadius: 20, padding: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  cardTopRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 12,
  },
  iconBox: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: TEAL_LIGHT, alignItems: 'center', justifyContent: 'center',
  },
  liveBadge: {
    backgroundColor: TEAL, borderRadius: 14,
    paddingHorizontal: 10, paddingVertical: 6, maxWidth: 130,
  },
  liveBadgeText: {
    color: WHITE, fontSize: 9, fontWeight: '700',
    textAlign: 'center', letterSpacing: 0.3,
  },
  cardTitle: { fontSize: 17, fontWeight: '800', color: TEXT, marginBottom: 4 },
  deptRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 14 },
  cardDept: { fontSize: 13, color: GRAY },
  divider: { height: 1, backgroundColor: '#EEE', marginBottom: 14 },
  cardBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  slotsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  slotsText: { fontSize: 13, fontWeight: '600', color: TEXT },

  footer: { paddingHorizontal: 24, paddingBottom: 20 },
  primaryBtn: {
    backgroundColor: TEAL, borderRadius: 30, paddingVertical: 15,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  primaryBtnText: { color: WHITE, fontWeight: '700', fontSize: 15 },
});