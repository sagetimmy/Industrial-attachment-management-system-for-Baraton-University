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

// ─── GET /api/students/active-session ────────────────────────────────────────
// Returns the currently ACTIVE attachment session or null.
// Used by the student dashboard to gate attachment-related features.
router.get('/active-session', protect, async (req, res) => {
  try {
    const { data: session, error } = await supabase
      .from('attachment_sessions')
      .select('id, name, start_date, end_date, status')
      .eq('status', 'ACTIVE')
      .maybeSingle();

    if (error) throw error;

    if (!session) {
      return res.json({ active: false, session: null });
    }

    res.json({ active: true, session });
  } catch (err) {
    console.error('GET /active-session error:', err.message);
    res.status(500).json({ message: 'Failed to check active session.' });
  }
});

// ─── GET /api/students/profile ──────────────────────────────────────────────
router.get('/profile', protect, async (req, res) => {
  try {
    console.log('👤 Getting profile for user_id:', req.user.user_id);

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('user_id, email, role, is_verified, created_at')
      .eq('user_id', req.user.user_id)
      .single();

    if (userError) {
      console.error('❌ User query error:', userError);
      return res.status(500).json({ message: 'User not found' });
    }

    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('user_id', req.user.user_id)
      .maybeSingle();

    if (studentError) {
      console.error('❌ Student query error:', studentError);
    }

    const profile = {
      ...userData,
      ...(studentData || {})
    };

    console.log('✅ Profile fetched successfully');
    res.json(profile);
  } catch (err) {
    console.error('❌ GET /profile error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/students/organizations ────────────────────────────────────────
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

    console.log('Approved organizations found:', data?.length || 0);
    res.json(data || []);
  } catch (err) {
    console.error('GET /organizations error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ─── POST /api/students/apply ──────────────────────────────────────────────
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
    });

    if (!org_id || !start_date || !end_date) {
      return res.status(400).json({ message: 'Organization ID, start date, and end date are required' });
    }

    // Check for an active session before allowing application
    const { data: activeSession } = await supabase
      .from('attachment_sessions')
      .select('id')
      .eq('status', 'ACTIVE')
      .maybeSingle();

    if (!activeSession) {
      return res.status(403).json({
        message: 'Applications are currently closed. No active attachment session.',
      });
    }

    const { data: student, error: sErr } = await supabase
      .from('students')
      .select('student_id, full_name, reg_number')
      .eq('user_id', req.user.user_id)
      .single();

    if (sErr || !student) {
      console.error('Student lookup error:', sErr);
      return res.status(404).json({ message: 'Student not found' });
    }

    const { data: existing } = await supabase
      .from('attachments')
      .select('attachment_id, org_id, start_date, end_date, status')
      .eq('student_id', student.student_id)
      .not('status', 'in', '("rejected","completed")')
      .maybeSingle();

    if (existing) {
      const sameOrg   = String(existing.org_id)    === String(org_id);
      const sameStart = normalizeDate(existing.start_date) === normalizeDate(start_date);
      const sameEnd   = normalizeDate(existing.end_date)   === normalizeDate(end_date);
      if (sameOrg && sameStart && sameEnd) {
        return res.status(200).json({
          message: 'Application already submitted.',
          attachment_id: existing.attachment_id,
          status: existing.status,
        });
      }
      return res.status(400).json({ message: 'You already have an active or pending application' });
    }

    const { data: attachment, error } = await supabase
      .from('attachments')
      .insert({
        student_id: student.student_id,
        org_id,
        start_date,
        end_date,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Attachment insert error:', error);
      throw error;
    }

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

    console.log(`[apply:${requestId}] done ${Date.now() - requestStart}ms`);
    res.status(201).json({
      message: 'Application submitted successfully!',
      attachment_id: attachment.attachment_id
    });
  } catch (err) {
    console.error(`[apply:${requestId}] error`, err.stack || err);
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/students/my-attachment ────────────────────────────────────────
router.get('/my-attachment', protect, async (req, res) => {
  try {
    console.log('📎 Fetching attachment for user_id:', req.user.user_id);

    const { data: student, error: sErr } = await supabase
      .from('students')
      .select('student_id')
      .eq('user_id', req.user.user_id)
      .single();

    if (sErr || !student) {
      console.log('Student not found');
      return res.json(null);
    }

    const { data: attachment, error: attachError } = await supabase
      .from('attachments')
      .select('*')
      .eq('student_id', student.student_id)
      .order('attachment_id', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (attachError) {
      console.error('Attachment query error:', attachError);
      return res.json(null);
    }

    if (!attachment) {
      return res.json(null);
    }

    const { data: orgData, error: orgError } = await supabase
      .from('host_organizations')
      .select('org_name, location, contact_person, phone')
      .eq('org_id', attachment.org_id)
      .maybeSingle();

    if (orgError) {
      console.error('Organization query error:', orgError);
    }

    // ── Supervisor lookup ────────────────────────────────────────────────
    // Previously this was hardcoded to null — the assignment (via
    // PUT /admin/assign-supervisor) writes attachment.supervisor_id, but
    // this route never looked it up against the supervisors table.
    let supervisor_name = null;
    let supervisor_phone = null;

    if (attachment.supervisor_id) {
      const { data: supervisorData, error: supervisorError } = await supabase
        .from('supervisors')
        .select('full_name, phone')
        .eq('supervisor_id', attachment.supervisor_id)
        .maybeSingle();

      if (supervisorError) {
        console.error('Supervisor query error:', supervisorError);
      } else if (supervisorData) {
        supervisor_name = supervisorData.full_name || null;
        supervisor_phone = supervisorData.phone || null;
      }
    }

    const result = {
      ...attachment,
      org_name:        orgData?.org_name        || null,
      location:        orgData?.location        || null,
      contact_person:  orgData?.contact_person  || null,
      org_phone:       orgData?.phone           || null,
      supervisor_name,
      supervisor_phone,
    };

    console.log('✅ Attachment found:', attachment.attachment_id);
    res.json(result);
  } catch (err) {
    console.error('GET /my-attachment error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ─── POST /api/students/logbook ─────────────────────────────────────────────
router.post('/logbook', protect, requireRolePermission('editLogbooks'), upload.single('document'), async (req, res) => {
  const { week_number, description, tasks_done, challenges } = req.body;
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const requestStart = Date.now();

  try {
    console.log(`[logbook:${requestId}] request`, {
      week_number,
      user_id: req.user.user_id,
      file: req.file ? { name: req.file.originalname, size: req.file.size } : null,
    });

    // Check for an active session before allowing logbook submission
    const { data: activeSession } = await supabase
      .from('attachment_sessions')
      .select('id')
      .eq('status', 'ACTIVE')
      .maybeSingle();

    if (!activeSession) {
      return res.status(403).json({
        message: 'Logbook submissions are closed. No active attachment session.',
      });
    }

    const { data: student, error: sErr } = await supabase
      .from('students')
      .select('*')
      .eq('user_id', req.user.user_id)
      .single();

    if (sErr || !student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const { data: attachment, error: aErr } = await supabase
      .from('attachments')
      .select('attachment_id')
      .eq('student_id', student.student_id)
      .eq('status', 'ongoing')
      .maybeSingle();

    if (aErr || !attachment) {
      return res.status(400).json({ message: 'No active attachment found' });
    }

    const { data: existing } = await supabase
      .from('logbook_entries')
      .select('entry_id')
      .eq('attachment_id', attachment.attachment_id)
      .eq('week_number', week_number)
      .maybeSingle();

    if (existing) {
      return res.status(200).json({
        message: `Week ${week_number} entry already submitted.`,
        entry_id: existing.entry_id,
      });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'A document file is required for logbook submission' });
    }

    const document_url = `/uploads/${req.file.filename}`;

    const { error } = await supabase
      .from('logbook_entries')
      .insert({
        attachment_id: attachment.attachment_id,
        week_number,
        description,
        tasks_done:   tasks_done || '',
        challenges:   challenges || '',
        document_url,
        status: 'submitted'
      });

    if (error) throw error;

    console.log(`[logbook:${requestId}] done ${Date.now() - requestStart}ms`);
    res.status(201).json({ message: 'Logbook entry submitted successfully!' });
  } catch (err) {
    console.error(`[logbook:${requestId}] error`, err.stack || err);
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/students/logbook ──────────────────────────────────────────────
router.get('/logbook', protect, async (req, res) => {
  try {
    console.log('📓 Fetching logbook for user_id:', req.user.user_id);

    const { data: student, error: sErr } = await supabase
      .from('students')
      .select('student_id')
      .eq('user_id', req.user.user_id)
      .single();

    if (sErr || !student) {
      console.log('Student not found');
      return res.json([]);
    }

    const { data: attachment, error: attachError } = await supabase
      .from('attachments')
      .select('attachment_id')
      .eq('student_id', student.student_id)
      .order('attachment_id', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (attachError) {
      console.error('Attachment query error:', attachError);
      return res.json([]);
    }

    if (!attachment) {
      console.log('No attachment found');
      return res.json([]);
    }

    const { data, error } = await supabase
      .from('logbook_entries')
      .select('*')
      .eq('attachment_id', attachment.attachment_id)
      .order('week_number', { ascending: true });

    if (error) {
      console.error('Logbook query error:', error);
      return res.json([]);
    }

    console.log('✅ Logbook entries found:', data?.length || 0);
    res.json(data || []);
  } catch (err) {
    console.error('GET /logbook error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/students/feedback ─────────────────────────────────────────────
router.get('/feedback', protect, async (req, res) => {
  try {
    console.log('⭐ Fetching feedback for user_id:', req.user.user_id);

    const { data: student, error: sErr } = await supabase
      .from('students')
      .select('student_id')
      .eq('user_id', req.user.user_id)
      .single();

    if (sErr || !student) {
      console.log('Student not found');
      return res.json([]);
    }

    const { data: attachments, error: attachError } = await supabase
      .from('attachments')
      .select('attachment_id')
      .eq('student_id', student.student_id);

    if (attachError || !attachments || attachments.length === 0) {
      console.log('No attachments found');
      return res.json([]);
    }

    const attachmentIds = attachments.map(a => a.attachment_id);

    const { data, error } = await supabase
      .from('evaluations')
      .select(`
        evaluation_id,
        attachment_id,
        supervisor_id,
        score,
        comments,
        eval_date,
        created_at
      `)
      .in('attachment_id', attachmentIds)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Feedback query error:', error);
      return res.json([]);
    }

    if (!data || data.length === 0) {
      return res.json([]);
    }

    const supervisorIds = [...new Set(data.map(e => e.supervisor_id).filter(id => id))];
    let supervisorMap = {};

    if (supervisorIds.length > 0) {
      const { data: supervisors, error: supError } = await supabase
        .from('supervisors')
        .select('supervisor_id, full_name')
        .in('supervisor_id', supervisorIds);

      if (!supError && supervisors) {
        supervisorMap = supervisors.reduce((acc, s) => {
          acc[s.supervisor_id] = s.full_name;
          return acc;
        }, {});
      }
    }

    const result = data.map(e => ({
      ...e,
      supervisor_name: supervisorMap[e.supervisor_id] || 'Unknown'
    }));

    console.log('✅ Feedback entries found:', result.length);
    res.json(result);
  } catch (err) {
    console.error('GET /feedback error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;