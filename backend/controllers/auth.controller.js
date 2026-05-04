const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { sendVerificationEmail } = require('../config/mailer');

const generateToken = (user) =>
  jwt.sign(
    { user_id: user.user_id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

const generateCode = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

// POST /api/auth/register
const register = async (req, res) => {
  const {
    email, password, role, full_name, reg_number,
    department, year_of_study, phone, org_name, location, contact_person
  } = req.body;

  try {
    const [existing] = await db.query('SELECT user_id FROM users WHERE email = ?', [email]);
    if (existing.length) return res.status(400).json({ message: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 10);
    const code = generateCode();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const [result] = await db.query(
      'INSERT INTO users (email, password, role, verify_code, verify_code_expires) VALUES (?, ?, ?, ?, ?)',
      [email, hashed, role || 'student', code, expires]
    );
    const userId = result.insertId;

    // Insert into role-specific table
    if (!role || role === 'student') {
      await db.query(
        'INSERT INTO students (user_id, reg_number, full_name, phone, department, year_of_study) VALUES (?,?,?,?,?,?)',
        [userId, reg_number, full_name, phone || '', department || '', year_of_study || 1]
      );
    } else if (role === 'supervisor') {
      await db.query(
        'INSERT INTO supervisors (user_id, full_name, phone, department) VALUES (?,?,?,?)',
        [userId, full_name, phone || '', department || '']
      );
    } else if (role === 'host_org') {
      await db.query(
        'INSERT INTO host_organizations (user_id, org_name, location, contact_person, phone) VALUES (?,?,?,?,?)',
        [userId, org_name, location || '', contact_person || '', phone || '']
      );
    }

    // Send verification email
await sendVerificationEmail(email, full_name, code);

res.status(201).json({
  message: 'Registration successful! Check your email for verification code.',
  email,
  requiresVerification: true,
});
const [user] = await db.query('SELECT * FROM users WHERE email = ?', [email]);

res.status(201).json({
  message: 'Registration successful!',
  token: generateToken(user[0]),
  role: user[0].role,
});
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/auth/verify
const verifyEmail = async (req, res) => {
  const { email, code } = req.body;
  try {
    const [rows] = await db.query(
      'SELECT * FROM users WHERE email = ? AND verify_code = ? AND verify_code_expires > NOW()',
      [email, code]
    );

    if (!rows.length) {
      return res.status(400).json({ message: 'Invalid or expired verification code' });
    }

    await db.query(
      'UPDATE users SET is_verified = TRUE, verify_code = NULL, verify_code_expires = NULL WHERE email = ?',
      [email]
    );

    const user = rows[0];
    res.json({
      message: 'Email verified successfully!',
      token: generateToken(user),
      role: user.role,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/auth/resend-code
const resendCode = async (req, res) => {
  const { email } = req.body;
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (!rows.length) return res.status(404).json({ message: 'Email not found' });
    if (rows[0].is_verified) return res.status(400).json({ message: 'Email already verified' });

    const code = generateCode();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    await db.query(
      'UPDATE users SET verify_code = ?, verify_code_expires = ? WHERE email = ?',
      [code, expires, email]
    );

    const [student] = await db.query(
      'SELECT full_name FROM students WHERE user_id = ?', [rows[0].user_id]
    );
    const name = student[0]?.full_name || 'User';

    await sendVerificationEmail(email, name, code);
    res.json({ message: 'Verification code resent successfully!' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (!rows.length) return res.status(401).json({ message: 'Invalid email or password' });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Invalid email or password' });

    if (!user.is_verified) {
      return res.status(403).json({
        message: 'Please verify your email first',
        requiresVerification: true,
        email,
      });
    }

    res.json({ token: generateToken(user), role: user.role });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT u.user_id, u.email, u.role, s.full_name, s.reg_number, s.department, s.year_of_study
       FROM users u LEFT JOIN students s ON u.user_id = s.user_id
       WHERE u.user_id = ?`,
      [req.user.user_id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { register, verifyEmail, resendCode, login, getMe };