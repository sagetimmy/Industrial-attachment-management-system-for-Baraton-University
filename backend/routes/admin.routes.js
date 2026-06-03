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

  const { data: att, error } = await supabase
    .from('attachments')
    .select(`attachment_id, students!attachments_student_id_fkey (user_id)`)
    .eq('attachment_id', attachmentId)
    .single();

  if (error || !att)
    throw Object.assign(new Error('Attachment not found'), { statusCode: 404 });

  await supabase.from('attachments').update({ status: normalized }).eq('attachment_id', attachmentId);
  await supabase.from('notifications').insert({
    user_id: att.students.user_id,
    message: `Your attachment status has been updated to: ${normalized}`,
  });

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

// GET /api/admin/dashboard
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

    const { data: recentUsers } = await supabase
      .from('users')
      .select(`
        user_id, email, role, created_at,
        students!students_user_id_fkey (full_name),
        supervisors!supervisors_user_id_fkey (full_name),
        host_organizations!host_organizations_user_id_fkey (org_name)
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    const { data: pendingOrgList } = await supabase
      .from('host_organizations')
      .select(`*, users!host_organizations_user_id_fkey (email)`)
      .eq('is_approved', false)
      .order('created_at', { ascending: false });

    const { data: recentAttachments } = await supabase
      .from('attachments')
      .select(`
        attachment_id, status, start_date,
        students!attachments_student_id_fkey (full_name, reg_number),
        host_organizations!attachments_org_id_fkey (org_name),
        supervisors!attachments_supervisor_id_fkey (full_name)
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    const flatRecentUsers = (recentUsers || []).map(u => ({
      ...u,
      name: u.students?.[0]?.full_name || u.supervisors?.[0]?.full_name || u.host_organizations?.[0]?.org_name,
      students: undefined, supervisors: undefined, host_organizations: undefined,
    }));

    const flatAttachments = (recentAttachments || []).map(a => ({
      ...a,
      student_name: a.students?.full_name,
      reg_number: a.students?.reg_number,
      org_name: a.host_organizations?.org_name,
      supervisor_name: a.supervisors?.full_name,
      students: undefined, host_organizations: undefined, supervisors: undefined,
    }));

    // Audit: admin viewed dashboard
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
      pendingOrgList: pendingOrgList || [],
      recentAttachments: flatAttachments,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/role-permissions
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

// PUT /api/admin/role-permissions
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

// PUT /api/admin/approve-org/:id
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

// PUT /api/admin/reject-org/:id
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

// GET /api/admin/pending-orgs
router.get('/pending-orgs', protect, authorize('admin'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('host_organizations')
      .select(`*, users!host_organizations_user_id_fkey (email)`)
      .eq('is_approved', false)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/org-details/:id
router.get('/org-details/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { data: org, error } = await supabase
      .from('host_organizations')
      .select(`*, users!host_organizations_user_id_fkey (email), org_reviews (rating)`)
      .eq('org_id', req.params.id)
      .single();
    if (error) throw error;

    const reviews = org.org_reviews || [];
    const avg_rating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null;

    res.json({ ...org, total_reviews: reviews.length, avg_rating, org_reviews: undefined });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/attachments
router.get('/attachments', protect, authorize('admin'), async (req, res) => {
  try {
    const { page, limit, from } = parsePagination(req.query);

    let query = supabase
      .from('attachments')
      .select(`
        attachment_id, status, start_date, end_date, created_at,
        students!attachments_student_id_fkey (full_name, reg_number, department),
        host_organizations!attachments_org_id_fkey (org_name, location),
        supervisors!attachments_supervisor_id_fkey (full_name)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1);

    if (req.query.status) query = query.eq('status', req.query.status);
    if (req.query.startDate) query = query.gte('created_at', req.query.startDate);
    if (req.query.endDate) query = query.lte('created_at', req.query.endDate);

    const { data, error, count } = await query;
    if (error) throw error;

    const result = (data || []).map(a => ({
      ...a,
      student_name: a.students?.full_name,
      reg_number: a.students?.reg_number,
      department: a.students?.department,
      org_name: a.host_organizations?.org_name,
      location: a.host_organizations?.location,
      supervisor_name: a.supervisors?.full_name,
      students: undefined, host_organizations: undefined, supervisors: undefined,
    }));

    res.json({
      attachments: result,
      pagination: { page, limit, total: count, pages: Math.max(Math.ceil(count / limit), 1) },
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
});

// GET /api/admin/all-attachments
router.get('/all-attachments', protect, authorize('admin'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('attachments')
      .select(`
        attachment_id, status, start_date, end_date,
        students!attachments_student_id_fkey (full_name, reg_number, department),
        host_organizations!attachments_org_id_fkey (org_name, location),
        supervisors!attachments_supervisor_id_fkey (full_name)
      `)
      .order('created_at', { ascending: false });
    if (error) throw error;

    res.json((data || []).map(a => ({
      ...a,
      student_name: a.students?.full_name,
      reg_number: a.students?.reg_number,
      department: a.students?.department,
      org_name: a.host_organizations?.org_name,
      location: a.host_organizations?.location,
      supervisor_name: a.supervisors?.full_name,
      students: undefined, host_organizations: undefined, supervisors: undefined,
    })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/attachment/:id
router.get('/attachment/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('attachments')
      .select(`
        *,
        students!attachments_student_id_fkey (full_name, reg_number, department, year_of_study, phone),
        host_organizations!attachments_org_id_fkey (org_name, location, contact_person, phone),
        supervisors!attachments_supervisor_id_fkey (full_name, phone)
      `)
      .eq('attachment_id', req.params.id)
      .single();

    if (error || !data) return res.status(404).json({ message: 'Attachment not found' });

    const { data: logbookEntries } = await supabase
      .from('logbook_entries')
      .select('entry_id, week_number, description, tasks_done, challenges, document_url, submitted_at')
      .eq('attachment_id', req.params.id)
      .order('week_number', { ascending: true });

    const { data: evaluations } = await supabase
      .from('evaluations')
      .select(`*, supervisors!evaluations_supervisor_id_fkey (full_name)`)
      .eq('attachment_id', req.params.id)
      .order('created_at', { ascending: false });

    const attachment = {
      ...data,
      student_name: data.students?.full_name,
      reg_number: data.students?.reg_number,
      department: data.students?.department,
      year_of_study: data.students?.year_of_study,
      student_phone: data.students?.phone,
      org_name: data.host_organizations?.org_name,
      location: data.host_organizations?.location,
      contact_person: data.host_organizations?.contact_person,
      org_phone: data.host_organizations?.phone,
      supervisor_name: data.supervisors?.full_name,
      supervisor_phone: data.supervisors?.phone,
      students: undefined, host_organizations: undefined, supervisors: undefined,
    };

    res.json({ attachment, logbookEntries: logbookEntries || [], evaluation: evaluations?.[0] || null });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/admin/attachment/:id/status
router.put('/attachment/:id/status', protect, authorize('admin'), handleStatusUpdate);

// PUT /api/admin/attachment-status/:id
router.put('/attachment-status/:id', protect, authorize('admin'), handleStatusUpdate);

// GET /api/admin/unassigned-attachments
router.get('/unassigned-attachments', protect, authorize('admin'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('attachments')
      .select(`
        attachment_id, status, start_date, end_date,
        students!attachments_student_id_fkey (full_name, reg_number, department),
        host_organizations!attachments_org_id_fkey (org_name, location)
      `)
      .is('supervisor_id', null)
      .in('status', ['pending', 'ongoing', 'approved'])
      .order('created_at', { ascending: false });
    if (error) throw error;

    res.json((data || []).map(a => ({
      ...a,
      student_name: a.students?.full_name,
      reg_number: a.students?.reg_number,
      department: a.students?.department,
      org_name: a.host_organizations?.org_name,
      location: a.host_organizations?.location,
      students: undefined, host_organizations: undefined,
    })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/supervisors
router.get('/supervisors', protect, authorize('admin'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('supervisors')
      .select(`
        supervisor_id, full_name, department, phone,
        users!supervisors_user_id_fkey (email),
        attachments!attachments_supervisor_id_fkey (attachment_id, status)
      `)
      .order('full_name', { ascending: true });
    if (error) throw error;

    res.json((data || []).map(sv => ({
      ...sv,
      email: sv.users?.email,
      assigned_count: sv.attachments?.filter(a => ['ongoing', 'approved'].includes(a.status)).length || 0,
      users: undefined, attachments: undefined,
    })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/admin/assign-supervisor
router.put('/assign-supervisor', protect, authorize('admin'), async (req, res) => {
  const { attachment_id, supervisor_id } = req.body;
  try {
    await supabase
      .from('attachments')
      .update({ supervisor_id, status: 'ongoing' })
      .eq('attachment_id', attachment_id);

    const { data: att } = await supabase
      .from('attachments')
      .select(`
        students!attachments_student_id_fkey (user_id),
        supervisors!attachments_supervisor_id_fkey (full_name)
      `)
      .eq('attachment_id', attachment_id)
      .single();

    if (att?.students?.user_id) {
      await supabase.from('notifications').insert({
        user_id: att.students.user_id,
        message: `A supervisor has been assigned to your attachment: ${att.supervisors?.full_name}`,
      });
    }

    await audit(
      req.user,
      'ASSIGN_SUPERVISOR',
      'attachments',
      attachment_id,
      `Supervisor (ID: ${supervisor_id}) assigned to attachment ${attachment_id}`,
      { supervisor_id, supervisor_name: att?.supervisors?.full_name },
      req.ip
    );

    res.json({ message: 'Supervisor assigned successfully!' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/users
router.get('/users', protect, authorize('admin'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select(`
        user_id, email, role, is_verified, is_active, created_at,
        students!students_user_id_fkey (full_name, reg_number, department, phone),
        supervisors!supervisors_user_id_fkey (full_name, department, phone),
        host_organizations!host_organizations_user_id_fkey (org_name)
      `)
      .order('created_at', { ascending: false });
    if (error) throw error;

    res.json((data || []).map(u => ({
      ...u,
      name: u.students?.[0]?.full_name || u.supervisors?.[0]?.full_name || u.host_organizations?.[0]?.org_name,
      reg_number: u.students?.[0]?.reg_number,
      department: u.students?.[0]?.department || u.supervisors?.[0]?.department,
      student_phone: u.students?.[0]?.phone,
      supervisor_phone: u.supervisors?.[0]?.phone,
      supervisor_dept: u.supervisors?.[0]?.department,
      students: undefined, supervisors: undefined, host_organizations: undefined,
    })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/admin/toggle-user/:id
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

// DELETE /api/admin/delete-user/:id
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

// GET /api/admin/reports/summary
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
      supabase.from('attachments').select(`
        status,
        students!attachments_student_id_fkey (department),
        host_organizations!attachments_org_id_fkey (org_name)
      `),
    ]);

    const statusMap = {};
    (statusRows || []).forEach(a => { statusMap[a.status] = (statusMap[a.status] || 0) + 1; });
    const statusBreakdown = Object.entries(statusMap).map(([status, count]) => ({ status, count }));

    const orgMap = {};
    (allAttachments || []).forEach(a => {
      const name = a.host_organizations?.org_name || 'Unknown';
      orgMap[name] = (orgMap[name] || 0) + 1;
    });
    const orgBreakdown = Object.entries(orgMap)
      .map(([org_name, count]) => ({ org_name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const deptMap = {};
    (allAttachments || []).forEach(a => {
      const dept = a.students?.department || 'Unspecified';
      deptMap[dept] = (deptMap[dept] || 0) + 1;
    });
    const deptBreakdown = Object.entries(deptMap)
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

// GET /api/admin/reports/detailed
router.get('/reports/detailed', protect, authorize('admin'), async (req, res) => {
  try {
    const { page, limit, from } = parsePagination(req.query);

    let query = supabase
      .from('attachments')
      .select(`
        attachment_id, status, start_date, end_date, created_at,
        students!attachments_student_id_fkey (full_name, reg_number, department),
        host_organizations!attachments_org_id_fkey (org_name),
        supervisors!attachments_supervisor_id_fkey (full_name),
        logbook_entries!logbook_entries_attachment_id_fkey (entry_id),
        evaluations!evaluations_attachment_id_fkey (rating)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1);

    if (req.query.status) query = query.eq('status', req.query.status);
    if (req.query.startDate) query = query.gte('created_at', req.query.startDate);
    if (req.query.endDate) query = query.lte('created_at', req.query.endDate);

    const { data, error, count } = await query;
    if (error) throw error;

    const details = (data || []).map(a => {
      const ratings = (a.evaluations || []).map(e => e.rating).filter(Boolean);
      return {
        attachment_id: a.attachment_id,
        status: a.status,
        start_date: a.start_date,
        end_date: a.end_date,
        created_at: a.created_at,
        student_name: a.students?.full_name,
        reg_number: a.students?.reg_number,
        department: a.students?.department,
        org_name: a.host_organizations?.org_name,
        supervisor_name: a.supervisors?.full_name,
        logbook_count: a.logbook_entries?.length || 0,
        evaluation_rating: ratings.length ? ratings.reduce((s, r) => s + r, 0) / ratings.length : null,
      };
    });

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

// GET /api/admin/audit-logs
// Used by the frontend AuditLogs screen in Settings
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
