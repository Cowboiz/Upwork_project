import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  canProviderRespondToMatch,
  canStudentDecideOnCandidate,
  deriveProviderCanRespondToMatch,
  deriveStudentCanDecideOnCandidate,
} from "./matching-action-state";

function normalizeNewlines(value: string) {
  return value.replace(/\r\n/g, "\n");
}

function readProjectFile(path: string) {
  return normalizeNewlines(readFileSync(join(process.cwd(), path), "utf8"));
}

const migration = readProjectFile(
  "supabase/migrations/20261006080813_phase5_authenticated_matching_actions.sql",
);
const providerTokenMigration = readProjectFile(
  "supabase/migrations/20260922172504_provider_response_tokens.sql",
);
const studentTokenMigration = readProjectFile(
  "supabase/migrations/20260923072546_student_decision_tokens.sql",
);
const providerPage = readProjectFile(
  "src/app/(app)/app/provider/[applicationId]/page.tsx",
);
const requestPage = readProjectFile(
  "src/app/(app)/app/requests/[requestId]/page.tsx",
);
const providerAction = readProjectFile(
  "src/app/(app)/app/provider/[applicationId]/actions.ts",
);
const requestAction = readProjectFile(
  "src/app/(app)/app/requests/[requestId]/actions.ts",
);

