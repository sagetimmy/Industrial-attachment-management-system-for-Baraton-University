const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { requireRolePermission } = require('../utils/rolePermissions');
const supabase = require('../config/db');
const { notify } = require('../config/notify');

const ACTIVE_APPLICATION_STATUSES = ['pending', 'more_info', 'accepted'];
const RESPONSE_STATUSES = ['accepted', 'rejected', 'more_info'];
const APPLICATION_SCHEMA_COLUMNS = [
  'application_id',
  'student_id',
  'org_id',
  'start_date',
  'end_date',
  'skills',
  'supporting_info',
  'response_message',
  'created_at',
  'responded_at',
];

const normalizeApplication = (application) => {
  if (!application) return application;
  return {
    ...application,
    application_id: application.application_id ?? application.id,
  };
};

const numericId = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const sortApplications = (applications = []) => (
  [...applications].sort((a, b) => {
    const aTime = new Date(a.created_at || a.responded_at || 0).getTime();
    const bTime = new Date(b.created_at || b.responded_at || 0).getTime();
    if (aTime !== bTime) return bTime - aTime;
    return numericId(b.application_id ?? b.id) - numericId(a.application_id ?? a.id);
  })
);

const missingColumn = (error, column) => (
  error?.message?.includes(`applications.${column}`)
  || error?.message?.includes(`column applications.${column} does not exist`)
  || error?.message?.includes(`'${column}' column of 'applications'`)
);

const incompatibleApplicationsSchema = (error) => (
  !!error && (
    error.message?.includes('invalid input syntax for type uuid')
    || APPLICATION_SCHEMA_COLUMNS.some(column => missingColumn(error, column))
  )
);

const getApplicationsForStudent = async (studentId) => {
  const result = await supabase
    .from('applications')
    .select('*')
    .eq('student_id', studentId);

  if (incompatibleApplicationsSchema(result.error)) {
    return { data: [], error: null };
  }

  return result;
};

const getActiveApplicationForStudent = async (studentId) => {
  const result = await supabase
    .from('applications')
    .select('*')
    .eq('student_id', studentId)
    .in('status', ACTIVE_APPLICATION_STATUSES)
    .maybeSingle();

  if (incompatibleApplicationsSchema(result.error)) {
    return { data: null, error: null };
  }

  return result;
};

const getApplicationById = async (id) => {
  let result = await supabase
    .from('applications')
    .select('*')
    .eq('application_id', id)
    .maybeSingle();

  if (missingColumn(result.error, 'application_id')) {
    result = await supabase
      .from('applications')
      .select('*')
      .eq('id', id)
      .maybeSingle();
  }

  return result;
};

const updateApplicationById = async (id, values) => {
  let result = await supabase
    .from('applications')
    .update(values)
    .eq('application_id', id);

  if (missingColumn(result.error, 'application_id')) {
    result = await supabase
      .from('applications')
      .update(values)
      .eq('id', id);
  }

  return result;
};

const getApplicationsForOrg = async (orgId) => {
  const result = await supabase
    .from('applications')
    .select('*')
    .eq('org_id', orgId);

  if (incompatibleApplicationsSchema(result.error)) {
    return { data: [], error: null };
  }

  return result;
};

