"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";

type AcceptCandidateRpcClient = {
  rpc(
    functionName: "accept_request_candidate",
    args: {
      p_candidate_id: string;
      p_request_id: string;
    },
  ): Promise<{
    error: {
      message: string;
    } | null;
  }>;
};

const requestIdSchema = z.object({
  request_id: z.uuid("Invalid request id."),
});

const candidateIdSchema = requestIdSchema.extend({
  candidate_id: z.uuid("Invalid candidate id."),
});

const addCandidateSchema = requestIdSchema.extend({
  provider_application_id: z.uuid("Choose an approved provider."),
});

const providerResponseSchema = candidateIdSchema.extend({
  provider_response_status: z.enum(
    ["pending", "interested", "declined", "no_response", "withdrawn"],
    {
      message: "Choose a supported provider response.",
    },
  ),
  decline_reason: z
    .string()
    .trim()
    .max(1000, "Use 1000 characters or fewer for the decline reason.")
    .transform((value) => (value.length > 0 ? value : null)),
});

const presentCandidateSchema = candidateIdSchema.extend({
  candidate_rank: z.coerce
    .number({ message: "Choose a shortlist rank." })
    .int("Choose a whole-number rank.")
    .min(1, "Choose rank 1, 2, or 3.")
    .max(3, "Choose rank 1, 2, or 3."),
});

const studentDecisionSchema = candidateIdSchema.extend({
  student_decision_status: z.enum(["accepted", "declined"], {
    message: "Choose a supported student decision.",
  }),
  decline_reason: z
    .string()
    .trim()
    .max(1000, "Use 1000 characters or fewer for the decline reason.")
    .transform((value) => (value.length > 0 ? value : null)),
});

const optionalPriceSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();

    return trimmed.length > 0 ? trimmed : null;
  },
  z.coerce
    .number({ message: "Enter a valid price." })
    .nonnegative("Price cannot be negative.")
    .nullable(),
);

const candidateDetailsSchema = candidateIdSchema.extend({
  scope_summary: z
    .string()
    .trim()
    .max(3000, "Use 3000 characters or fewer for the scope summary.")
    .transform((value) => (value.length > 0 ? value : null)),
  proposed_price: optionalPriceSchema,
  agreed_price: optionalPriceSchema,
  agreed_deadline: z
    .string()
    .trim()
    .transform((value) => (value.length > 0 ? value : null))
    .pipe(z.iso.date("Enter a valid agreed deadline.").nullable()),
  internal_notes: z
    .string()
    .trim()
    .max(5000, "Use 5000 characters or fewer for internal notes.")
    .transform((value) => (value.length > 0 ? value : null)),
});

function formDataObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

function agreementTermsAnchor(candidateId: string) {
  return `candidate-commercial-${candidateId}`;
}

function redirectToRequest(
  requestId: string,
  params?: URLSearchParams,
  hash?: string,
): never {
  const suffix = params ? `?${params.toString()}` : "";
  const fragment = hash ? `#${hash}` : "";

  redirect(`/admin/requests/${requestId}${suffix}${fragment}`);
}

function redirectWithError(requestId: string, message: string): never {
  const params = new URLSearchParams({ error: message });

  if (!z.uuid().safeParse(requestId).success) {
    redirect(`/admin/requests?${params.toString()}`);
  }

  redirectToRequest(requestId, params);
}

function revalidateRequestPaths(requestId: string) {
  revalidatePath("/admin/requests");
  revalidatePath(`/admin/requests/${requestId}`);
}

