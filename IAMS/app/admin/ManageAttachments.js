import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  Alert,
  FlatList,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { COLORS } from '../../constants/colors';

const ManageAttachments = ({ navigation }) => {
  const { user } = useAuth();
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [attachmentDetails, setAttachmentDetails] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const statusOptions = ['pending', 'approved', 'ongoing', 'completed', 'rejected'];
  const statusColors = {
    pending: '#FF9800',
    approved: '#2E7D32',
    ongoing: '#2196F3',
    completed: '#4CAF50',
    rejected: '#F44336',
  };

  useEffect(() => {
    fetchAttachments();
  }, [page, statusFilter, searchQuery]);

  const fetchAttachments = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 20,
      };

      if (statusFilter) params.status = statusFilter;
      if (searchQuery) params.search = searchQuery;

      const response = await api.get('/admin/attachments', { params });
      setAttachments(response.data.attachments);
      setTotalPages(response.data.pagination.pages);
    } catch (error) {
      Alert.alert('Error', 'Failed to load attachments');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(1);
    fetchAttachments().then(() => setRefreshing(false));
  }, [statusFilter, searchQuery]);

  const fetchAttachmentDetails = async (attachmentId) => {
    try {
      setDetailsLoading(true);
      const response = await api.get(`/admin/attachment/${attachmentId}`);
      setAttachmentDetails(response.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load attachment details');
      console.error(error);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleViewDetails = (attachment) => {
    setSelectedAttachment(attachment);
    setDetailsModalVisible(true);
    fetchAttachmentDetails(attachment.attachment_id);
  };

  const handleStatusChange = async (attachmentId, newStatus) => {
    try {
      await api.put(`/admin/attachment/${attachmentId}/status`, { status: newStatus });
      Alert.alert('Success', 'Attachment status updated!');
      fetchAttachments();
    } catch (error) {
      Alert.alert('Error', 'Failed to update status');
      console.error(error);
    }
  };

  const renderStatusBadge = (status) => (
    <View style={[styles.statusBadge, { backgroundColor: statusColors[status] }]}>
      <Text style={styles.statusText}>{status.charAt(0).toUpperCase() + status.slice(1)}</Text>
    </View>
  );

  const renderAttachmentRow = ({ item }) => (
    <TouchableOpacity
      style={styles.attachmentCard}
      onPress={() => handleViewDetails(item)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardInfo}>
          <Text style={styles.studentName}>{item.student_name}</Text>
          <Text style={styles.regNumber}>{item.reg_number}</Text>
        </View>
        {renderStatusBadge(item.status)}
      </View>

      <View style={styles.cardDetails}>
        <Text style={styles.detail}>
          <Text style={styles.label}>Organization:</Text> {item.org_name}
        </Text>
        <Text style={styles.detail}>
          <Text style={styles.label}>Supervisor:</Text> {item.supervisor_name || 'Not assigned'}
        </Text>
        <Text style={styles.detail}>
          <Text style={styles.label}>Start Date:</Text> {new Date(item.start_date).toLocaleDateString()}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.viewButton}
        onPress={() => handleViewDetails(item)}
      >
        <Text style={styles.viewButtonText}>View Details</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderDetailsModal = () => (
    <Modal
      visible={detailsModalVisible}
      animationType="slide"
      onRequestClose={() => setDetailsModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity
            onPress={() => setDetailsModalVisible(false)}
            style={styles.closeButton}
          >
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Attachment Details</Text>
          <View style={{ width: 30 }} />
        </View>

        <ScrollView style={styles.detailsContent}>
          {detailsLoading ? (
            <ActivityIndicator size="large" color={COLORS.primary} />
          ) : attachmentDetails ? (
            <>
              {/* Main Info */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Student Information</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Name:</Text>
                  <Text style={styles.value}>{attachmentDetails.attachment.student_name}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Reg Number:</Text>
                  <Text style={styles.value}>{attachmentDetails.attachment.reg_number}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Department:</Text>
                  <Text style={styles.value}>{attachmentDetails.attachment.department}</Text>
                </View>
              </View>

              {/* Organization Info */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Organization</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Name:</Text>
                  <Text style={styles.value}>{attachmentDetails.attachment.org_name}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Location:</Text>
                  <Text style={styles.value}>{attachmentDetails.attachment.location}</Text>
                </View>
              </View>

              {/* Status & Dates */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Attachment Status</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Status:</Text>
                  {renderStatusBadge(attachmentDetails.attachment.status)}
                </View>
                <View style={styles.statusButtonsRow}>
                  {statusOptions.map(status => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.statusButton,
                        attachmentDetails.attachment.status === status && styles.statusButtonActive,
                      ]}
                      onPress={() => handleStatusChange(selectedAttachment.attachment_id, status)}
                    >
                      <Text style={styles.statusButtonText}>{status}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.label}>Start Date:</Text>
                  <Text style={styles.value}>
                    {new Date(attachmentDetails.attachment.start_date).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>End Date:</Text>
                  <Text style={styles.value}>
                    {new Date(attachmentDetails.attachment.end_date).toLocaleDateString()}
                  </Text>
                </View>
              </View>

              {/* Supervisor */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Assigned Supervisor</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Name:</Text>
                  <Text style={styles.value}>
                    {attachmentDetails.attachment.supervisor_name || 'Not assigned'}
                  </Text>
                </View>
              </View>

              {/* Logbook Entries */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Logbook Entries ({attachmentDetails.logbookEntries.length})
                </Text>
                {attachmentDetails.logbookEntries.length > 0 ? (
                  attachmentDetails.logbookEntries.map(entry => (
                    <View key={entry.entry_id} style={styles.logbookEntry}>
                      <Text style={styles.weekNumber}>Week {entry.week_number}</Text>
                      <Text style={styles.description}>{entry.description}</Text>
                      <Text style={styles.submittedDate}>
                        Submitted: {new Date(entry.submitted_at).toLocaleDateString()}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noData}>No logbook entries yet</Text>
                )}
              </View>

              {/* Evaluation */}
              {attachmentDetails.evaluation && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Supervisor Evaluation</Text>
                  <View style={styles.infoRow}>
                    <Text style={styles.label}>Rating:</Text>
                    <Text style={styles.value}>{attachmentDetails.evaluation.rating}/5</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.label}>Comments:</Text>
                    <Text style={styles.value}>{attachmentDetails.evaluation.comments}</Text>
                  </View>
                </View>
              )}
            </>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Attachments</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, reg number, org..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Text style={styles.filterButtonText}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      {showFilters && (
        <View style={styles.filtersContainer}>
          <Text style={styles.filterLabel}>Status:</Text>
          <View style={styles.filterOptions}>
            <TouchableOpacity
              style={[
                styles.filterOption,
                !statusFilter && styles.filterOptionActive,
              ]}
              onPress={() => { setStatusFilter(''); setPage(1); }}
            >
              <Text style={styles.filterOptionText}>All</Text>
            </TouchableOpacity>
            {statusOptions.map(status => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filterOption,
                  statusFilter === status && styles.filterOptionActive,
                ]}
                onPress={() => { setStatusFilter(status); setPage(1); }}
              >
                <Text style={styles.filterOptionText}>{status}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Attachments List */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : attachments.length > 0 ? (
        <>
          <FlatList
            data={attachments}
            keyExtractor={item => item.attachment_id.toString()}
            renderItem={renderAttachmentRow}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            contentContainerStyle={styles.listContent}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <View style={styles.paginationContainer}>
              <TouchableOpacity
                style={[styles.paginationButton, page === 1 && styles.paginationButtonDisabled]}
                onPress={() => setPage(page - 1)}
                disabled={page === 1}
              >
                <Text style={styles.paginationButtonText}>← Previous</Text>
              </TouchableOpacity>

              <Text style={styles.pageInfo}>
                Page {page} of {totalPages}
              </Text>

              <TouchableOpacity
                style={[styles.paginationButton, page === totalPages && styles.paginationButtonDisabled]}
                onPress={() => setPage(page + 1)}
                disabled={page === totalPages}
              >
                <Text style={styles.paginationButtonText}>Next →</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      ) : (
        <View style={styles.centerContainer}>
          <Text style={styles.noDataText}>No attachments found</Text>
        </View>
      )}

      {renderDetailsModal()}
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
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: 'white',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  filterButton: {
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
  },
  filterButtonText: {
    fontSize: 18,
  },
  filtersContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: COLORS.secondary,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },
  filterOptionActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterOptionText: {
    fontSize: 12,
    color: COLORS.secondary,
  },
  filterOptionActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterOptionText: {
    fontSize: 12,
    color: COLORS.secondary,
  },
  listContent: {
    padding: 12,
    gap: 12,
  },
  attachmentCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  regNumber: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
  cardDetails: {
    gap: 6,
    marginBottom: 12,
  },
  detail: {
    fontSize: 13,
    color: '#666',
  },
  label: {
    fontWeight: '600',
    color: COLORS.secondary,
  },
  viewButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  viewButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 16,
    color: '#888',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  paginationButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 6,
  },
  paginationButtonDisabled: {
    backgroundColor: '#CCC',
  },
  paginationButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  pageInfo: {
    fontSize: 12,
    color: '#666',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 12,
    paddingTop: 16,
  },
  closeButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  modalTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  detailsContent: {
    padding: 12,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  value: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    textAlign: 'right',
    marginLeft: 12,
  },
  statusButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 12,
    flexWrap: 'wrap',
  },
  statusButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 6,
    backgroundColor: '#F5F5F5',
  },
  statusButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  statusButtonText: {
    fontSize: 12,
    color: COLORS.secondary,
    fontWeight: '600',
  },
  logbookEntry: {
    backgroundColor: '#F9F9F9',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    padding: 12,
    marginBottom: 8,
    borderRadius: 4,
  },
  weekNumber: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  submittedDate: {
    fontSize: 11,
    color: '#999',
  },
  noData: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 16,
  },
});

export default ManageAttachments;
