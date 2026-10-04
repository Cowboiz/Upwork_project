import Link from "next/link";
import { PaginationControls } from "@/components/workspace/pagination-controls";
import { requireAdmin } from "@/lib/admin/auth";
import {
  ADMIN_USER_ROLES,
  ADMIN_USER_SORT_OPTIONS,
  ADMIN_USER_STATUSES,
  adminUserSearchParamsForPagination,
  getAdminUsers,
  parseAdminUserQuery,
} from "@/lib/admin/user-management";

type AdminUsersPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
    page?: string | string[];
    q?: string | string[];
    role?: string | string[];
    sort?: string | string[];
    status?: string | string[];
  }>;
};

function formatDate(value: string | null) {
  if (!value) {
    return "Never";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatStatus(value: string) {
  return value.replaceAll("_", " ");
}

export default async function AdminUsersPage({
  searchParams,
}: AdminUsersPageProps) {
  const { supabase } = await requireAdmin();
  const params = await searchParams;
  const query = parseAdminUserQuery(params);
  const result = await getAdminUsers(supabase, query);
  const paginationParams = adminUserSearchParamsForPagination(query);

  return (
    <section>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.12em] text-blue-700">
            User management
          </p>
          <h2 className="mt-2 text-3xl font-bold text-slate-950">
            Accounts
          </h2>
        </div>
        <button
          aria-disabled="true"
          className="button-secondary opacity-60"
          type="button"
        >
          Add user available after auth email setup
        </button>
      </div>

      {params.error ? <div className="notice-error mt-6">{params.error}</div> : null}
      {params.message ? (
        <div className="notice-success mt-6">{params.message}</div>
      ) : null}

      <form
        className="mt-6 grid gap-4 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-[minmax(180px,1.5fr)_repeat(3,minmax(140px,1fr))_auto_auto] md:items-end"
        method="get"
      >
        <label className="form-field">
          <span className="form-label">Search</span>
          <input
            className="form-input"
            defaultValue={query.q ?? ""}
            maxLength={100}
            name="q"
            placeholder="Name, username, email"
          />
        </label>

        <label className="form-field">
          <span className="form-label">Role</span>
          <select className="form-input" defaultValue={query.role} name="role">
            <option value="all">All roles</option>
            {ADMIN_USER_ROLES.map((role) => (
              <option key={role} value={role}>
                {formatStatus(role)}
              </option>
            ))}
          </select>
        </label>

        <label className="form-field">
          <span className="form-label">Status</span>
          <select
            className="form-input"
            defaultValue={query.status}
            name="status"
          >
            <option value="all">All statuses</option>
            {ADMIN_USER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {formatStatus(status)}
              </option>
            ))}
          </select>
        </label>

        <label className="form-field">
          <span className="form-label">Sort</span>
          <select className="form-input" defaultValue={query.sort} name="sort">
            {ADMIN_USER_SORT_OPTIONS.map((sort) => (
              <option key={sort} value={sort}>
                {sort === "newest" ? "Newest first" : "Oldest first"}
              </option>
            ))}
          </select>
        </label>

        <button className="button-primary" type="submit">
          Apply
        </button>
        <Link className="button-secondary text-center" href="/admin/users">
          Clear
        </Link>
      </form>

      {result.error ? (
        <div className="notice-error mt-6">We could not load users.</div>
      ) : null}

      {!result.error ? (
        <p className="mt-4 text-sm font-bold text-slate-700">
          {result.totalCount} {result.totalCount === 1 ? "user" : "users"} found
        </p>
      ) : null}

      {!result.error && result.users.length === 0 ? (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 text-slate-700">
          No users match these filters.
        </div>
      ) : null}

      {result.users.length > 0 ? (
        <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full min-w-[960px] border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.08em] text-slate-600">
              <tr>
                <th className="border-b border-slate-200 px-4 py-3">Name</th>
                <th className="border-b border-slate-200 px-4 py-3">Email</th>
                <th className="border-b border-slate-200 px-4 py-3">Role</th>
                <th className="border-b border-slate-200 px-4 py-3">
                  Account status
                </th>
                <th className="border-b border-slate-200 px-4 py-3">Created</th>
                <th className="border-b border-slate-200 px-4 py-3">
                  Last sign in
                </th>
                <th className="border-b border-slate-200 px-4 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {result.users.map((user) => (
                <tr className="align-top" key={user.id}>
                  <td className="border-b border-slate-100 px-4 py-4">
                    <div className="font-bold text-slate-950">
                      {user.full_name ?? user.username ?? "Unnamed account"}
                    </div>
                    {user.username ? (
                      <div className="mt-1 text-slate-600">@{user.username}</div>
                    ) : null}
                  </td>
                  <td className="border-b border-slate-100 px-4 py-4">
                    {user.email}
                  </td>
                  <td className="border-b border-slate-100 px-4 py-4">
                    {formatStatus(user.role)}
                  </td>
                  <td className="border-b border-slate-100 px-4 py-4">
                    {formatStatus(user.account_status)}
                  </td>
                  <td className="border-b border-slate-100 px-4 py-4">
                    {formatDate(user.created_at)}
                  </td>
                  <td className="border-b border-slate-100 px-4 py-4">
                    {formatDate(user.last_sign_in_at)}
                  </td>
                  <td className="border-b border-slate-100 px-4 py-4">
                    <Link
                      className="font-bold text-blue-700"
                      href={`/admin/users/${user.id}`}
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

      {!result.error ? (
        <div className="mt-6">
          <PaginationControls
            page={result.page}
            pageCount={result.pageCount}
            pathname="/admin/users"
            searchParams={paginationParams}
          />
        </div>
      ) : null}
    </section>
  );
}
