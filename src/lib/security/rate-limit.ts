import "server-only";

import { createHmac } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const MAX_ACTION_LENGTH = 100;
const MAX_IDENTIFIER_LENGTH = 2048;
const MAX_LIMIT = 10000;
const MAX_WINDOW_SECONDS = 86400;

export type RateLimitInput = {
  action: string;
  identifier: string;
  limit: number;
  windowSeconds: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export class RateLimitConfigurationError extends Error {
  readonly code = "rate_limit_configuration_error";

  constructor(message: string) {
    super(message);
    this.name = "RateLimitConfigurationError";
  }
}

export class RateLimitCheckError extends Error {
  readonly code = "rate_limit_check_failed";

  constructor() {
    super("Rate limit check failed");
    this.name = "RateLimitCheckError";
  }
}

function requireRateLimitHashSecret() {
  const value = process.env.RATE_LIMIT_HASH_SECRET?.trim();

  if (!value) {
    throw new RateLimitConfigurationError(
      "Missing required environment variable: RATE_LIMIT_HASH_SECRET",
    );
  }

  return value;
}

function normalizeNonEmpty(value: string, label: string, maxLength: number) {
  const normalized = value.trim();

  if (!normalized) {
    throw new RateLimitConfigurationError(`Missing rate limit ${label}`);
  }

  if (normalized.length > maxLength) {
    throw new RateLimitConfigurationError(`Invalid rate limit ${label}`);
  }

  return normalized;
}

function validateIntegerRange({
  label,
  max,
  min,
  value,
}: {
  label: string;
  max: number;
  min: number;
  value: number;
}) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new RateLimitConfigurationError(`Invalid rate limit ${label}`);
  }
}

function hashRateLimitIdentifier({
  action,
  identifier,
}: {
  action: string;
  identifier: string;
}) {
  const secret = requireRateLimitHashSecret();
  const canonical = ["rate_limit:v1", action, identifier].join("\n");

  return createHmac("sha256", secret).update(canonical).digest("hex");
}

export async function checkRateLimit({
  action,
  identifier,
  limit,
  windowSeconds,
}: RateLimitInput): Promise<RateLimitResult> {
  const normalizedAction = normalizeNonEmpty(
    action,
    "action",
    MAX_ACTION_LENGTH,
  );
  const normalizedIdentifier = normalizeNonEmpty(
    identifier,
    "identifier",
    MAX_IDENTIFIER_LENGTH,
  );

  validateIntegerRange({
    label: "limit",
    max: MAX_LIMIT,
    min: 1,
    value: limit,
  });
  validateIntegerRange({
    label: "window",
    max: MAX_WINDOW_SECONDS,
    min: 1,
    value: windowSeconds,
  });

  const keyHash = hashRateLimitIdentifier({
    action: normalizedAction,
    identifier: normalizedIdentifier,
  });

  const { data, error } = await createSupabaseAdminClient().rpc(
    "check_rate_limit",
    {
      p_action: normalizedAction,
      p_key_hash: keyHash,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    },
  );

  if (error) {
    throw new RateLimitCheckError();
  }

  const result = data?.[0];

  if (!result) {
    throw new RateLimitCheckError();
  }

  return {
    allowed: result.allowed,
    remaining: result.remaining,
    retryAfterSeconds: result.retry_after_seconds,
  };
}
