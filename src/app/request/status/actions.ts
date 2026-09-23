"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { verifyStudentDecisionBearerToken } from "@/lib/student-decision/tokens";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const decisionSchema = z.object({
  decision: z.enum(["accepted", "declined"], {
    message: "Choose a supported decision.",
  }),
  decline_reason: z
    .string()
    .trim()
    .max(1000, "Use 1000 characters or fewer for the decline reason.")
    .transform((value) => (value.length > 0 ? value : null)),
  token: z.string().trim().min(1, "Missing decision token."),
});

function formDataObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

function redirectToStatusPage(token: string, params: Record<string, string>): never {
  const searchParams = new URLSearchParams({ token, ...params });

  redirect(`/request/status?${searchParams.toString()}`);
}

function friendlyDecisionError(message: string) {
  if (message.includes("token_expired")) {
    return "expired";
  }

  if (
    message.includes("candidate_not_presented") ||
    message.includes("candidate_not_interested") ||
    message.includes("provider_not_approved") ||
    message.includes("request_not_eligible") ||
    message.includes("candidate_already_accepted")
  ) {
    return "closed";
  }

  if (message.includes("decision_final")) {
    return "final";
  }

  return "invalid";
}

export async function submitStudentDecision(formData: FormData) {
  const parsed = decisionSchema.safeParse(formDataObject(formData));

  if (!parsed.success) {
    redirect("/request/status?error=invalid");
  }

  const verified = await verifyStudentDecisionBearerToken(parsed.data.token);

  if (!verified.ok) {
    redirectToStatusPage(parsed.data.token, { error: verified.reason });
  }

  const { error } = await createSupabaseAdminClient().rpc(
    "respond_to_presented_candidate",
    {
      p_decision: parsed.data.decision,
      p_decline_reason: parsed.data.decline_reason ?? undefined,
      p_token_id: verified.tokenId,
    },
  );

  if (error) {
    redirectToStatusPage(parsed.data.token, {
      error: friendlyDecisionError(error.message),
    });
  }

  redirectToStatusPage(parsed.data.token, {
    submitted: parsed.data.decision,
  });
}
