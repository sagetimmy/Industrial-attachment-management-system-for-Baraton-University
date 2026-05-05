const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const db = require('../config/db');

// GET /api/supervisors/dashboard
router.get('/dashboard', protect, authorize('supervisor'), async (req, res) => {
  try {
    // Get supervisor info
    const [supervisor] = await db.query(
      'SELECT * FROM supervisors WHERE user_id = ?',
      [req.user.user_id]
    );

    // Get assigned students
    const [students] = await db.query(
      `SELECT s.full_name, s.reg_number, s.department,
              a.status, a.start_date, a.end_date, a.attachment_id,
              o.org_name
       FROM attachments a
       JOIN students s ON a.student_id = s.student_id
       JOIN host_organizations o ON a.org_id = o.org_id
       WHERE a.supervisor_id = ?`,
      [supervisor[0]?.supervisor_id]
    );

    // Get pending logbook entries
    const [pendingLogs] = await db.query(
      `SELECT l.entry_id, l.week_number, l.submitted_at,
              s.full_name, s.reg_number
       FROM logbook_entries l
       JOIN attachments a ON l.attachment_id = a.attachment_id
       JOIN students s ON a.student_id = s.student_id
       WHERE a.supervisor_id = ?
       ORDER BY l.submitted_at DESC
       LIMIT 5`,
      [supervisor[0]?.supervisor_id]
    );

    res.json({
      supervisor: supervisor[0],
      students,
      pendingLogs,
      stats: {
        totalStudents: students.length,
        activeStudents: students.filter(s => s.status === 'ongoing').length,
        pendingLogs: pendingLogs.length,
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
