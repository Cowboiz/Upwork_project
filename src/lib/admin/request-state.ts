export const reviewMutableRequestStatuses = [
  "new",
  "needs_clarification",
  "reviewed",
] as const;

export const postReviewRequestStatuses = [
  "matched",
  "in_progress",
  "completed",
  "cancelled",
] as const;

const reviewMutableStatusSet = new Set<string>(reviewMutableRequestStatuses);
const postReviewStatusSet = new Set<string>(postReviewRequestStatuses);

export function canMutateRequestReviewState(status: string) {
  return reviewMutableStatusSet.has(status);
}

export function requestReviewMutationBlockedMessage(status: string) {
  if (postReviewStatusSet.has(status)) {
    return "This request has already progressed beyond review and cannot be moved back.";
  }

  if (status === "rejected") {
    return "Rejected requests cannot be changed through review actions.";
  }

  return "This request is not eligible for review actions.";
}

export function requestReviewLockedLabel(status: string) {
  if (postReviewStatusSet.has(status)) {
    return "Review actions are locked because this request has already progressed beyond review.";
  }

  if (status === "rejected") {
    return "Review actions are locked because this request is rejected.";
  }

  return "Review actions are unavailable for this request state.";
}

type RequestAcceptanceSnapshot = {
  integrity_review_status: string;
  status: string;
};

type CandidateAcceptanceSnapshot = {
  candidate_rank: number | null;
  provider_response_status: string;
  student_decision_status: string;
};

type EngagementCandidateSnapshot = {
  agreed_deadline: string | null;
  agreed_price: number | null;
  student_decision_status: string;
};

export function acceptedRequestStatusAfterCandidateAcceptance(
  request: RequestAcceptanceSnapshot,
) {
  if (
    request.status === "reviewed" &&
    request.integrity_review_status === "clear"
  ) {
    return "matched";
  }

  return null;
}

export function canAcceptCandidateForRequest({
  candidate,
  hasOtherAcceptedCandidate,
  request,
}: {
  candidate: CandidateAcceptanceSnapshot;
  hasOtherAcceptedCandidate: boolean;
  request: RequestAcceptanceSnapshot;
}) {
  return (
    acceptedRequestStatusAfterCandidateAcceptance(request) === "matched" &&
    candidate.provider_response_status === "interested" &&
    candidate.student_decision_status === "presented" &&
    candidate.candidate_rank !== null &&
    candidate.candidate_rank >= 1 &&
    candidate.candidate_rank <= 3 &&
    !hasOtherAcceptedCandidate
  );
}

export function canCreateEngagementForAcceptedCandidate({
  candidate,
  hasExistingEngagement,
  providerStatus,
  requestStatus,
}: {
  candidate: EngagementCandidateSnapshot;
  hasExistingEngagement: boolean;
  providerStatus: string;
  requestStatus: string;
}) {
  return (
    requestStatus === "matched" &&
    candidate.student_decision_status === "accepted" &&
    providerStatus === "approved" &&
    candidate.agreed_price !== null &&
    candidate.agreed_deadline !== null &&
    !hasExistingEngagement
  );
}

export function studentDeclineCandidateUpdate({
  decidedAt,
  declineReason,
}: {
  decidedAt: string;
  declineReason: string | null;
}) {
  return {
    candidate_rank: null,
    decline_reason: declineReason,
    declined_by: "student" as const,
    student_decision_at: decidedAt,
    student_decision_status: "declined" as const,
  };
}
