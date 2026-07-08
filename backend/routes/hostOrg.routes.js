const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect } = require('../middleware/auth.middleware');
const { getRolePermissions, requireRolePermission } = require('../utils/rolePermissions');
const supabase = require('../config/db');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB cap
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, or WEBP images are allowed'));
    }
    cb(null, true);
  },
});

// GET /api/host-orgs/dashboard
router.get('/dashboard', protect, async (req, res) => {
  try {
    const { data: org, error: orgError } = await supabase
      .from('host_organizations')
      .select('*')
      .eq('user_id', req.user.user_id)
      .single();

    if (orgError || !org) return res.status(404).json({ message: 'Organization not found' });

    // ✅ Fetch attachments without relational join (FK is integer, not UUID)
    const { data: attachments, error: appError } = await supabase
      .from('attachments')
      .select('attachment_id, status, start_date, end_date, student_id')
      .eq('org_id', org.org_id)
      .order('created_at', { ascending: false });

    if (appError) throw appError;

    // ✅ Fetch student details separately
    const studentIds = (attachments || []).map(a => a.student_id).filter(Boolean);
    let studentMap = {};
    if (studentIds.length) {
      const { data: students, error: stuError } = await supabase
        .from('students')
        .select('student_id, full_name, reg_number, department, year_of_study, phone')
        .in('student_id', studentIds);
      if (stuError) throw stuError;
      students.forEach(s => { studentMap[s.student_id] = s; });
    }

    // Flatten student fields onto each attachment
    const flat = (attachments || []).map(a => ({
      ...a,
      ...(studentMap[a.student_id] || {}),
    }));

    const permissions = await getRolePermissions(req.user.role);
    const stats = permissions.viewAnalytics === false
      ? null
      : {
          total:     flat.length,
          pending:   flat.filter(a => a.status === 'pending').length,
          ongoing:   flat.filter(a => a.status === 'ongoing').length,
          completed: flat.filter(a => a.status === 'completed').length,
        };

    res.json({ org, applications: flat, stats, permissions });
  } catch (err) {
    console.error('GET /host-orgs/dashboard error:', err);
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/host-orgs/profile
router.put('/profile', protect, requireRolePermission('editOrgProfile'), async (req, res) => {
  const { org_name, location, contact_person, phone, available_slots } = req.body;

  if (!org_name || !location || !contact_person || !phone)
    return res.status(400).json({ message: 'All fields are required' });

  if (available_slots < 0)
    return res.status(400).json({ message: 'Available slots cannot be negative' });

  try {
    const { error } = await supabase
      .from('host_organizations')
      .update({ org_name, location, contact_person, phone, available_slots })
      .eq('user_id', req.user.user_id);

    if (error) throw error;
    res.json({ message: 'Profile updated successfully!' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/host-orgs/logo  (multipart/form-data, field name "logo")
router.post('/logo', protect, requireRolePermission('editOrgProfile'), upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { data: org, error: orgError } = await supabase
      .from('host_organizations')
      .select('org_id')
      .eq('user_id', req.user.user_id)
      .single();

    if (orgError || !org) return res.status(404).json({ message: 'Organization not found' });

    const ext = req.file.mimetype === 'image/png' ? 'png' : 'jpg';
    const filePath = `${org.org_id}/logo.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('org-logos')
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true, // overwrite previous logo
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return res.status(500).json({ message: 'Failed to upload logo' });
    }

    const { data: publicUrlData } = supabase.storage
      .from('org-logos')
      .getPublicUrl(filePath);

    // cache-bust so the new logo shows immediately instead of a cached old one
    const logoUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

    const { error: dbError } = await supabase
      .from('host_organizations')
      .update({ org_logo_url: logoUrl })
      .eq('org_id', org.org_id);

    if (dbError) {
      console.error('DB update error:', dbError);
      return res.status(500).json({ message: 'Logo uploaded but failed to save reference' });
    }

    res.json({ org_logo_url: logoUrl });
  } catch (err) {
    console.error('Logo upload error:', err.message);
    res.status(500).json({ message: 'Something went wrong uploading the logo' });
  }
});

// GET /api/host-orgs/available-slots
router.get('/available-slots', protect, async (req, res) => {
  try {
    const { data: org, error: orgError } = await supabase
      .from('host_organizations')
      .select('org_id, available_slots')
      .eq('user_id', req.user.user_id)
      .single();

    if (orgError || !org) return res.status(404).json({ message: 'Organization not found' });

    const { count, error: countError } = await supabase
      .from('attachments')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', org.org_id)
      .eq('status', 'ongoing');

    if (countError) throw countError;

    const usedSlots = count || 0;
    res.json({
      available_slots:  org.available_slots,
      used_slots:       usedSlots,
      total_capacity:   (org.available_slots || 0) + usedSlots,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/host-orgs/intern/:attachmentId
// Full detail for a single (ongoing/completed) attachment: student info,
// assigned supervisor info, and any existing evaluation. Used by the
// InternDetail screen.
router.get('/intern/:attachmentId', protect, async (req, res) => {
  const { attachmentId } = req.params;

  try {
    const { data: org, error: orgError } = await supabase
      .from('host_organizations')
      .select('org_id')
      .eq('user_id', req.user.user_id)
      .single();

    if (orgError || !org) return res.status(404).json({ message: 'Organization not found' });

    const { data: attachment, error: attachError } = await supabase
      .from('attachments')
      .select('attachment_id, status, start_date, end_date, student_id, supervisor_id, org_id')
      .eq('attachment_id', attachmentId)
      .single();

    if (attachError || !attachment)
      return res.status(404).json({ message: 'Attachment not found' });

    if (attachment.org_id !== org.org_id)
      return res.status(403).json({ message: 'Not authorized to view this attachment' });

    // Student details (same select shape already used elsewhere in this file)
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('student_id, full_name, reg_number, department, year_of_study, phone')
      .eq('student_id', attachment.student_id)
      .single();

    if (studentError) throw studentError;

    // Assigned supervisor (may be null if not yet assigned)
    let supervisor = null;
    if (attachment.supervisor_id) {
      const { data: sup, error: supError } = await supabase
        .from('supervisors')
        .select('supervisor_id, full_name, phone, department, user_id')
        .eq('supervisor_id', attachment.supervisor_id)
        .maybeSingle();
      if (supError) throw supError;
      supervisor = sup || null;
    }

    // Existing evaluation, if any
    const { data: evaluation, error: evalError } = await supabase
      .from('evaluations')
      .select('rating, comments, created_at')
      .eq('attachment_id', attachment.attachment_id)
      .maybeSingle();

    if (evalError) throw evalError;

    res.json({
      attachment: {
        attachment_id: attachment.attachment_id,
        status: attachment.status,
        start_date: attachment.start_date,
        end_date: attachment.end_date,
      },
      student,
      supervisor,
      evaluation: evaluation || null,
    });
  } catch (err) {
    console.error('GET /host-orgs/intern/:attachmentId error:', err);
    res.status(500).json({ message: err.message });
  }
});

// POST /api/host-orgs/evaluate/:attachmentId
router.post('/evaluate/:attachmentId', protect, async (req, res) => {
  const { rating, comments } = req.body;
  const { attachmentId } = req.params;

  if (!rating || rating < 1 || rating > 5)
    return res.status(400).json({ message: 'Rating must be between 1 and 5' });

  if (!comments || comments.trim().length === 0)
    return res.status(400).json({ message: 'Comments are required' });

  try {
    // Verify attachment belongs to this org via org_id lookup
    const { data: org, error: orgError } = await supabase
      .from('host_organizations')
      .select('org_id')
      .eq('user_id', req.user.user_id)
      .single();

    if (orgError || !org) return res.status(404).json({ message: 'Organization not found' });

    const { data: attachment, error: attachError } = await supabase
      .from('attachments')
      .select('attachment_id, status, student_id, supervisor_id')
      .eq('attachment_id', attachmentId)
      .eq('org_id', org.org_id)
      .single();

    if (attachError || !attachment)
      return res.status(404).json({ message: 'Attachment not found or not authorized' });

    if (!['ongoing', 'completed'].includes(attachment.status))
      return res.status(400).json({ message: 'Can only evaluate active or completed attachments' });

    // Check if evaluation already exists
    const { data: existing } = await supabase
      .from('evaluations')
      .select('evaluation_id')
      .eq('attachment_id', attachmentId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('evaluations')
        .update({ rating, comments, created_at: new Date().toISOString() })
        .eq('attachment_id', attachmentId);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('evaluations')
        .insert({
          attachment_id: attachmentId,
          supervisor_id: attachment.supervisor_id || null,
          rating,
          comments,
        });
      if (error) throw error;
    }

    // Notify the assigned supervisor, if there is one. This is best-effort:
    // if it fails, the evaluation itself has already succeeded, so we log
    // and move on rather than failing the whole request.
    if (attachment.supervisor_id) {
      try {
        const { data: supervisor } = await supabase
          .from('supervisors')
          .select('user_id')
          .eq('supervisor_id', attachment.supervisor_id)
          .maybeSingle();

        if (supervisor?.user_id) {
          const { data: student } = await supabase
            .from('students')
            .select('full_name')
            .eq('student_id', attachment.student_id)
            .maybeSingle();

          const studentName = student?.full_name || 'your student';

          await supabase.from('notifications').insert({
            user_id: supervisor.user_id,
            message: `📊 New performance evaluation submitted for ${studentName} — Rating: ${rating}/5`,
            is_read: false,
          });
        }
      } catch (notifyErr) {
        console.error('Failed to notify supervisor of evaluation:', notifyErr.message);
      }
    }

    return existing
      ? res.json({ message: 'Evaluation updated successfully!' })
      : res.json({ message: 'Evaluation submitted successfully!' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/host-orgs/ongoing-attachments
router.get('/ongoing-attachments', protect, async (req, res) => {
  try {
    const { data: org, error: orgError } = await supabase
      .from('host_organizations')
      .select('org_id')
      .eq('user_id', req.user.user_id)
      .single();

    if (orgError || !org) return res.status(404).json({ message: 'Organization not found' });

    // ✅ Fetch attachments without relational join
    const { data: attachments, error } = await supabase
      .from('attachments')
      .select('attachment_id, status, start_date, student_id')
      .eq('org_id', org.org_id)
      .in('status', ['ongoing', 'completed'])
      .order('status', { ascending: false })
      .order('start_date', { ascending: false });

    if (error) throw error;

    // ✅ Fetch students separately
    const studentIds = (attachments || []).map(a => a.student_id).filter(Boolean);
    let studentMap = {};
    if (studentIds.length) {
      const { data: students } = await supabase
        .from('students')
        .select('student_id, full_name, reg_number, department')
        .in('student_id', studentIds);
      (students || []).forEach(s => { studentMap[s.student_id] = s; });
    }

    // ✅ Fetch evaluations separately
    const attachmentIds = (attachments || []).map(a => a.attachment_id).filter(Boolean);
    let evalMap = {};
    if (attachmentIds.length) {
      const { data: evaluations } = await supabase
        .from('evaluations')
        .select('attachment_id, rating, comments, created_at')
        .in('attachment_id', attachmentIds);
      (evaluations || []).forEach(e => { evalMap[e.attachment_id] = e; });
    }

    const flat = (attachments || []).map(a => ({
      ...a,
      ...(studentMap[a.student_id] || {}),
      rating:       evalMap[a.attachment_id]?.rating      || null,
      comments:     evalMap[a.attachment_id]?.comments    || null,
      evaluated_at: evalMap[a.attachment_id]?.created_at  || null,
    }));

    res.json(flat);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/host-orgs/application/:attachmentId
router.put('/application/:attachmentId', protect, async (req, res) => {
  const { attachmentId } = req.params;
  const { status } = req.body;

  if (!status || !['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Status must be either "approved" or "rejected"' });
  }

  try {
    console.log('PUT /application/:attachmentId received:', { attachmentId, status, user_id: req.user.user_id });

    // Look up the org for this user
    const { data: org, error: orgError } = await supabase
      .from('host_organizations')
      .select('org_id')
      .eq('user_id', req.user.user_id)
      .single();

    if (orgError || !org) return res.status(404).json({ message: 'Organization not found' });

    // Verify attachment belongs to this org
    const { data: attachment, error: attachError } = await supabase
      .from('attachments')
      .select('attachment_id, org_id')
      .eq('attachment_id', attachmentId)
      .single();

    if (attachError || !attachment) {
      console.error('Attachment lookup error:', attachError);
      return res.status(404).json({ message: 'Attachment not found' });
    }

    if (attachment.org_id !== org.org_id) {
      return res.status(403).json({ message: 'Not authorized to update this application' });
    }

    const { error: updateError } = await supabase
      .from('attachments')
      .update({ status })
      .eq('attachment_id', attachmentId);

    if (updateError) {
      console.error('Attachment update error:', updateError);
      throw updateError;
    }

    console.log('Application updated successfully:', { attachmentId, status });
    res.json({ message: `Application ${status} successfully!` });
  } catch (err) {
    console.error('PUT /application error:', err);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/host-orgs/vacancies
router.get('/vacancies', protect, async (req, res) => {
  try {
    const { data: org, error: orgError } = await supabase
      .from('host_organizations')
      .select('org_id')
      .eq('user_id', req.user.user_id)
      .single();

    if (orgError || !org) return res.status(404).json({ message: 'Organization not found' });

    const { data: vacancies, error } = await supabase
      .from('vacancies')
      .select('*')
      .eq('org_id', org.org_id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(vacancies || []);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/host-orgs/vacancies
router.post('/vacancies', protect, requireRolePermission('postPlacements'), async (req, res) => {
  try {
    const { role_title, department, available_slots, application_deadline, description, requirements } = req.body;

    console.log('POST /vacancies received:', { role_title, department, available_slots, application_deadline, description, requirements });

    if (!role_title || !department || !available_slots || !application_deadline || !description)
      return res.status(400).json({ message: 'All fields are required' });

    if (available_slots < 1)
      return res.status(400).json({ message: 'Must have at least 1 available slot' });

    if (!Array.isArray(requirements) || requirements.length === 0)
      return res.status(400).json({ message: 'At least one requirement is required' });

    const { data: org, error: orgError } = await supabase
      .from('host_organizations')
      .select('org_id')
      .eq('user_id', req.user.user_id)
      .single();

    if (orgError || !org) {
      console.error('Organization lookup error:', orgError);
      return res.status(404).json({ message: 'Organization not found' });
    }

    // Parse deadline from mm/dd/yyyy to YYYY-MM-DD
    let parsedDeadline = application_deadline;
    if (typeof application_deadline === 'string' && application_deadline.includes('/')) {
      const [month, day, year] = application_deadline.split('/');
      parsedDeadline = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    console.log('Parsed deadline:', parsedDeadline);

    const { data: vacancy, error } = await supabase
      .from('vacancies')
      .insert({
        org_id: org.org_id,
        role_title,
        department,
        available_slots,
        application_deadline: parsedDeadline,
        description,
        requirements,
        status: 'open',
      })
      .select()
      .single();

    if (error) {
      console.error('Database error inserting vacancy:', error);
      throw error;
    }

    console.log('Vacancy created successfully:', vacancy);
    res.status(201).json({ message: 'Vacancy posted successfully!', vacancy });
  } catch (err) {
    console.error('POST /vacancies error:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;