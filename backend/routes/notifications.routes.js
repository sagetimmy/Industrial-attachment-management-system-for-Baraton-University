const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const supabase = require('../config/db');

// GET /api/notifications
router.get('/', protect, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', req.user.user_id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/notifications/unread-count
router.get('/unread-count', protect, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', req.user.user_id)
      .eq('is_read', false);

    if (error) {
      console.error('Unread count query error:', error);
      throw error;
    }
    
    const count = data?.length || 0;
    res.json({ count });
  } catch (err) {
    console.error('GET /unread-count error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/notifications/read-all  ← must be before /:id to avoid route conflict
router.put('/read-all', protect, async (req, res) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', req.user.user_id);

    if (error) throw error;
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', protect, async (req, res) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('notif_id', req.params.id)
      .eq('user_id', req.user.user_id);

    if (error) throw error;
    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/notifications/clear-all  ← must be before /:id to avoid route conflict
router.delete('/clear-all', protect, async (req, res) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', req.user.user_id);

    if (error) throw error;
    res.json({ message: 'All notifications cleared' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/notifications/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('notif_id', req.params.id)
      .eq('user_id', req.user.user_id);

    if (error) throw error;
    res.json({ message: 'Notification deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;