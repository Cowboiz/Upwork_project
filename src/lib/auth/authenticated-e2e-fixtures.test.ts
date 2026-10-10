import { describe, expect, it } from "vitest";
import {
  cleanupLifecycleFixtureTables,
  cleanupPartialLifecycleFixtureTables,
  createModernSecretKeyFetch,
  e2eProfileUsername,
  modernSecretKeyRetryDelaysMs,
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

  it("does not directly delete append-only workflow events during cleanup", () => {
    expect(cleanupLifecycleFixtureTables).not.toContain("workflow_events");
    expect(cleanupPartialLifecycleFixtureTables).not.toContain("workflow_events");
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

  it("retries exact transient Supabase JWT clock skew responses", async () => {
    const secretKey = "sb_secret_test_key";
    const attempts: string[] = [];
    const delays: number[] = [];
    const fetcher = createModernSecretKeyFetch(
      secretKey,
      async (request) => {
        const normalizedRequest = new Request(request);

        attempts.push(await normalizedRequest.text());

        return attempts.length < 3
          ? Response.json(
              {
                code: "PGRST303",
                message: "JWT issued at future",
              },
              { status: 401 },
            )
          : Response.json({ ok: true }, { status: 200 });
      },
      async (milliseconds) => {
        delays.push(milliseconds);
      },
    );

    if (!fetcher) {
      throw new Error("Expected modern secret-key fetch wrapper.");
    }

    const response = await fetcher("https://example.test/rest/v1/profiles", {
      body: JSON.stringify({ id: "profile-id" }),
      headers: {
        apikey: secretKey,
        authorization: `Bearer ${secretKey}`,
        "content-type": "application/json",
      },
      method: "POST",
    });

    expect(response.status).toBe(200);
    expect(attempts).toEqual([
      '{"id":"profile-id"}',
      '{"id":"profile-id"}',
      '{"id":"profile-id"}',
    ]);
    expect(delays).toEqual([...modernSecretKeyRetryDelaysMs]);
  });

  it("stops retrying transient clock skew after bounded attempts", async () => {
    const secretKey = "sb_secret_test_key";
    let attempts = 0;
    const fetcher = createModernSecretKeyFetch(
      secretKey,
      async () => {
        attempts += 1;

        return Response.json(
          {
            code: "PGRST303",
            message: "JWT issued at future",
          },
          { status: 401 },
        );
      },
      async () => {},
    );

    if (!fetcher) {
      throw new Error("Expected modern secret-key fetch wrapper.");
    }

    const response = await fetcher("https://example.test/rest/v1/profiles", {
      headers: {
        apikey: secretKey,
        authorization: `Bearer ${secretKey}`,
      },
    });

    expect(response.status).toBe(401);
    expect(attempts).toBe(3);
  });

  it("does not retry unrelated 401 responses", async () => {
    const secretKey = "sb_secret_test_key";
    let attempts = 0;
    const fetcher = createModernSecretKeyFetch(
      secretKey,
      async () => {
        attempts += 1;

        return Response.json(
          {
            code: "PGRST303",
            message: "JWT expired",
          },
          { status: 401 },
        );
      },
      async () => {},
    );

    if (!fetcher) {
      throw new Error("Expected modern secret-key fetch wrapper.");
    }

    const response = await fetcher("https://example.test/rest/v1/profiles", {
      headers: {
        apikey: secretKey,
        authorization: `Bearer ${secretKey}`,
      },
    });

    expect(response.status).toBe(401);
    expect(attempts).toBe(1);
  });

  it("does not retry non-401 responses", async () => {
    const secretKey = "sb_secret_test_key";
    let attempts = 0;
    const fetcher = createModernSecretKeyFetch(
      secretKey,
      async () => {
        attempts += 1;

        return Response.json(
          {
            code: "PGRST204",
            message: "column not found",
          },
          { status: 400 },
        );
      },
      async () => {},
    );

    if (!fetcher) {
      throw new Error("Expected modern secret-key fetch wrapper.");
    }

    const response = await fetcher("https://example.test/rest/v1/profiles", {
      headers: {
        apikey: secretKey,
        authorization: `Bearer ${secretKey}`,
      },
    });

    expect(response.status).toBe(400);
    expect(attempts).toBe(1);
  });
});
