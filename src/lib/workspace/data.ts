import "server-only";

import { logWorkspaceDataLoadFailed } from "@/lib/observability/server-log";
import type { WorkspaceDataResource } from "@/lib/observability/server-log";
import type { Database } from "@/types/database.types";
import { PAGE_SIZE, pageToOffset } from "./pagination";

type SupabaseServerClient = Awaited<
  ReturnType<typeof import("@/lib/supabase/server").createSupabaseServerClient>
>;

export type ProjectRequestSummary =
  Database["public"]["Functions"]["get_my_project_requests"]["Returns"][number];
export type ProviderApplicationSummary =
  Database["public"]["Functions"]["get_my_provider_applications"]["Returns"][number];
export type EngagementSummary =
  Database["public"]["Functions"]["get_my_engagements"]["Returns"][number];

export type PaginatedResult<T> =
  | {
      error: null;
      page: number;
      pageCount: number;
      rows: T[];
      totalCount: number;
      activeCount?: number;
    }
  | {
      error: string;
      page: number;
      pageCount: 1;
      rows: [];
      totalCount: 0;
    };

function toPaginatedResult<T extends { total_count: number }>(
  rows: T[],
  page: number,
  fallbackTotalCount = 0,
  fallbackActiveCount?: number,
): PaginatedResult<T> {
  const totalCount = rows[0]?.total_count ?? fallbackTotalCount;
  const activeCount =
    "active_count" in (rows[0] ?? {})
      ? Number((rows[0] as { active_count?: number }).active_count ?? 0)
      : fallbackActiveCount;
  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return {
    ...(activeCount === undefined ? {} : { activeCount }),
    error: null,
    page,
    pageCount,
    rows,
    totalCount,
  };
}

function failure<T>(
  page: number,
  resource: WorkspaceDataResource,
): PaginatedResult<T> {
  logWorkspaceDataLoadFailed(resource);

  return {
    error: "We could not load this workspace data.",
    page,
    pageCount: 1,
    rows: [],
    totalCount: 0,
  };
}

export async function getMyProjectRequests(
  supabase: SupabaseServerClient,
  page: number,
) {
  const args = {
    p_limit: PAGE_SIZE,
    p_offset: pageToOffset(page),
  };
  const { data, error } = await supabase.rpc("get_my_project_requests", args);

  if (error) {
    return failure<ProjectRequestSummary>(page, "project_requests");
  }

  if (page > 1 && (!data || data.length === 0)) {
    const { data: firstPage } = await supabase.rpc("get_my_project_requests", {
      p_limit: PAGE_SIZE,
      p_offset: 0,
    });

    return toPaginatedResult(
      data ?? [],
      page,
      firstPage?.[0]?.total_count ?? 0,
      firstPage?.[0]?.active_count ?? 0,
    );
  }

  return toPaginatedResult(data ?? [], page);
}

export async function getMyProviderApplications(
  supabase: SupabaseServerClient,
  page: number,
) {
  const { data, error } = await supabase.rpc("get_my_provider_applications", {
    p_limit: PAGE_SIZE,
    p_offset: pageToOffset(page),
  });

  if (error) {
    return failure<ProviderApplicationSummary>(page, "provider_applications");
  }

  if (page > 1 && (!data || data.length === 0)) {
    const { data: firstPage } = await supabase.rpc(
      "get_my_provider_applications",
      {
        p_limit: PAGE_SIZE,
        p_offset: 0,
      },
    );

    return toPaginatedResult(data ?? [], page, firstPage?.[0]?.total_count ?? 0);
  }

  return toPaginatedResult(data ?? [], page);
}

export async function getMyEngagements(
  supabase: SupabaseServerClient,
  page: number,
) {
  const { data, error } = await supabase.rpc("get_my_engagements", {
    p_limit: PAGE_SIZE,
    p_offset: pageToOffset(page),
  });

  if (error) {
    return failure<EngagementSummary>(page, "engagements");
  }

  if (page > 1 && (!data || data.length === 0)) {
    const { data: firstPage } = await supabase.rpc("get_my_engagements", {
      p_limit: PAGE_SIZE,
      p_offset: 0,
    });

    return toPaginatedResult(
      data ?? [],
      page,
      firstPage?.[0]?.total_count ?? 0,
      firstPage?.[0]?.active_count ?? 0,
    );
  }

  return toPaginatedResult(data ?? [], page);
}
