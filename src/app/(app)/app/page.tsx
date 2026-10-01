import { requireUser } from "@/lib/auth/user";

export default async function AppDashboardPage() {
  const { user } = await requireUser();
  const displayName = user.profile.fullName ?? user.email ?? "ProjectMatch user";

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
        <div
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          id="requests"
        >
          <h2 className="text-lg font-bold text-slate-950">
            Projects / Requests
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Request management will appear here in a later phase.
          </p>
        </div>

        <div
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          id="engagements"
        >
          <h2 className="text-lg font-bold text-slate-950">Engagements</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Engagement management will appear here after matched work begins.
          </p>
        </div>

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
