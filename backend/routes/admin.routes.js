const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const supabase = require('../config/db');
const audit = require('../utils/audit');
const {
  ROLE_PERMISSION_KEYS,
  pickRolePermissions,
  normalizeRolePermissions,
} = require('../utils/rolePermissions');

const VALID_STATUSES = ['pending', 'approved', 'ongoing', 'completed', 'rejected'];

const parsePagination = (query) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
  return { page, limit, from: (page - 1) * limit };
};

// Helper: update attachment status + notify student
const updateAttachmentStatus = async (attachmentId, status, actor, ip) => {
  const normalized = String(status || '').toLowerCase();
  if (!VALID_STATUSES.includes(normalized))
    throw Object.assign(new Error('Invalid attachment status'), { statusCode: 400 });

  // Get student user_id separately
  const { data: att, error } = await supabase
    .from('attachments')
    .select('student_id')
    .eq('attachment_id', attachmentId)
    .single();

  if (error || !att)
    throw Object.assign(new Error('Attachment not found'), { statusCode: 404 });

  // Get student's user_id
  const { data: student } = await supabase
    .from('students')
    .select('user_id')
    .eq('student_id', att.student_id)
    .single();

  await supabase.from('attachments').update({ status: normalized }).eq('attachment_id', attachmentId);
  
  if (student?.user_id) {
    await supabase.from('notifications').insert({
      user_id: student.user_id,
      message: `Your attachment status has been updated to: ${normalized}`,
    });
  }

  await audit(
    actor,
    'UPDATE_ATTACHMENT_STATUS',
    'attachments',
    attachmentId,
    `Attachment ${attachmentId} status changed to "${normalized}"`,
    { new_status: normalized },
    ip
  );

  return { message: `Attachment marked as ${normalized}` };
};

