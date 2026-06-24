const { Resend } = require('resend');
require('dotenv').config();

const resend = new Resend(process.env.RESEND_API_KEY);

const sendVerificationEmail = async (email, name, code) => {
  const { error } = await resend.emails.send({
    from: 'IAMS UEAB <onboarding@resend.dev>',
    to: email,
    subject: 'IAMS — Verify Your Email',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #1E3A5F; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: #C87941; margin: 0;">IAMS</h1>
          <p style="color: #ffffff; margin: 5px 0;">Industrial Attachment Management System</p>
          <p style="color: #aaaaaa; font-size: 12px;">University of Eastern Africa, Baraton</p>
        </div>
        <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #1E3A5F;">Hello, ${name}! 👋</h2>
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
        </div>
      </div>
    `,
  });

  if (error) {
    console.error('❌ Verification email error:', error.message);
    throw new Error(error.message);
  }

  console.log(`✅ Verification email sent to ${email}`);
};

const sendPasswordResetEmail = async (email, name, code) => {
  const { error } = await resend.emails.send({
    from: 'IAMS UEAB <onboarding@resend.dev>',
    to: email,
    subject: 'IAMS — Password Reset Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #1E3A5F; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: #C87941; margin: 0;">IAMS</h1>
          <p style="color: #ffffff; margin: 5px 0;">Industrial Attachment Management System</p>
          <p style="color: #aaaaaa; font-size: 12px;">University of Eastern Africa, Baraton</p>
        </div>
        <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #1E3A5F;">Hello, ${name}! 👋</h2>
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
        </div>
      </div>
    `,
  });

  if (error) {
    console.error('❌ Password reset email error:', error.message);
    throw new Error(error.message);
  }

  console.log(`✅ Password reset email sent to ${email}`);
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail };