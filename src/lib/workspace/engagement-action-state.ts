export type EngagementParticipantSide = "provider" | "student" | "";

export type EngagementActionStateInput = {
  engagement_status: string;
  feedback_exists: boolean;
  participant_side: EngagementParticipantSide;
  request_status: string;
};

export type EngagementActionState = {
  can_complete: boolean;
  can_dispute: boolean;
  can_feedback: boolean;
  can_start: boolean;
  can_submit: boolean;
  engagement_status: string;
  participant_side: EngagementParticipantSide;
  request_status: string;
};

export function deriveEngagementActionState(
  input: EngagementActionStateInput,
): EngagementActionState {
  return {
    can_complete:
      input.participant_side === "student" &&
      input.engagement_status === "submitted" &&
      input.request_status === "in_progress",
    can_dispute:
      input.participant_side === "student" &&
      input.engagement_status === "submitted" &&
      input.request_status === "in_progress",
    can_feedback:
      input.participant_side === "student" &&
      input.engagement_status === "completed" &&
      input.request_status === "completed" &&
      !input.feedback_exists,
    can_start:
      input.participant_side === "provider" &&
      input.engagement_status === "agreed" &&
      input.request_status === "matched",
    can_submit:
      input.participant_side === "provider" &&
      input.engagement_status === "in_progress" &&
      input.request_status === "in_progress",
    engagement_status: input.engagement_status,
    participant_side: input.participant_side,
    request_status: input.request_status,
  };
}
