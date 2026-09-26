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
  try {
    console.error(
      JSON.stringify(buildRequestErrorLogEntry(error, request, context)),
    );
  } catch {
    console.error(
      '{"level":"error","event":"next_request_error","message":"Unhandled request error"}',
    );
  }
}
