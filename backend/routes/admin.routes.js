const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const db = require('../config/db');

const VALID_ATTACHMENT_STATUSES = ['pending', 'approved', 'ongoing', 'completed', 'rejected'];

const badRequest = (message) => Object.assign(new Error(message), { statusCode: 400 });
const notFound = (message) => Object.assign(new Error(message), { statusCode: 404 });

const parsePagination = (query) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
  return { page, limit, offset: (page - 1) * limit };
};

const buildAttachmentFilters = (query = {}, { includeSearch = false } = {}) => {
  const where = [];
  const params = [];

  if (query.status) {
    const status = String(query.status).toLowerCase();
    if (!VALID_ATTACHMENT_STATUSES.includes(status)) {
      throw badRequest('Invalid attachment status');
    }
    where.push('a.status = ?');
    params.push(status);
  }

  if (query.startDate) {
    where.push('DATE(a.created_at) >= ?');
    params.push(query.startDate);
  }

  if (query.endDate) {
    where.push('DATE(a.created_at) <= ?');
    params.push(query.endDate);
  }

  if (includeSearch && query.search) {
    const search = `%${String(query.search).trim()}%`;
    where.push(`(
      s.full_name LIKE ? OR
      s.reg_number LIKE ? OR
      o.org_name LIKE ? OR
      COALESCE(sv.full_name, '') LIKE ?
    )`);
    params.push(search, search, search, search);
  }

  return {
    whereClause: where.length ? `WHERE ${where.join(' AND ')}` : '',
    params,
  };
};

const updateAttachmentStatus = async (attachmentId, status) => {
  const normalizedStatus = String(status || '').toLowerCase();
  if (!VALID_ATTACHMENT_STATUSES.includes(normalizedStatus)) {
    throw badRequest('Invalid attachment status');
  }

  const [att] = await db.query(
    `SELECT a.*, s.user_id as student_user_id
     FROM attachments a
     JOIN students s ON a.student_id = s.student_id
     WHERE a.attachment_id = ?`,
    [attachmentId]
  );
  if (!att.length) throw notFound('Attachment not found');

  await db.query(
    'UPDATE attachments SET status = ? WHERE attachment_id = ?',
    [normalizedStatus, attachmentId]
  );

  await db.query(
    'INSERT INTO notifications (user_id, message) VALUES (?, ?)',
    [att[0].student_user_id, `Your attachment status has been updated to: ${normalizedStatus}`]
  );

  return { message: `Attachment marked as ${normalizedStatus}` };
};

