const supabase = require('../config/db');

const ROLE_PERMISSION_KEYS = {
  student: ['editLogbooks', 'exportReports', 'selfPlacement'],
  supervisor: ['approvePlacements', 'editLogbooks', 'exportData'],
  host_org: ['postPlacements', 'viewAnalytics', 'editOrgProfile'],
};

const DEFAULT_ROLE_PERMISSIONS = {
  student: { editLogbooks: true, exportReports: false, selfPlacement: true },
  supervisor: { approvePlacements: true, editLogbooks: true, exportData: true },
  host_org: { postPlacements: true, viewAnalytics: true, editOrgProfile: false },
};

const pickRolePermissions = (role, source = {}) => {
  const keys = ROLE_PERMISSION_KEYS[role] || [];
  return keys.reduce((acc, key) => {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      acc[key] = Boolean(source[key]);
    }
    return acc;
  }, {});
};

const normalizeRolePermissions = (incoming = {}) => ({
  student: {
    ...DEFAULT_ROLE_PERMISSIONS.student,
    ...pickRolePermissions('student', incoming.student),
  },
  supervisor: {
    ...DEFAULT_ROLE_PERMISSIONS.supervisor,
    ...pickRolePermissions('supervisor', incoming.supervisor),
  },
  host_org: {
    ...DEFAULT_ROLE_PERMISSIONS.host_org,
    ...pickRolePermissions('host_org', incoming.host_org || incoming.hostOrg),
  },
});

const getRolePermissions = async (role) => {
  if (!role || role === 'admin') return {};
  if (!ROLE_PERMISSION_KEYS[role]) return {};

  const { data, error } = await supabase
    .from('role_permissions')
    .select('permissions')
    .eq('role', role)
    .maybeSingle();

  if (error) throw error;

  return normalizeRolePermissions({ [role]: data?.permissions || {} })[role];
};

const requireRolePermission = (permissionKey) => async (req, res, next) => {
  try {
    const role = req.user?.role;
    if (!role) return res.status(401).json({ message: 'Not authorized' });
    if (role === 'admin') return next();

    if (!ROLE_PERMISSION_KEYS[role]?.includes(permissionKey)) {
      return res.status(403).json({ message: 'Permission is not available for this role' });
    }

    const permissions = await getRolePermissions(role);
    req.rolePermissions = permissions;

    if (permissions[permissionKey] === false) {
      return res.status(403).json({
        message: `This action is disabled for ${role.replace('_', ' ')} users.`,
        permission: permissionKey,
      });
    }

    return next();
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Failed to check role permissions' });
  }
};

module.exports = {
  ROLE_PERMISSION_KEYS,
  DEFAULT_ROLE_PERMISSIONS,
  pickRolePermissions,
  normalizeRolePermissions,
  getRolePermissions,
  requireRolePermission,
};
