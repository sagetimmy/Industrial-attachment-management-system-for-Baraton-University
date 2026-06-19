const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const supabase = require('../config/db');

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

// Helper: retry async function
const retry = async (fn, retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      console.log(`⚠️ Retry ${i + 1}/${retries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  console.log(`[register:${requestId}] Starting registration`);

  try {
    const {
      email, password, role, full_name, reg_number,
      department, year_of_study, phone,
      org_name, location, contact_person
    } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ message: 'Email, password, and role are required' });
    }

    console.log(`[register:${requestId}] Calling Supabase Auth signUp with retries...`);

    const { data, error: authError } = await retry(
      () => supabase.auth.signUp({
        email,
        password,
        options: {
          data: { role, full_name },
          emailRedirectTo: 'http://localhost:3000/verify'
        }
      }),
      3,
      2000
    );

    if (authError) {
      console.error(`[register:${requestId}] Supabase Auth error:`, authError);
      if (authError.message.includes('User already registered')) {
        return res.status(409).json({ message: 'Email already registered. Please log in.' });
      }
      return res.status(400).json({ message: authError.message });
    }

    if (!data.user) {
      console.error(`[register:${requestId}] No user returned from auth`);
      return res.status(500).json({ message: 'Failed to create user in authentication system' });
    }

    console.log(`[register:${requestId}] Auth user created:`, data.user.id);

    const { data: newUser, error: dbError } = await supabase
      .from('users')
      .insert({
        email,
        password: 'supabase_auth_managed',
        role,
        auth_id: data.user.id,
        is_verified: false,
        is_active: true
      })
      .select()
      .single();

    if (dbError) {
      console.error(`[register:${requestId}] Database insert error:`, dbError);
      try { await supabase.auth.admin.deleteUser(data.user.id); } catch (e) {}
      return res.status(500).json({ message: 'Failed to create user profile', error: dbError.message });
    }

    console.log(`[register:${requestId}] User inserted into users table:`, newUser.user_id);

    let roleData = null;

    if (role === 'student') {
      if (!reg_number) {
        return res.status(400).json({ message: 'Registration number is required for students' });
      }
      const { data: student, error: studentError } = await supabase
        .from('students')
        .insert({ user_id: newUser.user_id, full_name, reg_number, department, year_of_study: year_of_study || 1, phone })
        .select()
        .single();

      if (studentError) {
        console.error(`[register:${requestId}] Student insert error:`, studentError);
        await supabase.from('users').delete().eq('user_id', newUser.user_id);
        try { await supabase.auth.admin.deleteUser(data.user.id); } catch (e) {}
        return res.status(500).json({ message: 'Failed to create student record', error: studentError.message });
      }
      roleData = student;

    } else if (role === 'supervisor') {
      const { data: supervisor, error: supError } = await supabase
        .from('supervisors')
        .insert({ user_id: newUser.user_id, full_name, department, phone })
        .select()
        .single();

      if (supError) {
        console.error(`[register:${requestId}] Supervisor insert error:`, supError);
        await supabase.from('users').delete().eq('user_id', newUser.user_id);
        try { await supabase.auth.admin.deleteUser(data.user.id); } catch (e) {}
        return res.status(500).json({ message: 'Failed to create supervisor record', error: supError.message });
      }
      roleData = supervisor;

    } else if (role === 'host_org') {
      if (!org_name) {
        return res.status(400).json({ message: 'Organization name is required for host organizations' });
      }
      const { data: org, error: orgError } = await supabase
        .from('host_organizations')
        .insert({ user_id: newUser.user_id, org_name, location, contact_person, phone, is_approved: false, available_slots: 0 })
        .select()
        .single();

      if (orgError) {
        console.error(`[register:${requestId}] Host org insert error:`, orgError);
        await supabase.from('users').delete().eq('user_id', newUser.user_id);
        try { await supabase.auth.admin.deleteUser(data.user.id); } catch (e) {}
        return res.status(500).json({ message: 'Failed to create host organization record', error: orgError.message });
      }
      roleData = org;
    }

    console.log(`[register:${requestId}] Registration successful for ${email}`);
    res.status(201).json({
      message: 'User registered successfully. Please verify your email.',
      user: newUser,
      role_data: roleData
    });

  } catch (err) {
    console.error(`[register:${requestId}] Unhandled error:`, err);
    if (err.message && err.message.includes('timeout')) {
      return res.status(504).json({ message: 'Registration service is temporarily unavailable. Please try again later.' });
    }
    res.status(500).json({ message: err.message || 'Registration failed' });
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
        .insert({ user_id: userId, email: userEmail, role: userRole || 'student', is_verified: true, is_active: true })
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting user:', insertError.message);
        return res.status(500).json({ message: 'Failed to sync user' });
      }

      if (userRole === 'student') {
        await supabase.from('students').insert({ user_id: userId, full_name: '', reg_number: '' });
      } else if (userRole === 'supervisor') {
        await supabase.from('supervisors').insert({ user_id: userId, full_name: '' });
      } else if (userRole === 'host_org') {
        await supabase.from('host_organizations').insert({ user_id: userId, org_name: '' });
      }

      return res.json({
        user_id: userId,
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