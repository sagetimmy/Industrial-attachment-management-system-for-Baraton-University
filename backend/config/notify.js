const supabase = require('./db');

const notify = async (user_id, message) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({ user_id, message });

    if (error) throw error;
  } catch (err) {
    console.error('Notification error:', err.message);
  }
};

// Notify multiple users at once
const notifyMany = async (user_ids, message) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert(user_ids.map(user_id => ({ user_id, message })));

    if (error) throw error;
  } catch (err) {
    console.error('Notification error:', err.message);
  }
};

module.exports = { notify, notifyMany };