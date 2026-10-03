import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

type Supabase = SupabaseClient<Database>;

export type AdminOverviewMetric = {
  href: string;
  label: string;
  value: number;
};

export type AdminOverviewRequest = Pick<
  Database["public"]["Tables"]["project_requests"]["Row"],
  "category" | "created_at" | "id" | "integrity_review_status" | "requester_name" | "status"
>;

export type AdminOverviewEvent = Pick<
  Database["public"]["Tables"]["workflow_events"]["Row"],
  "event_name" | "id" | "occurred_at"
>;

export type AdminOverviewData = {
  metrics: AdminOverviewMetric[];
  recentRequests: AdminOverviewRequest[];
  recentWorkflowEvents: AdminOverviewEvent[];
};

function countOrZero(value: number | null) {
  return value ?? 0;
}

export async function getAdminOverviewData(
  supabase: Supabase,
): Promise<AdminOverviewData> {
  const [
    newRequests,
    integrityReviewRequests,
    approvedProviders,
    activeEngagements,
    failedEmails,
    totalUsers,
    activeUsers,
    deactivatedUsers,
    recentRequests,
    recentWorkflowEvents,
  ] = await Promise.all([
    supabase
      .from("project_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "new"),
    supabase
      .from("project_requests")
      .select("id", { count: "exact", head: true })
      .eq("integrity_review_status", "needs_review"),
    supabase
      .from("provider_applications")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved"),
    supabase
      .from("project_engagements")
      .select("id", { count: "exact", head: true })
      .in("status", ["agreed", "in_progress"]),
    supabase
      .from("email_outbox")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed"),
    supabase.rpc("admin_list_users", {
      p_limit: 1,
      p_offset: 0,
      p_q: null,
      p_role: null,
      p_sort: "newest",
      p_status: null,
    }),
    supabase.rpc("admin_list_users", {
      p_limit: 1,
      p_offset: 0,
      p_q: null,
      p_role: null,
      p_sort: "newest",
      p_status: "active",
    }),
    supabase.rpc("admin_list_users", {
      p_limit: 1,
      p_offset: 0,
      p_q: null,
      p_role: null,
      p_sort: "newest",
      p_status: "deactivated",
    }),
    supabase
      .from("project_requests")
      .select(
        "id, requester_name, category, status, integrity_review_status, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("workflow_events")
      .select("id, event_name, occurred_at")
      .order("occurred_at", { ascending: false })
      .limit(8),
  ]);

  const errors = [
    newRequests.error,
    integrityReviewRequests.error,
    approvedProviders.error,
    activeEngagements.error,
    failedEmails.error,
    totalUsers.error,
    activeUsers.error,
    deactivatedUsers.error,
    recentRequests.error,
    recentWorkflowEvents.error,
  ].filter(Boolean);

  if (errors.length > 0) {
    throw new Error("Unable to load admin overview.");
  }

  return {
    metrics: [
      {
        href: "/admin/requests?status=new",
        label: "New requests",
        value: countOrZero(newRequests.count),
      },
      {
        href: "/admin/requests?integrity=needs_review",
        label: "Needs integrity review",
        value: countOrZero(integrityReviewRequests.count),
      },
      {
        href: "/admin/providers?status=approved",
        label: "Approved providers",
        value: countOrZero(approvedProviders.count),
      },
      {
        href: "/admin/requests",
        label: "Active engagements",
        value: countOrZero(activeEngagements.count),
      },
      {
        href: "/admin/ops",
        label: "Failed email deliveries",
        value: countOrZero(failedEmails.count),
      },
      {
        href: "/admin/users",
        label: "Total users",
        value: totalUsers.data?.[0]?.total_count ?? 0,
      },
      {
        href: "/admin/users?status=active",
        label: "Active users",
        value: activeUsers.data?.[0]?.total_count ?? 0,
      },
      {
        href: "/admin/users?status=deactivated",
        label: "Deactivated users",
        value: deactivatedUsers.data?.[0]?.total_count ?? 0,
      },
    ],
    recentRequests: (recentRequests.data ?? []) satisfies AdminOverviewRequest[],
    recentWorkflowEvents:
      (recentWorkflowEvents.data ?? []) satisfies AdminOverviewEvent[],
  };
}
