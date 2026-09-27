import { afterEach, describe, expect, it, vi } from "vitest";
import {
  logEmailDeliveryFailed,
  logEmailPipelineFailed,
  logIntakeOperationFailed,
  logRateLimitBlocked,
  logRateLimitCheckFailed,
  logRequestError,
} from "./server-log";

const unsafeStrings = [
  "private-token",
  "secret@example.com",
  "Bearer",
  "cookie",
  "authorization",
  "project description",
  "?token=",
];

function expectNoUnsafeValues(logged: string) {
  for (const value of unsafeStrings) {
    expect(logged).not.toContain(value);
  }
}

describe("logRequestError", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("writes a safe structured request error log", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = Object.assign(new Error("token=secret@example.com"), {
      digest: "NEXT_DIGEST",
    });

    logRequestError(
      error,
      {
        headers: {
          authorization: "Bearer private-token",
          cookie: "session=private-cookie",
        },
        method: "GET",
        path: "/engagement/status?token=private-token",
      },
      {
        routePath: "/engagement/status",
        routeType: "render",
        routerKind: "App Router",
        revalidateReason: undefined,
      },
    );

    expect(consoleError).toHaveBeenCalledOnce();

    const [logged] = consoleError.mock.calls[0];
    expect(typeof logged).toBe("string");

    const parsed = JSON.parse(String(logged));
    expect(parsed).toEqual({
      level: "error",
      event: "next_request_error",
      message: "Unhandled request error",
      digest: "NEXT_DIGEST",
      method: "GET",
      routePath: "/engagement/status",
      routeType: "render",
      routerKind: "App Router",
    });

    expect(String(logged)).not.toContain("private-token");
    expect(String(logged)).not.toContain("private-cookie");
    expect(String(logged)).not.toContain("secret@example.com");
    expect(String(logged)).not.toContain("authorization");
    expect(String(logged)).not.toContain("headers");
    expect(String(logged)).not.toContain("cookie");
    expect(String(logged)).not.toContain("?");
  });
});

describe("operational log helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("writes a safe rate_limit_blocked log", () => {
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});

    logRateLimitBlocked({
      action: "project_request_submit_ip",
      retryAfterSeconds: 123,
    });

    expect(consoleWarn).toHaveBeenCalledOnce();

    const [logged] = consoleWarn.mock.calls[0];
    const parsed = JSON.parse(String(logged));

    expect(parsed).toEqual({
      level: "warn",
      event: "rate_limit_blocked",
      action: "project_request_submit_ip",
      retryAfterSeconds: 123,
    });
    expect(Object.keys(parsed).sort()).toEqual([
      "action",
      "event",
      "level",
      "retryAfterSeconds",
    ]);
    expectNoUnsafeValues(String(logged));
  });

  it("writes a safe rate_limit_check_failed log", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    logRateLimitCheckFailed("provider_application_submit_contact");

    expect(consoleError).toHaveBeenCalledOnce();

    const [logged] = consoleError.mock.calls[0];
    const parsed = JSON.parse(String(logged));

    expect(parsed).toEqual({
      level: "error",
      event: "rate_limit_check_failed",
      action: "provider_application_submit_contact",
    });
    expect(Object.keys(parsed).sort()).toEqual(["action", "event", "level"]);
    expectNoUnsafeValues(String(logged));
  });

  it("writes a safe intake_operation_failed log", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    logIntakeOperationFailed({
      intake: "provider_application",
      stage: "insert",
    });

    expect(consoleError).toHaveBeenCalledOnce();

    const [logged] = consoleError.mock.calls[0];
    const parsed = JSON.parse(String(logged));

    expect(parsed).toEqual({
      level: "error",
      event: "intake_operation_failed",
      intake: "provider_application",
      stage: "insert",
    });
    expect(Object.keys(parsed).sort()).toEqual([
      "event",
      "intake",
      "level",
      "stage",
    ]);
    expectNoUnsafeValues(String(logged));
  });

  it("writes a safe email_delivery_failed log", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    logEmailDeliveryFailed({
      attemptCount: 2,
      phase: "retry",
      recipientRole: "provider",
      templateKey: "provider_contacted_provider",
    });

    expect(consoleError).toHaveBeenCalledOnce();

    const [logged] = consoleError.mock.calls[0];
    const parsed = JSON.parse(String(logged));

    expect(parsed).toEqual({
      level: "error",
      event: "email_delivery_failed",
      templateKey: "provider_contacted_provider",
      recipientRole: "provider",
      phase: "retry",
      attemptCount: 2,
    });
    expect(Object.keys(parsed).sort()).toEqual([
      "attemptCount",
      "event",
      "level",
      "phase",
      "recipientRole",
      "templateKey",
    ]);
    expectNoUnsafeValues(String(logged));
  });

  it("writes a safe email_pipeline_failed log", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    logEmailPipelineFailed("engagement_submitted_student");

    expect(consoleError).toHaveBeenCalledOnce();

    const [logged] = consoleError.mock.calls[0];
    const parsed = JSON.parse(String(logged));

    expect(parsed).toEqual({
      level: "error",
      event: "email_pipeline_failed",
      notification: "engagement_submitted_student",
    });
    expect(Object.keys(parsed).sort()).toEqual([
      "event",
      "level",
      "notification",
    ]);
    expectNoUnsafeValues(String(logged));
  });

  it("uses a safe fallback if serialization logging throws", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementationOnce(() => {
        throw new Error("private-token secret@example.com");
      })
      .mockImplementation(() => {});

    logEmailPipelineFailed("provider_contacted");

    expect(consoleError).toHaveBeenCalledTimes(2);

    const [, fallback] = consoleError.mock.calls;
    const logged = String(fallback[0]);

    expect(JSON.parse(logged)).toEqual({
      level: "error",
      event: "email_pipeline_failed",
      notification: "provider_contacted",
    });
    expectNoUnsafeValues(logged);
  });
});
