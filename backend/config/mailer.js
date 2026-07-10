const axios = require('axios');
require('dotenv').config();
console.log('🔑 Brevo API Key:', process.env.BREVO_API_KEY ? 'LOADED' : 'MISSING');

const SENDER = { name: 'IAMS UEAB', email: 'ngetichtimothy05@gmail.com' };

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
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background-color: #1E3A5F; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
      <h1 style="color: #C87941; margin: 0;">IAMS</h1>
      <p style="color: #ffffff; margin: 5px 0;">Industrial Attachment Management System</p>
      <p style="color: #aaaaaa; font-size: 12px;">University of Eastern Africa, Baraton</p>
    </div>
    <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
      <h2 style="color: #1E3A5F;">${heading}</h2>
      ${bodyHtml}
    </div>
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
          color: #C87941;
          background: #fff3e0;
          padding: 15px 30px;
          border-radius: 10px;
          border: 2px dashed #C87941;
        ">${code}</span>
      </div>
      <p style="color: #888; font-size: 13px; text-align: center;">
        This code expires in <strong>10 minutes</strong>.
      </p>
      <p style="color: #888; font-size: 12px; text-align: center;">
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
          color: #C87941;
          background: #fff3e0;
          padding: 15px 30px;
          border-radius: 10px;
          border: 2px dashed #C87941;
        ">${code}</span>
      </div>
      <p style="color: #888; font-size: 13px; text-align: center;">
        This code expires in <strong>10 minutes</strong>.
      </p>
      <p style="color: #888; font-size: 12px; text-align: center;">
        If you did not request a password reset, please ignore this email.
      </p>
    `),
  });
  console.log(`✅ Password reset email sent to ${email}`);
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
          color: #1E3A5F;
          background: #eef2f7;
          padding: 12px 24px;
          border-radius: 8px;
          display: inline-block;
        ">${supervisorName}</span>
      </p>
      <p style="color: #888; font-size: 13px;">
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
          color: #1E3A5F;
          background: #eef2f7;
          padding: 12px 24px;
          border-radius: 8px;
          display: inline-block;
        ">${studentName}</span>
      </p>
      <p style="color: #888; font-size: 13px;">
        You can view this student's placement details and logbook from your IAMS dashboard.
      </p>
    `),
  });
  console.log(`✅ Supervisor-assigned email sent to supervisor ${email}`);
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendStudentSupervisorAssignedEmail,
  sendSupervisorAssignmentEmail,
};