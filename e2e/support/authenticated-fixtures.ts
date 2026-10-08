import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../src/types/database.types";
import {
  assertProjectMatchDevSupabaseUrl,
  type AuthenticatedE2EEnv,
} from "./authenticated-env";

type TypedClient = SupabaseClient<Database>;
type TestRole = "admin" | "student" | "freelancer";
type TestIdentitySlug = "admin" | "aux_student" | "provider" | "student";
type TestAccount = {
  email: string;
  id: string;
  password: string;
  role: TestRole;
};
type TestAccounts = {
  admin: TestAccount;
  auxiliaryStudent: TestAccount;
  provider: TestAccount;
  student: TestAccount;
};
type LifecycleFixture = {
  admin: TestAccount;
  candidateId: string;
  engagementId?: string;
  marker: string;
  provider: TestAccount;
  providerApplicationId: string;
  requestId: string;
  student: TestAccount;
};

const markerPrefix = "E2E_AUTH_LIFECYCLE";
const metadataMarkerKey = "projectmatch_e2e_fixture";
export const projectRequestFixtureValues = {
  budgetRange: "100_300",
  category: "other",
} as const;
export const requestCandidateFixtureValues = {
  usesProviderApplicationSource: true,
} as const;

type SafePostgrestError = {
  code?: string;
  details?: string | null;
  hint?: string | null;
  message?: string;
};

function safePostgrestDetails(error: SafePostgrestError | null) {
  const parts: string[] = [];

  if (error?.code) {
    parts.push(`code=${error.code}`);
  }

  if (error?.message) {
    parts.push(`message=${error.message}`);
  }

  if (error?.details) {
    parts.push(`details=${error.details}`);
  }

  if (error?.hint) {
    parts.push(`hint=${error.hint}`);
  }

  return parts.join(" ");
}

function getFixtureMarker(user: { app_metadata?: Record<string, unknown> }) {
  return user.app_metadata?.[metadataMarkerKey];
}

function fixtureSetupError(stage: string, error: SafePostgrestError | null) {
  const parts = [`Could not create E2E ${stage}.`];
  const details = safePostgrestDetails(error);

  if (details) {
    parts.push(details);
  }

  return new Error(parts.join(" "));
}

export function normalizeModernSecretKeyHeaders(
  headersInit: HeadersInit,
  privilegedKey: string,
) {
  const headers = new Headers(headersInit);

  if (privilegedKey.startsWith("sb_secret_")) {
    const authorization = headers.get("authorization");

    if (authorization === `Bearer ${privilegedKey}`) {
      headers.delete("authorization");
    }
  }

  return headers;
}

function createModernSecretKeyFetch(privilegedKey: string) {
  if (!privilegedKey.startsWith("sb_secret_")) {
    return undefined;
  }

  return (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    const headers = normalizeModernSecretKeyHeaders(
      request.headers,
      privilegedKey,
    );

    return fetch(new Request(request, { headers }));
  };
}

function withPlusAddress(email: string, label: string) {
  const atIndex = email.lastIndexOf("@");

  if (atIndex <= 0) {
    throw new Error("E2E_STUDENT_EMAIL must be a valid email address.");
  }

  return `${email.slice(0, atIndex)}+${label}${email.slice(atIndex)}`;
}

export function e2eProfileUsername(slug: TestIdentitySlug) {
  return `${markerPrefix.toLowerCase()}_${slug}`;
}

export function createAdminClient(env: AuthenticatedE2EEnv) {
  assertProjectMatchDevSupabaseUrl(env.supabaseUrl, "E2E_SUPABASE_URL");
  const modernSecretKeyFetch = createModernSecretKeyFetch(env.supabaseSecretKey);

  return createClient<Database>(env.supabaseUrl, env.supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    ...(modernSecretKeyFetch
      ? {
          global: {
            fetch: modernSecretKeyFetch,
          },
        }
      : {}),
  });
}

