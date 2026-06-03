import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert
} from 'react-native';
import { useAuth } from '../context/AuthContext';

const TEAL = '#0F6E56';
const TEAL_LIGHT = '#de210c';
const CORAL = '#D85A30';
const AMBER = '#BA7517';
const AMBER_LIGHT = '#FAEEDA';

export default function CustomDrawerContent({ navigation, org, onLogout }) {
  const { user } = useAuth();
  const [expandedSection, setExpandedSection] = useState(null);

  const handleNavigation = (screenName, params = {}) => {
    navigation.navigate(screenName, params);
  };

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const menuSections = [
    {
      id: 'primary',
      title: 'Navigation',
      items: [
        { label: 'Home', icon: '🏠', action: () => handleNavigation('HostDashboard') },
        { label: 'Posted Opportunities', icon: '💼', action: () => handleNavigation('HostSlots') },
        { label: 'Applications', icon: '📋', action: () => handleNavigation('HostApplicants') },
      ]
    },
    {
      id: 'management',
      title: 'Company Management',
      items: [
        { label: 'Edit Profile', icon: '✏️', action: () => handleNavigation('HostProfile', { org }) },
        { label: 'Settings', icon: '⚙️', action: () => handleNavigation('HostSettings') },
        { label: 'Team Members', icon: '👥', action: () => Alert.alert('Team Members', 'Team management page coming soon') },
      ]
    },
    {
      id: 'support',
      title: 'Support & Resources',
      items: [
        { label: 'Help & FAQ', icon: '❓', action: () => Alert.alert('Help', 'Help documentation coming soon') },
        { label: 'Contact Support', icon: '📞', action: () => Alert.alert('Support', 'Support contact: support@iams.com') },
        { label: 'Documentation', icon: '📖', action: () => Alert.alert('Docs', 'Documentation links coming soon') },
      ]
    },
  ];

  return (
    <View style={s.drawerContainer}>
      <ScrollView showsVerticalScrollIndicator={false} style={s.scrollView}>
        
        {/* ── About Company Section ─────────────────────────────────────── */}
        <View style={s.aboutSection}>
          <View style={s.aboutHeader}>
            <View style={s.aboutLogo}>
              <Text style={s.aboutLogoIcon}>🏢</Text>
            </View>
            <View style={s.aboutHeaderText}>
              <Text style={s.aboutOrgName}>{org?.org_name || 'Organization'}</Text>
              <Text style={s.aboutOrgType}>Premium Partner</Text>
            </View>
          </View>

          <View style={s.aboutDivider} />

          {/* Company Details */}
          <View style={s.aboutDetails}>
            {org?.location && (
              <View style={s.aboutRow}>
                <Text style={s.aboutRowIcon}>📍</Text>
                <View style={s.aboutRowContent}>
                  <Text style={s.aboutRowLabel}>Location</Text>
                  <Text style={s.aboutRowValue}>{org.location}</Text>
                </View>
              </View>
            )}

            {org?.contact_person && (
              <View style={s.aboutRow}>
                <Text style={s.aboutRowIcon}>👤</Text>
                <View style={s.aboutRowContent}>
                  <Text style={s.aboutRowLabel}>Contact Person</Text>
                  <Text style={s.aboutRowValue}>{org.contact_person}</Text>
                </View>
              </View>
            )}

            {org?.phone && (
              <View style={s.aboutRow}>
                <Text style={s.aboutRowIcon}>📞</Text>
                <View style={s.aboutRowContent}>
                  <Text style={s.aboutRowLabel}>Phone</Text>
                  <Text style={s.aboutRowValue}>{org.phone}</Text>
                </View>
              </View>
            )}

            {org?.available_slots !== undefined && (
              <View style={s.aboutRow}>
                <Text style={s.aboutRowIcon}>💼</Text>
                <View style={s.aboutRowContent}>
                  <Text style={s.aboutRowLabel}>Available Slots</Text>
                  <Text style={s.aboutRowValue}>{org.available_slots} positions</Text>
                </View>
              </View>
            )}
          </View>

          {/* Company Description */}
          {org?.description && (
            <>
              <View style={s.aboutDivider} />
              <Text style={s.aboutDescription}>{org.description}</Text>
            </>
          )}

          {/* Focus Areas Tags */}
          {org?.focus_areas && (
            <>
              <View style={s.aboutDivider} />
              <View style={s.aboutTags}>
                {org.focus_areas.map((area, index) => (
                  <View key={index} style={s.tag}>
                    <Text style={s.tagText}>{area}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>

        <View style={s.sectionSpacer} />

        {/* ── Menu Sections ────────────────────────────────────────────── */}
        {menuSections.map((section) => (
          <View key={section.id} style={s.menuSection}>
            <TouchableOpacity
              style={s.sectionHeader}
              onPress={() => toggleSection(section.id)}
            >
              <Text style={s.sectionTitle}>{section.title}</Text>
              <Text style={s.sectionToggle}>
                {expandedSection === section.id ? '▼' : '▶'}
              </Text>
            </TouchableOpacity>

            {expandedSection === section.id && (
              <View style={s.sectionItems}>
                {section.items.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={s.menuItem}
                    onPress={item.action}
                  >
                    <Text style={s.menuItemIcon}>{item.icon}</Text>
                    <Text style={s.menuItemLabel}>{item.label}</Text>
                    <Text style={s.menuItemArrow}>→</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ))}

        <View style={s.sectionSpacer} />

        {/* ── Account Section ──────────────────────────────────────────── */}
        <View style={s.accountSection}>
          <View style={s.accountInfo}>
            <Text style={s.accountLabel}>Logged in as</Text>
            <Text style={s.accountEmail}>{user?.email || 'User'}</Text>
          </View>
          <TouchableOpacity
            style={s.logoutBtn}
            onPress={onLogout}
          >
            <Text style={s.logoutBtnIcon}>🚪</Text>
            <Text style={s.logoutBtnText}>Logout</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      
    </View>
  );
}

const s = StyleSheet.create({
  drawerContainer: {
    flex: 1,
    backgroundColor: '#F0F4F3',
  },
  scrollView: {
    flex: 1,
  },

  // About Section
  aboutSection: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 16,
    padding: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.07)',
  },
  aboutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  aboutLogo: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: TEAL,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  aboutLogoIcon: {
    fontSize: 24,
  },
  aboutHeaderText: {
    flex: 1,
  },
  aboutOrgName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },
  aboutOrgType: {
    fontSize: 12,
    color: CORAL,
    fontWeight: '600',
    marginTop: 2,
  },
  aboutDivider: {
    height: 0.5,
    backgroundColor: 'rgba(0,0,0,0.08)',
    marginVertical: 12,
  },
  aboutDetails: {
    gap: 12,
  },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  aboutRowIcon: {
    fontSize: 16,
    marginTop: 2,
  },
  aboutRowContent: {
    flex: 1,
  },
  aboutRowLabel: {
    fontSize: 11,
    color: '#888',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  aboutRowValue: {
    fontSize: 13,
    color: '#222',
    fontWeight: '500',
    marginTop: 2,
  },
  aboutDescription: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
    fontWeight: '400',
  },
  aboutTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: 'rgba(15, 110, 86, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: TEAL,
  },
  tagText: {
    fontSize: 11,
    color: TEAL,
    fontWeight: '600',
  },

  // Section Spacer
  sectionSpacer: {
    height: 8,
  },

  // Menu Sections
  menuSection: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.07)',
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: TEAL,
    letterSpacing: 0.3,
  },
  sectionToggle: {
    fontSize: 12,
    color: '#888',
  },
  sectionItems: {
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.04)',
    gap: 10,
  },
  menuItemIcon: {
    fontSize: 16,
    width: 24,
  },
  menuItemLabel: {
    flex: 1,
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  menuItemArrow: {
    fontSize: 14,
    color: '#ccc',
  },

  // Account Section
  accountSection: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginBottom: 16,
    borderRadius: 12,
    padding: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.07)',
  },
  accountInfo: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  accountLabel: {
    fontSize: 11,
    color: '#888',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  accountEmail: {
    fontSize: 13,
    color: '#222',
    fontWeight: '500',
    marginTop: 4,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(200, 40, 40, 0.1)',
    borderWidth: 1,
    borderColor: '#C62828',
  },
  logoutBtnIcon: {
    fontSize: 14,
  },
  logoutBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#C62828',
  },
});