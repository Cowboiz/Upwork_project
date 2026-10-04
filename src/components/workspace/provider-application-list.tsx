import Link from "next/link";
import { PaginationControls } from "@/components/workspace/pagination-controls";
import { StatusBadge } from "@/components/workspace/status-badge";
import type {
  PaginatedResult,
  ProviderApplicationSummary,
} from "@/lib/workspace/data";
import { formatDate } from "@/lib/workspace/status";

type ProviderApplicationListProps = {
  result: PaginatedResult<ProviderApplicationSummary>;
};

export function ProviderApplicationList({ result }: ProviderApplicationListProps) {
  if (result.error) {
    return (
      <div className="notice-error">
        We could not load your provider applications.
      </div>
    );
  }

  if (result.rows.length === 0) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">
          No provider applications yet.
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Apply as a provider to enter the curated matching workflow.
        </p>
        <Link className="button-primary mt-5" href="/provider/apply">
          Apply as provider
        </Link>
      </section>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3">
        {result.rows.map((application) => (
          <article
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
            key={application.id}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  {application.applicant_name}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {application.skills.join(", ") || "Skills not provided"}
                </p>
              </div>
              <StatusBadge tone="blue" value={application.status} />
            </div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="font-bold text-slate-700">Availability</dt>
                <dd className="mt-1 text-slate-600">
                  {application.availability}
                </dd>
              </div>
              <div>
                <dt className="font-bold text-slate-700">Rate</dt>
                <dd className="mt-1 text-slate-600">
                  {application.rate_expectations}
                </dd>
              </div>
              <div>
                <dt className="font-bold text-slate-700">Created</dt>
                <dd className="mt-1 text-slate-600">
                  {formatDate(application.created_at)}
                </dd>
              </div>
            </dl>
          </article>
        ))}
      </div>

      <PaginationControls
        page={result.page}
        pageCount={result.pageCount}
        pathname="/app/provider"
      />
    </div>
  );
}
