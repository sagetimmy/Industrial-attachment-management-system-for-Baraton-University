// backend/controllers/auth.controller.js
const supabase = require('../config/db');

// Helper: get role permissions
const getRolePermissions = (role) => {
  // Define permissions based on role
  const permissions = {
    admin: ['view_all', 'edit_all', 'manage_users', 'manage_attachments', 'manage_orgs', 'view_reports'],
    supervisor: ['view_students', 'review_logbooks', 'manage_evaluations', 'view_reports'],
    student: ['view_own_profile', 'submit_logbook', 'apply_attachment', 'view_feedback'],
    host_org: ['view_own_org', 'manage_slots', 'view_applications', 'manage_placements']
  };
  return permissions[role] || [];
};

// GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const userEmail = req.user.email;
    const userRole = req.user.role;

    console.log('👤 getMe called for user:', { userId, email: userEmail, role: userRole });

    // 1. Get the user from the users table (no joins)
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
    let profileError = null;

    if (user) {
      // 2. Fetch profile based on role
      if (userRole === 'student') {
        const { data, error } = await supabase
          .from('students')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
        profile = data || {};
        profileError = error;
      } else if (userRole === 'supervisor') {
        const { data, error } = await supabase
          .from('supervisors')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
        profile = data || {};
        profileError = error;
      } else if (userRole === 'host_org') {
        const { data, error } = await supabase
          .from('host_organizations')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
        profile = data || {};
        profileError = error;
      }

      if (profileError) {
        console.error('Error fetching profile:', profileError.message);
        // Continue without profile if not found
      }
    } else {
      // 3. User not found in users table – sync from Supabase Auth
      console.log('User not in DB, creating sync entry...');

      // Insert into users table
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          user_id: userId,
          email: userEmail,
          role: userRole || 'student',
          is_verified: true,
          is_active: true
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting user:', insertError.message);
        return res.status(500).json({ message: 'Failed to sync user' });
      }

      // Insert empty profile record
      if (userRole === 'student') {
        await supabase.from('students').insert({ user_id: userId, full_name: '', reg_number: '' });
      } else if (userRole === 'supervisor') {
        await supabase.from('supervisors').insert({ user_id: userId, full_name: '' });
      } else if (userRole === 'host_org') {
        await supabase.from('host_organizations').insert({ user_id: userId, org_name: '' });
      }

      // Return the synced user (without re-fetching)
      return res.json({
        user_id: userId,
        email: userEmail,
        role: userRole || 'student',
        permissions: getRolePermissions(userRole || 'student'),
      });
    }

    // 4. Build response
    const permissions = getRolePermissions(user.role);
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
};

// Placeholder for other routes (keep as-is)
const register = async (req, res) => res.status(410).json({ message: 'Use Supabase Auth client for registration' });
const verifyEmail = async (req, res) => res.status(410).json({ message: 'Use Supabase Auth client for verification' });
const resendCode = async (req, res) => res.status(410).json({ message: 'Use Supabase Auth client for resending code' });
const login = async (req, res) => res.status(410).json({ message: 'Use Supabase Auth client for login' });
const refresh = async (req, res) => res.status(410).json({ message: 'Session refresh handled by Supabase client' });
const logout = async (req, res) => res.status(410).json({ message: 'Logout handled by Supabase client' });
const forgotPassword = async (req, res) => res.status(410).json({ message: 'Use Supabase Auth client for password reset' });
const resetPassword = async (req, res) => res.status(410).json({ message: 'Use Supabase Auth client for password reset' });

module.exports = { register, verifyEmail, resendCode, login, refresh, logout, forgotPassword, resetPassword, getMe };