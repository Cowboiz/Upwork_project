"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { verifyProviderResponseBearerToken } from "@/lib/provider-response/tokens";

const responseSchema = z.object({
  decline_reason: z
    .string()
    .trim()
    .max(1000, "Use 1000 characters or fewer for the decline reason.")
    .transform((value) => (value.length > 0 ? value : null)),
  response: z.enum(["interested", "declined"], {
    message: "Choose a supported response.",
  }),
  token: z.string().trim().min(1, "Missing response token."),
});

function formDataObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

function redirectToResponsePage(token: string, params: Record<string, string>): never {
  const searchParams = new URLSearchParams({ token, ...params });

  redirect(`/provider/respond?${searchParams.toString()}`);
}

function friendlyResponseError(message: string) {
  if (message.includes("token_expired")) {
    return "expired";
  }

  if (
    message.includes("response_closed") ||
    message.includes("candidate_already_presented") ||
    message.includes("provider_not_approved") ||
    message.includes("request_not_eligible") ||
    message.includes("engagement_exists")
  ) {
    return "closed";
  }

  return "invalid";
}

export async function submitProviderInvitationResponse(formData: FormData) {
  const parsed = responseSchema.safeParse(formDataObject(formData));

  if (!parsed.success) {
    redirect("/provider/respond?error=invalid");
  }

  const verified = await verifyProviderResponseBearerToken(parsed.data.token);

  if (!verified.ok) {
    redirectToResponsePage(parsed.data.token, { error: verified.reason });
  }

  const { error } = await createSupabaseAdminClient().rpc(
    "respond_to_request_candidate_invitation",
    {
      p_decline_reason: parsed.data.decline_reason ?? undefined,
      p_response: parsed.data.response,
      p_token_id: verified.tokenId,
    },
  );

  if (error) {
    redirectToResponsePage(parsed.data.token, {
      error: friendlyResponseError(error.message),
    });
  }

  redirectToResponsePage(parsed.data.token, {
    submitted: parsed.data.response,
  });
}
