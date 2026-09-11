import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

type Supabase = SupabaseClient<Database>;

type ProjectRequest = Pick<
  Database["public"]["Tables"]["project_requests"]["Row"],
  "id" | "status" | "integrity_review_status"
>;

type ProviderApplication = Pick<
  Database["public"]["Tables"]["provider_applications"]["Row"],
  "id" | "status"
>;

type RequestCandidate = Pick<
  Database["public"]["Tables"]["request_candidates"]["Row"],
  | "id"
  | "project_request_id"
  | "provider_response_status"
  | "student_decision_status"
>;

type ProjectEngagement = Pick<
  Database["public"]["Tables"]["project_engagements"]["Row"],
  | "id"
  | "request_candidate_id"
  | "agreed_amount"
  | "agreed_deadline"
  | "status"
  | "payment_status"
  | "repeat_intent"
  | "referral_signal"
>;

export type OpsQueue = {
  description: string;
  href?: string;
  label: string;
  value: number;
};

export type OpsMetric = {
  confidence: "reliably measurable" | "current-state proxy" | "historical proxy";
  current: string;
  interpretation: string;
  label: string;
  target: string;
};

export type OpsFunnelStep = {
  label: string;
  value: number;
};

export type OpsData = {
  queues: OpsQueue[];
  metrics: OpsMetric[];
  funnel: OpsFunnelStep[];
  gaps: string[];
  dataQualityWarnings: string[];
};

const observableQualifiedStatuses = new Set([
  "reviewed",
  "matched",
  "in_progress",
  "completed",
]);

const activeEngagementStatuses = new Set(["agreed", "in_progress"]);
const overdueEngagementStatuses = new Set([
  "agreed",
  "in_progress",
  "submitted",
  "disputed",
]);

function percent(numerator: number, denominator: number) {
  if (denominator === 0) {
    return "Not measurable yet";
  }

  return `${Math.round((numerator / denominator) * 100)}% (${numerator}/${denominator})`;
}

function countBy<T>(values: T[], predicate: (value: T) => boolean) {
  return values.filter(predicate).length;
}

