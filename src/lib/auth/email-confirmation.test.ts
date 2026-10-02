import { describe, expect, it } from "vitest";
import {
  buildEmailConfirmationRedirect,
  buildResendConfirmationRateLimitInput,
  getConfiguredAppOrigin,
  getPostConfirmationRedirectForRole,
  getSafeAuthCallbackNext,
} from "./email-confirmation";

describe("auth email confirmation", () => {
  it("builds a safe signup confirmation redirect from the configured app URL", () => {
    expect(
      buildEmailConfirmationRedirect({
        appOrigin: getConfiguredAppOrigin({
          APP_BASE_URL: "https://projectmatch.example",
        }),
      }),
    ).toBe("https://projectmatch.example/auth/callback?next=%2Fapp");
  });

  it("accepts an internal app callback destination", () => {
    expect(getSafeAuthCallbackNext("/app")).toBe("/app");
    expect(getSafeAuthCallbackNext("/app/requests?page=2")).toBe(
      "/app/requests?page=2",
    );
  });

  it("rejects unsafe callback destinations", () => {
    expect(getSafeAuthCallbackNext("https://evil.example/app")).toBe("/app");
    expect(getSafeAuthCallbackNext("//evil.example/app")).toBe("/app");
    expect(getSafeAuthCallbackNext("/admin")).toBe("/app");
    expect(getSafeAuthCallbackNext("/login")).toBe("/app");
    expect(getSafeAuthCallbackNext("/request")).toBe("/app");
  });

  it("routes confirmed admins to admin and normal users to the safe app path", () => {
    expect(
      getPostConfirmationRedirectForRole({
        next: "/app/engagements",
        role: "student",
      }),
    ).toBe("/app/engagements");
    expect(
      getPostConfirmationRedirectForRole({
        next: "/app",
        role: "admin",
      }),
    ).toBe("/admin");
  });

  it("rate limits resend confirmation requests by client and normalized email", () => {
    expect(
      buildResendConfirmationRateLimitInput({
        clientIp: "203.0.113.10",
        email: " User@Example.COM ",
      }),
    ).toEqual({
      action: "account_resend_confirmation_ip",
      identifier: "203.0.113.10:user@example.com",
      limit: 3,
      windowSeconds: 900,
    });
  });
});
