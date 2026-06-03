export const hasRolePermission = (user, permissionKey) => {
  if (!permissionKey) return true;
  if (!user || user.role === 'admin') return true;
  if (!user.permissions || !Object.prototype.hasOwnProperty.call(user.permissions, permissionKey)) {
    return true;
  }
  return user.permissions[permissionKey] !== false;
};
