const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const supabase = require('../config/db');

// GET /api/notifications
router.get('/', protect, async (req, res) => {
  try {
    // ✅ Debug: Log the user object
    console.log('👤 User in notifications GET:', {
      user_id: req.user.user_id,
      auth_id: req.user.auth_id,
      email: req.user.email,
      role: req.user.role,
      dbUser: req.user.dbUser ? 'exists' : 'null'
    });

    // ✅ Debug: Log the query
    console.log('📝 Querying notifications for user_id:', req.user.user_id);

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', req.user.user_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching notifications:', error);
      throw error;
    }

    console.log('✅ Found', data?.length || 0, 'notifications');
    res.json(data || []);
  } catch (err) {
    console.error('❌ GET /notifications error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/notifications/unread-count
router.get('/unread-count', protect, async (req, res) => {
  try {
    // ✅ Debug: Log the user object
    console.log('👤 User in unread-count:', {
      user_id: req.user.user_id,
      auth_id: req.user.auth_id,
      email: req.user.email,
      role: req.user.role
    });

    // ✅ Debug: Check if user_id exists
    if (!req.user.user_id) {
      console.error('❌ No user_id found in req.user:', req.user);
      return res.status(400).json({ 
        error: 'User ID not found in request',
        user: req.user 
      });
    }

    console.log('📝 Querying unread count for user_id:', req.user.user_id);

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', req.user.user_id)
      .eq('is_read', false);

    if (error) {
      console.error('❌ Unread count query error:', error);
      throw error;
    }
    
    const count = data?.length || 0;
    console.log('✅ Unread count:', count);
    res.json({ count });
  } catch (err) {
    console.error('❌ GET /unread-count error:', err.message);
    console.error('📚 Full error:', err);
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/notifications/read-all
router.put('/read-all', protect, async (req, res) => {
  try {
    console.log('📝 Marking all notifications as read for user:', req.user.user_id);

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', req.user.user_id);

    if (error) throw error;
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    console.error('❌ PUT /read-all error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', protect, async (req, res) => {
  try {
    console.log(`📝 Marking notification ${req.params.id} as read for user:`, req.user.user_id);

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('notif_id', req.params.id)
      .eq('user_id', req.user.user_id);

    if (error) {
      console.error('❌ Error marking as read:', error);
      throw error;
    }
    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    console.error('❌ PUT /:id/read error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/notifications/clear-all
router.delete('/clear-all', protect, async (req, res) => {
  try {
    console.log('🗑️ Clearing all notifications for user:', req.user.user_id);

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', req.user.user_id);

    if (error) throw error;
    res.json({ message: 'All notifications cleared' });
  } catch (err) {
    console.error('❌ DELETE /clear-all error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/notifications/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    console.log(`🗑️ Deleting notification ${req.params.id} for user:`, req.user.user_id);

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('notif_id', req.params.id)
      .eq('user_id', req.user.user_id);

    if (error) {
      console.error('❌ Error deleting notification:', error);
      throw error;
    }
    res.json({ message: 'Notification deleted' });
  } catch (err) {
    console.error('❌ DELETE /:id error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;