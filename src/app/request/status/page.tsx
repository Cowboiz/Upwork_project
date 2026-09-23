import type { Metadata } from "next";
import { submitStudentDecision } from "./actions";
import { loadStudentDecisionInvitation } from "@/lib/student-decision/tokens";

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

type RequestStatusPageProps = {
  searchParams: Promise<{
    error?: string;
    submitted?: string;
    token?: string;
  }>;
};

function formatStatus(value: string) {
  return value.replaceAll("_", " ");
}

function formatList(values: string[]) {
  return values.length > 0 ? values.join(", ") : "Not provided";
}

function formatPrice(value: number | null, currency: string) {
  return value === null ? "Not set" : `${value} ${currency}`;
}

function formatDeadline(value: string | null, flexible: boolean) {
  if (value) {
    return flexible ? `${value} (flexible)` : value;
  }

  return flexible ? "Flexible" : "Not set";
}

function errorMessage(value: string | undefined) {
  switch (value) {
    case "expired":
      return "This decision link has expired.";
    case "closed":
      return "This provider match is no longer open for a student decision.";
    case "final":
      return "A final decision has already been recorded for this provider match.";
    case "invalid":
      return "This decision link is invalid.";
    default:
      return null;
  }
}

function decisionMessage(value: string) {
  if (value === "accepted") {
    return "Your acceptance has been recorded. ProjectMatch will coordinate the next steps.";
  }

  if (value === "declined") {
    return "Your decision has been recorded.";
  }

  return "Your decision has been recorded.";
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

export default async function RequestStatusPage({
  searchParams,
}: RequestStatusPageProps) {
  const params = await searchParams;
  const loaded = await loadStudentDecisionInvitation(params.token);
  const notice = errorMessage(params.error);

  if (!loaded.ok) {
    return (
      <main className="page-shell py-8">
        <section className="mx-auto max-w-2xl rounded-lg border border-slate-200 bg-white p-6">
          <p className="text-sm font-bold uppercase tracking-[0.12em] text-blue-700">
            ProjectMatch
          </p>
          <h1 className="mt-3 text-3xl font-bold text-slate-950">
            Match unavailable
          </h1>
          <div className="notice-error mt-6">
            {loaded.reason === "expired"
              ? "This decision link has expired."
              : "This decision link is invalid."}
          </div>
        </section>
      </main>
    );
  }

  const { candidate, provider, request } = loaded;
  const decisionRecorded = loaded.decisionRecorded;

  return (
    <main className="page-shell py-8">
      <section className="mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white p-6">
        <p className="text-sm font-bold uppercase tracking-[0.12em] text-blue-700">
          ProjectMatch provider match
        </p>
        <h1 className="mt-3 text-3xl font-bold text-slate-950">
          Review provider match
        </h1>

        {notice ? <div className="notice-error mt-6">{notice}</div> : null}

        {decisionRecorded ? (
          <div className="notice-success mt-6">
            {decisionMessage(candidate.student_decision_status)}
          </div>
        ) : null}

        {!decisionRecorded && !loaded.canDecide ? (
          <div className="notice-info mt-6">
            This provider match is no longer open for a student decision.
          </div>
        ) : null}

        <dl className="mt-6 grid gap-5 sm:grid-cols-2">
          <DetailItem
            label="Project category"
            value={formatStatus(request.category)}
          />
          <DetailItem
            label="Budget"
            value={`${formatStatus(request.budget_range)} ${request.currency}`}
          />
          <DetailItem
            label="Deadline"
            value={formatDeadline(request.deadline, request.deadline_flexible)}
          />
          <DetailItem label="Provider" value={provider.applicant_name} />
          <DetailItem label="Rank" value={candidate.candidate_rank} />
          <DetailItem
            label="Skills"
            value={formatList(provider.skills)}
          />
          <DetailItem label="Availability" value={provider.availability} />
          <DetailItem
            label="Rate expectations"
            value={provider.rate_expectations}
          />
          <DetailItem
            label="Proposed price"
            value={formatPrice(candidate.proposed_price, candidate.currency)}
          />
        </dl>

        <section className="mt-6">
          <h2 className="text-lg font-bold text-slate-950">Scope summary</h2>
          <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-800">
            {candidate.scope_summary ?? "Not provided"}
          </p>
        </section>

        {loaded.canDecide && !decisionRecorded ? (
          <section className="mt-6 grid gap-4 border-t border-slate-200 pt-6">
            <form action={submitStudentDecision}>
              <input name="token" type="hidden" value={params.token} />
              <input name="decision" type="hidden" value="accepted" />
              <input name="decline_reason" type="hidden" value="" />
              <button className="button-primary w-full" type="submit">
                Accept provider match
              </button>
            </form>

            <form
              action={submitStudentDecision}
              className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4"
            >
              <input name="token" type="hidden" value={params.token} />
              <input name="decision" type="hidden" value="declined" />
              <label className="form-field">
                <span className="form-label">Decline reason</span>
                <textarea
                  className="form-input min-h-24"
                  name="decline_reason"
                  placeholder="Optional"
                />
              </label>
              <button className="button-secondary" type="submit">
                Decline provider match
              </button>
            </form>
          </section>
        ) : null}
      </section>
    </main>
  );
}
