"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";

const engagementStatuses = [
  "agreed",
  "in_progress",
  "submitted",
  "completed",
  "cancelled",
  "disputed",
] as const;

const paymentStatuses = [
  "not_started",
  "agreed",
  "paid",
  "partially_paid",
  "refunded",
  "chargeback_disputed",
] as const;

const signalValues = ["yes", "no", "unknown"] as const;

type PaymentStatus = (typeof paymentStatuses)[number];

const createEngagementSchema = z.object({
  candidate_id: z.uuid("Invalid candidate id."),
  request_id: z.uuid("Invalid request id."),
});

const engagementIdSchema = z.object({
  engagement_id: z.uuid("Invalid engagement id."),
  request_id: z.uuid("Invalid request id."),
});

const engagementStatusSchema = engagementIdSchema.extend({
  status: z.enum(engagementStatuses, {
    message: "Choose a supported engagement status.",
  }),
});

const paymentStatusSchema = engagementIdSchema.extend({
  payment_status: z.enum(paymentStatuses, {
    message: "Choose a supported payment status.",
  }),
});

const engagementNotesSchema = engagementIdSchema.extend({
  dispute_notes: z
    .string()
    .trim()
    .max(5000, "Use 5000 characters or fewer for dispute notes.")
    .transform((value) => (value.length > 0 ? value : null)),
  internal_notes: z
    .string()
    .trim()
    .max(5000, "Use 5000 characters or fewer for internal notes.")
    .transform((value) => (value.length > 0 ? value : null)),
  provider_feedback: z
    .string()
    .trim()
    .max(5000, "Use 5000 characters or fewer for provider feedback.")
    .transform((value) => (value.length > 0 ? value : null)),
  referral_signal: z
    .union([z.enum(signalValues), z.literal("")])
    .transform((value) => (value === "" ? null : value)),
  repeat_intent: z
    .union([z.enum(signalValues), z.literal("")])
    .transform((value) => (value === "" ? null : value)),
  student_feedback: z
    .string()
    .trim()
    .max(5000, "Use 5000 characters or fewer for student feedback.")
    .transform((value) => (value.length > 0 ? value : null)),
});

function formDataObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

