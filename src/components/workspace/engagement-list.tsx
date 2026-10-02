import { PaginationControls } from "@/components/workspace/pagination-controls";
import { StatusBadge } from "@/components/workspace/status-badge";
import type { EngagementSummary, PaginatedResult } from "@/lib/workspace/data";
import { mapParticipantSide } from "@/lib/workspace/roles";
import { formatCurrency, formatDate } from "@/lib/workspace/status";

type EngagementListProps = {
  result: PaginatedResult<EngagementSummary>;
};

export function EngagementList({ result }: EngagementListProps) {
  if (result.error) {
    return <div className="notice-error">We could not load your engagements.</div>;
  }

  if (result.rows.length === 0) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">
          No engagements yet.
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Matched work will appear here once an engagement is created.
        </p>
      </section>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3">
        {result.rows.map((engagement) => (
          <article
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
            key={engagement.engagement_id}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  {engagement.category}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {mapParticipantSide(engagement.participant_side)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge tone="blue" value={engagement.status} />
                <StatusBadge value={engagement.payment_status} />
              </div>
            </div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
              <div>
                <dt className="font-bold text-slate-700">Amount</dt>
                <dd className="mt-1 text-slate-600">
                  {formatCurrency(engagement.agreed_amount, engagement.currency)}
                </dd>
              </div>
              <div>
                <dt className="font-bold text-slate-700">Deadline</dt>
                <dd className="mt-1 text-slate-600">
                  {formatDate(engagement.agreed_deadline)}
                </dd>
              </div>
              <div>
                <dt className="font-bold text-slate-700">Started</dt>
                <dd className="mt-1 text-slate-600">
                  {formatDate(engagement.started_at)}
                </dd>
              </div>
              <div>
                <dt className="font-bold text-slate-700">Updated</dt>
                <dd className="mt-1 text-slate-600">
                  {formatDate(engagement.updated_at)}
                </dd>
              </div>
            </dl>
          </article>
        ))}
      </div>

      <PaginationControls
        page={result.page}
        pageCount={result.pageCount}
        pathname="/app/engagements"
      />
    </div>
  );
}
