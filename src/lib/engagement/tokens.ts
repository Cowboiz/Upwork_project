import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type EngagementAccessAudience = "provider" | "student";

export type EngagementAccessTokenRow = Pick<
  Database["public"]["Tables"]["engagement_access_tokens"]["Row"],
  | "audience"
  | "created_at"
  | "expires_at"
  | "id"
  | "project_engagement_id"
  | "revoked_at"
> & {
  audience: EngagementAccessAudience;
};

type Supabase = SupabaseClient<Database>;

const TOKEN_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const TOKEN_PATTERN =
  /^([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.([A-Za-z0-9_-]+)$/i;
const TOKEN_SELECT =
  "id, project_engagement_id, audience, expires_at, revoked_at, created_at";

function optionalEnv(name: string) {
  const value = process.env[name]?.trim();

  return value && value.length > 0 ? value : null;
}

function requireEnv(name: string) {
  const value = optionalEnv(name);

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getAppBaseUrl() {
  return requireEnv("APP_BASE_URL").replace(/\/+$/, "");
}

function engagementAccessTokenSecret() {
  return requireEnv("ENGAGEMENT_ACCESS_TOKEN_SECRET");
}

function isEngagementAccessAudience(
  audience: string,
): audience is EngagementAccessAudience {
  return audience === "provider" || audience === "student";
}

function assertEngagementAccessAudience(
  audience: string,
): asserts audience is EngagementAccessAudience {
  if (!isEngagementAccessAudience(audience)) {
    throw new Error("Unsupported engagement access token audience.");
  }
}

function asTokenRow(row: unknown): EngagementAccessTokenRow | null {
  if (!row || typeof row !== "object") {
    return null;
  }

  const value = row as Partial<EngagementAccessTokenRow>;
  const audience = String(value.audience);

  if (
    typeof value.id !== "string" ||
    typeof value.project_engagement_id !== "string" ||
    !isEngagementAccessAudience(audience) ||
    typeof value.expires_at !== "string" ||
    typeof value.created_at !== "string"
  ) {
    return null;
  }

  return {
    audience,
    created_at: value.created_at,
    expires_at: value.expires_at,
    id: value.id,
    project_engagement_id: value.project_engagement_id,
    revoked_at:
      typeof value.revoked_at === "string" || value.revoked_at === null
        ? value.revoked_at
        : null,
  };
}

export function engagementAccessSignedString(row: EngagementAccessTokenRow) {
  return [
    "engagement_access_token:v1",
    row.id,
    row.project_engagement_id,
    row.audience,
    new Date(row.expires_at).toISOString(),
  ].join("\n");
}

function signEngagementAccessToken(row: EngagementAccessTokenRow) {
  return createHmac("sha256", engagementAccessTokenSecret())
    .update(engagementAccessSignedString(row), "utf8")
    .digest("base64url");
}

function timingSafeSignatureEqual(actual: string, expected: string) {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);

  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

export function buildEngagementAccessBearerToken(
  row: EngagementAccessTokenRow,
) {
  return `${row.id}.${signEngagementAccessToken(row)}`;
}

export function parseEngagementAccessBearerToken(token: string | undefined) {
  const match = token?.trim().match(TOKEN_PATTERN);

  if (!match) {
    return null;
  }

  return {
    signature: match[2],
    tokenId: match[1],
  };
}

async function loadTokenRowById(
  supabase: Supabase,
  tokenId: string,
) {
  const { data, error } = await supabase
    .from("engagement_access_tokens")
    .select(TOKEN_SELECT)
    .eq("id", tokenId)
    .maybeSingle();

  if (error) {
    return null;
  }

  return asTokenRow(data);
}

async function loadTokenRowByEngagementAndAudience(
  supabase: Supabase,
  engagementId: string,
  audience: EngagementAccessAudience,
) {
  const { data, error } = await supabase
    .from("engagement_access_tokens")
    .select(TOKEN_SELECT)
    .eq("project_engagement_id", engagementId)
    .eq("audience", audience)
    .maybeSingle();

  if (error) {
    return null;
  }

  return asTokenRow(data);
}

export async function ensureEngagementAccessToken(
  engagementId: string,
  audience: EngagementAccessAudience,
  supabase: Supabase = createSupabaseAdminClient(),
) {
  assertEngagementAccessAudience(audience);

  const existingToken = await loadTokenRowByEngagementAndAudience(
    supabase,
    engagementId,
    audience,
  );

  if (existingToken) {
    return existingToken;
  }

  const insertedToken = await supabase
    .from("engagement_access_tokens")
    .insert({
      audience,
      expires_at: new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
      project_engagement_id: engagementId,
    })
    .select(TOKEN_SELECT)
    .single();

  if (!insertedToken.error) {
    return asTokenRow(insertedToken.data);
  }

  if (insertedToken.error.code === "23505") {
    return loadTokenRowByEngagementAndAudience(supabase, engagementId, audience);
  }

  return null;
}

export async function verifyEngagementAccessBearerToken(
  token: string | undefined,
  expectedAudience?: EngagementAccessAudience,
) {
  if (expectedAudience) {
    assertEngagementAccessAudience(expectedAudience);
  }

  const parsed = parseEngagementAccessBearerToken(token);

  if (!parsed) {
    return { ok: false as const, reason: "invalid" as const };
  }

  const supabase = createSupabaseAdminClient();
  const tokenRow = await loadTokenRowById(supabase, parsed.tokenId);

  if (!tokenRow) {
    return { ok: false as const, reason: "invalid" as const };
  }

  let expectedSignature: string;

  try {
    expectedSignature = signEngagementAccessToken(tokenRow);
  } catch {
    return { ok: false as const, reason: "invalid" as const };
  }

  if (!timingSafeSignatureEqual(parsed.signature, expectedSignature)) {
    return { ok: false as const, reason: "invalid" as const };
  }

  if (expectedAudience && tokenRow.audience !== expectedAudience) {
    return { ok: false as const, reason: "invalid" as const };
  }

  if (tokenRow.revoked_at !== null) {
    return { ok: false as const, reason: "invalid" as const };
  }

  if (new Date(tokenRow.expires_at).getTime() <= Date.now()) {
    return { ok: false as const, reason: "expired" as const };
  }

  return {
    ok: true as const,
    supabase,
    tokenId: tokenRow.id,
    tokenRow,
  };
}

function tokenIsCurrentlyUsable(row: EngagementAccessTokenRow) {
  return row.revoked_at === null && new Date(row.expires_at).getTime() > Date.now();
}

export async function buildEngagementProviderUrl(
  engagementId: string,
  supabase: Supabase = createSupabaseAdminClient(),
) {
  const tokenRow = await ensureEngagementAccessToken(
    engagementId,
    "provider",
    supabase,
  );

  if (!tokenRow || !tokenIsCurrentlyUsable(tokenRow)) {
    return null;
  }

  const url = new URL("/engagement/provider", getAppBaseUrl());

  url.searchParams.set("token", buildEngagementAccessBearerToken(tokenRow));

  return url.toString();
}

export async function buildEngagementStudentUrl(
  engagementId: string,
  supabase: Supabase = createSupabaseAdminClient(),
) {
  const tokenRow = await ensureEngagementAccessToken(
    engagementId,
    "student",
    supabase,
  );

  if (!tokenRow || !tokenIsCurrentlyUsable(tokenRow)) {
    return null;
  }

  const url = new URL("/engagement/status", getAppBaseUrl());

  url.searchParams.set("token", buildEngagementAccessBearerToken(tokenRow));

  return url.toString();
}

export async function buildExistingEngagementProviderUrl(
  engagementId: string,
  supabase: Supabase = createSupabaseAdminClient(),
) {
  const tokenRow = await loadTokenRowByEngagementAndAudience(
    supabase,
    engagementId,
    "provider",
  );

  if (!tokenRow || !tokenIsCurrentlyUsable(tokenRow)) {
    return null;
  }

  const url = new URL("/engagement/provider", getAppBaseUrl());

  url.searchParams.set("token", buildEngagementAccessBearerToken(tokenRow));

  return url.toString();
}

export async function buildExistingEngagementStudentUrl(
  engagementId: string,
  supabase: Supabase = createSupabaseAdminClient(),
) {
  const tokenRow = await loadTokenRowByEngagementAndAudience(
    supabase,
    engagementId,
    "student",
  );

  if (!tokenRow || !tokenIsCurrentlyUsable(tokenRow)) {
    return null;
  }

  const url = new URL("/engagement/status", getAppBaseUrl());

  url.searchParams.set("token", buildEngagementAccessBearerToken(tokenRow));

  return url.toString();
}

export async function loadProviderEngagementDelivery(token: string | undefined) {
  const verified = await verifyEngagementAccessBearerToken(token, "provider");

  if (!verified.ok) {
    return verified;
  }

  const { data: engagement, error: engagementError } = await verified.supabase
    .from("project_engagements")
    .select(
      "id, request_candidate_id, agreed_amount, currency, agreed_deadline, status, started_at, submitted_at, deliverable_url, deliverable_summary",
    )
    .eq("id", verified.tokenRow.project_engagement_id)
    .maybeSingle();

  if (engagementError || !engagement) {
    return { ok: false as const, reason: "invalid" as const };
  }

  const { data: candidate, error: candidateError } = await verified.supabase
    .from("request_candidates")
    .select("id, project_request_id, provider_application_id, scope_summary")
    .eq("id", engagement.request_candidate_id)
    .maybeSingle();

  if (candidateError || !candidate?.provider_application_id) {
    return { ok: false as const, reason: "invalid" as const };
  }

  const [
    { data: request, error: requestError },
    { data: provider, error: providerError },
  ] = await Promise.all([
    verified.supabase
      .from("project_requests")
      .select("id, category")
      .eq("id", candidate.project_request_id)
      .maybeSingle(),
    verified.supabase
      .from("provider_applications")
      .select("id, status")
      .eq("id", candidate.provider_application_id)
      .maybeSingle(),
  ]);

  if (requestError || providerError || !request || !provider) {
    return { ok: false as const, reason: "invalid" as const };
  }

  return {
    candidate,
    engagement,
    ok: true as const,
    provider,
    request,
    tokenId: verified.tokenId,
  };
}

export async function loadStudentEngagementStatus(token: string | undefined) {
  const verified = await verifyEngagementAccessBearerToken(token, "student");

  if (!verified.ok) {
    return verified;
  }

  const { data: engagement, error: engagementError } = await verified.supabase
    .from("project_engagements")
    .select(
      "id, request_candidate_id, agreed_amount, currency, agreed_deadline, status, submitted_at, completed_at, deliverable_url, deliverable_summary, dispute_notes",
    )
    .eq("id", verified.tokenRow.project_engagement_id)
    .maybeSingle();

  if (engagementError || !engagement) {
    return { ok: false as const, reason: "invalid" as const };
  }

  const { data: candidate, error: candidateError } = await verified.supabase
    .from("request_candidates")
    .select("id, project_request_id, provider_application_id")
    .eq("id", engagement.request_candidate_id)
    .maybeSingle();

  if (candidateError || !candidate?.provider_application_id) {
    return { ok: false as const, reason: "invalid" as const };
  }

  const [
    { data: feedback, error: feedbackError },
    { data: request, error: requestError },
    { data: provider, error: providerError },
  ] = await Promise.all([
    verified.supabase
      .from("engagement_feedback")
      .select("id, project_engagement_id, rating, feedback_text, created_at")
      .eq("project_engagement_id", engagement.id)
      .maybeSingle(),
    verified.supabase
      .from("project_requests")
      .select("id, category")
      .eq("id", candidate.project_request_id)
      .maybeSingle(),
    verified.supabase
      .from("provider_applications")
      .select("id, applicant_name")
      .eq("id", candidate.provider_application_id)
      .maybeSingle(),
  ]);

  if (feedbackError || requestError || providerError || !request || !provider) {
    return { ok: false as const, reason: "invalid" as const };
  }

  return {
    candidate,
    engagement,
    feedback,
    ok: true as const,
    provider,
    request,
    tokenId: verified.tokenId,
  };
}
