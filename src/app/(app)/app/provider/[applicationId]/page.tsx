import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/workspace/status-badge";
import { requireUser } from "@/lib/auth/user";
import {
  getMyProviderApplicationDetail,
  getProviderApplicationMatches,
} from "@/lib/workspace/data";
import { canProviderRespondToMatch } from "@/lib/workspace/matching-action-state";
import { isUuid } from "@/lib/workspace/route-params";
import { formatCurrency, formatDate } from "@/lib/workspace/status";
import { respondToMyRequestCandidate } from "./actions";

type ProviderApplicationDetailPageProps = {
  params: Promise<{
    applicationId: string;
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

export default async function ProviderApplicationDetailPage({
  params,
  searchParams,
}: ProviderApplicationDetailPageProps) {
  const { applicationId } = await params;
  const query = await searchParams;

  if (!isUuid(applicationId)) {
    notFound();
  }

  const { supabase } = await requireUser();
  const application = await getMyProviderApplicationDetail(
    supabase,
    applicationId,
  );

  if (!application) {
    notFound();
  }

  const matches = getProviderApplicationMatches(application);

  return (
    <div className="grid gap-6">
      <header>
        <Link className="text-sm font-bold text-blue-700" href="/app/provider">
          Back to provider applications
        </Link>
        <p className="mt-6 text-sm font-bold uppercase text-blue-700">
          Provider application details
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">
          {application.applicant_name}
        </h1>
        <div className="mt-4">
          <StatusBadge tone="blue" value={application.status} />
        </div>
      </header>

      {query.saved === "provider_response" ? (
        <div className="notice-success">Your response was saved.</div>
      ) : null}

      {query.error ? <div className="notice-error">{query.error}</div> : null}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">Application</h2>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
          <DetailItem label="Availability" value={application.availability} />
          <DetailItem label="Rate" value={application.rate_expectations} />
          <DetailItem label="Created" value={formatDate(application.created_at)} />
          <DetailItem label="Updated" value={formatDate(application.updated_at)} />
          <DetailItem
            label="Skills"
            value={application.skills.join(", ") || "Not provided"}
          />
          <DetailItem
            label="Preferred projects"
            value={application.preferred_project_types.join(", ") || "Not provided"}
          />
        </dl>
        {application.portfolio_urls.length > 0 ? (
          <div className="mt-5">
            <h3 className="font-bold text-slate-800">Portfolio</h3>
            <ul className="mt-2 grid gap-2 text-sm">
              {application.portfolio_urls.map((url) => (
                <li key={url}>
                  <a className="font-bold text-blue-700" href={url}>
                    {url}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">Matching</h2>
        {matches.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">
            No matching lifecycle records are available yet.
          </p>
        ) : (
          <div className="mt-4 grid gap-3">
            {matches.map((match) => (
              <article
                className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                key={match.request_candidate_id}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="font-bold text-slate-950">
                      {match.request_category || "Project request"}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Candidate{" "}
                      {match.candidate_rank === null
                        ? "unranked"
                        : `#${match.candidate_rank}`}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge value={match.provider_response_status} />
                    <StatusBadge value={match.student_decision_status} />
                  </div>
                </div>
                <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
                  <DetailItem
                    label="Proposed price"
                    value={formatCurrency(match.proposed_price, match.currency)}
                  />
                  <DetailItem
                    label="Agreed price"
                    value={formatCurrency(match.agreed_price, match.currency)}
                  />
                  <DetailItem
                    label="Agreed deadline"
                    value={formatDate(match.agreed_deadline)}
                  />
                </dl>
                {match.engagement_id ? (
                  <Link
                    className="mt-4 inline-block font-bold text-blue-700"
                    href={`/app/engagements/${match.engagement_id}`}
                  >
                    View engagement
                  </Link>
                ) : (
                  <p className="mt-4 text-sm text-slate-600">
                    No linked engagement for this match yet.
                  </p>
                )}
                {canProviderRespondToMatch(match) ? (
                  <div className="mt-4 grid gap-3 border-t border-slate-200 pt-4">
                    <form action={respondToMyRequestCandidate} className="flex flex-wrap gap-3">
                      <input name="applicationId" type="hidden" value={application.id} />
                      <input
                        name="requestCandidateId"
                        type="hidden"
                        value={match.request_candidate_id}
                      />
                      <input name="response" type="hidden" value="interested" />
                      <button className="button-primary" type="submit">
                        Interested
                      </button>
                    </form>
                    <form action={respondToMyRequestCandidate} className="grid gap-3">
                      <input name="applicationId" type="hidden" value={application.id} />
                      <input
                        name="requestCandidateId"
                        type="hidden"
                        value={match.request_candidate_id}
                      />
                      <input name="response" type="hidden" value="declined" />
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
