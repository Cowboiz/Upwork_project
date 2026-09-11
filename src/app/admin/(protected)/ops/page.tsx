import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { getOpsDashboardData } from "@/lib/admin/ops";

function confidenceLabel(value: string) {
  return value
    .split("-")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function AdminOpsPage() {
  const { supabase } = await requireAdmin();
  const data = await getOpsDashboardData(supabase);

  return (
    <section className="grid gap-6">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.12em] text-blue-700">
          Operations overview
        </p>
        <h2 className="mt-2 text-3xl font-bold text-slate-950">
          Validation dashboard
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700">
          Read-only Stage 1 operating metrics from the canonical transactional
          tables. Metrics are labelled by confidence so proxies do not look like
          exact validation proof.
        </p>
      </div>

      <section className="notice-info">
        Current metrics may include development/test records and should not yet
        be treated as pilot validation results.
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-950">
              Needs attention
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Actionable queues for the operator to inspect in existing admin
              workflows.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.queues.map((queue) => {
            const content = (
              <>
                <div className="text-3xl font-bold text-slate-950">
                  {queue.value}
                </div>
                <div className="mt-2 font-bold text-slate-900">
                  {queue.label}
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {queue.description}
                </p>
              </>
            );

            return queue.href ? (
              <Link
                className="rounded-lg border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-300 hover:bg-blue-50"
                href={queue.href}
                key={queue.label}
              >
                {content}
              </Link>
            ) : (
              <div
                className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                key={queue.label}
              >
                {content}
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h3 className="text-xl font-bold text-slate-950">
          Validation snapshot
        </h3>
        <div className="mt-5 overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.08em] text-slate-600">
              <tr>
                <th className="border-b border-slate-200 px-4 py-3">Metric</th>
                <th className="border-b border-slate-200 px-4 py-3">Current</th>
                <th className="border-b border-slate-200 px-4 py-3">Target</th>
                <th className="border-b border-slate-200 px-4 py-3">
                  Interpretation / confidence
                </th>
              </tr>
            </thead>
            <tbody>
              {data.metrics.map((metric) => (
                <tr className="align-top" key={metric.label}>
                  <td className="border-b border-slate-100 px-4 py-4 font-bold text-slate-950">
                    {metric.label}
                  </td>
                  <td className="border-b border-slate-100 px-4 py-4 text-slate-900">
                    {metric.current}
                  </td>
                  <td className="border-b border-slate-100 px-4 py-4 text-slate-900">
                    {metric.target}
                  </td>
                  <td className="border-b border-slate-100 px-4 py-4 text-slate-700">
                    <div className="font-bold text-slate-900">
                      {confidenceLabel(metric.confidence)}
                    </div>
                    <p className="mt-1 leading-6">{metric.interpretation}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h3 className="text-xl font-bold text-slate-950">Funnel snapshot</h3>
        <div className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {data.funnel.map((step, index) => (
            <div
              className="rounded-lg border border-slate-200 bg-slate-50 p-4"
              key={step.label}
            >
              <div className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                Step {index + 1}
              </div>
              <div className="mt-3 text-3xl font-bold text-slate-950">
                {step.value}
              </div>
              <div className="mt-2 text-sm font-bold leading-5 text-slate-800">
                {step.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h3 className="text-xl font-bold text-slate-950">
            Data quality notes
          </h3>
          <ul className="mt-4 grid gap-3 text-sm leading-6 text-slate-700">
            {data.dataQualityWarnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h3 className="text-xl font-bold text-slate-950">
            Instrumentation gaps
          </h3>
          <ul className="mt-4 grid gap-3 text-sm leading-6 text-slate-700">
            {data.gaps.map((gap) => (
              <li key={gap}>{gap}</li>
            ))}
          </ul>
        </div>
      </section>
    </section>
  );
}
