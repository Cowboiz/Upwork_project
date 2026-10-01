import type { Instrumentation } from "next";

type RequestError = Parameters<Instrumentation.onRequestError>[0];
type ErrorRequest = Parameters<Instrumentation.onRequestError>[1];
type ErrorContext = Parameters<Instrumentation.onRequestError>[2];

type RequestErrorLogEntry = {
  level: "error";
  event: "next_request_error";
  message: string;
  digest?: string;
  method: string;
  routePath: string;
  routeType: ErrorContext["routeType"];
  routerKind: ErrorContext["routerKind"];
};

export type RateLimitAction =
  | "admin_login_ip"
  | "account_register_ip"
  | "project_request_submit_contact"
  | "project_request_submit_ip"
  | "provider_application_submit_contact"
  | "provider_application_submit_ip"
  | "user_login_ip";

export type IntakeKind = "project_request" | "provider_application";
export type IntakeOperationStage = "idempotency_lookup" | "insert" | "rate_limit";

export type EmailTemplateKey =
  | "engagement_completed_provider"
  | "engagement_created_provider"
  | "engagement_disputed_admin"
  | "engagement_submitted_student"
  | "provider_application_submitted_admin_alert"
  | "provider_application_submitted_provider_confirmation"
  | "provider_contacted_provider"
  | "request_submitted_admin_alert"
  | "request_submitted_student_confirmation"
  | "shortlist_presented_student"
  | "unknown";

export type EmailRecipientRole = "admin" | "provider" | "student" | "unknown";
export type EmailDeliveryPhase = "initial" | "retry";

export type EmailPipelineNotification =
  | "engagement_completed_provider"
  | "engagement_created_provider"
  | "engagement_disputed_admin"
  | "engagement_submitted_student"
  | "provider_application_submitted"
  | "provider_contacted"
  | "project_request_submitted"
  | "shortlist_presented";

function writeStructuredLog(
  level: "error" | "warn",
  entry: Record<string, unknown>,
  fallback: string,
) {
  try {
    console[level](JSON.stringify(entry));
  } catch {
    console[level](fallback);
  }
}

function errorDigest(error: RequestError) {
  if (
    error !== null &&
    typeof error === "object" &&
    "digest" in error &&
    typeof error.digest === "string"
  ) {
    return error.digest;
  }

  return undefined;
}

export function buildRequestErrorLogEntry(
  error: RequestError,
  request: ErrorRequest,
  context: ErrorContext,
): RequestErrorLogEntry {
  return {
    level: "error",
    event: "next_request_error",
    message: "Unhandled request error",
    digest: errorDigest(error),
    method: request.method,
    routePath: context.routePath,
    routeType: context.routeType,
    routerKind: context.routerKind,
  };
}

export function logRequestError(
  error: RequestError,
  request: ErrorRequest,
  context: ErrorContext,
) {
  writeStructuredLog(
    "error",
    buildRequestErrorLogEntry(error, request, context),
    '{"level":"error","event":"next_request_error","message":"Unhandled request error"}',
  );
}

export function logDependencyReadinessFailed(dependency: "supabase") {
  writeStructuredLog(
    "error",
    {
      level: "error",
      event: "dependency_readiness_failed",
      dependency,
    },
    '{"level":"error","event":"dependency_readiness_failed","dependency":"supabase"}',
  );
}

export function logRateLimitBlocked({
  action,
  retryAfterSeconds,
}: {
  action: RateLimitAction;
  retryAfterSeconds: number;
}) {
  writeStructuredLog(
    "warn",
    {
      level: "warn",
      event: "rate_limit_blocked",
      action,
      retryAfterSeconds,
    },
    `{"level":"warn","event":"rate_limit_blocked","action":"${action}"}`,
  );
}

export function logRateLimitCheckFailed(action: RateLimitAction) {
  writeStructuredLog(
    "error",
    {
      level: "error",
      event: "rate_limit_check_failed",
      action,
    },
    `{"level":"error","event":"rate_limit_check_failed","action":"${action}"}`,
  );
}

export function logIntakeOperationFailed({
  intake,
  stage,
}: {
  intake: IntakeKind;
  stage: IntakeOperationStage;
}) {
  writeStructuredLog(
    "error",
    {
      level: "error",
      event: "intake_operation_failed",
      intake,
      stage,
    },
    `{"level":"error","event":"intake_operation_failed","intake":"${intake}","stage":"${stage}"}`,
  );
}

export function logEmailDeliveryFailed({
  attemptCount,
  phase,
  recipientRole,
  templateKey,
}: {
  attemptCount?: number;
  phase: EmailDeliveryPhase;
  recipientRole: EmailRecipientRole;
  templateKey: EmailTemplateKey;
}) {
  writeStructuredLog(
    "error",
    {
      level: "error",
      event: "email_delivery_failed",
      templateKey,
      recipientRole,
      phase,
      ...(attemptCount === undefined ? {} : { attemptCount }),
    },
    `{"level":"error","event":"email_delivery_failed","templateKey":"${templateKey}","recipientRole":"${recipientRole}","phase":"${phase}"}`,
  );
}

export function logEmailPipelineFailed(
  notification: EmailPipelineNotification,
) {
  writeStructuredLog(
    "error",
    {
      level: "error",
      event: "email_pipeline_failed",
      notification,
    },
    `{"level":"error","event":"email_pipeline_failed","notification":"${notification}"}`,
  );
}
