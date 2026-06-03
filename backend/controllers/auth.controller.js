const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const supabase = require('../config/db');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../config/mailer');
const { getRolePermissions } = require('../utils/rolePermissions');

// ── Token helpers ────────────────────────────────────────────────
const generateAccessToken = (user) =>
  jwt.sign(
    { user_id: user.user_id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );

const generateRefreshToken = () => crypto.randomBytes(64).toString('hex');

const saveRefreshToken = async (user_id, token) => {
  const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
  await supabase.from('refresh_tokens').insert({ user_id, token, expires_at });
};

const generateCode = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

// POST /api/auth/register
const register = async (req, res) => {
  const {
    email, password, role, full_name, reg_number,
    department, year_of_study, phone, org_name, location, contact_person
  } = req.body;

  try {
    const { data: existing } = await supabase
      .from('users')
      .select('user_id')
      .eq('email', email)
      .single();

    if (existing) return res.status(400).json({ message: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 10);
    const code = generateCode();
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({ email, password: hashed, role: role || 'student', verify_code: code, verify_code_expires: expires })
      .select()
      .single();

    if (userError) throw userError;

    const userId = newUser.user_id;

    if (!role || role === 'student') {
      const { error } = await supabase.from('students').insert({
        user_id: userId, reg_number, full_name,
        phone: phone || '', department: department || '', year_of_study: year_of_study || 1
      });
      if (error) throw error;
    } else if (role === 'supervisor') {
      const { error } = await supabase.from('supervisors').insert({
        user_id: userId, full_name, phone: phone || '', department: department || ''
      });
      if (error) throw error;
    } else if (role === 'host_org') {
      const { error } = await supabase.from('host_organizations').insert({
        user_id: userId, org_name, location: location || '',
        contact_person: contact_person || '', phone: phone || '',
        available_slots: 5
      });
      if (error) throw error;
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
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('verify_code', code)
      .gt('verify_code_expires', new Date().toISOString())
      .single();

    if (error || !user) return res.status(400).json({ message: 'Invalid or expired verification code' });

    await supabase
      .from('users')
      .update({ is_verified: true, verify_code: null, verify_code_expires: null })
      .eq('email', email);

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken();
    await saveRefreshToken(user.user_id, refreshToken);

    res.json({
      message: 'Email verified successfully!',
      accessToken,
      refreshToken,
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
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) return res.status(404).json({ message: 'Email not found' });
    if (user.is_verified) return res.status(400).json({ message: 'Email already verified' });

    const code = generateCode();
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await supabase
      .from('users')
      .update({ verify_code: code, verify_code_expires: expires })
      .eq('email', email);

    const { data: student } = await supabase
      .from('students')
      .select('full_name')
      .eq('user_id', user.user_id)
      .single();

    const name = student?.full_name || 'User';

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
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) return res.status(401).json({ message: 'Invalid email or password' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Invalid email or password' });

    if (!user.is_verified) {
      return res.status(403).json({
        message: 'Please verify your email first',
        requiresVerification: true,
        email,
      });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken();
    await saveRefreshToken(user.user_id, refreshToken);

    console.log('Login success for user_id:', user.user_id);
    res.json({ accessToken, refreshToken, role: user.role });
  } catch (err) {
    console.error('Login handler error:', err);
    res.status(500).json({ message: err.message });
  }
};

// POST /api/auth/refresh
const refresh = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ message: 'No refresh token provided' });

  try {
    const { data: stored, error } = await supabase
      .from('refresh_tokens')
      .select('*')
      .eq('token', refreshToken)
      .single();

    if (error || !stored) return res.status(401).json({ message: 'Invalid refresh token' });

    if (new Date(stored.expires_at) < new Date()) {
      await supabase.from('refresh_tokens').delete().eq('token', refreshToken);
      return res.status(401).json({ message: 'Session expired. Please login again.' });
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('user_id, role, email')
      .eq('user_id', stored.user_id)
      .single();

    if (userError || !user) return res.status(401).json({ message: 'User not found' });

    // Rotate — delete old, issue new pair
    await supabase.from('refresh_tokens').delete().eq('token', refreshToken);

    const accessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken();
    await saveRefreshToken(user.user_id, newRefreshToken);

    res.json({ accessToken, refreshToken: newRefreshToken });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/auth/logout
const logout = async (req, res) => {
  const { refreshToken } = req.body;
  try {
    if (refreshToken) {
      await supabase.from('refresh_tokens').delete().eq('token', refreshToken);
    }
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('user_id, email, is_verified, role')
      .eq('email', email)
      .single();

    if (error || !user) return res.status(404).json({ message: 'No account found with that email' });
    if (!user.is_verified) return res.status(400).json({ message: 'Please verify your account email first' });

    const code = generateCode();
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await supabase.from('password_reset_codes').delete().eq('email', email);
    const { error: insertError } = await supabase
      .from('password_reset_codes')
      .insert({ user_id: user.user_id, email, code, expires_at: expires });

    if (insertError) throw insertError;

    let name = 'User';
    if (user.role === 'student') {
      const { data } = await supabase.from('students').select('full_name').eq('user_id', user.user_id).single();
      name = data?.full_name || 'User';
    } else if (user.role === 'supervisor') {
      const { data } = await supabase.from('supervisors').select('full_name').eq('user_id', user.user_id).single();
      name = data?.full_name || 'User';
    } else if (user.role === 'host_org') {
      const { data } = await supabase.from('host_organizations').select('contact_person').eq('user_id', user.user_id).single();
      name = data?.contact_person || 'User';
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
  if (!email || !code || !password) return res.status(400).json({ message: 'Email, code and new password are required' });
  if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });

  try {
    const { data: resetEntry, error } = await supabase
      .from('password_reset_codes')
      .select('id, user_id')
      .eq('email', email)
      .eq('code', code)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !resetEntry) return res.status(400).json({ message: 'Invalid or expired reset code' });

    const hashed = await bcrypt.hash(password, 10);
    await supabase.from('users').update({ password: hashed }).eq('user_id', resetEntry.user_id);
    await supabase.from('password_reset_codes').delete().eq('email', email);

    // Invalidate all refresh tokens on password reset
    await supabase.from('refresh_tokens').delete().eq('user_id', resetEntry.user_id);

    return res.json({ message: 'Password reset successful. You can now log in.' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select(`
        user_id, email, role,
        students!students_user_id_fkey (full_name, reg_number, department, year_of_study, phone),
        supervisors!supervisors_user_id_fkey (full_name, department, phone),
        host_organizations!host_organizations_user_id_fkey (org_name, location, contact_person, available_slots)
      `)
      .eq('user_id', req.user.user_id)
      .single();

    if (error) throw error;

    const profile =
      user.students?.[0] ||
      user.supervisors?.[0] ||
      user.host_organizations?.[0] ||
      {};

    const permissions = await getRolePermissions(user.role);

    res.json({ user_id: user.user_id, email: user.email, role: user.role, permissions, ...profile });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { register, verifyEmail, resendCode, login, refresh, logout, forgotPassword, resetPassword, getMe };
