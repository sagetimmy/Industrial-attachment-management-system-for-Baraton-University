require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.sendMail({
  from: process.env.EMAIL_FROM,
  to: 'kiplangatn7996@gmail.com',
  subject: 'IAMS Test Email',
  text: 'If you see this, email is working! ✅',
}).then(() => {
  console.log('✅ Email sent successfully!');
}).catch((err) => {
  console.error('❌ Email error:', err.message);
});