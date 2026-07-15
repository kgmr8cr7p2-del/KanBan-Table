import { PermissionKey } from "@prisma/client";
import type { CurrentUser } from "@/lib/auth";

export const SYSTEM_ROLE_KEYS = {
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  EXECUTOR: "EXECUTOR",
} as const;

type RoleWithPermissions = {
  systemKey: string | null;
  permissions: PermissionKey[];
};

export function roleHasPermission(role: RoleWithPermissions, permission: PermissionKey) {
  if (role.systemKey === SYSTEM_ROLE_KEYS.ADMIN) return true;
  return role.permissions.includes(permission);
}

export function hasPermission(user: CurrentUser, permission: PermissionKey) {
  return roleHasPermission(user.role, permission);
}

export function hasAnyPermission(user: CurrentUser, permissions: PermissionKey[]) {
  return permissions.some((permission) => hasPermission(user, permission));
}