const createAttachmentFallback = async ({ student, org_id, start_date, end_date, skills, supporting_info }) => {
  const { data: attachment, error } = await supabase
    .from('attachments')
    .insert({
      student_id: student.student_id,
      org_id,
      start_date,
      end_date,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;

  return {
    ...attachment,
    application_id: attachment.application_id ?? attachment.attachment_id,
    skills,
    supporting_info: supporting_info || null,
  };
};

const getStudentByUserId = async (userId) => {
  const { data, error } = await supabase
    .from('students')
    .select('student_id, full_name, reg_number, user_id')
    .eq('user_id', userId)
    .single();
  return { student: data, error };
};

const getOrgByUserId = async (userId) => {
  const { data, error } = await supabase
    .from('host_organizations')
    .select('org_id, org_name, user_id')
    .eq('user_id', userId)
    .single();
  return { org: data, error };
};

// POST /api/applications
router.post('/', protect, requireRolePermission('selfPlacement'), async (req, res) => {
  const { org_id, start_date, end_date, skills, supporting_info } = req.body || {};

  if (!org_id || !start_date || !end_date || !skills) {
    return res.status(400).json({ message: 'Organization, start date, end date, and skills are required.' });
  }

  try {
    const { student, error: sErr } = await getStudentByUserId(req.user.user_id);
    if (sErr || !student) return res.status(404).json({ message: 'Student not found' });

    const { data: existingAttachment } = await supabase
      .from('attachments')
      .select('attachment_id, status')
      .eq('student_id', student.student_id)
      .not('status', 'in', '("rejected","completed")')
      .maybeSingle();

    if (existingAttachment) {
      return res.status(400).json({ message: 'You already have an active or pending attachment.' });
    }

    const { data: existingApplication, error: existingAppError } =
      await getActiveApplicationForStudent(student.student_id);

    if (existingAppError) throw existingAppError;

    if (existingApplication) {
      return res.status(400).json({ message: 'You already have a pending application under review.' });
    }

    let { data: application, error } = await supabase
      .from('applications')
      .insert({
        student_id: student.student_id,
        org_id,
        start_date,
        end_date,
        skills,
        supporting_info: supporting_info || null,
        status: 'pending',
      })
      .select()
      .single();

    if (incompatibleApplicationsSchema(error)) {
      application = await createAttachmentFallback({ student, org_id, start_date, end_date, skills, supporting_info });
      error = null;
    }

    if (error) throw error;

    const { data: org } = await supabase
      .from('host_organizations')
      .select('user_id, org_name')
      .eq('org_id', org_id)
      .single();

    if (org?.user_id) {
      await notify(
        org.user_id,
        `📥 New application from ${student.full_name || 'a student'} (${student.reg_number || 'N/A'})${org.org_name ? ` for ${org.org_name}` : ''}.`
      );
    }

    res.status(201).json({ application: normalizeApplication(application) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/applications
router.get('/', protect, async (req, res) => {
  try {
    if (req.user.role === 'student') {
      const { student, error: sErr } = await getStudentByUserId(req.user.user_id);
      if (sErr || !student) return res.status(404).json({ message: 'Student not found' });

      const { data, error } = await getApplicationsForStudent(student.student_id);

      if (error) throw error;

      const normalizedData = sortApplications((data || []).map(normalizeApplication));
      const orgIds = [...new Set(normalizedData.map(a => a.org_id).filter(Boolean))];
      let orgs = [];
      if (orgIds.length) {
        const orgQuery = await supabase
          .from('host_organizations')
          .select('org_id, org_name')
          .in('org_id', orgIds);
        if (orgQuery.error) throw orgQuery.error;
        orgs = orgQuery.data || [];
      }

      const orgMap = new Map((orgs || []).map(o => [o.org_id, o.org_name]));
      const applications = normalizedData.map(a => ({
        ...a,
        org_name: orgMap.get(a.org_id) || null,
      }));

      return res.json({ applications });
    }

    if (req.user.role === 'host_org') {
      const { org, error: orgErr } = await getOrgByUserId(req.user.user_id);
      if (orgErr || !org) return res.status(404).json({ message: 'Organization not found' });

      if (req.query.orgId && String(req.query.orgId) !== String(org.org_id)) {
        return res.status(403).json({ message: 'Not authorized to view these applications' });
      }

      const { data, error } = await getApplicationsForOrg(org.org_id);

      if (error) throw error;

      const normalizedData = sortApplications((data || []).map(normalizeApplication));
      const studentIds = [...new Set(normalizedData.map(a => a.student_id).filter(Boolean))];
      let students = [];
      if (studentIds.length) {
        const studentQuery = await supabase
          .from('students')
          .select('student_id, full_name, reg_number, department, year_of_study, phone, user_id')
          .in('student_id', studentIds);
        if (studentQuery.error) throw studentQuery.error;
        students = studentQuery.data || [];
      }

      const studentMap = new Map((students || []).map(s => [s.student_id, s]));
      const applications = normalizedData.map(a => ({
        ...a,
        ...studentMap.get(a.student_id),
        org_name: org.org_name,
      }));

      return res.json({ applications });
    }

    return res.status(403).json({ message: 'Not authorized to view applications' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/applications/:id/respond
router.patch('/:id/respond', protect, async (req, res) => {
  const { status, message } = req.body || {};

  if (!RESPONSE_STATUSES.includes(status)) {
    return res.status(400).json({ message: 'Status must be accepted, rejected, or more_info.' });
  }

  const trimmedMessage = String(message || '').trim();
  if (!trimmedMessage) {
    return res.status(400).json({ message: 'A response message is required.' });
  }

  try {
    if (req.user.role !== 'host_org') {
      return res.status(403).json({ message: 'Only host organizations can respond to applications.' });
    }

    const { org, error: orgErr } = await getOrgByUserId(req.user.user_id);
    if (orgErr || !org) return res.status(404).json({ message: 'Organization not found' });

    const { data: application, error } = await getApplicationById(req.params.id);

    if (error || !application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (String(application.org_id) !== String(org.org_id)) {
      return res.status(403).json({ message: 'Not authorized to respond to this application' });
    }

    const { error: updateErr } = await updateApplicationById(application.application_id ?? application.id, {
      status,
      response_message: trimmedMessage,
      responded_at: new Date().toISOString(),
    });

    if (updateErr) throw updateErr;

    let attachmentCreated = false;
    if (status === 'accepted') {
      const { data: existingAttachment } = await supabase
        .from('attachments')
        .select('attachment_id')
        .eq('student_id', application.student_id)
        .not('status', 'in', '("rejected","completed")')
        .maybeSingle();

      if (!existingAttachment) {
        const { error: attachErr } = await supabase
          .from('attachments')
          .insert({
            student_id: application.student_id,
            org_id: application.org_id,
            start_date: application.start_date,
            end_date: application.end_date,
            status: 'approved',
          });
        if (attachErr) throw attachErr;
        attachmentCreated = true;
      }
    }

    const { data: student } = await supabase
      .from('students')
      .select('user_id, full_name')
      .eq('student_id', application.student_id)
      .single();

    if (student?.user_id) {
      const decisionLabel = status === 'accepted'
        ? 'accepted'
        : status === 'rejected'
          ? 'rejected'
          : 'requested more information';
      await notify(
        student.user_id,
        `📌 ${org.org_name || 'Host organization'} has ${decisionLabel} your application. Message: ${trimmedMessage}`
      );
    }

    res.json({
      message: 'Application response recorded.',
      status,
      response_message: trimmedMessage,
      attachment_created: attachmentCreated,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
