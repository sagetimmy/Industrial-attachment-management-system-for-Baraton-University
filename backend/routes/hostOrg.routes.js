const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const db = require('../config/db');

// GET /api/host-orgs/dashboard
router.get('/dashboard', protect, async (req, res) => {
  try {
    // Get org info
    const [org] = await db.query(
      'SELECT * FROM host_organizations WHERE user_id = ?',
      [req.user.user_id]
    );

    if (!org.length) return res.status(404).json({ message: 'Organization not found' });

    const orgId = org[0].org_id;

    // Get placement applications
    const [applications] = await db.query(
      `SELECT a.attachment_id, a.status, a.start_date, a.end_date,
              s.full_name, s.reg_number, s.department, s.year_of_study, s.phone
       FROM attachments a
       JOIN students s ON a.student_id = s.student_id
       WHERE a.org_id = ?
       ORDER BY a.created_at DESC`,
      [orgId]
    );

    // Stats
    const total = applications.length;
    const pending = applications.filter(a => a.status === 'pending').length;
    const ongoing = applications.filter(a => a.status === 'ongoing').length;
    const completed = applications.filter(a => a.status === 'completed').length;

    res.json({
      org: org[0],
      applications,
      stats: { total, pending, ongoing, completed },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/host-orgs/application/:id
router.put('/application/:id', protect, async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['pending', 'ongoing', 'rejected', 'completed'];

  try {
    // Validate status
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    // If accepting, check available slots
    if (status === 'ongoing') {
      // Get the attachment
      const [rows] = await db.query(
        'SELECT a.*, ho.available_slots FROM attachments a JOIN host_organizations ho ON a.org_id = ho.org_id WHERE a.attachment_id = ?',
        [req.params.id]
      );

      const attachment = rows[0];
      if (!attachment) {
        return res.status(404).json({ message: 'Attachment not found' });
      }

      // Check slots available
      if (attachment.available_slots <= 0) {
        return res.status(400).json({ message: 'No available slots. Please increase available slots in your profile.' });
      }

      // Start transaction: Update attachment AND decrement slots
      const conn = await db.getConnection();
      
      try {
        await conn.beginTransaction();
        
        // Update attachment status
        await conn.query(
          'UPDATE attachments SET status = ? WHERE attachment_id = ?',
          [status, req.params.id]
        );

        // Decrement available slots
        await conn.query(
          'UPDATE host_organizations SET available_slots = available_slots - 1 WHERE org_id = ?',
          [attachment.org_id]
        );

        await conn.commit();
        res.json({ message: 'Application accepted successfully! Available slots decremented.' });
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }
    } else {
      // For reject/completed, just update status
      await db.query(
        'UPDATE attachments SET status = ? WHERE attachment_id = ?',
        [status, req.params.id]
      );

      res.json({ message: `Application ${status} successfully!` });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/host-orgs/profile
router.put('/profile', protect, async (req, res) => {
  const { org_name, location, contact_person, phone, available_slots } = req.body;
  try {
    // Validate inputs
    if (!org_name || !location || !contact_person || !phone) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (available_slots < 0) {
      return res.status(400).json({ message: 'Available slots cannot be negative' });
    }

    await db.query(
      `UPDATE host_organizations 
       SET org_name = ?, location = ?, contact_person = ?, phone = ?, available_slots = ?
       WHERE user_id = ?`,
      [org_name, location, contact_person, phone, available_slots, req.user.user_id]
    );
    res.json({ message: 'Profile updated successfully!' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/host-orgs/available-slots
router.get('/available-slots', protect, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT org_id, available_slots FROM host_organizations WHERE user_id = ?',
      [req.user.user_id]
    );

    const org = rows[0];
    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    // Get count of ongoing attachments
    const [countRows] = await db.query(
      'SELECT COUNT(*) as count FROM attachments WHERE org_id = ? AND status = "ongoing"',
      [org.org_id]
    );

    const usedSlots = countRows[0]?.count || 0;
    res.json({
      available_slots: org.available_slots,
      used_slots: usedSlots,
      total_capacity: (org.available_slots || 0) + usedSlots,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/host-orgs/evaluate/:attachmentId
router.post('/evaluate/:attachmentId', protect, async (req, res) => {
  const { rating, comments } = req.body;

  try {
    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    if (!comments || comments.trim().length === 0) {
      return res.status(400).json({ message: 'Comments are required' });
    }

    // Check if attachment exists and belongs to this org
    const [attachmentRows] = await db.query(
      `SELECT a.attachment_id, a.org_id, a.status, ho.user_id
       FROM attachments a
       JOIN host_organizations ho ON a.org_id = ho.org_id
       WHERE a.attachment_id = ? AND ho.user_id = ?`,
      [req.params.attachmentId, req.user.user_id]
    );

    const attachment = attachmentRows[0];
    if (!attachment) {
      return res.status(404).json({ message: 'Attachment not found or not authorized' });
    }

    // Can only evaluate ongoing or completed attachments
    if (!['ongoing', 'completed'].includes(attachment.status)) {
      return res.status(400).json({ message: 'Can only evaluate active or completed attachments' });
    }

    // Check if evaluation already exists
    const [evalRows] = await db.query(
      'SELECT evaluation_id FROM evaluations WHERE attachment_id = ?',
      [req.params.attachmentId]
    );

    const existing = evalRows[0];
    if (existing) {
      // Update existing evaluation
      await db.query(
        'UPDATE evaluations SET rating = ?, comments = ?, created_at = NOW() WHERE attachment_id = ?',
        [rating, comments, req.params.attachmentId]
      );
      res.json({ message: 'Evaluation updated successfully!' });
    } else {
      // Create new evaluation (note: typically supervisor evaluates, but host can too)
      await db.query(
        'INSERT INTO evaluations (attachment_id, supervisor_id, rating, comments, created_at) VALUES (?, NULL, ?, ?, NOW())',
        [req.params.attachmentId, rating, comments]
      );
      res.json({ message: 'Evaluation submitted successfully!' });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/host-orgs/ongoing-attachments
router.get('/ongoing-attachments', protect, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT org_id FROM host_organizations WHERE user_id = ?',
      [req.user.user_id]
    );

    const org = rows[0];
    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    const [attachments] = await db.query(
      `SELECT a.attachment_id, a.status, s.full_name, s.reg_number, s.department,
              e.rating, e.comments, e.created_at as evaluated_at
       FROM attachments a
       JOIN students s ON a.student_id = s.student_id
       LEFT JOIN evaluations e ON a.attachment_id = e.attachment_id
       WHERE a.org_id = ? AND a.status IN ('ongoing', 'completed')
       ORDER BY a.status DESC, a.start_date DESC`,
      [org.org_id]
    );

    res.json(attachments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;