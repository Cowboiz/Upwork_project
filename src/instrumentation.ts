import type { Instrumentation } from "next";
import { logRequestError } from "@/lib/observability/server-log";

export const onRequestError: Instrumentation.onRequestError = (
  error,
  request,
  context,
) => {
  logRequestError(error, request, context);
};