describe("authenticated matching action migration", () => {
  it("adds authenticated-only security definer RPCs without caller-supplied ownership ids", () => {
    for (const fn of [
      "respond_to_my_request_candidate(uuid, text, text)",
      "decide_on_my_presented_candidate(uuid, text, text)",
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

  it("enforces active normal-role ownership for provider and student actions", () => {
    expect(migration).toContain("v_actor.account_status <> 'active'");
    expect(migration).toContain(
      "not (v_actor.role = any (array['freelancer'::text, 'both'::text]))",
    );
    expect(migration).toContain(
      "not (v_actor.role = any (array['student'::text, 'both'::text]))",
    );
    expect(migration).toContain(
      "v_provider_application.linked_provider_profile_id <> v_actor_id",
    );
    expect(migration).toContain("v_request.linked_student_profile_id <> v_actor_id");
  });

  it("keeps provider responses limited to owned actionable application candidates", () => {
    expect(migration).toContain("v_candidate.provider_application_id is null");
    expect(migration).toContain("v_candidate.provider_response_status <> 'pending'");
    expect(migration).toContain("v_candidate.student_decision_status = 'presented'");
    expect(migration).toContain("v_candidate.candidate_rank is not null");
    expect(migration).toContain("v_provider_application.status <> 'approved'");
    expect(migration).toContain("v_request.status <> 'reviewed'");
    expect(migration).toContain("v_request.integrity_review_status <> 'clear'");
    expect(migration).toContain("event_name = 'provider_contacted'");
    expect(migration).toContain("raise exception 'candidate_not_contacted'");
    expect(migration).toContain("from public.project_engagements");
    expect(migration).toContain("request_candidate_id = v_candidate.id");
    expect(migration).toContain("provider_response_status = p_response");
    expect(migration).toContain("declined_by = case when p_response = 'declined'");
  });

  it("keeps student decisions limited to presented interested candidates without engagements", () => {
    expect(migration).toContain("v_candidate.student_decision_status <> 'presented'");
    expect(migration).toContain("v_candidate.provider_response_status <> 'interested'");
    expect(migration).toContain("v_provider_status <> 'approved'");
    expect(migration).toContain("v_candidate.candidate_rank is null");
    expect(migration).toContain("v_candidate.candidate_rank < 1 or v_candidate.candidate_rank > 3");
    expect(migration).toContain("and student_decision_status = 'accepted'");
    expect(migration).toContain("student_decision_status = 'accepted'");
    expect(migration).toContain("set status = 'matched'");
    expect(migration).toContain("student_decision_status = 'declined'");
    expect(migration).toContain("candidate_rank = null");
    expect(migration).toContain("raise exception 'engagement_exists'");
  });

  it("does not broaden table grants or token route ACLs", () => {
    expect(migration).not.toMatch(/grant\s+(select|insert|update|delete|all)\s+on\s+table/i);
    expect(migration).not.toContain("provider_response_tokens");
    expect(migration).not.toContain("student_decision_tokens");
    expect(providerTokenMigration).toContain(
      "revoke all on function public.respond_to_request_candidate_invitation(uuid, text, text) from authenticated",
    );
    expect(providerTokenMigration).toContain(
      "grant execute on function public.respond_to_request_candidate_invitation(uuid, text, text) to service_role",
    );
    expect(studentTokenMigration).toContain(
      "revoke all on function public.respond_to_presented_candidate(uuid, text, text) from authenticated",
    );
    expect(studentTokenMigration).toContain(
      "grant execute on function public.respond_to_presented_candidate(uuid, text, text) to service_role",
    );
  });

  it("enriches provider detail matches with safe actionability fields", () => {
    expect(migration).toContain(
      "create or replace function public.get_my_provider_application_detail",
    );
    expect(migration).toContain("'request_status', candidate_lifecycle.request_status");
    expect(migration).toContain(
      "'request_integrity_review_status', candidate_lifecycle.request_integrity_review_status",
    );
    expect(migration).toContain(
      "'provider_contacted', candidate_lifecycle.provider_contacted",
    );
    expect(migration).toContain("'can_respond', candidate_lifecycle.can_respond");
    expect(migration).not.toMatch(/workflow_events\.id|actor_user_id|metadata/);
  });

  it("enriches request detail candidates with safe student actionability fields", () => {
    expect(migration).toContain(
      "create or replace function public.get_my_project_request_detail",
    );
    expect(migration).toContain(
      "'provider_application_status', candidate_items.provider_application_status",
    );
    expect(migration).toContain("'can_decide', candidate_items.can_decide");
    expect(migration).toContain(
      "provider_applications.status as provider_application_status",
    );
    expect(migration).toContain(
      "and request_candidates.candidate_rank between 1 and 3",
    );
    expect(migration).toContain("and provider_applications.id is not null");
    expect(migration).toContain("and provider_applications.status = 'approved'");
    expect(migration).toContain("and project_engagements.id is null as can_decide");
  });
});

describe("authenticated matching action UI", () => {
  it("surfaces provider response actions only from the provider can_respond gate", () => {
    expect(providerPage).toContain("respondToMyRequestCandidate");
    expect(providerPage).toContain("canProviderRespondToMatch(match)");
    expect(providerPage).toContain('value="interested"');
    expect(providerPage).toContain('value="declined"');
    expect(providerAction).toContain('supabase.rpc("respond_to_my_request_candidate"');
    expect(providerAction).toContain("candidate_not_contacted");
    expect(providerAction).toContain("revalidatePath(`/app/provider/${parsed.data.applicationId}`)");
  });

  it("surfaces student accept and decline actions only for presented interested candidates", () => {
    expect(requestPage).toContain("decideOnMyPresentedCandidate");
    expect(requestPage).toContain("canStudentDecideOnCandidate(candidate)");
    expect(requestPage).toContain('value="accepted"');
    expect(requestPage).toContain('value="declined"');
    expect(requestAction).toContain('supabase.rpc("decide_on_my_presented_candidate"');
    expect(requestAction).toContain("revalidatePath(`/app/requests/${parsed.data.requestId}`)");
  });
});

describe("authenticated matching action helpers", () => {
  const eligibleProviderMatch = {
    application_status: "approved",
    candidate_rank: null,
    engagement_id: null,
    provider_contacted: true,
    provider_response_status: "pending",
    request_integrity_review_status: "clear",
    request_status: "reviewed",
    student_decision_status: "not_presented",
  };

  it("uses the server-derived provider can_respond field as the UI gate", () => {
    expect(canProviderRespondToMatch({ can_respond: true })).toBe(true);
    expect(canProviderRespondToMatch({ can_respond: false })).toBe(false);
  });

  it.each([
    ["contacted and fully eligible", {}, true],
    ["not contacted", { provider_contacted: false }, false],
    ["request not reviewed", { request_status: "submitted" }, false],
    ["integrity not clear", { request_integrity_review_status: "pending" }, false],
    ["pending false", { provider_response_status: "interested" }, false],
    ["presented", { student_decision_status: "presented" }, false],
    ["ranked", { candidate_rank: 1 }, false],
    ["engagement exists", { engagement_id: "engagement-id" }, false],
    ["application not approved", { application_status: "pending" }, false],
  ])("derives provider response actionability: %s", (_label, overrides, expected) => {
    expect(
      deriveProviderCanRespondToMatch({
        ...eligibleProviderMatch,
        ...overrides,
      }),
    ).toBe(expected);
  });

  it("uses the server-derived student can_decide field as the UI gate", () => {
    expect(canStudentDecideOnCandidate({ can_decide: true })).toBe(true);
    expect(canStudentDecideOnCandidate({ can_decide: false })).toBe(false);
  });

  it.each([
    [
      "presented interested ranked eligible request",
      { status: "reviewed", integrity_review_status: "clear" },
      {
        candidate_rank: 1,
        engagement_id: null,
        provider_application_status: "approved",
        provider_response_status: "interested",
        student_decision_status: "presented",
      },
      true,
    ],
    [
      "request not reviewed",
      { status: "submitted", integrity_review_status: "clear" },
      {
        candidate_rank: 1,
        engagement_id: null,
        provider_application_status: "approved",
        provider_response_status: "interested",
        student_decision_status: "presented",
      },
      false,
    ],
    [
      "integrity not clear",
      { status: "reviewed", integrity_review_status: "pending" },
      {
        candidate_rank: 1,
        engagement_id: null,
        provider_application_status: "approved",
        provider_response_status: "interested",
        student_decision_status: "presented",
      },
      false,
    ],
    [
      "not presented",
      { status: "reviewed", integrity_review_status: "clear" },
      {
        candidate_rank: 1,
        engagement_id: null,
        provider_application_status: "approved",
        provider_response_status: "interested",
        student_decision_status: "not_presented",
      },
      false,
    ],
    [
      "not interested",
      { status: "reviewed", integrity_review_status: "clear" },
      {
        candidate_rank: 1,
        engagement_id: null,
        provider_application_status: "approved",
        provider_response_status: "pending",
        student_decision_status: "presented",
      },
      false,
    ],
    [
      "rank null",
      { status: "reviewed", integrity_review_status: "clear" },
      {
        candidate_rank: null,
        engagement_id: null,
        provider_application_status: "approved",
        provider_response_status: "interested",
        student_decision_status: "presented",
      },
      false,
    ],
    [
      "engagement exists",
      { status: "reviewed", integrity_review_status: "clear" },
      {
        candidate_rank: 1,
        engagement_id: "engagement-id",
        provider_application_status: "approved",
        provider_response_status: "interested",
        student_decision_status: "presented",
      },
      false,
    ],
    [
      "provider pending",
      { status: "reviewed", integrity_review_status: "clear" },
      {
        candidate_rank: 1,
        engagement_id: null,
        provider_application_status: "pending",
        provider_response_status: "interested",
        student_decision_status: "presented",
      },
      false,
    ],
    [
      "provider rejected",
      { status: "reviewed", integrity_review_status: "clear" },
      {
        candidate_rank: 1,
        engagement_id: null,
        provider_application_status: "rejected",
        provider_response_status: "interested",
        student_decision_status: "presented",
      },
      false,
    ],
    [
      "provider inactive",
      { status: "reviewed", integrity_review_status: "clear" },
      {
        candidate_rank: 1,
        engagement_id: null,
        provider_application_status: "inactive",
        provider_response_status: "interested",
        student_decision_status: "presented",
      },
      false,
    ],
    [
      "missing provider application status",
      { status: "reviewed", integrity_review_status: "clear" },
      {
        candidate_rank: 1,
        engagement_id: null,
        provider_application_status: "",
        provider_response_status: "interested",
        student_decision_status: "presented",
      },
      false,
    ],
  ])("derives student decision actionability: %s", (_label, request, candidate, expected) => {
    expect(deriveStudentCanDecideOnCandidate(request, candidate)).toBe(expected);
  });
});
