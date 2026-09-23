import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type Supabase = SupabaseClient<Database>;
type TokenRow = Pick<
  Database["public"]["Tables"]["student_decision_tokens"]["Row"],
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

function studentDecisionTokenSecret() {
  return requireEnv("STUDENT_DECISION_TOKEN_SECRET");
}

export function studentDecisionSignedString(row: TokenRow) {
  return [
    "student_decision_token:v1",
    row.id,
    row.request_candidate_id,
    new Date(row.expires_at).toISOString(),
  ].join("\n");
}

function signStudentDecisionToken(row: TokenRow) {
  return createHmac("sha256", studentDecisionTokenSecret())
    .update(studentDecisionSignedString(row), "utf8")
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

export function buildStudentDecisionBearerToken(row: TokenRow) {
  return `${row.id}.${signStudentDecisionToken(row)}`;
}

export function parseStudentDecisionBearerToken(token: string | undefined) {
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
    .from("student_decision_tokens")
    .select("id, request_candidate_id, expires_at")
    .eq("id", tokenId)
    .maybeSingle();

  if (error) {
    return null;
  }

  return data satisfies TokenRow | null;
}

async function loadTokenRowByCandidate(
  supabase: Supabase,
  requestCandidateId: string,
) {
  const { data, error } = await supabase
    .from("student_decision_tokens")
    .select("id, request_candidate_id, expires_at")
    .eq("request_candidate_id", requestCandidateId)
    .maybeSingle();

  if (error) {
    return null;
  }

  return data satisfies TokenRow | null;
}

export async function ensureStudentDecisionToken(
  supabase: Supabase,
  requestCandidateId: string,
) {
  const existingToken = await loadTokenRowByCandidate(supabase, requestCandidateId);

  if (existingToken) {
    return existingToken;
  }

  const insertedToken = await supabase
    .from("student_decision_tokens")
    .insert({
      expires_at: new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
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

export async function buildStudentDecisionUrl(
  supabase: Supabase,
  requestCandidateId: string,
) {
  const tokenRow = await ensureStudentDecisionToken(supabase, requestCandidateId);

  if (!tokenRow) {
    return null;
  }

  const url = new URL("/request/status", getAppBaseUrl());

  url.searchParams.set("token", buildStudentDecisionBearerToken(tokenRow));

  return url.toString();
}

export async function buildExistingStudentDecisionUrl(
  supabase: Supabase,
  requestCandidateId: string,
) {
  const tokenRow = await loadTokenRowByCandidate(supabase, requestCandidateId);

  if (!tokenRow || new Date(tokenRow.expires_at).getTime() <= Date.now()) {
    return null;
  }

  const url = new URL("/request/status", getAppBaseUrl());

  url.searchParams.set("token", buildStudentDecisionBearerToken(tokenRow));

  return url.toString();
}

export async function verifyStudentDecisionBearerToken(
  token: string | undefined,
) {
  const parsed = parseStudentDecisionBearerToken(token);

  if (!parsed) {
    return { ok: false as const, reason: "invalid" as const };
  }

  const supabase = createSupabaseAdminClient();
  const tokenRow = await loadTokenRow(supabase, parsed.tokenId);

  if (!tokenRow) {
    return { ok: false as const, reason: "invalid" as const };
  }

  let expectedSignature: string;

  try {
    expectedSignature = signStudentDecisionToken(tokenRow);
  } catch {
    return { ok: false as const, reason: "invalid" as const };
  }

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

export async function loadStudentDecisionInvitation(token: string | undefined) {
  const verified = await verifyStudentDecisionBearerToken(token);

  if (!verified.ok) {
    return verified;
  }

  const { data: candidate, error: candidateError } = await verified.supabase
    .from("request_candidates")
    .select(
      "id, project_request_id, provider_application_id, candidate_rank, provider_response_status, student_decision_status, scope_summary, proposed_price, currency, decline_reason, declined_by",
    )
    .eq("id", verified.tokenRow.request_candidate_id)
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
      .select(
        "id, budget_range, category, currency, deadline, deadline_flexible, integrity_review_status, status",
      )
      .eq("id", candidate.project_request_id)
      .maybeSingle(),
    verified.supabase
      .from("provider_applications")
      .select("id, applicant_name, availability, rate_expectations, skills, status")
      .eq("id", candidate.provider_application_id)
      .maybeSingle(),
  ]);

  if (requestError || providerError || !request || !provider) {
    return { ok: false as const, reason: "invalid" as const };
  }

  const canDecide =
    candidate.student_decision_status === "presented" &&
    candidate.candidate_rank !== null &&
    candidate.provider_response_status === "interested" &&
    provider.status === "approved" &&
    request.status === "reviewed" &&
    request.integrity_review_status === "clear";

  return {
    canDecide,
    candidate,
    decisionRecorded:
      candidate.student_decision_status === "accepted" ||
      candidate.student_decision_status === "declined",
    ok: true as const,
    provider,
    request,
    tokenId: verified.tokenId,
  };
}
