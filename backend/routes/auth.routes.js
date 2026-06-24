const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const supabase = require('../config/db');
const { sendVerificationEmail } = require('../config/mailer');

// Helper: get role permissions
const getRolePermissions = (role) => {
  const permissions = {
    admin: ['view_all', 'edit_all', 'manage_users', 'manage_attachments', 'manage_orgs', 'view_reports'],
    supervisor: ['view_students', 'review_logbooks', 'manage_evaluations', 'view_reports'],
    student: ['view_own_profile', 'submit_logbook', 'apply_attachment', 'view_feedback'],
    host_org: ['view_own_org', 'manage_slots', 'view_applications', 'manage_placements']
  };
  return permissions[role] || [];
};

// Helper: generate 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, password, role, full_name } = req.body;

  if (!email || !password || !role) {
    return res.status(400).json({ message: 'email, password, and role are required' });
  }

  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: { role, full_name: full_name || '' },
    });

    if (error) {
      console.error('❌ Admin createUser error:', error.message);
      return res.status(400).json({ message: error.message });
    }

    const auth_id = data.user?.id;
    if (!auth_id) {
      return res.status(500).json({ message: 'User created but no ID returned' });
    }

    console.log(`✅ Auth user created for ${email} (auth_id: ${auth_id})`);

    // Generate OTP and store
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await supabase.from('password_reset_codes').delete().eq('email', email);
    await supabase.from('password_reset_codes').insert({
      email,
      code: otp,
      expires_at: expiresAt.toISOString(),
    });

    // Respond immediately — send email in background
    res.status(201).json({ auth_id, user: data.user });

    sendVerificationEmail(email, full_name || 'User', otp)
      .then(() => console.log(`✅ Verification email sent to ${email}`))
      .catch(err => console.error(`❌ Email send failed:`, err.response?.data || err.message));

  } catch (err) {
    console.error('❌ /register unexpected error:', err.message);
    return res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/register-profile
router.post('/register-profile', async (req, res) => {
  const {
    auth_id, email, role, full_name, reg_number,
    department, year_of_study, phone,
    org_name, location, contact_person
  } = req.body;

  try {
    const { data: newUser, error: dbError } = await supabase
      .from('users')
      .insert({ email, password: 'supabase_auth_managed', role, auth_id, is_verified: false, is_active: true })
      .select()
      .single();

    if (dbError) return res.status(500).json({ message: dbError.message });

    if (role === 'student') {
      const { error } = await supabase.from('students')
        .insert({ user_id: newUser.user_id, full_name, reg_number, department, year_of_study: year_of_study || 1, phone });
      if (error) throw error;
    } else if (role === 'supervisor') {
      const { error } = await supabase.from('supervisors')
        .insert({ user_id: newUser.user_id, full_name, department, phone });
      if (error) throw error;
    } else if (role === 'host_org') {
      const { error } = await supabase.from('host_organizations')
        .insert({ user_id: newUser.user_id, org_name, location, contact_person, phone, available_slots: 0 });
      if (error) throw error;
    }

    res.status(201).json({ message: 'Profile created successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/verify-email
router.post('/verify-email', async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ message: 'email and code are required' });
  }

  try {
    const { data: otpRecord, error } = await supabase
      .from('password_reset_codes')
      .select('*')
      .eq('email', email)
      .eq('code', code)
      .maybeSingle();

    if (error || !otpRecord) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    if (new Date() > new Date(otpRecord.expires_at)) {
      return res.status(400).json({ message: 'Verification code has expired' });
    }

    // Mark user as verified in users table
    const { error: updateError } = await supabase
      .from('users')
      .update({ is_verified: true })
      .eq('email', email);

    if (updateError) {
      return res.status(500).json({ message: 'Failed to verify user' });
    }

    // Confirm email in Supabase Auth
    const { data: authUser } = await supabase
      .from('users')
      .select('auth_id')
      .eq('email', email)
      .maybeSingle();

    if (authUser?.auth_id) {
      await supabase.auth.admin.updateUserById(authUser.auth_id, {
        email_confirm: true,
      });
    }

    // Delete used OTP
    await supabase.from('password_reset_codes').delete().eq('email', email);

    console.log(`✅ Email verified for ${email}`);
    return res.status(200).json({ message: 'Email verified successfully' });
  } catch (err) {
    console.error('❌ /verify-email error:', err.message);
    return res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/resend-code
router.post('/resend-code', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'email is required' });
  }

  try {
    const { data: user } = await supabase
      .from('users')
      .select('user_id')
      .eq('email', email)
      .maybeSingle();

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await supabase.from('password_reset_codes').delete().eq('email', email);
    await supabase.from('password_reset_codes').insert({
      email,
      code: otp,
      expires_at: expiresAt.toISOString(),
    });

    let fullName = 'User';
    if (user?.user_id) {
      const { data: student } = await supabase
        .from('students')
        .select('full_name')
        .eq('user_id', user.user_id)
        .maybeSingle();
      if (student?.full_name) fullName = student.full_name;
    }

    // Send in background
    res.status(200).json({ message: 'Verification code resent' });

    sendVerificationEmail(email, fullName, otp)
      .then(() => console.log(`✅ Resend email sent to ${email}`))
      .catch(err => console.error(`❌ Resend email failed:`, err.response?.data || err.message));

  } catch (err) {
    console.error('❌ /resend-code error:', err.message);
    return res.status(500).json({ message: err.message });
  }
});

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const userEmail = req.user.email;
    const userRole = req.user.role;

    console.log('👤 getMe called for user:', { userId, email: userEmail, role: userRole });

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('user_id, email, role, is_verified, is_active, created_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (userError) {
      console.error('Error fetching user:', userError.message);
      return res.status(500).json({ message: 'Database error' });
    }

    let profile = {};

    if (user) {
      if (userRole === 'student') {
        const { data } = await supabase.from('students').select('*').eq('user_id', userId).maybeSingle();
        profile = data || {};
      } else if (userRole === 'supervisor') {
        const { data } = await supabase.from('supervisors').select('*').eq('user_id', userId).maybeSingle();
        profile = data || {};
      } else if (userRole === 'host_org') {
        const { data } = await supabase.from('host_organizations').select('*').eq('user_id', userId).maybeSingle();
        profile = data || {};
      }
    } else {
      console.log('User not in DB, creating sync entry...');

      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({ email: userEmail, role: userRole || 'student', is_verified: true, is_active: true })
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting user:', insertError.message);
        return res.status(500).json({ message: 'Failed to sync user' });
      }

      return res.json({
        user_id: newUser.user_id,
        email: userEmail,
        role: userRole || 'student',
        permissions: getRolePermissions(userRole || 'student'),
      });
    }

    const permissions = getRolePermissions(user?.role || userRole);
    res.json({
      user_id: user.user_id,
      email: user.email,
      role: user.role,
      is_verified: user.is_verified,
      is_active: user.is_active,
      permissions,
      ...profile
    });

  } catch (err) {
    console.error('getMe error:', err.message);
    console.error('Stack:', err.stack);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;