import {
  createEngagement,
  updateEngagementNotes,
  updateEngagementStatus,
  updatePaymentStatus,
} from "./engagement-actions";

type ProviderSummary = {
  id: string;
  applicant_name: string;
  skills: string[];
  availability: string;
  rate_expectations: string;
  status: string;
};

type AcceptedCandidateSummary = {
  id: string;
  agreed_deadline: string | null;
  agreed_price: number | null;
  currency: string;
  provider_application_id: string | null;
};

type EngagementSummary = {
  agreed_amount: number;
  agreed_deadline: string | null;
  cancelled_at: string | null;
  completed_at: string | null;
  created_at: string;
  currency: string;
  dispute_notes: string | null;
  id: string;
  internal_notes: string | null;
  payment_status: string;
  provider_feedback: string | null;
  referral_signal: string | null;
  repeat_intent: string | null;
  started_at: string | null;
  status: string;
  student_feedback: string | null;
  updated_at: string;
};

const engagementNextStatuses = {
  agreed: ["in_progress", "cancelled"],
  cancelled: [],
  completed: [],
  disputed: ["in_progress", "submitted", "cancelled"],
  in_progress: ["submitted", "disputed", "cancelled"],
  submitted: ["completed", "disputed", "cancelled"],
} as const;

const paymentNextStatuses = {
  agreed: ["partially_paid", "paid"],
  chargeback_disputed: [],
  not_started: ["agreed"],
  paid: ["refunded", "chargeback_disputed"],
  partially_paid: ["paid", "refunded", "chargeback_disputed"],
  refunded: [],
} as const;

function formatDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatStatus(value: string) {
  return value.replaceAll("_", " ");
}

