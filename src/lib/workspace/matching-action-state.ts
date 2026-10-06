export type ProviderMatchActionState = {
  can_respond: boolean;
};

export type ProviderMatchLifecycleState = {
  application_status: string;
  candidate_rank: number | null;
  engagement_id: string | null;
  provider_contacted: boolean;
  provider_response_status: string;
  request_integrity_review_status: string;
  request_status: string;
  student_decision_status: string;
};

export type StudentCandidateActionState = {
  candidate_rank: number | null;
  engagement_id: string | null;
  provider_response_status: string;
  student_decision_status: string;
};

export function canProviderRespondToMatch(match: ProviderMatchActionState) {
  return match.can_respond === true;
}

export function deriveProviderCanRespondToMatch(
  match: ProviderMatchLifecycleState,
) {
  return (
    match.application_status === "approved" &&
    match.provider_response_status === "pending" &&
    match.student_decision_status === "not_presented" &&
    match.candidate_rank === null &&
    match.engagement_id === null &&
    match.request_status === "reviewed" &&
    match.request_integrity_review_status === "clear" &&
    match.provider_contacted === true
  );
}

export function canStudentDecideOnCandidate(
  request: { integrity_review_status: string; status: string },
  candidate: StudentCandidateActionState,
) {
  return (
    request.status === "reviewed" &&
    request.integrity_review_status === "clear" &&
    candidate.provider_response_status === "interested" &&
    candidate.student_decision_status === "presented" &&
    candidate.candidate_rank !== null &&
    candidate.engagement_id === null
  );
}