function friendlyAcceptCandidateError(message: string) {
  if (message.includes("provider_not_approved")) {
    return "This provider is no longer approved for matching.";
  }

  if (message.includes("candidate_not_presented")) {
    return "Only presented candidates can be accepted.";
  }

  if (message.includes("candidate_not_ranked")) {
    return "Only ranked candidates can be accepted.";
  }

  if (message.includes("candidate_not_interested")) {
    return "Only interested candidates can be accepted.";
  }

  if (message.includes("candidate_already_accepted")) {
    return "This request already has an accepted match.";
  }

  if (message.includes("request_not_eligible")) {
    return "This request is no longer eligible for acceptance.";
  }

  if (
    message.includes("candidate_not_found") ||
    message.includes("candidate_request_mismatch")
  ) {
    return "We could not find that candidate for this request.";
  }

  if (message.includes("request_not_found")) {
    return "We could not find this request.";
  }

  return "We could not accept this candidate.";
}

function requestIsMatchEligible(request: {
  status: string;
  integrity_review_status: string;
}) {
  return request.status === "reviewed" && request.integrity_review_status === "clear";
}

async function assertRequestCanMatch(requestId: string) {
  const { supabase } = await requireAdmin();
  const { data: request, error } = await supabase
    .from("project_requests")
    .select("id, status, integrity_review_status")
    .eq("id", requestId)
    .maybeSingle();

  if (error || !request) {
    redirectWithError(requestId, "We could not find this request.");
  }

  if (!requestIsMatchEligible(request)) {
    redirectWithError(
      requestId,
      "This request must be reviewed and integrity-clear before matching.",
    );
  }

  return request;
}

async function getCandidateForRequest(candidateId: string, requestId: string) {
  const { supabase } = await requireAdmin();
  const { data: candidate, error } = await supabase
    .from("request_candidates")
    .select("*")
    .eq("id", candidateId)
    .eq("project_request_id", requestId)
    .maybeSingle();

  if (error || !candidate) {
    redirectWithError(requestId, "We could not find that candidate.");
  }

  return { candidate, supabase };
}

async function getEligibleCandidateForRequest(
  candidateId: string,
  requestId: string,
) {
  const { candidate, supabase } = await getCandidateForRequest(
    candidateId,
    requestId,
  );

  if (!candidate.provider_application_id) {
    redirectWithError(requestId, "This candidate has no provider application.");
  }

  const { data: provider, error } = await supabase
    .from("provider_applications")
    .select("id, status")
    .eq("id", candidate.provider_application_id)
    .maybeSingle();

  if (error || !provider) {
    redirectWithError(requestId, "We could not find this candidate's provider.");
  }

  if (provider.status !== "approved") {
    redirectWithError(
      requestId,
      "This provider is no longer approved for matching.",
    );
  }

  return { candidate, provider, supabase };
}

async function assertCurrentProviderApproved(
  requestId: string,
  providerApplicationId: string | null,
) {
  if (!providerApplicationId) {
    redirectWithError(requestId, "This candidate has no provider application.");
  }

  const { supabase } = await requireAdmin();
  const { data: provider, error } = await supabase
    .from("provider_applications")
    .select("id, status")
    .eq("id", providerApplicationId)
    .maybeSingle();

  if (error || !provider) {
    redirectWithError(requestId, "We could not find this candidate's provider.");
  }

  if (provider.status !== "approved") {
    redirectWithError(
      requestId,
      "This provider is no longer approved for matching.",
    );
  }

  return provider;
}

