import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/workspace/status-badge";
import { requireUser } from "@/lib/auth/user";
import { getMyEngagementDetail } from "@/lib/workspace/data";
import { mapParticipantSide } from "@/lib/workspace/roles";
import { isUuid } from "@/lib/workspace/route-params";
import { formatCurrency, formatDate } from "@/lib/workspace/status";

type EngagementDetailPageProps = {
  params: Promise<{
    engagementId: string;
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

export default async function EngagementDetailPage({
  params,
}: EngagementDetailPageProps) {
  const { engagementId } = await params;

  if (!isUuid(engagementId)) {
    notFound();
  }

  const { supabase } = await requireUser();
  const engagement = await getMyEngagementDetail(supabase, engagementId);

  if (!engagement) {
    notFound();
  }

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
