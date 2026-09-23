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

type WorkflowEvent = Pick<
  Database["public"]["Tables"]["workflow_events"]["Row"],
  | "event_name"
  | "occurred_at"
  | "project_request_id"
  | "request_candidate_id"
  | "provider_application_id"
  | "project_engagement_id"
>;

export type OpsEmailFailure = Pick<
  Database["public"]["Tables"]["email_outbox"]["Row"],
  | "attempt_count"
  | "created_at"
  | "id"
  | "last_error"
  | "recipient_role"
  | "status"
  | "template_key"
  | "updated_at"
>;

export type OpsEmailDelivery = {
  failedCount: number;
  oldestUnsentAt: string | null;
  pendingCount: number;
  recentFailed: OpsEmailFailure[];
  sentCount: number;
};

type EventScope = "request" | "candidate" | "engagement";
type EntityEventMaps = Map<EventScope, Map<string, Map<string, number>>>;

type LatencyResult = {
  averageMs: number | null;
  completePairs: number;
  medianMs: number | null;
  pending: number;
  totalStarted: number;
};

type MaturedSlaResult = {
  failed: number;
  matured: number;
  passed: number;
  pending: number;
  totalStarted: number;
};

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

export type OpsInstrumentedMetric = {
  current: string;
  detail: string;
  label: string;
  target: string;
};

export type OpsFunnelStep = {
  label: string;
  value: number;
};

export type OpsData = {
  emailDelivery: OpsEmailDelivery;
  queues: OpsQueue[];
  metrics: OpsMetric[];
  instrumentedMetrics: OpsInstrumentedMetric[];
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
const realProviderResponseEvents = [
  "provider_responded_interested",
  "provider_responded_declined",
  "provider_withdrawn",
] as const;
const studentDecisionEvents = [
  "student_decision_accepted",
  "student_decision_declined",
] as const;

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

function addEventTime(
  maps: EntityEventMaps,
  scope: EventScope,
  id: string | null,
  eventName: string,
  occurredAt: string,
) {
  if (!id) {
    return;
  }

  const time = new Date(occurredAt).getTime();

  if (!Number.isFinite(time)) {
    return;
  }

  let entityMap = maps.get(scope);

  if (!entityMap) {
    entityMap = new Map();
    maps.set(scope, entityMap);
  }

  let eventMap = entityMap.get(id);

  if (!eventMap) {
    eventMap = new Map();
    entityMap.set(id, eventMap);
  }

  const existing = eventMap.get(eventName);

  if (existing === undefined || time < existing) {
    eventMap.set(eventName, time);
  }
}

function buildEventMaps(events: WorkflowEvent[]) {
  const maps: EntityEventMaps = new Map([
    ["request", new Map()],
    ["candidate", new Map()],
    ["engagement", new Map()],
  ]);

  events.forEach((event) => {
    addEventTime(
      maps,
      "request",
      event.project_request_id,
      event.event_name,
      event.occurred_at,
    );
    addEventTime(
      maps,
      "candidate",
      event.request_candidate_id,
      event.event_name,
      event.occurred_at,
    );
    addEventTime(
      maps,
      "engagement",
      event.project_engagement_id,
      event.event_name,
      event.occurred_at,
    );
  });

  return maps;
}

function eventTime(
  maps: EntityEventMaps,
  scope: EventScope,
  id: string,
  eventName: string,
) {
  return maps.get(scope)?.get(id)?.get(eventName) ?? null;
}

function firstEventTime(
  maps: EntityEventMaps,
  scope: EventScope,
  id: string,
  eventNames: readonly string[],
) {
  let first: number | null = null;

  eventNames.forEach((eventName) => {
    const time = eventTime(maps, scope, id, eventName);

    if (time !== null && (first === null || time < first)) {
      first = time;
    }
  });

  return first;
}

function earliestCandidateEventForRequest(
  maps: EntityEventMaps,
  requestCandidates: Map<string, string[]>,
  requestId: string,
  eventNames: readonly string[],
) {
  const candidateIds = requestCandidates.get(requestId) ?? [];
  let first: number | null = null;

  candidateIds.forEach((candidateId) => {
    const time = firstEventTime(maps, "candidate", candidateId, eventNames);

    if (time !== null && (first === null || time < first)) {
      first = time;
    }
  });

  return first;
}

function formatDuration(ms: number | null) {
  if (ms === null) {
    return "Not measurable yet";
  }

  const minutes = Math.round(ms / 60000);

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = minutes / 60;

  if (hours < 48) {
    return `${hours.toFixed(hours < 10 ? 1 : 0)}h`;
  }

  const days = hours / 24;

  return `${days.toFixed(days < 10 ? 1 : 0)}d`;
}

function median(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const midpoint = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) {
    return sorted[midpoint];
  }

  return (sorted[midpoint - 1] + sorted[midpoint]) / 2;
}

