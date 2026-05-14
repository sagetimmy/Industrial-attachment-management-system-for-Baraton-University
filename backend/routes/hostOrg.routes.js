const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const supabase = require('../config/db');

// GET /api/host-orgs/dashboard
router.get('/dashboard', protect, async (req, res) => {
  try {
    const { data: org, error: orgError } = await supabase
      .from('host_organizations')
      .select('*')
      .eq('user_id', req.user.user_id)
      .single();

    if (orgError || !org) return res.status(404).json({ message: 'Organization not found' });

    const { data: applications, error: appError } = await supabase
      .from('attachments')
      .select(`
        attachment_id, status, start_date, end_date,
        students (full_name, reg_number, department, year_of_study, phone)
      `)
      .eq('org_id', org.org_id)
      .order('created_at', { ascending: false });

    if (appError) throw appError;

    // Flatten student fields onto each application
    const flat = applications.map(({ students, ...a }) => ({ ...a, ...students }));

    const total = flat.length;
    const pending = flat.filter(a => a.status === 'pending').length;
    const ongoing = flat.filter(a => a.status === 'ongoing').length;
    const completed = flat.filter(a => a.status === 'completed').length;

    res.json({ org, applications: flat, stats: { total, pending, ongoing, completed } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/host-orgs/profile
router.put('/profile', protect, async (req, res) => {
  const { org_name, location, contact_person, phone, available_slots } = req.body;

  if (!org_name || !location || !contact_person || !phone)
    return res.status(400).json({ message: 'All fields are required' });

  if (available_slots < 0)
    return res.status(400).json({ message: 'Available slots cannot be negative' });

  try {
    const { error } = await supabase
      .from('host_organizations')
      .update({ org_name, location, contact_person, phone, available_slots })
      .eq('user_id', req.user.user_id);

    if (error) throw error;
    res.json({ message: 'Profile updated successfully!' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/host-orgs/available-slots
router.get('/available-slots', protect, async (req, res) => {
  try {
    const { data: org, error: orgError } = await supabase
      .from('host_organizations')
      .select('org_id, available_slots')
      .eq('user_id', req.user.user_id)
      .single();

    if (orgError || !org) return res.status(404).json({ message: 'Organization not found' });

    const { count, error: countError } = await supabase
      .from('attachments')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', org.org_id)
      .eq('status', 'ongoing');

    if (countError) throw countError;

    const usedSlots = count || 0;
    res.json({
      available_slots: org.available_slots,
      used_slots: usedSlots,
      total_capacity: (org.available_slots || 0) + usedSlots,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/host-orgs/evaluate/:attachmentId
router.post('/evaluate/:attachmentId', protect, async (req, res) => {
  const { rating, comments } = req.body;
  const { attachmentId } = req.params;

  if (!rating || rating < 1 || rating > 5)
    return res.status(400).json({ message: 'Rating must be between 1 and 5' });

  if (!comments || comments.trim().length === 0)
    return res.status(400).json({ message: 'Comments are required' });

  try {
    // Check attachment exists and belongs to this org
    const { data: attachment, error: attachError } = await supabase
      .from('attachments')
      .select('attachment_id, org_id, status, host_organizations!inner(user_id)')
      .eq('attachment_id', attachmentId)
      .eq('host_organizations.user_id', req.user.user_id)
      .single();

    if (attachError || !attachment)
      return res.status(404).json({ message: 'Attachment not found or not authorized' });

    if (!['ongoing', 'completed'].includes(attachment.status))
      return res.status(400).json({ message: 'Can only evaluate active or completed attachments' });

    // Check if evaluation already exists
    const { data: existing } = await supabase
      .from('evaluations')
      .select('evaluation_id')
      .eq('attachment_id', attachmentId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('evaluations')
        .update({ rating, comments, created_at: new Date().toISOString() })
        .eq('attachment_id', attachmentId);

      if (error) throw error;
      return res.json({ message: 'Evaluation updated successfully!' });
    } else {
      const { error } = await supabase
        .from('evaluations')
        .insert({ attachment_id: attachmentId, supervisor_id: null, rating, comments });

      if (error) throw error;
      return res.json({ message: 'Evaluation submitted successfully!' });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/host-orgs/ongoing-attachments
router.get('/ongoing-attachments', protect, async (req, res) => {
  try {
    const { data: org, error: orgError } = await supabase
      .from('host_organizations')
      .select('org_id')
      .eq('user_id', req.user.user_id)
      .single();

    if (orgError || !org) return res.status(404).json({ message: 'Organization not found' });

    const { data: attachments, error } = await supabase
      .from('attachments')
      .select(`
        attachment_id, status, start_date,
        students (full_name, reg_number, department),
        evaluations (rating, comments, created_at)
      `)
      .eq('org_id', org.org_id)
      .in('status', ['ongoing', 'completed'])
      .order('status', { ascending: false })
      .order('start_date', { ascending: false });

    if (error) throw error;

    const flat = attachments.map(({ students, evaluations, ...a }) => ({
      ...a,
      ...students,
      rating: evaluations?.[0]?.rating || null,
      comments: evaluations?.[0]?.comments || null,
      evaluated_at: evaluations?.[0]?.created_at || null,
    }));

    res.json(flat);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;