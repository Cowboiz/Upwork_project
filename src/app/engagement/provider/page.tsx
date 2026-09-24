import type { Metadata } from "next";
import {
  loadProviderEngagementDelivery,
} from "@/lib/engagement/tokens";
import {
  startProviderEngagementWork,
  submitProviderEngagementDeliverable,
} from "./actions";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export const metadata: Metadata = {
  referrer: "no-referrer",
  robots: {
    follow: false,
    index: false,
  },
};

type ProviderEngagementPageProps = {
  searchParams: Promise<{
    error?: string;
    saved?: string;
    token?: string;
  }>;
};

function formatStatus(value: string) {
  return value.replaceAll("_", " ");
}

function formatPrice(value: number | null, currency: string) {
  return value === null ? "Not set" : `${value} ${currency}`;
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function errorMessage(value: string | undefined) {
  switch (value) {
    case "closed":
      return "This engagement is no longer open for provider delivery.";
    case "conflict":
      return "This engagement already has a different deliverable submission.";
    case "expired":
      return "This engagement link has expired.";
    case "invalid_deliverable":
      return "Add a valid deliverable URL or summary.";
    case "invalid":
      return "This engagement link is invalid.";
    default:
      return null;
  }
}

function savedMessage(value: string | undefined) {
  switch (value) {
    case "started":
      return "Work started.";
    case "submitted":
      return "Deliverable submitted.";
    default:
      return null;
  }
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 text-slate-900">{value || "Not provided"}</dd>
    </div>
  );
}

export default async function ProviderEngagementPage({
  searchParams,
}: ProviderEngagementPageProps) {
  const params = await searchParams;
  const loaded = await loadProviderEngagementDelivery(params.token);
  const notice = errorMessage(params.error);
  const saved = savedMessage(params.saved);

  if (!loaded.ok) {
    return (
      <main className="page-shell py-8">
        <section className="mx-auto max-w-2xl rounded-lg border border-slate-200 bg-white p-6">
          <p className="text-sm font-bold uppercase tracking-[0.12em] text-blue-700">
            ProjectMatch
          </p>
          <h1 className="mt-3 text-3xl font-bold text-slate-950">
            Engagement unavailable
          </h1>
          <div className="notice-error mt-6">
            {loaded.reason === "expired"
              ? "This engagement link has expired."
              : "This engagement link is invalid."}
          </div>
        </section>
      </main>
    );
  }

  const { candidate, engagement, request } = loaded;
  const canStart = engagement.status === "agreed";
  const canSubmit = engagement.status === "in_progress";
  const isSubmitted = engagement.status === "submitted";

  return (
    <main className="page-shell py-8">
      <section className="mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white p-6">
        <p className="text-sm font-bold uppercase tracking-[0.12em] text-blue-700">
          ProjectMatch engagement
        </p>
        <h1 className="mt-3 text-3xl font-bold text-slate-950">
          Provider delivery
        </h1>

        {notice ? <div className="notice-error mt-6">{notice}</div> : null}
        {saved ? <div className="notice-success mt-6">{saved}</div> : null}

        {!canStart && !canSubmit && !isSubmitted ? (
          <div className="notice-info mt-6">
            This engagement is not currently open for provider delivery.
          </div>
        ) : null}

        <dl className="mt-6 grid gap-5 sm:grid-cols-2">
          <DetailItem
            label="Project category"
            value={formatStatus(request.category)}
          />
          <DetailItem
            label="Agreed amount"
            value={formatPrice(engagement.agreed_amount, engagement.currency)}
          />
          <DetailItem
            label="Agreed deadline"
            value={engagement.agreed_deadline}
          />
          <DetailItem
            label="Engagement status"
            value={formatStatus(engagement.status)}
          />
          <DetailItem label="Started" value={formatDate(engagement.started_at)} />
          <DetailItem
            label="Submitted"
            value={formatDate(engagement.submitted_at)}
          />
        </dl>

        <section className="mt-6">
          <h2 className="text-lg font-bold text-slate-950">Scope summary</h2>
          <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-800">
            {candidate.scope_summary ?? "Not provided"}
          </p>
        </section>

        {engagement.deliverable_url || engagement.deliverable_summary ? (
          <section className="mt-6 border-t border-slate-200 pt-6">
            <h2 className="text-lg font-bold text-slate-950">Deliverable</h2>
            {engagement.deliverable_url ? (
              <p className="mt-3">
                <a
                  className="font-bold text-blue-700"
                  href={engagement.deliverable_url}
                  rel="noreferrer"
                  target="_blank"
                >
                  {engagement.deliverable_url}
                </a>
              </p>
            ) : null}
            {engagement.deliverable_summary ? (
              <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-800">
                {engagement.deliverable_summary}
              </p>
            ) : null}
          </section>
        ) : null}

        {canStart ? (
          <form action={startProviderEngagementWork} className="mt-6">
            <input name="token" type="hidden" value={params.token} />
            <button className="button-primary w-full" type="submit">
              Start work
            </button>
          </form>
        ) : null}

        {canSubmit ? (
          <form
            action={submitProviderEngagementDeliverable}
            className="mt-6 grid gap-4 border-t border-slate-200 pt-6"
          >
            <input name="token" type="hidden" value={params.token} />
            <label className="form-field">
              <span className="form-label">Deliverable URL</span>
              <input
                className="form-input"
                name="deliverable_url"
                placeholder="https://..."
                type="url"
              />
            </label>
            <label className="form-field">
              <span className="form-label">Deliverable summary</span>
              <textarea
                className="form-input min-h-28"
                name="deliverable_summary"
                placeholder="Briefly describe what you delivered."
              />
            </label>
            <button className="button-primary" type="submit">
              Submit deliverable
            </button>
          </form>
        ) : null}
      </section>
    </main>
  );
}
