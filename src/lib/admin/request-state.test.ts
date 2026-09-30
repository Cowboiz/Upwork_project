import { describe, expect, it } from "vitest";
import {
  acceptedRequestStatusAfterCandidateAcceptance,
  canAcceptCandidateForRequest,
  canCreateEngagementForAcceptedCandidate,
  canMutateRequestReviewState,
  requestReviewMutationBlockedMessage,
  studentDeclineCandidateUpdate,
} from "./request-state";

describe("request review state machine", () => {
  it("moves reviewed and integrity-clear requests to matched after candidate acceptance", () => {
    expect(
      acceptedRequestStatusAfterCandidateAcceptance({
        integrity_review_status: "clear",
        status: "reviewed",
      }),
    ).toBe("matched");
  });

  it.each(["matched", "in_progress", "completed", "cancelled"])(
    "blocks markReviewed for %s requests",
    (status) => {
      expect(canMutateRequestReviewState(status)).toBe(false);
      expect(requestReviewMutationBlockedMessage(status)).toContain(
        "progressed beyond review",
      );
    },
  );

  it("blocks markNeedsClarification for matched requests", () => {
    expect(canMutateRequestReviewState("matched")).toBe(false);
  });

  it("blocks rejectRequest for matched requests", () => {
    expect(canMutateRequestReviewState("matched")).toBe(false);
  });

  it("blocks markIntegrityClear for matched requests", () => {
    expect(canMutateRequestReviewState("matched")).toBe(false);
  });

  it("blocks review mutation for rejected requests without a recovery flow", () => {
    expect(canMutateRequestReviewState("rejected")).toBe(false);
    expect(requestReviewMutationBlockedMessage("rejected")).toContain(
      "Rejected requests",
    );
  });

  it("allows review actions only before matching", () => {
    expect(canMutateRequestReviewState("new")).toBe(true);
    expect(canMutateRequestReviewState("needs_clarification")).toBe(true);
    expect(canMutateRequestReviewState("reviewed")).toBe(true);
  });
});

describe("accepted match invariants", () => {
  const presentedInterestedCandidate = {
    candidate_rank: 1,
    provider_response_status: "interested",
    student_decision_status: "presented",
  };

  it("allows the first presented interested candidate to be accepted", () => {
    expect(
      canAcceptCandidateForRequest({
        candidate: presentedInterestedCandidate,
        hasOtherAcceptedCandidate: false,
        request: {
          integrity_review_status: "clear",
          status: "reviewed",
        },
      }),
    ).toBe(true);
  });

  it("prevents a secondary candidate from becoming a second accepted match", () => {
    expect(
      canAcceptCandidateForRequest({
        candidate: presentedInterestedCandidate,
        hasOtherAcceptedCandidate: true,
        request: {
          integrity_review_status: "clear",
          status: "reviewed",
        },
      }),
    ).toBe(false);
  });

  it("allows engagement creation for an accepted match with agreement terms", () => {
    expect(
      canCreateEngagementForAcceptedCandidate({
        candidate: {
          agreed_deadline: "2026-10-30",
          agreed_price: 500,
          student_decision_status: "accepted",
        },
        hasExistingEngagement: false,
        providerStatus: "approved",
        requestStatus: "matched",
      }),
    ).toBe(true);
  });

  it("keeps accepted candidate and matched request state untouched when a secondary candidate is declined", () => {
    const request = { status: "matched" };
    const acceptedCandidate = {
      candidate_rank: 1,
      student_decision_status: "accepted",
    };
    const secondaryCandidate = {
      candidate_rank: 2,
      student_decision_status: "presented",
    };
    const secondaryDecline = studentDeclineCandidateUpdate({
      decidedAt: "2026-10-01T00:00:00.000Z",
      declineReason: "student chose another provider",
    });

    expect({
      acceptedCandidate,
      request,
      secondaryCandidate: {
        ...secondaryCandidate,
        ...secondaryDecline,
      },
    }).toEqual({
      acceptedCandidate: {
        candidate_rank: 1,
        student_decision_status: "accepted",
      },
      request: { status: "matched" },
      secondaryCandidate: {
        candidate_rank: null,
        decline_reason: "student chose another provider",
        declined_by: "student",
        student_decision_at: "2026-10-01T00:00:00.000Z",
        student_decision_status: "declined",
      },
    });
  });
});
