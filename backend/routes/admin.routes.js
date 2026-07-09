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

const dataOrEmpty = (result, label) => {
  if (result?.error) {
    console.error(`${label} query failed:`, result.error.message);
    return [];
  }
  return Array.isArray(result?.data) ? result.data : [];
};

const countOrZero = (result, label) => {
  if (result?.error) {
    console.error(`${label} count failed:`, result.error.message);
    return 0;
  }
  return Number.isFinite(result?.count) ? result.count : 0;
};

// Sums available_slots across each org's currently open vacancy postings.
// Returns a map of org_id -> total open slots across its open/active/ongoing
// vacancies. Used everywhere "vacancy_count"/"open_vacancies" is computed,
// so admin views agree with the real vacancies table instead of the stale,
// manually-typed host_organizations.available_slots field.
const getOpenVacancySlotsByOrg = async (orgIds) => {
  const slotsMap = {};
  if (!orgIds || !orgIds.length) return slotsMap;

  const { data: openVacancies, error } = await supabase
    .from('vacancies')
    .select('org_id, available_slots')
    .in('org_id', orgIds)
    .in('status', ['open', 'active', 'ongoing']);

  if (error) {
    console.error('getOpenVacancySlotsByOrg query failed:', error.message);
    return slotsMap;
  }

  (openVacancies || []).forEach(v => {
    slotsMap[v.org_id] = (slotsMap[v.org_id] || 0) + (v.available_slots || 0);
  });

  return slotsMap;
};

