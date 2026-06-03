import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import api, { getApiBaseUrl } from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { hasRolePermission } from '../../utils/permissions';

const PRIMARY = '#0D7A6B';
const PRIMARY_DARK = '#005F53';
const SECONDARY = '#FD761A';
const SECONDARY_SOFT = '#FEF3E8';
const BACKGROUND = '#F6FAF8';
const SURFACE = '#FFFFFF';
const OUTLINE = '#BDC9C5';
const TEXT_PRIMARY = '#1A1A2E';
const TEXT_MUTED = '#5A6A7A';
const TEXT_FAINT = '#6E7976';

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const getWeekRange = (dateStr) => {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  const start = new Date(date);
  const day = (date.getDay() + 6) % 7;
  start.setDate(date.getDate() - day);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const startLabel = start.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const endLabel = end.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `${startLabel} - ${endLabel}`;
};

const getInitials = (name) => {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
};

const getFileName = (path) => {
  if (!path) return 'Attachment';
  const clean = path.split('?')[0];
  return clean.split('/').pop() || 'Attachment';
};

const isImageFile = (fileName) => {
  const lower = fileName.toLowerCase();
  return ['.png', '.jpg', '.jpeg', '.gif', '.webp'].some((ext) => lower.endsWith(ext));
};

export default function LogbookDetailScreen({ navigation, route }) {
  const { user } = useAuth();
  const { entry: initialEntry, attachment, totalEntries } = route.params || {};
  const [entry, setEntry] = useState(initialEntry || {});
  const [score, setScore] = useState(initialEntry?.supervisor_score?.toString() || '');
  const [feedback, setFeedback] = useState(initialEntry?.supervisor_feedback || '');
  const [submitting, setSubmitting] = useState(false);
  const isSupervisor = user?.role === 'supervisor';
  const canEditLogbooks = !isSupervisor || hasRolePermission(user, 'editLogbooks');

  const baseUrl = useMemo(() => getApiBaseUrl().replace(/\/api$/, ''), []);
  const docName = getFileName(entry?.document_url);
  const docUrl = entry?.document_url
    ? (entry.document_url.startsWith('http')
      ? entry.document_url
      : `${baseUrl}${entry.document_url.startsWith('/') ? '' : '/'}${entry.document_url}`)
    : null;

  const attachments = docUrl
    ? [{ url: docUrl, name: docName, isImage: isImageFile(docName) }]
    : [];

  const totalHours = entry?.tasks_done
    ? entry.tasks_done.split('\n').filter(Boolean).length
    : 0;

  const entryCount = Number.isFinite(totalEntries) ? totalEntries : 1;
  const studentName = entry?.full_name || user?.full_name || user?.email || 'Student';
  const studentMeta = entry?.reg_number || attachment?.org_name || '';
  const headerTitle = isSupervisor ? 'Logbook Review' : 'Logbook Detail';

  const entryTitleSource = entry?.tasks_done?.split('\n').find(Boolean)
    || entry?.description;
  const entryTitle = entryTitleSource
    ? entryTitleSource.split('\n')[0].slice(0, 60)
    : `Week ${entry?.week_number || ''} Entry`;
  const statusLabel = entry.status === 'approved'
    ? 'Approved'
    : entry.status === 'rejected'
      ? 'Rejected'
      : entry.status === 'revision'
        ? 'Revision Requested'
        : 'Pending';
  const isApproved = entry.status === 'approved';

  const handleOpenAttachment = async (url) => {
    try {
      await Linking.openURL(url);
    } catch (err) {
      Alert.alert('Error', 'Unable to open attachment.');
    }
  };

  const handleApprove = async () => {
    if (submitting) return;
    if (!canEditLogbooks) {
      Alert.alert('Permission Disabled', 'Logbook review actions are currently disabled for supervisors.');
      return;
    }
    if (isApproved) return;

    const trimmedScore = String(score || '').trim();
    const numericScore = trimmedScore ? Number(trimmedScore) : null;
    if (trimmedScore && (Number.isNaN(numericScore) || numericScore < 0 || numericScore > 100)) {
      Alert.alert('Invalid score', 'Score must be a number between 0 and 100.');
      return;
    }
    setSubmitting(true);
    const previous = entry;
    const optimistic = {
      ...entry,
      status: 'approved',
      reviewed_at: new Date().toISOString(),
      supervisor_score: trimmedScore ? numericScore : null,
      supervisor_feedback: feedback || null,
    };
    setEntry(optimistic);
    try {
      await api.put(`/supervisors/logbooks/${entry.entry_id}/approve`, {
        score: trimmedScore || undefined,
        feedback: feedback || undefined,
      });
      Alert.alert('Approved', 'Logbook entry approved successfully.');
    } catch (err) {
      setEntry(previous);
      Alert.alert('Error', err.response?.data?.message || 'Failed to approve entry');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevision = async () => {
    if (submitting) return;
    if (!canEditLogbooks) {
      Alert.alert('Permission Disabled', 'Logbook review actions are currently disabled for supervisors.');
      return;
    }

    setSubmitting(true);
    try {
      await api.put(`/supervisors/logbooks/${entry.entry_id}/revision`, {
        feedback: feedback || undefined,
      });
      Alert.alert('Revision requested', 'The student has been notified to revise this entry.');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to request revision');
    } finally {
      setSubmitting(false);
    }
  };

  if (!entry) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
            <Ionicons name="chevron-back" size={24} color={PRIMARY_DARK} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Logbook Detail</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No logbook entry found</Text>
          <Text style={styles.emptyText}>Return to the previous screen and select an entry.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
            <Ionicons name="chevron-back" size={24} color={PRIMARY_DARK} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{headerTitle}</Text>
        </View>
        <View style={styles.profilePill}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileInitials}>{getInitials(studentName)}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{studentName}</Text>
            {!!studentMeta && <Text style={styles.profileMeta}>{studentMeta}</Text>}
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Context Card */}
        <View style={styles.contextCard}>
          <View style={styles.contextTopRow}>
            <View style={styles.contextInfo}>
              <Text style={styles.weekBadge}>
                Week {entry.week_number || '—'} Progress
              </Text>
              <Text style={styles.contextTitle}>
                {attachment?.org_name || entry?.org_name || 'Logbook Entry'}
              </Text>
              <Text style={styles.contextDate}>
                {getWeekRange(entry.submitted_at)}
              </Text>
            </View>
            <View style={styles.contextIconBox}>
              <MaterialCommunityIcons name="calendar-month-outline" size={20} color={SECONDARY} />
            </View>
          </View>
          <View style={styles.contextStatsRow}>
            <View style={styles.contextStat}>
              <Text style={styles.contextLabel}>TOTAL HOURS</Text>
              <Text style={styles.contextValue}>{totalHours.toFixed(1)}</Text>
            </View>
            <View style={styles.contextStat}>
              <Text style={styles.contextLabel}>ENTRIES</Text>
              <Text style={styles.contextValue}>{String(entryCount).padStart(2, '0')}</Text>
            </View>
          </View>
        </View>

        {/* Review Card */}
        <View style={styles.reviewCard}>
          <View style={styles.reviewMetaRow}>
            <View style={styles.reviewMetaLeft}>
              <MaterialCommunityIcons name="calendar-today" size={16} color={PRIMARY} />
              <Text style={styles.reviewMetaText}>{formatDate(entry.submitted_at)}</Text>
            </View>
            <View style={styles.hoursBadge}>
              <MaterialCommunityIcons name="clock-outline" size={14} color={SECONDARY} />
              <Text style={styles.hoursText}>{totalHours.toFixed(1)} HOURS</Text>
            </View>
          </View>

          <Text style={styles.reviewTitle}>{entryTitle}</Text>
          <View style={styles.statusRow}>
            <View style={[
              styles.statusBadge,
              entry.status === 'approved'
                ? styles.statusApproved
                : entry.status === 'rejected'
                  ? styles.statusRejected
                  : entry.status === 'revision'
                    ? styles.statusRevision
                    : styles.statusPending,
            ]}>
              <Text style={[
                styles.statusText,
                entry.status === 'approved'
                  ? styles.statusTextApproved
                  : entry.status === 'rejected'
                    ? styles.statusTextRejected
                    : entry.status === 'revision'
                      ? styles.statusTextRevision
                      : styles.statusTextPending,
              ]}>
                {statusLabel}
              </Text>
            </View>
            {entry.reviewed_at ? (
              <Text style={styles.reviewedAt}>Reviewed {formatDate(entry.reviewed_at)}</Text>
            ) : null}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>TASK DESCRIPTION</Text>
            <Text style={styles.sectionBody}>
              {entry.description || 'No description provided.'}
            </Text>
          </View>

          {!!entry.tasks_done && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>TASKS COMPLETED</Text>
              <Text style={styles.sectionBody}>{entry.tasks_done}</Text>
            </View>
          )}

          {!!entry.challenges && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>CHALLENGES</Text>
              <Text style={styles.sectionBody}>{entry.challenges}</Text>
            </View>
          )}

          {!!entry.supervisor_score || entry.supervisor_score === 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>SUPERVISOR SCORE</Text>
              <Text style={styles.sectionBody}>{entry.supervisor_score}</Text>
            </View>
          ) : null}

          {!!entry.supervisor_feedback && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>SUPERVISOR FEEDBACK</Text>
              <Text style={styles.sectionBody}>{entry.supervisor_feedback}</Text>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>SUPPORTING ATTACHMENTS</Text>
            {attachments.length === 0 ? (
              <Text style={styles.emptyAttachment}>No supporting attachments.</Text>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.attachmentsRow}
              >
                {attachments.map((file) => (
                  <TouchableOpacity
                    key={file.url}
                    style={styles.attachmentCard}
                    onPress={() => handleOpenAttachment(file.url)}
                    activeOpacity={0.85}
                  >
                    {file.isImage ? (
                      <Image source={{ uri: file.url }} style={styles.attachmentImage} />
                    ) : (
                      <View style={styles.attachmentIconWrap}>
                        <MaterialCommunityIcons name="file-document-outline" size={26} color={PRIMARY} />
                      </View>
                    )}
                    <View style={styles.attachmentFooter}>
                      <Text style={styles.attachmentName} numberOfLines={1}>
                        {file.name}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>

        {/* Supervisor Actions */}
        {isSupervisor && (
          <View style={styles.actionsSection}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>SCORE / MARKS</Text>
              <TextInput
                value={score}
                onChangeText={setScore}
                placeholder="Enter score (0-100)"
                keyboardType="numeric"
                style={styles.input}
                placeholderTextColor={TEXT_FAINT}
                editable={canEditLogbooks && !submitting && !isApproved}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.sectionLabel}>SUPERVISOR FEEDBACK</Text>
              <TextInput
                value={feedback}
                onChangeText={setFeedback}
                placeholder="Add comments or instructions for the student..."
                style={[styles.input, styles.textArea]}
                placeholderTextColor={TEXT_FAINT}
                editable={canEditLogbooks && !submitting && !isApproved}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.approveButton, (submitting || !canEditLogbooks || isApproved) && styles.buttonDisabled]}
                onPress={handleApprove}
                disabled={submitting || !canEditLogbooks || isApproved}
              >
                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                <Text style={styles.approveText}>{isApproved ? 'Approved' : 'Approve Entry'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.revisionButton, (submitting || !canEditLogbooks || isApproved) && styles.buttonDisabled]}
                onPress={handleRevision}
                disabled={submitting || !canEditLogbooks || isApproved}
              >
                <MaterialCommunityIcons name="file-edit-outline" size={18} color={SECONDARY} />
                <Text style={styles.revisionText}>Request Revision</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  header: {
    backgroundColor: BACKGROUND,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(13, 122, 107, 0.08)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF2F0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: PRIMARY_DARK,
  },
  headerSpacer: { width: 36 },
  profilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F5F1',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 8,
  },
  profileAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitials: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  profileInfo: {
    maxWidth: 140,
  },
  profileName: {
    fontSize: 12,
    fontWeight: '700',
    color: PRIMARY_DARK,
  },
  profileMeta: {
    fontSize: 10,
    color: PRIMARY,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 32,
    gap: 16,
  },
  contextCard: {
    backgroundColor: SURFACE,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(189, 201, 197, 0.5)',
    shadowColor: PRIMARY,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  contextTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  contextInfo: {
    flex: 1,
  },
  weekBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E0F5F1',
    color: PRIMARY_DARK,
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  contextTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginTop: 8,
  },
  contextDate: {
    fontSize: 12,
    color: TEXT_FAINT,
    marginTop: 4,
  },
  contextIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(253, 118, 26, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contextStatsRow: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(189, 201, 197, 0.4)',
    flexDirection: 'row',
  },
  contextStat: {
    flex: 1,
    alignItems: 'center',
  },
  contextLabel: {
    fontSize: 11,
    letterSpacing: 0.5,
    color: TEXT_FAINT,
    fontWeight: '600',
  },
  contextValue: {
    fontSize: 26,
    color: PRIMARY_DARK,
    fontWeight: '700',
    marginTop: 4,
  },
  reviewCard: {
    backgroundColor: SURFACE,
    borderRadius: 18,
    padding: 18,
    shadowColor: PRIMARY,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  reviewMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewMetaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reviewMetaText: {
    fontSize: 12,
    color: TEXT_MUTED,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  hoursBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: SECONDARY_SOFT,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  hoursText: {
    fontSize: 10,
    fontWeight: '700',
    color: SECONDARY,
  },
  reviewTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginTop: 12,
  },
  statusRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusApproved: { backgroundColor: '#E0F5F1' },
  statusPending: { backgroundColor: SECONDARY_SOFT },
  statusRejected: { backgroundColor: '#FCE8E8' },
  statusRevision: { backgroundColor: '#FAEEDA' },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  statusTextApproved: { color: PRIMARY },
  statusTextPending: { color: SECONDARY },
  statusTextRejected: { color: '#C62828' },
  statusTextRevision: { color: '#BA7517' },
  reviewedAt: {
    fontSize: 12,
    color: TEXT_FAINT,
  },
  section: {
    marginTop: 16,
    gap: 8,
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1,
    color: TEXT_FAINT,
    fontWeight: '700',
  },
  sectionBody: {
    fontSize: 14,
    color: TEXT_MUTED,
    lineHeight: 22,
  },
  attachmentsRow: {
    gap: 12,
    paddingTop: 4,
    paddingBottom: 8,
  },
  attachmentCard: {
    width: 160,
    height: 120,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(189, 201, 197, 0.6)',
    backgroundColor: '#F1F4F2',
  },
  attachmentImage: {
    width: '100%',
    height: '100%',
  },
  attachmentIconWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentFooter: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    right: 6,
    backgroundColor: 'rgba(13, 122, 107, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  attachmentName: {
    fontSize: 10,
    color: '#FFFFFF',
  },
  emptyAttachment: {
    fontSize: 12,
    color: TEXT_FAINT,
  },
  actionsSection: {
    gap: 16,
    paddingBottom: 8,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_MUTED,
    letterSpacing: 1,
  },
  input: {
    height: 50,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: 'rgba(189, 201, 197, 0.7)',
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 15,
    color: TEXT_PRIMARY,
  },
  textArea: {
    height: 110,
    paddingTop: 12,
  },
  actionRow: {
    flexDirection: 'column',
    gap: 12,
  },
  approveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: PRIMARY_DARK,
    borderRadius: 26,
    height: 50,
  },
  approveText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  revisionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: SECONDARY,
    height: 50,
  },
  revisionText: {
    color: SECONDARY,
    fontSize: 15,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: TEXT_MUTED,
    textAlign: 'center',
  },
});