function latencyFromPairs(pairs: { end: number | null; start: number | null }[]) {
  const durations: number[] = [];
  let pending = 0;
  let totalStarted = 0;

  pairs.forEach(({ end, start }) => {
    if (start === null) {
      return;
    }

    totalStarted += 1;

    if (end === null) {
      pending += 1;
      return;
    }

    if (end >= start) {
      durations.push(end - start);
    }
  });

  const totalDuration = durations.reduce((sum, duration) => sum + duration, 0);

  return {
    averageMs: durations.length > 0 ? totalDuration / durations.length : null,
    completePairs: durations.length,
    medianMs: median(durations),
    pending,
    totalStarted,
  } satisfies LatencyResult;
}

function formatLatencyMetric(result: LatencyResult) {
  return `Median ${formatDuration(result.medianMs)}; avg ${formatDuration(
    result.averageMs,
  )} (n=${result.completePairs})`;
}

function formatLatencyDetail(result: LatencyResult) {
  return `${result.completePairs} completed event pairs; ${result.pending} pending/incomplete; ${result.totalStarted} instrumented starts.`;
}

function maturedSla(
  pairs: { end: number | null; start: number | null }[],
  windowMs: number,
  nowMs: number,
) {
  let failed = 0;
  let matured = 0;
  let passed = 0;
  let pending = 0;
  let totalStarted = 0;

  pairs.forEach(({ end, start }) => {
    if (start === null) {
      return;
    }

    totalStarted += 1;

    if (nowMs - start < windowMs) {
      pending += 1;
      return;
    }

    matured += 1;

    if (end !== null && end >= start && end - start <= windowMs) {
      passed += 1;
    } else {
      failed += 1;
    }
  });

  return { failed, matured, passed, pending, totalStarted } satisfies MaturedSlaResult;
}

function formatSlaMetric(result: MaturedSlaResult) {
  return percent(result.passed, result.matured);
}

function formatSlaDetail(result: MaturedSlaResult) {
  return `${result.matured} matured denominator; ${result.failed} failed after window; ${result.pending} pending/censored; ${result.totalStarted} instrumented starts.`;
}

function makeLatencyMetric(
  label: string,
  target: string,
  pairs: { end: number | null; start: number | null }[],
) {
  const result = latencyFromPairs(pairs);

  return {
    label,
    current: formatLatencyMetric(result),
    target,
    detail: formatLatencyDetail(result),
  } satisfies OpsInstrumentedMetric;
}

function makeSlaMetric(
  label: string,
  target: string,
  pairs: { end: number | null; start: number | null }[],
  windowMs: number,
  nowMs: number,
) {
  const result = maturedSla(pairs, windowMs, nowMs);

  return {
    label,
    current: formatSlaMetric(result),
    target,
    detail: formatSlaDetail(result),
  } satisfies OpsInstrumentedMetric;
}

function groupCandidatesByRequest(candidates: RequestCandidate[]) {
  const requestCandidates = new Map<string, string[]>();

  candidates.forEach((candidate) => {
    const existing = requestCandidates.get(candidate.project_request_id) ?? [];
    existing.push(candidate.id);
    requestCandidates.set(candidate.project_request_id, existing);
  });

  return requestCandidates;
}

