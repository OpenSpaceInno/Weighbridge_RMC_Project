export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  roleId: string;
  roleName: string;
  phone?: string;
  department?: string;
  shift?: string;
  status: 'active' | 'inactive' | 'suspended';
  avatar?: string;
  lastLogin?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  color: string;
  modules: string[];
  permissions: string[];
  isSystem: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthSession {
  user: User;
  role: Role;
  token: string;
  expiresAt: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: User;
  role: Role;
  message?: string;
}

export const DEMO_USERS = [
  { username: 'admin', name: 'Rajesh Sharma', roleName: 'Plant Head / Admin', roleId: 'admin', defaultPass: 'admin123', color: 'purple', department: 'Plant Operations Management' },
  { username: 'gate.security', name: 'Mahesh Patil', roleName: 'Gate Monitor / Security Officer', roleId: 'gate_operator', defaultPass: 'gate123', color: 'emerald', department: 'Security & Gate Control' },
  { username: 'weighbridge.op', name: 'Ramesh Kulkarni', roleName: 'Weighbridge In-charge', roleId: 'weighbridge_operator', defaultPass: 'scale123', color: 'blue', department: 'Weighbridge Operations' },
  { username: 'batching.supv', name: 'Anil Desai', roleName: 'Batching Plant Supervisor', roleId: 'batching_operator', defaultPass: 'batch123', color: 'amber', department: 'Concrete Batching & Loading' },
  { username: 'qc.inspector', name: 'Vikram Joshi', roleName: 'Quality Control Lead', roleId: 'qc_inspector', defaultPass: 'qc123', color: 'teal', department: 'Quality Assurance & Lab' },
  { username: 'dispatch.lead', name: 'Amitabh Verma', roleName: 'Dispatch & Logistics Officer', roleId: 'dispatch_officer', defaultPass: 'dispatch123', color: 'sky', department: 'Logistics & Dispatch Control' },
  { username: 'fleet.mgr', name: 'Sunil Shinde', roleName: 'Fleet & Workshop Manager', roleId: 'fleet_manager', defaultPass: 'fleet123', color: 'rose', department: 'Fleet & Mechanical Workshop' },
  { username: 'billing.acc', name: 'Pooja Hegde', roleName: 'Commercial & Accounts Lead', roleId: 'accounts_manager', defaultPass: 'billing123', color: 'indigo', department: 'Finance & Commercial Billing' },
];

/**
 * Checks if the given role has a specific permission.
 * 'all:manage' grants universal access.
 */
export function hasPermission(role: Role | null | undefined, permission: string): boolean {
  if (!role) return false;
  if (role.permissions.includes('all:manage')) return true;
  return role.permissions.includes(permission);
}

/**
 * Checks if the given role can access a specific route pathname.
 * Root dashboard '/' is always accessible if authenticated.
 * Admin with 'all:manage' has access to all routes.
 */
export function canAccessRoute(role: Role | null | undefined, path: string): boolean {
  if (!role) return false;
  if (path === '/' || path === '/login') return true;
  if (role.permissions.includes('all:manage')) return true;
  
  // Exact match or prefix match for sub-routes
  return role.modules.some(mod => {
    if (mod === path) return true;
    if (mod !== '/' && path.startsWith(mod)) return true;
    return false;
  });
}
