const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../config/mailer');

const generateToken = (user) =>
  jwt.sign(
    { user_id: user.user_id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

const generateCode = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const ensurePasswordResetTable = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS password_reset_codes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      email VARCHAR(255) NOT NULL,
      code VARCHAR(10) NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_password_reset_email (email),
      INDEX idx_password_reset_user (user_id)
    )
  `);
};

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
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    const [result] = await db.query(
      'INSERT INTO users (email, password, role, verify_code, verify_code_expires) VALUES (?, ?, ?, ?, ?)',
      [email, hashed, role || 'student', code, expires]
    );
    const userId = result.insertId;

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

    try {
      await sendVerificationEmail(email, full_name, code);
    } catch (emailErr) {
      console.error('Failed to send verification email:', emailErr.message);
      return res.status(500).json({ message: 'Registration successful but failed to send verification email. Please try resending.' });
    }

    res.status(201).json({
      message: 'Registration successful! Check your email for verification code.',
      email,
      requiresVerification: true,
    });
  } catch (err) {
    console.error('Register error:', err.message);
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

    try {
      await sendVerificationEmail(email, name, code);
    } catch (emailErr) {
      console.error('Failed to send verification email:', emailErr.message);
      return res.status(500).json({ message: 'Failed to send verification code. Please try again.' });
    }

    res.json({ message: 'Verification code resent successfully!' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  const { email, password } = req.body;
  console.log('Login attempt:', { email, ip: req.ip });
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    console.log('DB rows for login:', rows.length);
    if (!rows.length) {
      console.log('Login failed - user not found:', email);
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = rows[0];
    console.log('User fetched for login:', { user_id: user.user_id, is_verified: user.is_verified });
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      console.log('Login failed - wrong password for:', email);
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (!user.is_verified) {
      console.log('Login blocked - email not verified for:', email);
      return res.status(403).json({
        message: 'Please verify your email first',
        requiresVerification: true,
        email,
      });
    }

    const token = generateToken(user);
    console.log('Login success for user_id:', user.user_id);
    res.json({ token, role: user.role });
  } catch (err) {
    console.error('Login handler error:', err);
    res.status(500).json({ message: err.message });
  }
};

// POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    await ensurePasswordResetTable();

    const [rows] = await db.query('SELECT user_id, email, is_verified, role FROM users WHERE email = ?', [email]);
    if (!rows.length) {
      return res.status(404).json({ message: 'No account found with that email' });
    }

    const user = rows[0];
    if (!user.is_verified) {
      return res.status(400).json({ message: 'Please verify your account email first' });
    }

    const code = generateCode();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    await db.query('DELETE FROM password_reset_codes WHERE email = ?', [email]);
    await db.query(
      'INSERT INTO password_reset_codes (user_id, email, code, expires_at) VALUES (?, ?, ?, ?)',
      [user.user_id, user.email, code, expires]
    );

    let name = 'User';
    if (user.role === 'student') {
      const [student] = await db.query('SELECT full_name FROM students WHERE user_id = ?', [user.user_id]);
      name = student[0]?.full_name || 'User';
    } else if (user.role === 'supervisor') {
      const [supervisor] = await db.query('SELECT full_name FROM supervisors WHERE user_id = ?', [user.user_id]);
      name = supervisor[0]?.full_name || 'User';
    } else if (user.role === 'host_org') {
      const [org] = await db.query('SELECT contact_person FROM host_organizations WHERE user_id = ?', [user.user_id]);
      name = org[0]?.contact_person || 'User';
    }

    try {
      await sendPasswordResetEmail(email, name, code);
    } catch (emailErr) {
      console.error('Failed to send password reset email:', emailErr.message);
      return res.status(500).json({ message: 'Failed to send password reset code. Please try again.' });
    }

    return res.json({ message: 'Password reset code sent to your email' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// POST /api/auth/reset-password
const resetPassword = async (req, res) => {
  const { email, code, password } = req.body;
  if (!email || !code || !password) {
    return res.status(400).json({ message: 'Email, code and new password are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }

  try {
    await ensurePasswordResetTable();

    const [codes] = await db.query(
      `SELECT id, user_id FROM password_reset_codes
       WHERE email = ? AND code = ? AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [email, code]
    );

    if (!codes.length) {
      return res.status(400).json({ message: 'Invalid or expired reset code' });
    }

    const hashed = await bcrypt.hash(password, 10);
    await db.query('UPDATE users SET password = ? WHERE user_id = ?', [hashed, codes[0].user_id]);
    await db.query('DELETE FROM password_reset_codes WHERE email = ?', [email]);

    return res.json({ message: 'Password reset successful. You can now log in.' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT u.user_id, u.email, u.role, 
              COALESCE(s.full_name, sv.full_name, o.contact_person) as full_name,
              s.reg_number, s.department, s.year_of_study,
              sv.department as supervisor_dept, sv.phone as supervisor_phone,
              o.org_name, o.location, o.available_slots
       FROM users u 
       LEFT JOIN students s ON u.user_id = s.user_id
       LEFT JOIN supervisors sv ON u.user_id = sv.user_id
       LEFT JOIN host_organizations o ON u.user_id = o.user_id
       WHERE u.user_id = ?`,
      [req.user.user_id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { register, verifyEmail, resendCode, login, forgotPassword, resetPassword, getMe };
