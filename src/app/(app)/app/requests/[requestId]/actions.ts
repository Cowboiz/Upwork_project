"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/user";

const studentDecisionSchema = z.object({
  decision: z.enum(["accepted", "declined"]),
  declineReason: z.string().max(1000).optional(),
  requestCandidateId: z.uuid(),
  requestId: z.uuid(),
});

function studentDecisionMessage(message: string | undefined) {
  switch (message) {
    case "decision_invalid":
      return "Choose a valid decision.";
    case "decision_final":
      return "This candidate already has a final decision.";
    case "candidate_not_presented":
      return "This candidate has not been presented for a decision.";
    case "candidate_not_interested":
      return "Only interested candidates can receive a decision.";
    case "provider_not_approved":
      return "The provider is no longer approved for this match.";
    case "request_not_eligible":
      return "This request is no longer eligible for matching.";
    case "candidate_not_ranked":
    case "candidate_rank_invalid":
      return "This candidate is not on the active shortlist.";
    case "candidate_already_accepted":
      return "This request already has an accepted candidate.";
    default:
      return "We could not save your decision.";
  }
}

function redirectToRequest(requestId: string, params: URLSearchParams): never {
  redirect(`/app/requests/${requestId}?${params.toString()}`);
}

export async function decideOnMyPresentedCandidate(formData: FormData) {
  const parsed = studentDecisionSchema.safeParse({
    decision: formData.get("decision"),
    declineReason: formData.get("declineReason") || undefined,
    requestCandidateId: formData.get("requestCandidateId"),
    requestId: formData.get("requestId"),
  });

  if (!parsed.success) {
    redirectToRequest(
      String(formData.get("requestId") ?? ""),
      new URLSearchParams({ error: "Check the decision and try again." }),
    );
  }

  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("decide_on_my_presented_candidate", {
    p_decision: parsed.data.decision,
    p_decline_reason: parsed.data.declineReason ?? null,
    p_request_candidate_id: parsed.data.requestCandidateId,
  });

  if (error) {
    redirectToRequest(
      parsed.data.requestId,
      new URLSearchParams({ error: studentDecisionMessage(error.message) }),
    );
  }

  revalidatePath(`/app/requests/${parsed.data.requestId}`);
  revalidatePath("/app/requests");
  revalidatePath("/app/engagements");
  revalidatePath("/app");

  redirectToRequest(
    parsed.data.requestId,
    new URLSearchParams({ saved: "student_decision" }),
  );
}
