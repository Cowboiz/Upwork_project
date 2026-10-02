import { describe, expect, it } from "vitest";
import { getAccountMenuItems } from "./account-menu";

describe("role-aware account menu", () => {
  it("points admin accounts to admin routes only", () => {
    const items = getAccountMenuItems("admin");

    expect(items).toEqual([
      { href: "/admin", label: "Admin dashboard" },
      { href: "/admin/profile", label: "Personal information" },
      { href: "/admin/settings", label: "Account settings" },
      { href: "/", label: "View public site" },
    ]);
    expect(items.some((item) => item.href.startsWith("/app"))).toBe(false);
  });

  it.each(["student", "freelancer", "both"] as const)(
    "keeps %s accounts away from admin routes",
    (role) => {
      const items = getAccountMenuItems(role);

      expect(items).toContainEqual({ href: "/app", label: "Dashboard" });
      expect(items.some((item) => item.href.startsWith("/admin"))).toBe(false);
    },
  );
});
