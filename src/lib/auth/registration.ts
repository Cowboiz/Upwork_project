import {
  APP_USER_ROLES,
  type AppUserRole,
  type UserRole,
} from "./user-shared";

export const DEFAULT_SIGNUP_ROLE = "student" satisfies AppUserRole;

export function isSignupRole(role: string): role is AppUserRole {
  return APP_USER_ROLES.includes(role as AppUserRole);
}

export function normalizeSignupRole(role: string | null | undefined) {
  if (typeof role === "string" && isSignupRole(role)) {
    return role;
  }

  return DEFAULT_SIGNUP_ROLE;
}

export function canSelfRegisterRole(role: UserRole) {
  return isSignupRole(role);
}

export function getRegisterRedirectForRole(role: UserRole) {
  return role === "admin" ? "/admin" : "/app";
}
