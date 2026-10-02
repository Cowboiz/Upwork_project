import type { UserRole } from "./user-shared";

export type AccountMenuItem = {
  href: string;
  label: string;
};

export function getAccountMenuItems(role: UserRole): AccountMenuItem[] {
  if (role === "admin") {
    return [
      { href: "/admin", label: "Admin dashboard" },
      { href: "/admin/profile", label: "Personal information" },
      { href: "/admin/settings", label: "Account settings" },
      { href: "/", label: "View public site" },
    ];
  }

  return [
    { href: "/app", label: "Dashboard" },
    { href: "/app/profile", label: "Personal information" },
    { href: "/app/settings", label: "Account settings" },
    { href: "/", label: "View home" },
  ];
}
