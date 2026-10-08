import { describe, expect, it } from "vitest";
import {
  e2eProfileUsername,
  projectRequestFixtureValues,
  requestCandidateFixtureValues,
} from "../../../e2e/support/authenticated-fixtures";

describe("authenticated e2e fixture usernames", () => {
  it("generates deterministic unique usernames for managed identities", () => {
    const usernames = [
      e2eProfileUsername("admin"),
      e2eProfileUsername("student"),
      e2eProfileUsername("aux_student"),
      e2eProfileUsername("provider"),
    ];

    expect(usernames).toEqual([
      "e2e_auth_lifecycle_admin",
      "e2e_auth_lifecycle_student",
      "e2e_auth_lifecycle_aux_student",
      "e2e_auth_lifecycle_provider",
    ]);
    expect(new Set(usernames).size).toBe(usernames.length);
  });

  it("uses DEV-valid constrained fixture values and provider application source", () => {
    expect(projectRequestFixtureValues).toEqual({
      budgetRange: "100_300",
      category: "other",
    });
    expect(requestCandidateFixtureValues).toEqual({
      usesProviderApplicationSource: true,
    });
  });
});
