import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import {
  ADMIN_USER_STATUSES,
  canHardDeleteUser,
  canMutateAdminTarget,
  getAdminUser,
  getAdminUserBusinessHistory,
} from "@/lib/admin/user-management";
import { APP_USER_ROLES, isUserRole } from "@/lib/auth/user-shared";
import {
  deactivateAdminUser,
  deleteAdminUser,
  reactivateAdminUser,
  updateAdminUser,
} from "./actions";

type AdminUserDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    error?: string;
    message?: string;
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

export default async function AdminUserDetailPage({
  params,
  searchParams,
}: AdminUserDetailPageProps) {
  const { supabase } = await requireAdmin();
  const { id } = await params;
  const query = await searchParams;
  const user = await getAdminUser(supabase, id);

  if (!user || !isUserRole(user.role)) {
    notFound();
  }

  const history = await getAdminUserBusinessHistory(supabase, user.id);
  const mutable = canMutateAdminTarget(user.role);
  const hardDeleteAllowed = canHardDeleteUser({
    hasHistory: history.has_history,
    role: user.role,
  });

  return (
    <section className="grid gap-6">
      <div>
        <Link className="text-sm font-bold text-blue-700" href="/admin/users">
          Back to users
        </Link>
        <p className="mt-6 text-sm font-bold uppercase tracking-[0.12em] text-blue-700">
          User management
        </p>
        <h2 className="mt-2 text-3xl font-bold text-slate-950">
          {user.full_name ?? user.username ?? user.email}
        </h2>
      </div>

      {query.error ? <div className="notice-error">{query.error}</div> : null}
      {query.message ? (
        <div className="notice-success">{query.message}</div>
      ) : null}

      <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2">
        <div>
          <div className="text-xs font-bold uppercase text-slate-500">
            Full name
          </div>
          <div className="mt-1 font-bold text-slate-950">
            {user.full_name ?? "Not provided"}
          </div>
        </div>
        <div>
          <div className="text-xs font-bold uppercase text-slate-500">
            Username
          </div>
          <div className="mt-1 font-bold text-slate-950">
            {user.username ? `@${user.username}` : "Not provided"}
          </div>
        </div>
        <div>
          <div className="text-xs font-bold uppercase text-slate-500">
            Email
          </div>
          <div className="mt-1 font-bold text-slate-950">{user.email}</div>
        </div>
        <div>
          <div className="text-xs font-bold uppercase text-slate-500">Role</div>
          <div className="mt-1 font-bold text-slate-950">
            {formatStatus(user.role)}
          </div>
        </div>
        <div>
          <div className="text-xs font-bold uppercase text-slate-500">
            Account status
          </div>
          <div className="mt-1 font-bold text-slate-950">
            {formatStatus(user.account_status)}
          </div>
        </div>
        <div>
          <div className="text-xs font-bold uppercase text-slate-500">
            Created
          </div>
          <div className="mt-1 font-bold text-slate-950">
            {formatDate(user.created_at)}
          </div>
        </div>
        <div>
          <div className="text-xs font-bold uppercase text-slate-500">
            Last sign in
          </div>
          <div className="mt-1 font-bold text-slate-950">
            {formatDate(user.last_sign_in_at)}
          </div>
        </div>
        <div>
          <div className="text-xs font-bold uppercase text-slate-500">
            Protected references
          </div>
          <div className="mt-1 font-bold text-slate-950">
            {history.protected_reference_count}
          </div>
        </div>
      </section>

      {!mutable ? (
        <div className="notice-info">
          Admin accounts cannot be deleted, deactivated, demoted, or converted
          through generic user management.
        </div>
      ) : null}

      {mutable ? (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-xl font-bold text-slate-950">Edit profile</h3>
          <form action={updateAdminUser} className="mt-5 grid gap-5">
            <input name="targetUserId" type="hidden" value={user.id} />
            <div className="grid gap-4 md:grid-cols-2">
              <label className="form-field">
                <span className="form-label">Full name</span>
                <input
                  className="form-input"
                  defaultValue={user.full_name ?? ""}
                  maxLength={120}
                  name="fullName"
                />
              </label>

              <label className="form-field">
                <span className="form-label">Username</span>
                <input
                  className="form-input"
                  defaultValue={user.username ?? ""}
                  maxLength={40}
                  name="username"
                />
              </label>

              <label className="form-field">
                <span className="form-label">Role</span>
                <select className="form-input" defaultValue={user.role} name="role">
                  {APP_USER_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {formatStatus(role)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-field">
                <span className="form-label">Account status</span>
                <select
                  className="form-input"
                  defaultValue={user.account_status}
                  name="accountStatus"
                >
                  {ADMIN_USER_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {formatStatus(status)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <button className="button-primary w-fit" type="submit">
              Save changes
            </button>
          </form>
        </section>
      ) : null}

      {mutable ? (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-xl font-bold text-slate-950">Account controls</h3>
          <div className="mt-5 flex flex-wrap gap-3">
            {user.account_status === "deactivated" ? (
              <form action={reactivateAdminUser}>
                <input name="targetUserId" type="hidden" value={user.id} />
                <button className="button-primary" type="submit">
                  Reactivate
                </button>
              </form>
            ) : (
              <form action={deactivateAdminUser}>
                <input name="targetUserId" type="hidden" value={user.id} />
                <button className="button-secondary" type="submit">
                  Deactivate
                </button>
              </form>
            )}

            {hardDeleteAllowed ? (
              <form action={deleteAdminUser}>
                <input name="targetUserId" type="hidden" value={user.id} />
                <button className="button-secondary" type="submit">
                  Hard delete
                </button>
              </form>
            ) : (
              <span className="button-secondary opacity-60">
                Hard delete blocked by business history
              </span>
            )}
          </div>
        </section>
      ) : null}
    </section>
  );
}
