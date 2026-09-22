import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { projectCategories } from "@/lib/stage1/options";

const requestStatuses = [
  "new",
  "needs_clarification",
  "reviewed",
  "matched",
  "in_progress",
  "completed",
  "cancelled",
  "rejected",
] as const;

const integrityStatuses = ["needs_review", "clear", "rejected"] as const;

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

type AdminRequestsPageProps = {
  searchParams: Promise<{
    error?: string;
    q?: string;
    status?: string;
    integrity?: string;
    category?: string;
    sort?: string;
  }>;
};

export default async function AdminRequestsPage({
  searchParams,
}: AdminRequestsPageProps) {
  const { supabase } = await requireAdmin();
  const params = await searchParams;
  const sanitizedQ = sanitizeSearchQuery(params.q);
  const selectedStatus = validOption(params.status, requestStatuses);
  const selectedIntegrity = validOption(params.integrity, integrityStatuses);
  const selectedCategory = validOption(
    params.category,
    projectCategories.map((category) => category.value),
  );
  const selectedSort = validOption(params.sort, sortOptions) ?? "newest";

  let query = supabase
    .from("project_requests")
    .select(
      "id, requester_name, contact_method, contact_value, category, budget_range, currency, status, integrity_review_status, created_at, reviewed_at",
    )
    .order("created_at", { ascending: selectedSort === "oldest" });

  if (sanitizedQ) {
    const pattern = searchPattern(sanitizedQ);
    query = query.or(
      `requester_name.ilike.${pattern},contact_value.ilike.${pattern},category.ilike.${pattern}`,
    );
  }
  if (selectedStatus) {
    query = query.eq("status", selectedStatus);
  }
  if (selectedIntegrity) {
    query = query.eq("integrity_review_status", selectedIntegrity);
  }
  if (selectedCategory) {
    query = query.eq("category", selectedCategory);
  }

  const { data: requests, error } = await query;
  const requestCount = requests?.length ?? 0;

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
      </div>

      {params.error ? <div className="notice-error mt-6">{params.error}</div> : null}

      <form
        className="mt-6 grid gap-4 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-[minmax(180px,1.5fr)_repeat(4,minmax(140px,1fr))_auto_auto] md:items-end"
        method="get"
      >
        <label className="form-field">
          <span className="form-label">Search</span>
          <input
            className="form-input"
            defaultValue={sanitizedQ ?? ""}
            maxLength={100}
            name="q"
            placeholder="Name, contact, category"
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
            {requestStatuses.map((status) => (
              <option key={status} value={status}>
                {formatStatus(status)}
              </option>
            ))}
          </select>
        </label>

        <label className="form-field">
          <span className="form-label">Integrity</span>
          <select
            className="form-input"
            defaultValue={selectedIntegrity ?? ""}
            name="integrity"
          >
            <option value="">All integrity</option>
            {integrityStatuses.map((status) => (
              <option key={status} value={status}>
                {formatStatus(status)}
              </option>
            ))}
          </select>
        </label>

        <label className="form-field">
          <span className="form-label">Category</span>
          <select
            className="form-input"
            defaultValue={selectedCategory ?? ""}
            name="category"
          >
            <option value="">All categories</option>
            {projectCategories.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
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
        <Link className="button-secondary text-center" href="/admin/requests">
          Clear
        </Link>
      </form>

      {error ? (
        <div className="notice-error mt-6">
          We could not load project requests.
        </div>
      ) : null}

      {!error ? (
        <p className="mt-4 text-sm font-bold text-slate-700">
          {requestCount} {requestCount === 1 ? "request" : "requests"} found
        </p>
      ) : null}

      {!error && requests?.length === 0 ? (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 text-slate-700">
          No requests match these filters.
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