export async function addCandidate(formData: FormData) {
  const parsed = addCandidateSchema.safeParse(formDataObject(formData));

  if (!parsed.success) {
    redirectWithError(
      String(formData.get("request_id") ?? ""),
      parsed.error.issues[0]?.message ?? "Check the candidate details.",
    );
  }

  const { request_id: requestId, provider_application_id: providerId } =
    parsed.data;
  const { supabase, userId } = await requireAdmin();
  const { data: request, error: requestError } = await supabase
    .from("project_requests")
    .select("id, status, integrity_review_status, currency")
    .eq("id", requestId)
    .maybeSingle();

  if (requestError || !request) {
    redirectWithError(requestId, "We could not find this request.");
  }

  if (!requestIsMatchEligible(request)) {
    redirectWithError(
      requestId,
      "This request must be reviewed and integrity-clear before matching.",
    );
  }

  const { data: provider, error: providerError } = await supabase
    .from("provider_applications")
    .select("id, status")
    .eq("id", providerId)
    .maybeSingle();

  if (providerError || !provider || provider.status !== "approved") {
    redirectWithError(requestId, "Choose an approved provider.");
  }

  const { data: existingCandidate, error: duplicateError } = await supabase
    .from("request_candidates")
    .select("id")
    .eq("project_request_id", requestId)
    .eq("provider_application_id", providerId)
    .maybeSingle();

  if (duplicateError) {
    redirectWithError(requestId, "We could not check existing candidates.");
  }

  if (existingCandidate) {
    redirectWithError(
      requestId,
      "That provider is already a candidate for this request.",
    );
  }

  const { error } = await supabase.from("request_candidates").insert({
    project_request_id: requestId,
    provider_application_id: providerId,
    linked_provider_profile_id: null,
    curated_by: userId,
    candidate_rank: null,
    provider_response_status: "pending",
    student_decision_status: "not_presented",
    currency: request.currency,
  });

  if (error) {
    redirectWithError(requestId, "We could not add this candidate.");
  }

  revalidateRequestPaths(requestId);
  redirectToRequest(requestId, new URLSearchParams({ saved: "candidate_added" }));
}

export async function updateCandidateProviderResponse(formData: FormData) {
  const parsed = providerResponseSchema.safeParse(formDataObject(formData));

  if (!parsed.success) {
    redirectWithError(
      String(formData.get("request_id") ?? ""),
      parsed.error.issues[0]?.message ?? "Check the provider response.",
    );
  }

  const { request_id: requestId, candidate_id: candidateId } = parsed.data;
  const { candidate, supabase } = await getCandidateForRequest(
    candidateId,
    requestId,
  );

  if (candidate.student_decision_status === "accepted") {
    redirectWithError(
      requestId,
      "Accepted candidate responses cannot be changed.",
    );
  }

  if (candidate.student_decision_status === "declined") {
    redirectWithError(
      requestId,
      "Declined student decision history cannot be changed through provider response.",
    );
  }

  await assertCurrentProviderApproved(
    requestId,
    candidate.provider_application_id,
  );

  if (
    candidate.student_decision_status === "presented" ||
    candidate.candidate_rank !== null
  ) {
    redirectWithError(
      requestId,
      "Remove this candidate from the shortlist before changing the provider response.",
    );
  }

  const respondedAt =
    parsed.data.provider_response_status === "interested" ||
    parsed.data.provider_response_status === "declined" ||
    parsed.data.provider_response_status === "withdrawn"
      ? new Date().toISOString()
      : null;
  const declinedBy = ["declined", "withdrawn"].includes(
    parsed.data.provider_response_status,
  )
    ? "provider"
    : null;

  const { error } = await supabase
    .from("request_candidates")
    .update({
      provider_response_status: parsed.data.provider_response_status,
      provider_responded_at: respondedAt,
      declined_by: declinedBy,
      decline_reason: declinedBy ? parsed.data.decline_reason : null,
      ...(parsed.data.provider_response_status === "interested"
        ? {}
        : {
            candidate_rank: null,
            student_decision_status: "not_presented",
            student_decision_at: null,
          }),
    })
    .eq("id", candidateId);

  if (error) {
    redirectWithError(requestId, "We could not update the provider response.");
  }

  revalidateRequestPaths(requestId);
  redirectToRequest(requestId, new URLSearchParams({ saved: "provider_response" }));
}

