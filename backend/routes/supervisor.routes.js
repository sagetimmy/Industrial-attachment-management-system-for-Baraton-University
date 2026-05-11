const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const db = require('../config/db');

// GET /api/supervisors/dashboard
router.get('/dashboard', protect, async (req, res) => {
  try {
    const [supervisor] = await db.query(
      'SELECT * FROM supervisors WHERE user_id = ?',
      [req.user.user_id]
    );
    if (!supervisor.length) return res.status(404).json({ message: 'Supervisor not found' });

    const supId = supervisor[0].supervisor_id;

    const [students] = await db.query(
      `SELECT s.full_name, s.reg_number, s.department, s.phone,
              a.status, a.start_date, a.end_date, a.attachment_id,
              o.org_name, o.location
       FROM attachments a
       JOIN students s ON a.student_id = s.student_id
       JOIN host_organizations o ON a.org_id = o.org_id
       WHERE a.supervisor_id = ?`,
      [supId]
    );

    const [pendingLogs] = await db.query(
      `SELECT l.entry_id, l.week_number, l.submitted_at, l.description,
              s.full_name, s.reg_number
       FROM logbook_entries l
       JOIN attachments a ON l.attachment_id = a.attachment_id
       JOIN students s ON a.student_id = s.student_id
       WHERE a.supervisor_id = ?
       ORDER BY l.submitted_at DESC LIMIT 5`,
      [supId]
    );

    const [upcomingVisits] = await db.query(
      `SELECT sv.*, s.full_name as student_name, o.org_name
       FROM site_visits sv
       JOIN attachments a ON sv.attachment_id = a.attachment_id
       JOIN students s ON a.student_id = s.student_id
       JOIN host_organizations o ON a.org_id = o.org_id
       WHERE sv.supervisor_id = ? AND sv.status = 'scheduled'
         AND sv.visit_date >= CURDATE()
       ORDER BY sv.visit_date ASC LIMIT 3`,
      [supId]
    );

    res.json({
      supervisor: supervisor[0],
      students,
      pendingLogs,
      upcomingVisits,
      stats: {
        totalStudents: students.length,
        activeStudents: students.filter(s => s.status === 'ongoing').length,
        pendingLogs: pendingLogs.length,
        upcomingVisits: upcomingVisits.length,
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/supervisors/students
router.get('/students', protect, async (req, res) => {
  try {
    const [supervisor] = await db.query(
      'SELECT * FROM supervisors WHERE user_id = ?', [req.user.user_id]
    );
    if (!supervisor.length) return res.status(404).json({ message: 'Supervisor not found' });

    const [students] = await db.query(
      `SELECT s.*, a.attachment_id, a.status, a.start_date, a.end_date,
              o.org_name, o.location,
              u.email,
              COUNT(l.entry_id) as logbook_count
       FROM attachments a
       JOIN students s ON a.student_id = s.student_id
       JOIN host_organizations o ON a.org_id = o.org_id
       JOIN users u ON s.user_id = u.user_id
       LEFT JOIN logbook_entries l ON a.attachment_id = l.attachment_id
       WHERE a.supervisor_id = ?
       GROUP BY s.student_id, a.attachment_id
       ORDER BY s.full_name ASC`,
      [supervisor[0].supervisor_id]
    );
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/supervisors/logbooks
router.get('/logbooks', protect, async (req, res) => {
  try {
    const [supervisor] = await db.query(
      'SELECT * FROM supervisors WHERE user_id = ?', [req.user.user_id]
    );
    if (!supervisor.length) return res.status(404).json({ message: 'Supervisor not found' });

    const [entries] = await db.query(
      `SELECT l.*, s.full_name, s.reg_number, o.org_name, a.attachment_id
       FROM logbook_entries l
       JOIN attachments a ON l.attachment_id = a.attachment_id
       JOIN students s ON a.student_id = s.student_id
       JOIN host_organizations o ON a.org_id = o.org_id
       WHERE a.supervisor_id = ?
       ORDER BY l.submitted_at DESC`,
      [supervisor[0].supervisor_id]
    );
    res.json(entries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/supervisors/site-visits
router.get('/site-visits', protect, async (req, res) => {
  try {
    const [supervisor] = await db.query(
      'SELECT * FROM supervisors WHERE user_id = ?', [req.user.user_id]
    );
    if (!supervisor.length) return res.status(404).json({ message: 'Supervisor not found' });

    const [visits] = await db.query(
      `SELECT sv.*, s.full_name as student_name, s.reg_number,
              o.org_name, o.location, a.attachment_id
       FROM site_visits sv
       JOIN attachments a ON sv.attachment_id = a.attachment_id
       JOIN students s ON a.student_id = s.student_id
       JOIN host_organizations o ON a.org_id = o.org_id
       WHERE sv.supervisor_id = ?
       ORDER BY sv.visit_date DESC`,
      [supervisor[0].supervisor_id]
    );
    res.json(visits);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/supervisors/site-visits
router.post('/site-visits', protect, async (req, res) => {
  const { attachment_id, visit_date, visit_time, notes } = req.body;
  try {
    const [supervisor] = await db.query(
      'SELECT * FROM supervisors WHERE user_id = ?', [req.user.user_id]
    );
    if (!supervisor.length) return res.status(404).json({ message: 'Supervisor not found' });

    await db.query(
      'INSERT INTO site_visits (attachment_id, supervisor_id, visit_date, visit_time, notes) VALUES (?,?,?,?,?)',
      [attachment_id, supervisor[0].supervisor_id, visit_date, visit_time || '', notes || '']
    );

    // Notify student
    const [att] = await db.query(
      `SELECT s.user_id FROM attachments a
       JOIN students s ON a.student_id = s.student_id
       WHERE a.attachment_id = ?`,
      [attachment_id]
    );
    if (att.length) {
      await db.query(
        'INSERT INTO notifications (user_id, message) VALUES (?, ?)',
        [att[0].user_id, `A site visit has been scheduled for ${visit_date} at ${visit_time}`]
      );
    }

    res.status(201).json({ message: 'Site visit scheduled successfully!' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/supervisors/site-visits/:id
router.put('/site-visits/:id', protect, async (req, res) => {
  const { status } = req.body;
  try {
    await db.query(
      'UPDATE site_visits SET status = ? WHERE visit_id = ?',
      [status, req.params.id]
    );
    res.json({ message: `Site visit marked as ${status}` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/supervisors/evaluations
router.post('/evaluations', protect, async (req, res) => {
  const { attachment_id, score, comments, eval_date } = req.body;
  try {
    const [supervisor] = await db.query(
      'SELECT * FROM supervisors WHERE user_id = ?', [req.user.user_id]
    );
    if (!supervisor.length) return res.status(404).json({ message: 'Supervisor not found' });

    await db.query(
      'INSERT INTO evaluations (attachment_id, supervisor_id, score, comments, eval_date) VALUES (?,?,?,?,?)',
      [attachment_id, supervisor[0].supervisor_id, score, comments, eval_date || new Date()]
    );

    // Notify student
    const [att] = await db.query(
      `SELECT s.user_id FROM attachments a
       JOIN students s ON a.student_id = s.student_id
       WHERE a.attachment_id = ?`,
      [attachment_id]
    );
    if (att.length) {
      await db.query(
        'INSERT INTO notifications (user_id, message) VALUES (?, ?)',
        [att[0].user_id, `Your supervisor has submitted an evaluation. Score: ${score}%`]
      );
    }

    res.status(201).json({ message: 'Evaluation submitted successfully!' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/supervisors/evaluations
router.get('/evaluations', protect, async (req, res) => {
  try {
    const [supervisor] = await db.query(
      'SELECT * FROM supervisors WHERE user_id = ?', [req.user.user_id]
    );
    if (!supervisor.length) return res.status(404).json({ message: 'Supervisor not found' });

    const [evaluations] = await db.query(
      `SELECT e.*, s.full_name as student_name, s.reg_number, o.org_name
       FROM evaluations e
       JOIN attachments a ON e.attachment_id = a.attachment_id
       JOIN students s ON a.student_id = s.student_id
       JOIN host_organizations o ON a.org_id = o.org_id
       WHERE e.supervisor_id = ?
       ORDER BY e.created_at DESC`,
      [supervisor[0].supervisor_id]
    );
    res.json(evaluations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;