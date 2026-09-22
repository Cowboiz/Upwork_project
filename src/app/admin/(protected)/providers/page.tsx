import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { contactMethods } from "@/lib/stage1/options";

const providerStatuses = [
  "new",
  "approved",
  "waitlisted",
  "rejected",
  "inactive",
] as const;

const sortOptions = ["newest", "oldest"] as const;

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

function sanitizeSearchQuery(value: string | undefined) {
  const normalized = value
    ?.trim()
    .slice(0, 100)
    .replace(/[^\p{L}\p{N} @.+-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  return normalized && normalized.length > 0 ? normalized : undefined;
}

function searchPattern(value: string) {
  return `%${value}%`;
}

function validOption<T extends readonly string[]>(
  value: string | undefined,
  options: T,
) {
  return options.includes(value as T[number]) ? (value as T[number]) : undefined;
}

type AdminProvidersPageProps = {
  searchParams: Promise<{
    error?: string;
    q?: string;
    status?: string;
    contact_method?: string;
    sort?: string;
  }>;
};

export default async function AdminProvidersPage({
  searchParams,
}: AdminProvidersPageProps) {
  const { supabase } = await requireAdmin();
  const params = await searchParams;
  const sanitizedQ = sanitizeSearchQuery(params.q);
  const selectedStatus = validOption(params.status, providerStatuses);
  const selectedContactMethod = validOption(
    params.contact_method,
    contactMethods.map((method) => method.value),
  );
  const selectedSort = validOption(params.sort, sortOptions) ?? "newest";

  let query = supabase
    .from("provider_applications")
    .select(
      "id, applicant_name, contact_method, contact_value, skills, preferred_project_types, availability, rate_expectations, status, created_at",
    )
    .order("created_at", { ascending: selectedSort === "oldest" });

  if (sanitizedQ) {
    const pattern = searchPattern(sanitizedQ);
    query = query.or(
      `applicant_name.ilike.${pattern},contact_value.ilike.${pattern}`,
    );
  }
  if (selectedStatus) {
    query = query.eq("status", selectedStatus);
  }
  if (selectedContactMethod) {
    query = query.eq("contact_method", selectedContactMethod);
  }

  const { data: providers, error } = await query;
  const providerCount = providers?.length ?? 0;

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
      </div>

      {params.error ? <div className="notice-error mt-6">{params.error}</div> : null}

      <form
        className="mt-6 grid gap-4 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-[minmax(180px,1.5fr)_repeat(3,minmax(140px,1fr))_auto_auto] md:items-end"
        method="get"
      >
        <label className="form-field">
          <span className="form-label">Search</span>
          <input
            className="form-input"
            defaultValue={sanitizedQ ?? ""}
            maxLength={100}
            name="q"
            placeholder="Name or contact"
          />
        </label>

        <label className="form-field">
          <span className="form-label">Status</span>
          <select
            className="form-input"
            defaultValue={selectedStatus ?? ""}
            name="status"
          >
            <option value="">All statuses</option>
            {providerStatuses.map((status) => (
              <option key={status} value={status}>
                {formatStatus(status)}
              </option>
            ))}
          </select>
        </label>

        <label className="form-field">
          <span className="form-label">Contact</span>
          <select
            className="form-input"
            defaultValue={selectedContactMethod ?? ""}
            name="contact_method"
          >
            <option value="">All contact</option>
            {contactMethods.map((method) => (
              <option key={method.value} value={method.value}>
                {method.label}
              </option>
            ))}
          </select>
        </label>

        <label className="form-field">
          <span className="form-label">Sort</span>
          <select className="form-input" defaultValue={selectedSort} name="sort">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </label>

        <button className="button-primary" type="submit">
          Apply
        </button>
        <Link className="button-secondary text-center" href="/admin/providers">
          Clear
        </Link>
      </form>

      {error ? (
        <div className="notice-error mt-6">
          We could not load provider applications.
        </div>
      ) : null}

      {!error ? (
        <p className="mt-4 text-sm font-bold text-slate-700">
          {providerCount} {providerCount === 1 ? "provider" : "providers"} found
        </p>
      ) : null}

      {!error && providers?.length === 0 ? (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 text-slate-700">
          No providers match these filters.
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