function formatPrice(value: number | null, currency: string) {
  return value === null ? "Not set" : `${value} ${currency}`;
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

export function EngagementSection({
  acceptedCandidate,
  engagement,
  provider,
  requestId,
}: {
  acceptedCandidate?: AcceptedCandidateSummary;
  engagement?: EngagementSummary;
  provider?: ProviderSummary;
  requestId: string;
}) {
  if (!acceptedCandidate) {
    return null;
  }

  const providerIsApproved = provider?.status === "approved";
  const createEligible =
    providerIsApproved &&
    acceptedCandidate.agreed_price !== null &&
    acceptedCandidate.agreed_deadline !== null;
  const engagementStatusOptions =
    engagementNextStatuses[
      (engagement?.status ?? "completed") as keyof typeof engagementNextStatuses
    ] ?? [];
  const paymentStatusOptions =
    paymentNextStatuses[
      (engagement?.payment_status ??
        "refunded") as keyof typeof paymentNextStatuses
    ] ?? [];

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <h3 className="text-xl font-bold text-slate-950">Project engagement</h3>

      {!engagement ? (
        <div className="mt-5 grid gap-5">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <DetailItem
                label="Provider"
                value={provider?.applicant_name ?? "Provider unavailable"}
              />
              <DetailItem
                label="Provider status"
                value={provider ? formatStatus(provider.status) : "Unavailable"}
              />
              <DetailItem
                label="Agreed amount"
                value={formatPrice(
                  acceptedCandidate.agreed_price,
                  acceptedCandidate.currency,
                )}
              />
              <DetailItem label="Currency" value={acceptedCandidate.currency} />
              <DetailItem
                label="Agreed deadline"
                value={acceptedCandidate.agreed_deadline}
              />
              <DetailItem
                label="Eligibility"
                value={createEligible ? "Ready to create" : "Missing requirement"}
              />
            </dl>
          </div>

          {!providerIsApproved ? (
            <div className="notice-error">
              Provider must still be approved before creating an engagement.
            </div>
          ) : null}

          {providerIsApproved && !createEligible ? (
            <div className="notice-info">
              Not ready yet. Complete the agreement terms above.
            </div>
          ) : null}

          {createEligible ? (
            <div className="notice-success">
              Ready to create engagement:{" "}
              {formatPrice(
                acceptedCandidate.agreed_price,
                acceptedCandidate.currency,
              )}
              , due {acceptedCandidate.agreed_deadline}.
            </div>
          ) : null}

          <form action={createEngagement}>
            <input
              name="candidate_id"
              type="hidden"
              value={acceptedCandidate.id}
            />
            <input name="request_id" type="hidden" value={requestId} />
            <button
              className="button-primary w-full"
              disabled={!createEligible}
              type="submit"
            >
              Create engagement
            </button>
          </form>
        </div>
      ) : (
        <div className="mt-5 grid gap-5">
          <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <DetailItem
                label="Provider"
                value={provider?.applicant_name ?? "Provider unavailable"}
              />
              <DetailItem
                label="Agreed amount"
                value={formatPrice(engagement.agreed_amount, engagement.currency)}
              />
              <DetailItem label="Currency" value={engagement.currency} />
              <DetailItem
                label="Agreed deadline"
                value={engagement.agreed_deadline}
              />
              <DetailItem
                label="Engagement status"
                value={formatStatus(engagement.status)}
              />
              <DetailItem
                label="Payment status"
                value={formatStatus(engagement.payment_status)}
              />
              <DetailItem label="Started" value={formatDate(engagement.started_at)} />
              <DetailItem
                label="Completed"
                value={formatDate(engagement.completed_at)}
              />
              <DetailItem
                label="Cancelled"
                value={formatDate(engagement.cancelled_at)}
              />
              <DetailItem label="Created" value={formatDate(engagement.created_at)} />
              <DetailItem label="Updated" value={formatDate(engagement.updated_at)} />
            </dl>
          </section>

          <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h4 className="font-bold text-slate-950">Engagement status</h4>
            {engagementStatusOptions.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {engagementStatusOptions.map((status) => (
                  <form action={updateEngagementStatus} key={status}>
                    <input
                      name="engagement_id"
                      type="hidden"
                      value={engagement.id}
                    />
                    <input name="request_id" type="hidden" value={requestId} />
                    <input name="status" type="hidden" value={status} />
                    <button className="button-secondary" type="submit">
                      Mark {formatStatus(status)}
                    </button>
                  </form>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-700">
                No further status transitions are available.
              </p>
            )}
          </section>

          <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h4 className="font-bold text-slate-950">
              {engagement.status === "cancelled"
                ? "Payment settlement"
                : "Payment status"}
            </h4>
            {engagement.status === "cancelled" ? (
              <p className="mt-3 text-sm leading-6 text-slate-700">
                This engagement is cancelled. Payment status can still be
                updated to record settlement, refunds, or payment for work
                already done.
              </p>
            ) : null}
            {paymentStatusOptions.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {paymentStatusOptions.map((status) => (
                  <form action={updatePaymentStatus} key={status}>
                    <input
                      name="engagement_id"
                      type="hidden"
                      value={engagement.id}
                    />
                    <input name="request_id" type="hidden" value={requestId} />
                    <input name="payment_status" type="hidden" value={status} />
                    <button className="button-secondary" type="submit">
                      Mark {formatStatus(status)}
                    </button>
                  </form>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-700">
                No further payment transitions are available.
              </p>
            )}
          </section>

          <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h4 className="font-bold text-slate-950">Feedback and signals</h4>
            <form action={updateEngagementNotes} className="mt-4 grid gap-4">
              <input name="engagement_id" type="hidden" value={engagement.id} />
              <input name="request_id" type="hidden" value={requestId} />
              <label className="form-field">
                <span className="form-label">Student feedback</span>
                <textarea
                  className="form-input min-h-24"
                  defaultValue={engagement.student_feedback ?? ""}
                  name="student_feedback"
                />
              </label>
              <label className="form-field">
                <span className="form-label">Provider feedback</span>
                <textarea
                  className="form-input min-h-24"
                  defaultValue={engagement.provider_feedback ?? ""}
                  name="provider_feedback"
                />
              </label>
              <label className="form-field">
                <span className="form-label">Dispute notes</span>
                <textarea
                  className="form-input min-h-24"
                  defaultValue={engagement.dispute_notes ?? ""}
                  name="dispute_notes"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="form-field">
                  <span className="form-label">Repeat intent</span>
                  <select
                    className="form-input"
                    defaultValue={engagement.repeat_intent ?? ""}
                    name="repeat_intent"
                  >
                    <option value="">Not set</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </label>
                <label className="form-field">
                  <span className="form-label">Referral signal</span>
                  <select
                    className="form-input"
                    defaultValue={engagement.referral_signal ?? ""}
                    name="referral_signal"
                  >
                    <option value="">Not set</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </label>
              </div>
              <label className="form-field">
                <span className="form-label">Internal notes</span>
                <textarea
                  className="form-input min-h-24"
                  defaultValue={engagement.internal_notes ?? ""}
                  name="internal_notes"
                />
              </label>
              <button className="button-secondary" type="submit">
                Save feedback and signals
              </button>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
