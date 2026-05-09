const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const db = require('../config/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

// File upload setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) =>
    cb(null, `doc-${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only PDF, DOC, DOCX, JPG, PNG files are allowed'));
  },
});

// GET /api/students/profile
router.get('/profile', protect, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT u.user_id, u.email, u.role, s.*
       FROM users u JOIN students s ON u.user_id = s.user_id
       WHERE u.user_id = ?`,
      [req.user.user_id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/students/organizations
router.get('/organizations', protect, async (req, res) => {
  try {
    const [orgs] = await db.query(
      `SELECT org_id, org_name, location, contact_person, phone, available_slots
       FROM host_organizations
       WHERE is_approved = TRUE AND available_slots > 0
       ORDER BY org_name ASC`
    );
    res.json(orgs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/students/apply
router.post('/apply', protect, async (req, res) => {
  const { org_id, start_date, end_date } = req.body;
  try {
    const [student] = await db.query(
      'SELECT * FROM students WHERE user_id = ?', [req.user.user_id]
    );
    if (!student.length) return res.status(404).json({ message: 'Student not found' });

    const [existing] = await db.query(
      `SELECT * FROM attachments WHERE student_id = ? AND status NOT IN ('rejected','completed')`,
      [student[0].student_id]
    );
    if (existing.length) return res.status(400).json({ message: 'You already have an active or pending application' });

    await db.query(
      'INSERT INTO attachments (student_id, org_id, start_date, end_date, status) VALUES (?,?,?,?,?)',
      [student[0].student_id, org_id, start_date, end_date, 'pending']
    );
    res.status(201).json({ message: 'Application submitted successfully!' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/students/my-attachment
router.get('/my-attachment', protect, async (req, res) => {
  try {
    const [student] = await db.query(
      'SELECT * FROM students WHERE user_id = ?', [req.user.user_id]
    );
    if (!student.length) return res.status(404).json({ message: 'Student not found' });

    const [attachment] = await db.query(
      `SELECT a.*, o.org_name, o.location, o.contact_person, o.phone as org_phone,
              sv.full_name as supervisor_name, sv.phone as supervisor_phone
       FROM attachments a
       JOIN host_organizations o ON a.org_id = o.org_id
       LEFT JOIN supervisors sv ON a.supervisor_id = sv.supervisor_id
       WHERE a.student_id = ?
       ORDER BY a.created_at DESC LIMIT 1`,
      [student[0].student_id]
    );
    res.json(attachment[0] || null);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/students/logbook
router.post('/logbook', protect, upload.single('document'), async (req, res) => {
  const { week_number, description, tasks_done, challenges } = req.body;
  try {
    const [student] = await db.query(
      'SELECT * FROM students WHERE user_id = ?', [req.user.user_id]
    );
    if (!student.length) return res.status(404).json({ message: 'Student not found' });

    const [attachment] = await db.query(
      `SELECT * FROM attachments WHERE student_id = ? AND status = 'ongoing'`,
      [student[0].student_id]
    );
    if (!attachment.length) return res.status(400).json({ message: 'No active attachment found' });

    // Check if entry for this week already exists
    const [existing] = await db.query(
      'SELECT * FROM logbook_entries WHERE attachment_id = ? AND week_number = ?',
      [attachment[0].attachment_id, week_number]
    );
    if (existing.length) return res.status(400).json({ message: `Week ${week_number} entry already submitted` });

    // Validate file upload
    if (!req.file) {
      return res.status(400).json({ message: 'A document file is required for logbook submission' });
    }

    const document_url = `/uploads/${req.file.filename}`;

    await db.query(
      'INSERT INTO logbook_entries (attachment_id, week_number, description, tasks_done, challenges, document_url) VALUES (?,?,?,?,?,?)',
      [attachment[0].attachment_id, week_number, description, tasks_done || '', challenges || '', document_url]
    );

    res.status(201).json({ message: 'Logbook entry submitted successfully!' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/students/logbook
router.get('/logbook', protect, async (req, res) => {
  try {
    const [student] = await db.query(
      'SELECT * FROM students WHERE user_id = ?', [req.user.user_id]
    );
    if (!student.length) return res.status(404).json({ message: 'Student not found' });

    const [entries] = await db.query(
      `SELECT l.* FROM logbook_entries l
       JOIN attachments a ON l.attachment_id = a.attachment_id
       WHERE a.student_id = ?
       ORDER BY l.week_number ASC`,
      [student[0].student_id]
    );
    res.json(entries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/students/feedback
router.get('/feedback', protect, async (req, res) => {
  try {
    const [student] = await db.query(
      'SELECT * FROM students WHERE user_id = ?', [req.user.user_id]
    );
    if (!student.length) return res.status(404).json({ message: 'Student not found' });

    const [feedback] = await db.query(
      `SELECT e.*, sv.full_name as supervisor_name
       FROM evaluations e
       JOIN attachments a ON e.attachment_id = a.attachment_id
       JOIN supervisors sv ON e.supervisor_id = sv.supervisor_id
       WHERE a.student_id = ?
       ORDER BY e.created_at DESC`,
      [student[0].student_id]
    );
    res.json(feedback);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
