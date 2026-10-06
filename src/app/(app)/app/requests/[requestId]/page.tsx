import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/workspace/status-badge";
import { requireUser } from "@/lib/auth/user";
import {
  getMyProjectRequestDetail,
  getRequestMatchingCandidates,
} from "@/lib/workspace/data";
import { isUuid } from "@/lib/workspace/route-params";
import { formatDate } from "@/lib/workspace/status";
import { decideOnMyPresentedCandidate } from "./actions";

type RequestDetailPageProps = {
  params: Promise<{
    requestId: string;
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

export default async function RequestDetailPage({
  params,
  searchParams,
}: RequestDetailPageProps) {
  const { requestId } = await params;
  const query = await searchParams;

  if (!isUuid(requestId)) {
    notFound();
  }

  const { supabase } = await requireUser();
  const request = await getMyProjectRequestDetail(supabase, requestId);

  if (!request) {
    notFound();
  }

  const matchingCandidates = getRequestMatchingCandidates(request);

  return (
    <div className="grid gap-6">
      <header>
        <Link className="text-sm font-bold text-blue-700" href="/app/requests">
          Back to requests
        </Link>
        <p className="mt-6 text-sm font-bold uppercase text-blue-700">
          Request details
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">
          {request.category}
        </h1>
        <div className="mt-4 flex flex-wrap gap-2">
          <StatusBadge tone="blue" value={request.status} />
          <StatusBadge value={request.integrity_review_status} />
        </div>
      </header>

      {query.saved === "student_decision" ? (
        <div className="notice-success">Your decision was saved.</div>
      ) : null}

      {query.error ? <div className="notice-error">{query.error}</div> : null}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">Project brief</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
          {request.description}
        </p>
        {request.desired_deliverables ? (
          <div className="mt-5">
            <h3 className="font-bold text-slate-800">Desired deliverables</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
              {request.desired_deliverables}
            </p>
          </div>
        ) : null}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">Lifecycle</h2>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
          <DetailItem label="Budget" value={`${request.budget_range} ${request.currency}`} />
          <DetailItem
            label="Deadline"
            value={request.deadline_flexible ? "Flexible" : formatDate(request.deadline)}
          />
          <DetailItem label="Created" value={formatDate(request.created_at)} />
          <DetailItem label="Updated" value={formatDate(request.updated_at)} />
        </dl>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">Matching candidates</h2>
        {matchingCandidates.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">
            No candidate lifecycle records are available yet.
          </p>
        ) : (
          <div className="mt-4 grid gap-3">
            {matchingCandidates.map((candidate) => (
              <article
                className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                key={candidate.request_candidate_id}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="font-bold text-slate-950">
                      Candidate{" "}
                      {candidate.candidate_rank === null
                        ? "unranked"
                        : `#${candidate.candidate_rank}`}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Response: {candidate.provider_response_status}
                    </p>
                  </div>
                  <StatusBadge value={candidate.student_decision_status} />
                </div>
                {candidate.engagement_id ? (
                  <Link
                    className="mt-4 inline-block font-bold text-blue-700"
                    href={`/app/engagements/${candidate.engagement_id}`}
                  >
                    View engagement
                  </Link>
                ) : (
                  <p className="mt-4 text-sm text-slate-600">
                    No linked engagement for this candidate yet.
                  </p>
                )}
                {request.status === "reviewed" &&
                request.integrity_review_status === "clear" &&
                candidate.provider_response_status === "interested" &&
                candidate.student_decision_status === "presented" &&
                candidate.candidate_rank !== null ? (
                  <div className="mt-4 grid gap-3 border-t border-slate-200 pt-4">
                    <form action={decideOnMyPresentedCandidate} className="flex flex-wrap gap-3">
                      <input name="requestId" type="hidden" value={request.id} />
                      <input
                        name="requestCandidateId"
                        type="hidden"
                        value={candidate.request_candidate_id}
                      />
                      <input name="decision" type="hidden" value="accepted" />
                      <button className="button-primary" type="submit">
                        Accept
                      </button>
                    </form>
                    <form action={decideOnMyPresentedCandidate} className="grid gap-3">
                      <input name="requestId" type="hidden" value={request.id} />
                      <input
                        name="requestCandidateId"
                        type="hidden"
                        value={candidate.request_candidate_id}
                      />
                      <input name="decision" type="hidden" value="declined" />
                      <label className="form-field">
                        <span className="form-label">Decline reason</span>
                        <textarea
                          className="form-input min-h-24"
                          maxLength={1000}
                          name="declineReason"
                        />
                      </label>
                      <button className="button-secondary w-fit" type="submit">
                        Decline
                      </button>
                    </form>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
