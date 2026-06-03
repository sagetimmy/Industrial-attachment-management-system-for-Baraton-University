const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { requireRolePermission } = require('../utils/rolePermissions');
const supabase = require('../config/db');

// Helper: get supervisor record from user_id
const getSupervisor = async (user_id) => {
  const { data, error } = await supabase
    .from('supervisors')
    .select('*')
    .eq('user_id', user_id)
    .single();
  return { supervisor: data, error };
};

const getSupervisorAssignmentId = (supervisor, fallbackUserId) => (
  supervisor?.supervisor_id || supervisor?.user_id || fallbackUserId
);

const getLogbookEntryForSupervisor = async (entryId, supervisor, fallbackUserId) => {
  const { data, error } = await supabase
    .from('logbook_entries')
    .select(`
      entry_id,
      week_number,
      attachment_id,
      attachments!logbook_entries_attachment_id_fkey (
        attachment_id,
        supervisor_id,
        students!attachments_student_id_fkey (user_id, full_name, reg_number)
      )
    `)
    .eq('entry_id', entryId)
    .single();

  if (error || !data) return { entry: null, error, status: 404 };
  const allowedSupervisorIds = new Set([
    supervisor?.user_id,
    supervisor?.supervisor_id,
    fallbackUserId,
  ].filter(Boolean));
  if (!allowedSupervisorIds.has(data.attachments?.supervisor_id)) {
    return { entry: null, error: new Error('Unauthorized'), status: 403 };
  }
  return { entry: data, error: null, status: 200 };
};

const reviewUpdate = (status, score, feedback) => ({
  status,
  reviewed_at: new Date().toISOString(),
  supervisor_score: (() => {
    if (score === undefined || score === null || String(score).trim() === '') return null;
    const parsed = Number(score);
    return Number.isFinite(parsed) ? parsed : null;
  })(),
  supervisor_feedback: feedback || null,
});

const flattenPendingLogs = (rows = []) =>
  rows.map((log) => ({
    ...log,
    full_name: log.attachments?.students?.full_name || null,
    reg_number: log.attachments?.students?.reg_number || null,
    attachments: undefined,
  }));