export async function presentCandidate(formData: FormData) {
  const parsed = presentCandidateSchema.safeParse(formDataObject(formData));

  if (!parsed.success) {
    redirectWithError(
      String(formData.get("request_id") ?? ""),
      parsed.error.issues[0]?.message ?? "Check the shortlist rank.",
    );
  }

  const { request_id: requestId, candidate_id: candidateId, candidate_rank } =
    parsed.data;
  const { candidate, supabase } = await getEligibleCandidateForRequest(
    candidateId,
    requestId,
  );

  if (candidate.provider_response_status !== "interested") {
    redirectWithError(
      requestId,
      "Only interested candidates can be presented.",
    );
  }

  if (candidate.student_decision_status === "accepted") {
    redirectWithError(requestId, "An accepted candidate cannot be re-ranked.");
  }

  if (candidate.student_decision_status === "declined") {
    redirectWithError(requestId, "Declined candidates cannot be re-presented.");
  }

  await assertRequestCanMatch(requestId);

  const { count: presentedCount, error: countError } = await supabase
    .from("request_candidates")
    .select("id", { count: "exact", head: true })
    .eq("project_request_id", requestId)
    .not("candidate_rank", "is", null)
    .neq("id", candidateId);

  if (countError) {
    redirectWithError(requestId, "We could not check the shortlist.");
  }

  if ((presentedCount ?? 0) >= 3 && candidate.candidate_rank === null) {
    redirectWithError(requestId, "A request can have at most 3 presented options.");
  }

  const { error } = await supabase
    .from("request_candidates")
    .update({
      candidate_rank,
      student_decision_status: "presented",
    })
    .eq("id", candidateId);

  if (error) {
    redirectWithError(
      requestId,
      "We could not present this candidate at that rank.",
    );
  }

  revalidateRequestPaths(requestId);
  redirectToRequest(requestId, new URLSearchParams({ saved: "presented" }));
}

export async function unpresentCandidate(formData: FormData) {
  const parsed = candidateIdSchema.safeParse(formDataObject(formData));

  if (!parsed.success) {
    redirectWithError(
      String(formData.get("request_id") ?? ""),
      parsed.error.issues[0]?.message ?? "Check the candidate.",
    );
  }

  const { request_id: requestId, candidate_id: candidateId } = parsed.data;
  const { candidate, supabase } = await getCandidateForRequest(
    candidateId,
    requestId,
  );

  if (candidate.student_decision_status === "accepted") {
    redirectWithError(
      requestId,
      "Accepted candidates cannot be removed from the shortlist.",
    );
  }

  if (
    candidate.student_decision_status !== "presented" ||
    candidate.candidate_rank === null
  ) {
    redirectWithError(
      requestId,
      "Only currently presented candidates can be removed from the shortlist.",
    );
  }

  const { error } = await supabase
    .from("request_candidates")
    .update({
      candidate_rank: null,
      student_decision_status: "not_presented",
      student_decision_at: null,
    })
    .eq("id", candidateId);

  if (error) {
    redirectWithError(requestId, "We could not remove this candidate.");
  }

  revalidateRequestPaths(requestId);
  redirectToRequest(requestId, new URLSearchParams({ saved: "unpresented" }));
}