// Helper: update attachment status + notify student
//
// Also keeps vacancies.available_slots in sync: a slot is considered
// "taken" the moment an attachment enters the "approved" status (the
// earliest real commitment point — before a supervisor is even assigned
// and status moves to "ongoing"), and is given back if an attachment
// later moves out of "approved" (e.g. rejected). Skipped entirely when
// attachment.vacancy_id is null, which only applies to a small number of
// legacy attachments that predate the vacancy_id column.
const updateAttachmentStatus = async (attachmentId, status, actor, ip) => {
  const normalized = String(status || '').toLowerCase();
  if (!VALID_STATUSES.includes(normalized))
    throw Object.assign(new Error('Invalid attachment status'), { statusCode: 400 });

  const { data: att, error } = await supabase
    .from('attachments')
    .select('student_id, status, vacancy_id')
    .eq('attachment_id', attachmentId)
    .single();

  if (error || !att)
    throw Object.assign(new Error('Attachment not found'), { statusCode: 404 });

  const previousStatus = String(att.status || '').toLowerCase();

  if (att.vacancy_id) {
    const enteringApproved = normalized === 'approved' && previousStatus !== 'approved';
    const leavingApproved  = previousStatus === 'approved' && normalized !== 'approved';

    if (enteringApproved) {
      const { data: current, error: fetchErr } = await supabase
        .from('vacancies')
        .select('available_slots')
        .eq('vacancy_id', att.vacancy_id)
        .single();

      if (fetchErr) {
        console.error('Vacancy lookup failed during approval:', fetchErr.message);
      } else if ((current?.available_slots || 0) <= 0) {
        throw Object.assign(
          new Error('This vacancy has no remaining slots and cannot be approved'),
          { statusCode: 400 }
        );
      } else {
        const { error: updateError } = await supabase
          .from('vacancies')
          .update({ available_slots: current.available_slots - 1 })
          .eq('vacancy_id', att.vacancy_id)
          .gt('available_slots', 0);
        if (updateError) console.error('Vacancy decrement failed:', updateError.message);
      }
    } else if (leavingApproved) {
      const { data: current, error: fetchErr } = await supabase
        .from('vacancies')
        .select('available_slots')
        .eq('vacancy_id', att.vacancy_id)
        .single();

      if (fetchErr) {
        console.error('Vacancy lookup failed during un-approval:', fetchErr.message);
      } else {
        const { error: updateError } = await supabase
          .from('vacancies')
          .update({ available_slots: (current?.available_slots || 0) + 1 })
          .eq('vacancy_id', att.vacancy_id);
        if (updateError) console.error('Vacancy increment failed:', updateError.message);
      }
    }
  }

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
      totalStudentsResult,
      totalSupervisorsResult,
      totalOrgsResult,
      totalAttachmentsResult,
      pendingOrgsResult,
      activeAttachmentsResult,
    ] = await Promise.all([
      supabase.from('students').select('*', { count: 'exact', head: true }),
      supabase.from('supervisors').select('*', { count: 'exact', head: true }),
      supabase.from('host_organizations').select('*', { count: 'exact', head: true }),
      supabase.from('attachments').select('*', { count: 'exact', head: true }),
      supabase.from('host_organizations').select('*', { count: 'exact', head: true }).eq('is_approved', false),
      supabase.from('attachments').select('*', { count: 'exact', head: true }).eq('status', 'ongoing'),
    ]);

    const totalStudents     = countOrZero(totalStudentsResult,     'dashboard total students');
    const totalSupervisors  = countOrZero(totalSupervisorsResult,  'dashboard total supervisors');
    const totalOrgs         = countOrZero(totalOrgsResult,         'dashboard total organizations');
    const totalAttachments  = countOrZero(totalAttachmentsResult,  'dashboard total attachments');
    const pendingOrgs       = countOrZero(pendingOrgsResult,       'dashboard pending organizations');
    const activeAttachments = countOrZero(activeAttachmentsResult, 'dashboard active attachments');

    const recentUsersResult = await supabase
      .from('users')
      .select('user_id, email, role, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    const recentUsers = dataOrEmpty(recentUsersResult, 'dashboard recent users');

    const userIds = recentUsers.map(u => u.user_id);
    let studentsMap = {}, supervisorsMap = {}, orgsMap = {};

    if (userIds.length) {
      const studentsResult = await supabase
        .from('students').select('user_id, full_name').in('user_id', userIds);
      dataOrEmpty(studentsResult, 'dashboard student names').forEach(s => studentsMap[s.user_id] = s.full_name);

      const supervisorsResult = await supabase
        .from('supervisors').select('user_id, full_name').in('user_id', userIds);
      dataOrEmpty(supervisorsResult, 'dashboard supervisor names').forEach(s => supervisorsMap[s.user_id] = s.full_name);

      const orgsResult = await supabase
        .from('host_organizations').select('user_id, org_name').in('user_id', userIds);
      dataOrEmpty(orgsResult, 'dashboard organization names').forEach(o => orgsMap[o.user_id] = o.org_name);
    }

    const flatRecentUsers = recentUsers.map(u => ({
      ...u,
      name: studentsMap[u.user_id] || supervisorsMap[u.user_id] || orgsMap[u.user_id],
    }));

    const pendingOrgResult = await supabase
      .from('host_organizations')
      .select('*')
      .eq('is_approved', false)
      .order('created_at', { ascending: false });
    const pendingOrgList = dataOrEmpty(pendingOrgResult, 'dashboard pending organizations');

    const orgUserIds = pendingOrgList.map(o => o.user_id).filter(Boolean);
    let emailMap = {};
    if (orgUserIds.length) {
      const usersResult = await supabase
        .from('users').select('user_id, email').in('user_id', orgUserIds);
      dataOrEmpty(usersResult, 'dashboard pending organization users').forEach(u => emailMap[u.user_id] = u.email);
    }
    const pendingOrgsWithEmail = pendingOrgList.map(o => ({ ...o, email: emailMap[o.user_id] }));

    const recentAttachmentsResult = await supabase
      .from('attachments')
      .select('attachment_id, status, start_date, student_id, org_id, supervisor_id, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    const recentAttachments = dataOrEmpty(recentAttachmentsResult, 'dashboard recent attachments');

    const studentIds    = recentAttachments.map(a => a.student_id).filter(Boolean);
    const orgIds        = recentAttachments.map(a => a.org_id).filter(Boolean);
    const supervisorIds = recentAttachments.map(a => a.supervisor_id).filter(Boolean);

    let studentMap = {}, orgMap = {}, supervisorMap = {};
    if (studentIds.length) {
      const studentsResult = await supabase
        .from('students').select('student_id, full_name, reg_number').in('student_id', studentIds);
      dataOrEmpty(studentsResult, 'dashboard attachment students').forEach(s => studentMap[s.student_id] = s);
    }
    if (orgIds.length) {
      const orgsResult = await supabase
        .from('host_organizations').select('org_id, org_name').in('org_id', orgIds);
      dataOrEmpty(orgsResult, 'dashboard attachment organizations').forEach(o => orgMap[o.org_id] = o.org_name);
    }
    if (supervisorIds.length) {
      const supervisorsResult = await supabase
        .from('supervisors').select('supervisor_id, full_name').in('supervisor_id', supervisorIds);
      dataOrEmpty(supervisorsResult, 'dashboard attachment supervisors').forEach(s => supervisorMap[s.supervisor_id] = s.full_name);
    }

    const flatAttachments = recentAttachments.map(a => ({
      ...a,
      student_name:    studentMap[a.student_id]?.full_name,
      reg_number:      studentMap[a.student_id]?.reg_number,
      org_name:        orgMap[a.org_id],
      supervisor_name: supervisorMap[a.supervisor_id],
    }));

    await audit(
      req.user, 'VIEW_DASHBOARD', 'dashboard', null,
      `Admin ${req.user?.email} viewed the dashboard`, {}, req.ip
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

// ─── GET /api/admin/students ───────────────────────────────────────────────
router.get('/students', protect, authorize('admin'), async (req, res) => {
  try {
    const { data: students, error } = await supabase
      .from('students')
      .select('student_id, user_id, full_name, reg_number, department, year_of_study, phone')
      .order('full_name', { ascending: true });
    if (error) throw error;

    const userIds = students.map(s => s.user_id).filter(Boolean);
    let userMap = {};
    if (userIds.length) {
      const { data: users } = await supabase
        .from('users')
        .select('user_id, email, is_active, created_at')
        .in('user_id', userIds);
      users.forEach(u => userMap[u.user_id] = u);
    }

    const studentIds = students.map(s => s.student_id).filter(Boolean);
    let attachmentMap = {};
    if (studentIds.length) {
      const { data: attachments } = await supabase
        .from('attachments')
        .select('student_id, attachment_id, status, org_id, supervisor_id')
        .in('student_id', studentIds)
        .order('created_at', { ascending: false });

      attachments.forEach(a => {
        if (!attachmentMap[a.student_id]) attachmentMap[a.student_id] = a;
      });

      const orgIds = Object.values(attachmentMap).map(a => a.org_id).filter(Boolean);
      if (orgIds.length) {
        const { data: orgs } = await supabase
          .from('host_organizations').select('org_id, org_name').in('org_id', orgIds);
        const orgNameMap = {};
        orgs.forEach(o => orgNameMap[o.org_id] = o.org_name);
        Object.keys(attachmentMap).forEach(sid => {
          attachmentMap[sid].org_name = orgNameMap[attachmentMap[sid].org_id] || null;
        });
      }
    }

    const result = students.map(s => ({
      ...s,
      name:              s.full_name,
      email:             userMap[s.user_id]?.email      || null,
      is_active:         userMap[s.user_id]?.is_active  ?? true,
      created_at:        userMap[s.user_id]?.created_at || null,
      attachment_id:     attachmentMap[s.student_id]?.attachment_id || null,
      attachment_status: attachmentMap[s.student_id]?.status        || 'unplaced',
      org_name:          attachmentMap[s.student_id]?.org_name       || null,
      has_supervisor:    !!attachmentMap[s.student_id]?.supervisor_id,
    }));

    res.json(result);
  } catch (err) {
    console.error('GET /students error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/admin/orgs ──────────────────────────────────────────────────
router.get('/orgs', protect, authorize('admin'), async (req, res) => {
  try {
    const { data: orgs, error } = await supabase
      .from('host_organizations')
      .select('org_id, user_id, org_name, location, contact_person, phone, available_slots, is_approved, created_at')
      .order('org_name', { ascending: true });
    if (error) throw error;

    const userIds = orgs.map(o => o.user_id).filter(Boolean);
    let emailMap = {};
    if (userIds.length) {
      const { data: users } = await supabase
        .from('users').select('user_id, email').in('user_id', userIds);
      users.forEach(u => emailMap[u.user_id] = u.email);
    }

    const orgIds = orgs.map(o => o.org_id).filter(Boolean);
    let internCountMap = {};
    if (orgIds.length) {
      const { data: attachments } = await supabase
        .from('attachments')
        .select('org_id, status')
        .in('org_id', orgIds)
        .in('status', ['ongoing', 'approved']);
      attachments.forEach(a => {
        internCountMap[a.org_id] = (internCountMap[a.org_id] || 0) + 1;
      });
    }

    // vacancy_count now comes from summing each org's actual open vacancy
    // postings, not the manually-typed host_organizations.available_slots
    // field — that number had no real connection to what vacancies exist.
    const openSlotsMap = await getOpenVacancySlotsByOrg(orgIds);

    const result = orgs.map(o => ({
      ...o,
      name:         o.org_name,
      email:        emailMap[o.user_id]                                              || null,
      intern_count: internCountMap[o.org_id]                                         || 0,
      vacancy_count: Math.max((openSlotsMap[o.org_id] || 0) - (internCountMap[o.org_id] || 0), 0),
      sector:       null,  
      org_type:     null,   
    }));

    res.json(result);
  } catch (err) {
    console.error('GET /orgs error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/admin/vacancies ──────────────────────────────────────────────
// vacancy_count is each org's actual open vacancy postings (summed from the
// vacancies table), minus how many students currently have an
// ongoing/approved attachment there. Previously this was derived from the
// manually-typed host_organizations.available_slots field, which had no
// real connection to what vacancies existed. Optional ?orgId= scopes the
// list to a single org (used by the "Vacancies" button on
// ManageOrgsScreen); omit it for the global view.
router.get('/vacancies', protect, authorize('admin'), async (req, res) => {
  try {
    const { orgId } = req.query;

    let query = supabase
      .from('host_organizations')
      .select('org_id, org_name, location, contact_person, phone, is_approved')
      .eq('is_approved', true)
      .order('org_name', { ascending: true });

    if (orgId) query = query.eq('org_id', orgId);

    const { data: orgs, error } = await query;
    if (error) throw error;

    const orgIds = orgs.map(o => o.org_id).filter(Boolean);
    let internCountMap = {};
    if (orgIds.length) {
      const { data: attachments, error: attErr } = await supabase
        .from('attachments')
        .select('org_id, status')
        .in('org_id', orgIds)
        .in('status', ['ongoing', 'approved']);
      if (attErr) throw attErr;

      attachments.forEach(a => {
        internCountMap[a.org_id] = (internCountMap[a.org_id] || 0) + 1;
      });
    }

    const openSlotsMap = await getOpenVacancySlotsByOrg(orgIds);

    const vacancies = orgs
      .map(o => {
        const intern_count   = internCountMap[o.org_id] || 0;
        const available_slots = openSlotsMap[o.org_id] || 0;
        const vacancy_count   = Math.max(available_slots - intern_count, 0);
        return {
          org_id:          o.org_id,
          org_name:        o.org_name,
          location:        o.location,
          contact_person:  o.contact_person,
          phone:           o.phone,
          available_slots,
          intern_count,
          vacancy_count,
        };
      })
      // Only orgs with an actual open slot show up as a "vacancy"
      .filter(v => v.vacancy_count > 0)
      .sort((a, b) => b.vacancy_count - a.vacancy_count);

    const stats = {
      totalVacancies: vacancies.reduce((sum, v) => sum + v.vacancy_count, 0),
      orgsHiring:     vacancies.length,
    };

    res.json({ vacancies, stats });
  } catch (err) {
    console.error('GET /admin/vacancies error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/admin/role-permissions ──────────────────────────────────────
router.get('/role-permissions', protect, authorize('admin'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('role_permissions').select('role, permissions');
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
      role, permissions, updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('role_permissions').upsert(rows, { onConflict: 'role' });
    if (error) throw error;

    await audit(
      req.user, 'UPDATE_ROLE_PERMISSIONS', 'role_permissions', null,
      `Role permissions updated by ${req.user?.email}`,
      { roles: Object.keys(normalized) }, req.ip
    );

    res.json({ message: 'Role permissions updated', permissions: normalized });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── PUT /api/admin/approve-org/:id ───────────────────────────────────────
router.put('/approve-org/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { error } = await supabase
      .from('host_organizations').update({ is_approved: true }).eq('org_id', req.params.id);
    if (error) throw error;

    await audit(
      req.user, 'APPROVE_ORG', 'host_organizations', req.params.id,
      `Organization (ID: ${req.params.id}) approved`, {}, req.ip
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
      .from('host_organizations').select('user_id').eq('org_id', req.params.id).single();
    if (error || !org) return res.status(404).json({ message: 'Organization not found' });

    await supabase.from('notifications').insert({
      user_id: org.user_id,
      message: `Your organization registration was rejected. Reason: ${reason || 'Does not meet requirements'}`,
    });

    await supabase.from('host_organizations').delete().eq('org_id', req.params.id);

    await audit(
      req.user, 'REJECT_ORG', 'host_organizations', req.params.id,
      `Organization (ID: ${req.params.id}) rejected. Reason: ${reason || 'N/A'}`,
      { reason }, req.ip
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
      .from('host_organizations').select('*').eq('is_approved', false)
      .order('created_at', { ascending: false });
    if (error) throw error;

    const userIds = data.map(o => o.user_id).filter(Boolean);
    let emailMap = {};
    if (userIds.length) {
      const { data: users } = await supabase
        .from('users').select('user_id, email').in('user_id', userIds);
      users.forEach(u => emailMap[u.user_id] = u.email);
    }
    res.json(data.map(o => ({ ...o, email: emailMap[o.user_id] })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/admin/org-details/:id ──────────────────────────────────────
// Extended version — adds total_interns, open_vacancies, completion_rate,
// and placements (for OrgDetailsScreen's stat cards + Active Placements list)
// on top of the original org profile + email + review rating fields.
router.get('/org-details/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { data: org, error } = await supabase
      .from('host_organizations').select('*').eq('org_id', req.params.id).single();
    if (error || !org) return res.status(404).json({ message: 'Organization not found' });

    let email = null;
    if (org.user_id) {
      const { data: user } = await supabase
        .from('users').select('email').eq('user_id', org.user_id).single();
      email = user?.email || null;
    }

    const { data: reviews } = await supabase
      .from('org_reviews').select('rating').eq('org_id', req.params.id);

    const avg_rating = reviews && reviews.length
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : null;

    // All attachments ever placed at this org, used for total_interns,
    // completion_rate, and the placements list.
    const { data: attachments } = await supabase
      .from('attachments')
      .select('attachment_id, student_id, status, start_date, end_date, created_at')
      .eq('org_id', req.params.id)
      .order('created_at', { ascending: false });

    const allAttachments = attachments || [];

    const activeStatuses = ['ongoing', 'approved'];
    const total_interns = allAttachments.filter(a => activeStatuses.includes(a.status)).length;

    const completedCount = allAttachments.filter(a => a.status === 'completed').length;
    const completion_rate = allAttachments.length
      ? Math.round((completedCount / allAttachments.length) * 100)
      : null;

    // open_vacancies now comes from this org's actual open vacancy postings
    // (summed from the vacancies table), minus current interns — not the
    // manually-typed host_organizations.available_slots field.
    const openSlotsMap = await getOpenVacancySlotsByOrg([org.org_id]);
    const open_vacancies = Math.max((openSlotsMap[org.org_id] || 0) - total_interns, 0);

    // Attach student name + department for the placements list.
    const studentIds = allAttachments.map(a => a.student_id).filter(Boolean);
    let studentMap = {};
    if (studentIds.length) {
      const { data: students } = await supabase
        .from('students').select('student_id, full_name, department').in('student_id', studentIds);
      (students || []).forEach(s => studentMap[s.student_id] = s);
    }

    const placements = allAttachments.map(a => ({
      attachment_id: a.attachment_id,
      student_name:  studentMap[a.student_id]?.full_name || 'Unknown',
      department:    studentMap[a.student_id]?.department || null,
      status:        a.status,
      start_date:    a.start_date,
      end_date:      a.end_date,
    }));

    res.json({
      ...org,
      email,
      total_reviews: reviews?.length || 0,
      avg_rating,
      total_interns,
      open_vacancies,
      completion_rate,
      placements,
    });
  } catch (err) {
    console.error('GET /admin/org-details/:id error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/admin/attachments ───────────────────────────────────────────
router.get('/attachments', protect, authorize('admin'), async (req, res) => {
  try {
    const { page, limit, from } = parsePagination(req.query);

    let query = supabase
      .from('attachments').select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1);

    if (req.query.status)    query = query.eq('status', req.query.status);
    if (req.query.startDate) query = query.gte('created_at', req.query.startDate);
    if (req.query.endDate)   query = query.lte('created_at', req.query.endDate);

    if (req.query.search) {
      const term = `%${req.query.search}%`;
      const { data: matchedStudents, error: searchError } = await supabase
        .from('students')
        .select('student_id')
        .or(`full_name.ilike.${term},reg_number.ilike.${term}`);
      if (searchError) throw searchError;

      const ids = (matchedStudents || []).map(s => s.student_id);
      if (ids.length) {
        query = query.in('student_id', ids);
      } else {
        return res.json({
          attachments: [],
          pagination: { page, limit, total: 0, pages: 1 },
        });
      }
    }

    const { data, error, count } = await query;
    if (error) throw error;

    const studentIds    = data.map(a => a.student_id).filter(Boolean);
    const orgIds        = data.map(a => a.org_id).filter(Boolean);
    const supervisorIds = data.map(a => a.supervisor_id).filter(Boolean);

    let studentMap = {}, orgMap = {}, supervisorMap = {};
    if (studentIds.length) {
      const { data: students } = await supabase
        .from('students').select('student_id, full_name, reg_number, department').in('student_id', studentIds);
      students.forEach(s => studentMap[s.student_id] = s);
    }
    if (orgIds.length) {
      const { data: orgs } = await supabase
        .from('host_organizations').select('org_id, org_name, location').in('org_id', orgIds);
      orgs.forEach(o => orgMap[o.org_id] = o);
    }
    if (supervisorIds.length) {
      const { data: supervisors } = await supabase
        .from('supervisors').select('supervisor_id, full_name').in('supervisor_id', supervisorIds);
      supervisors.forEach(s => supervisorMap[s.supervisor_id] = s.full_name);
    }

    const result = data.map(a => ({
      ...a,
      student_name:    studentMap[a.student_id]?.full_name,
      reg_number:      studentMap[a.student_id]?.reg_number,
      department:      studentMap[a.student_id]?.department,
      org_name:        orgMap[a.org_id]?.org_name,
      location:        orgMap[a.org_id]?.location,
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
      .from('attachments').select('*').order('created_at', { ascending: false });
    if (error) throw error;

    const studentIds    = data.map(a => a.student_id).filter(Boolean);
    const orgIds        = data.map(a => a.org_id).filter(Boolean);
    const supervisorIds = data.map(a => a.supervisor_id).filter(Boolean);

    let studentMap = {}, orgMap = {}, supervisorMap = {};
    if (studentIds.length) {
      const { data: students } = await supabase
        .from('students').select('student_id, full_name, reg_number, department').in('student_id', studentIds);
      students.forEach(s => studentMap[s.student_id] = s);
    }
    if (orgIds.length) {
      const { data: orgs } = await supabase
        .from('host_organizations').select('org_id, org_name, location').in('org_id', orgIds);
      orgs.forEach(o => orgMap[o.org_id] = o);
    }
    if (supervisorIds.length) {
      const { data: supervisors } = await supabase
        .from('supervisors').select('supervisor_id, full_name').in('supervisor_id', supervisorIds);
      supervisors.forEach(s => supervisorMap[s.supervisor_id] = s.full_name);
    }

    res.json(data.map(a => ({
      ...a,
      student_name:    studentMap[a.student_id]?.full_name,
      reg_number:      studentMap[a.student_id]?.reg_number,
      department:      studentMap[a.student_id]?.department,
      org_name:        orgMap[a.org_id]?.org_name,
      location:        orgMap[a.org_id]?.location,
      supervisor_name: supervisorMap[a.supervisor_id],
    })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/admin/attachment/:id ────────────────────────────────────────
router.get('/attachment/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('attachments').select('*').eq('attachment_id', req.params.id).single();
    if (error || !data) return res.status(404).json({ message: 'Attachment not found' });

    let studentData = null;
    if (data.student_id) {
      const { data: student } = await supabase
        .from('students').select('full_name, reg_number, department, year_of_study, phone')
        .eq('student_id', data.student_id).single();
      studentData = student;
    }

    let orgData = null;
    if (data.org_id) {
      const { data: org } = await supabase
        .from('host_organizations').select('org_name, location, contact_person, phone')
        .eq('org_id', data.org_id).single();
      orgData = org;
    }

    let supervisorData = null;
    if (data.supervisor_id) {
      const { data: supervisor } = await supabase
        .from('supervisors').select('full_name, phone')
        .eq('supervisor_id', data.supervisor_id).single();
      supervisorData = supervisor;
    }

    const { data: logbookEntries } = await supabase
      .from('logbook_entries')
      .select('entry_id, week_number, description, tasks_done, challenges, document_url, submitted_at')
      .eq('attachment_id', req.params.id).order('week_number', { ascending: true });

    const { data: evaluations } = await supabase
      .from('evaluations').select('*, supervisor_id')
      .eq('attachment_id', req.params.id).order('created_at', { ascending: false });

    let evalSupervisorMap = {};
    if (evaluations && evaluations.length) {
      const supIds = evaluations.map(e => e.supervisor_id).filter(Boolean);
      if (supIds.length) {
        const { data: supervisors } = await supabase
          .from('supervisors').select('supervisor_id, full_name').in('supervisor_id', supIds);
        supervisors.forEach(s => evalSupervisorMap[s.supervisor_id] = s.full_name);
      }
    }

    res.json({
      attachment: {
        ...data,
        student_name:     studentData?.full_name,
        reg_number:       studentData?.reg_number,
        department:       studentData?.department,
        year_of_study:    studentData?.year_of_study,
        student_phone:    studentData?.phone,
        org_name:         orgData?.org_name,
        location:         orgData?.location,
        contact_person:   orgData?.contact_person,
        org_phone:        orgData?.phone,
        supervisor_name:  supervisorData?.full_name,
        supervisor_phone: supervisorData?.phone,
      },
      logbookEntries: logbookEntries || [],
      evaluation: (evaluations || []).map(e => ({
        ...e, supervisor_name: evalSupervisorMap[e.supervisor_id] || null,
      }))[0] || null,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── PUT /api/admin/attachment/:id/status ─────────────────────────────────
router.put('/attachment/:id/status',  protect, authorize('admin'), handleStatusUpdate);
router.put('/attachment-status/:id',  protect, authorize('admin'), handleStatusUpdate);

// ─── GET /api/admin/unassigned-attachments ────────────────────────────────
router.get('/unassigned-attachments', protect, authorize('admin'), async (req, res) => {
  try {
    const attachmentsResult = await supabase
      .from('attachments').select('*')
      .is('supervisor_id', null)
      .in('status', ['pending', 'ongoing', 'approved'])
      .order('created_at', { ascending: false });
    const attachments = dataOrEmpty(attachmentsResult, 'unassigned attachments');

    const studentIds = attachments.map(a => a.student_id).filter(Boolean);
    const orgIds     = attachments.map(a => a.org_id).filter(Boolean);

    let studentMap = {}, orgMap = {};
    if (studentIds.length) {
      const studentsResult = await supabase
        .from('students').select('student_id, full_name, reg_number, department').in('student_id', studentIds);
      dataOrEmpty(studentsResult, 'unassigned attachment students').forEach(s => studentMap[s.student_id] = s);
    }
    if (orgIds.length) {
      const orgsResult = await supabase
        .from('host_organizations').select('org_id, org_name, location').in('org_id', orgIds);
      dataOrEmpty(orgsResult, 'unassigned attachment organizations').forEach(o => orgMap[o.org_id] = o);
    }

    res.json(attachments.map(a => ({
      ...a,
      student_name: studentMap[a.student_id]?.full_name,
      reg_number:   studentMap[a.student_id]?.reg_number,
      department:   studentMap[a.student_id]?.department,
      org_name:     orgMap[a.org_id]?.org_name,
      location:     orgMap[a.org_id]?.location,
    })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/admin/supervisors ───────────────────────────────────────────
router.get('/supervisors', protect, authorize('admin'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('supervisors').select('supervisor_id, full_name, department, phone, user_id')
      .order('full_name', { ascending: true });
    if (error) throw error;

    const userIds = data.map(s => s.user_id).filter(Boolean);
    let emailMap = {};
    if (userIds.length) {
      const { data: users } = await supabase
        .from('users').select('user_id, email').in('user_id', userIds);
      users.forEach(u => emailMap[u.user_id] = u.email);
    }

    const supIds = data.map(s => s.supervisor_id).filter(Boolean);
    let countMap = {};
    if (supIds.length) {
      const { data: attachments } = await supabase
        .from('attachments').select('supervisor_id, status').in('supervisor_id', supIds);
      attachments.forEach(a => {
        if (['ongoing', 'approved'].includes(a.status))
          countMap[a.supervisor_id] = (countMap[a.supervisor_id] || 0) + 1;
      });
    }

    const supervisors = data.map(sv => ({
      ...sv,
      email:          emailMap[sv.user_id],
      assigned_count: countMap[sv.supervisor_id] || 0,
    }));

    // Platform-wide totals for the ManageSupervisors dashboard cards.
    const totalSupervisors = supervisors.length;
    const activeLoads = Object.values(countMap).reduce((sum, n) => sum + n, 0);

    const { data: activeAtts } = await supabase
      .from('attachments')
      .select('attachment_id')
      .in('status', ['ongoing', 'approved'])
      .not('supervisor_id', 'is', null);

    // Pending reviews (platform-wide): logbook entries submitted under any
    // active, supervised attachment that a supervisor hasn't reviewed yet
    // (reviewed_at is only set on approve/reject/revision-request).
    let pendingReviews = 0;
    const activeAttIds = (activeAtts || []).map(a => a.attachment_id);
    if (activeAttIds.length) {
      const { count } = await supabase
        .from('logbook_entries')
        .select('entry_id', { count: 'exact', head: true })
        .in('attachment_id', activeAttIds)
        .is('reviewed_at', null);
      pendingReviews = count || 0;
    }

    res.json({
      supervisors,
      totals: { totalSupervisors, activeLoads, pendingReviews },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/admin/supervisors/:id ───────────────────────────────────────
router.get('/supervisors/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { data: supervisor, error } = await supabase
      .from('supervisors')
      .select('supervisor_id, full_name, department, phone, user_id')
      .eq('supervisor_id', req.params.id)
      .single();
    if (error || !supervisor) return res.status(404).json({ message: 'Supervisor not found' });

    let email = null;
    if (supervisor.user_id) {
      const { data: user } = await supabase
        .from('users').select('email').eq('user_id', supervisor.user_id).single();
      email = user?.email || null;
    }

    const { data: attachments } = await supabase
      .from('attachments')
      .select('attachment_id, student_id, org_id, status')
      .eq('supervisor_id', req.params.id)
      .in('status', ['ongoing', 'approved']);

    const activeAttachments = attachments || [];
    const studentIds = activeAttachments.map(a => a.student_id).filter(Boolean);
    const orgIds     = activeAttachments.map(a => a.org_id).filter(Boolean);
    const attachmentIds = activeAttachments.map(a => a.attachment_id).filter(Boolean);

    let studentMap = {}, orgMap = {};
    if (studentIds.length) {
      const { data: students } = await supabase
        .from('students').select('student_id, full_name').in('student_id', studentIds);
      (students || []).forEach(s => studentMap[s.student_id] = s.full_name);
    }
    if (orgIds.length) {
      const { data: orgs } = await supabase
        .from('host_organizations').select('org_id, org_name').in('org_id', orgIds);
      (orgs || []).forEach(o => orgMap[o.org_id] = o.org_name);
    }

    const students = activeAttachments.map(a => ({
      id:   a.student_id,
      name: studentMap[a.student_id] || 'Unknown',
      org:  orgMap[a.org_id] || 'Unassigned',
    }));

    // Pending reviews: logbook entries submitted by this supervisor's
    // assigned students that haven't been reviewed yet (reviewed_at is only
    // set when a supervisor approves/rejects/requests revision).
    let pendingReviews = 0;
    if (attachmentIds.length) {
      const { count } = await supabase
        .from('logbook_entries')
        .select('entry_id', { count: 'exact', head: true })
        .in('attachment_id', attachmentIds)
        .is('reviewed_at', null);
      pendingReviews = count || 0;
    }

    res.json({
      supervisor_id:   supervisor.supervisor_id,
      user_id:         supervisor.user_id,
      name:            supervisor.full_name,
      department:      supervisor.department,
      phone:           supervisor.phone,
      email,
      active_students: activeAttachments.length,
      pending_reviews: pendingReviews,
      students,
    });
  } catch (err) {
    console.error('GET /admin/supervisors/:id error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ─── PUT /api/admin/assign-supervisor ─────────────────────────────────────
router.put('/assign-supervisor', protect, authorize('admin'), async (req, res) => {
  const { attachment_id, supervisor_id } = req.body;
  try {
    await supabase.from('attachments')
      .update({ supervisor_id, status: 'ongoing' }).eq('attachment_id', attachment_id);

    const { data: att } = await supabase
      .from('attachments').select('student_id').eq('attachment_id', attachment_id).single();

    let studentUserId = null;
    if (att?.student_id) {
      const { data: student } = await supabase
        .from('students').select('user_id').eq('student_id', att.student_id).single();
      studentUserId = student?.user_id;
    }

    let supervisorName = null;
    if (supervisor_id) {
      const { data: sup } = await supabase
        .from('supervisors').select('full_name').eq('supervisor_id', supervisor_id).single();
      supervisorName = sup?.full_name;
    }

    if (studentUserId) {
      await supabase.from('notifications').insert({
        user_id: studentUserId,
        message: `A supervisor has been assigned to your attachment: ${supervisorName || 'Supervisor'}`,
      });
    }

    await audit(
      req.user, 'ASSIGN_SUPERVISOR', 'attachments', attachment_id,
      `Supervisor (ID: ${supervisor_id}) assigned to attachment ${attachment_id}`,
      { supervisor_id, supervisor_name: supervisorName }, req.ip
    );

    res.json({ message: 'Supervisor assigned successfully!' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/admin/admins ────────────────────────────────────────────────
router.get('/admins', protect, authorize('admin'), async (req, res) => {
  try {
    let query = supabase
      .from('users')
      .select('user_id, email, role, is_verified, is_active, is_super_admin, created_at')
      .eq('role', 'admin')
      .order('created_at', { ascending: false });

    if (req.query.search) {
      query = query.ilike('email', `%${req.query.search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    const userIds = (data || []).map(u => u.user_id);
    let nameMap = {};
    if (userIds.length) {
      const { data: students } = await supabase
        .from('students').select('user_id, full_name').in('user_id', userIds);
      (students || []).forEach(s => { nameMap[s.user_id] = s.full_name; });

      const { data: supervisors } = await supabase
        .from('supervisors').select('user_id, full_name').in('user_id', userIds);
      (supervisors || []).forEach(s => { nameMap[s.user_id] = nameMap[s.user_id] || s.full_name; });
    }

    const result = (data || []).map(u => ({
      ...u,
      id:             u.user_id,
      name:           nameMap[u.user_id] || null,
      is_super_admin: u.is_super_admin ?? false,
    }));

    res.json({ admins: result, total: result.length });
  } catch (err) {
    console.error('GET /admin/admins error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ─── PATCH /api/admin/users/:id/super-admin ───────────────────────────────
router.patch('/users/:id/super-admin', protect, authorize('admin'), async (req, res) => {
  try {
    if (!req.user.is_super_admin) {
      return res.status(403).json({ message: 'Only Super Admins can change this setting.' });
    }

    const targetId = req.params.id;

    if (String(targetId) === String(req.user.user_id)) {
      return res.status(400).json({ message: 'You cannot change your own Super Admin status.' });
    }

    const { data: target, error: fetchErr } = await supabase
      .from('users')
      .select('user_id, email, role, is_super_admin')
      .eq('user_id', targetId)
      .single();

    if (fetchErr || !target) return res.status(404).json({ message: 'User not found.' });
    if (target.role !== 'admin') return res.status(400).json({ message: 'User is not an admin.' });

    const newValue = !target.is_super_admin;

    const { error: updateErr } = await supabase
      .from('users')
      .update({ is_super_admin: newValue })
      .eq('user_id', targetId);

    if (updateErr) throw updateErr;

    await audit(
      req.user,
      newValue ? 'PROMOTE_SUPER_ADMIN' : 'DEMOTE_SUPER_ADMIN',
      'users', targetId,
      `${target.email} was ${newValue ? 'promoted to' : 'demoted from'} Super Admin by ${req.user.email}`,
      { is_super_admin: newValue }, req.ip
    );

    res.json({
      message: `${target.email} is now a ${newValue ? 'Super Admin' : 'System Admin'}.`,
      is_super_admin: newValue,
    });
  } catch (err) {
    console.error('PATCH /admin/users/:id/super-admin error:', err);
    res.status(500).json({ message: err.message });
  }
});

//  GET /api/admin/users 
router.get('/users', protect, authorize('admin'), async (req, res) => {
  try {
    let query = supabase
  .from('users')
  .select('user_id, email, role, is_verified, is_active, is_super_admin, avatar_url, created_at')
  .order('created_at', { ascending: false });

    if (req.query.role) {
      query = query.eq('role', req.query.role);
    }

    const { data, error } = await query;
    if (error) throw error;

    const userIds = data.map(u => u.user_id);
    let studentMap = {}, supervisorMap = {}, orgMap = {};

    if (userIds.length) {
      const { data: students } = await supabase
        .from('students').select('user_id, full_name, reg_number, department, phone').in('user_id', userIds);
      students.forEach(s => studentMap[s.user_id] = s);

      const { data: supervisors } = await supabase
        .from('supervisors').select('user_id, full_name, department, phone').in('user_id', userIds);
      supervisors.forEach(s => supervisorMap[s.user_id] = s);

      const { data: orgs } = await supabase
        .from('host_organizations').select('user_id, org_name').in('user_id', userIds);
      orgs.forEach(o => orgMap[o.user_id] = o.org_name);
    }

    res.json(data.map(u => ({
      ...u,
      name:             studentMap[u.user_id]?.full_name || supervisorMap[u.user_id]?.full_name || orgMap[u.user_id] || null,
      reg_number:       studentMap[u.user_id]?.reg_number    || null,
      department:       studentMap[u.user_id]?.department    || supervisorMap[u.user_id]?.department || null,
      student_phone:    studentMap[u.user_id]?.phone         || null,
      supervisor_phone: supervisorMap[u.user_id]?.phone      || null,
      supervisor_dept:  supervisorMap[u.user_id]?.department || null,
      is_super_admin:   u.is_super_admin ?? false,
    })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── PUT /api/admin/toggle-user/:id ──────────────────────────────────────
router.put('/toggle-user/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { data: user } = await supabase
      .from('users').select('is_active, email').eq('user_id', req.params.id).single();

    await supabase.from('users')
      .update({ is_active: !user.is_active }).eq('user_id', req.params.id);

    await audit(
      req.user,
      user.is_active ? 'DEACTIVATE_USER' : 'ACTIVATE_USER',
      'users', req.params.id,
      `User ${user.email} was ${user.is_active ? 'deactivated' : 'activated'}`,
      { previous_status: user.is_active, new_status: !user.is_active }, req.ip
    );

    res.json({ message: 'User status updated!' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── DELETE /api/admin/delete-user/:id ───────────────────────────────────
router.delete('/delete-user/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { data: user } = await supabase
      .from('users').select('email, role').eq('user_id', req.params.id).single();

    const { error } = await supabase.from('users').delete().eq('user_id', req.params.id);
    if (error) throw error;

    await audit(
      req.user, 'DELETE_USER', 'users', req.params.id,
      `User ${user?.email} (${user?.role}) was deleted`,
      { deleted_email: user?.email, deleted_role: user?.role }, req.ip
    );

    res.json({ message: 'User deleted successfully!' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/admin/reports/summary ──────────────────────────────────────
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

    const orgIds = allAttachments.map(a => a.org_id).filter(Boolean);
    let orgNameMap = {};
    if (orgIds.length) {
      const { data: orgs } = await supabase
        .from('host_organizations').select('org_id, org_name').in('org_id', orgIds);
      orgs.forEach(o => orgNameMap[o.org_id] = o.org_name);
    }
    const orgCount = {};
    allAttachments.forEach(a => {
      const name = orgNameMap[a.org_id] || 'Unknown';
      orgCount[name] = (orgCount[name] || 0) + 1;
    });
    const orgBreakdown = Object.entries(orgCount)
      .map(([org_name, count]) => ({ org_name, count }))
      .sort((a, b) => b.count - a.count).slice(0, 5);

    const studentIds = allAttachments.map(a => a.student_id).filter(Boolean);
    let deptMap = {};
    if (studentIds.length) {
      const { data: students } = await supabase
        .from('students').select('student_id, department').in('student_id', studentIds);
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
      req.user, 'VIEW_SUMMARY_REPORT', 'reports', null,
      `Admin ${req.user?.email} viewed the summary report`, {}, req.ip
    );

    res.json({ totalAttachments, totalStudents, totalSupervisors, totalOrgs, statusBreakdown, orgBreakdown, deptBreakdown });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/admin/reports/detailed ─────────────────────────────────────
router.get('/reports/detailed', protect, authorize('admin'), async (req, res) => {
  try {
    const { page, limit, from } = parsePagination(req.query);

    let query = supabase
      .from('attachments').select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1);

    if (req.query.status)    query = query.eq('status', req.query.status);
    if (req.query.startDate) query = query.gte('created_at', req.query.startDate);
    if (req.query.endDate)   query = query.lte('created_at', req.query.endDate);

    const { data, error, count } = await query;
    if (error) throw error;

    const studentIds    = data.map(a => a.student_id).filter(Boolean);
    const orgIds        = data.map(a => a.org_id).filter(Boolean);
    const supervisorIds = data.map(a => a.supervisor_id).filter(Boolean);

    let studentMap = {}, orgMap = {}, supervisorMap = {};
    if (studentIds.length) {
      const { data: students } = await supabase
        .from('students').select('student_id, full_name, reg_number, department').in('student_id', studentIds);
      students.forEach(s => studentMap[s.student_id] = s);
    }
    if (orgIds.length) {
      const { data: orgs } = await supabase
        .from('host_organizations').select('org_id, org_name').in('org_id', orgIds);
      orgs.forEach(o => orgMap[o.org_id] = o.org_name);
    }
    if (supervisorIds.length) {
      const { data: supervisors } = await supabase
        .from('supervisors').select('supervisor_id, full_name').in('supervisor_id', supervisorIds);
      supervisors.forEach(s => supervisorMap[s.supervisor_id] = s.full_name);
    }

    const attachmentIds = data.map(a => a.attachment_id).filter(Boolean);
    let logbookCount = {}, evalRatings = {};
    if (attachmentIds.length) {
      const { data: logs } = await supabase
        .from('logbook_entries').select('attachment_id').in('attachment_id', attachmentIds);
      logs.forEach(l => logbookCount[l.attachment_id] = (logbookCount[l.attachment_id] || 0) + 1);

      const { data: evals } = await supabase
        .from('evaluations').select('attachment_id, rating').in('attachment_id', attachmentIds);
      const ratingsByAtt = {};
      evals.forEach(e => {
        if (!ratingsByAtt[e.attachment_id]) ratingsByAtt[e.attachment_id] = [];
        ratingsByAtt[e.attachment_id].push(e.rating);
      });
      Object.entries(ratingsByAtt).forEach(([attId, ratings]) => {
        evalRatings[attId] = ratings.reduce((s, r) => s + r, 0) / ratings.length;
      });
    }

    await audit(
      req.user, 'VIEW_DETAILED_REPORT', 'reports', null,
      `Admin ${req.user?.email} viewed detailed report (page ${page})`,
      { filters: { status: req.query.status, startDate: req.query.startDate, endDate: req.query.endDate } }, req.ip
    );

    res.json({
      details: data.map(a => ({
        attachment_id:     a.attachment_id,
        status:            a.status,
        start_date:        a.start_date,
        end_date:          a.end_date,
        created_at:        a.created_at,
        student_name:      studentMap[a.student_id]?.full_name,
        reg_number:        studentMap[a.student_id]?.reg_number,
        department:        studentMap[a.student_id]?.department,
        org_name:          orgMap[a.org_id],
        supervisor_name:   supervisorMap[a.supervisor_id],
        logbook_count:     logbookCount[a.attachment_id] || 0,
        evaluation_rating: evalRatings[a.attachment_id]  || null,
      })),
      pagination: { page, limit, total: count, pages: Math.max(Math.ceil(count / limit), 1) },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/admin/audit-logs ────────────────────────────────────────────
router.get('/audit-logs', protect, authorize('admin'), async (req, res) => {
  try {
    const { page, limit, from } = parsePagination(req.query);

    let query = supabase
      .from('audit_logs').select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1);

    if (req.query.action)      query = query.eq('action', req.query.action);
    if (req.query.actor_email) query = query.ilike('actor_email', `%${req.query.actor_email}%`);
    if (req.query.entity)      query = query.eq('entity', req.query.entity);
    if (req.query.startDate)   query = query.gte('created_at', req.query.startDate);
    if (req.query.endDate)     query = query.lte('created_at', req.query.endDate);

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

// ─────────────────────────────────────────────────────────────────────────────
// ATTACHMENT SESSIONS
// ─────────────────────────────────────────────────────────────────────────────

// ─── GET /api/admin/attachment-sessions ──────────────────────────────────────
router.get('/attachment-sessions', protect, authorize('admin'), async (req, res) => {
  try {
    const { data: sessions, error } = await supabase
      .from('attachment_sessions')
      .select('*')
      .order('start_date', { ascending: false });
    if (error) throw error;

    const activeSession = (sessions || []).find(s => s.status === 'ACTIVE');
    let activeStudentCount = 0;
    if (activeSession) {
      const { count } = await supabase
        .from('attachments')
        .select('*', { count: 'exact', head: true })
        .in('status', ['ongoing', 'approved']);
      activeStudentCount = count || 0;
    }

    const result = (sessions || []).map(s => ({
      ...s,
      student_count: s.status === 'ACTIVE' ? activeStudentCount : (s.student_count || 0),
    }));

    res.json({ sessions: result });
  } catch (err) {
    console.error('GET /attachment-sessions:', err);
    res.status(500).json({ message: 'Failed to fetch attachment sessions.' });
  }
});

// ─── POST /api/admin/attachment-sessions ─────────────────────────────────────
router.post('/attachment-sessions', protect, authorize('admin'), async (req, res) => {
  const { name, start_date, end_date, status = 'UPCOMING' } = req.body;

  if (!name?.trim())       return res.status(400).json({ message: 'Session name is required.' });
  if (!start_date?.trim()) return res.status(400).json({ message: 'Start date is required.' });
  if (!end_date?.trim())   return res.status(400).json({ message: 'End date is required.' });

  const start = new Date(start_date);
  const end   = new Date(end_date);
  if (isNaN(start.getTime())) return res.status(400).json({ message: 'Invalid start date.' });
  if (isNaN(end.getTime()))   return res.status(400).json({ message: 'Invalid end date.' });
  if (end <= start)           return res.status(400).json({ message: 'End date must be after start date.' });

  try {
    if (status === 'ACTIVE') {
      const { data: existing } = await supabase
        .from('attachment_sessions')
        .select('id, name')
        .eq('status', 'ACTIVE')
        .maybeSingle();
      if (existing) {
        return res.status(409).json({
          message: `"${existing.name}" is already active. Close it before activating a new session.`,
        });
      }
    }

    const { data: session, error } = await supabase
      .from('attachment_sessions')
      .insert({
        name:       name.trim(),
        start_date: start.toISOString().split('T')[0],
        end_date:   end.toISOString().split('T')[0],
        status,
        created_by: req.user?.user_id || null,
      })
      .select()
      .single();
    if (error) throw error;

    await audit(
      req.user, 'CREATE_ATTACHMENT_SESSION', 'attachment_sessions', session.id,
      `Created attachment session "${session.name}" (${status})`,
      { status }, req.ip
    );

    res.status(201).json({ message: 'Session created successfully.', session });
  } catch (err) {
    console.error('POST /attachment-sessions:', err);
    res.status(500).json({ message: 'Failed to create session.' });
  }
});

// ─── PUT /api/admin/attachment-sessions/:id ───────────────────────────────────
router.put('/attachment-sessions/:id', protect, authorize('admin'), async (req, res) => {
  const { id } = req.params;
  const { name, start_date, end_date, status } = req.body;

  try {
    const { data: existing, error: fetchErr } = await supabase
      .from('attachment_sessions').select('*').eq('id', id).single();
    if (fetchErr || !existing) return res.status(404).json({ message: 'Session not found.' });

    const data = {};
    if (name?.trim())       data.name       = name.trim();
    if (start_date?.trim()) data.start_date = start_date.trim();
    if (end_date?.trim())   data.end_date   = end_date.trim();
    if (status)             data.status     = status;

    const resolvedStart = new Date(data.start_date || existing.start_date);
    const resolvedEnd   = new Date(data.end_date   || existing.end_date);
    if (resolvedEnd <= resolvedStart) {
      return res.status(400).json({ message: 'End date must be after start date.' });
    }

    if (status === 'ACTIVE' && existing.status !== 'ACTIVE') {
      const { data: otherActive } = await supabase
        .from('attachment_sessions')
        .select('id, name')
        .eq('status', 'ACTIVE')
        .neq('id', id)
        .maybeSingle();
      if (otherActive) {
        return res.status(409).json({
          message: `"${otherActive.name}" is already active. Close it before activating this session.`,
        });
      }
    }

    const { data: updated, error: updateErr } = await supabase
      .from('attachment_sessions')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (updateErr) throw updateErr;

    await audit(
      req.user, 'UPDATE_ATTACHMENT_SESSION', 'attachment_sessions', id,
      `Updated session "${updated.name}" → status: ${updated.status}`,
      { status: updated.status }, req.ip
    );

    res.json({ message: 'Session updated successfully.', session: updated });
  } catch (err) {
    console.error('PUT /attachment-sessions/:id:', err);
    res.status(500).json({ message: 'Failed to update session.' });
  }
});

// ─── DELETE /api/admin/attachment-sessions/:id ────────────────────────────────
router.delete('/attachment-sessions/:id', protect, authorize('admin'), async (req, res) => {
  const { id } = req.params;
  try {
    const { data: session, error: fetchErr } = await supabase
      .from('attachment_sessions').select('*').eq('id', id).single();
    if (fetchErr || !session) return res.status(404).json({ message: 'Session not found.' });

    if (session.status === 'ACTIVE') {
      return res.status(400).json({ message: 'Cannot delete an active session. Close it first.' });
    }

    const { error } = await supabase.from('attachment_sessions').delete().eq('id', id);
    if (error) throw error;

    await audit(
      req.user, 'DELETE_ATTACHMENT_SESSION', 'attachment_sessions', id,
      `Deleted session "${session.name}"`, {}, req.ip
    );

    res.json({ message: 'Session deleted successfully.' });
  } catch (err) {
    console.error('DELETE /attachment-sessions/:id:', err);
    res.status(500).json({ message: 'Failed to delete session.' });
  }
});

// ─── PATCH /api/admin/users/:id/status ───────────────────────────────────────
router.patch('/users/:id/status', protect, authorize('admin'), async (req, res) => {
  try {
    const { is_active } = req.body;
    const { data: user } = await supabase
      .from('users').select('email, is_active').eq('user_id', req.params.id).single();

    await supabase.from('users')
      .update({ is_active }).eq('user_id', req.params.id);

    await audit(
      req.user,
      is_active ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
      'users', req.params.id,
      `User ${user?.email} was ${is_active ? 'activated' : 'deactivated'}`,
      { is_active }, req.ip
    );

    res.json({ message: `User ${is_active ? 'activated' : 'deactivated'} successfully.` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── DELETE /api/admin/users/:id ─────────────────────────────────────────────
router.delete('/users/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { data: user } = await supabase
      .from('users').select('email, role').eq('user_id', req.params.id).single();

    const { error } = await supabase.from('users').delete().eq('user_id', req.params.id);
    if (error) throw error;

    await audit(
      req.user, 'DELETE_USER', 'users', req.params.id,
      `User ${user?.email} (${user?.role}) was deleted`,
      { deleted_email: user?.email, deleted_role: user?.role }, req.ip
    );

    res.json({ message: 'User deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── POST /api/admin/users/:id/reset-password ────────────────────────────────
router.post('/users/:id/reset-password', protect, authorize('admin'), async (req, res) => {
  try {
    const { data: user } = await supabase
      .from('users').select('email, auth_id').eq('user_id', req.params.id).single();
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';
    if (user.auth_id) {
      await supabase.auth.admin.updateUserById(user.auth_id, { password: tempPassword });
    }

    await audit(
      req.user, 'RESET_PASSWORD', 'users', req.params.id,
      `Password reset for ${user.email}`, {}, req.ip
    );

    res.json({ message: `Password reset successfully. Temporary password: ${tempPassword}` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;