function redirectToRequest(requestId: string, params?: URLSearchParams): never {
  const suffix = params ? `?${params.toString()}` : "";

  redirect(`/admin/requests/${requestId}${suffix}`);
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

function friendlyCreateEngagementError(message: string) {
  if (message.includes("candidate_not_accepted")) {
    return "Only accepted candidates can become engagements.";
  }

  if (message.includes("request_not_matched")) {
    return "The request must be matched before creating an engagement.";
  }

  if (message.includes("provider_not_approved")) {
    return "This provider is no longer approved for engagement creation.";
  }

  if (message.includes("agreed_price_required")) {
    return "Add an agreed price before creating an engagement.";
  }

  if (message.includes("agreed_deadline_required")) {
    return "Add an agreed deadline before creating an engagement.";
  }

  if (message.includes("engagement_already_exists")) {
    return "This accepted candidate already has an engagement.";
  }

  if (
    message.includes("candidate_not_found") ||
    message.includes("candidate_request_mismatch")
  ) {
    return "We could not find that accepted candidate for this request.";
  }

  if (message.includes("request_not_found")) {
    return "We could not find this request.";
  }

  return "We could not create this engagement.";
}

function friendlyEngagementStatusError(message: string) {
  if (message.includes("engagement_terminal")) {
    return "Completed or cancelled engagements cannot change status.";
  }

  if (message.includes("engagement_transition_invalid")) {
    return "That engagement status transition is not allowed.";
  }

  if (message.includes("engagement_request_mismatch")) {
    return "This engagement does not belong to this request.";
  }

  if (message.includes("engagement_not_found")) {
    return "We could not find this engagement.";
  }

  if (message.includes("request_not_found")) {
    return "We could not find this request.";
  }

  return "We could not update engagement status.";
}

function nextPaymentStatuses(status: PaymentStatus): PaymentStatus[] {
  switch (status) {
    case "not_started":
      return ["agreed"];
    case "agreed":
      return ["partially_paid", "paid"];
    case "partially_paid":
      return ["paid", "refunded", "chargeback_disputed"];
    case "paid":
      return ["refunded", "chargeback_disputed"];
    case "refunded":
    case "chargeback_disputed":
      return [];
  }
}

async function getEngagementForRequest(engagementId: string, requestId: string) {
  const { supabase } = await requireAdmin();
  const { data: engagement, error: engagementError } = await supabase
    .from("project_engagements")
    .select("*")
    .eq("id", engagementId)
    .maybeSingle();

  if (engagementError || !engagement) {
    redirectWithError(requestId, "We could not find this engagement.");
  }

  const { data: candidate, error: candidateError } = await supabase
    .from("request_candidates")
    .select("id, project_request_id")
    .eq("id", engagement.request_candidate_id)
    .maybeSingle();

  if (candidateError || !candidate || candidate.project_request_id !== requestId) {
    redirectWithError(requestId, "This engagement does not belong to this request.");
  }

  return { engagement, supabase };
}

export async function createEngagement(formData: FormData) {
  const parsed = createEngagementSchema.safeParse(formDataObject(formData));

  if (!parsed.success) {
    redirectWithError(
      String(formData.get("request_id") ?? ""),
      parsed.error.issues[0]?.message ?? "Check the engagement details.",
    );
  }

  const { request_id: requestId, candidate_id: candidateId } = parsed.data;
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("create_project_engagement", {
    p_candidate_id: candidateId,
    p_request_id: requestId,
  });

  if (error) {
    redirectWithError(requestId, friendlyCreateEngagementError(error.message));
  }

  revalidateRequestPaths(requestId);
  redirectToRequest(requestId, new URLSearchParams({ saved: "engagement_created" }));
}

export async function updateEngagementStatus(formData: FormData) {
  const parsed = engagementStatusSchema.safeParse(formDataObject(formData));

  if (!parsed.success) {
    redirectWithError(
      String(formData.get("request_id") ?? ""),
      parsed.error.issues[0]?.message ?? "Check the engagement status.",
    );
  }

  const { request_id: requestId, engagement_id: engagementId, status } =
    parsed.data;
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("update_project_engagement_status", {
    p_engagement_id: engagementId,
    p_request_id: requestId,
    p_status: status,
  });

  if (error) {
    redirectWithError(requestId, friendlyEngagementStatusError(error.message));
  }

  revalidateRequestPaths(requestId);
  redirectToRequest(requestId, new URLSearchParams({ saved: "engagement_status" }));
}

export async function updatePaymentStatus(formData: FormData) {
  const parsed = paymentStatusSchema.safeParse(formDataObject(formData));

  if (!parsed.success) {
    redirectWithError(
      String(formData.get("request_id") ?? ""),
      parsed.error.issues[0]?.message ?? "Check the payment status.",
    );
  }

  const {
    request_id: requestId,
    engagement_id: engagementId,
    payment_status: paymentStatus,
  } = parsed.data;
  const { engagement, supabase } = await getEngagementForRequest(
    engagementId,
    requestId,
  );

  if (engagement.payment_status === paymentStatus) {
    redirectToRequest(requestId, new URLSearchParams({ saved: "payment_status" }));
  }

  const currentPaymentStatus = paymentStatusSchema.shape.payment_status.safeParse(
    engagement.payment_status,
  );

  if (
    !currentPaymentStatus.success ||
    !nextPaymentStatuses(currentPaymentStatus.data).includes(paymentStatus)
  ) {
    redirectWithError(requestId, "That payment status transition is not allowed.");
  }

  const { error } = await supabase
    .from("project_engagements")
    .update({ payment_status: paymentStatus })
    .eq("id", engagementId);

  if (error) {
    redirectWithError(requestId, "We could not update payment status.");
  }

  revalidateRequestPaths(requestId);
  redirectToRequest(requestId, new URLSearchParams({ saved: "payment_status" }));
}

export async function updateEngagementNotes(formData: FormData) {
  const parsed = engagementNotesSchema.safeParse(formDataObject(formData));

  if (!parsed.success) {
    redirectWithError(
      String(formData.get("request_id") ?? ""),
      parsed.error.issues[0]?.message ?? "Check the engagement notes.",
    );
  }

  const {
    dispute_notes,
    engagement_id: engagementId,
    internal_notes,
    provider_feedback,
    referral_signal,
    repeat_intent,
    request_id: requestId,
    student_feedback,
  } = parsed.data;
  const { supabase } = await getEngagementForRequest(engagementId, requestId);
  const { error } = await supabase
    .from("project_engagements")
    .update({
      dispute_notes,
      internal_notes,
      provider_feedback,
      referral_signal,
      repeat_intent,
      student_feedback,
    })
    .eq("id", engagementId);

  if (error) {
    redirectWithError(requestId, "We could not update engagement notes.");
  }

  revalidateRequestPaths(requestId);
  redirectToRequest(requestId, new URLSearchParams({ saved: "engagement_notes" }));
}
