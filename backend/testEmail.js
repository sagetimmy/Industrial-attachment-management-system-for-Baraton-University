require('dotenv').config();
const nodemailer = require('nodemailer');

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

transporter.sendMail({
  from: process.env.EMAIL_FROM,
  to: process.env.EMAIL_USER,
  subject: 'IAMS Test Email',
  text: 'If you see this, email is working! ✅',
}).then(() => {
  console.log('✅ Email sent successfully!');
}).catch((err) => {
  console.error('❌ Email error:', err.message);
});