// GET /api/supervisors/dashboard
router.get('/dashboard', protect, async (req, res) => {
  try {
    const { supervisor, error: sErr } = await getSupervisor(req.user.user_id);
    if (sErr || !supervisor) return res.status(404).json({ message: 'Supervisor not found' });

    const supervisorAssignmentId = getSupervisorAssignmentId(supervisor, req.user.user_id);

    const { data: students, error: stErr } = await supabase
      .from('attachments')
      .select(`
        status, start_date, end_date, attachment_id,
        students!attachments_student_id_fkey (full_name, reg_number, department, phone),
        host_organizations!attachments_org_id_fkey (org_name, location)
      `)
      .eq('supervisor_id', supervisorAssignmentId);

    if (stErr) throw stErr;

    const { data: pendingLogs, error: lErr } = await supabase
      .from('logbook_entries')
      .select(`
        entry_id, week_number, submitted_at, description,
        attachments!logbook_entries_attachment_id_fkey (
          supervisor_id,
          students!attachments_student_id_fkey (full_name, reg_number)
        )
      `)
      .eq('attachments.supervisor_id', supervisorAssignmentId)
      .order('submitted_at', { ascending: false })
      .limit(5);

    if (lErr) throw lErr;

    const { data: upcomingVisits, error: vErr } = await supabase
      .from('site_visits')
      .select(`
        *,
        attachments!site_visits_attachment_id_fkey (
          students!attachments_student_id_fkey (full_name),
          host_organizations!attachments_org_id_fkey (org_name)
        )
      `)
      .eq('supervisor_id', supervisorAssignmentId)
      .eq('status', 'scheduled')
      .gte('visit_date', new Date().toISOString().split('T')[0])
      .order('visit_date', { ascending: true })
      .limit(3);

    if (vErr) throw vErr;

    const flatStudents = (students || []).map(a => ({
      ...a.students,
      ...a.host_organizations,
      status: a.status,
      start_date: a.start_date,
      end_date: a.end_date,
      attachment_id: a.attachment_id,
    }));

    const flatPendingLogs = flattenPendingLogs(pendingLogs || []);

    res.json({
      supervisor,
      students: flatStudents,
      pendingLogs: flatPendingLogs,
      upcomingVisits: upcomingVisits || [],
      stats: {
        totalStudents: flatStudents.length,
        activeStudents: flatStudents.filter(s => s.status === 'ongoing').length,
        pendingLogs: flatPendingLogs.length || 0,
        upcomingVisits: upcomingVisits?.length || 0,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/supervisors/students
router.get('/students', protect, async (req, res) => {
  try {
    const { supervisor, error: sErr } = await getSupervisor(req.user.user_id);
    if (sErr || !supervisor) return res.status(404).json({ message: 'Supervisor not found' });

    const supervisorAssignmentId = getSupervisorAssignmentId(supervisor, req.user.user_id);

    const { data, error } = await supabase
      .from('attachments')
      .select(`
        attachment_id, status, start_date, end_date,
        students!attachments_student_id_fkey (
          *, users!students_user_id_fkey (email)
        ),
        host_organizations!attachments_org_id_fkey (org_name, location),
        logbook_entries!logbook_entries_attachment_id_fkey (entry_id)
      `)
      .eq('supervisor_id', supervisorAssignmentId)
      .order('students(full_name)', { ascending: true });

    if (error) throw error;

    const result = (data || []).map(a => ({
      ...a.students,
      email: a.students?.users?.email,
      attachment_id: a.attachment_id,
      status: a.status,
      start_date: a.start_date,
      end_date: a.end_date,
      org_name: a.host_organizations?.org_name,
      location: a.host_organizations?.location,
      logbook_count: a.logbook_entries?.length || 0,
    }));

    res.json(result);
  } catch (err) {
    console.error('Students error:', err);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/supervisors/logbooks
router.get('/logbooks', protect, async (req, res) => {
  try {
    const { supervisor, error: sErr } = await getSupervisor(req.user.user_id);
    if (sErr || !supervisor) return res.status(404).json({ message: 'Supervisor not found' });

    const supervisorAssignmentId = getSupervisorAssignmentId(supervisor, req.user.user_id);

    const { data, error } = await supabase
      .from('logbook_entries')
      .select(`
        entry_id,
        week_number,
        submitted_at,
        description,
        tasks_done,
        challenges,
        document_url,
        status,
        supervisor_score,
        supervisor_feedback,
        reviewed_at,
        attachment_id,
        attachments!logbook_entries_attachment_id_fkey (
          attachment_id,
          supervisor_id,
          students!attachments_student_id_fkey (full_name, reg_number),
          host_organizations!attachments_org_id_fkey (org_name)
        )
      `)
      .eq('attachments.supervisor_id', supervisorAssignmentId)
      .order('submitted_at', { ascending: false });

    if (error) throw error;

    const result = (data || []).map(l => ({
      entry_id: l.entry_id,
      week_number: l.week_number,
      submitted_at: l.submitted_at,
      description: l.description,
      tasks_done: l.tasks_done,
      challenges: l.challenges,
      document_url: l.document_url,
      status: l.status,
      supervisor_score: l.supervisor_score,
      supervisor_feedback: l.supervisor_feedback,
      reviewed_at: l.reviewed_at,
      attachment_id: l.attachment_id || l.attachments?.attachment_id,
      full_name: l.attachments?.students?.full_name,
      reg_number: l.attachments?.students?.reg_number,
      org_name: l.attachments?.host_organizations?.org_name,
    }));

    res.json(result);
  } catch (err) {
    console.error('Logbooks error:', err);
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/supervisors/logbooks/:entryId/approve
router.put('/logbooks/:entryId/approve', protect, requireRolePermission('editLogbooks'), async (req, res) => {
  const { score, feedback } = req.body || {};
  try {
    const { supervisor, error: sErr } = await getSupervisor(req.user.user_id);
    if (sErr || !supervisor) return res.status(404).json({ message: 'Supervisor not found' });

    const supervisorAssignmentId = getSupervisorAssignmentId(supervisor, req.user.user_id);
    const { entry, error, status } = await getLogbookEntryForSupervisor(
      req.params.entryId,
      supervisor,
      supervisorAssignmentId
    );
    if (error) {
      const message = status === 404 ? 'Logbook entry not found' : 'Not authorized to review this entry';
      return res.status(status || 403).json({ message });
    }

    const { error: updateErr } = await supabase
      .from('logbook_entries')
      .update(reviewUpdate('approved', score, feedback))
      .eq('entry_id', entry.entry_id);

    if (updateErr) throw updateErr;

    const studentUserId = entry.attachments?.students?.user_id;
    if (studentUserId) {
      const scoreNote = score !== undefined && score !== null && String(score).trim()
        ? ` Score: ${score}.`
        : '';
      const feedbackNote = feedback ? ` Feedback: ${feedback}` : '';
      await supabase.from('notifications').insert({
        user_id: studentUserId,
        message: `✅ Your Week ${entry.week_number} logbook entry was approved.${scoreNote}${feedbackNote}`,
      });
    }

    res.json({ message: 'Logbook entry approved' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/supervisors/logbooks/:entryId/reject
router.put('/logbooks/:entryId/reject', protect, requireRolePermission('editLogbooks'), async (req, res) => {
  const { feedback } = req.body || {};
  try {
    const { supervisor, error: sErr } = await getSupervisor(req.user.user_id);
    if (sErr || !supervisor) return res.status(404).json({ message: 'Supervisor not found' });

    const supervisorAssignmentId = getSupervisorAssignmentId(supervisor, req.user.user_id);
    const { entry, error, status } = await getLogbookEntryForSupervisor(
      req.params.entryId,
      supervisor,
      supervisorAssignmentId
    );
    if (error) {
      const message = status === 404 ? 'Logbook entry not found' : 'Not authorized to review this entry';
      return res.status(status || 403).json({ message });
    }

    const { error: updateErr } = await supabase
      .from('logbook_entries')
      .update(reviewUpdate('rejected', null, feedback))
      .eq('entry_id', entry.entry_id);

    if (updateErr) throw updateErr;

    const studentUserId = entry.attachments?.students?.user_id;
    if (studentUserId) {
      const feedbackNote = feedback ? ` Feedback: ${feedback}` : '';
      await supabase.from('notifications').insert({
        user_id: studentUserId,
        message: `❌ Your Week ${entry.week_number} logbook entry was rejected.${feedbackNote}`,
      });
    }

    res.json({ message: 'Logbook entry rejected' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/supervisors/logbooks/:entryId/revision
router.put('/logbooks/:entryId/revision', protect, requireRolePermission('editLogbooks'), async (req, res) => {
  const { feedback } = req.body || {};
  try {
    const { supervisor, error: sErr } = await getSupervisor(req.user.user_id);
    if (sErr || !supervisor) return res.status(404).json({ message: 'Supervisor not found' });

    const supervisorAssignmentId = getSupervisorAssignmentId(supervisor, req.user.user_id);
    const { entry, error, status } = await getLogbookEntryForSupervisor(
      req.params.entryId,
      supervisor,
      supervisorAssignmentId
    );
    if (error) {
      const message = status === 404 ? 'Logbook entry not found' : 'Not authorized to review this entry';
      return res.status(status || 403).json({ message });
    }

    const { error: updateErr } = await supabase
      .from('logbook_entries')
      .update(reviewUpdate('revision', null, feedback))
      .eq('entry_id', entry.entry_id);

    if (updateErr) throw updateErr;

    const studentUserId = entry.attachments?.students?.user_id;
    if (studentUserId) {
      const feedbackNote = feedback ? ` Feedback: ${feedback}` : '';
      await supabase.from('notifications').insert({
        user_id: studentUserId,
        message: `✍️ Revision requested for your Week ${entry.week_number} logbook entry.${feedbackNote}`,
      });
    }

    res.json({ message: 'Revision requested for logbook entry' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/supervisors/site-visits
router.get('/site-visits', protect, async (req, res) => {
  try {
    const { supervisor, error: sErr } = await getSupervisor(req.user.user_id);
    if (sErr || !supervisor) return res.status(404).json({ message: 'Supervisor not found' });

    const supervisorAssignmentId = getSupervisorAssignmentId(supervisor, req.user.user_id);

    const { data, error } = await supabase
      .from('site_visits')
      .select(`
        *,
        attachments!site_visits_attachment_id_fkey (
          attachment_id,
          students!attachments_student_id_fkey (full_name, reg_number),
          host_organizations!attachments_org_id_fkey (org_name, location)
        )
      `)
      .eq('supervisor_id', supervisorAssignmentId)
      .order('visit_date', { ascending: false });

    if (error) throw error;

    const result = (data || []).map(v => ({
      ...v,
      student_name: v.attachments?.students?.full_name,
      reg_number: v.attachments?.students?.reg_number,
      org_name: v.attachments?.host_organizations?.org_name,
      location: v.attachments?.host_organizations?.location,
      attachment_id: v.attachments?.attachment_id,
      attachments: undefined,
    }));

    res.json(result);
  } catch (err) {
    console.error('Site visits error:', err);
    res.status(500).json({ message: err.message });
  }
});

// POST /api/supervisors/site-visits
router.post('/site-visits', protect, requireRolePermission('approvePlacements'), async (req, res) => {
  const { attachment_id, visit_date, visit_time, notes } = req.body;
  try {
    const { supervisor, error: sErr } = await getSupervisor(req.user.user_id);
    if (sErr || !supervisor) return res.status(404).json({ message: 'Supervisor not found' });

    const { error } = await supabase
      .from('site_visits')
      .insert({
        attachment_id,
        supervisor_id: supervisor.supervisor_id,
        visit_date,
        visit_time: visit_time || '',
        notes: notes || '',
      });

    if (error) throw error;

    // Notify student
    const { data: att } = await supabase
      .from('attachments')
      .select(`students!attachments_student_id_fkey (user_id)`)
      .eq('attachment_id', attachment_id)
      .single();

    if (att?.students?.user_id) {
      await supabase.from('notifications').insert({
        user_id: att.students.user_id,
        message: `A site visit has been scheduled for ${visit_date} at ${visit_time}`,
      });
    }

    res.status(201).json({ message: 'Site visit scheduled successfully!' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/supervisors/site-visits/:id
router.put('/site-visits/:id', protect, requireRolePermission('approvePlacements'), async (req, res) => {
  const { status } = req.body;
  try {
    const { error } = await supabase
      .from('site_visits')
      .update({ status })
      .eq('visit_id', req.params.id);

    if (error) throw error;
    res.json({ message: `Site visit marked as ${status}` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/supervisors/evaluations
router.post('/evaluations', protect, requireRolePermission('approvePlacements'), async (req, res) => {
  const { attachment_id, score, comments, eval_date } = req.body;
  try {
    const { supervisor, error: sErr } = await getSupervisor(req.user.user_id);
    if (sErr || !supervisor) return res.status(404).json({ message: 'Supervisor not found' });

    const { error } = await supabase
      .from('evaluations')
      .insert({
        attachment_id,
        supervisor_id: supervisor.supervisor_id,
        score,
        comments,
        eval_date: eval_date || new Date().toISOString().split('T')[0],
      });

    if (error) throw error;

    // Notify student
    const { data: att } = await supabase
      .from('attachments')
      .select(`students!attachments_student_id_fkey (user_id)`)
      .eq('attachment_id', attachment_id)
      .single();

    if (att?.students?.user_id) {
      await supabase.from('notifications').insert({
        user_id: att.students.user_id,
        message: `Your supervisor has submitted an evaluation. Score: ${score}%`,
      });
    }

    res.status(201).json({ message: 'Evaluation submitted successfully!' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/supervisors/evaluations
router.get('/evaluations', protect, async (req, res) => {
  try {
    const { supervisor, error: sErr } = await getSupervisor(req.user.user_id);
    if (sErr || !supervisor) return res.status(404).json({ message: 'Supervisor not found' });

    const supervisorAssignmentId = getSupervisorAssignmentId(supervisor, req.user.user_id);

    const { data, error } = await supabase
      .from('evaluations')
      .select(`
        *,
        attachments!evaluations_attachment_id_fkey (
          students!attachments_student_id_fkey (full_name, reg_number),
          host_organizations!attachments_org_id_fkey (org_name)
        )
      `)
      .eq('supervisor_id', supervisorAssignmentId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const result = (data || []).map(e => ({
      ...e,
      student_name: e.attachments?.students?.full_name,
      reg_number: e.attachments?.students?.reg_number,
      org_name: e.attachments?.host_organizations?.org_name,
      attachments: undefined,
    }));

    res.json(result);
  } catch (err) {
    console.error('Evaluations error:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
