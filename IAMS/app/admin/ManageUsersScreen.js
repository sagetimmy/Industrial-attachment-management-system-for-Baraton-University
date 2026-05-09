import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, RefreshControl, TextInput
} from 'react-native';
import { COLORS } from '../../constants/colors';
import api from '../../api/axios';

export default function ManageUsersScreen({ navigation }) {
  const [users, setUsers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

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

  const roleColor = (role) => {
    switch (role) {
      case 'student': return { bg: '#E3F2FD', text: COLORS.secondary };
      case 'supervisor': return { bg: '#E8F5E9', text: '#2E7D32' };
      case 'host_org': return { bg: '#F3E5F5', text: '#6A1B9A' };
      case 'admin': return { bg: '#FFF3E0', text: COLORS.primary };
      default: return { bg: '#F4F4F4', text: COLORS.gray };
    }
  };

  const filters = ['all', 'student', 'supervisor', 'host_org', 'admin'];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Manage Users 👥</Text>
        <Text style={styles.subtitle}>{filtered.length} users found</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Search by name or email..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
      >
        {filters.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, activeFilter === f && styles.filterBtnActive]}
            onPress={() => setActiveFilter(f)}
          >
            <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>
              {f === 'all' ? 'All' :
               f === 'host_org' ? 'Host Org' :
               f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Users List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        ) : (
          filtered.map((user, index) => (
            <View key={index} style={[styles.userCard, !user.is_active && styles.userCardInactive]}>
              <View style={styles.userTop}>
                <View style={[styles.avatar, { backgroundColor: roleColor(user.role).text }]}>
                  <Text style={styles.avatarText}>
                    {user.name?.charAt(0).toUpperCase() || '?'}
                  </Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{user.name || 'Unknown'}</Text>
                  <Text style={styles.userEmail}>{user.email}</Text>
                  {user.reg_number && (
                    <Text style={styles.userExtra}>{user.reg_number} • {user.department}</Text>
                  )}
                  {user.supervisor_dept && (
                    <Text style={styles.userExtra}>{user.supervisor_dept}</Text>
                  )}
                </View>
                <View style={[styles.roleBadge, { backgroundColor: roleColor(user.role).bg }]}>
                  <Text style={[styles.roleText, { color: roleColor(user.role).text }]}>
                    {user.role === 'host_org' ? 'Host' : user.role}
                  </Text>
                </View>
              </View>

              {/* Status & Verified */}
              <View style={styles.userMeta}>
                <View style={[styles.metaBadge, {
                  backgroundColor: user.is_active ? '#E8F5E9' : '#FFEBEE'
                }]}>
                  <Text style={[styles.metaText, {
                    color: user.is_active ? '#2E7D32' : '#C62828'
                  }]}>
                    {user.is_active ? '✓ Active' : '✗ Inactive'}
                  </Text>
                </View>
                <View style={[styles.metaBadge, {
                  backgroundColor: user.is_verified ? '#E8F5E9' : '#FFF3E0'
                }]}>
                  <Text style={[styles.metaText, {
                    color: user.is_verified ? '#2E7D32' : COLORS.primary
                  }]}>
                    {user.is_verified ? '✓ Verified' : '⏳ Unverified'}
                  </Text>
                </View>
                <Text style={styles.joinDate}>
                  {new Date(user.created_at).toLocaleDateString()}
                </Text>
              </View>

              {/* Actions */}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.actionBtn, {
                    backgroundColor: user.is_active ? '#FFF3E0' : '#E8F5E9'
                  }]}
                  onPress={() => handleToggleUser(user.user_id, user.name, user.is_active)}
                >
                  <Text style={[styles.actionBtnText, {
                    color: user.is_active ? COLORS.primary : '#2E7D32'
                  }]}>
                    {user.is_active ? '⏸ Deactivate' : '▶ Activate'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDeleteUser(user.user_id, user.name)}
                >
                  <Text style={styles.deleteBtnText}>🗑 Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F4F4' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: COLORS.gray },
  header: {
    backgroundColor: COLORS.secondary,
    paddingTop: 55, paddingBottom: 25,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  backBtn: { marginBottom: 10 },
  backText: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
  title: { color: COLORS.white, fontSize: 24, fontWeight: 'bold' },
  subtitle: { color: '#8899AA', fontSize: 13, marginTop: 4 },
  searchContainer: { margin: 16, marginBottom: 8 },
  searchInput: {
    backgroundColor: COLORS.white,
    borderRadius: 12, padding: 12,
    fontSize: 14, elevation: 2,
  },
  filterRow: { marginBottom: 8 },
  filterBtn: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, backgroundColor: COLORS.white,
    borderWidth: 1, borderColor: COLORS.gray,
  },
  filterBtnActive: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  filterText: { fontSize: 13, color: COLORS.darkGray, fontWeight: '600' },
  filterTextActive: { color: COLORS.white },
  emptyCard: {
    backgroundColor: COLORS.white,
    margin: 16, padding: 30,
    borderRadius: 16, alignItems: 'center',
  },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyText: { color: COLORS.gray, fontSize: 14 },
  userCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16, marginBottom: 12,
    padding: 14, borderRadius: 16, elevation: 2,
  },
  userCardInactive: { opacity: 0.7 },
  userTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
  userInfo: { flex: 1 },
  userName: { fontSize: 14, fontWeight: '700', color: COLORS.darkGray },
  userEmail: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  userExtra: { fontSize: 11, color: COLORS.primary, marginTop: 2 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  roleText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  userMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  metaBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  metaText: { fontSize: 11, fontWeight: '600' },
  joinDate: { fontSize: 11, color: COLORS.gray, marginLeft: 'auto' },
  actions: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1, padding: 10,
    borderRadius: 10, alignItems: 'center',
  },
  actionBtnText: { fontSize: 13, fontWeight: '700' },
  deleteBtn: {
    backgroundColor: '#FFEBEE',
    padding: 10, borderRadius: 10,
    alignItems: 'center', paddingHorizontal: 16,
  },
  deleteBtnText: { color: '#C62828', fontWeight: '700', fontSize: 13 },
});