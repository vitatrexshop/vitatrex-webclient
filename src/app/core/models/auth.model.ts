export type UserRole = 'admin' | 'superadmin';

/** Authenticated admin user (returned by login / JWT payload) */
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive?: boolean;
  createdAt?: string;
}

/**
 * Full admin user document as returned by /api/v1/users/admins.
 * Includes `_id` (MongoDB format) and `isActive` flag.
 */
export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Response shape from POST /api/v1/auth/login */
export interface LoginResponse {
  success: boolean;
  message: string;
  accessToken: string;
  data: {
    user: User;
  };
}

/** Response shape from POST /api/v1/auth/refresh */
export interface RefreshResponse {
  success: boolean;
  message: string;
  accessToken: string;
}

/** Payload for creating a new admin account (SuperAdmin only) */
export interface CreateAdminPayload {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

/** Partial update payload for PATCH /api/v1/users/admins/:id */
export interface UpdateAdminPayload {
  name?: string;
  email?: string;
  role?: UserRole;
  isActive?: boolean;
}
