import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

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
});

describe("authenticated matching action UI", () => {
  it("surfaces provider response actions only for pending owned matches", () => {
    expect(providerPage).toContain("respondToMyRequestCandidate");
    expect(providerPage).toContain('match.provider_response_status === "pending"');
    expect(providerPage).toContain('match.student_decision_status === "not_presented"');
    expect(providerPage).toContain("match.candidate_rank === null");
    expect(providerPage).toContain("match.engagement_id === null");
    expect(providerPage).toContain('value="interested"');
    expect(providerPage).toContain('value="declined"');
    expect(providerAction).toContain('supabase.rpc("respond_to_my_request_candidate"');
    expect(providerAction).toContain("revalidatePath(`/app/provider/${parsed.data.applicationId}`)");
  });

  it("surfaces student accept and decline actions only for presented interested candidates", () => {
    expect(requestPage).toContain("decideOnMyPresentedCandidate");
    expect(requestPage).toContain('candidate.provider_response_status === "interested"');
    expect(requestPage).toContain('candidate.student_decision_status === "presented"');
    expect(requestPage).toContain("candidate.candidate_rank !== null");
    expect(requestPage).toContain('value="accepted"');
    expect(requestPage).toContain('value="declined"');
    expect(requestAction).toContain('supabase.rpc("decide_on_my_presented_candidate"');
    expect(requestAction).toContain("revalidatePath(`/app/requests/${parsed.data.requestId}`)");
  });
});