export function createPublicClient(env: AuthenticatedE2EEnv) {
  assertProjectMatchDevSupabaseUrl(env.supabaseUrl, "E2E_SUPABASE_URL");

  return createClient<Database>(env.supabaseUrl, env.supabasePublishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function signInClient(
  env: AuthenticatedE2EEnv,
  email: string,
  password: string,
) {
  const client = createPublicClient(env);
  const { error } = await client.auth.signInWithPassword({ email, password });

  if (error) {
    throw new Error(`Could not sign in authenticated E2E account ${email}.`);
  }

  return client;
}

async function ensureAccount(
  adminClient: TypedClient,
  email: string,
  password: string,
  role: TestRole,
  slug: TestIdentitySlug,
  fullName: string,
): Promise<TestAccount> {
  const { data: users, error: listError } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (listError) {
    throw new Error("Could not list Supabase Auth users for E2E setup.");
  }

  let user = users.users.find((candidate) => candidate.email === email);

  if (!user) {
    const { data, error } = await adminClient.auth.admin.createUser({
      app_metadata: {
        [metadataMarkerKey]: markerPrefix,
      },
      email,
      email_confirm: true,
      password,
    });

    if (error || !data.user) {
      throw new Error(`Could not create authenticated E2E account ${email}.`);
    }

    user = data.user;
  } else {
    if (getFixtureMarker(user) !== markerPrefix) {
      throw new Error(
        `Configured authenticated E2E account ${email} is not marked as a ProjectMatch E2E fixture.`,
      );
    }

    const { error } = await adminClient.auth.admin.updateUserById(user.id, {
      app_metadata: {
        ...user.app_metadata,
        [metadataMarkerKey]: markerPrefix,
      },
      email_confirm: true,
      password,
    });

    if (error) {
      throw new Error(`Could not update authenticated E2E account ${email}.`);
    }
  }

  const { error: profileError } = await adminClient.from("profiles").upsert(
    {
      account_status: "active",
      full_name: fullName,
      id: user.id,
      role,
      username: e2eProfileUsername(slug),
    },
    { onConflict: "id" },
  );

  if (profileError) {
    const details = safePostgrestDetails(profileError);
    const suffix = details ? ` ${details}` : "";

    throw new Error(
      `Could not upsert ${role} profile for authenticated E2E.${suffix}`,
    );
  }

  return {
    email,
    id: user.id,
    password,
    role,
  };
}

export async function ensureAuthenticatedAccounts(
  env: AuthenticatedE2EEnv,
  adminClient: TypedClient,
) {
  const auxiliaryStudentEmail = withPlusAddress(
    env.studentEmail,
    "projectmatch-e2e-aux",
  );
  const distinctEmails = new Set(
    [
      env.adminEmail,
      env.providerEmail,
      env.studentEmail,
      auxiliaryStudentEmail,
    ].map((email) => email.trim().toLowerCase()),
  );

  if (distinctEmails.size !== 4) {
    throw new Error(
      "Authenticated E2E primary and auxiliary account emails must be distinct.",
    );
  }

  const [admin, student, auxiliaryStudent, provider] = await Promise.all([
    ensureAccount(
      adminClient,
      env.adminEmail,
      env.adminPassword,
      "admin",
      "admin",
      "E2E Admin",
    ),
    ensureAccount(
      adminClient,
      env.studentEmail,
      env.studentPassword,
      "student",
      "student",
      "E2E Student",
    ),
    ensureAccount(
      adminClient,
      auxiliaryStudentEmail,
      env.studentPassword,
      "student",
      "aux_student",
      "E2E Auxiliary Student",
    ),
    ensureAccount(
      adminClient,
      env.providerEmail,
      env.providerPassword,
      "freelancer",
      "provider",
      "E2E Provider",
    ),
  ]);

  return {
    admin,
    auxiliaryStudent,
    provider,
    student,
  };
}

async function deleteByIds(
  client: TypedClient,
  table: keyof Database["public"]["Tables"],
  column: string,
  ids: string[],
) {
  if (ids.length === 0) {
    return;
  }

  const { error } = await client.from(table).delete().in(column, ids);

  if (error) {
    throw new Error(`Could not delete E2E rows from ${String(table)}.`);
  }
}

export async function cleanupLifecycleFixture(
  adminClient: TypedClient,
  fixture: Pick<
    LifecycleFixture,
    "candidateId" | "providerApplicationId" | "requestId"
  > & {
    engagementId?: string;
  },
) {
  const candidateIds = [fixture.candidateId];
  const providerApplicationIds = [fixture.providerApplicationId];
  const requestIds = [fixture.requestId];
  const { data: discoveredEngagements, error: engagementLookupError } =
    await adminClient
      .from("project_engagements")
      .select("id")
      .eq("request_candidate_id", fixture.candidateId);

  if (engagementLookupError) {
    throw new Error("Could not resolve E2E engagement rows for cleanup.");
  }

  const engagementIds = [
    ...new Set([
      ...(fixture.engagementId ? [fixture.engagementId] : []),
      ...(discoveredEngagements ?? []).map((engagement) => engagement.id),
    ]),
  ];

  await deleteByIds(adminClient, "engagement_message_reads", "project_engagement_id", engagementIds);
  await deleteByIds(adminClient, "engagement_messages", "project_engagement_id", engagementIds);
  await deleteByIds(adminClient, "engagement_feedback", "project_engagement_id", engagementIds);
  await deleteByIds(adminClient, "engagement_access_tokens", "project_engagement_id", engagementIds);
  await deleteByIds(adminClient, "email_outbox", "related_project_engagement_id", engagementIds);
  await deleteByIds(adminClient, "workflow_events", "project_engagement_id", engagementIds);
  await deleteByIds(adminClient, "project_engagements", "id", engagementIds);
  await deleteByIds(adminClient, "provider_response_tokens", "request_candidate_id", candidateIds);
  await deleteByIds(adminClient, "student_decision_tokens", "request_candidate_id", candidateIds);
  await deleteByIds(adminClient, "email_outbox", "related_request_candidate_id", candidateIds);
  await deleteByIds(adminClient, "workflow_events", "request_candidate_id", candidateIds);
  await deleteByIds(adminClient, "request_candidates", "id", candidateIds);
  await deleteByIds(adminClient, "email_outbox", "related_project_request_id", requestIds);
  await deleteByIds(adminClient, "workflow_events", "project_request_id", requestIds);
  await deleteByIds(adminClient, "project_requests", "id", requestIds);
  await deleteByIds(
    adminClient,
    "email_outbox",
    "related_provider_application_id",
    providerApplicationIds,
  );
  await deleteByIds(
    adminClient,
    "workflow_events",
    "provider_application_id",
    providerApplicationIds,
  );
  await deleteByIds(adminClient, "provider_applications", "id", providerApplicationIds);
}

async function createBaseLifecycleFixture(
  adminClient: TypedClient,
  accounts: TestAccounts,
): Promise<LifecycleFixture> {
  const marker = `${markerPrefix}_${crypto.randomUUID()}`;
  const deadline = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const partialFixture: Partial<LifecycleFixture> = {
    ...accounts,
    marker,
  };

  try {
    const { data: request, error: requestError } = await adminClient
      .from("project_requests")
      .insert({
        age_eligible_confirmed: true,
        asset_links: [],
        budget_range: projectRequestFixtureValues.budgetRange,
        category: projectRequestFixtureValues.category,
        contact_method: "email",
        contact_permission_confirmed: true,
        contact_value: "student@example.test",
        currency: "USD",
        deadline,
        deadline_flexible: false,
        description: `${marker} request`,
        desired_deliverables: "A deterministic lifecycle artifact",
        integrity_attested: true,
        integrity_review_status: "clear",
        linked_student_profile_id: accounts.student.id,
        requester_name: "E2E Student",
        reviewed_at: new Date().toISOString(),
        reviewed_by: accounts.admin.id,
        status: "reviewed",
      })
      .select("id")
      .single();

    if (requestError || !request) {
      throw fixtureSetupError("project request", requestError);
    }

    partialFixture.requestId = request.id;

    const { data: application, error: applicationError } = await adminClient
      .from("provider_applications")
      .insert({
        age_eligible_confirmed: true,
        applicant_name: marker,
        availability: "Weekdays",
        contact_method: "email",
        contact_value: "provider@example.test",
        linked_provider_profile_id: accounts.provider.id,
        policy_accepted_at: new Date().toISOString(),
        portfolio_urls: ["https://example.com/portfolio"],
        preferred_project_types: ["research"],
        privacy_acknowledged_at: new Date().toISOString(),
        rate_expectations: "100 USD",
        reviewed_at: new Date().toISOString(),
        reviewed_by: accounts.admin.id,
        skills: ["writing", "analysis"],
        status: "approved",
      })
      .select("id")
      .single();

    if (applicationError || !application) {
      throw fixtureSetupError("provider application", applicationError);
    }

    partialFixture.providerApplicationId = application.id;

    const { data: candidate, error: candidateError } = await adminClient
      .from("request_candidates")
      .insert({
        agreed_deadline: deadline,
        agreed_price: 100,
        currency: "USD",
        curated_by: accounts.admin.id,
        project_request_id: request.id,
        proposed_price: 100,
        provider_response_status: "pending",
        scope_summary: "Authenticated lifecycle E2E scope",
        student_decision_status: "not_presented",
        ...(requestCandidateFixtureValues.usesProviderApplicationSource
          ? { provider_application_id: application.id }
          : { linked_provider_profile_id: accounts.provider.id }),
      })
      .select("id")
      .single();

    if (candidateError || !candidate) {
      throw fixtureSetupError("request candidate", candidateError);
    }

    partialFixture.candidateId = candidate.id;

    return partialFixture as LifecycleFixture;
  } catch (error) {
    if (
      partialFixture.requestId &&
      partialFixture.providerApplicationId &&
      partialFixture.candidateId
    ) {
      await cleanupLifecycleFixture(
        adminClient,
        partialFixture as LifecycleFixture,
      );
    } else {
      await cleanupPartialLifecycleFixture(adminClient, partialFixture);
    }

    throw error;
  }
}

export async function createProviderPendingFixture(
  adminClient: TypedClient,
  accounts: {
    admin: TestAccount;
    auxiliaryStudent: TestAccount;
    provider: TestAccount;
    student: TestAccount;
  },
) {
  return createBaseLifecycleFixture(adminClient, accounts);
}

export async function contactCandidate(adminClient: TypedClient, fixture: LifecycleFixture) {
  const { error } = await adminClient.rpc("mark_request_candidate_contacted", {
    p_candidate_id: fixture.candidateId,
    p_request_id: fixture.requestId,
  });

  if (error) {
    throw new Error("Could not mark E2E candidate contacted.");
  }
}

export async function presentCandidate(adminClient: TypedClient, fixture: LifecycleFixture) {
  const { error } = await adminClient
    .from("request_candidates")
    .update({
      candidate_rank: 1,
      student_decision_status: "presented",
    })
    .eq("id", fixture.candidateId);

  if (error) {
    throw new Error("Could not present E2E candidate.");
  }
}

export async function createEngagementWithAdmin(
  adminClient: TypedClient,
  fixture: LifecycleFixture,
) {
  const { data, error } = await adminClient.rpc("create_project_engagement", {
    p_candidate_id: fixture.candidateId,
    p_request_id: fixture.requestId,
  });

  if (error || !data) {
    throw new Error("Could not create E2E engagement.");
  }

  fixture.engagementId = data;

  return data;
}

export async function createAcceptedEngagementFixture(
  adminClient: TypedClient,
  adminRpcClient: TypedClient,
  accounts: {
    admin: TestAccount;
    auxiliaryStudent: TestAccount;
    provider: TestAccount;
    student: TestAccount;
  },
) {
  const fixture = await createBaseLifecycleFixture(adminClient, accounts);

  try {
    const now = new Date().toISOString();

    const { error: candidateError } = await adminClient
      .from("request_candidates")
      .update({
        candidate_rank: 1,
        provider_responded_at: now,
        provider_response_status: "interested",
        student_decision_at: now,
        student_decision_status: "accepted",
      })
      .eq("id", fixture.candidateId);

    if (candidateError) {
      throw new Error("Could not accept E2E candidate.");
    }

    const { error: requestError } = await adminClient
      .from("project_requests")
      .update({
        status: "matched",
      })
      .eq("id", fixture.requestId);

    if (requestError) {
      throw new Error("Could not match E2E request.");
    }

    await createEngagementWithAdmin(adminRpcClient, fixture);
  } catch (error) {
    await cleanupLifecycleFixture(adminClient, fixture);

    throw error;
  }

  return fixture;
}

export async function readCandidate(adminClient: TypedClient, candidateId: string) {
  const { data, error } = await adminClient
    .from("request_candidates")
    .select("provider_response_status,student_decision_status")
    .eq("id", candidateId)
    .single();

  if (error || !data) {
    throw new Error("Could not read E2E candidate.");
  }

  return data;
}

export async function readRequest(adminClient: TypedClient, requestId: string) {
  const { data, error } = await adminClient
    .from("project_requests")
    .select("status")
    .eq("id", requestId)
    .single();

  if (error || !data) {
    throw new Error("Could not read E2E request.");
  }

  return data;
}

export async function readEngagement(adminClient: TypedClient, engagementId: string) {
  const { data, error } = await adminClient
    .from("project_engagements")
    .select("status,deliverable_url,deliverable_summary,dispute_notes")
    .eq("id", engagementId)
    .single();

  if (error || !data) {
    throw new Error("Could not read E2E engagement.");
  }

  return data;
}

export async function readEngagementFeedback(
  adminClient: TypedClient,
  engagementId: string,
) {
  const { data, error } = await adminClient
    .from("engagement_feedback")
    .select("rating,feedback_text")
    .eq("project_engagement_id", engagementId)
    .single();

  if (error || !data) {
    throw new Error("Could not read E2E engagement feedback.");
  }

  return data;
}

export async function countEngagementFeedback(
  adminClient: TypedClient,
  engagementId: string,
) {
  const { count, error } = await adminClient
    .from("engagement_feedback")
    .select("id", { count: "exact", head: true })
    .eq("project_engagement_id", engagementId);

  if (error) {
    throw new Error("Could not count E2E engagement feedback.");
  }

  return count ?? 0;
}

async function cleanupPartialLifecycleFixture(
  adminClient: TypedClient,
  fixture: Partial<LifecycleFixture>,
) {
  if (fixture.candidateId) {
    await deleteByIds(adminClient, "request_candidates", "id", [
      fixture.candidateId,
    ]);
  }

  if (fixture.requestId) {
    await deleteByIds(adminClient, "workflow_events", "project_request_id", [
      fixture.requestId,
    ]);
    await deleteByIds(adminClient, "email_outbox", "related_project_request_id", [
      fixture.requestId,
    ]);
    await deleteByIds(adminClient, "project_requests", "id", [fixture.requestId]);
  }

  if (fixture.providerApplicationId) {
    await deleteByIds(
      adminClient,
      "workflow_events",
      "provider_application_id",
      [fixture.providerApplicationId],
    );
    await deleteByIds(
      adminClient,
      "email_outbox",
      "related_provider_application_id",
      [fixture.providerApplicationId],
    );
    await deleteByIds(adminClient, "provider_applications", "id", [
      fixture.providerApplicationId,
    ]);
  }
}