export async function updateCandidateStudentDecision(formData: FormData) {
  const parsed = studentDecisionSchema.safeParse(formDataObject(formData));

  if (!parsed.success) {
    redirectWithError(
      String(formData.get("request_id") ?? ""),
      parsed.error.issues[0]?.message ?? "Check the student decision.",
    );
  }

  const { request_id: requestId, candidate_id: candidateId } = parsed.data;
  const { candidate, supabase } = await getEligibleCandidateForRequest(
    candidateId,
    requestId,
  );

  if (
    candidate.provider_response_status !== "interested" ||
    candidate.student_decision_status !== "presented" ||
    candidate.candidate_rank === null
  ) {
    redirectWithError(
      requestId,
      "Only presented interested candidates can receive a student decision.",
    );
  }

  if (parsed.data.student_decision_status === "accepted") {
    const { data: request, error: requestError } = await supabase
      .from("project_requests")
      .select("id, status, integrity_review_status")
      .eq("id", requestId)
      .maybeSingle();

    if (requestError || !request) {
      redirectWithError(requestId, "We could not find this request.");
    }

    if (!requestIsMatchEligible(request)) {
      redirectWithError(
        requestId,
        request.status === "matched"
          ? "This request already has an accepted match."
          : "This request must be reviewed and integrity-clear before matching.",
      );
    }

    const { data: acceptedCandidate, error: acceptedError } = await supabase
      .from("request_candidates")
      .select("id")
      .eq("project_request_id", requestId)
      .eq("student_decision_status", "accepted")
      .neq("id", candidateId)
      .maybeSingle();

    if (acceptedError) {
      redirectWithError(requestId, "We could not check accepted candidates.");
    }

    if (acceptedCandidate) {
      redirectWithError(requestId, "This request already has an accepted match.");
    }

    const { error: acceptError } = await (
      supabase as unknown as AcceptCandidateRpcClient
    ).rpc(
      "accept_request_candidate",
      {
        p_candidate_id: candidateId,
        p_request_id: requestId,
      },
    );

    if (acceptError) {
      redirectWithError(
        requestId,
        friendlyAcceptCandidateError(acceptError.message),
      );
    }

    if (candidate.agreed_price === null || candidate.agreed_deadline === null) {
      revalidateRequestPaths(requestId);
      redirectToRequest(
        requestId,
        new URLSearchParams({ saved: "student_accepted_terms_needed" }),
        agreementTermsAnchor(candidateId),
      );
    }
  } else {
    const decidedAt = new Date().toISOString();
    const { error: candidateError } = await supabase
      .from("request_candidates")
      .update({
        student_decision_status: "declined",
        student_decision_at: decidedAt,
        declined_by: "student",
        decline_reason: parsed.data.decline_reason,
        candidate_rank: null,
      })
      .eq("id", candidateId);

    if (candidateError) {
      redirectWithError(requestId, "We could not update the student decision.");
    }
  }

  revalidateRequestPaths(requestId);
  redirectToRequest(requestId, new URLSearchParams({ saved: "student_decision" }));
}

export async function updateCandidateDetails(formData: FormData) {
  const parsed = candidateDetailsSchema.safeParse(formDataObject(formData));

  if (!parsed.success) {
    redirectWithError(
      String(formData.get("request_id") ?? ""),
      parsed.error.issues[0]?.message ?? "Check the candidate details.",
    );
  }

  const { request_id: requestId, candidate_id: candidateId } = parsed.data;
  const { candidate, supabase } = await getCandidateForRequest(
    candidateId,
    requestId,
  );
  let providerIsApproved = false;

  if (candidate.provider_application_id) {
    const { data: provider, error: providerError } = await supabase
      .from("provider_applications")
      .select("id, status")
      .eq("id", candidate.provider_application_id)
      .maybeSingle();

    if (providerError) {
      redirectWithError(
        requestId,
        "We could not check this candidate's provider.",
      );
    }

    providerIsApproved = provider?.status === "approved";
  }

  if (!providerIsApproved) {
    const { error } = await supabase
      .from("request_candidates")
      .update({
        internal_notes: parsed.data.internal_notes,
      })
      .eq("id", candidateId);

    if (error) {
      redirectWithError(requestId, "We could not update candidate notes.");
    }

    revalidateRequestPaths(requestId);
    redirectToRequest(
      requestId,
      new URLSearchParams({ saved: "candidate_notes" }),
    );
  }

  const { error } = await supabase
    .from("request_candidates")
    .update({
      scope_summary: parsed.data.scope_summary,
      proposed_price: parsed.data.proposed_price,
      agreed_price: parsed.data.agreed_price,
      agreed_deadline: parsed.data.agreed_deadline,
      internal_notes: parsed.data.internal_notes,
    })
    .eq("id", candidateId);

  if (error) {
    redirectWithError(requestId, "We could not update candidate details.");
  }

  revalidateRequestPaths(requestId);
  redirectToRequest(requestId, new URLSearchParams({ saved: "candidate_details" }));
}
