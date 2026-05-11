const db = require('./db');

const notify = async (user_id, message) => {
  try {
    await db.query(
      'INSERT INTO notifications (user_id, message) VALUES (?, ?)',
      [user_id, message]
    );
  } catch (err) {
    console.error('Notification error:', err.message);
  }
};

// Notify multiple users at once
const notifyMany = async (user_ids, message) => {
  try {
    for (const user_id of user_ids) {
      await notify(user_id, message);
    }
  } catch (err) {
    console.error('Notification error:', err.message);
  }
};

module.exports = { notify, notifyMany };