export type AdminNavSection = "dashboard" | "ops" | "providers" | "requests";

export type AdminNavItem = {
  href: string;
  label: string;
  section: AdminNavSection;
};

export const adminNavItems = [
  { href: "/admin", label: "Dashboard", section: "dashboard" },
  { href: "/admin/requests", label: "Requests", section: "requests" },
  { href: "/admin/providers", label: "Providers", section: "providers" },
  { href: "/admin/ops", label: "Ops", section: "ops" },
] as const satisfies readonly AdminNavItem[];

export function activeAdminSection(pathname: string): AdminNavSection {
  if (pathname === "/admin") {
    return "dashboard";
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
