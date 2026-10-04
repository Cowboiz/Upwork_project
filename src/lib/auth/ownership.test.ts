import { describe, expect, it } from "vitest";
import {
  canOwnProjectRequest,
  canOwnProviderApplication,
  linkedProviderProfileIdFor,
  linkedStudentProfileIdFor,
} from "./ownership";
import type { AccountStatus, AuthenticatedUser, UserRole } from "./user-shared";

function userWithRole(
  role: UserRole,
  accountStatus: AccountStatus = "active",
): AuthenticatedUser {
  return {
    email: "user@example.test",
    id: `${role}-user-id`,
    profile: {
      accountStatus,
      fullName: null,
      id: `${role}-profile-id`,
      role,
      username: null,
    },
  };
}

describe("ownership role eligibility", () => {
  it.each([
    ["student", true, false],
    ["freelancer", false, true],
    ["both", true, true],
    ["admin", false, false],
  ] as const)(
    "maps %s to request=%s provider=%s",
    (role, requestEligible, providerEligible) => {
      expect(canOwnProjectRequest(role)).toBe(requestEligible);
      expect(canOwnProviderApplication(role)).toBe(providerEligible);
    },
  );

  it("returns only server-derived request owner IDs for eligible roles", () => {
    expect(linkedStudentProfileIdFor(userWithRole("student"))).toBe(
      "student-profile-id",
    );
    expect(linkedStudentProfileIdFor(userWithRole("both"))).toBe(
      "both-profile-id",
    );
    expect(linkedStudentProfileIdFor(userWithRole("freelancer"))).toBeNull();
    expect(linkedStudentProfileIdFor(userWithRole("admin"))).toBeNull();
    expect(linkedStudentProfileIdFor(null)).toBeNull();
  });

  it("returns only server-derived provider owner IDs for eligible roles", () => {
    expect(linkedProviderProfileIdFor(userWithRole("freelancer"))).toBe(
      "freelancer-profile-id",
    );
    expect(linkedProviderProfileIdFor(userWithRole("both"))).toBe(
      "both-profile-id",
    );
    expect(linkedProviderProfileIdFor(userWithRole("student"))).toBeNull();
    expect(linkedProviderProfileIdFor(userWithRole("admin"))).toBeNull();
    expect(linkedProviderProfileIdFor(null)).toBeNull();
  });

  it("does not link ownership for deactivated accounts", () => {
    expect(
      linkedStudentProfileIdFor(userWithRole("student", "deactivated")),
    ).toBeNull();
    expect(
      linkedProviderProfileIdFor(userWithRole("freelancer", "deactivated")),
    ).toBeNull();
    expect(linkedStudentProfileIdFor(userWithRole("both", "deactivated"))).toBeNull();
    expect(
      linkedProviderProfileIdFor(userWithRole("both", "deactivated")),
    ).toBeNull();
  });

  it("does not expose an API that accepts client-supplied ownership IDs", () => {
    expect(linkedStudentProfileIdFor.length).toBe(1);
    expect(linkedProviderProfileIdFor.length).toBe(1);
  });
});
