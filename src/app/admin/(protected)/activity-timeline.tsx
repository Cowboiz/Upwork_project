import Link from "next/link";
import type { Database, Json } from "@/types/database.types";

type WorkflowEventRow = Database["public"]["Tables"]["workflow_events"]["Row"];

type WorkflowEvent = Pick<
  WorkflowEventRow,
  "actor_user_id" | "event_name" | "id" | "metadata" | "occurred_at"
> &
  Partial<
    Pick<
      WorkflowEventRow,
      "project_request_id" | "request_candidate_id" | "project_engagement_id"
    >
  >;

const eventLabels: Record<string, string> = {
  candidate_added: "Candidate added",
  engagement_cancelled: "Engagement cancelled",
  engagement_completed: "Engagement completed",
  engagement_created: "Engagement created",
  engagement_disputed: "Engagement disputed",
  engagement_started: "Engagement started",
  engagement_submitted: "Engagement submitted",
  payment_status_changed: "Payment status changed",
  provider_application_submitted: "Provider application submitted",
  provider_approved: "Provider approved",
  provider_first_reviewed: "Provider first reviewed",
  provider_contacted: "Provider contacted",
  provider_no_response_marked: "Provider no response marked",
  provider_responded_declined: "Provider declined",
  provider_responded_interested: "Provider interested",
  provider_withdrawn: "Provider withdrawn",
  request_first_reviewed: "Request first reviewed",
  request_integrity_cleared: "Integrity cleared",
  request_integrity_rejected: "Integrity rejected",
  request_qualified: "Request qualified",
  request_submitted: "Request submitted",
  shortlist_presented: "Provider match presented",
  student_decision_accepted: "Student accepted",
  student_decision_declined: "Student declined",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatStatus(value: string) {
  return value.replaceAll("_", " ");
}

function metadataObject(value: Json) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value;
}

function metadataString(value: Json | undefined) {
  return typeof value === "string" ? value : null;
}

function metadataNumber(value: Json | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function transitionDetail(metadata: Json) {
  const object = metadataObject(metadata);
  const from = metadataString(object?.from);
  const to = metadataString(object?.to);

  if (!from || !to) {
    return null;
  }

  return `${formatStatus(from)} -> ${formatStatus(to)}`;
}

function candidateRankDetail(metadata: Json) {
  const object = metadataObject(metadata);
  const rank = metadataNumber(object?.candidate_rank);

  return rank === null ? null : `Rank ${rank}`;
}

function declinedByDetail(metadata: Json) {
  const object = metadataObject(metadata);
  const declinedBy = metadataString(object?.declined_by);

  return declinedBy ? `Declined by ${formatStatus(declinedBy)}` : null;
}

function requestQualifiedDetail(metadata: Json) {
  const object = metadataObject(metadata);
  const status = metadataString(object?.status);
  const integrity = metadataString(object?.integrity_review_status);

  if (!status || !integrity) {
    return null;
  }

  return `${formatStatus(status)}, integrity ${formatStatus(integrity)}`;
}

function eventDetail(event: WorkflowEvent) {
  switch (event.event_name) {
    case "request_integrity_cleared":
    case "request_integrity_rejected":
    case "provider_approved":
    case "provider_responded_interested":
    case "provider_no_response_marked":
    case "engagement_submitted":
    case "engagement_completed":
    case "engagement_cancelled":
    case "engagement_disputed":
    case "payment_status_changed":
      return transitionDetail(event.metadata);
    case "provider_responded_declined":
    case "provider_withdrawn": {
      const transition = transitionDetail(event.metadata);
      const declinedBy = declinedByDetail(event.metadata);

      return [transition, declinedBy].filter(Boolean).join("; ") || null;
    }
    case "request_qualified":
      return requestQualifiedDetail(event.metadata);
    case "shortlist_presented":
    case "student_decision_accepted": {
      const transition = transitionDetail(event.metadata);
      const rank = candidateRankDetail(event.metadata);

      return [rank, transition].filter(Boolean).join("; ") || null;
    }
    case "student_decision_declined": {
      const transition = transitionDetail(event.metadata);
      const rank = candidateRankDetail(event.metadata);
      const declinedBy = declinedByDetail(event.metadata);

      return [rank, transition, declinedBy].filter(Boolean).join("; ") || null;
    }
    default:
      return null;
  }
}

function eventLabel(eventName: string) {
  return eventLabels[eventName] ?? formatStatus(eventName);
}

export function ActivityTimeline({
  emptyMessage = "No workflow events have been recorded yet.",
  events,
  showRequestLinks = false,
}: {
  emptyMessage?: string;
  events: WorkflowEvent[];
  showRequestLinks?: boolean;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <h3 className="text-xl font-bold text-slate-950">Activity timeline</h3>

      {events.length > 0 ? (
        <ol className="mt-4 grid gap-3">
          {events.map((event) => {
            const detail = eventDetail(event);

            return (
              <li
                className="border-l-2 border-slate-200 pl-3 text-sm"
                key={event.id}
              >
                <div className="font-bold text-slate-950">
                  {eventLabel(event.event_name)}
                </div>
                <div className="mt-1 text-slate-600">
                  {formatDate(event.occurred_at)}
                </div>
                <div className="mt-1 text-slate-600">
                  {event.actor_user_id ? "admin" : "system/public flow"}
                </div>
                {detail ? (
                  <div className="mt-1 text-slate-700">{detail}</div>
                ) : null}
                {showRequestLinks && event.project_request_id ? (
                  <Link
                    className="mt-2 inline-block font-bold text-blue-700"
                    href={`/admin/requests/${event.project_request_id}`}
                  >
                    View request
                  </Link>
                ) : null}
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="mt-4 text-sm text-slate-700">{emptyMessage}</p>
      )}
    </section>
  );
}
