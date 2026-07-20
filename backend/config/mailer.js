const axios = require('axios');
require('dotenv').config();
console.log('🔑 Brevo API Key:', process.env.BREVO_API_KEY ? 'LOADED' : 'MISSING');

const SENDER = { name: 'IAMS UEAB', email: 'ngetichtimothy05@gmail.com' };


const TEAL       = '#1B7A65';
const TEAL_DARK  = '#145C4C';
const DARK       = '#0F2419';
const GRAY       = '#7A8F86';
const BORDER     = '#D8E4DF';
const BG         = '#EEF2F0';
const WHITE      = '#FFFFFF';
const ACCENT     = '#E8711A'; 

const sendBrevoEmail = async ({ to, subject, htmlContent }) => {
  await axios.post(
    'https://api.brevo.com/v3/smtp/email',
    {
      sender: SENDER,
      to: [{ email: to }],
      subject,
      htmlContent,
    },
    {
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
    }
  );
};

const emailShell = (heading, bodyHtml) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: ${BG}; padding: 20px;">
    <div style="background-color: ${TEAL_DARK}; padding: 30px; text-align: center; border-radius: 14px 14px 0 0;">
      <h1 style="color: ${WHITE}; margin: 0; letter-spacing: 0.5px;">IAMS</h1>
      <p style="color: ${WHITE}; opacity: 0.85; margin: 5px 0;">Industrial Attachment Management System</p>
      <p style="color: ${WHITE}; opacity: 0.6; font-size: 12px; margin: 0;">University of Eastern Africa, Baraton</p>
    </div>
    <div style="background-color: ${WHITE}; padding: 30px; border-radius: 0 0 14px 14px; border: 1px solid ${BORDER}; border-top: none;">
      <h2 style="color: ${DARK}; margin-top: 0;">${heading}</h2>
      ${bodyHtml}
    </div>
    <p style="color: ${GRAY}; font-size: 11px; text-align: center; margin-top: 16px;">
      IAMS · University of Eastern Africa, Baraton
    </p>
  </div>
