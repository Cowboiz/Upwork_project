import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { parseEngagementActionState } from "./data";
import { deriveEngagementActionState } from "./engagement-action-state";

vi.mock("server-only", () => ({}));
vi.mock(
  "@/lib/observability/server-log",
  () => ({
    logWorkspaceDataLoadFailed: vi.fn(),
  }),
);

function normalizeNewlines(value: string) {
  return value.replace(/\r\n/g, "\n");
}

function readProjectFile(path: string) {
  return normalizeNewlines(readFileSync(join(process.cwd(), path), "utf8"));
}

const migration = readProjectFile(
  "supabase/migrations/20261006162949_phase5_authenticated_engagement_actions.sql",
);
const providerTokenMigration = readProjectFile(
  "supabase/migrations/20260924075614_phase3_provider_engagement_delivery.sql",
);
const studentTokenMigration = readProjectFile(
  "supabase/migrations/20260924093000_phase3_student_completion_flow.sql",
);
const feedbackTokenMigration = readProjectFile(
  "supabase/migrations/20260926090000_phase3_engagement_feedback.sql",
);
const engagementPage = readProjectFile(
  "src/app/(app)/app/engagements/[engagementId]/page.tsx",
);
const engagementActions = readProjectFile(
  "src/app/(app)/app/engagements/[engagementId]/actions.ts",
);

describe("authenticated engagement action migration", () => {
  it("adds authenticated-only security definer engagement RPCs", () => {
    for (const fn of [
      "get_my_engagement_action_state(uuid)",
      "start_my_engagement_work(uuid)",
      "submit_my_engagement_deliverable(uuid, text, text)",
      "complete_my_engagement(uuid)",
      "dispute_my_engagement(uuid, text)",
      "submit_my_engagement_feedback(uuid, integer, text)",
    ]) {
      expect(migration).toContain(`revoke all on function public.${fn} from public`);
      expect(migration).toContain(`revoke all on function public.${fn} from anon`);
      expect(migration).toContain(
        `revoke all on function public.${fn} from authenticated`,
      );
      expect(migration).toContain(
        `grant execute on function public.${fn} to authenticated`,
      );
    }

    expect(migration).toContain("security definer");
    expect(migration).toContain("set search_path = ''");
    expect(migration).toContain("v_actor_id := auth.uid()");
    expect(migration).not.toContain("p_profile_id");
    expect(migration).not.toContain("p_user_id");
  });

  it("preserves legacy token RPCs as service-role-only", () => {
    expect(providerTokenMigration).toContain(
      "revoke all on function public.start_engagement_work(uuid) from authenticated",
    );
    expect(providerTokenMigration).toContain(
      "grant execute on function public.start_engagement_work(uuid) to service_role",
    );
    expect(providerTokenMigration).toContain(
      "revoke all on function public.submit_engagement_deliverable(uuid, text, text) from authenticated",
    );
    expect(providerTokenMigration).toContain(
      "grant execute on function public.submit_engagement_deliverable(uuid, text, text) to service_role",
    );
    expect(studentTokenMigration).toContain(
      "revoke all on function public.complete_engagement(uuid) from authenticated",
    );
    expect(studentTokenMigration).toContain(
      "grant execute on function public.complete_engagement(uuid) to service_role",
    );
    expect(studentTokenMigration).toContain(
      "revoke all on function public.dispute_engagement(uuid, text) from authenticated",
    );
    expect(studentTokenMigration).toContain(
      "grant execute on function public.dispute_engagement(uuid, text) to service_role",
    );
    expect(feedbackTokenMigration).toContain(
      "revoke all on function public.submit_engagement_feedback(uuid, integer, text) from authenticated",
    );
    expect(feedbackTokenMigration).toContain(
      "grant execute on function public.submit_engagement_feedback(uuid, integer, text) to service_role",
    );
  });

  it("uses auth ownership and active normal roles for participant actions", () => {
    expect(migration).toContain("v_actor.account_status <> 'active'");
    expect(migration).toContain(
      "not (v_actor.role = any (array['freelancer'::text, 'both'::text]))",
    );
    expect(migration).toContain(
      "not (v_actor.role = any (array['student'::text, 'both'::text]))",
    );
    expect(migration).toContain("v_provider_profile_id <> v_actor_id");
    expect(migration).toContain("v_request.linked_student_profile_id <> v_actor_id");
    expect(migration).toContain("request_candidates.linked_provider_profile_id");
    expect(migration).toContain("provider_applications.linked_provider_profile_id");
  });

  it("keeps engagement lifecycle transitions and validation authoritative in SQL", () => {
    expect(migration).toContain("v_engagement.status = 'agreed'");
    expect(migration).toContain("v_request.status <> 'matched'");
    expect(migration).toContain("status = 'in_progress'");
    expect(migration).toContain("v_engagement.status = 'in_progress'");
    expect(migration).toContain("status = 'submitted'");
    expect(migration).toContain("deliverable_required");
    expect(migration).toContain("deliverable_url_invalid");
    expect(migration).toContain("deliverable_conflict");
    expect(migration).toContain("v_engagement.status = 'submitted'");
    expect(migration).toContain("status = 'completed'");
    expect(migration).toContain("status = 'disputed'");
    expect(migration).toContain("dispute_notes_required");
    expect(migration).toContain("dispute_conflict");
    expect(migration).toContain("feedback_rating_invalid");
    expect(migration).toContain("feedback_conflict");
  });

  it("adds narrow action-state JSON without broad table mutation grants", () => {
    expect(migration).toContain(
      "create or replace function public.get_my_engagement_action_state",
    );
    expect(migration).toContain("'participant_side'");
    expect(migration).toContain("'can_start'");
    expect(migration).toContain("'can_submit'");
    expect(migration).toContain("'can_complete'");
    expect(migration).toContain("'can_dispute'");
    expect(migration).toContain("'can_feedback'");
    expect(migration).not.toMatch(
      /grant\s+(insert|update|delete|all)\s+on\s+table/i,
    );
    expect(migration).not.toContain("engagement_access_tokens");
    expect(migration).not.toMatch(/internal_notes|contact_value/i);
  });
});

