import type { Database } from "@/types/database.types";

export const USER_ROLES = ["student", "freelancer", "both", "admin"] as const;
export const APP_USER_ROLES = ["student", "freelancer", "both"] as const;
export const ACCOUNT_STATUSES = ["active", "deactivated"] as const;

export type UserRole = (typeof USER_ROLES)[number];
export type AppUserRole = (typeof APP_USER_ROLES)[number];
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export type AuthenticatedProfile = {
  accountStatus: AccountStatus;
  id: string;
  fullName: string | null;
  role: UserRole;
  username: string | null;
};

export type AuthenticatedUser = {
  id: string;
  email: string | null;
  profile: AuthenticatedProfile;
};

export type ProfileRow = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "account_status" | "full_name" | "id" | "role" | "username"
>;

const DEFAULT_USER_REDIRECT = "/app";
const ADMIN_REDIRECT = "/admin/requests";
const LOCAL_ORIGIN = "https://projectmatch.local";

export function isUserRole(role: string): role is UserRole {
  return USER_ROLES.includes(role as UserRole);
}

export function isAccountStatus(status: string): status is AccountStatus {
  return ACCOUNT_STATUSES.includes(status as AccountStatus);
}

export function isAppUserRole(role: string): role is AppUserRole {
  return APP_USER_ROLES.includes(role as AppUserRole);
}

export function normalizeUserRole(role: string): UserRole {
  if (isUserRole(role)) {
    return role;
  }

  return "student";
}

export function normalizeAccountStatus(status: string): AccountStatus {
  if (isAccountStatus(status)) {
    return status;
  }

  return "active";
}

export function canUseAppWorkspace({
  accountStatus,
  role,
}: {
  accountStatus: AccountStatus;
  role: UserRole;
}) {
  return role !== "admin" && accountStatus === "active";
}

export function canUseAuthenticatedLogin({
  accountStatus,
}: {
  accountStatus: AccountStatus;
  role: UserRole;
}) {
  return accountStatus === "active";
}

export function getPostLoginRedirect(
  rawRedirectTo: FormDataEntryValue | null | undefined,
  role: UserRole,
) {
  const fallback = role === "admin" ? ADMIN_REDIRECT : DEFAULT_USER_REDIRECT;

  if (typeof rawRedirectTo !== "string" || rawRedirectTo.length === 0) {
    return fallback;
  }

  try {
    const parsed = new URL(rawRedirectTo, LOCAL_ORIGIN);

    if (parsed.origin !== LOCAL_ORIGIN) {
      return fallback;
    }

    if (
      parsed.pathname === "/login" ||
      parsed.pathname.startsWith("/admin/login")
    ) {
      return fallback;
    }

    if (role === "admin") {
      return parsed.pathname.startsWith("/admin")
        ? `${parsed.pathname}${parsed.search}${parsed.hash}`
        : fallback;
    }

    if (parsed.pathname.startsWith("/admin")) {
      return fallback;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function getUserAppRedirectForRole(role: UserRole) {
  return role === "admin" ? ADMIN_REDIRECT : null;
}

export function getAdminAreaRedirectForRole(role: UserRole) {
  return role === "admin" ? null : DEFAULT_USER_REDIRECT;
}

export function getCanonicalLoginRedirectForAdminArea() {
  const params = new URLSearchParams({ next: ADMIN_REDIRECT });

  return `/login?${params.toString()}`;
}

export function toAuthenticatedProfile(profile: ProfileRow) {
  return {
    accountStatus: normalizeAccountStatus(profile.account_status),
    id: profile.id,
    fullName: profile.full_name,
    role: normalizeUserRole(profile.role),
    username: profile.username,
  } satisfies AuthenticatedProfile;
}
