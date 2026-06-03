const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const supabase = require('../config/db');

// GET /api/activities
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('id, action, actor_email, actor_role, description, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ activities: data || [] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/activities
router.delete('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { error } = await supabase
      .from('audit_logs')
      .delete()
      .gt('id', 0);

    if (error) throw error;

    res.json({ message: 'Activities cleared' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
