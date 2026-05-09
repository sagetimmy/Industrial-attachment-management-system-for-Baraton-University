import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../constants/colors';
import api from '../../api/axios';

const { width } = Dimensions.get('window');

const HostSlots = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [slotsData, setSlotsData] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchSlotData();
  }, []);

  const fetchSlotData = async () => {
    try {
      setLoading(true);
      const slotsResponse = await api.get('/host-orgs/available-slots');
      setSlotsData(slotsResponse.data);

      const attachmentsResponse = await api.get('/host-orgs/ongoing-attachments');
      setAttachments(attachmentsResponse.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load slot data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleIncreaseSlots = async () => {
    try {
      setUpdating(true);
      const newSlots = (slotsData?.available_slots || 0) + 1;
      await api.put('/host-orgs/profile', {
        org_name: user?.org_name,
        location: user?.location,
        contact_person: user?.contact_person,
        phone: user?.phone,
        available_slots: newSlots,
      });

      setSlotsData(prev => ({
        ...prev,
        available_slots: newSlots,
      }));
      Alert.alert('Success', 'Slot increased!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update slots');
    } finally {
      setUpdating(false);
    }
  };

  const renderSlotVisualization = () => {
    const available = slotsData?.available_slots || 0;
    const used = slotsData?.used_slots || 0;
    const total = available + used;

    const slotWidth = (width - 64) / Math.max(total, 5);

    return (
      <View style={styles.visualization}>
        <View style={styles.slotsContainer}>
          {/* Used Slots */}
          {Array.from({ length: used }).map((_, i) => (
            <View
              key={`used-${i}`}
              style={[
                styles.slot,
                { width: slotWidth },
                styles.slotUsed,
              ]}
            >
              <Text style={styles.slotText}>👤</Text>
            </View>
          ))}

          {/* Available Slots */}
          {Array.from({ length: available }).map((_, i) => (
            <View
              key={`available-${i}`}
              style={[
                styles.slot,
                { width: slotWidth },
                styles.slotAvailable,
              ]}
            >
              <Text style={styles.slotText}>+</Text>
            </View>
          ))}

          {/* Empty state if no slots */}
          {total === 0 && (
            <Text style={styles.noSlotText}>No slots defined. Add slots to accept students.</Text>
          )}
        </View>

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.slotUsed]} />
            <Text style={styles.legendText}>{used} Occupied</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.slotAvailable]} />
            <Text style={styles.legendText}>{available} Available</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderStatCard = (label, value, color) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Available Slots</Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Available Slots</Text>
        <TouchableOpacity onPress={() => navigation.navigate('HostProfile')}>
          <Text style={styles.editButton}>Edit ✏️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Overview Cards */}
        <View style={styles.cardsContainer}>
          {renderStatCard('Available', slotsData?.available_slots || 0, COLORS.primary)}
          {renderStatCard('Occupied', slotsData?.used_slots || 0, '#2E7D32')}
          {renderStatCard('Capacity', slotsData?.total_capacity || 0, COLORS.secondary)}
        </View>

        {/* Visualization */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Slot Status</Text>
          {renderSlotVisualization()}
        </View>

        {/* Increase Slots Action */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>➕ Add More Slots</Text>
          <View style={styles.actionCard}>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Increase Your Capacity</Text>
              <Text style={styles.actionDescription}>
                Currently accepting {slotsData?.available_slots || 0} student{slotsData?.available_slots !== 1 ? 's' : ''}.
              </Text>
              <Text style={styles.actionSubtext}>
                💡 Increase your slots to accept more students for industrial attachment.
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.increaseButton, updating && styles.buttonDisabled]}
              onPress={handleIncreaseSlots}
              disabled={updating}
            >
              <Text style={styles.increaseButtonText}>
                {updating ? '...' : '+1'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Current Placements */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👥 Current Placements</Text>
          {attachments.length > 0 ? (
            attachments.map((attachment, index) => (
              <View key={index} style={styles.placementCard}>
                <View style={styles.placementHeader}>
                  <View style={styles.placementInfo}>
                    <Text style={styles.placementName}>{attachment.full_name}</Text>
                    <Text style={styles.placementReg}>{attachment.reg_number}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          attachment.status === 'ongoing' ? '#E8F5E9' : '#E3F2FD',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color:
                            attachment.status === 'ongoing' ? '#2E7D32' : COLORS.secondary,
                        },
                      ]}
                    >
                      {attachment.status.charAt(0).toUpperCase() + attachment.status.slice(1)}
                    </Text>
                  </View>
                </View>

                <View style={styles.placementDetails}>
                  <Text style={styles.placementDetail}>📚 {attachment.department}</Text>
                  {attachment.rating && (
                    <Text style={styles.placementDetail}>
                      ⭐ Rating: {attachment.rating}/5
                    </Text>
                  )}
                </View>

                {attachment.comments && (
                  <View style={styles.commentsBox}>
                    <Text style={styles.commentsLabel}>Feedback:</Text>
                    <Text style={styles.commentsText}>{attachment.comments}</Text>
                  </View>
                )}
              </View>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyTitle}>No Active Placements</Text>
              <Text style={styles.emptyText}>
                Students you've accepted will appear here.
              </Text>
            </View>
          )}
        </View>

        {/* Info Section */}
        <View style={styles.section}>
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>ℹ️ How Slots Work</Text>
            <Text style={styles.infoText}>
              • Each student you accept occupies one slot{'\n'}
              • Slots are decremented when you confirm a placement{'\n'}
              • You can increase slots anytime to accept more students{'\n'}
              • Rejected applications do not use slots
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
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
    backgroundColor: COLORS.secondary,
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
  editButton: {
    color: 'white',
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderLeftWidth: 4,
    borderRadius: 8,
    padding: 12,
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: 'white',
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 8,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: 16,
  },
  visualization: {
    marginVertical: 12,
  },
  slotsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
    paddingVertical: 12,
    minHeight: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slot: {
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
  },
  slotUsed: {
    backgroundColor: '#C8E6C9',
    borderWidth: 2,
    borderColor: '#2E7D32',
  },
  slotAvailable: {
    backgroundColor: '#FFF9C4',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  slotText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  noSlotText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    paddingVertical: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  actionCard: {
    backgroundColor: '#FFF8E1',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  actionSubtext: {
    fontSize: 12,
    color: COLORS.primary,
    fontStyle: 'italic',
  },
  increaseButton: {
    backgroundColor: COLORS.primary,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  increaseButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  placementCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  placementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  placementInfo: {
    flex: 1,
  },
  placementName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  placementReg: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  placementDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  placementDetail: {
    fontSize: 12,
    color: '#666',
  },
  commentsBox: {
    backgroundColor: 'white',
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  commentsLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: 4,
  },
  commentsText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    color: '#888',
  },
  infoBox: {
    backgroundColor: '#F0F7FF',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.secondary,
    borderRadius: 8,
    padding: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
});

export default HostSlots;
