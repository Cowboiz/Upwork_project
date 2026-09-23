import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type Supabase = SupabaseClient<Database>;
type TokenRow = Pick<
  Database["public"]["Tables"]["provider_response_tokens"]["Row"],
  "expires_at" | "id" | "request_candidate_id"
>;

const TOKEN_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const TOKEN_PATTERN =
  /^([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.([A-Za-z0-9_-]+)$/i;

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

function providerResponseTokenSecret() {
  return requireEnv("PROVIDER_RESPONSE_TOKEN_SECRET");
}

export function providerResponseSignedString(row: TokenRow) {
  return [
    "provider_response_token:v1",
    row.id,
    row.request_candidate_id,
    new Date(row.expires_at).toISOString(),
  ].join("\n");
}

function signProviderResponseToken(row: TokenRow) {
  return createHmac("sha256", providerResponseTokenSecret())
    .update(providerResponseSignedString(row), "utf8")
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

export function buildProviderResponseBearerToken(row: TokenRow) {
  return `${row.id}.${signProviderResponseToken(row)}`;
}

export function parseProviderResponseBearerToken(token: string | undefined) {
  const match = token?.trim().match(TOKEN_PATTERN);

  if (!match) {
    return null;
  }

  return {
    signature: match[2],
    tokenId: match[1],
  };
}

async function loadTokenRow(supabase: Supabase, tokenId: string) {
  const { data, error } = await supabase
    .from("provider_response_tokens")
    .select("id, request_candidate_id, expires_at")
    .eq("id", tokenId)
    .maybeSingle();

  if (error) {
    return null;
  }

  return data satisfies TokenRow | null;
}

export async function ensureProviderResponseToken(
  supabase: Supabase,
  requestCandidateId: string,
) {
  const existingToken = await supabase
    .from("provider_response_tokens")
    .select("id, request_candidate_id, expires_at")
    .eq("request_candidate_id", requestCandidateId)
    .maybeSingle();

  if (existingToken.data) {
    return existingToken.data satisfies TokenRow;
  }

  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();
  const insertedToken = await supabase
    .from("provider_response_tokens")
    .insert({
      expires_at: expiresAt,
      request_candidate_id: requestCandidateId,
    })
    .select("id, request_candidate_id, expires_at")
    .single();

  if (!insertedToken.error) {
    return insertedToken.data satisfies TokenRow;
  }

  if (insertedToken.error.code === "23505") {
    return loadTokenRowByCandidate(supabase, requestCandidateId);
  }

  return null;
}

async function loadTokenRowByCandidate(
  supabase: Supabase,
  requestCandidateId: string,
) {
  const { data, error } = await supabase
    .from("provider_response_tokens")
    .select("id, request_candidate_id, expires_at")
    .eq("request_candidate_id", requestCandidateId)
    .maybeSingle();

  if (error) {
    return null;
  }

  return data satisfies TokenRow | null;
}

export async function buildProviderResponseUrl(
  supabase: Supabase,
  requestCandidateId: string,
) {
  const tokenRow = await ensureProviderResponseToken(supabase, requestCandidateId);

  if (!tokenRow) {
    return null;
  }

  const url = new URL("/provider/respond", getAppBaseUrl());

  url.searchParams.set("token", buildProviderResponseBearerToken(tokenRow));

  return url.toString();
}

export async function verifyProviderResponseBearerToken(
  token: string | undefined,
) {
  const parsed = parseProviderResponseBearerToken(token);

  if (!parsed) {
    return { ok: false as const, reason: "invalid" as const };
  }

  const supabase = createSupabaseAdminClient();
  const tokenRow = await loadTokenRow(supabase, parsed.tokenId);

  if (!tokenRow) {
    return { ok: false as const, reason: "invalid" as const };
  }

  const expectedSignature = signProviderResponseToken(tokenRow);

  if (!timingSafeSignatureEqual(parsed.signature, expectedSignature)) {
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

export async function loadProviderResponseInvitation(token: string | undefined) {
  const verified = await verifyProviderResponseBearerToken(token);

  if (!verified.ok) {
    return verified;
  }

  const { data: candidate, error: candidateError } = await verified.supabase
    .from("request_candidates")
    .select(
      "id, project_request_id, provider_application_id, candidate_rank, provider_response_status, student_decision_status, scope_summary, proposed_price, currency",
    )
    .eq("id", verified.tokenRow.request_candidate_id)
    .maybeSingle();

  if (candidateError || !candidate?.provider_application_id) {
    return { ok: false as const, reason: "invalid" as const };
  }

  const [
    { data: request, error: requestError },
    { data: provider, error: providerError },
    { count: engagementCount, error: engagementError },
  ] = await Promise.all([
    verified.supabase
      .from("project_requests")
      .select(
        "id, budget_range, category, currency, deadline, deadline_flexible, integrity_review_status, status",
      )
      .eq("id", candidate.project_request_id)
      .maybeSingle(),
    verified.supabase
      .from("provider_applications")
      .select("id, status")
      .eq("id", candidate.provider_application_id)
      .maybeSingle(),
    verified.supabase
      .from("project_engagements")
      .select("id", { count: "exact", head: true })
      .eq("request_candidate_id", candidate.id),
  ]);

  if (
    requestError ||
    providerError ||
    engagementError ||
    !request ||
    !provider
  ) {
    return { ok: false as const, reason: "invalid" as const };
  }

  const canRespond =
    candidate.provider_response_status === "pending" &&
    candidate.student_decision_status === "not_presented" &&
    candidate.candidate_rank === null &&
    provider.status === "approved" &&
    request.status === "reviewed" &&
    request.integrity_review_status === "clear" &&
    (engagementCount ?? 0) === 0;

  return {
    canRespond,
    candidate,
    ok: true as const,
    request,
    responseRecorded:
      candidate.provider_response_status === "interested" ||
      candidate.provider_response_status === "declined",
    tokenId: verified.tokenId,
  };
}
