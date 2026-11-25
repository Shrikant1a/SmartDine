import {
  ROLE_HOME_ROUTES,
  ROLE_PERMISSIONS,
  type Permission,
  type StaffRole,
} from "@/constants/roles";

export function hasRole(userRole: StaffRole, allowedRoles: readonly StaffRole[]): boolean {
  return allowedRoles.includes(userRole);
}

export function hasPermission(userRole: StaffRole, permission: Permission): boolean {
  const allowed: readonly StaffRole[] = ROLE_PERMISSIONS[permission];
  return allowed.includes(userRole);
}

export function getHomeRouteForRole(role: StaffRole): string {
  return ROLE_HOME_ROUTES[role] ?? "/login";
}

export function canAccessRoutePrefix(role: StaffRole, pathname: string): boolean {
  if (pathname.startsWith("/admin/staff") || pathname.startsWith("/admin/settings")) {
    // Manager can view settings/staff pages, owner has full management; kitchen/waiter blocked
    return role === "owner" || role === "manager";
  }
  if (pathname.startsWith("/admin")) {
    return role === "owner" || role === "manager";
  }
  if (pathname.startsWith("/kitchen")) {
    return role === "owner" || role === "manager" || role === "kitchen";
  }
  if (pathname.startsWith("/waiter")) {
    return role === "owner" || role === "manager" || role === "waiter";
  }
  return true;
}
