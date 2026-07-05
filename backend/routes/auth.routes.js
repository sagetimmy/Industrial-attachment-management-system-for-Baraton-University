const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { registrationLimiter, verificationLimiter } = require('../middleware/rateLimiter');
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

const rollbackRegistration = async ({ auth_id, user_id, email }) => {
  if (user_id) {
    await supabase.from('students').delete().eq('user_id', user_id);
    await supabase.from('supervisors').delete().eq('user_id', user_id);
    await supabase.from('host_organizations').delete().eq('user_id', user_id);
    await supabase.from('users').delete().eq('user_id', user_id);
  }

  if (auth_id) {
    await supabase.auth.admin.deleteUser(auth_id);
  }

  if (email) {
    await supabase.from('password_reset_codes').delete().eq('email', email);
  }
};

// POST /api/auth/register
router.post('/register', registrationLimiter, async (req, res) => {
  const { email, password, role, full_name } = req.body;
  let auth_id = null;

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

    auth_id = data.user?.id;
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
    if (auth_id) {
      await supabase.auth.admin.deleteUser(auth_id);
    }
    console.error('❌ /register unexpected error:', err.message);
    return res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/register-profile
router.post('/register-profile', registrationLimiter, async (req, res) => {
  const {
    auth_id, email, role, full_name, reg_number,
    department, course, year_of_study, phone,
    org_name, location, contact_person, available_slots,
    // Admin-specific fields
    is_super_admin, permissions,
  } = req.body;
  let createdUserId = null;

  if (!auth_id || !email || !role) {
    return res.status(400).json({ message: 'auth_id, email, and role are required' });
  }

  try {
    // Build the users row — include is_super_admin for admin role
    const userInsert = {
      email,
      password: 'supabase_auth_managed',
      role,
      auth_id,
      is_verified: false,
      is_active: true,
    };

    if (role === 'admin') {
      userInsert.is_super_admin = is_super_admin === true;
    }

    const { data: newUser, error: dbError } = await supabase
      .from('users')
      .insert(userInsert)
      .select()
      .single();

    if (dbError) throw dbError;
    createdUserId = newUser.user_id;

    if (role === 'student') {
      const { error } = await supabase.from('students')
        .insert({ user_id: newUser.user_id, full_name, reg_number, department, course, year_of_study: year_of_study || 1, phone });
      if (error) throw error;
    } else if (role === 'supervisor') {
      const { error } = await supabase.from('supervisors')
        .insert({ user_id: newUser.user_id, full_name, department, phone });
      if (error) throw error;
    } else if (role === 'host_org') {
      const { data: newOrg, error } = await supabase.from('host_organizations')
        .insert({
          user_id: newUser.user_id,
          org_name,
          location,
          contact_person,
          phone,
          available_slots: available_slots ?? 0,
        })
        .select()
        .single();
      if (error) throw error;

      // Write org_id back to users row
      const { error: orgIdError } = await supabase
        .from('users')
        .update({ org_id: newOrg.org_id })
        .eq('user_id', newUser.user_id);
      if (orgIdError) throw orgIdError;
    }
    // admin role: no separate profile table — everything lives on users row

    res.status(201).json({ message: 'Profile created successfully', user_id: newUser.user_id });
  } catch (err) {
    console.error('❌ /register-profile error:', err.message);
    await rollbackRegistration({ auth_id, user_id: createdUserId, email });
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/verify-email
router.post('/verify-email', verificationLimiter, async (req, res) => {
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

    const { error: updateError } = await supabase
      .from('users')
      .update({ is_verified: true })
      .eq('email', email);

    if (updateError) {
      return res.status(500).json({ message: 'Failed to verify user' });
    }

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

    await supabase.from('password_reset_codes').delete().eq('email', email);

    console.log(`✅ Email verified for ${email}`);
    return res.status(200).json({ message: 'Email verified successfully' });
  } catch (err) {
    console.error('❌ /verify-email error:', err.message);
    return res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/resend-code
router.post('/resend-code', verificationLimiter, async (req, res) => {
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
      const [{ data: student }, { data: supervisor }, { data: hostOrg }] = await Promise.all([
        supabase.from('students').select('full_name').eq('user_id', user.user_id).maybeSingle(),
        supabase.from('supervisors').select('full_name').eq('user_id', user.user_id).maybeSingle(),
        supabase.from('host_organizations').select('org_name').eq('user_id', user.user_id).maybeSingle(),
      ]);

      if (student?.full_name) fullName = student.full_name;
      else if (supervisor?.full_name) fullName = supervisor.full_name;
      else if (hostOrg?.org_name) fullName = hostOrg.org_name;
    }

    res.status(200).json({ message: 'Verification code resent' });

    sendVerificationEmail(email, fullName, otp)
      .then(() => console.log(`✅ Resend email sent to ${email}`))
      .catch(err => console.error(`❌ Resend email failed:`, err.response?.data || err.message));

  } catch (err) {
    console.error('❌ /resend-code error:', err.message);
    return res.status(500).json({ message: err.message });
  }
});

// DELETE /api/auth/users/:auth_id
router.delete('/users/:auth_id', protect, async (req, res) => {
  const { auth_id } = req.params;

  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admins only.' });
  }

  try {
    const { data: dbUser, error: fetchError } = await supabase
      .from('users')
      .select('user_id, role, email')
      .eq('auth_id', auth_id)
      .maybeSingle();

    if (fetchError || !dbUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { user_id, role, email } = dbUser;

    if (role === 'student') {
      await supabase.from('students').delete().eq('user_id', user_id);
    } else if (role === 'supervisor') {
      await supabase.from('supervisors').delete().eq('user_id', user_id);
    } else if (role === 'host_org') {
      await supabase.from('host_organizations').delete().eq('user_id', user_id);
    }

    await supabase.from('password_reset_codes').delete().eq('email', email);
    await supabase.from('users').delete().eq('user_id', user_id);

    const { error: authError } = await supabase.auth.admin.deleteUser(auth_id);
    if (authError) {
      console.error('❌ Auth delete error:', authError.message);
      return res.status(500).json({ message: 'Failed to delete auth user' });
    }

    console.log(`✅ User deleted: ${email} (auth_id: ${auth_id})`);
    return res.status(200).json({ message: 'User deleted successfully' });

  } catch (err) {
    console.error('❌ /delete user error:', err.message);
    return res.status(500).json({ message: err.message });
  }
});

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  try {
    const userId    = req.user.user_id;
    const userEmail = req.user.email;
    const userRole  = req.user.role;

    console.log('👤 getMe called for user:', { userId, email: userEmail, role: userRole });

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('user_id, email, role, is_verified, is_active, is_super_admin, created_at, avatar_url')
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
        user_id:    newUser.user_id,
        email:      userEmail,
        role:       userRole || 'student',
        permissions: getRolePermissions(userRole || 'student'),
      });
    }

    const permissions = getRolePermissions(user?.role || userRole);
    res.json({
      user_id:       user.user_id,
      email:         user.email,
      role:          user.role,
      is_verified:   user.is_verified,
      is_active:     user.is_active,
      is_super_admin: user.is_super_admin ?? false,
      avatar_url:    user.avatar_url ?? null,
      permissions,
  
      ...profile,
    });

  } catch (err) {
    console.error('getMe error:', err.message);
    console.error('Stack:', err.stack);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;