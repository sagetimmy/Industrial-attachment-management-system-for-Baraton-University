const supabase = require('../config/db');

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorized' });
  }
  
  try {
    const token = authHeader.split(' ')[1];
    
    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ message: 'Token invalid or expired' });
    }
    
    // Map Supabase user to the format expected by our controllers
    // We assume the Supabase user ID is used as user_id in our DB
    req.user = {
      user_id: user.id,
      email: user.email,
      role: user.user_metadata?.role || 'student',
    };
    
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(401).json({ message: 'Authentication failed' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  next();
};

module.exports = { protect, authorize };
