const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const supabase = require('../config/db');
const audit = require('../utils/audit');

// ─── POST /announcements ────────────────────────────────────────────────────
// Admin: any audience ('ALL','STUDENTS','SUPERVISORS','HOST_ORGS')
// Supervisor: audience locked to 'STUDENTS', scope = their assigned students
// Host: audience locked to 'STUDENTS', scope = their org's attachees
router.post('/', protect, async (req, res) => {
  const { title, body } = req.body;
  const sender = req.user;

  if (!title || !body) {
    return res.status(400).json({ error: 'Title and body are required.' });
  }

  let audience = req.body.audience || 'ALL';
  let scope_org_id = null;
  let scope_supervisor_id = null;

  if (sender.role === 'supervisor') {
    audience = 'STUDENTS';
    scope_supervisor_id = sender.user_id;
  } else if (sender.role === 'host_org') {
    audience = 'STUDENTS';
    const { data: profile } = await supabase
      .from('users')
      .select('org_id')
      .eq('user_id', sender.user_id)
      .maybeSingle();
    scope_org_id = profile?.org_id || null;
  } else if (sender.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized to send announcements.' });
  }

  const validAudiences = ['ALL', 'STUDENTS', 'SUPERVISORS', 'HOST_ORGS'];
  if (!validAudiences.includes(audience)) {
    return res.status(400).json({ error: 'Invalid audience value.' });
  }

  const { data, error } = await supabase
    .from('announcements')
    .insert({
      title,
      body,
      audience,
      scope_org_id,
      scope_supervisor_id,
      sent_by: sender.user_id,
      sent_by_role: sender.role,
    })
    .select()
    .single();

  if (error) {
    console.error('Create announcement error:', error);
    return res.status(500).json({ error: 'Failed to create announcement.' });
  }

  await audit(
    sender,
    'CREATE_ANNOUNCEMENT',
    'announcements',
    data.id,
    `Announcement "${title}" created for ${audience}`,
    { announcement_id: data.id, title, audience }
  );

  return res.status(201).json({ announcement: data });
});

// ─── GET /announcements ─────────────────────────────────────────────────────
// Returns announcements relevant to the calling user, with read status.
// Admin sees all. Students/supervisors/hosts see what's addressed to them.
router.get('/', protect, async (req, res) => {
  const user = req.user;

  let query = supabase
    .from('announcements')
    .select(`
      *,
      sender:sent_by (
        user_id,
        full_name,
        role
      )
    `)
    .order('created_at', { ascending: false });

  if (user.role === 'admin') {
    // admins see everything
  } else if (user.role === 'student') {
    // student sees: ALL, STUDENTS audience
    // + supervisor-scoped (their supervisor)
    // + org-scoped (their org)
    const { data: attachment } = await supabase
      .from('attachments')
      .select('supervisor_id, org_id')
      .eq('student_id', user.user_id)
      .eq('status', 'approved')
      .maybeSingle();

    const supervisorId = attachment?.supervisor_id || null;
    const orgId = attachment?.org_id || null;

    query = query.or(
      [
        `audience.eq.ALL`,
        `audience.eq.STUDENTS`,
        supervisorId ? `and(audience.eq.STUDENTS,scope_supervisor_id.eq.${supervisorId})` : null,
        orgId ? `and(audience.eq.STUDENTS,scope_org_id.eq.${orgId})` : null,
      ]
        .filter(Boolean)
        .join(',')
    );
  } else if (user.role === 'supervisor') {
    // supervisor sees: ALL, SUPERVISORS, their own sent ones
    query = query.or(`audience.eq.ALL,audience.eq.SUPERVISORS,sent_by.eq.${user.user_id}`);
  } else if (user.role === 'host_org') {
    // host sees: ALL, HOST_ORGS, their own sent ones
    query = query.or(`audience.eq.ALL,audience.eq.HOST_ORGS,sent_by.eq.${user.user_id}`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Fetch announcements error:', error);
    return res.status(500).json({ error: 'Failed to fetch announcements.' });
  }

  const announcements = data || [];

  const announcementIds = announcements.map((announcement) => announcement.id).filter(Boolean);
  let readSet = new Set();

  if (announcementIds.length) {
    const { data: readRows, error: readError } = await supabase
      .from('announcement_reads')
      .select('announcement_id')
      .eq('user_id', user.user_id)
      .in('announcement_id', announcementIds);

    if (readError) {
      console.error('Fetch announcement reads error:', readError);
      return res.status(500).json({ error: 'Failed to fetch announcement read state.' });
    }

    readSet = new Set((readRows || []).map((row) => String(row.announcement_id)));
  }

  const announcementsWithReadState = announcements.map((announcement) => ({
    ...announcement,
    is_read: readSet.has(String(announcement.id)),
  }));

  return res.json({ announcements: announcementsWithReadState });
});

// ─── PATCH /announcements/:id/read ──────────────────────────────────────────
router.patch('/:id/read', protect, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.user_id;

  const { error } = await supabase
    .from('announcement_reads')
    .upsert({ announcement_id: id, user_id: userId }, { onConflict: 'announcement_id,user_id' });

  if (error) {
    console.error('Mark read error:', error);
    return res.status(500).json({ error: 'Failed to mark as read.' });
  }

  return res.json({ success: true });
});

// ─── DELETE /announcements/:id ───────────────────────────────────────────────
// Only the sender or an admin can delete
router.delete('/:id', protect, async (req, res) => {
  const { id } = req.params;
  const user = req.user;

  const { data: announcement, error: fetchErr } = await supabase
    .from('announcements')
    .select('id, sent_by, title')
    .eq('id', id)
    .single();

  if (fetchErr || !announcement) {
    return res.status(404).json({ error: 'Announcement not found.' });
  }

  if (user.role !== 'admin' && announcement.sent_by !== user.user_id) {
    return res.status(403).json({ error: 'Not authorized to delete this announcement.' });
  }

  const { error } = await supabase.from('announcements').delete().eq('id', id);

  if (error) {
    console.error('Delete announcement error:', error);
    return res.status(500).json({ error: 'Failed to delete announcement.' });
  }

  await audit(
    user,
    'DELETE_ANNOUNCEMENT',
    'announcements',
    id,
    `Announcement "${announcement.title}" deleted`,
    { announcement_id: id, title: announcement.title }
  );

  return res.json({ success: true });
});

module.exports = router;