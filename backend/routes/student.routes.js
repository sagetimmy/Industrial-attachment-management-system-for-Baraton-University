const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { requireRolePermission } = require('../utils/rolePermissions');
const supabase = require('../config/db');
const { notify } = require('../config/notify');
const multer = require('multer');
const path = require('path');

// ─── File Upload Setup (local for now) ───────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
  filename: (req, file, cb) =>
    cb(null, `doc-${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only PDF, DOC, DOCX, JPG, PNG files are allowed'));
  },
});

const normalizeDate = (value) => (value ? String(value).slice(0, 10) : '');

// GET /api/students/profile
router.get('/profile', protect, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select(`*, students!students_user_id_fkey (*)`)
      .eq('user_id', req.user.user_id)
      .single();

    if (error) throw error;

    const profile = { ...data, ...data.students?.[0] };
    delete profile.students;
    res.json(profile);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/students/organizations
router.get('/organizations', protect, async (req, res) => {
  try {
    console.log('Fetching approved organizations...');

    const { data, error } = await supabase
      .from('host_organizations')
      .select('org_id, org_name, location, contact_person, phone, available_slots, is_approved')
      .eq('is_approved', true)
      .order('org_name', { ascending: true });

    if (error) {
      console.error('Organizations fetch error:', error);
      throw error;
    }

    console.log('Approved organizations found:', data?.length || 0, data);
    res.json(data);
  } catch (err) {
    console.error('GET /organizations error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// POST /api/students/apply
router.post('/apply', protect, requireRolePermission('selfPlacement'), async (req, res) => {
  const { org_id, start_date, end_date } = req.body;
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const requestStart = Date.now();

  try {
    console.log(`[apply:${requestId}] request`, {
      org_id,
      start_date,
      end_date,
      user_id: req.user.user_id,
      ip: req.ip,
    });

    if (!org_id || !start_date || !end_date) {
      return res.status(400).json({ message: 'Organization ID, start date, and end date are required' });
    }

    const studentStart = Date.now();
    const { data: student, error: sErr } = await supabase
      .from('students')
      .select('student_id, full_name, reg_number')
      .eq('user_id', req.user.user_id)
      .single();
    console.log(`[apply:${requestId}] student lookup ${Date.now() - studentStart}ms`);

    if (sErr || !student) {
      console.error('Student lookup error:', sErr);
      return res.status(404).json({ message: 'Student not found' });
    }

    const existingStart = Date.now();
    const { data: existing } = await supabase
      .from('attachments')
      .select('attachment_id, org_id, start_date, end_date, status')
      .eq('student_id', student.student_id)
      .not('status', 'in', '("rejected","completed")')
      .maybeSingle();
    console.log(`[apply:${requestId}] existing attachment check ${Date.now() - existingStart}ms`);

    if (existing) {
      const sameOrg = String(existing.org_id) === String(org_id);
      const sameStart = normalizeDate(existing.start_date) === normalizeDate(start_date);
      const sameEnd = normalizeDate(existing.end_date) === normalizeDate(end_date);
      if (sameOrg && sameStart && sameEnd) {
        return res.status(200).json({
          message: 'Application already submitted.',
          attachment_id: existing.attachment_id,
          status: existing.status,
        });
      }
      return res.status(400).json({ message: 'You already have an active or pending application' });
    }

    console.log('Inserting attachment:', { student_id: student.student_id, org_id, start_date, end_date, status: 'pending' });

    const insertStart = Date.now();
    const { data: attachment, error } = await supabase
      .from('attachments')
      .insert({ student_id: student.student_id, org_id, start_date, end_date, status: 'pending' })
      .select()
      .single();
    console.log(`[apply:${requestId}] insert attachment ${Date.now() - insertStart}ms`);

    if (error) {
      console.error('Attachment insert error:', error);
      throw error;
    }

    console.log('Attachment created:', attachment);

    const orgStart = Date.now();
    const { data: org } = await supabase
      .from('host_organizations')
      .select('user_id, org_name')
      .eq('org_id', org_id)
      .single();
    console.log(`[apply:${requestId}] org lookup ${Date.now() - orgStart}ms`);

    if (org?.user_id) {
      const notifyStart = Date.now();
      await notify(
        org.user_id,
        `📥 New placement application from ${student.full_name || 'a student'} (${student.reg_number || 'N/A'})${org.org_name ? ` for ${org.org_name}` : ''}.`
      );
      console.log(`[apply:${requestId}] notify ${Date.now() - notifyStart}ms`);
    }

    console.log(`[apply:${requestId}] done ${Date.now() - requestStart}ms`);
    res.status(201).json({ message: 'Application submitted successfully!' });
  } catch (err) {
    console.error(`[apply:${requestId}] error`, err.stack || err);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/students/my-attachment
router.get('/my-attachment', protect, async (req, res) => {
  try {
    const { data: student, error: sErr } = await supabase
      .from('students')
      .select('student_id')
      .eq('user_id', req.user.user_id)
      .single();

    if (sErr || !student) return res.status(404).json({ message: 'Student not found' });

    const { data, error } = await supabase
      .from('attachments')
      .select(`
        *,
        host_organizations!attachments_org_id_fkey (org_name, location, contact_person, phone)
      `)
      .eq('student_id', student.student_id)
      .order('attachment_id', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (!data) return res.json(null);

    const result = {
      ...data,
      org_name: data.host_organizations?.org_name,
      location: data.host_organizations?.location,
      contact_person: data.host_organizations?.contact_person,
      org_phone: data.host_organizations?.phone,
      supervisor_name: null,
      supervisor_phone: null,
    };
    delete result.host_organizations;

    res.json(result);
  } catch (err) {
    console.error('GET /my-attachment error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// POST /api/students/logbook
router.post('/logbook', protect, requireRolePermission('editLogbooks'), upload.single('document'), async (req, res) => {
  const { week_number, description, tasks_done, challenges } = req.body;
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const requestStart = Date.now();
  try {
    console.log(`[logbook:${requestId}] request`, {
      week_number,
      user_id: req.user.user_id,
      ip: req.ip,
      file: req.file ? { name: req.file.originalname, size: req.file.size, type: req.file.mimetype } : null,
    });

    const studentStart = Date.now();
    const { data: student, error: sErr } = await supabase
      .from('students')
      .select('*')
      .eq('user_id', req.user.user_id)
      .single();
    console.log(`[logbook:${requestId}] student lookup ${Date.now() - studentStart}ms`);

    if (sErr || !student) return res.status(404).json({ message: 'Student not found' });

    const attachmentStart = Date.now();
    const { data: attachment, error: aErr } = await supabase
      .from('attachments')
      .select('attachment_id')
      .eq('student_id', student.student_id)
      .eq('status', 'ongoing')
      .maybeSingle();
    console.log(`[logbook:${requestId}] attachment lookup ${Date.now() - attachmentStart}ms`);

    if (aErr || !attachment) return res.status(400).json({ message: 'No active attachment found' });

    const existingStart = Date.now();
    const { data: existing } = await supabase
      .from('logbook_entries')
      .select('entry_id')
      .eq('attachment_id', attachment.attachment_id)
      .eq('week_number', week_number)
      .maybeSingle();
    console.log(`[logbook:${requestId}] existing entry check ${Date.now() - existingStart}ms`);

    if (existing) {
      return res.status(200).json({
        message: `Week ${week_number} entry already submitted.`,
        entry_id: existing.entry_id,
      });
    }

    if (!req.file) return res.status(400).json({ message: 'A document file is required for logbook submission' });

    const document_url = `/uploads/${req.file.filename}`;

    const insertStart = Date.now();
    const { error } = await supabase
      .from('logbook_entries')
      .insert({
        attachment_id: attachment.attachment_id,
        week_number,
        description,
        tasks_done: tasks_done || '',
        challenges: challenges || '',
        document_url,
      });
    console.log(`[logbook:${requestId}] insert entry ${Date.now() - insertStart}ms`);

    if (error) throw error;
    console.log(`[logbook:${requestId}] done ${Date.now() - requestStart}ms`);
    res.status(201).json({ message: 'Logbook entry submitted successfully!' });
  } catch (err) {
    console.error(`[logbook:${requestId}] error`, err.stack || err);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/students/logbook
router.get('/logbook', protect, async (req, res) => {
  try {
    const { data: student, error: sErr } = await supabase
      .from('students')
      .select('student_id')
      .eq('user_id', req.user.user_id)
      .single();

    if (sErr || !student) return res.status(404).json({ message: 'Student not found' });

    // Get the student's attachment first
    const { data: attachment, error: attachError } = await supabase
      .from('attachments')
      .select('attachment_id')
      .eq('student_id', student.student_id)
      .maybeSingle();

    if (attachError) throw attachError;

    // If no attachment, return empty array
    if (!attachment) return res.json([]);

    // Get logbook entries for this attachment
    const { data, error } = await supabase
      .from('logbook_entries')
      .select('*, supervisor_score, supervisor_feedback, reviewed_at, status')
      .eq('attachment_id', attachment.attachment_id)
      .order('week_number', { ascending: true });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('GET /logbook error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/students/feedback
router.get('/feedback', protect, async (req, res) => {
  try {
    const { data: student, error: sErr } = await supabase
      .from('students')
      .select('student_id')
      .eq('user_id', req.user.user_id)
      .single();

    if (sErr || !student) return res.status(404).json({ message: 'Student not found' });

    const { data, error } = await supabase
      .from('evaluations')
      .select(`
        *,
        attachments!evaluations_attachment_id_fkey (student_id),
        supervisors!evaluations_supervisor_id_fkey (full_name)
      `)
      .eq('attachments.student_id', student.student_id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const result = data.map(e => ({
      ...e,
      supervisor_name: e.supervisors?.full_name,
      supervisors: undefined,
      attachments: undefined,
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
