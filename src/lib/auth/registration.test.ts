import { describe, expect, it } from "vitest";
import {
  canSelfRegisterRole,
  getRegisterRedirectForRole,
  isSignupRole,
  normalizeSignupRole,
} from "./registration";

describe("registration role boundary", () => {
  it("allows only normal app roles during self-registration", () => {
    expect(isSignupRole("student")).toBe(true);
    expect(isSignupRole("freelancer")).toBe(true);
    expect(isSignupRole("both")).toBe(true);
    expect(isSignupRole("admin")).toBe(false);
  });

  it.each(["student", "freelancer", "both"] as const)(
    "accepts %s as a self-registration role",
    (role) => {
      expect(normalizeSignupRole(role)).toBe(role);
      expect(canSelfRegisterRole(role)).toBe(true);
    },
  );

  it("falls back to student for invalid or privileged roles", () => {
    expect(normalizeSignupRole("admin")).toBe("student");
    expect(normalizeSignupRole("operator")).toBe("student");
    expect(normalizeSignupRole(null)).toBe("student");
  });

  it("does not allow admin self-registration", () => {
    expect(canSelfRegisterRole("admin")).toBe(false);
  });

  it("routes authenticated users away from registration safely", () => {
    expect(getRegisterRedirectForRole("student")).toBe("/app");
    expect(getRegisterRedirectForRole("freelancer")).toBe("/app");
    expect(getRegisterRedirectForRole("both")).toBe("/app");
    expect(getRegisterRedirectForRole("admin")).toBe("/admin");
  });
});