describe("authenticated engagement action state helpers", () => {
  it.each([
    [
      "provider agreed/matched can start",
      {
        engagement_status: "agreed",
        feedback_exists: false,
        participant_side: "provider" as const,
        request_status: "matched",
      },
      {
        can_complete: false,
        can_dispute: false,
        can_feedback: false,
        can_start: true,
        can_submit: false,
      },
    ],
    [
      "provider in progress can submit",
      {
        engagement_status: "in_progress",
        feedback_exists: false,
        participant_side: "provider" as const,
        request_status: "in_progress",
      },
      {
        can_complete: false,
        can_dispute: false,
        can_feedback: false,
        can_start: false,
        can_submit: true,
      },
    ],
    [
      "student submitted can complete or dispute",
      {
        engagement_status: "submitted",
        feedback_exists: false,
        participant_side: "student" as const,
        request_status: "in_progress",
      },
      {
        can_complete: true,
        can_dispute: true,
        can_feedback: false,
        can_start: false,
        can_submit: false,
      },
    ],
    [
      "student completed can feedback",
      {
        engagement_status: "completed",
        feedback_exists: false,
        participant_side: "student" as const,
        request_status: "completed",
      },
      {
        can_complete: false,
        can_dispute: false,
        can_feedback: true,
        can_start: false,
        can_submit: false,
      },
    ],
    [
      "terminal provider controls false",
      {
        engagement_status: "completed",
        feedback_exists: false,
        participant_side: "provider" as const,
        request_status: "completed",
      },
      {
        can_complete: false,
        can_dispute: false,
        can_feedback: false,
        can_start: false,
        can_submit: false,
      },
    ],
    [
      "existing feedback blocks feedback control",
      {
        engagement_status: "completed",
        feedback_exists: true,
        participant_side: "student" as const,
        request_status: "completed",
      },
      {
        can_complete: false,
        can_dispute: false,
        can_feedback: false,
        can_start: false,
        can_submit: false,
      },
    ],
  ])("derives action state: %s", (_label, input, expected) => {
    expect(deriveEngagementActionState(input)).toMatchObject(expected);
  });

  it("defaults malformed JSON booleans to false", () => {
    expect(
      parseEngagementActionState({
        can_complete: "yes",
        can_dispute: null,
        can_feedback: 1,
        can_start: false,
        can_submit: true,
        engagement_status: "in_progress",
        participant_side: "provider",
        request_status: "in_progress",
      }),
    ).toEqual({
      can_complete: false,
      can_dispute: false,
      can_feedback: false,
      can_start: false,
      can_submit: true,
      engagement_status: "in_progress",
      participant_side: "provider",
      request_status: "in_progress",
    });
  });
});

describe("authenticated engagement action UI", () => {
  it("loads action state and uses it to gate participant-specific controls", () => {
    expect(engagementPage).toContain("getMyEngagementActionState");
    expect(engagementPage).toContain('actionState.participant_side === "provider"');
    expect(engagementPage).toContain("actionState.can_start");
    expect(engagementPage).toContain("actionState.can_submit");
    expect(engagementPage).toContain('actionState.participant_side === "student"');
    expect(engagementPage).toContain("actionState.can_complete");
    expect(engagementPage).toContain("actionState.can_dispute");
    expect(engagementPage).toContain("actionState.can_feedback");
  });

  it("uses authenticated RPC actions and reuses engagement email notifications", () => {
    expect(engagementActions).toContain('supabase.rpc("start_my_engagement_work"');
    expect(engagementActions).toContain(
      'supabase.rpc("submit_my_engagement_deliverable"',
    );
    expect(engagementActions).toContain('supabase.rpc("complete_my_engagement"');
    expect(engagementActions).toContain('supabase.rpc("dispute_my_engagement"');
    expect(engagementActions).toContain(
      'supabase.rpc("submit_my_engagement_feedback"',
    );
    expect(engagementActions).not.toContain("createSupabaseAdminClient");
    expect(engagementActions).toContain(
      "sendEngagementSubmittedStudentNotification",
    );
    expect(engagementActions).toContain(
      "sendEngagementCompletedProviderNotification",
    );
    expect(engagementActions).toContain("sendEngagementDisputedAdminNotification");
  });
});
