import Link from "next/link";
import { PaginationControls } from "@/components/workspace/pagination-controls";
import { StatusBadge } from "@/components/workspace/status-badge";
import type { PaginatedResult, ProjectRequestSummary } from "@/lib/workspace/data";
import { formatDate } from "@/lib/workspace/status";

type ProjectRequestListProps = {
  result: PaginatedResult<ProjectRequestSummary>;
};

export function ProjectRequestList({ result }: ProjectRequestListProps) {
  if (result.error) {
    return <div className="notice-error">We could not load your requests.</div>;
  }

  if (result.rows.length === 0) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">
          No project requests yet.
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Submit a project request when you are ready for operator review.
        </p>
        <Link className="button-primary mt-5" href="/request">
          Submit project request
        </Link>
      </section>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Project</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Integrity</th>
              <th className="px-4 py-3">Budget</th>
              <th className="px-4 py-3">Deadline</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {result.rows.map((request) => (
              <tr key={request.id}>
                <td className="px-4 py-4">
                  <div className="font-bold text-slate-950">
                    {request.category}
                  </div>
                  <p className="mt-1 line-clamp-2 max-w-md text-slate-600">
                    {request.description}
                  </p>
                </td>
                <td className="px-4 py-4">
                  <StatusBadge tone="blue" value={request.status} />
                </td>
                <td className="px-4 py-4">
                  <StatusBadge value={request.integrity_review_status} />
                </td>
                <td className="px-4 py-4 text-slate-700">
                  {request.budget_range} {request.currency}
                </td>
                <td className="px-4 py-4 text-slate-700">
                  {request.deadline_flexible
                    ? "Flexible"
                    : formatDate(request.deadline)}
                </td>
                <td className="px-4 py-4 text-slate-700">
                  {formatDate(request.created_at)}
                </td>
                <td className="px-4 py-4">
                  <Link
                    className="font-bold text-blue-700"
                    href={`/app/requests/${request.id}`}
                  >
                    View details
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PaginationControls
        page={result.page}
        pageCount={result.pageCount}
        pathname="/app/requests"
      />
    </div>
  );
}
