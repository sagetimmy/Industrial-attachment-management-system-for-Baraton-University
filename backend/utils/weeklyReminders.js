const supabase = require('../config/db');
const { notifyMany } = require('../config/notify');
const { sendLogbookReminderEmail } = require('../config/mailer');

const sendWeeklyReminders = async () => {
  console.log('--- Starting Weekly Logbook Reminders ---');
  try {
    // Get all ongoing attachments
    const { data: attachments, error: aErr } = await supabase
      .from('attachments')
      .select(`
        attachment_id,
        start_date,
        students!attachments_student_id_fkey (user_id, full_name)
      `)
      .eq('status', 'ongoing');

    if (aErr) throw aErr;
    if (!attachments || attachments.length === 0) {
      console.log('No ongoing attachments found.');
      return;
    }

    const today = new Date();
    const reminders = [];

    for (const attachment of attachments) {
      const startDate = new Date(attachment.start_date);

      // Calculate week number: (today - start) / 7 days
      const diffTime = Math.abs(today - startDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const currentWeek = Math.ceil(diffDays / 7);

      // Check if logbook for this week exists
      const { data: entry, error: eErr } = await supabase
        .from('logbook_entries')
        .select('entry_id')
        .eq('attachment_id', attachment.attachment_id)
        .eq('week_number', currentWeek)
        .maybeSingle();

      if (eErr) {
        console.error(`Error checking logbook for attachment ${attachment.attachment_id}:`, eErr.message);
        continue;
      }

      // If no entry, add to reminder list
      if (!entry) {
        if (attachment.students?.user_id) {
          reminders.push({
            user_id: attachment.students.user_id,
            week: currentWeek,
            name: attachment.students.full_name,
          });
        }
      }
    }

    if (reminders.length === 0) {
      console.log('All students have submitted their logbooks for this week.');
      console.log('--- Weekly Logbook Reminders Completed ---');
      return;
    }

    console.log(`Sending reminders to ${reminders.length} students...`);

    // Look up emails for everyone being reminded — students table only
    // holds user_id, the actual login email lives on users.
    const userIds = reminders.map(r => r.user_id);
    let emailMap = {};
    const { data: userRows, error: uErr } = await supabase
      .from('users').select('user_id, email').in('user_id', userIds);
    if (uErr) {
      console.error('Failed to fetch reminder recipient emails:', uErr.message);
    } else {
      (userRows || []).forEach(u => { emailMap[u.user_id] = u.email; });
    }

    for (const r of reminders) {
      const message = `⚠️ Reminder: Your Weekly Logbook for Week ${r.week} is due today by 11:59 PM. Please ensure your entries are submitted.`;

      // In-app notification
      await notifyMany([r.user_id], message);

      // Actual email via Brevo — wrapped so one failed send doesn't stop
      // the rest of the batch.
      const email = emailMap[r.user_id];
      if (email) {
        try {
          await sendLogbookReminderEmail(email, r.name || 'Student', r.week);
        } catch (mailErr) {
          console.error(`Failed to send reminder email to ${r.name} (${email}):`, mailErr.message);
        }
      } else {
        console.warn(`No email on file for user_id ${r.user_id} (${r.name}) — skipped email reminder.`);
      }

      console.log(`Reminder sent to ${r.name} (Week ${r.week})`);
    }
  } catch (err) {
    console.error('Weekly reminder task failed:', err.message);
  }
  console.log('--- Weekly Logbook Reminders Completed ---');
};

// If run directly
if (require.main === module) {
  sendWeeklyReminders();
}

module.exports = sendWeeklyReminders;