function buildInstrumentedMetrics({
  candidates,
  engagements,
  eventMaps,
  requests,
}: {
  candidates: RequestCandidate[];
  engagements: ProjectEngagement[];
  eventMaps: EntityEventMaps;
  requests: ProjectRequest[];
}) {
  const nowMs = Date.now();
  const twelveHours = 12 * 60 * 60 * 1000;
  const twentyFourHours = 24 * 60 * 60 * 1000;
  const requestCandidates = groupCandidatesByRequest(candidates);
  const submittedToReviewPairs = requests.map((request) => ({
    start: eventTime(eventMaps, "request", request.id, "request_submitted"),
    end: eventTime(eventMaps, "request", request.id, "request_first_reviewed"),
  }));
  const submittedToIntegrityPairs = requests.map((request) => ({
    start: eventTime(eventMaps, "request", request.id, "request_submitted"),
    end: eventTime(eventMaps, "request", request.id, "request_integrity_cleared"),
  }));
  const qualifiedToContactPairs = requests.map((request) => ({
    start: eventTime(eventMaps, "request", request.id, "request_qualified"),
    end: earliestCandidateEventForRequest(
      eventMaps,
      requestCandidates,
      request.id,
      ["provider_contacted"],
    ),
  }));
  const candidateResponsePairs = candidates.map((candidate) => ({
    start: eventTime(eventMaps, "candidate", candidate.id, "provider_contacted"),
    end: firstEventTime(eventMaps, "candidate", candidate.id, realProviderResponseEvents),
  }));
  const qualifiedToViablePairs = requests.map((request) => ({
    start: eventTime(eventMaps, "request", request.id, "request_qualified"),
    end: earliestCandidateEventForRequest(
      eventMaps,
      requestCandidates,
      request.id,
      ["provider_responded_interested"],
    ),
  }));
  const qualifiedToShortlistPairs = requests.map((request) => ({
    start: eventTime(eventMaps, "request", request.id, "request_qualified"),
    end: earliestCandidateEventForRequest(
      eventMaps,
      requestCandidates,
      request.id,
      ["shortlist_presented"],
    ),
  }));
  const shortlistToDecisionPairs = candidates.map((candidate) => ({
    start: eventTime(eventMaps, "candidate", candidate.id, "shortlist_presented"),
    end: firstEventTime(eventMaps, "candidate", candidate.id, studentDecisionEvents),
  }));
  const acceptedToEngagementPairs = candidates.map((candidate) => ({
    start: eventTime(eventMaps, "candidate", candidate.id, "student_decision_accepted"),
    end: eventTime(eventMaps, "candidate", candidate.id, "engagement_created"),
  }));
  const engagementCreatedToStartedPairs = engagements.map((engagement) => ({
    start: eventTime(eventMaps, "engagement", engagement.id, "engagement_created"),
    end: eventTime(eventMaps, "engagement", engagement.id, "engagement_started"),
  }));
  const engagementStartedToSubmittedPairs = engagements.map((engagement) => ({
    start: eventTime(eventMaps, "engagement", engagement.id, "engagement_started"),
    end: eventTime(eventMaps, "engagement", engagement.id, "engagement_submitted"),
  }));
  const engagementSubmittedToCompletedPairs = engagements.map((engagement) => ({
    start: eventTime(eventMaps, "engagement", engagement.id, "engagement_submitted"),
    end: eventTime(eventMaps, "engagement", engagement.id, "engagement_completed"),
  }));
  const contactedCandidates = candidateResponsePairs.filter(
    (pair) => pair.start !== null,
  );
  const respondedCandidates = contactedCandidates.filter(
    (pair) => pair.end !== null,
  );

  return [
    makeSlaMetric(
      "Provider first response under 12h",
      "<12h after provider contact",
      candidateResponsePairs,
      twelveHours,
      nowMs,
    ),
    {
      label: "Provider response rate",
      current: percent(respondedCandidates.length, contactedCandidates.length),
      target: ">=60% responsive providers",
      detail: `${respondedCandidates.length} candidates have a real response event; ${contactedCandidates.length} candidates were contacted. No-response marks do not count as responses.`,
    },
    makeSlaMetric(
      "First provider contact under 24h",
      "<24h after request qualified",
      qualifiedToContactPairs,
      twentyFourHours,
      nowMs,
    ),
    makeSlaMetric(
      "Shortlist presented under 24h",
      "<24h after request qualified",
      qualifiedToShortlistPairs,
      twentyFourHours,
      nowMs,
    ),
    makeLatencyMetric(
      "Request submitted -> first operator review",
      "Monitor latency",
      submittedToReviewPairs,
    ),
    makeLatencyMetric(
      "Request submitted -> integrity clear",
      "Monitor latency",
      submittedToIntegrityPairs,
    ),
    makeLatencyMetric(
      "Request qualified -> first provider contacted",
      "Monitor latency",
      qualifiedToContactPairs,
    ),
    makeLatencyMetric(
      "Provider contacted -> first real response",
      "Monitor latency",
      candidateResponsePairs,
    ),
    makeLatencyMetric(
      "Request qualified -> first viable provider",
      "Monitor latency",
      qualifiedToViablePairs,
    ),
    makeLatencyMetric(
      "Request qualified -> first shortlist presented",
      "Monitor latency",
      qualifiedToShortlistPairs,
    ),
    makeLatencyMetric(
      "Shortlist presented -> student decision",
      "Monitor latency",
      shortlistToDecisionPairs,
    ),
    makeLatencyMetric(
      "Student accepted -> engagement created",
      "Monitor latency",
      acceptedToEngagementPairs,
    ),
    makeLatencyMetric(
      "Engagement created -> in progress",
      "Monitor latency",
      engagementCreatedToStartedPairs,
    ),
    makeLatencyMetric(
      "In progress -> submitted",
      "Monitor latency",
      engagementStartedToSubmittedPairs,
    ),
    makeLatencyMetric(
      "Submitted -> completed",
      "Monitor latency",
      engagementSubmittedToCompletedPairs,
    ),
  ] satisfies OpsInstrumentedMetric[];
}