`;

const sendVerificationEmail = async (email, name, code) => {
  await sendBrevoEmail({
    to: email,
    subject: 'IAMS — Verify Your Email',
    htmlContent: emailShell(`Hello, ${name}! 👋`, `
      <p style="color: #444;">Use the code below to verify your email address:</p>
      <div style="text-align: center; margin: 30px 0;">
        <span style="
          font-size: 42px;
          font-weight: bold;
          letter-spacing: 10px;
          color: ${ACCENT};
          background: ${BG};
          padding: 15px 30px;
          border-radius: 10px;
          border: 2px dashed ${ACCENT};
          display: inline-block;
        ">${code}</span>
      </div>
      <p style="color: ${GRAY}; font-size: 13px; text-align: center;">
        This code expires in <strong>10 minutes</strong>.
      </p>
      <p style="color: ${GRAY}; font-size: 12px; text-align: center;">
        If you did not create an account, please ignore this email.
      </p>
    `),
  });
  console.log(`✅ Verification email sent to ${email}`);
};


const sendPasswordResetEmail = async (email, name, code) => {
  await sendBrevoEmail({
    to: email,
    subject: 'IAMS — Password Reset Code',
    htmlContent: emailShell(`Hello, ${name}! 👋`, `
      <p style="color: #444;">Use the code below to reset your password:</p>
      <div style="text-align: center; margin: 30px 0;">
        <span style="
          font-size: 42px;
          font-weight: bold;
          letter-spacing: 10px;
          color: ${ACCENT};
          background: ${BG};
          padding: 15px 30px;
          border-radius: 10px;
          border: 2px dashed ${ACCENT};
          display: inline-block;
        ">${code}</span>
      </div>
      <p style="color: ${GRAY}; font-size: 13px; text-align: center;">
        This code expires in <strong>10 minutes</strong>.
      </p>
      <p style="color: ${GRAY}; font-size: 12px; text-align: center;">
        If you did not request a password reset, please ignore this email.
      </p>
    `),
  });
  console.log(`✅ Password reset email sent to ${email}`);
};


const sendAdminPasswordResetEmail = async (email, name, tempPassword) => {
  await sendBrevoEmail({
    to: email,
    subject: 'IAMS — Your Password Was Reset',
    htmlContent: emailShell(`Hello, ${name}! 👋`, `
      <p style="color: #444;">
        An administrator has reset your IAMS password. Use the temporary password below to log in:
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <span style="
          font-size: 28px;
          font-weight: bold;
          letter-spacing: 3px;
          color: ${ACCENT};
          background: ${BG};
          padding: 15px 30px;
          border-radius: 10px;
          border: 2px dashed ${ACCENT};
          display: inline-block;
        ">${tempPassword}</span>
      </div>
      <p style="color: #444; font-size: 13px; text-align: center;">
        For your security, please log in and change this password as soon as possible.
      </p>
      <p style="color: ${GRAY}; font-size: 12px; text-align: center;">
        If you were not expecting this, please contact an IAMS administrator.
      </p>
    `),
  });
  console.log(`✅ Admin password reset email sent to ${email}`);
};

// Sent to the student when an admin assigns them a supervisor.
const sendStudentSupervisorAssignedEmail = async (email, studentName, supervisorName) => {
  await sendBrevoEmail({
    to: email,
    subject: 'IAMS — Supervisor Assigned',
    htmlContent: emailShell(`Hello, ${studentName}! 👋`, `
      <p style="color: #444;">
        A supervisor has been assigned to your attachment:
      </p>
      <p style="text-align: center; margin: 24px 0;">
        <span style="
          font-size: 20px;
          font-weight: bold;
          color: ${TEAL_DARK};
          background: ${BG};
          padding: 12px 24px;
          border-radius: 8px;
          display: inline-block;
          border: 1px solid ${BORDER};
        ">${supervisorName}</span>
      </p>
      <p style="color: ${GRAY}; font-size: 13px;">
        You can view your supervisor's details and reach out to them from your IAMS dashboard.
      </p>
    `),
  });
  console.log(`✅ Supervisor-assigned email sent to student ${email}`);
};

// Sent to the supervisor when an admin assigns them a student.
const sendSupervisorAssignmentEmail = async (email, supervisorName, studentName) => {
  await sendBrevoEmail({
    to: email,
    subject: 'IAMS — New Student Assigned',
    htmlContent: emailShell(`Hello, ${supervisorName}! 👋`, `
      <p style="color: #444;">
        You have been assigned as the supervisor for:
      </p>
      <p style="text-align: center; margin: 24px 0;">
        <span style="
          font-size: 20px;
          font-weight: bold;
          color: ${TEAL_DARK};
          background: ${BG};
          padding: 12px 24px;
          border-radius: 8px;
          display: inline-block;
          border: 1px solid ${BORDER};
        ">${studentName}</span>
      </p>
      <p style="color: ${GRAY}; font-size: 13px;">
        You can view this student's placement details and logbook from your IAMS dashboard.
      </p>
    `),
  });
  console.log(`✅ Supervisor-assigned email sent to supervisor ${email}`);
};

// Sent to a student who hasn't submitted their logbook entry for the current week.
const sendLogbookReminderEmail = async (email, studentName, weekNumber) => {
  await sendBrevoEmail({
    to: email,
    subject: `IAMS — Week ${weekNumber} Logbook Reminder`,
    htmlContent: emailShell(`Hello, ${studentName}! 👋`, `
      <p style="color: #444;">
        This is a reminder that your <strong>Week ${weekNumber}</strong> logbook entry
        is due today by <strong>11:59 PM</strong>.
      </p>
      <p style="color: #444;">
        Please log in to IAMS and submit your entry to stay on track with your attachment requirements.
      </p>
      <p style="color: ${GRAY}; font-size: 12px; text-align: center; margin-top: 24px;">
        If you've already submitted this week's entry, you can disregard this reminder.
      </p>
    `),
  });
  console.log(`✅ Logbook reminder email sent to ${email}`);
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendAdminPasswordResetEmail,
  sendStudentSupervisorAssignedEmail,
  sendSupervisorAssignmentEmail,
  sendLogbookReminderEmail,
};