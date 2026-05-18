const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
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
    const { data, error } = await supabase
      .from('host_organizations')
      .select('org_id, org_name, location, contact_person, phone, available_slots')
      .eq('is_approved', true)
      .gt('available_slots', 0)
      .order('org_name', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/students/apply
router.post('/apply', protect, async (req, res) => {
  const { org_id, start_date, end_date } = req.body;
  try {
    const { data: student, error: sErr } = await supabase
      .from('students')
      .select('*')
      .eq('user_id', req.user.user_id)
      .single();

    if (sErr || !student) return res.status(404).json({ message: 'Student not found' });

    const { data: existing } = await supabase
      .from('attachments')
      .select('attachment_id')
      .eq('student_id', student.student_id)
      .not('status', 'in', '("rejected","completed")')
      .maybeSingle();

    if (existing) return res.status(400).json({ message: 'You already have an active or pending application' });

    const { error } = await supabase
      .from('attachments')
      .insert({ student_id: student.student_id, org_id, start_date, end_date, status: 'pending' });

    if (error) throw error;

    const { data: org } = await supabase
      .from('host_organizations')
      .select('user_id, org_name')
      .eq('org_id', org_id)
      .single();

    if (org?.user_id) {
      await notify(
        org.user_id,
        `📥 New placement application from ${student.full_name || 'a student'} (${student.reg_number || 'N/A'})${org.org_name ? ` for ${org.org_name}` : ''}.`
      );
    }

    res.status(201).json({ message: 'Application submitted successfully!' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/students/my-attachment
router.get('/my-attachment', protect, async (req, res) => {
  try {
    const { data: student, error: sErr } = await supabase
      .from('students')
      .select('*')
      .eq('user_id', req.user.user_id)
      .single();

    if (sErr || !student) return res.status(404).json({ message: 'Student not found' });

    const { data, error } = await supabase
      .from('attachments')
      .select(`
        *,
        host_organizations!attachments_org_id_fkey (org_name, location, contact_person, phone),
        supervisors!attachments_supervisor_id_fkey (full_name, phone)
      `)
      .eq('student_id', student.student_id)
      .order('created_at', { ascending: false })
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
      supervisor_name: data.supervisors?.full_name,
      supervisor_phone: data.supervisors?.phone,
    };
    delete result.host_organizations;
    delete result.supervisors;

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/students/logbook
router.post('/logbook', protect, upload.single('document'), async (req, res) => {
  const { week_number, description, tasks_done, challenges } = req.body;
  try {
    const { data: student, error: sErr } = await supabase
      .from('students')
      .select('*')
      .eq('user_id', req.user.user_id)
      .single();

    if (sErr || !student) return res.status(404).json({ message: 'Student not found' });

    const { data: attachment, error: aErr } = await supabase
      .from('attachments')
      .select('*')
      .eq('student_id', student.student_id)
      .eq('status', 'ongoing')
      .maybeSingle();

    if (aErr || !attachment) return res.status(400).json({ message: 'No active attachment found' });

    const { data: existing } = await supabase
      .from('logbook_entries')
      .select('entry_id')
      .eq('attachment_id', attachment.attachment_id)
      .eq('week_number', week_number)
      .maybeSingle();

    if (existing) return res.status(400).json({ message: `Week ${week_number} entry already submitted` });

    if (!req.file) return res.status(400).json({ message: 'A document file is required for logbook submission' });

    const document_url = `/uploads/${req.file.filename}`;

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

    if (error) throw error;
    res.status(201).json({ message: 'Logbook entry submitted successfully!' });
  } catch (err) {
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

    const { data, error } = await supabase
      .from('logbook_entries')
      .select(`*, attachments!logbook_entries_attachment_id_fkey (student_id)`)
      .eq('attachments.student_id', student.student_id)
      .order('week_number', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (err) {
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
