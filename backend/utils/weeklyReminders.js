const supabase = require('../config/db');
const { notifyMany } = require('../config/notify');

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
            name: attachment.students.full_name
          });
        }
      }
    }

    // Send notifications in bulk
    if (reminders.length > 0) {
      console.log(`Sending reminders to ${reminders.length} students...`);
      
      // Group by week if needed, or just send general message
      // For simplicity, sending individual messages via notifyMany if they are the same
      // But since week numbers might differ, we'll do it in a loop or optimized way
      for (const r of reminders) {
        const message = `⚠️ Reminder: Your Weekly Logbook for Week ${r.week} is due today by 11:59 PM. Please ensure your entries are submitted.`;
        await notifyMany([r.user_id], message);
        console.log(`Reminder sent to ${r.name} (Week ${r.week})`);
      }
    } else {
      console.log('All students have submitted their logbooks for this week.');
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
