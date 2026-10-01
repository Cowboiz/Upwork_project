import { describe, expect, it } from "vitest";
import {
  getAdminAreaRedirectForRole,
  getCanonicalLoginRedirectForAdminArea,
  getPostLoginRedirect,
  getUserAppRedirectForRole,
  isAppUserRole,
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

  it("recognizes roles allowed in the normal app area", () => {
    expect(isAppUserRole("student")).toBe(true);
    expect(isAppUserRole("freelancer")).toBe(true);
    expect(isAppUserRole("both")).toBe(true);
    expect(isAppUserRole("admin")).toBe(false);
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

  it.each(["student", "freelancer", "both"] as const)(
    "routes %s login to the app by default",
    (role) => {
      expect(getPostLoginRedirect(null, role)).toBe("/app");
    },
  );

  it("routes admin login to admin requests by default", () => {
    expect(getPostLoginRedirect(null, "admin")).toBe("/admin/requests");
  });

  it("keeps safe same-origin post-login routes for app users", () => {
    expect(getPostLoginRedirect("/app?tab=profile", "student")).toBe(
      "/app?tab=profile",
    );
  });

  it("blocks normal users from crossing into admin through next", () => {
    expect(getPostLoginRedirect("/admin/requests", "student")).toBe("/app");
    expect(getPostLoginRedirect("/admin/ops", "freelancer")).toBe("/app");
    expect(getPostLoginRedirect("/admin", "both")).toBe("/app");
  });

  it("keeps admin post-login redirects inside the admin area", () => {
    expect(getPostLoginRedirect("/admin/ops", "admin")).toBe("/admin/ops");
    expect(getPostLoginRedirect("/app", "admin")).toBe("/admin/requests");
    expect(getPostLoginRedirect("/request", "admin")).toBe("/admin/requests");
  });

  it("blocks open redirects after login", () => {
    expect(
      getPostLoginRedirect("https://example.com/phish", "student"),
    ).toBe("/app");
    expect(getPostLoginRedirect("//example.com/phish", "student")).toBe(
      "/app",
    );
  });

  it("prevents login route redirect loops", () => {
    expect(getPostLoginRedirect("/login", "student")).toBe("/app");
    expect(getPostLoginRedirect("/admin/login", "admin")).toBe(
      "/admin/requests",
    );
  });

  it("redirects admin profiles away from the normal app guard", () => {
    expect(getUserAppRedirectForRole("admin")).toBe("/admin/requests");
    expect(getUserAppRedirectForRole("student")).toBeNull();
  });

  it("redirects authenticated normal users away from the admin guard", () => {
    expect(getAdminAreaRedirectForRole("student")).toBe("/app");
    expect(getAdminAreaRedirectForRole("freelancer")).toBe("/app");
    expect(getAdminAreaRedirectForRole("both")).toBe("/app");
    expect(getAdminAreaRedirectForRole("admin")).toBeNull();
  });

  it("uses canonical login for unauthenticated admin-area access", () => {
    expect(getCanonicalLoginRedirectForAdminArea()).toBe(
      "/login?next=%2Fadmin%2Frequests",
    );
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
