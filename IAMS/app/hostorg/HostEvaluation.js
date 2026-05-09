import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  FlatList,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../constants/colors';
import api from '../../api/axios';

const HostEvaluation = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [selectedAttachment, setSelectedAttachment] = useState(null);
  const [showEvaluationForm, setShowEvaluationForm] = useState(false);

  const [evaluationData, setEvaluationData] = useState({
    rating: 3,
    comments: '',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchAttachments();
  }, []);

  const fetchAttachments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/host-orgs/ongoing-attachments');
      setAttachments(response.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load student data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartEvaluation = (attachment) => {
    setSelectedAttachment(attachment);

    // If already evaluated, load the existing data
    if (attachment.rating && attachment.comments) {
      setEvaluationData({
        rating: attachment.rating,
        comments: attachment.comments,
      });
    } else {
      setEvaluationData({
        rating: 3,
        comments: '',
      });
    }

    setShowEvaluationForm(true);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!evaluationData.rating || evaluationData.rating < 1 || evaluationData.rating > 5) {
      newErrors.rating = 'Rating must be between 1 and 5';
    }

    if (!evaluationData.comments.trim()) {
      newErrors.comments = 'Comments are required';
    }

    if (evaluationData.comments.trim().length < 10) {
      newErrors.comments = 'Comments must be at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmitEvaluation = async () => {
    if (!validateForm()) return;

    try {
      setEvaluating(true);
      await api.post(`/host-orgs/evaluate/${selectedAttachment.attachment_id}`, {
        rating: parseInt(evaluationData.rating),
        comments: evaluationData.comments.trim(),
      });

      Alert.alert('Success', 'Evaluation submitted successfully!', [
        {
          text: 'OK',
          onPress: () => {
            setShowEvaluationForm(false);
            setSelectedAttachment(null);
            fetchAttachments();
          },
        },
      ]);
    } catch (error) {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to submit evaluation'
      );
    } finally {
      setEvaluating(false);
    }
  };

  const RatingSelector = ({ value, onChange }) => {
    return (
      <View style={styles.ratingContainer}>
        {[1, 2, 3, 4, 5].map(rating => (
          <TouchableOpacity
            key={rating}
            style={[
              styles.ratingButton,
              value === rating && styles.ratingButtonActive,
            ]}
            onPress={() => onChange(rating)}
          >
            <Text style={[
              styles.ratingText,
              value === rating && styles.ratingTextActive,
            ]}>
              {'⭐'.repeat(rating)}
            </Text>
            <Text style={[
              styles.ratingLabel,
              value === rating && styles.ratingLabelActive,
            ]}>
              {rating}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderAttachmentCard = ({ item }) => (
    <View style={styles.attachmentCard}>
      <View style={styles.cardHeader}>
        <View style={styles.studentInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.full_name?.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.studentName}>{item.full_name}</Text>
            <Text style={styles.studentReg}>{item.reg_number}</Text>
            <Text style={styles.studentDept}>{item.department}</Text>
          </View>
        </View>

        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: item.status === 'ongoing' ? '#E8F5E9' : '#E3F2FD',
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              {
                color: item.status === 'ongoing' ? '#2E7D32' : COLORS.secondary,
              },
            ]}
          >
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>
      </View>

      {/* Evaluation Status */}
      <View style={styles.evaluationStatus}>
        {item.rating ? (
          <View style={styles.evaluatedBox}>
            <Text style={styles.evaluatedLabel}>✓ Already Evaluated</Text>
            <View style={styles.ratingDisplay}>
              <Text style={styles.ratingStars}>{'⭐'.repeat(item.rating)}</Text>
              <Text style={styles.ratingScore}>{item.rating}/5</Text>
            </View>
            <Text style={styles.evaluatedComment}>{item.comments}</Text>
            <Text style={styles.evaluatedDate}>
              Updated: {new Date(item.evaluated_at).toLocaleDateString()}
            </Text>
          </View>
        ) : (
          <View style={styles.notEvaluatedBox}>
            <Text style={styles.notEvaluatedText}>⏳ Not Yet Evaluated</Text>
          </View>
        )}
      </View>

      {/* Action Button */}
      <TouchableOpacity
        style={styles.evaluateButton}
        onPress={() => handleStartEvaluation(item)}
      >
        <Text style={styles.evaluateButtonText}>
          {item.rating ? 'Update Evaluation' : 'Submit Evaluation'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Submit Evaluation</Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </View>
    );
  }

  // Show evaluation form if selected
  if (showEvaluationForm && selectedAttachment) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setShowEvaluationForm(false)}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Evaluation Form</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Student Info */}
          <View style={styles.studentCard}>
            <View style={styles.cardAvatar}>
              <Text style={styles.cardAvatarText}>
                {selectedAttachment.full_name?.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={styles.cardStudentName}>{selectedAttachment.full_name}</Text>
              <Text style={styles.cardStudentDetails}>
                {selectedAttachment.reg_number} • {selectedAttachment.department}
              </Text>
            </View>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Rating Section */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>How would you rate this student?</Text>
              <Text style={styles.formHint}>
                Consider their performance, punctuality, and overall contribution.
              </Text>

              <RatingSelector
                value={evaluationData.rating}
                onChange={(rating) => {
                  setEvaluationData(prev => ({ ...prev, rating }));
                  if (errors.rating) {
                    setErrors(prev => ({ ...prev, rating: undefined }));
                  }
                }}
              />

              {errors.rating && (
                <Text style={styles.errorText}>{errors.rating}</Text>
              )}
            </View>

            {/* Rating Descriptions */}
            <View style={styles.ratingDescriptions}>
              <View style={styles.ratingDesc}>
                <Text style={styles.ratingDescLabel}>1 ⭐</Text>
                <Text style={styles.ratingDescText}>Poor</Text>
              </View>
              <View style={styles.ratingDesc}>
                <Text style={styles.ratingDescLabel}>2 ⭐⭐</Text>
                <Text style={styles.ratingDescText}>Fair</Text>
              </View>
              <View style={styles.ratingDesc}>
                <Text style={styles.ratingDescLabel}>3 ⭐⭐⭐</Text>
                <Text style={styles.ratingDescText}>Good</Text>
              </View>
              <View style={styles.ratingDesc}>
                <Text style={styles.ratingDescLabel}>4 ⭐⭐⭐⭐</Text>
                <Text style={styles.ratingDescText}>Excellent</Text>
              </View>
              <View style={styles.ratingDesc}>
                <Text style={styles.ratingDescLabel}>5 ⭐⭐⭐⭐⭐</Text>
                <Text style={styles.ratingDescText}>Outstanding</Text>
              </View>
            </View>

            {/* Comments Section */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Detailed Comments</Text>
              <Text style={styles.formHint}>
                Provide constructive feedback about the student's performance.
              </Text>

              <TextInput
                style={[styles.commentInput, errors.comments && styles.inputError]}
                placeholder="Enter your feedback here..."
                value={evaluationData.comments}
                onChangeText={(text) => {
                  setEvaluationData(prev => ({ ...prev, comments: text }));
                  if (errors.comments) {
                    setErrors(prev => ({ ...prev, comments: undefined }));
                  }
                }}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                editable={!evaluating}
              />

              <View style={styles.charCount}>
                <Text style={styles.charCountText}>
                  {evaluationData.comments.length} characters
                </Text>
              </View>

              {errors.comments && (
                <Text style={styles.errorText}>{errors.comments}</Text>
              )}
            </View>

            {/* Sample Comments */}
            <View style={styles.samplesBox}>
              <Text style={styles.samplesTitle}>💡 Helpful Tips</Text>
              <Text style={styles.sampleText}>
                • Mention specific accomplishments{'\n'}
                • Note areas for improvement{'\n'}
                • Comment on work quality and reliability{'\n'}
                • Be constructive and professional
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.formActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowEvaluationForm(false)}
              disabled={evaluating}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitButton, evaluating && styles.submitButtonDisabled]}
              onPress={handleSubmitEvaluation}
              disabled={evaluating}
            >
              {evaluating ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {selectedAttachment.rating ? 'Update' : 'Submit'} Evaluation
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    );
  }

  // Show list view
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Submit Evaluation</Text>
        <View style={{ width: 60 }} />
      </View>

      {attachments.length > 0 ? (
        <FlatList
          data={attachments}
          keyExtractor={item => item.attachment_id.toString()}
          renderItem={renderAttachmentCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyTitle}>No Students to Evaluate</Text>
          <Text style={styles.emptyText}>
            Active students will appear here for evaluation.
          </Text>
        </View>
      )}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 12,
  },
  attachmentCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    marginHorizontal: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  studentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  studentName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  studentReg: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  studentDept: {
    fontSize: 11,
    color: COLORS.primary,
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
  evaluationStatus: {
    marginBottom: 12,
  },
  evaluatedBox: {
    backgroundColor: '#E8F5E9',
    borderLeftWidth: 4,
    borderLeftColor: '#2E7D32',
    borderRadius: 8,
    padding: 10,
  },
  evaluatedLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
  },
  ratingDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  ratingStars: {
    fontSize: 16,
  },
  ratingScore: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  evaluatedComment: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  evaluatedDate: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
  },
  notEvaluatedBox: {
    backgroundColor: '#FFF3E0',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    borderRadius: 8,
    padding: 10,
  },
  notEvaluatedText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  evaluateButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  evaluateButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  studentCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  cardAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardAvatarText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  cardStudentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  cardStudentDetails: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  form: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  formSection: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: 6,
  },
  formHint: {
    fontSize: 12,
    color: '#888',
    marginBottom: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  ratingButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#DDD',
    backgroundColor: '#F9F9F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#FFF8E1',
  },
  ratingText: {
    fontSize: 16,
    marginBottom: 4,
  },
  ratingLabel: {
    fontSize: 12,
    color: '#888',
    fontWeight: '600',
  },
  ratingLabelActive: {
    color: COLORS.primary,
  },
  ratingTextActive: {
    fontSize: 20,
  },
  ratingDescriptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  ratingDesc: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  ratingDescLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  ratingDescText: {
    fontSize: 11,
    color: '#888',
    marginTop: 4,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.secondary,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#C62828',
    backgroundColor: '#FFEBEE',
  },
  charCount: {
    alignItems: 'flex-end',
    marginTop: 6,
  },
  charCountText: {
    fontSize: 11,
    color: '#999',
  },
  errorText: {
    color: '#C62828',
    fontSize: 12,
    marginTop: 6,
  },
  samplesBox: {
    backgroundColor: '#E3F2FD',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.secondary,
    borderRadius: 8,
    padding: 12,
  },
  samplesTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: 8,
  },
  sampleText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#DDD',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: COLORS.secondary,
    fontSize: 14,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
  },
});

export default HostEvaluation;
