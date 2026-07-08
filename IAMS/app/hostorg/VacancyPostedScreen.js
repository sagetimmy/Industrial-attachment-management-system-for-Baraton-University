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

export default function VacancyPostedScreen({ navigation, route }) {
  const { vacancy } = route.params || {};

  const title = vacancy?.role_title || 'Vacancy';
  const department = vacancy?.department || '—';
  const slots = vacancy?.available_slots ?? '—';

  // VacancyPosted lives in the outer Stack (see HostOrgNavigator in App.js),
  // while HostDashboard is a Drawer.Screen nested inside the "HostOrgDrawer"
  // route. Navigating to "HostDashboard" directly from here does nothing
  // because that route name doesn't exist in this navigator — you have to
  // target the nested navigator and tell it which screen to land on.
  const goToDashboard = () => {
    navigation.navigate('HostOrgDrawer', { screen: 'HostDashboard' });
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={goToDashboard} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={WHITE} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Vacancy Management</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={s.content}>
        <View style={s.checkCircle}>
          <MaterialCommunityIcons name="check" size={48} color={TEAL} />
        </View>

        <Text style={s.successTitle}>Vacancy Posted{'\n'}Successfully!</Text>
        <Text style={s.successSubtitle}>
          Your recruitment drive is now live and students can start applying immediately.
        </Text>

        <View style={s.card}>
          <View style={s.cardTopRow}>
            <View style={s.iconBox}>
              <MaterialCommunityIcons name="briefcase-outline" size={22} color={TEAL} />
            </View>
            <View style={s.liveBadge}>
              <Text style={s.liveBadgeText}>LIVE & ACCEPTING{'\n'}APPLICANTS</Text>
            </View>
          </View>

          <Text style={s.cardTitle} numberOfLines={2}>{title}</Text>
          <View style={s.deptRow}>
            <MaterialCommunityIcons name="office-building-outline" size={14} color={GRAY} />
            <Text style={s.cardDept}>{department}</Text>
          </View>

          <View style={s.divider} />

          <View style={s.cardBottomRow}>
            <View style={s.slotsRow}>
              <MaterialCommunityIcons name="account-group-outline" size={16} color={TEXT} />
              <Text style={s.slotsText}>
                {String(slots).padStart(2, '0')} Slots Available
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Footer CTA — single button now */}
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