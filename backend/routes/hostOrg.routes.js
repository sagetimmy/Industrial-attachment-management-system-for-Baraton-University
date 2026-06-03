const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { getRolePermissions, requireRolePermission } = require('../utils/rolePermissions');
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

    const permissions = await getRolePermissions(req.user.role);
    const stats = permissions.viewAnalytics === false
      ? null
      : {
          total: flat.length,
          pending: flat.filter(a => a.status === 'pending').length,
          ongoing: flat.filter(a => a.status === 'ongoing').length,
          completed: flat.filter(a => a.status === 'completed').length,
        };

    res.json({ org, applications: flat, stats, permissions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/host-orgs/profile
router.put('/profile', protect, requireRolePermission('editOrgProfile'), async (req, res) => {
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

// PUT /api/host-orgs/application/:attachmentId - Confirm or reject placement
router.put('/application/:attachmentId', protect, async (req, res) => {
  const { attachmentId } = req.params;
  const { status } = req.body;

  if (!status || !['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Status must be either "approved" or "rejected"' });
  }

  try {
    console.log('PUT /application/:attachmentId received:', { attachmentId, status, user_id: req.user.user_id });

    // Verify attachment belongs to this organization
    const { data: attachment, error: attachError } = await supabase
      .from('attachments')
      .select('attachment_id, org_id, student_id, host_organizations!attachments_org_id_fkey(user_id)')
      .eq('attachment_id', attachmentId)
      .single();

    if (attachError || !attachment) {
      console.error('Attachment lookup error:', attachError);
      return res.status(404).json({ message: 'Attachment not found' });
    }

    // Check that the organization belongs to the logged-in user
    if (attachment.host_organizations?.user_id !== req.user.user_id) {
      return res.status(403).json({ message: 'Not authorized to update this application' });
    }

    // Update the attachment status
    const { error: updateError } = await supabase
      .from('attachments')
      .update({ status })
      .eq('attachment_id', attachmentId);

    if (updateError) {
      console.error('Attachment update error:', updateError);
      throw updateError;
    }

    console.log('Application updated successfully:', { attachmentId, status });
    res.json({ message: `Application ${status} successfully!` });
  } catch (err) {
    console.error('PUT /application error:', err);
    res.status(500).json({ message: err.message });
  }
});

// POST /api/host-orgs/vacancies
router.post('/vacancies', protect, requireRolePermission('postPlacements'), async (req, res) => {
  try {
    const { role_title, department, available_slots, application_deadline, description, requirements } = req.body;

    console.log('POST /vacancies received:', { role_title, department, available_slots, application_deadline, description, requirements });

    if (!role_title || !department || !available_slots || !application_deadline || !description)
      return res.status(400).json({ message: 'All fields are required' });

    if (available_slots < 1)
      return res.status(400).json({ message: 'Must have at least 1 available slot' });

    if (!Array.isArray(requirements) || requirements.length === 0)
      return res.status(400).json({ message: 'At least one requirement is required' });

    const { data: org, error: orgError } = await supabase
      .from('host_organizations')
      .select('org_id')
      .eq('user_id', req.user.user_id)
      .single();

    if (orgError || !org) {
      console.error('Organization lookup error:', orgError);
      return res.status(404).json({ message: 'Organization not found' });
    }

    // Parse deadline from mm/dd/yyyy to YYYY-MM-DD format
    let parsedDeadline = application_deadline;
    if (typeof application_deadline === 'string' && application_deadline.includes('/')) {
      const [month, day, year] = application_deadline.split('/');
      parsedDeadline = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    console.log('Parsed deadline:', parsedDeadline);

    const { data: vacancy, error } = await supabase
      .from('vacancies')
      .insert({
        org_id: org.org_id,
        role_title,
        department,
        available_slots,
        application_deadline: parsedDeadline,
        description,
        requirements,
        status: 'open',
      })
      .select()
      .single();

    if (error) {
      console.error('Database error inserting vacancy:', error);
      throw error;
    }

    console.log('Vacancy created successfully:', vacancy);
    res.status(201).json({ message: 'Vacancy posted successfully!', vacancy });
  } catch (err) {
    console.error('POST /vacancies error:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