export async function getOpsDashboardData(supabase: Supabase): Promise<OpsData> {
  const [
    { data: requests, error: requestsError },
    { data: providers, error: providersError },
    { data: candidates, error: candidatesError },
    { data: engagements, error: engagementsError },
    { data: workflowEvents, error: workflowEventsError },
    { count: sentEmailCount, error: sentEmailCountError },
    { count: failedEmailCount, error: failedEmailCountError },
    { count: pendingEmailCount, error: pendingEmailCountError },
    { data: oldestUnsentEmails, error: oldestUnsentEmailError },
    { data: recentFailedEmails, error: recentFailedEmailsError },
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
    supabase
      .from("workflow_events")
      .select(
        "event_name, occurred_at, project_request_id, request_candidate_id, provider_application_id, project_engagement_id",
      )
      .order("occurred_at", { ascending: true }),
    supabase
      .from("email_outbox")
      .select("id", { count: "exact", head: true })
      .eq("status", "sent"),
    supabase
      .from("email_outbox")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed"),
    supabase
      .from("email_outbox")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("email_outbox")
      .select("created_at")
      .in("status", ["failed", "pending"])
      .order("created_at", { ascending: true })
      .limit(1),
    supabase
      .from("email_outbox")
      .select(
        "id, template_key, recipient_role, status, attempt_count, last_error, created_at, updated_at",
      )
      .eq("status", "failed")
      .order("updated_at", { ascending: false })
      .limit(10),
  ]);

  if (
    requestsError ||
    providersError ||
    candidatesError ||
    engagementsError ||
    workflowEventsError ||
    sentEmailCountError ||
    failedEmailCountError ||
    pendingEmailCountError ||
    oldestUnsentEmailError ||
    recentFailedEmailsError
  ) {
    throw new Error("Unable to load operations metrics.");
  }

  const safeRequests = requests satisfies ProjectRequest[];
  const safeProviders = providers satisfies ProviderApplication[];
  const safeCandidates = candidates satisfies RequestCandidate[];
  const safeEngagements = engagements satisfies ProjectEngagement[];
  const safeWorkflowEvents = workflowEvents satisfies WorkflowEvent[];
  const eventMaps = buildEventMaps(safeWorkflowEvents);

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
        "Current approved supply only; historical provider approval timing lives in workflow events after Phase 2.1 instrumentation.",
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
        "Per request, counts interested provider response or accepted candidate evidence across the full current dataset.",
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
    emailDelivery: {
      failedCount: failedEmailCount ?? 0,
      oldestUnsentAt: oldestUnsentEmails?.[0]?.created_at ?? null,
      pendingCount: pendingEmailCount ?? 0,
      recentFailed: recentFailedEmails satisfies OpsEmailFailure[],
      sentCount: sentEmailCount ?? 0,
    },
    metrics,
    instrumentedMetrics: buildInstrumentedMetrics({
      candidates: safeCandidates,
      engagements: safeEngagements,
      eventMaps,
      requests: safeRequests,
    }),
    funnel,
    gaps: [
      "Historical material dispute rate remains unsupported because dispute and refund definitions need a stable denominator and resolution model.",
      "Payment and repeat/referral metrics remain current-state outcome metrics for now.",
    ],
    dataQualityWarnings: [
      "Current metrics may include development/test records and should not yet be treated as pilot validation results.",
      "Event-based SLA metrics exclude pre-Phase-2.1 rows and records without the required start event.",
      "Latency samples require both start and end events; pending or incomplete records are reported separately rather than treated as zero latency.",
      "Threshold SLA metrics include only matured instrumented starts in the denominator; younger records are pending/censored.",
      "Cancelled or rejected requests with historical matching evidence cannot always be classified perfectly without qualification history.",
      "Provider status is mutable, so current approved providers should not be read as ever-vetted provider count.",
    ],
  };
}
