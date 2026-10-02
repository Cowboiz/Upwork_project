import { requireUser } from "@/lib/auth/user";
import { getAggregateActiveCount } from "@/lib/workspace/aggregates";
import {
  getMyEngagements,
  getMyProjectRequests,
  getMyProviderApplications,
} from "@/lib/workspace/data";
import { getDashboardSections } from "@/lib/workspace/roles";
import { formatStatusLabel } from "@/lib/workspace/status";

export default async function AppDashboardPage() {
  const { supabase, user } = await requireUser();
  const displayName = user.profile.fullName ?? user.email ?? "ProjectMatch user";
  const sections = getDashboardSections(user.profile.role);
  const [requests, providerApplications, engagements] = await Promise.all([
    sections.includes("requests")
      ? getMyProjectRequests(supabase, 1)
      : Promise.resolve(null),
    sections.includes("provider")
      ? getMyProviderApplications(supabase, 1)
      : Promise.resolve(null),
    getMyEngagements(supabase, 1),
  ]);

  const activeRequestCount =
    requests ? getAggregateActiveCount(requests) : 0;
  const activeEngagementCount =
    getAggregateActiveCount(engagements);
  const providerStatus =
    providerApplications?.error === null
      ? providerApplications.rows[0]?.status
      : undefined;

  return (
    <div className="grid gap-6">
      <header>
        <p className="text-sm font-bold uppercase text-blue-700">Dashboard</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">
          Welcome, {displayName}
        </h1>
        <p className="mt-3 max-w-2xl leading-7 text-slate-600">
          Your authenticated workspace is ready. Project, message, notification,
          and engagement tools will build on this foundation.
        </p>
      </header>

      <section className="grid gap-4 lg:grid-cols-3">
        {sections.includes("requests") && requests ? (
          <a
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm hover:border-blue-200"
            href="/app/requests"
            id="requests"
          >
            <h2 className="text-lg font-bold text-slate-950">My requests</h2>
            <dl className="mt-4 grid gap-2 text-sm text-slate-600">
              <div>
                <dt className="font-bold text-slate-700">Total requests</dt>
                <dd>{requests.error ? "Unavailable" : requests.totalCount}</dd>
              </div>
              <div>
                <dt className="font-bold text-slate-700">Active requests</dt>
                <dd>{requests.error ? "Unavailable" : activeRequestCount}</dd>
              </div>
            </dl>
          </a>
        ) : null}

        {sections.includes("provider") && providerApplications ? (
          <a
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm hover:border-blue-200"
            href="/app/provider"
            id="provider"
          >
            <h2 className="text-lg font-bold text-slate-950">
              My provider application(s)
            </h2>
            <dl className="mt-4 grid gap-2 text-sm text-slate-600">
              <div>
                <dt className="font-bold text-slate-700">Applications</dt>
                <dd>
                  {providerApplications.error
                    ? "Unavailable"
                    : providerApplications.totalCount}
                </dd>
              </div>
              <div>
                <dt className="font-bold text-slate-700">Latest status</dt>
                <dd>{formatStatusLabel(providerStatus)}</dd>
              </div>
            </dl>
          </a>
        ) : null}

        <a
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm hover:border-blue-200"
          href="/app/engagements"
          id="engagements"
        >
          <h2 className="text-lg font-bold text-slate-950">My engagements</h2>
          <dl className="mt-4 grid gap-2 text-sm text-slate-600">
            <div>
              <dt className="font-bold text-slate-700">Active engagements</dt>
              <dd>
                {engagements.error ? "Unavailable" : activeEngagementCount}
              </dd>
            </div>
            <div>
              <dt className="font-bold text-slate-700">Total engagements</dt>
              <dd>{engagements.error ? "Unavailable" : engagements.totalCount}</dd>
            </div>
          </dl>
        </a>

        <div
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          id="messages"
        >
          <h2 className="text-lg font-bold text-slate-950">Messages</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Chat is intentionally not enabled in this pilot foundation.
          </p>
        </div>
      </section>
    </div>
  );
}
