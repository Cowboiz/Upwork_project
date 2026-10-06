"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/user";

const providerResponseSchema = z.object({
  applicationId: z.uuid(),
  declineReason: z.string().max(1000).optional(),
  requestCandidateId: z.uuid(),
  response: z.enum(["interested", "declined"]),
});

function providerResponseMessage(message: string | undefined) {
  switch (message) {
    case "response_invalid":
      return "Choose a valid response.";
    case "response_closed":
      return "This response is no longer editable.";
    case "candidate_already_presented":
      return "This candidate has already moved forward in the matching workflow.";
    case "provider_not_approved":
      return "Your provider application is not currently approved for this match.";
    case "request_not_eligible":
      return "This request is no longer eligible for a provider response.";
    case "engagement_exists":
      return "An engagement already exists for this match.";
    default:
      return "We could not save your response.";
  }
}

function redirectToApplication(
  applicationId: string,
  params: URLSearchParams,
): never {
  redirect(`/app/provider/${applicationId}?${params.toString()}`);
}

export async function respondToMyRequestCandidate(formData: FormData) {
  const parsed = providerResponseSchema.safeParse({
    applicationId: formData.get("applicationId"),
    declineReason: formData.get("declineReason") || undefined,
    requestCandidateId: formData.get("requestCandidateId"),
    response: formData.get("response"),
  });

  if (!parsed.success) {
    redirectToApplication(
      String(formData.get("applicationId") ?? ""),
      new URLSearchParams({ error: "Check the response and try again." }),
    );
  }

  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("respond_to_my_request_candidate", {
    p_decline_reason: parsed.data.declineReason ?? null,
    p_request_candidate_id: parsed.data.requestCandidateId,
    p_response: parsed.data.response,
  });

  if (error) {
    redirectToApplication(
      parsed.data.applicationId,
      new URLSearchParams({ error: providerResponseMessage(error.message) }),
    );
  }

  revalidatePath(`/app/provider/${parsed.data.applicationId}`);
  revalidatePath("/app/provider");
  revalidatePath("/app");

  redirectToApplication(
    parsed.data.applicationId,
    new URLSearchParams({ saved: "provider_response" }),
  );
}
