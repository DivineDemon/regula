/**
 * Role-based access control (RBAC) definitions
 */

export enum UserRole {
  ADMIN = "admin",
  ANALYST = "analyst",
  VIEWER = "viewer",
}

export type UserRoleType = (typeof UserRole)[keyof typeof UserRole];

/**
 * Role hierarchy: Admin > Analyst > Viewer
 * Higher roles have all permissions of lower roles
 */
export const roleHierarchy: Record<UserRole, number> = {
  [UserRole.ADMIN]: 3,
  [UserRole.ANALYST]: 2,
  [UserRole.VIEWER]: 1,
};

/**
 * Check if a role has permission for another role's actions
 */
export function hasRolePermission(
  userRole: UserRole,
  requiredRole: UserRole,
): boolean {
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

/**
 * Check if user can perform admin actions
 */
export function isAdmin(role: UserRole): boolean {
  return role === UserRole.ADMIN;
}

/**
 * Check if user can perform analyst actions (includes admin)
 */
export function isAnalystOrAbove(role: UserRole): boolean {
  return role === UserRole.ADMIN || role === UserRole.ANALYST;
}

/**
 * Check if user can view content (all roles can view)
 */
export function canView(_role: UserRole): boolean {
  return true; // All roles can view
}

/**
 * Permissions matrix
 */
export const permissions = {
  // Target management
  createTarget: (role: UserRole) => isAnalystOrAbove(role),
  editTarget: (role: UserRole) => isAnalystOrAbove(role),
  deleteTarget: (role: UserRole) => isAdmin(role),

  // Alert management
  viewAlerts: (role: UserRole) => canView(role),
  assignAlerts: (role: UserRole) => isAnalystOrAbove(role),
  updateAlertStatus: (role: UserRole) => isAnalystOrAbove(role),
  commentOnAlerts: (role: UserRole) => isAnalystOrAbove(role),

  // Organization management
  inviteMembers: (role: UserRole) => isAdmin(role),
  removeMembers: (role: UserRole) => isAdmin(role),
  updateMemberRoles: (role: UserRole) => isAdmin(role),
  updateOrganizationSettings: (role: UserRole) => isAdmin(role),

  // Billing
  viewBilling: (role: UserRole) => isAdmin(role),
  updateBilling: (role: UserRole) => isAdmin(role),

  // Audit logs
  viewAuditLogs: (role: UserRole) => isAdmin(role),

  // Export
  exportData: (role: UserRole) => isAnalystOrAbove(role),
} as const;
