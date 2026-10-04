import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  getMyEngagementDetail,
  getMyProjectRequestDetail,
  getMyProviderApplicationDetail,
  getProviderApplicationMatches,
  getRequestMatchingCandidates,
} from "./data";
import { isUuid } from "./route-params";

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

function fakeSupabase(data: unknown[] | null, error: unknown = null) {
  const calls: { args: unknown; name: string }[] = [];

  return {
    calls,
    client: {
      rpc(name: string, args: unknown) {
        calls.push({ args, name });
        return Promise.resolve({ data, error });
      },
    },
  };
}

const migration = normalizeNewlines(
  readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/20261004154901_phase5_workspace_detail_reads.sql",
    ),
    "utf8",
  ),
);

const requestList = readFileSync(
  join(process.cwd(), "src/components/workspace/project-request-list.tsx"),
  "utf8",
);
const providerList = readFileSync(
  join(process.cwd(), "src/components/workspace/provider-application-list.tsx"),
  "utf8",
);
const engagementList = readFileSync(
  join(process.cwd(), "src/components/workspace/engagement-list.tsx"),
  "utf8",
);

describe("workspace detail RPC helpers", () => {
  it("calls request detail without caller-supplied ownership ids", async () => {
    const rpc = fakeSupabase([{ id: "request-id" }]);

    await expect(
      getMyProjectRequestDetail(rpc.client as never, "request-id"),
    ).resolves.toEqual({ id: "request-id" });

    expect(rpc.calls).toEqual([
      {
        args: { p_request_id: "request-id" },
        name: "get_my_project_request_detail",
      },
    ]);
  });

  it("returns null for empty provider application detail results", async () => {
    const rpc = fakeSupabase([]);

    await expect(
      getMyProviderApplicationDetail(rpc.client as never, "application-id"),
    ).resolves.toBeNull();
  });

  it("returns null for engagement detail RPC errors", async () => {
    const rpc = fakeSupabase(null, { message: "denied" });

    await expect(
      getMyEngagementDetail(rpc.client as never, "engagement-id"),
    ).resolves.toBeNull();
  });
});

describe("workspace detail route params", () => {
  it("accepts UUID params and rejects malformed identifiers", () => {
    expect(isUuid("430aa1bf-bd80-48b4-9ead-92c8ac308a28")).toBe(true);
    expect(isUuid("not-a-uuid")).toBe(false);
  });
});

describe("workspace detail JSON collections", () => {
  it("supports multiple request candidate lifecycle entries", () => {
    expect(
      getRequestMatchingCandidates({
        matching_candidates: [
          {
            candidate_rank: 1,
            engagement_id: "engagement-1",
            engagement_status: "completed",
            provider_response_status: "interested",
            request_candidate_id: "candidate-1",
            student_decision_status: "accepted",
          },
          {
            candidate_rank: 2,
            engagement_id: null,
            engagement_status: null,
            provider_response_status: "pending",
            request_candidate_id: "candidate-2",
            student_decision_status: "pending",
          },
        ],
      } as never),
    ).toHaveLength(2);
  });

  it("supports multiple provider application matches and safe empty collections", () => {
    expect(
      getProviderApplicationMatches({
        matches: [
          {
            agreed_deadline: "2026-10-29",
            agreed_price: 100,
            candidate_rank: 1,
            currency: "USD",
            engagement_id: "engagement-actual-candidate",
            engagement_status: "completed",
            project_request_id: "request-1",
            proposed_price: 100,
            provider_response_status: "interested",
            request_candidate_id: "candidate-actual",
            request_category: "Web app",
            student_decision_status: "accepted",
          },
          {
            agreed_deadline: null,
            agreed_price: null,
            candidate_rank: null,
            currency: "USD",
            engagement_id: null,
            engagement_status: null,
            project_request_id: "request-2",
            proposed_price: null,
            provider_response_status: "pending",
            request_candidate_id: "candidate-pending",
            request_category: "Data task",
            student_decision_status: "pending",
          },
        ],
      } as never),
    ).toHaveLength(2);

    expect(getProviderApplicationMatches({ matches: [] } as never)).toEqual([]);
    expect(
      getRequestMatchingCandidates({ matching_candidates: null } as never),
    ).toEqual([]);
  });
});

describe("workspace detail migration", () => {
  it("adds authenticated-only security definer detail RPCs", () => {
    for (const fn of [
      "get_my_project_request_detail(uuid)",
      "get_my_provider_application_detail(uuid)",
      "get_my_engagement_detail(uuid)",
    ]) {
      expect(migration).toContain(`function public.${fn.split("(")[0]}(`);
      expect(migration).toContain(
        `revoke all on function public.${fn} from public`,
      );
      expect(migration).toContain(
        `revoke all on function public.${fn} from anon`,
      );
      expect(migration).toContain(
        `revoke all on function public.${fn} from authenticated`,
      );
      expect(migration).toContain(
        `grant execute on function public.${fn} to authenticated`,
      );
    }

    expect(migration).toContain("security definer");
    expect(migration).toContain("set search_path = ''");
  });

  it("enforces active normal-user ownership and participant access", () => {
    expect(migration).toContain("profiles.account_status = 'active'");
    expect(migration).toContain("profiles.role in ('student', 'both')");
    expect(migration).toContain("profiles.role in ('freelancer', 'both')");
    expect(migration).toContain(
      "profiles.role in ('student', 'freelancer', 'both')",
    );
    expect(migration).toContain(
      "current_profile.id = project_requests.linked_student_profile_id",
    );
    expect(migration).toContain(
      "current_profile.id = provider_applications.linked_provider_profile_id",
    );
    expect(migration).toContain(
      "current_profile.id in (\n        engagement_participants.student_profile_id",
    );
    expect(migration).toContain("(select auth.uid())");
    expect(migration).not.toContain("p_profile_id");
    expect(migration).not.toContain("p_user_id");
  });

  it("aggregates request and provider candidate histories without collapsing to one row", () => {
    expect(migration).toContain("matching_candidates jsonb");
    expect(migration).toContain("matches jsonb");
    expect(migration).toContain("jsonb_agg(");
    expect(migration).toContain("'[]'::jsonb");
    expect(migration).toContain(
      "'engagement_id', project_engagements.id",
    );
    expect(migration).toContain(
      "project_engagements.request_candidate_id = request_candidates.id",
    );
    expect(migration).not.toMatch(/limit\s+1/i);
  });

  it("does not expose sensitive fields or broaden table access", () => {
    expect(migration).not.toMatch(/contact_value|internal_notes|reviewed_by/i);
    expect(migration).not.toMatch(/provider_response_tokens|student_decision_tokens/i);
    expect(migration).not.toMatch(/grant\s+select\s+on\s+table/i);
    expect(migration).not.toMatch(/grant\s+(insert|update|delete|all)\s+on\s+table/i);
    expect(migration).not.toMatch(/public\.conversations|public\.messages/);
  });
});

describe("workspace list links", () => {
  it("links owned rows to request, provider application, and engagement detail routes", () => {
    expect(requestList).toContain('href={`/app/requests/${request.id}`}');
    expect(providerList).toContain('href={`/app/provider/${application.id}`}');
    expect(engagementList).toContain(
      "href={`/app/engagements/${engagement.engagement_id}`}",
    );
  });
});
