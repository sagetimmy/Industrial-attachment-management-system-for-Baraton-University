const express = require('express');
const router = express.Router();


const supabase = require('../config/db');
const { authenticateToken } = require('../middleware/auth.middleware');

const {
  generateStudentPerformancePDF,
  generateLogbookCompletionPDF,
  generateHostOrgFeedbackPDF,
} = require('../utils/pdfReportGenerator');

// All report routes require a logged-in supervisor
router.use(authenticateToken);

function streamPdf(res, doc, filename) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);
  doc.end();
}

/**
 * GET /supervisors/reports/student-performance
 * ⚠️ Adjust table/column names to match your actual schema.
 * Assumes: students table has supervisor_id FK, joins to users for name,
 * logbook_entries has supervisor_score + hours_worked.
 */
router.get('/student-performance', async (req, res) => {
  try {
    const supervisorId = req.user.user_id || req.user.id;

    const { data: students, error } = await supabase
      .from('students')
      .select(
        `
        student_id,
        status,
        users!inner ( name ),
        host_organizations ( name ),
        logbook_entries ( hours_worked, supervisor_score )
      `
      )
      .eq('supervisor_id', supervisorId);

    if (error) throw error;

    const rows = (students || []).map((s) => {
      const entries = s.logbook_entries || [];
      const totalHours = entries.reduce((sum, e) => sum + (Number(e.hours_worked) || 0), 0);
      const scored = entries.filter((e) => e.supervisor_score != null);
      const avgScore = scored.length
        ? Math.round(scored.reduce((sum, e) => sum + Number(e.supervisor_score), 0) / scored.length)
        : null;

      return {
        name: s.users?.name || 'Unknown',
        org: s.host_organizations?.name,
        status: s.status,
        hours_worked: totalHours,
        avg_score: avgScore,
      };
    });

    const supervisorName = req.user.name || req.user.full_name;
    const doc = generateStudentPerformancePDF(rows, { supervisorName });
    streamPdf(res, doc, 'student-performance-summary.pdf');
  } catch (err) {
    console.error('Error generating student performance report:', err.message);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

/**
 * GET /supervisors/reports/logbook-completion
 * ⚠️ "expected_count" here assumes a fixed 4-week cycle — swap in your real
 * session length (e.g. from attachment_sessions) if that's tracked.
 */
router.get('/logbook-completion', async (req, res) => {
  try {
    const supervisorId = req.user.user_id || req.user.id;
    const EXPECTED_PER_STUDENT = 4;

    const { data: students, error } = await supabase
      .from('students')
      .select(
        `
        student_id,
        users!inner ( name ),
        logbook_entries ( submitted_at )
      `
      )
      .eq('supervisor_id', supervisorId);

    if (error) throw error;

    const rows = (students || []).map((s) => {
      const entries = s.logbook_entries || [];
      const submitted = entries.length;
      const lastEntry = entries
        .map((e) => e.submitted_at)
        .filter(Boolean)
        .sort()
        .pop();

      return {
        name: s.users?.name || 'Unknown',
        submitted_count: submitted,
        expected_count: EXPECTED_PER_STUDENT,
        completion_pct: Math.min(100, Math.round((submitted / EXPECTED_PER_STUDENT) * 100)),
        last_submission: lastEntry,
      };
    });

    const supervisorName = req.user.name || req.user.full_name;
    const doc = generateLogbookCompletionPDF(rows, { supervisorName });
    streamPdf(res, doc, 'logbook-completion-rate.pdf');
  } catch (err) {
    console.error('Error generating logbook completion report:', err.message);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

/**
 * GET /supervisors/reports/host-org-feedback
 * ⚠️ This assumes a `site_visits` table with student_id, org, visit_date,
 * rating, notes. Point this at whatever table actually stores host org
 * feedback in your schema (SiteVisitsScreen's GET /students/site-visits
 * endpoint may already query the right table — mirror that here).
 */
router.get('/host-org-feedback', async (req, res) => {
  try {
    const supervisorId = req.user.user_id || req.user.id;

    const { data: visits, error } = await supabase
      .from('site_visits')
      .select(
        `
        visit_date,
        rating,
        notes,
        students!inner (
          supervisor_id,
          users!inner ( name ),
          host_organizations ( name )
        )
      `
      )
      .eq('students.supervisor_id', supervisorId)
      .order('visit_date', { ascending: false });

    if (error) throw error;

    const rows = (visits || []).map((v) => ({
      student_name: v.students?.users?.name || 'Unknown',
      org: v.students?.host_organizations?.name,
      visit_date: v.visit_date,
      rating: v.rating,
      notes: v.notes,
    }));

    const supervisorName = req.user.name || req.user.full_name;
    const doc = generateHostOrgFeedbackPDF(rows, { supervisorName });
    streamPdf(res, doc, 'host-org-feedback.pdf');
  } catch (err) {
    console.error('Error generating host org feedback report:', err.message);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

module.exports = router;