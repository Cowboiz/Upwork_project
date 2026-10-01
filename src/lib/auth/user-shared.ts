import type { Database } from "@/types/database.types";

export const USER_ROLES = ["student", "freelancer", "both", "admin"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export type AuthenticatedProfile = {
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
  "full_name" | "id" | "role" | "username"
>;

const DEFAULT_USER_REDIRECT = "/app";
const ADMIN_REDIRECT = "/admin/requests";
const LOCAL_ORIGIN = "https://projectmatch.local";

export function isUserRole(role: string): role is UserRole {
  return USER_ROLES.includes(role as UserRole);
}

export function normalizeUserRole(role: string): UserRole {
  if (isUserRole(role)) {
    return role;
  }

  return "student";
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

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function toAuthenticatedProfile(profile: ProfileRow) {
  return {
    id: profile.id,
    fullName: profile.full_name,
    role: normalizeUserRole(profile.role),
    username: profile.username,
  } satisfies AuthenticatedProfile;
}
