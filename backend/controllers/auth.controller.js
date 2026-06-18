const supabase = require('../config/db');
const { getRolePermissions } = require('../utils/rolePermissions');

/**
 * Since authentication is now handled by Supabase Auth on the frontend,
 * the backend controllers mainly focus on retrieving user profiles
 * and managing application-specific user data.
 */

// GET /api/auth/me
const getMe = async (req, res) => {
  try {
    // 1. Check if the user exists in our custom 'users' table
    let { data: user, error } = await supabase
      .from('users')
      .select(`
        user_id, email, role,
        students!students_user_id_fkey (full_name, reg_number, department, year_of_study, phone),
        supervisors!supervisors_user_id_fkey (full_name, department, phone),
        host_organizations!host_organizations_user_id_fkey (org_name, location, contact_person, available_slots)
      `)
      .eq('user_id', req.user.user_id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user from DB:', error.message);
      return res.status(500).json({ message: 'Database error' });
    }

    // 2. If user doesn't exist, they were likely created via Supabase Auth directly
    // We need to sync them to our 'users' table and potentially a profile table
    if (!user) {
      console.log('User not found in custom users table, syncing...', req.user.user_id);
      
      // Get full user info from Supabase Auth (already verified by middleware)
      const role = req.user.role || 'student';
      
      // Insert into our custom users table
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          user_id: req.user.user_id,
          email: req.user.email,
          role: role,
          is_verified: true, // They are authenticated via Supabase, so they are verified
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error syncing user to DB:', insertError.message);
        return res.status(500).json({ message: 'Failed to sync user profile' });
      }

      user = newUser;

      // Also create an empty profile record if it's a student/supervisor/host
      if (role === 'student') {
        await supabase.from('students').insert({ user_id: user.user_id, full_name: '', reg_number: '' });
      } else if (role === 'supervisor') {
        await supabase.from('supervisors').insert({ user_id: user.user_id, full_name: '' });
      } else if (role === 'host_org') {
        await supabase.from('host_organizations').insert({ user_id: user.user_id, org_name: '' });
      }
      
      // Re-fetch to get the profile structure
      const { data: syncedUser } = await supabase
        .from('users')
        .select(`
          user_id, email, role,
          students!students_user_id_fkey (full_name, reg_number, department, year_of_study, phone),
          supervisors!supervisors_user_id_fkey (full_name, department, phone),
          host_organizations!host_organizations_user_id_fkey (org_name, location, contact_person, available_slots)
        `)
        .eq('user_id', req.user.user_id)
        .single();
      user = syncedUser;
    }

    const profile =
      user.students?.[0] ||
      user.supervisors?.[0] ||
      user.host_organizations?.[0] ||
      {};

    const permissions = await getRolePermissions(user.role);

    res.json({ 
      user_id: user.user_id, 
      email: user.email, 
      role: user.role, 
      permissions, 
      ...profile 
    });
  } catch (err) {
    console.error('getMe error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

// Placeholder for other routes that might be called from the frontend
// but are now handled by Supabase client directly.
const register = async (req, res) => res.status(410).json({ message: 'Use Supabase Auth client for registration' });
const login = async (req, res) => res.status(410).json({ message: 'Use Supabase Auth client for login' });
const verifyEmail = async (req, res) => res.status(410).json({ message: 'Use Supabase Auth client for verification' });
const resendCode = async (req, res) => res.status(410).json({ message: 'Use Supabase Auth client for resending code' });
const refresh = async (req, res) => res.status(410).json({ message: 'Session refresh handled by Supabase client' });
const logout = async (req, res) => res.status(410).json({ message: 'Logout handled by Supabase client' });
const forgotPassword = async (req, res) => res.status(410).json({ message: 'Use Supabase Auth client for password reset' });
const resetPassword = async (req, res) => res.status(410).json({ message: 'Use Supabase Auth client for password reset' });

module.exports = { register, verifyEmail, resendCode, login, refresh, logout, forgotPassword, resetPassword, getMe };