function distinctRequestIds(candidates: RequestCandidate[]) {
  return new Set(candidates.map((candidate) => candidate.project_request_id));
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export async function getOpsDashboardData(supabase: Supabase): Promise<OpsData> {
  const [
    { data: requests, error: requestsError },
    { data: providers, error: providersError },
    { data: candidates, error: candidatesError },
    { data: engagements, error: engagementsError },
  ] = await Promise.all([
    supabase
      .from("project_requests")
      .select("id, status, integrity_review_status"),
    supabase.from("provider_applications").select("id, status"),
    supabase
      .from("request_candidates")
      .select(
        "id, project_request_id, provider_response_status, student_decision_status",
      ),
    supabase
      .from("project_engagements")
      .select(
        "id, request_candidate_id, agreed_amount, agreed_deadline, status, payment_status, repeat_intent, referral_signal",
      ),
  ]);

  if (
    requestsError ||
    providersError ||
    candidatesError ||
    engagementsError
  ) {
    throw new Error("Unable to load operations metrics.");
  }

  const safeRequests = requests satisfies ProjectRequest[];
  const safeProviders = providers satisfies ProviderApplication[];
  const safeCandidates = candidates satisfies RequestCandidate[];
  const safeEngagements = engagements satisfies ProjectEngagement[];

  const requestById = new Map(
    safeRequests.map((request) => [request.id, request]),
  );
  const candidateById = new Map(
    safeCandidates.map((candidate) => [candidate.id, candidate]),
  );
  const candidateRequestIds = distinctRequestIds(safeCandidates);

  const observableQualifiedRequestIds = new Set<string>();

  safeRequests.forEach((request) => {
    if (request.integrity_review_status === "rejected") {
      return;
    }

    const currentQualificationEvidence =
      request.integrity_review_status === "clear" &&
      observableQualifiedStatuses.has(request.status);

    if (currentQualificationEvidence || candidateRequestIds.has(request.id)) {
      observableQualifiedRequestIds.add(request.id);
    }
  });

  const viableMatchRequestIds = new Set<string>();
  const acceptedRequestIds = new Set<string>();

  safeCandidates.forEach((candidate) => {
    if (!observableQualifiedRequestIds.has(candidate.project_request_id)) {
      return;
    }

    if (
      candidate.provider_response_status === "interested" ||
      candidate.student_decision_status === "accepted"
    ) {
      viableMatchRequestIds.add(candidate.project_request_id);
    }

    if (candidate.student_decision_status === "accepted") {
      acceptedRequestIds.add(candidate.project_request_id);
    }
  });

  const engagementRequestIds = new Set<string>();
  const paidScopeRequestIds = new Set<string>();

  safeEngagements.forEach((engagement) => {
    const candidate = candidateById.get(engagement.request_candidate_id);

    if (!candidate) {
      return;
    }

    engagementRequestIds.add(candidate.project_request_id);

    if (
      acceptedRequestIds.has(candidate.project_request_id) &&
      engagement.agreed_amount > 0
    ) {
      paidScopeRequestIds.add(candidate.project_request_id);
    }
  });

  const completedEngagements = safeEngagements.filter(
    (engagement) => engagement.status === "completed",
  );
  const paidCompletions = completedEngagements.filter(
    (engagement) => engagement.payment_status === "paid",
  );
  const repeatReferralPositive = completedEngagements.filter(
    (engagement) =>
      engagement.repeat_intent === "yes" || engagement.referral_signal === "yes",
  );
  const repeatReferralRecorded = completedEngagements.filter(
    (engagement) =>
      engagement.repeat_intent === "yes" ||
      engagement.repeat_intent === "no" ||
      engagement.referral_signal === "yes" ||
      engagement.referral_signal === "no",
  );

  const engagementCandidateIds = new Set(
    safeEngagements.map((engagement) => engagement.request_candidate_id),
  );
  const acceptedCandidatesWithoutEngagement = safeCandidates.filter(
    (candidate) => {
      const request = requestById.get(candidate.project_request_id);

      return (
        candidate.student_decision_status === "accepted" &&
        !engagementCandidateIds.has(candidate.id) &&
        request?.status === "matched"
      );
    },
  );

  const today = todayIsoDate();
  const overdueEngagements = safeEngagements.filter(
    (engagement) =>
      engagement.agreed_deadline !== null &&
      engagement.agreed_deadline < today &&
      overdueEngagementStatuses.has(engagement.status),
  );
  const cancelledPaymentFollowUp = safeEngagements.filter(
    (engagement) =>
      engagement.status === "cancelled" &&
      ["agreed", "partially_paid", "chargeback_disputed"].includes(
        engagement.payment_status,
      ),
  );

  const queues: OpsQueue[] = [
    {
      label: "New requests",
      value: countBy(safeRequests, (request) => request.status === "new"),
      description: "Submitted requests awaiting operator review.",
      href: "/admin/requests?status=new",
    },
    {
      label: "Needs clarification",
      value: countBy(
        safeRequests,
        (request) => request.status === "needs_clarification",
      ),
      description: "Requests waiting on clearer scope, budget, or policy fit.",
      href: "/admin/requests?status=needs_clarification",
    },
    {
      label: "Ready for matching",
      value: countBy(
        safeRequests,
        (request) =>
          request.status === "reviewed" &&
          request.integrity_review_status === "clear",
      ),
      description: "Reviewed, integrity-clear requests that need curation.",
      href: "/admin/requests?status=reviewed",
    },
    {
      label: "New provider applications",
      value: countBy(safeProviders, (provider) => provider.status === "new"),
      description: "Provider applications awaiting review.",
      href: "/admin/providers?status=new",
    },
    {
      label: "Approved providers",
      value: countBy(
        safeProviders,
        (provider) => provider.status === "approved",
      ),
      description: "Current approved supply available for curation.",
      href: "/admin/providers?status=approved",
    },
    {
      label: "Matched without engagement",
      value: acceptedCandidatesWithoutEngagement.length,
      description: "Accepted matches that still need agreement terms or engagement creation.",
      href: "/admin/requests",
    },
    {
      label: "Active engagements",
      value: countBy(safeEngagements, (engagement) =>
        activeEngagementStatuses.has(engagement.status),
      ),
      description: "Projects in agreed or in-progress states.",
      href: "/admin/requests",
    },
    {
      label: "Submitted engagements",
      value: countBy(
        safeEngagements,
        (engagement) => engagement.status === "submitted",
      ),
      description: "Submitted work awaiting outcome confirmation.",
      href: "/admin/requests",
    },
    {
      label: "Disputed engagements",
      value: countBy(
        safeEngagements,
        (engagement) => engagement.status === "disputed",
      ),
      description: "Material disagreements requiring operator review.",
      href: "/admin/requests",
    },
    {
      label: "Overdue engagements",
      value: overdueEngagements.length,
      description: "Past agreed deadline in active, submitted, or disputed states.",
      href: "/admin/requests",
    },
    {
      label: "Completed but not paid",
      value: countBy(
        safeEngagements,
        (engagement) =>
          engagement.status === "completed" &&
          engagement.payment_status !== "paid",
      ),
      description: "Completed outcomes that are not fully paid.",
      href: "/admin/requests",
    },
    {
      label: "Cancelled - payment follow-up",
      value: cancelledPaymentFollowUp.length,
      description: "Cancelled engagements with payment states worth operator review.",
      href: "/admin/requests",
    },
  ];

  const metrics: OpsMetric[] = [
    {
      label: "Qualified requests (observable)",
      current: `${observableQualifiedRequestIds.size}`,
      target: ">=20 in 4-6 weeks",
      confidence: "historical proxy",
      interpretation:
        "Uses current clear/reviewed-or-beyond requests plus candidate existence as historical qualification evidence.",
    },
    {
      label: "Approved providers now",
      current: `${countBy(safeProviders, (provider) => provider.status === "approved")}`,
      target: ">=30 qualified/vetted providers",
      confidence: "current-state proxy",
      interpretation:
        "Current approved supply only; the schema does not preserve ever-approved history.",
    },
    {
      label: "Viable match rate",
      current: percent(
        viableMatchRequestIds.size,
        observableQualifiedRequestIds.size,
      ),
      target: ">=50%",
      confidence: "historical proxy",
      interpretation:
        "Per request, counts interested provider response or accepted candidate evidence.",
    },
    {
      label: "Accepted requests",
      current: `${acceptedRequestIds.size}`,
      target: "Track progression",
      confidence: "reliably measurable",
      interpretation:
        "Distinct requests with an accepted candidate; survives request status progression.",
    },
    {
      label: "Paid-scope agreement conversion",
      current: percent(paidScopeRequestIds.size, acceptedRequestIds.size),
      target: ">=30% of matched students",
      confidence: "reliably measurable",
      interpretation:
        "Accepted requests with an engagement whose agreed amount is greater than zero.",
    },
    {
      label: "Paid completions",
      current: `${paidCompletions.length}`,
      target: ">=5",
      confidence: "reliably measurable",
      interpretation:
        "Completed engagements with payment_status = paid; partially paid does not count.",
    },
    {
      label: "Paid completion ratio",
      current: percent(paidCompletions.length, completedEngagements.length),
      target: "Operational ratio",
      confidence: "reliably measurable",
      interpretation:
        "Paid completions divided by all completed engagements.",
    },
    {
      label: "Repeat/referral signal proxy",
      current: percent(repeatReferralPositive.length, completedEngagements.length),
      target: ">=20%",
      confidence: "historical proxy",
      interpretation:
        "Engagement-level proxy; denominator includes completed unknown and null records.",
    },
    {
      label: "Repeat/referral signal coverage",
      current: percent(repeatReferralRecorded.length, completedEngagements.length),
      target: "Improve coverage",
      confidence: "current-state proxy",
      interpretation:
        "Completed engagements with at least one useful yes/no repeat or referral value recorded.",
    },
  ];

  const funnel: OpsFunnelStep[] = [
    {
      label: "Observable qualified requests",
      value: observableQualifiedRequestIds.size,
    },
    {
      label: "Viable-match requests",
      value: viableMatchRequestIds.size,
    },
    {
      label: "Accepted requests",
      value: acceptedRequestIds.size,
    },
    {
      label: "Engagements created",
      value: engagementRequestIds.size,
    },
    {
      label: "Completed engagements",
      value: completedEngagements.length,
    },
    {
      label: "Paid completions",
      value: paidCompletions.length,
    },
  ];

  return {
    queues,
    metrics,
    funnel,
    gaps: [
      "Provider responsiveness >=60% is not reliably measurable yet because contacted_at is not instrumented.",
      "Time to first response <12h is not reliably measurable yet because first human response is not recorded.",
      "Time to shortlist / next step <24h is not reliably measurable yet; curated_at is not a canonical presentation timestamp.",
      "Historical material dispute rate <10% is not reliably measurable yet because status history is not preserved.",
    ],
    dataQualityWarnings: [
      "Current metrics may include development/test records and should not yet be treated as pilot validation results.",
      "Cancelled or rejected requests with historical matching evidence cannot always be classified perfectly without qualification history.",
      "Provider status is mutable, so current approved providers should not be read as ever-vetted provider count.",
    ],
  };
}
