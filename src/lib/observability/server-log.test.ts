import { afterEach, describe, expect, it, vi } from "vitest";
import { logRequestError } from "./server-log";

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
