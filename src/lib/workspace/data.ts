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
export type ProjectRequestDetail =
  Database["public"]["Functions"]["get_my_project_request_detail"]["Returns"][number];
export type ProviderApplicationDetail =
  Database["public"]["Functions"]["get_my_provider_application_detail"]["Returns"][number];
export type EngagementDetail =
  Database["public"]["Functions"]["get_my_engagement_detail"]["Returns"][number];
export type RequestMatchingCandidate = {
  candidate_rank: number | null;
  engagement_id: string | null;
  engagement_status: string | null;
  provider_response_status: string;
  request_candidate_id: string;
  student_decision_status: string;
};
export type ProviderApplicationMatch = {
  agreed_deadline: string | null;
  agreed_price: number | null;
  can_respond: boolean;
  candidate_rank: number | null;
  currency: string;
  engagement_id: string | null;
  engagement_status: string | null;
  project_request_id: string;
  proposed_price: number | null;
  provider_contacted: boolean;
  provider_response_status: string;
  request_candidate_id: string;
  request_category: string;
  request_integrity_review_status: string;
  request_status: string;
  student_decision_status: string;
};

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function optionalNumber(value: unknown) {
  return typeof value === "number" ? value : null;
}

function optionalString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function requiredString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function requiredBoolean(value: unknown) {
  return value === true;
}

export function getRequestMatchingCandidates(
  request: ProjectRequestDetail,
): RequestMatchingCandidate[] {
  if (!Array.isArray(request.matching_candidates)) {
    return [];
  }

  const candidates: RequestMatchingCandidate[] = [];

  for (const candidate of request.matching_candidates) {
    if (!isRecord(candidate)) {
      continue;
    }

    const item = {
      candidate_rank: optionalNumber(candidate.candidate_rank),
      engagement_id: optionalString(candidate.engagement_id),
      engagement_status: optionalString(candidate.engagement_status),
      provider_response_status: requiredString(
        candidate.provider_response_status,
      ),
      request_candidate_id: requiredString(candidate.request_candidate_id),
      student_decision_status: requiredString(candidate.student_decision_status),
    };

    if (item.request_candidate_id.length > 0) {
      candidates.push(item);
    }
  }

  return candidates;
}

export function getProviderApplicationMatches(
  application: ProviderApplicationDetail,
): ProviderApplicationMatch[] {
  if (!Array.isArray(application.matches)) {
    return [];
  }

  const matches: ProviderApplicationMatch[] = [];

  for (const match of application.matches) {
    if (!isRecord(match)) {
      continue;
    }

    const item = {
      agreed_deadline: optionalString(match.agreed_deadline),
      agreed_price: optionalNumber(match.agreed_price),
      can_respond: requiredBoolean(match.can_respond),
      candidate_rank: optionalNumber(match.candidate_rank),
      currency: requiredString(match.currency) || "USD",
      engagement_id: optionalString(match.engagement_id),
      engagement_status: optionalString(match.engagement_status),
      project_request_id: requiredString(match.project_request_id),
      proposed_price: optionalNumber(match.proposed_price),
      provider_contacted: requiredBoolean(match.provider_contacted),
      provider_response_status: requiredString(match.provider_response_status),
      request_candidate_id: requiredString(match.request_candidate_id),
      request_category: requiredString(match.request_category),
      request_integrity_review_status: requiredString(
        match.request_integrity_review_status,
      ),
      request_status: requiredString(match.request_status),
      student_decision_status: requiredString(match.student_decision_status),
    };

    if (item.request_candidate_id.length > 0) {
      matches.push(item);
    }
  }

  return matches;
}

export async function getMyProjectRequestDetail(
  supabase: SupabaseServerClient,
  requestId: string,
) {
  const { data, error } = await supabase.rpc("get_my_project_request_detail", {
    p_request_id: requestId,
  });

  if (error) {
    logWorkspaceDataLoadFailed("project_requests");
    return null;
  }

  return data?.[0] ?? null;
}

export async function getMyProviderApplicationDetail(
  supabase: SupabaseServerClient,
  applicationId: string,
) {
  const { data, error } = await supabase.rpc(
    "get_my_provider_application_detail",
    {
      p_application_id: applicationId,
    },
  );

  if (error) {
    logWorkspaceDataLoadFailed("provider_applications");
    return null;
  }

  return data?.[0] ?? null;
}

export async function getMyEngagementDetail(
  supabase: SupabaseServerClient,
  engagementId: string,
) {
  const { data, error } = await supabase.rpc("get_my_engagement_detail", {
    p_engagement_id: engagementId,
  });

  if (error) {
    logWorkspaceDataLoadFailed("engagements");
    return null;
  }

  return data?.[0] ?? null;
}
