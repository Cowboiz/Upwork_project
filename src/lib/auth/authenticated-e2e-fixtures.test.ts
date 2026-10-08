import { describe, expect, it } from "vitest";
import {
  e2eProfileUsername,
  normalizeModernSecretKeyHeaders,
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

  it("strips only matching modern secret-key bearer authorization", () => {
    const secretKey = "sb_secret_test_key";
    const headers = normalizeModernSecretKeyHeaders(
      {
        apikey: secretKey,
        authorization: `Bearer ${secretKey}`,
      },
      secretKey,
    );

    expect(headers.get("apikey")).toBe(secretKey);
    expect(headers.get("authorization")).toBeNull();
  });

  it("preserves JWT authorization and legacy service-role behavior", () => {
    const jwtHeaders = normalizeModernSecretKeyHeaders(
      {
        apikey: "sb_secret_test_key",
        authorization: "Bearer user.jwt.token",
      },
      "sb_secret_test_key",
    );
    const legacyHeaders = normalizeModernSecretKeyHeaders(
      {
        apikey: "legacy-service-role-jwt",
        authorization: "Bearer legacy-service-role-jwt",
      },
      "legacy-service-role-jwt",
    );

    expect(jwtHeaders.get("authorization")).toBe("Bearer user.jwt.token");
    expect(legacyHeaders.get("authorization")).toBe(
      "Bearer legacy-service-role-jwt",
    );
  });
});
