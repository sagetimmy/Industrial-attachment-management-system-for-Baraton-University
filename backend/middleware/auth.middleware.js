// backend/middleware/auth.middleware.js

const supabase = require('../config/db');

const getUserWithRetry = async (token, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await supabase.auth.getUser(token);
      return result;
    } catch (err) {
      const isNetworkError = err.code === 'ECONNRESET' || err.message === 'fetch failed';
      if (isNetworkError && i < retries - 1) {
        console.warn(`Auth network error, retrying (${i + 1}/${retries})...`);
        await new Promise(r => setTimeout(r, 500 * (i + 1)));
        continue;
      }
      throw err;
    }
  }
};

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    let authUser;
    try {
      const { data, error } = await getUserWithRetry(token);
      if (error || !data?.user) {
        return res.status(401).json({ message: 'Invalid or expired token' });
      }
      authUser = data.user;
    } catch (err) {
      console.error('Auth getUser failed after retries:', err.message);
      return res.status(503).json({ message: 'Authentication service temporarily unavailable. Please retry.' });
    }

    // Try lookup by auth_id first
    let { data: dbUser, error: dbError } = await supabase
      .from('users')
      .select('user_id, email, role, is_active, is_verified')
      .eq('auth_id', authUser.id)
      .maybeSingle();

    // Fallback: lookup by email (handles rows where auth_id was never set)
    if (!dbUser) {
      console.warn(`User not found by auth_id (${authUser.id}), trying email fallback...`);
      const { data: emailUser, error: emailError } = await supabase
        .from('users')
        .select('user_id, email, role, is_active, is_verified')
        .eq('email', authUser.email)
        .maybeSingle();

      if (emailUser) {
        dbUser = emailUser;

        // Backfill auth_id so future lookups work
        await supabase
          .from('users')
          .update({ auth_id: authUser.id })
          .eq('email', authUser.email);

        console.log(`Backfilled auth_id for user: ${authUser.email}`);
      }
    }

    if (!dbUser) {
      console.error(`User not found in DB — auth_id: ${authUser.id}, email: ${authUser.email}`);
      return res.status(401).json({ message: 'User not found in database' });
    }

    if (!dbUser.is_active) {
      return res.status(403).json({ message: 'Account is deactivated' });
    }

    req.user = {
      user_id: dbUser.user_id,
      email:   dbUser.email,
      role:    dbUser.role,
    };

    next();
  } catch (err) {
    console.error('Auth middleware error:', err.message);
    res.status(500).json({ message: 'Authentication error' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. Required role(s): ${roles.join(', ')}`,
      });
    }
    next();
  };
};

module.exports = { protect, authorize };