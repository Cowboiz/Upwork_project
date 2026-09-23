import type { Metadata } from "next";
import { submitProviderInvitationResponse } from "./actions";
import { loadProviderResponseInvitation } from "@/lib/provider-response/tokens";

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

type ProviderRespondPageProps = {
  searchParams: Promise<{
    error?: string;
    submitted?: string;
    token?: string;
  }>;
};

function formatStatus(value: string) {
  return value.replaceAll("_", " ");
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
      return "This response link has expired.";
    case "closed":
      return "This invitation is no longer open for provider response.";
    case "invalid":
      return "This response link is invalid.";
    default:
      return null;
  }
}

function responseMessage(value: string) {
  if (value === "interested") {
    return "Thanks. Your interest has been recorded.";
  }

  if (value === "declined") {
    return "Thanks. Your decline has been recorded.";
  }

  return "Your response has been recorded.";
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

export default async function ProviderRespondPage({
  searchParams,
}: ProviderRespondPageProps) {
  const params = await searchParams;
  const loaded = await loadProviderResponseInvitation(params.token);
  const notice = errorMessage(params.error);

  if (!loaded.ok) {
    return (
      <main className="page-shell py-8">
        <section className="mx-auto max-w-2xl rounded-lg border border-slate-200 bg-white p-6">
          <p className="text-sm font-bold uppercase tracking-[0.12em] text-blue-700">
            ProjectMatch
          </p>
          <h1 className="mt-3 text-3xl font-bold text-slate-950">
            Invitation unavailable
          </h1>
          <div className="notice-error mt-6">
            {loaded.reason === "expired"
              ? "This response link has expired."
              : "This response link is invalid."}
          </div>
        </section>
      </main>
    );
  }

  const { candidate, request } = loaded;
  const responseRecorded = loaded.responseRecorded;

  return (
    <main className="page-shell py-8">
      <section className="mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white p-6">
        <p className="text-sm font-bold uppercase tracking-[0.12em] text-blue-700">
          ProjectMatch opportunity
        </p>
        <h1 className="mt-3 text-3xl font-bold text-slate-950">
          Review request and respond
        </h1>

        {notice ? <div className="notice-error mt-6">{notice}</div> : null}

        {responseRecorded ? (
          <div className="notice-success mt-6">
            {responseMessage(candidate.provider_response_status)}
          </div>
        ) : null}

        {!responseRecorded && !loaded.canRespond ? (
          <div className="notice-info mt-6">
            This invitation is no longer open for provider response.
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

        {loaded.canRespond && !responseRecorded ? (
          <section className="mt-6 grid gap-4 border-t border-slate-200 pt-6">
            <form action={submitProviderInvitationResponse}>
              <input name="token" type="hidden" value={params.token} />
              <input name="response" type="hidden" value="interested" />
              <input name="decline_reason" type="hidden" value="" />
              <button className="button-primary w-full" type="submit">
                Interested
              </button>
            </form>

            <form
              action={submitProviderInvitationResponse}
              className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4"
            >
              <input name="token" type="hidden" value={params.token} />
              <input name="response" type="hidden" value="declined" />
              <label className="form-field">
                <span className="form-label">Decline reason</span>
                <textarea
                  className="form-input min-h-24"
                  name="decline_reason"
                  placeholder="Optional"
                />
              </label>
              <button className="button-secondary" type="submit">
                Decline
              </button>
            </form>
          </section>
        ) : null}
      </section>
    </main>
  );
}
