import type { AuthenticatedUser } from "./user-shared";

export function getAccountDisplayName(user: AuthenticatedUser) {
  return (
    user.profile.fullName ??
    user.profile.username ??
    user.email ??
    "ProjectMatch account"
  );
}

export function getAccountRoleLabel(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}
