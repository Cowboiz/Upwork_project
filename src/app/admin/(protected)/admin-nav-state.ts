export type AdminNavSection =
  | "dashboard"
  | "ops"
  | "providers"
  | "requests"
  | "users";

export type AdminNavItem = {
  disabled?: boolean;
  href: string;
  label: string;
  section: AdminNavSection;
};

export const adminNavItems: readonly AdminNavItem[] = [
  { href: "/admin", label: "Dashboard", section: "dashboard" },
  { disabled: true, href: "/admin/users", label: "Users", section: "users" },
  { href: "/admin/requests", label: "Requests", section: "requests" },
  { href: "/admin/providers", label: "Providers", section: "providers" },
  { href: "/admin/ops", label: "Ops", section: "ops" },
] as const;

export function activeAdminSection(pathname: string): AdminNavSection {
  if (pathname === "/admin") {
    return "dashboard";
  }

  if (pathname === "/admin/users" || pathname.startsWith("/admin/users/")) {
    return "users";
  }

  if (pathname === "/admin/requests" || pathname.startsWith("/admin/requests/")) {
    return "requests";
  }

  if (
    pathname === "/admin/providers" ||
    pathname.startsWith("/admin/providers/")
  ) {
    return "providers";
  }

  if (pathname === "/admin/ops" || pathname.startsWith("/admin/ops/")) {
    return "ops";
  }

  return "dashboard";
}
