/**
 * Role-based permission definitions.
 *
 * Admin: Full access to everything
 * Employee: Configurator, Documents, Blanko-PDF, E-Mail
 */

export type UserRole = 'admin' | 'employee'

export const PERMISSIONS = {
  // Dashboard
  'dashboard:view': ['admin', 'employee'] as UserRole[],

  // Configurator
  'configurator:use': ['admin', 'employee'] as UserRole[],
  'configurator:createDocument': ['admin', 'employee'] as UserRole[],
  'configurator:editDocument': ['admin', 'employee'] as UserRole[],

  // Documents
  'documents:view': ['admin', 'employee'] as UserRole[],
  'documents:sendEmail': ['admin', 'employee'] as UserRole[],
  'documents:generatePdf': ['admin', 'employee'] as UserRole[],
  'documents:generateBlankPdf': ['admin', 'employee'] as UserRole[],

  // Admin: Catalog
  'catalog:manage': ['admin'] as UserRole[],

  // Admin: Settings
  'settings:manage': ['admin'] as UserRole[],

  // Admin: Users
  'users:manage': ['admin'] as UserRole[],

  // Admin: Customers
  'customers:manage': ['admin'] as UserRole[],
} as const

export type Permission = keyof typeof PERMISSIONS

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return PERMISSIONS[permission].includes(role)
}
