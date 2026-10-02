import type { RateLimitInput } from "@/lib/security/rate-limit";
import type { UserRole } from "./user-shared";

export const AUTH_CONFIRMATION_CALLBACK_PATH = "/auth/callback";
export const AUTH_CONFIRMATION_ERROR_PATH = "/auth/confirm-error";
export const DEFAULT_AUTH_CONFIRMATION_NEXT = "/app";
export const RESEND_CONFIRMATION_RATE_LIMIT = {
  action: "account_resend_confirmation_ip",
  limit: 3,
  windowSeconds: 900,
} as const;

const LOCALHOST_HOSTS = new Set(["127.0.0.1", "localhost"]);
const LOCAL_ORIGIN = "https://projectmatch.local";

type AppOriginEnv = {
  APP_BASE_URL?: string;
  NEXT_PUBLIC_APP_URL?: string;
  NEXT_PUBLIC_SITE_URL?: string;
  VERCEL_BRANCH_URL?: string;
  VERCEL_ENV?: string;
  VERCEL_PROJECT_PRODUCTION_URL?: string;
  VERCEL_URL?: string;
  [key: string]: string | undefined;
};

function withHttpsScheme(value: string) {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function normalizeAppOrigin(rawValue: string | undefined) {
  const value = rawValue?.trim();

  if (!value) {
    return null;
  }

  const parsed = new URL(withHttpsScheme(value));

  if (
    parsed.protocol !== "https:" &&
    !(parsed.protocol === "http:" && LOCALHOST_HOSTS.has(parsed.hostname))
  ) {
    throw new Error("Application URL must use HTTPS outside local development.");
  }

  return parsed.origin;
}

export function getConfiguredAppOrigin(env: AppOriginEnv = process.env) {
  const configured =
    normalizeAppOrigin(env.APP_BASE_URL) ??
    normalizeAppOrigin(env.NEXT_PUBLIC_APP_URL) ??
    normalizeAppOrigin(env.NEXT_PUBLIC_SITE_URL) ??
    normalizeAppOrigin(env.VERCEL_PROJECT_PRODUCTION_URL) ??
    normalizeAppOrigin(env.VERCEL_BRANCH_URL) ??
    normalizeAppOrigin(env.VERCEL_URL);

  if (configured) {
    return configured;
  }

  if (env.VERCEL_ENV === "production") {
    throw new Error("Missing required configured application URL.");
  }

  return "http://localhost:3000";
}

export function getSafeAuthCallbackNext(rawNext: string | null | undefined) {
  if (!rawNext) {
    return DEFAULT_AUTH_CONFIRMATION_NEXT;
  }

  try {
    const parsed = new URL(rawNext, LOCAL_ORIGIN);

    if (parsed.origin !== LOCAL_ORIGIN) {
      return DEFAULT_AUTH_CONFIRMATION_NEXT;
    }

    if (
      parsed.pathname === "/login" ||
      parsed.pathname.startsWith("/admin") ||
      !parsed.pathname.startsWith("/app")
    ) {
      return DEFAULT_AUTH_CONFIRMATION_NEXT;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return DEFAULT_AUTH_CONFIRMATION_NEXT;
  }
}

export function buildEmailConfirmationRedirect({
  appOrigin,
  next = DEFAULT_AUTH_CONFIRMATION_NEXT,
}: {
  appOrigin: string;
  next?: string | null;
}) {
  const redirectUrl = new URL(AUTH_CONFIRMATION_CALLBACK_PATH, appOrigin);

  redirectUrl.searchParams.set("next", getSafeAuthCallbackNext(next));

  return redirectUrl.toString();
}

export function getPostConfirmationRedirectForRole({
  next,
  role,
}: {
  next: string | null | undefined;
  role: UserRole;
}) {
  if (role === "admin") {
    return "/admin";
  }

  return getSafeAuthCallbackNext(next);
}

export function buildResendConfirmationRateLimitInput({
  clientIp,
  email,
}: {
  clientIp: string;
  email: string;
}): RateLimitInput {
  return {
    action: RESEND_CONFIRMATION_RATE_LIMIT.action,
    identifier: `${clientIp}:${email.trim().toLowerCase()}`,
    limit: RESEND_CONFIRMATION_RATE_LIMIT.limit,
    windowSeconds: RESEND_CONFIRMATION_RATE_LIMIT.windowSeconds,
  };
}
