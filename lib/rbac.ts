import type { Role } from "@/app/generated/prisma/enums"

const ROLE_HIERARCHY: Record<Role, number> = {
  VIEWER: 0,
  EDITOR: 1,
  ADMIN: 2,
}

export function hasRole(userRole: Role, required: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[required]
}

export function canManageUsers(role: Role) {
  return role === "ADMIN"
}

export function canManageProperties(role: Role) {
  return hasRole(role, "ADMIN")
}

export function canExportData(role: Role) {
  return hasRole(role, "VIEWER")
}
