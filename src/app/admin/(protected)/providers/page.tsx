import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";

const providerStatuses = [
  "new",
  "approved",
  "waitlisted",
  "rejected",
  "inactive",
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

function formatList(values: string[]) {
  return values.length > 0 ? values.join(", ") : "Not provided";
}

type AdminProvidersPageProps = {
  searchParams: Promise<{
    error?: string;
    status?: string;
  }>;
};

export default async function AdminProvidersPage({
  searchParams,
}: AdminProvidersPageProps) {
  const { supabase } = await requireAdmin();
  const params = await searchParams;
  const selectedStatus = providerStatuses.includes(
    params.status as (typeof providerStatuses)[number],
  )
    ? params.status
    : undefined;

  let query = supabase
    .from("provider_applications")
    .select(
      "id, applicant_name, skills, preferred_project_types, availability, rate_expectations, status, created_at",
    )
    .order("created_at", { ascending: false });

  if (selectedStatus) {
    query = query.eq("status", selectedStatus);
  }

  const { data: providers, error } = await query;

  return (
    <section>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.12em] text-blue-700">
            Provider applications
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
            href="/admin/providers"
          >
            All
          </Link>
          {providerStatuses.map((status) => (
            <Link
              className={`rounded-lg border px-3 py-2 ${
                selectedStatus === status
                  ? "border-blue-700 bg-blue-700 text-white"
                  : "border-slate-200 bg-white text-slate-700"
              }`}
              href={`/admin/providers?status=${status}`}
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
          We could not load provider applications.
        </div>
      ) : null}

      {!error && providers?.length === 0 ? (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 text-slate-700">
          No provider applications found.
        </div>
      ) : null}

      {providers && providers.length > 0 ? (
        <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full min-w-[1040px] border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.08em] text-slate-600">
              <tr>
                <th className="border-b border-slate-200 px-4 py-3">
                  Applicant
                </th>
                <th className="border-b border-slate-200 px-4 py-3">Skills</th>
                <th className="border-b border-slate-200 px-4 py-3">
                  Project types
                </th>
                <th className="border-b border-slate-200 px-4 py-3">
                  Availability
                </th>
                <th className="border-b border-slate-200 px-4 py-3">Rates</th>
                <th className="border-b border-slate-200 px-4 py-3">Status</th>
                <th className="border-b border-slate-200 px-4 py-3">Created</th>
                <th className="border-b border-slate-200 px-4 py-3">
                  Review
                </th>
              </tr>
            </thead>
            <tbody>
              {providers.map((provider) => (
                <tr className="align-top" key={provider.id}>
                  <td className="border-b border-slate-100 px-4 py-4">
                    <div className="font-bold text-slate-950">
                      {provider.applicant_name}
                    </div>
                  </td>
                  <td className="border-b border-slate-100 px-4 py-4">
                    {formatList(provider.skills)}
                  </td>
                  <td className="border-b border-slate-100 px-4 py-4">
                    {formatList(provider.preferred_project_types)}
                  </td>
                  <td className="border-b border-slate-100 px-4 py-4">
                    {provider.availability}
                  </td>
                  <td className="border-b border-slate-100 px-4 py-4">
                    {provider.rate_expectations}
                  </td>
                  <td className="border-b border-slate-100 px-4 py-4">
                    {formatStatus(provider.status)}
                  </td>
                  <td className="border-b border-slate-100 px-4 py-4">
                    {formatDate(provider.created_at)}
                  </td>
                  <td className="border-b border-slate-100 px-4 py-4">
                    <Link
                      className="font-bold text-blue-700"
                      href={`/admin/providers/${provider.id}`}
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
