import {
  addCandidate,
  presentCandidate,
  unpresentCandidate,
  updateCandidateDetails,
  updateCandidateProviderResponse,
  updateCandidateStudentDecision,
} from "./matching-actions";

type RequestSummary = {
  id: string;
  status: string;
  integrity_review_status: string;
};

type ProviderSummary = {
  id: string;
  applicant_name: string;
  skills: string[];
  availability: string;
  rate_expectations: string;
  status: string;
};

type CandidateSummary = {
  id: string;
  project_request_id: string;
  provider_application_id: string | null;
  candidate_rank: number | null;
  provider_response_status: string;
  student_decision_status: string;
  proposed_price: number | null;
  agreed_price: number | null;
  currency: string;
  scope_summary: string | null;
  agreed_deadline: string | null;
  declined_by: string | null;
  decline_reason: string | null;
  internal_notes: string | null;
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

function effectiveRank(candidate: CandidateSummary) {
  return candidate.student_decision_status === "declined"
    ? null
    : candidate.candidate_rank;
}

function candidateSort(a: CandidateSummary, b: CandidateSummary) {
  const rankA = effectiveRank(a);
  const rankB = effectiveRank(b);

  if (rankA !== null && rankB !== null) {
    return rankA - rankB;
  }

  if (rankA !== null) {
    return -1;
  }

  if (rankB !== null) {
    return 1;
  }

  return a.id.localeCompare(b.id);
}

export function MatchingSection({
  approvedProviders,
  candidates,
  providerById,
  request,
}: {
  approvedProviders: ProviderSummary[];
  candidates: CandidateSummary[];
  providerById: Map<string, ProviderSummary>;
  request: RequestSummary;
}) {
  const isEligible =
    request.status === "reviewed" && request.integrity_review_status === "clear";
  const existingProviderIds = new Set(
    candidates
      .map((candidate) => candidate.provider_application_id)
      .filter((value): value is string => Boolean(value)),
  );
  const availableProviders = approvedProviders.filter(
    (provider) => !existingProviderIds.has(provider.id),
  );
  const sortedCandidates = [...candidates].sort(candidateSort);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-950">
            Matching / Candidates
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            Curate approved providers for this reviewed, integrity-clear request.
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          {isEligible
            ? "Eligible for matching"
            : "Not eligible: mark reviewed and integrity clear first"}
        </div>
      </div>

      {isEligible ? (
        <form
          action={addCandidate}
          className="mt-5 grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4"
        >
          <input name="request_id" type="hidden" value={request.id} />
          <label className="form-field">
            <span className="form-label">Add approved provider</span>
            <select
              className="form-input"
              disabled={availableProviders.length === 0}
              name="provider_application_id"
              required
            >
              {availableProviders.length === 0 ? (
                <option value="">No approved providers available</option>
              ) : (
                <>
                  <option value="">Choose provider</option>
                  {availableProviders.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.applicant_name} - {formatList(provider.skills)}
                    </option>
                  ))}
                </>
              )}
            </select>
          </label>
          <button
            className="button-primary"
            disabled={availableProviders.length === 0}
            type="submit"
          >
            Add candidate
          </button>
        </form>
      ) : null}

      {sortedCandidates.length === 0 ? (
        <div className="mt-5 rounded-lg border border-slate-200 p-4 text-slate-700">
          No candidates added yet.
        </div>
      ) : (
        <div className="mt-5 grid gap-5">
          {sortedCandidates.map((candidate) => {
            const provider = candidate.provider_application_id
              ? providerById.get(candidate.provider_application_id)
              : undefined;
            const currentProviderStatus = provider?.status ?? "unavailable";
            const providerIsApproved = currentProviderStatus === "approved";
            const displayedRank = effectiveRank(candidate);
            const canPresent =
              providerIsApproved &&
              candidate.provider_response_status === "interested" &&
              candidate.student_decision_status !== "accepted" &&
              candidate.student_decision_status !== "declined";
            const canDecide =
              providerIsApproved &&
              candidate.provider_response_status === "interested" &&
              candidate.student_decision_status === "presented" &&
              candidate.candidate_rank !== null;
            const canUpdateProviderResponse =
              providerIsApproved &&
              candidate.student_decision_status !== "accepted" &&
              candidate.student_decision_status !== "declined" &&
              candidate.student_decision_status !== "presented" &&
              candidate.candidate_rank === null;
            const canUnpresent =
              candidate.student_decision_status === "presented" &&
              candidate.candidate_rank !== null;
            const providerWarning = providerIsApproved
              ? null
              : candidate.student_decision_status === "accepted"
                ? "No longer eligible for matching. Accepted record requires manual review."
                : "No longer eligible for matching.";

            return (
              <article
                className="rounded-lg border border-slate-200 p-4"
                key={candidate.id}
              >
                <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
                  <div>
                    <div className="font-bold text-slate-950">
                      {provider?.applicant_name ?? "Provider unavailable"}
                    </div>
                    <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="font-bold text-slate-600">Skills</dt>
                        <dd className="mt-1 text-slate-900">
                          {provider ? formatList(provider.skills) : "Not provided"}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-bold text-slate-600">Availability</dt>
                        <dd className="mt-1 text-slate-900">
                          {provider?.availability ?? "Not provided"}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-bold text-slate-600">Rates</dt>
                        <dd className="mt-1 text-slate-900">
                          {provider?.rate_expectations ?? "Not provided"}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-bold text-slate-600">
                          Provider status
                        </dt>
                        <dd className="mt-1 text-slate-900">
                          {formatStatus(currentProviderStatus)}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-bold text-slate-600">Rank</dt>
                        <dd className="mt-1 text-slate-900">
                          {displayedRank ?? "Not presented"}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-bold text-slate-600">
                          Provider response
                        </dt>
                        <dd className="mt-1 text-slate-900">
                          {formatStatus(candidate.provider_response_status)}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-bold text-slate-600">
                          Student decision
                        </dt>
                        <dd className="mt-1 text-slate-900">
                          {formatStatus(candidate.student_decision_status)}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-bold text-slate-600">
                          Proposed price
                        </dt>
                        <dd className="mt-1 text-slate-900">
                          {formatPrice(candidate.proposed_price, candidate.currency)}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-bold text-slate-600">Agreed price</dt>
                        <dd className="mt-1 text-slate-900">
                          {formatPrice(candidate.agreed_price, candidate.currency)}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-bold text-slate-600">Currency</dt>
                        <dd className="mt-1 text-slate-900">
                          {candidate.currency}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-bold text-slate-600">
                          Agreed deadline
                        </dt>
                        <dd className="mt-1 text-slate-900">
                          {candidate.agreed_deadline ?? "Not set"}
                        </dd>
                      </div>
                    </dl>
                    {providerWarning ? (
                      <div className="notice-error mt-4">{providerWarning}</div>
                    ) : null}
                    <div className="mt-4 grid gap-3 text-sm">
                      <div>
                        <div className="font-bold text-slate-600">
                          Scope summary
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-slate-900">
                          {candidate.scope_summary ?? "Not provided"}
                        </p>
                      </div>
                      <div>
                        <div className="font-bold text-slate-600">
                          Decline reason
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-slate-900">
                          {candidate.decline_reason
                            ? `${candidate.declined_by ?? "unknown"}: ${
                                candidate.decline_reason
                              }`
                            : "Not provided"}
                        </p>
                      </div>
                      <div>
                        <div className="font-bold text-slate-600">
                          Internal notes
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-slate-900">
                          {candidate.internal_notes ?? "Not provided"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid content-start gap-4">
                    <form
                      action={updateCandidateProviderResponse}
                      className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4"
                    >
                      <input
                        name="candidate_id"
                        type="hidden"
                        value={candidate.id}
                      />
                      <input
                        name="request_id"
                        type="hidden"
                        value={request.id}
                      />
                      <label className="form-field">
                        <span className="form-label">Provider response</span>
                        <select
                          className="form-input"
                          defaultValue={candidate.provider_response_status}
                          disabled={!canUpdateProviderResponse}
                          name="provider_response_status"
                        >
                          <option value="pending">Pending</option>
                          <option value="interested">Interested</option>
                          <option value="declined">Declined</option>
                          <option value="no_response">No response</option>
                          <option value="withdrawn">Withdrawn</option>
                        </select>
                      </label>
                      <label className="form-field">
                        <span className="form-label">Decline reason</span>
                        <textarea
                          className="form-input min-h-20"
                          defaultValue={candidate.decline_reason ?? ""}
                          disabled={!canUpdateProviderResponse}
                          name="decline_reason"
                        />
                      </label>
                      <button
                        className="button-secondary"
                        disabled={!canUpdateProviderResponse}
                        type="submit"
                      >
                        Save provider response
                      </button>
                    </form>

                    <form
                      action={presentCandidate}
                      className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4"
                    >
                      <input
                        name="candidate_id"
                        type="hidden"
                        value={candidate.id}
                      />
                      <input
                        name="request_id"
                        type="hidden"
                        value={request.id}
                      />
                      <label className="form-field">
                        <span className="form-label">Shortlist rank</span>
                        <select
                          className="form-input"
                          defaultValue={displayedRank ?? ""}
                          disabled={!canPresent}
                          name="candidate_rank"
                          required
                        >
                          <option value="">Choose rank</option>
                          <option value="1">1</option>
                          <option value="2">2</option>
                          <option value="3">3</option>
                        </select>
                      </label>
                      <button
                        className="button-secondary"
                        disabled={!canPresent}
                        type="submit"
                      >
                        Present candidate
                      </button>
                    </form>

                    <form action={unpresentCandidate}>
                      <input
                        name="candidate_id"
                        type="hidden"
                        value={candidate.id}
                      />
                      <input
                        name="request_id"
                        type="hidden"
                        value={request.id}
                      />
                      <button
                        className="button-secondary w-full"
                        disabled={
                          !canUnpresent ||
                          candidate.student_decision_status === "accepted"
                        }
                        type="submit"
                      >
                        Remove from shortlist
                      </button>
                    </form>

                    <form
                      action={updateCandidateStudentDecision}
                      className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4"
                    >
                      <input
                        name="candidate_id"
                        type="hidden"
                        value={candidate.id}
                      />
                      <input
                        name="request_id"
                        type="hidden"
                        value={request.id}
                      />
                      <label className="form-field">
                        <span className="form-label">Student decision</span>
                        <select
                          className="form-input"
                          disabled={!canDecide}
                          name="student_decision_status"
                          required
                        >
                          <option value="">Choose decision</option>
                          <option value="accepted">Accepted</option>
                          <option value="declined">Declined</option>
                        </select>
                      </label>
                      <label className="form-field">
                        <span className="form-label">Decline reason</span>
                        <textarea
                          className="form-input min-h-20"
                          disabled={!canDecide}
                          name="decline_reason"
                        />
                      </label>
                      <button
                        className="button-secondary"
                        disabled={!canDecide}
                        type="submit"
                      >
                        Save student decision
                      </button>
                    </form>

                    <form
                      action={updateCandidateDetails}
                      className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4"
                    >
                      <input
                        name="candidate_id"
                        type="hidden"
                        value={candidate.id}
                      />
                      <input
                        name="request_id"
                        type="hidden"
                        value={request.id}
                      />
                      <label className="form-field">
                        <span className="form-label">Scope summary</span>
                        <textarea
                          className="form-input min-h-24"
                          defaultValue={candidate.scope_summary ?? ""}
                          disabled={!providerIsApproved}
                          name="scope_summary"
                        />
                      </label>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="form-field">
                          <span className="form-label">Proposed price</span>
                          <input
                            className="form-input"
                            defaultValue={candidate.proposed_price ?? ""}
                            disabled={!providerIsApproved}
                            min="0"
                            name="proposed_price"
                            step="0.01"
                            type="number"
                          />
                        </label>
                        <label className="form-field">
                          <span className="form-label">Agreed price</span>
                          <input
                            className="form-input"
                            defaultValue={candidate.agreed_price ?? ""}
                            disabled={!providerIsApproved}
                            min="0"
                            name="agreed_price"
                            step="0.01"
                            type="number"
                          />
                        </label>
                      </div>
                      <label className="form-field">
                        <span className="form-label">Agreed deadline</span>
                        <input
                          className="form-input"
                          defaultValue={candidate.agreed_deadline ?? ""}
                          disabled={!providerIsApproved}
                          name="agreed_deadline"
                          type="date"
                        />
                      </label>
                      <label className="form-field">
                        <span className="form-label">Internal notes</span>
                        <textarea
                          className="form-input min-h-24"
                          defaultValue={candidate.internal_notes ?? ""}
                          name="internal_notes"
                        />
                      </label>
                      <button className="button-secondary" type="submit">
                        Save candidate details
                      </button>
                    </form>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