const handleAttachmentStatusUpdate = async (req, res) => {
  try {
    const result = await updateAttachmentStatus(req.params.id, req.body.status);
    res.json(result);
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

// GET /api/admin/dashboard
router.get('/dashboard', protect, authorize('admin'), async (req, res) => {
  try {
    const [[{ totalStudents }]] = await db.query('SELECT COUNT(*) as totalStudents FROM students');
    const [[{ totalSupervisors }]] = await db.query('SELECT COUNT(*) as totalSupervisors FROM supervisors');
    const [[{ totalOrgs }]] = await db.query('SELECT COUNT(*) as totalOrgs FROM host_organizations');
    const [[{ totalAttachments }]] = await db.query('SELECT COUNT(*) as totalAttachments FROM attachments');
    const [[{ pendingOrgs }]] = await db.query('SELECT COUNT(*) as pendingOrgs FROM host_organizations WHERE is_approved = FALSE');
    const [[{ activeAttachments }]] = await db.query("SELECT COUNT(*) as activeAttachments FROM attachments WHERE status = 'ongoing'");

    const [recentUsers] = await db.query(
      `SELECT u.user_id, u.email, u.role, u.created_at,
              COALESCE(s.full_name, sv.full_name, o.org_name) as name
       FROM users u
       LEFT JOIN students s ON u.user_id = s.user_id
       LEFT JOIN supervisors sv ON u.user_id = sv.user_id
       LEFT JOIN host_organizations o ON u.user_id = o.user_id
       ORDER BY u.created_at DESC LIMIT 5`
    );

    const [pendingOrgList] = await db.query(
      `SELECT o.org_id, o.org_name, o.location, o.contact_person, o.phone, u.email
       FROM host_organizations o
       JOIN users u ON o.user_id = u.user_id
       WHERE o.is_approved = FALSE
       ORDER BY o.created_at DESC`
    );

    const [recentAttachments] = await db.query(
      `SELECT a.attachment_id, a.status, a.start_date,
              s.full_name as student_name, s.reg_number,
              o.org_name, sv.full_name as supervisor_name
       FROM attachments a
       JOIN students s ON a.student_id = s.student_id
       JOIN host_organizations o ON a.org_id = o.org_id
       LEFT JOIN supervisors sv ON a.supervisor_id = sv.supervisor_id
       ORDER BY a.created_at DESC LIMIT 5`
    );

    res.json({
      stats: { totalStudents, totalSupervisors, totalOrgs, totalAttachments, pendingOrgs, activeAttachments },
      recentUsers,
      pendingOrgList,
      recentAttachments,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/admin/approve-org/:id
router.put('/approve-org/:id', protect, authorize('admin'), async (req, res) => {
  try {
    await db.query('UPDATE host_organizations SET is_approved = TRUE WHERE org_id = ?', [req.params.id]);
    res.json({ message: 'Organization approved successfully!' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/reports/summary
router.get('/reports/summary', protect, authorize('admin'), async (req, res) => {
  try {
    const { whereClause, params } = buildAttachmentFilters(req.query);

    const [[{ totalAttachments }]] = await db.query(
      `SELECT COUNT(*) as totalAttachments FROM attachments a ${whereClause}`,
      params
    );
    const [[{ totalStudents }]] = await db.query('SELECT COUNT(*) as totalStudents FROM students');
    const [[{ totalSupervisors }]] = await db.query('SELECT COUNT(*) as totalSupervisors FROM supervisors');
    const [[{ totalOrgs }]] = await db.query('SELECT COUNT(*) as totalOrgs FROM host_organizations');

    const [statusBreakdown] = await db.query(
      `SELECT a.status, COUNT(*) as count
       FROM attachments a
       ${whereClause}
       GROUP BY a.status
       ORDER BY a.status ASC`,
      params
    );

    const [orgBreakdown] = await db.query(
      `SELECT o.org_name, COUNT(*) as count
       FROM attachments a
       JOIN host_organizations o ON a.org_id = o.org_id
       ${whereClause}
       GROUP BY o.org_id, o.org_name
       ORDER BY count DESC, o.org_name ASC
       LIMIT 5`,
      params
    );

    const [deptBreakdown] = await db.query(
      `SELECT COALESCE(NULLIF(s.department, ''), 'Unspecified') as department, COUNT(*) as count
       FROM attachments a
       JOIN students s ON a.student_id = s.student_id
       ${whereClause}
       GROUP BY COALESCE(NULLIF(s.department, ''), 'Unspecified')
       ORDER BY count DESC, department ASC`,
      params
    );

    res.json({
      totalAttachments,
      totalStudents,
      totalSupervisors,
      totalOrgs,
      statusBreakdown,
      orgBreakdown,
      deptBreakdown,
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
});

// GET /api/admin/reports/detailed
router.get('/reports/detailed', protect, authorize('admin'), async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { whereClause, params } = buildAttachmentFilters(req.query);

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) as total
       FROM attachments a
       JOIN students s ON a.student_id = s.student_id
       JOIN host_organizations o ON a.org_id = o.org_id
       LEFT JOIN supervisors sv ON a.supervisor_id = sv.supervisor_id
       ${whereClause}`,
      params
    );

    const [details] = await db.query(
      `SELECT a.attachment_id, a.status, a.start_date, a.end_date, a.created_at,
              s.full_name as student_name, s.reg_number, s.department,
              o.org_name, sv.full_name as supervisor_name,
              COUNT(DISTINCT l.entry_id) as logbook_count,
              AVG(e.rating) as evaluation_rating
       FROM attachments a
       JOIN students s ON a.student_id = s.student_id
       JOIN host_organizations o ON a.org_id = o.org_id
       LEFT JOIN supervisors sv ON a.supervisor_id = sv.supervisor_id
       LEFT JOIN logbook_entries l ON a.attachment_id = l.attachment_id
       LEFT JOIN evaluations e ON a.attachment_id = e.attachment_id
       ${whereClause}
       GROUP BY a.attachment_id, a.status, a.start_date, a.end_date, a.created_at,
                s.full_name, s.reg_number, s.department, o.org_name, sv.full_name
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      details,
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
});

// GET /api/admin/attachments
router.get('/attachments', protect, authorize('admin'), async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { whereClause, params } = buildAttachmentFilters(req.query, { includeSearch: true });

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) as total
       FROM attachments a
       JOIN students s ON a.student_id = s.student_id
       JOIN host_organizations o ON a.org_id = o.org_id
       LEFT JOIN supervisors sv ON a.supervisor_id = sv.supervisor_id
       ${whereClause}`,
      params
    );

    const [attachments] = await db.query(
      `SELECT a.attachment_id, a.status, a.start_date, a.end_date, a.created_at,
              s.full_name as student_name, s.reg_number, s.department,
              o.org_name, o.location,
              sv.full_name as supervisor_name
       FROM attachments a
       JOIN students s ON a.student_id = s.student_id
       JOIN host_organizations o ON a.org_id = o.org_id
       LEFT JOIN supervisors sv ON a.supervisor_id = sv.supervisor_id
       ${whereClause}
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      attachments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
});

// GET /api/admin/attachment/:id
router.get('/attachment/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT a.*,
              s.full_name as student_name, s.reg_number, s.department,
              s.year_of_study, s.phone as student_phone,
              o.org_name, o.location, o.contact_person, o.phone as org_phone,
              sv.full_name as supervisor_name, sv.phone as supervisor_phone
       FROM attachments a
       JOIN students s ON a.student_id = s.student_id
       JOIN host_organizations o ON a.org_id = o.org_id
       LEFT JOIN supervisors sv ON a.supervisor_id = sv.supervisor_id
       WHERE a.attachment_id = ?`,
      [req.params.id]
    );

    if (!rows.length) return res.status(404).json({ message: 'Attachment not found' });

    const [logbookEntries] = await db.query(
      `SELECT entry_id, week_number, description, tasks_done, challenges, document_url, submitted_at
       FROM logbook_entries
       WHERE attachment_id = ?
       ORDER BY week_number ASC`,
      [req.params.id]
    );

    const [evaluations] = await db.query(
      `SELECT e.*, sv.full_name as supervisor_name
       FROM evaluations e
       LEFT JOIN supervisors sv ON e.supervisor_id = sv.supervisor_id
       WHERE e.attachment_id = ?
       ORDER BY e.created_at DESC`,
      [req.params.id]
    );

    res.json({
      attachment: rows[0],
      logbookEntries,
      evaluation: evaluations[0] || null,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/admin/attachment/:id/status
router.put('/attachment/:id/status', protect, authorize('admin'), handleAttachmentStatusUpdate);

// GET /api/admin/pending-orgs
router.get('/pending-orgs', protect, authorize('admin'), async (req, res) => {
  try {
    const [orgs] = await db.query(
      `SELECT o.*, u.email
       FROM host_organizations o
       JOIN users u ON o.user_id = u.user_id
       WHERE o.is_approved = FALSE
       ORDER BY o.created_at DESC`
    );
    res.json(orgs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/org-details/:id
router.get('/org-details/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const [org] = await db.query(
      `SELECT o.*, u.email,
              COUNT(DISTINCT r.review_id) as total_reviews,
              AVG(r.rating) as avg_rating
       FROM host_organizations o
       JOIN users u ON o.user_id = u.user_id
       LEFT JOIN org_reviews r ON o.org_id = r.org_id
       WHERE o.org_id = ?
       GROUP BY o.org_id`,
      [req.params.id]
    );
    res.json(org[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/admin/reject-org/:id
router.put('/reject-org/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { reason } = req.body;
    const [org] = await db.query(
      'SELECT * FROM host_organizations WHERE org_id = ?', [req.params.id]
    );
    if (!org.length) return res.status(404).json({ message: 'Organization not found' });

    // Notify host org user
    await db.query(
      'INSERT INTO notifications (user_id, message) VALUES (?, ?)',
      [org[0].user_id, `Your organization registration was rejected. Reason: ${reason || 'Does not meet requirements'}`]
    );

    await db.query('DELETE FROM host_organizations WHERE org_id = ?', [req.params.id]);
    res.json({ message: 'Organization rejected' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/admin/attachment-status/:id
router.put('/attachment-status/:id', protect, authorize('admin'), handleAttachmentStatusUpdate);

// GET /api/admin/all-attachments
router.get('/all-attachments', protect, authorize('admin'), async (req, res) => {
  try {
    const [attachments] = await db.query(
      `SELECT a.attachment_id, a.status, a.start_date, a.end_date,
              s.full_name as student_name, s.reg_number, s.department,
              o.org_name, o.location,
              sv.full_name as supervisor_name
       FROM attachments a
       JOIN students s ON a.student_id = s.student_id
       JOIN host_organizations o ON a.org_id = o.org_id
       LEFT JOIN supervisors sv ON a.supervisor_id = sv.supervisor_id
       ORDER BY a.created_at DESC`
    );
    res.json(attachments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/users
router.get('/users', protect, authorize('admin'), async (req, res) => {
  try {
    const [users] = await db.query(
      `SELECT u.user_id, u.email, u.role, u.is_verified, u.is_active, u.created_at,
              COALESCE(s.full_name, sv.full_name, o.org_name) as name,
              s.reg_number, s.department, s.phone as student_phone,
              sv.department as supervisor_dept, sv.phone as supervisor_phone
       FROM users u
       LEFT JOIN students s ON u.user_id = s.user_id
       LEFT JOIN supervisors sv ON u.user_id = sv.user_id
       LEFT JOIN host_organizations o ON u.user_id = o.user_id
       ORDER BY u.created_at DESC`
    );
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/admin/toggle-user/:id
router.put('/toggle-user/:id', protect, authorize('admin'), async (req, res) => {
  try {
    await db.query(
      'UPDATE users SET is_active = IF(is_active, FALSE, TRUE) WHERE user_id = ?',
      [req.params.id]
    );
    res.json({ message: 'User status updated!' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/admin/delete-user/:id
router.delete('/delete-user/:id', protect, authorize('admin'), async (req, res) => {
  try {
    await db.query('DELETE FROM users WHERE user_id = ?', [req.params.id]);
    res.json({ message: 'User deleted successfully!' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/unassigned-attachments
router.get('/unassigned-attachments', protect, authorize('admin'), async (req, res) => {
  try {
    const [attachments] = await db.query(
      `SELECT a.attachment_id, a.status, a.start_date, a.end_date,
              s.full_name as student_name, s.reg_number, s.department,
              o.org_name, o.location
       FROM attachments a
       JOIN students s ON a.student_id = s.student_id
       JOIN host_organizations o ON a.org_id = o.org_id
       WHERE a.supervisor_id IS NULL AND a.status IN ('pending','ongoing','approved')
       ORDER BY a.created_at DESC`
    );
    res.json(attachments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/supervisors
router.get('/supervisors', protect, authorize('admin'), async (req, res) => {
  try {
    const [supervisors] = await db.query(
      `SELECT sv.supervisor_id, sv.full_name, sv.department, sv.phone,
              u.email,
              COUNT(a.attachment_id) as assigned_count
       FROM supervisors sv
       JOIN users u ON sv.user_id = u.user_id
       LEFT JOIN attachments a ON sv.supervisor_id = a.supervisor_id
         AND a.status IN ('ongoing','approved')
       GROUP BY sv.supervisor_id
       ORDER BY sv.full_name ASC`
    );
    res.json(supervisors);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/admin/assign-supervisor
router.put('/assign-supervisor', protect, authorize('admin'), async (req, res) => {
  const { attachment_id, supervisor_id } = req.body;
  try {
    await db.query(
      'UPDATE attachments SET supervisor_id = ?, status = ? WHERE attachment_id = ?',
      [supervisor_id, 'ongoing', attachment_id]
    );

    // Notify student
    const [attachment] = await db.query(
      `SELECT a.*, s.user_id as student_user_id, sv.full_name as supervisor_name
       FROM attachments a
       JOIN students s ON a.student_id = s.student_id
       JOIN supervisors sv ON sv.supervisor_id = ?
       WHERE a.attachment_id = ?`,
      [supervisor_id, attachment_id]
    );

    if (attachment.length) {
      await db.query(
        'INSERT INTO notifications (user_id, message) VALUES (?, ?)',
        [
          attachment[0].student_user_id,
          `A supervisor has been assigned to your attachment: ${attachment[0].supervisor_name}`
        ]
      );
    }

    res.json({ message: 'Supervisor assigned successfully!' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
