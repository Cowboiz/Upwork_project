import { describe, expect, it } from "vitest";
import { activeAdminSection } from "./admin-nav-state";

describe("admin active navigation", () => {
  it.each([
    ["/admin", "dashboard"],
    ["/admin/users", "users"],
    ["/admin/users/user-id", "users"],
    ["/admin/requests", "requests"],
    ["/admin/requests/request-id", "requests"],
    ["/admin/providers", "providers"],
    ["/admin/providers/provider-id", "providers"],
    ["/admin/ops", "ops"],
  ] as const)("maps %s to %s", (pathname, section) => {
    expect(activeAdminSection(pathname)).toBe(section);
  });

  it("avoids false active matches for similarly prefixed routes", () => {
    expect(activeAdminSection("/admin/requested")).toBe("dashboard");
    expect(activeAdminSection("/admin/users-old")).toBe("dashboard");
    expect(activeAdminSection("/admin/providers-old")).toBe("dashboard");
    expect(activeAdminSection("/admin/ops-notes")).toBe("dashboard");
  });
});
