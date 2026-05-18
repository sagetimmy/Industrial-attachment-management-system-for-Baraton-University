import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, RefreshControl, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';
import api from '../../api/axios';

export default function ManageUsersScreen({ navigation, route }) {
  const initialRole = route?.params?.role || 'student';
  const [users, setUsers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState(initialRole);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data);
      setFiltered(res.data);
    } catch (err) {
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  useEffect(() => {
    let result = users;
    if (activeFilter !== 'all') {
      result = result.filter(u => u.role === activeFilter);
    }
    if (search) {
      result = result.filter(u =>
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase())
      );
    }
    setFiltered(result);
  }, [search, activeFilter, users]);

  const handleToggleUser = (userId, name, isActive) => {
    Alert.alert(
      `${isActive ? 'Deactivate' : 'Activate'} User`,
      `${isActive ? 'Deactivate' : 'Activate'} ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isActive ? 'Deactivate' : 'Activate',
          style: isActive ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await api.put(`/admin/toggle-user/${userId}`);
              fetchUsers();
            } catch (err) {
              Alert.alert('Error', 'Failed to update user');
            }
          }
        }
      ]
    );
  };

  const handleDeleteUser = (userId, name) => {
    Alert.alert(
      'Delete User',
      `Permanently delete ${name}? This cannot be undone!`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/admin/delete-user/${userId}`);
              Alert.alert('Deleted', `${name} has been deleted.`);
              fetchUsers();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete user');
            }
          }
        }
      ]
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  const roleConfig = (role) => {
    switch (role) {
      case 'student':    return { bg: '#E8F5E9', color: '#1B6B5A', label: 'STUDENT' };
      case 'supervisor': return { bg: '#EDE7F6', color: '#6A1B9A', label: 'SUPERVISOR' };
      case 'host_org':   return { bg: '#E3F2FD', color: '#1565C0', label: 'HOST ORG' };
      case 'admin':      return { bg: '#FFF3E0', color: '#E65100', label: 'ADMIN' };
      default:           return { bg: '#F4F4F4', color: '#888', label: role };
    }
  };

  const filters = [
    { key: 'student',    label: 'Students' },
    { key: 'supervisor', label: 'Supervisors' },
    { key: 'host_org',   label: 'Host Orgs' },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1B6B5A" />
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.notifBtn} />
        <Text style={styles.headerTitle}>User Management</Text>
        <TouchableOpacity style={styles.notifBtn}>
          <Text style={styles.notifIcon}>🔔</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterTab, activeFilter === f.key && styles.filterTabActive]}
            onPress={() => setActiveFilter(f.key)}
          >
            <Text style={[styles.filterTabText, activeFilter === f.key && styles.filterTabTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search users by name or ID..."
          placeholderTextColor="#9E9E9E"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Users List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1B6B5A']} />}
      >
        {filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        ) : (
          filtered.map((user, index) => {
            const role = roleConfig(user.role);
            return (
              <TouchableOpacity
                key={index}
                style={[styles.userCard, !user.is_active && styles.userCardInactive]}
                onPress={() => navigation.navigate('UserDetail', { user })}
                activeOpacity={0.8}
              >
                {/* Avatar */}
                <View style={[styles.avatar, { backgroundColor: role.color }]}>
                  <Text style={styles.avatarText}>
                    {user.name?.charAt(0).toUpperCase() || '?'}
                  </Text>
                </View>

                {/* Info */}
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{user.name || 'Unknown'}</Text>
                  <View style={[styles.roleBadge, { backgroundColor: role.bg }]}>
                    <Text style={[styles.roleText, { color: role.color }]}>
                      {role.label}
                    </Text>
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.toggleBtn}
                    onPress={() => handleToggleUser(user.user_id, user.name, user.is_active)}
                  >
                    <Text style={styles.toggleBtnText}>
                      {user.is_active ? '⏸' : '▶'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDeleteUser(user.user_id, user.name)}
                  >
                    <Text style={styles.deleteBtnText}>🗑</Text>
                  </TouchableOpacity>
                  <Text style={styles.chevron}>›</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Tab Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate('AdminDashboard')}>
          <Text style={styles.tabIcon}>🏠</Text>
          <Text style={styles.tabLabel}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabItem, styles.tabItemActive]}>
          <Text style={styles.tabIcon}>👥</Text>
          <Text style={[styles.tabLabel, styles.tabLabelActive]}>Users</Text>
          <View style={styles.tabDot} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate('ManageOrgs')}>
          <Text style={styles.tabIcon}>🏢</Text>
          <Text style={styles.tabLabel}>Orgs</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate('AdminProfile')}>
          <Text style={styles.tabIcon}>👤</Text>
          <Text style={styles.tabLabel}>Profile</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4F3',
  },
  loadingContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#F0F4F3',
  },
  loadingText: { marginTop: 10, color: '#888', fontSize: 14 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F0F4F3',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1B3A2F',
    flex: 1,
    textAlign: 'center',
  },
  notifBtn: { padding: 4 },
  notifIcon: { fontSize: 22 },

  // Filter Tabs
  filterContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#DDE8E5',
    borderRadius: 14,
    padding: 4,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 11,
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: '#1B6B5A',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4A6B60',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  searchIcon: { fontSize: 16, marginRight: 10 },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1B3A2F',
  },

  // List
  listContent: { paddingHorizontal: 16 },

  // User Card
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  userCardInactive: { opacity: 0.6 },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  userInfo: { flex: 1 },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1B3A2F',
    marginBottom: 6,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Card Actions
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toggleBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F0F4F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleBtnText: { fontSize: 14 },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtnText: { fontSize: 14 },
  chevron: {
    fontSize: 24,
    color: '#9E9E9E',
    marginLeft: 4,
  },

  // Empty
  emptyCard: {
    backgroundColor: '#FFFFFF',
    padding: 40,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyText: { color: '#9E9E9E', fontSize: 14 },

  // Bottom Bar
  bottomBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: '#E8EDEB',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  tabItemActive: {},
  tabIcon: { fontSize: 20, marginBottom: 2 },
  tabLabel: {
    fontSize: 11,
    color: '#9E9E9E',
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#1B6B5A',
    fontWeight: '700',
  },
  tabDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#1B6B5A',
    marginTop: 3,
  },
});