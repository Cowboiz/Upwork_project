import { afterEach, describe, expect, it, vi } from "vitest";
import {
  checkReadiness,
  notReadyResult,
  readyResult,
} from "./readiness";

describe("readiness", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns ready when the dependency check succeeds", async () => {
    const result = await checkReadiness(async () => {});

    expect(result).toEqual({
      status: "ready",
      service: "projectmatch",
      dependencies: {
        supabase: "ok",
      },
    });
  });

  it("returns not_ready when the dependency check fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await checkReadiness(async () => {
      throw new Error("database password leaked project_requests");
    });

    expect(result).toEqual({
      status: "not_ready",
      service: "projectmatch",
      dependencies: {
        supabase: "unavailable",
      },
    });
  });

  it("does not expose raw dependency failure details in the public result", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await checkReadiness(async () => {
      throw new Error("secret-token table project_requests postgres stack");
    });
    const serialized = JSON.stringify(result);
    const [logged] = consoleError.mock.calls[0];

    expect(serialized).not.toContain("secret-token");
    expect(serialized).not.toContain("project_requests");
    expect(serialized).not.toContain("postgres");
    expect(serialized).not.toContain("stack");
    expect(JSON.parse(String(logged))).toEqual({
      level: "error",
      event: "dependency_readiness_failed",
      dependency: "supabase",
    });
    expect(String(logged)).not.toContain("secret-token");
    expect(String(logged)).not.toContain("project_requests");
    expect(String(logged)).not.toContain("postgres");
    expect(String(logged)).not.toContain("stack");
  });

  it("uses only the intended public readiness fields", () => {
    expect(readyResult()).toEqual({
      status: "ready",
      service: "projectmatch",
      dependencies: {
        supabase: "ok",
      },
    });
    expect(notReadyResult()).toEqual({
      status: "not_ready",
      service: "projectmatch",
      dependencies: {
        supabase: "unavailable",
      },
    });
  });
});
