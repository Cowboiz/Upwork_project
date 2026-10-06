import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/workspace/status-badge";
import { requireUser } from "@/lib/auth/user";
import {
  getMyEngagementActionState,
  getMyEngagementDetail,
} from "@/lib/workspace/data";
import { mapParticipantSide } from "@/lib/workspace/roles";
import { isUuid } from "@/lib/workspace/route-params";
import { formatCurrency, formatDate } from "@/lib/workspace/status";
import {
  completeMyEngagement,
  disputeMyEngagement,
  startMyEngagementWork,
  submitMyEngagementDeliverable,
  submitMyEngagementFeedback,
} from "./actions";

type EngagementDetailPageProps = {
  params: Promise<{
    engagementId: string;
  }>;
  searchParams: Promise<{
    error?: string;
    saved?: string;
  }>;
};

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <dt className="font-bold text-slate-700">{label}</dt>
      <dd className="mt-1 text-slate-600">{value}</dd>
    </div>
  );
}

function savedMessage(value: string | undefined) {
  switch (value) {
    case "started":
      return "Work started.";
    case "submitted":
      return "Deliverable submitted.";
    case "completed":
      return "Engagement completed.";
    case "disputed":
      return "Dispute submitted.";
    case "feedback":
      return "Feedback submitted.";
    default:
      return null;
  }
}

function errorMessage(value: string | undefined) {
  switch (value) {
    case "closed":
      return "This action is no longer available.";
    case "invalid_deliverable":
      return "Add a valid deliverable URL or summary.";
    case "invalid_dispute":
      return "Add issue details before submitting a dispute.";
    case "invalid_feedback":
      return "Choose a rating from 1 to 5 and keep feedback brief.";
    case "conflict":
      return "This action conflicts with the current engagement state.";
    case "invalid":
      return "We could not save that action.";
    default:
      return null;
  }
}

