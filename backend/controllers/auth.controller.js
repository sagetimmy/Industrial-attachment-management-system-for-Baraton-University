const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const generateToken = (user) =>
  jwt.sign(
    { user_id: user.user_id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

const register = async (req, res) => {
  const { email, password, role, full_name, reg_number, department, year_of_study, phone } = req.body;
  try {
    const [existing] = await db.query('SELECT user_id FROM users WHERE email = ?', [email]);
    if (existing.length) return res.status(400).json({ message: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
      [email, hashed, role || 'student']
    );
    const userId = result.insertId;

    if (!role || role === 'student') {
      await db.query(
        'INSERT INTO students (user_id, reg_number, full_name, phone, department, year_of_study) VALUES (?,?,?,?,?,?)',
        [userId, reg_number, full_name, phone || '', department || '', year_of_study || 1]
      );
    }

    const [user] = await db.query('SELECT * FROM users WHERE user_id = ?', [userId]);
    res.status(201).json({ token: generateToken(user[0]), role: user[0].role });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (!rows.length) return res.status(401).json({ message: 'Invalid email or password' });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Invalid email or password' });

    res.json({ token: generateToken(user), role: user.role });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

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

module.exports = { register, login, getMe };