const handleStatusUpdate = async (req, res) => {
  try {
    const result = await updateAttachmentStatus(
      req.params.id,
      req.body.status,
      req.user,
      req.ip
    );
    res.json(result);
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

// ─── GET /api/admin/dashboard ──────────────────────────────────────────────
router.get('/dashboard', protect, authorize('admin'), async (req, res) => {
  try {
    const [
      { count: totalStudents },
      { count: totalSupervisors },
      { count: totalOrgs },
      { count: totalAttachments },
      { count: pendingOrgs },
      { count: activeAttachments },
    ] = await Promise.all([
      supabase.from('students').select('*', { count: 'exact', head: true }),
      supabase.from('supervisors').select('*', { count: 'exact', head: true }),
      supabase.from('host_organizations').select('*', { count: 'exact', head: true }),
      supabase.from('attachments').select('*', { count: 'exact', head: true }),
      supabase.from('host_organizations').select('*', { count: 'exact', head: true }).eq('is_approved', false),
      supabase.from('attachments').select('*', { count: 'exact', head: true }).eq('status', 'ongoing'),
    ]);

    // Get recent users (without joins)
    const { data: recentUsers } = await supabase
      .from('users')
      .select('user_id, email, role, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    // Get role data for those users
    const userIds = (recentUsers || []).map(u => u.user_id);
    let studentsMap = {}, supervisorsMap = {}, orgsMap = {};

    if (userIds.length) {
      const { data: students } = await supabase
        .from('students')
        .select('user_id, full_name')
        .in('user_id', userIds);
      students.forEach(s => studentsMap[s.user_id] = s.full_name);

      const { data: supervisors } = await supabase
        .from('supervisors')
        .select('user_id, full_name')
        .in('user_id', userIds);
      supervisors.forEach(s => supervisorsMap[s.user_id] = s.full_name);

      const { data: orgs } = await supabase
        .from('host_organizations')
        .select('user_id, org_name')
        .in('user_id', userIds);
      orgs.forEach(o => orgsMap[o.user_id] = o.org_name);
    }

    const flatRecentUsers = (recentUsers || []).map(u => ({
      ...u,
      name: studentsMap[u.user_id] || supervisorsMap[u.user_id] || orgsMap[u.user_id],
    }));

    // Pending orgs
    const { data: pendingOrgList } = await supabase
      .from('host_organizations')
      .select('*')
      .eq('is_approved', false)
      .order('created_at', { ascending: false });

    // Get emails for pending orgs
    const orgUserIds = pendingOrgList.map(o => o.user_id).filter(Boolean);
    let emailMap = {};
    if (orgUserIds.length) {
      const { data: users } = await supabase
        .from('users')
        .select('user_id, email')
        .in('user_id', orgUserIds);
      users.forEach(u => emailMap[u.user_id] = u.email);
    }
    const pendingOrgsWithEmail = pendingOrgList.map(o => ({ ...o, email: emailMap[o.user_id] }));

    // Recent attachments
    const { data: recentAttachments } = await supabase
      .from('attachments')
      .select('attachment_id, status, start_date, student_id, org_id, supervisor_id, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    // Get related data
    const studentIds = recentAttachments.map(a => a.student_id).filter(Boolean);
    const orgIds = recentAttachments.map(a => a.org_id).filter(Boolean);
    const supervisorIds = recentAttachments.map(a => a.supervisor_id).filter(Boolean);

    let studentMap = {}, orgMap = {}, supervisorMap = {};
    if (studentIds.length) {
      const { data: students } = await supabase
        .from('students')
        .select('student_id, full_name, reg_number')
        .in('student_id', studentIds);
      students.forEach(s => studentMap[s.student_id] = s);
    }
    if (orgIds.length) {
      const { data: orgs } = await supabase
        .from('host_organizations')
        .select('org_id, org_name')
        .in('org_id', orgIds);
      orgs.forEach(o => orgMap[o.org_id] = o.org_name);
    }
    if (supervisorIds.length) {
      const { data: supervisors } = await supabase
        .from('supervisors')
        .select('supervisor_id, full_name')
        .in('supervisor_id', supervisorIds);
      supervisors.forEach(s => supervisorMap[s.supervisor_id] = s.full_name);
    }

    const flatAttachments = recentAttachments.map(a => ({
      ...a,
      student_name: studentMap[a.student_id]?.full_name,
      reg_number: studentMap[a.student_id]?.reg_number,
      org_name: orgMap[a.org_id],
      supervisor_name: supervisorMap[a.supervisor_id],
    }));

    await audit(
      req.user,
      'VIEW_DASHBOARD',
      'dashboard',
      null,
      `Admin ${req.user?.email} viewed the dashboard`,
      {},
      req.ip
    );

    res.json({
      stats: { totalStudents, totalSupervisors, totalOrgs, totalAttachments, pendingOrgs, activeAttachments },
      recentUsers: flatRecentUsers,
      pendingOrgList: pendingOrgsWithEmail,
      recentAttachments: flatAttachments,
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/admin/role-permissions ──────────────────────────────────────
router.get('/role-permissions', protect, authorize('admin'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('role_permissions')
      .select('role, permissions');
    if (error) throw error;

    const merged = normalizeRolePermissions();
    (data || []).forEach((row) => {
      if (!row?.role || !ROLE_PERMISSION_KEYS[row.role]) return;
      merged[row.role] = {
        ...merged[row.role],
        ...pickRolePermissions(row.role, row.permissions || {}),
      };
    });

    res.json({ permissions: merged });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── PUT /api/admin/role-permissions ──────────────────────────────────────
router.put('/role-permissions', protect, authorize('admin'), async (req, res) => {
  try {
    const normalized = normalizeRolePermissions(req.body?.permissions || req.body || {});
    const rows = Object.entries(normalized).map(([role, permissions]) => ({
      role,
      permissions,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('role_permissions')
      .upsert(rows, { onConflict: 'role' });
    if (error) throw error;

    await audit(
      req.user,
      'UPDATE_ROLE_PERMISSIONS',
      'role_permissions',
      null,
      `Role permissions updated by ${req.user?.email}`,
      { roles: Object.keys(normalized) },
      req.ip
    );

    res.json({ message: 'Role permissions updated', permissions: normalized });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── PUT /api/admin/approve-org/:id ────────────────────────────────────────
router.put('/approve-org/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { error } = await supabase
      .from('host_organizations')
      .update({ is_approved: true })
      .eq('org_id', req.params.id);
    if (error) throw error;

    await audit(
      req.user,
      'APPROVE_ORG',
      'host_organizations',
      req.params.id,
      `Organization (ID: ${req.params.id}) approved`,
      {},
      req.ip
    );

    res.json({ message: 'Organization approved successfully!' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── PUT /api/admin/reject-org/:id ────────────────────────────────────────
router.put('/reject-org/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { reason } = req.body;
    const { data: org, error } = await supabase
      .from('host_organizations')
      .select('user_id')
      .eq('org_id', req.params.id)
      .single();
    if (error || !org) return res.status(404).json({ message: 'Organization not found' });

    await supabase.from('notifications').insert({
      user_id: org.user_id,
      message: `Your organization registration was rejected. Reason: ${reason || 'Does not meet requirements'}`,
    });

    await supabase.from('host_organizations').delete().eq('org_id', req.params.id);

    await audit(
      req.user,
      'REJECT_ORG',
      'host_organizations',
      req.params.id,
      `Organization (ID: ${req.params.id}) rejected. Reason: ${reason || 'N/A'}`,
      { reason },
      req.ip
    );

    res.json({ message: 'Organization rejected' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/admin/pending-orgs ──────────────────────────────────────────
router.get('/pending-orgs', protect, authorize('admin'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('host_organizations')
      .select('*')
      .eq('is_approved', false)
      .order('created_at', { ascending: false });
    if (error) throw error;

    // Get emails
    const userIds = data.map(o => o.user_id).filter(Boolean);
    let emailMap = {};
    if (userIds.length) {
      const { data: users } = await supabase
        .from('users')
        .select('user_id, email')
        .in('user_id', userIds);
      users.forEach(u => emailMap[u.user_id] = u.email);
    }
    const result = data.map(o => ({ ...o, email: emailMap[o.user_id] }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/admin/org-details/:id ──────────────────────────────────────
router.get('/org-details/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { data: org, error } = await supabase
      .from('host_organizations')
      .select('*')
      .eq('org_id', req.params.id)
      .single();
    if (error) throw error;

    // Get user email
    let email = null;
    if (org.user_id) {
      const { data: user } = await supabase
        .from('users')
        .select('email')
        .eq('user_id', org.user_id)
        .single();
      email = user?.email;
    }

    // Get reviews
    const { data: reviews } = await supabase
      .from('org_reviews')
      .select('rating')
      .eq('org_id', req.params.id);

    const avg_rating = reviews && reviews.length
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : null;

    res.json({
      ...org,
      email,
      total_reviews: reviews?.length || 0,
      avg_rating,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/admin/attachments ──────────────────────────────────────────
router.get('/attachments', protect, authorize('admin'), async (req, res) => {
  try {
    const { page, limit, from } = parsePagination(req.query);

    let query = supabase
      .from('attachments')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1);

    if (req.query.status) query = query.eq('status', req.query.status);
    if (req.query.startDate) query = query.gte('created_at', req.query.startDate);
    if (req.query.endDate) query = query.lte('created_at', req.query.endDate);

    const { data, error, count } = await query;
    if (error) throw error;

    // Fetch related data
    const studentIds = data.map(a => a.student_id).filter(Boolean);
    const orgIds = data.map(a => a.org_id).filter(Boolean);
    const supervisorIds = data.map(a => a.supervisor_id).filter(Boolean);

    let studentMap = {}, orgMap = {}, supervisorMap = {};
    if (studentIds.length) {
      const { data: students } = await supabase
        .from('students')
        .select('student_id, full_name, reg_number, department')
        .in('student_id', studentIds);
      students.forEach(s => studentMap[s.student_id] = s);
    }
    if (orgIds.length) {
      const { data: orgs } = await supabase
        .from('host_organizations')
        .select('org_id, org_name, location')
        .in('org_id', orgIds);
      orgs.forEach(o => orgMap[o.org_id] = o);
    }
    if (supervisorIds.length) {
      const { data: supervisors } = await supabase
        .from('supervisors')
        .select('supervisor_id, full_name')
        .in('supervisor_id', supervisorIds);
      supervisors.forEach(s => supervisorMap[s.supervisor_id] = s.full_name);
    }

    const result = data.map(a => ({
      ...a,
      student_name: studentMap[a.student_id]?.full_name,
      reg_number: studentMap[a.student_id]?.reg_number,
      department: studentMap[a.student_id]?.department,
      org_name: orgMap[a.org_id]?.org_name,
      location: orgMap[a.org_id]?.location,
      supervisor_name: supervisorMap[a.supervisor_id],
    }));

    res.json({
      attachments: result,
      pagination: { page, limit, total: count, pages: Math.max(Math.ceil(count / limit), 1) },
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
});

// ─── GET /api/admin/all-attachments ──────────────────────────────────────
router.get('/all-attachments', protect, authorize('admin'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('attachments')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;

    const studentIds = data.map(a => a.student_id).filter(Boolean);
    const orgIds = data.map(a => a.org_id).filter(Boolean);
    const supervisorIds = data.map(a => a.supervisor_id).filter(Boolean);

    let studentMap = {}, orgMap = {}, supervisorMap = {};
    if (studentIds.length) {
      const { data: students } = await supabase
        .from('students')
        .select('student_id, full_name, reg_number, department')
        .in('student_id', studentIds);
      students.forEach(s => studentMap[s.student_id] = s);
    }
    if (orgIds.length) {
      const { data: orgs } = await supabase
        .from('host_organizations')
        .select('org_id, org_name, location')
        .in('org_id', orgIds);
      orgs.forEach(o => orgMap[o.org_id] = o);
    }
    if (supervisorIds.length) {
      const { data: supervisors } = await supabase
        .from('supervisors')
        .select('supervisor_id, full_name')
        .in('supervisor_id', supervisorIds);
      supervisors.forEach(s => supervisorMap[s.supervisor_id] = s.full_name);
    }

    const result = data.map(a => ({
      ...a,
      student_name: studentMap[a.student_id]?.full_name,
      reg_number: studentMap[a.student_id]?.reg_number,
      department: studentMap[a.student_id]?.department,
      org_name: orgMap[a.org_id]?.org_name,
      location: orgMap[a.org_id]?.location,
      supervisor_name: supervisorMap[a.supervisor_id],
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/admin/attachment/:id ──────────────────────────────────────
router.get('/attachment/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('attachments')
      .select('*')
      .eq('attachment_id', req.params.id)
      .single();

    if (error || !data) return res.status(404).json({ message: 'Attachment not found' });

    // Get student
    let studentData = null;
    if (data.student_id) {
      const { data: student } = await supabase
        .from('students')
        .select('full_name, reg_number, department, year_of_study, phone')
        .eq('student_id', data.student_id)
        .single();
      studentData = student;
    }

    // Get organization
    let orgData = null;
    if (data.org_id) {
      const { data: org } = await supabase
        .from('host_organizations')
        .select('org_name, location, contact_person, phone')
        .eq('org_id', data.org_id)
        .single();
      orgData = org;
    }

    // Get supervisor
    let supervisorData = null;
    if (data.supervisor_id) {
      const { data: supervisor } = await supabase
        .from('supervisors')
        .select('full_name, phone')
        .eq('supervisor_id', data.supervisor_id)
        .single();
      supervisorData = supervisor;
    }

    // Logbook entries
    const { data: logbookEntries } = await supabase
      .from('logbook_entries')
      .select('entry_id, week_number, description, tasks_done, challenges, document_url, submitted_at')
      .eq('attachment_id', req.params.id)
      .order('week_number', { ascending: true });

    // Evaluations
    const { data: evaluations } = await supabase
      .from('evaluations')
      .select('*, supervisor_id')
      .eq('attachment_id', req.params.id)
      .order('created_at', { ascending: false });

    // Get supervisor names for evaluations
    let evalSupervisorMap = {};
    if (evaluations && evaluations.length) {
      const supIds = evaluations.map(e => e.supervisor_id).filter(Boolean);
      if (supIds.length) {
        const { data: supervisors } = await supabase
          .from('supervisors')
          .select('supervisor_id, full_name')
          .in('supervisor_id', supIds);
        supervisors.forEach(s => evalSupervisorMap[s.supervisor_id] = s.full_name);
      }
    }

    const evalsWithNames = (evaluations || []).map(e => ({
      ...e,
      supervisor_name: evalSupervisorMap[e.supervisor_id] || null,
    }));

    const attachment = {
      ...data,
      student_name: studentData?.full_name,
      reg_number: studentData?.reg_number,
      department: studentData?.department,
      year_of_study: studentData?.year_of_study,
      student_phone: studentData?.phone,
      org_name: orgData?.org_name,
      location: orgData?.location,
      contact_person: orgData?.contact_person,
      org_phone: orgData?.phone,
      supervisor_name: supervisorData?.full_name,
      supervisor_phone: supervisorData?.phone,
    };

    res.json({
      attachment,
      logbookEntries: logbookEntries || [],
      evaluation: evalsWithNames[0] || null,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── PUT /api/admin/attachment/:id/status ──────────────────────────────
router.put('/attachment/:id/status', protect, authorize('admin'), handleStatusUpdate);
router.put('/attachment-status/:id', protect, authorize('admin'), handleStatusUpdate);

// ─── GET /api/admin/unassigned-attachments ─────────────────────────────
router.get('/unassigned-attachments', protect, authorize('admin'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('attachments')
      .select('*')
      .is('supervisor_id', null)
      .in('status', ['pending', 'ongoing', 'approved'])
      .order('created_at', { ascending: false });
    if (error) throw error;

    const studentIds = data.map(a => a.student_id).filter(Boolean);
    const orgIds = data.map(a => a.org_id).filter(Boolean);

    let studentMap = {}, orgMap = {};
    if (studentIds.length) {
      const { data: students } = await supabase
        .from('students')
        .select('student_id, full_name, reg_number, department')
        .in('student_id', studentIds);
      students.forEach(s => studentMap[s.student_id] = s);
    }
    if (orgIds.length) {
      const { data: orgs } = await supabase
        .from('host_organizations')
        .select('org_id, org_name, location')
        .in('org_id', orgIds);
      orgs.forEach(o => orgMap[o.org_id] = o);
    }

    const result = data.map(a => ({
      ...a,
      student_name: studentMap[a.student_id]?.full_name,
      reg_number: studentMap[a.student_id]?.reg_number,
      department: studentMap[a.student_id]?.department,
      org_name: orgMap[a.org_id]?.org_name,
      location: orgMap[a.org_id]?.location,
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/admin/supervisors ─────────────────────────────────────────
router.get('/supervisors', protect, authorize('admin'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('supervisors')
      .select('supervisor_id, full_name, department, phone, user_id')
      .order('full_name', { ascending: true });
    if (error) throw error;

    // Get emails
    const userIds = data.map(s => s.user_id).filter(Boolean);
    let emailMap = {};
    if (userIds.length) {
      const { data: users } = await supabase
        .from('users')
        .select('user_id, email')
        .in('user_id', userIds);
      users.forEach(u => emailMap[u.user_id] = u.email);
    }

    // Get assigned counts
    const supIds = data.map(s => s.supervisor_id).filter(Boolean);
    let countMap = {};
    if (supIds.length) {
      const { data: attachments } = await supabase
        .from('attachments')
        .select('supervisor_id, status')
        .in('supervisor_id', supIds);
      attachments.forEach(a => {
        if (['ongoing', 'approved'].includes(a.status)) {
          countMap[a.supervisor_id] = (countMap[a.supervisor_id] || 0) + 1;
        }
      });
    }

    const result = data.map(sv => ({
      ...sv,
      email: emailMap[sv.user_id],
      assigned_count: countMap[sv.supervisor_id] || 0,
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── PUT /api/admin/assign-supervisor ──────────────────────────────────
router.put('/assign-supervisor', protect, authorize('admin'), async (req, res) => {
  const { attachment_id, supervisor_id } = req.body;
  try {
    await supabase
      .from('attachments')
      .update({ supervisor_id, status: 'ongoing' })
      .eq('attachment_id', attachment_id);

    // Get student user_id for notification
    const { data: att } = await supabase
      .from('attachments')
      .select('student_id')
      .eq('attachment_id', attachment_id)
      .single();

    let studentUserId = null;
    if (att?.student_id) {
      const { data: student } = await supabase
        .from('students')
        .select('user_id')
        .eq('student_id', att.student_id)
        .single();
      studentUserId = student?.user_id;
    }

    // Get supervisor name
    let supervisorName = null;
    if (supervisor_id) {
      const { data: sup } = await supabase
        .from('supervisors')
        .select('full_name')
        .eq('supervisor_id', supervisor_id)
        .single();
      supervisorName = sup?.full_name;
    }

    if (studentUserId) {
      await supabase.from('notifications').insert({
        user_id: studentUserId,
        message: `A supervisor has been assigned to your attachment: ${supervisorName || 'Supervisor'}`,
      });
    }

    await audit(
      req.user,
      'ASSIGN_SUPERVISOR',
      'attachments',
      attachment_id,
      `Supervisor (ID: ${supervisor_id}) assigned to attachment ${attachment_id}`,
      { supervisor_id, supervisor_name: supervisorName },
      req.ip
    );

    res.json({ message: 'Supervisor assigned successfully!' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/admin/users ──────────────────────────────────────────────
router.get('/users', protect, authorize('admin'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('user_id, email, role, is_verified, is_active, created_at')
      .order('created_at', { ascending: false });
    if (error) throw error;

    const userIds = data.map(u => u.user_id);
    let studentMap = {}, supervisorMap = {}, orgMap = {};

    if (userIds.length) {
      const { data: students } = await supabase
        .from('students')
        .select('user_id, full_name, reg_number, department, phone')
        .in('user_id', userIds);
      students.forEach(s => studentMap[s.user_id] = s);

      const { data: supervisors } = await supabase
        .from('supervisors')
        .select('user_id, full_name, department, phone')
        .in('user_id', userIds);
      supervisors.forEach(s => supervisorMap[s.user_id] = s);

      const { data: orgs } = await supabase
        .from('host_organizations')
        .select('user_id, org_name')
        .in('user_id', userIds);
      orgs.forEach(o => orgMap[o.user_id] = o.org_name);
    }

    const result = data.map(u => {
      const student = studentMap[u.user_id];
      const supervisor = supervisorMap[u.user_id];
      const org = orgMap[u.user_id];
      return {
        ...u,
        name: student?.full_name || supervisor?.full_name || org || null,
        reg_number: student?.reg_number || null,
        department: student?.department || supervisor?.department || null,
        student_phone: student?.phone || null,
        supervisor_phone: supervisor?.phone || null,
        supervisor_dept: supervisor?.department || null,
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── PUT /api/admin/toggle-user/:id ────────────────────────────────────
router.put('/toggle-user/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('is_active, email')
      .eq('user_id', req.params.id)
      .single();

    await supabase
      .from('users')
      .update({ is_active: !user.is_active })
      .eq('user_id', req.params.id);

    await audit(
      req.user,
      user.is_active ? 'DEACTIVATE_USER' : 'ACTIVATE_USER',
      'users',
      req.params.id,
      `User ${user.email} was ${user.is_active ? 'deactivated' : 'activated'}`,
      { previous_status: user.is_active, new_status: !user.is_active },
      req.ip
    );

    res.json({ message: 'User status updated!' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── DELETE /api/admin/delete-user/:id ────────────────────────────────
router.delete('/delete-user/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('email, role')
      .eq('user_id', req.params.id)
      .single();

    const { error } = await supabase.from('users').delete().eq('user_id', req.params.id);
    if (error) throw error;

    await audit(
      req.user,
      'DELETE_USER',
      'users',
      req.params.id,
      `User ${user?.email} (${user?.role}) was deleted`,
      { deleted_email: user?.email, deleted_role: user?.role },
      req.ip
    );

    res.json({ message: 'User deleted successfully!' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/admin/reports/summary ────────────────────────────────────
router.get('/reports/summary', protect, authorize('admin'), async (req, res) => {
  try {
    const [
      { count: totalAttachments },
      { count: totalStudents },
      { count: totalSupervisors },
      { count: totalOrgs },
      { data: statusRows },
      { data: allAttachments },
    ] = await Promise.all([
      supabase.from('attachments').select('*', { count: 'exact', head: true }),
      supabase.from('students').select('*', { count: 'exact', head: true }),
      supabase.from('supervisors').select('*', { count: 'exact', head: true }),
      supabase.from('host_organizations').select('*', { count: 'exact', head: true }),
      supabase.from('attachments').select('status'),
      supabase.from('attachments').select('student_id, org_id'),
    ]);

    const statusMap = {};
    (statusRows || []).forEach(a => { statusMap[a.status] = (statusMap[a.status] || 0) + 1; });
    const statusBreakdown = Object.entries(statusMap).map(([status, count]) => ({ status, count }));

    // Org breakdown
    const orgIds = allAttachments.map(a => a.org_id).filter(Boolean);
    let orgNameMap = {};
    if (orgIds.length) {
      const { data: orgs } = await supabase
        .from('host_organizations')
        .select('org_id, org_name')
        .in('org_id', orgIds);
      orgs.forEach(o => orgNameMap[o.org_id] = o.org_name);
    }
    const orgCount = {};
    allAttachments.forEach(a => {
      const name = orgNameMap[a.org_id] || 'Unknown';
      orgCount[name] = (orgCount[name] || 0) + 1;
    });
    const orgBreakdown = Object.entries(orgCount)
      .map(([org_name, count]) => ({ org_name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Department breakdown
    const studentIds = allAttachments.map(a => a.student_id).filter(Boolean);
    let deptMap = {};
    if (studentIds.length) {
      const { data: students } = await supabase
        .from('students')
        .select('student_id, department')
        .in('student_id', studentIds);
      students.forEach(s => deptMap[s.student_id] = s.department || 'Unspecified');
    }
    const deptCount = {};
    allAttachments.forEach(a => {
      const dept = deptMap[a.student_id] || 'Unspecified';
      deptCount[dept] = (deptCount[dept] || 0) + 1;
    });
    const deptBreakdown = Object.entries(deptCount)
      .map(([department, count]) => ({ department, count }))
      .sort((a, b) => b.count - a.count);

    await audit(
      req.user,
      'VIEW_SUMMARY_REPORT',
      'reports',
      null,
      `Admin ${req.user?.email} viewed the summary report`,
      {},
      req.ip
    );

    res.json({ totalAttachments, totalStudents, totalSupervisors, totalOrgs, statusBreakdown, orgBreakdown, deptBreakdown });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/admin/reports/detailed ──────────────────────────────────
router.get('/reports/detailed', protect, authorize('admin'), async (req, res) => {
  try {
    const { page, limit, from } = parsePagination(req.query);

    let query = supabase
      .from('attachments')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1);

    if (req.query.status) query = query.eq('status', req.query.status);
    if (req.query.startDate) query = query.gte('created_at', req.query.startDate);
    if (req.query.endDate) query = query.lte('created_at', req.query.endDate);

    const { data, error, count } = await query;
    if (error) throw error;

    // Fetch related data
    const studentIds = data.map(a => a.student_id).filter(Boolean);
    const orgIds = data.map(a => a.org_id).filter(Boolean);
    const supervisorIds = data.map(a => a.supervisor_id).filter(Boolean);

    let studentMap = {}, orgMap = {}, supervisorMap = {};
    if (studentIds.length) {
      const { data: students } = await supabase
        .from('students')
        .select('student_id, full_name, reg_number, department')
        .in('student_id', studentIds);
      students.forEach(s => studentMap[s.student_id] = s);
    }
    if (orgIds.length) {
      const { data: orgs } = await supabase
        .from('host_organizations')
        .select('org_id, org_name')
        .in('org_id', orgIds);
      orgs.forEach(o => orgMap[o.org_id] = o.org_name);
    }
    if (supervisorIds.length) {
      const { data: supervisors } = await supabase
        .from('supervisors')
        .select('supervisor_id, full_name')
        .in('supervisor_id', supervisorIds);
      supervisors.forEach(s => supervisorMap[s.supervisor_id] = s.full_name);
    }

    // Get logbook counts and evaluation ratings
    const attachmentIds = data.map(a => a.attachment_id).filter(Boolean);
    let logbookCount = {}, evalRatings = {};
    if (attachmentIds.length) {
      const { data: logs } = await supabase
        .from('logbook_entries')
        .select('attachment_id')
        .in('attachment_id', attachmentIds);
      logs.forEach(l => logbookCount[l.attachment_id] = (logbookCount[l.attachment_id] || 0) + 1);

      const { data: evals } = await supabase
        .from('evaluations')
        .select('attachment_id, rating')
        .in('attachment_id', attachmentIds);
      const ratingsByAtt = {};
      evals.forEach(e => {
        if (!ratingsByAtt[e.attachment_id]) ratingsByAtt[e.attachment_id] = [];
        ratingsByAtt[e.attachment_id].push(e.rating);
      });
      Object.entries(ratingsByAtt).forEach(([attId, ratings]) => {
        const avg = ratings.reduce((s, r) => s + r, 0) / ratings.length;
        evalRatings[attId] = avg;
      });
    }

    const details = data.map(a => ({
      attachment_id: a.attachment_id,
      status: a.status,
      start_date: a.start_date,
      end_date: a.end_date,
      created_at: a.created_at,
      student_name: studentMap[a.student_id]?.full_name,
      reg_number: studentMap[a.student_id]?.reg_number,
      department: studentMap[a.student_id]?.department,
      org_name: orgMap[a.org_id],
      supervisor_name: supervisorMap[a.supervisor_id],
      logbook_count: logbookCount[a.attachment_id] || 0,
      evaluation_rating: evalRatings[a.attachment_id] || null,
    }));

    await audit(
      req.user,
      'VIEW_DETAILED_REPORT',
      'reports',
      null,
      `Admin ${req.user?.email} viewed detailed report (page ${page})`,
      { filters: { status: req.query.status, startDate: req.query.startDate, endDate: req.query.endDate } },
      req.ip
    );

    res.json({
      details,
      pagination: { page, limit, total: count, pages: Math.max(Math.ceil(count / limit), 1) },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/admin/audit-logs ─────────────────────────────────────────
router.get('/audit-logs', protect, authorize('admin'), async (req, res) => {
  try {
    const { page, limit, from } = parsePagination(req.query);

    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1);

    if (req.query.action) query = query.eq('action', req.query.action);
    if (req.query.actor_email) query = query.ilike('actor_email', `%${req.query.actor_email}%`);
    if (req.query.entity) query = query.eq('entity', req.query.entity);
    if (req.query.startDate) query = query.gte('created_at', req.query.startDate);
    if (req.query.endDate) query = query.lte('created_at', req.query.endDate);

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({
      logs: data || [],
      pagination: { page, limit, total: count, pages: Math.max(Math.ceil(count / limit), 1) },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;