export default async function EngagementDetailPage({
  params,
  searchParams,
}: EngagementDetailPageProps) {
  const { engagementId } = await params;
  const query = await searchParams;

  if (!isUuid(engagementId)) {
    notFound();
  }

  const { supabase } = await requireUser();
  const [engagement, actionState] = await Promise.all([
    getMyEngagementDetail(supabase, engagementId),
    getMyEngagementActionState(supabase, engagementId),
  ]);

  if (!engagement || !actionState) {
    notFound();
  }

  const saved = savedMessage(query.saved);
  const error = errorMessage(query.error);

  return (
    <div className="grid gap-6">
      <header>
        <Link className="text-sm font-bold text-blue-700" href="/app/engagements">
          Back to engagements
        </Link>
        <p className="mt-6 text-sm font-bold uppercase text-blue-700">
          Engagement details
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">
          {engagement.category}
        </h1>
        <p className="mt-3 max-w-2xl leading-7 text-slate-600">
          Conversation with {engagement.counterparty_display_name}. You are the{" "}
          {mapParticipantSide(engagement.participant_side).toLowerCase()}.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <StatusBadge tone="blue" value={engagement.engagement_status} />
          <StatusBadge value={engagement.payment_status} />
        </div>
      </header>

      {saved ? <div className="notice-success">{saved}</div> : null}
      {error ? <div className="notice-error">{error}</div> : null}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">Agreement</h2>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
          <DetailItem
            label="Amount"
            value={formatCurrency(engagement.agreed_amount, engagement.currency)}
          />
          <DetailItem
            label="Deadline"
            value={formatDate(engagement.agreed_deadline)}
          />
          <DetailItem label="Created" value={formatDate(engagement.created_at)} />
          <DetailItem label="Started" value={formatDate(engagement.started_at)} />
          <DetailItem label="Submitted" value={formatDate(engagement.submitted_at)} />
          <DetailItem label="Completed" value={formatDate(engagement.completed_at)} />
        </dl>
        <Link
          className="button-primary mt-5 w-fit"
          href={`/app/messages/${engagement.engagement_id}`}
        >
          Open messages
        </Link>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">Lifecycle</h2>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
          <DetailItem
            label="Provider response"
            value={engagement.provider_response_status}
          />
          <DetailItem
            label="Student decision"
            value={engagement.student_decision_status}
          />
          <DetailItem label="Updated" value={formatDate(engagement.updated_at)} />
        </dl>
        {engagement.deliverable_summary || engagement.deliverable_url ? (
          <div className="mt-5">
            <h3 className="font-bold text-slate-800">Deliverable</h3>
            {engagement.deliverable_summary ? (
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                {engagement.deliverable_summary}
              </p>
            ) : null}
            {engagement.deliverable_url ? (
              <a className="mt-2 inline-block font-bold text-blue-700" href={engagement.deliverable_url}>
                View deliverable
              </a>
            ) : null}
          </div>
        ) : (
          <p className="mt-5 text-sm text-slate-600">
            No deliverable has been submitted yet.
          </p>
        )}
      </section>

      {actionState.participant_side === "provider" &&
      (actionState.can_start || actionState.can_submit) ? (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">Provider actions</h2>
          {actionState.can_start ? (
            <form action={startMyEngagementWork} className="mt-4">
              <input name="engagementId" type="hidden" value={engagementId} />
              <button className="button-primary" type="submit">
                Start work
              </button>
            </form>
          ) : null}
          {actionState.can_submit ? (
            <form action={submitMyEngagementDeliverable} className="mt-4 grid gap-4">
              <input name="engagementId" type="hidden" value={engagementId} />
              <label className="form-field">
                <span className="form-label">Deliverable URL</span>
                <input
                  className="form-input"
                  maxLength={2000}
                  name="deliverable_url"
                  type="url"
                />
              </label>
              <label className="form-field">
                <span className="form-label">Deliverable summary</span>
                <textarea
                  className="form-input min-h-32"
                  maxLength={5000}
                  name="deliverable_summary"
                />
              </label>
              <button className="button-primary w-fit" type="submit">
                Submit deliverable
              </button>
            </form>
          ) : null}
        </section>
      ) : null}

      {actionState.participant_side === "student" &&
      (actionState.can_complete ||
        actionState.can_dispute ||
        actionState.can_feedback) ? (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">Student actions</h2>
          {actionState.can_complete ? (
            <form action={completeMyEngagement} className="mt-4">
              <input name="engagementId" type="hidden" value={engagementId} />
              <button className="button-primary" type="submit">
                Complete project
              </button>
            </form>
          ) : null}
          {actionState.can_dispute ? (
            <form action={disputeMyEngagement} className="mt-4 grid gap-4">
              <input name="engagementId" type="hidden" value={engagementId} />
              <label className="form-field">
                <span className="form-label">Issue notes</span>
                <textarea
                  className="form-input min-h-32"
                  maxLength={5000}
                  name="dispute_notes"
                  required
                />
              </label>
              <button className="button-secondary w-fit" type="submit">
                Dispute
              </button>
            </form>
          ) : null}
          {actionState.can_feedback ? (
            <form action={submitMyEngagementFeedback} className="mt-4 grid gap-4">
              <input name="engagementId" type="hidden" value={engagementId} />
              <label className="form-field">
                <span className="form-label">Rating</span>
                <select className="form-input" name="rating" required>
                  <option value="">Choose a rating</option>
                  <option value="5">5</option>
                  <option value="4">4</option>
                  <option value="3">3</option>
                  <option value="2">2</option>
                  <option value="1">1</option>
                </select>
              </label>
              <label className="form-field">
                <span className="form-label">Feedback</span>
                <textarea
                  className="form-input min-h-32"
                  maxLength={5000}
                  name="feedback_text"
                />
              </label>
              <button className="button-primary w-fit" type="submit">
                Submit feedback
              </button>
            </form>
          ) : null}
        </section>
      ) : null}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">Feedback</h2>
        {engagement.feedback_rating ? (
          <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
            <DetailItem label="Rating" value={`${engagement.feedback_rating}/5`} />
            <DetailItem
              label="Submitted"
              value={formatDate(engagement.feedback_created_at)}
            />
            <DetailItem
              label="Summary"
              value={engagement.feedback_text ?? "No written feedback"}
            />
          </dl>
        ) : (
          <p className="mt-3 text-sm text-slate-600">
            Feedback has not been submitted yet.
          </p>
        )}
      </section>
    </div>
  );
}
