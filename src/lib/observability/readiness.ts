import { logDependencyReadinessFailed } from "./server-log";

export const READINESS_TIMEOUT_MS = 3000;

export type ReadinessStatus = "ready" | "not_ready";
export type DependencyStatus = "ok" | "unavailable";

export type ReadinessResult = {
  status: ReadinessStatus;
  service: "projectmatch";
  dependencies: {
    supabase: DependencyStatus;
  };
};

export function readyResult(): ReadinessResult {
  return {
    status: "ready",
    service: "projectmatch",
    dependencies: {
      supabase: "ok",
    },
  };
}

export function notReadyResult(): ReadinessResult {
  return {
    status: "not_ready",
    service: "projectmatch",
    dependencies: {
      supabase: "unavailable",
    },
  };
}

export async function checkSupabaseDependency() {
  const { createSupabaseAdminClient } = await import("../supabase/admin");
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("project_requests")
    .select("id")
    .limit(1)
    .abortSignal(AbortSignal.timeout(READINESS_TIMEOUT_MS));

  if (error) {
    throw new Error("Supabase readiness check failed");
  }
}

export async function checkReadiness(
  checkSupabase: () => Promise<void> = checkSupabaseDependency,
) {
  try {
    await checkSupabase();
    return readyResult();
  } catch {
    logDependencyReadinessFailed("supabase");
    return notReadyResult();
  }
}
