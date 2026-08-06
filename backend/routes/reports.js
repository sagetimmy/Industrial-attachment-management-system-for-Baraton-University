const express = require('express');
const router = express.Router();

const supabase = require('../config/db');
const { protect } = require('../middleware/auth.middleware');

const {
  generateStudentPerformancePDF,
  generateLogbookCompletionPDF,
  generateHostOrgFeedbackPDF,
} = require('../utils/pdfReportGenerator');

// All report routes require a logged-in supervisor
router.use(protect);

// Helper: get supervisor record from user_id
// (mirrors supervisors.routes.js exactly)
const getSupervisor = async (user_id) => {
  const { data, error } = await supabase
    .from('supervisors')
    .select('*')
    .eq('user_id', user_id)
    .single();
  return { supervisor: data, error };
};

const getSupervisorAssignmentId = (supervisor, fallbackUserId) => (
  supervisor?.supervisor_id || supervisor?.user_id || fallbackUserId
);

function streamPdf(res, doc, filename) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);
  doc.end();
}

/**
 * GET /supervisors/reports/student-performance
 * Real schema: attachments is the join table (supervisor_id, student_id,
 * org_id live here) -> students / host_organizations / logbook_entries.
 */
router.get('/student-performance', async (req, res) => {
  try {
    const { supervisor, error: sErr } = await getSupervisor(req.user.user_id);
    if (sErr || !supervisor) return res.status(404).json({ message: 'Supervisor not found' });

    const supervisorAssignmentId = getSupervisorAssignmentId(supervisor, req.user.user_id);

    const { data: attachments, error } = await supabase
      .from('attachments')
      .select(`
        attachment_id,
        status,
        students!attachments_student_id_fkey ( full_name, reg_number ),
        host_organizations!attachments_org_id_fkey ( org_name ),
        logbook_entries!logbook_entries_attachment_id_fkey ( hours_worked, supervisor_score )
      `)
      .eq('supervisor_id', supervisorAssignmentId);

    if (error) throw error;

    const rows = (attachments || []).map((a) => {
      const entries = a.logbook_entries || [];
      const totalHours = entries.reduce((sum, e) => sum + (Number(e.hours_worked) || 0), 0);
      const scored = entries.filter((e) => e.supervisor_score != null);
      const avgScore = scored.length
        ? Math.round(scored.reduce((sum, e) => sum + Number(e.supervisor_score), 0) / scored.length)
        : null;

      return {
        name: a.students?.full_name || 'Unknown',
        org: a.host_organizations?.org_name,
        status: a.status,
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
 * EXPECTED_PER_STUDENT still assumes a fixed 4-week cycle — swap in the
 * real session length (e.g. from attachment_sessions) if that's tracked.
 */
router.get('/logbook-completion', async (req, res) => {
  try {
    const { supervisor, error: sErr } = await getSupervisor(req.user.user_id);
    if (sErr || !supervisor) return res.status(404).json({ message: 'Supervisor not found' });

    const supervisorAssignmentId = getSupervisorAssignmentId(supervisor, req.user.user_id);
    const EXPECTED_PER_STUDENT = 4;

    const { data: attachments, error } = await supabase
      .from('attachments')
      .select(`
        attachment_id,
        students!attachments_student_id_fkey ( full_name, reg_number ),
        logbook_entries!logbook_entries_attachment_id_fkey ( submitted_at )
      `)
      .eq('supervisor_id', supervisorAssignmentId);

    if (error) throw error;

    const rows = (attachments || []).map((a) => {
      const entries = a.logbook_entries || [];
      const submitted = entries.length;
      const lastEntry = entries
        .map((e) => e.submitted_at)
        .filter(Boolean)
        .sort()
        .pop();

      return {
        name: a.students?.full_name || 'Unknown',
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
 * site_visits has no `rating` column (only visit_date, visit_time, notes,
 * status), so this pulls from `evaluations` instead, which actually has
 * `score` + `comments` — a much better fit for "feedback on student
 * conduct and skills." Output field names (student_name, org, visit_date,
 * rating, notes) are kept the same as before so generateHostOrgFeedbackPDF
 * doesn't need changes; update those keys if the generator expects
 * eval-specific names instead.
 */
router.get('/host-org-feedback', async (req, res) => {
  try {
    const { supervisor, error: sErr } = await getSupervisor(req.user.user_id);
    if (sErr || !supervisor) return res.status(404).json({ message: 'Supervisor not found' });

    const supervisorAssignmentId = getSupervisorAssignmentId(supervisor, req.user.user_id);

    const { data: evaluations, error } = await supabase
      .from('evaluations')
      .select(`
        eval_date,
        score,
        comments,
        attachments!evaluations_attachment_id_fkey (
          students!attachments_student_id_fkey ( full_name ),
          host_organizations!attachments_org_id_fkey ( org_name )
        )
      `)
      .eq('supervisor_id', supervisorAssignmentId)
      .order('eval_date', { ascending: false });

    if (error) throw error;

    const rows = (evaluations || []).map((e) => ({
      student_name: e.attachments?.students?.full_name || 'Unknown',
      org: e.attachments?.host_organizations?.org_name,
      visit_date: e.eval_date,
      rating: e.score,
      notes: e.comments,
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