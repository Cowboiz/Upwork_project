import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { getAdminOverviewData } from "@/lib/admin/overview";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatStatus(value: string) {
  return value.replaceAll("_", " ");
}

export default async function AdminDashboardPage() {
  const { supabase } = await requireAdmin();
  const data = await getAdminOverviewData(supabase);

  return (
    <section className="grid gap-6">
      <header>
        <p className="text-sm font-bold uppercase text-blue-700">
          Admin dashboard
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">
          Operating overview
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700">
          Current queues and recent workflow activity from live admin-accessible
          records. Contact values and email addresses are intentionally omitted.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.metrics.map((metric) => (
          <Link
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
            href={metric.href}
            key={metric.label}
          >
            <div className="text-3xl font-bold text-slate-950">
              {metric.value}
            </div>
            <div className="mt-2 text-sm font-bold leading-5 text-slate-700">
              {metric.label}
            </div>
          </Link>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-950">
                Recent requests
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Latest submitted requests without contact details.
              </p>
            </div>
            <Link className="text-sm font-bold text-blue-700" href="/admin/requests">
              View all
            </Link>
          </div>

          {data.recentRequests.length > 0 ? (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[620px] border-collapse text-left text-sm">
                <thead className="text-xs uppercase text-slate-500">
                  <tr>
                    <th className="border-b border-slate-200 py-3 pr-4">
                      Request
                    </th>
                    <th className="border-b border-slate-200 px-4 py-3">
                      Category
                    </th>
                    <th className="border-b border-slate-200 px-4 py-3">
                      State
                    </th>
                    <th className="border-b border-slate-200 px-4 py-3">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentRequests.map((request) => (
                    <tr className="align-top" key={request.id}>
                      <td className="border-b border-slate-100 py-4 pr-4">
                        <Link
                          className="font-bold text-slate-950 hover:text-blue-700"
                          href={`/admin/requests/${request.id}`}
                        >
                          {request.requester_name}
                        </Link>
                      </td>
                      <td className="border-b border-slate-100 px-4 py-4 text-slate-700">
                        {formatStatus(request.category)}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-4 text-slate-700">
                        <div>{formatStatus(request.status)}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {formatStatus(request.integrity_review_status)}
                        </div>
                      </td>
                      <td className="border-b border-slate-100 px-4 py-4 text-slate-700">
                        {formatDate(request.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="notice-info mt-5">No recent requests found.</div>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-slate-950">
              Recent activity
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Latest workflow events across requests, candidates, and
              engagements.
            </p>
          </div>

          {data.recentWorkflowEvents.length > 0 ? (
            <ol className="mt-5 grid gap-3">
              {data.recentWorkflowEvents.map((event) => (
                <li
                  className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                  key={event.id}
                >
                  <div className="text-sm font-bold text-slate-950">
                    {formatStatus(event.event_name)}
                  </div>
                  <div className="mt-1 text-xs text-slate-600">
                    {formatDate(event.occurred_at)}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div className="notice-info mt-5">No workflow events found.</div>
          )}
        </div>
      </section>
    </section>
  );
}
