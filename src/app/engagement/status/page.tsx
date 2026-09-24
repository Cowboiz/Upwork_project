import type { Metadata } from "next";
import { loadStudentEngagementStatus } from "@/lib/engagement/tokens";
import {
  completeStudentEngagement,
  disputeStudentEngagement,
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

type StudentEngagementStatusPageProps = {
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
      return "This engagement is no longer open for student confirmation.";
    case "conflict":
      return "This engagement already has different issue details recorded.";
    case "expired":
      return "This engagement link has expired.";
    case "invalid_dispute":
      return "Add issue details using 5000 characters or fewer.";
    case "invalid":
      return "This engagement link is invalid.";
    default:
      return null;
  }
}

function savedMessage(value: string | undefined) {
  switch (value) {
    case "completed":
      return "Completion confirmed.";
    case "disputed":
      return "Your issue report has been recorded.";
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

export default async function StudentEngagementStatusPage({
  searchParams,
}: StudentEngagementStatusPageProps) {
  const params = await searchParams;
  const loaded = await loadStudentEngagementStatus(params.token);
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

  const { engagement, provider, request } = loaded;
  const canRespond = engagement.status === "submitted";
  const isCompleted = engagement.status === "completed";
  const isDisputed = engagement.status === "disputed";

  return (
    <main className="page-shell py-8">
      <section className="mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white p-6">
        <p className="text-sm font-bold uppercase tracking-[0.12em] text-blue-700">
          ProjectMatch engagement
        </p>
        <h1 className="mt-3 text-3xl font-bold text-slate-950">
          Review delivered work
        </h1>

        {notice ? <div className="notice-error mt-6">{notice}</div> : null}
        {saved ? <div className="notice-success mt-6">{saved}</div> : null}

        {!canRespond && !isCompleted && !isDisputed ? (
          <div className="notice-info mt-6">
            This engagement is not currently open for student confirmation.
          </div>
        ) : null}

        <dl className="mt-6 grid gap-5 sm:grid-cols-2">
          <DetailItem
            label="Project category"
            value={formatStatus(request.category)}
          />
          <DetailItem label="Provider" value={provider.applicant_name} />
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
          <DetailItem
            label="Submitted"
            value={formatDate(engagement.submitted_at)}
          />
        </dl>

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
          {!engagement.deliverable_url && !engagement.deliverable_summary ? (
            <p className="mt-3 text-slate-700">No deliverable details provided.</p>
          ) : null}
        </section>

        {isCompleted ? (
          <div className="notice-success mt-6">
            This engagement has been confirmed complete.
          </div>
        ) : null}

        {isDisputed ? (
          <section className="mt-6 border-t border-slate-200 pt-6">
            <h2 className="text-lg font-bold text-slate-950">Issue report</h2>
            <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-800">
              {engagement.dispute_notes ?? "Issue details were recorded."}
            </p>
          </section>
        ) : null}

        {canRespond ? (
          <section className="mt-6 grid gap-4 border-t border-slate-200 pt-6">
            <form action={completeStudentEngagement}>
              <input name="token" type="hidden" value={params.token} />
              <button className="button-primary w-full" type="submit">
                Confirm completed
              </button>
            </form>

            <form
              action={disputeStudentEngagement}
              className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4"
            >
              <input name="token" type="hidden" value={params.token} />
              <label className="form-field">
                <span className="form-label">Report an issue</span>
                <textarea
                  className="form-input min-h-28"
                  maxLength={5000}
                  name="dispute_notes"
                  placeholder="Briefly describe what needs operator review."
                  required
                />
              </label>
              <button className="button-secondary" type="submit">
                Report issue
              </button>
            </form>
          </section>
        ) : null}
      </section>
    </main>
  );
}
