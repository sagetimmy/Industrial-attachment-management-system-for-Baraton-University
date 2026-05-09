const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

transporter.verify((error) => {
  if (error) {
    console.error('❌ Email error:', error.message);
  } else {
    console.log('✅ Email server ready');
  }
});

const sendVerificationEmail = async (email, name, code) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
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
  } catch (err) {
    console.error('❌ Verification email error:', err.message);
    throw err;
  }
};

const sendPasswordResetEmail = async (email, name, code) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
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
  } catch (err) {
    console.error('❌ Password reset email error:', err.message);
    throw err;
  }
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
