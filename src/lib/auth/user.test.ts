import { describe, expect, it } from "vitest";
import {
  getPostLoginRedirect,
  isUserRole,
  normalizeUserRole,
  toAuthenticatedProfile,
} from "./user-shared";

describe("normal user auth helpers", () => {
  it("recognizes supported profile roles", () => {
    expect(isUserRole("student")).toBe(true);
    expect(isUserRole("freelancer")).toBe(true);
    expect(isUserRole("both")).toBe(true);
    expect(isUserRole("admin")).toBe(true);
    expect(isUserRole("owner")).toBe(false);
  });

  it("normalizes unexpected role values to the least-privileged user role", () => {
    expect(normalizeUserRole("owner")).toBe("student");
  });

  it("maps an authenticated profile row without trusting client input", () => {
    expect(
      toAuthenticatedProfile({
        full_name: "Taylor Student",
        id: "profile-id",
        role: "both",
        username: "taylor",
      }),
    ).toEqual({
      fullName: "Taylor Student",
      id: "profile-id",
      role: "both",
      username: "taylor",
    });
  });

  it("keeps safe same-origin post-login routes", () => {
    expect(getPostLoginRedirect("/app?tab=profile", "student")).toBe(
      "/app?tab=profile",
    );
  });

  it("blocks open redirects after login", () => {
    expect(
      getPostLoginRedirect("https://example.com/phish", "student"),
    ).toBe("/app");
    expect(getPostLoginRedirect("//example.com/phish", "student")).toBe(
      "/app",
    );
  });

  it("routes admin profiles away from normal user login by default", () => {
    expect(getPostLoginRedirect(null, "admin")).toBe("/admin/requests");
  });

  it("does not trust an unexpected admin-like role value", () => {
    expect(
      toAuthenticatedProfile({
        full_name: null,
        id: "profile-id",
        role: "super_admin",
        username: null,
      }).role,
    ).toBe("student");
  });
});
