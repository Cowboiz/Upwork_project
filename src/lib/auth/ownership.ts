import type { AuthenticatedUser, UserRole } from "./user-shared";

export function canOwnProjectRequest(role: UserRole) {
  return role === "student" || role === "both";
}

export function canOwnProviderApplication(role: UserRole) {
  return role === "freelancer" || role === "both";
}

export function linkedStudentProfileIdFor(user: AuthenticatedUser | null) {
  if (
    !user ||
    user.profile.accountStatus !== "active" ||
    !canOwnProjectRequest(user.profile.role)
  ) {
    return null;
  }

  return user.profile.id;
}

export function linkedProviderProfileIdFor(user: AuthenticatedUser | null) {
  if (
    !user ||
    user.profile.accountStatus !== "active" ||
    !canOwnProviderApplication(user.profile.role)
  ) {
    return null;
  }

  return user.profile.id;
}
