import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";

const requestStatuses = [
  "new",
  "needs_clarification",
  "reviewed",
  "rejected",
] as const;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatStatus(value: string) {
  return value.replaceAll("_", " ");
}

type AdminRequestsPageProps = {
  searchParams: Promise<{
    error?: string;
    status?: string;
  }>;
};

export default async function AdminRequestsPage({
  searchParams,
}: AdminRequestsPageProps) {
  const { supabase } = await requireAdmin();
  const params = await searchParams;
  const selectedStatus = requestStatuses.includes(
    params.status as (typeof requestStatuses)[number],
  )
    ? params.status
    : undefined;

  let query = supabase
    .from("project_requests")
    .select(
      "id, requester_name, contact_method, category, budget_range, currency, status, integrity_review_status, created_at, reviewed_at",
    )
    .order("created_at", { ascending: false });

  if (selectedStatus) {
    query = query.eq("status", selectedStatus);
  }

  const { data: requests, error } = await query;

  return (
    <section>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.12em] text-blue-700">
            Project requests
          </p>
          <h2 className="mt-2 text-3xl font-bold text-slate-950">
            Review queue
          </h2>
        </div>

        <nav className="flex flex-wrap gap-2 text-sm font-bold">
          <Link
            className={`rounded-lg border px-3 py-2 ${
              selectedStatus
                ? "border-slate-200 bg-white text-slate-700"
                : "border-blue-700 bg-blue-700 text-white"
            }`}
            href="/admin/requests"
          >
            All
          </Link>
          {requestStatuses.map((status) => (
            <Link
              className={`rounded-lg border px-3 py-2 ${
                selectedStatus === status
                  ? "border-blue-700 bg-blue-700 text-white"
                  : "border-slate-200 bg-white text-slate-700"
              }`}
              href={`/admin/requests?status=${status}`}
              key={status}
            >
              {formatStatus(status)}
            </Link>
          ))}
        </nav>
      </div>

      {params.error ? <div className="notice-error mt-6">{params.error}</div> : null}

      {error ? (
        <div className="notice-error mt-6">
          We could not load project requests.
        </div>
      ) : null}

      {!error && requests?.length === 0 ? (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 text-slate-700">
          No project requests found.
        </div>
      ) : null}

      {requests && requests.length > 0 ? (
        <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full min-w-[860px] border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.08em] text-slate-600">
              <tr>
                <th className="border-b border-slate-200 px-4 py-3">Request</th>
                <th className="border-b border-slate-200 px-4 py-3">Category</th>
                <th className="border-b border-slate-200 px-4 py-3">Budget</th>
                <th className="border-b border-slate-200 px-4 py-3">Status</th>
                <th className="border-b border-slate-200 px-4 py-3">
                  Integrity
                </th>
                <th className="border-b border-slate-200 px-4 py-3">Created</th>
                <th className="border-b border-slate-200 px-4 py-3">
                  Review
                </th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr className="align-top" key={request.id}>
                  <td className="border-b border-slate-100 px-4 py-4">
                    <div className="font-bold text-slate-950">
                      {request.requester_name}
                    </div>
                    <div className="mt-1 text-slate-600">
                      {formatStatus(request.contact_method)}
                    </div>
                  </td>
                  <td className="border-b border-slate-100 px-4 py-4">
                    {formatStatus(request.category)}
                  </td>
                  <td className="border-b border-slate-100 px-4 py-4">
                    {formatStatus(request.budget_range)} {request.currency}
                  </td>
                  <td className="border-b border-slate-100 px-4 py-4">
                    {formatStatus(request.status)}
                  </td>
                  <td className="border-b border-slate-100 px-4 py-4">
                    {formatStatus(request.integrity_review_status)}
                  </td>
                  <td className="border-b border-slate-100 px-4 py-4">
                    {formatDate(request.created_at)}
                  </td>
                  <td className="border-b border-slate-100 px-4 py-4">
                    <Link
                      className="font-bold text-blue-700"
                      href={`/admin/requests/${request.id}`}
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
