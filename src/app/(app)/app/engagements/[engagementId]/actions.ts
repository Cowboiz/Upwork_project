"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/user";
import {
  sendEngagementCompletedProviderNotification,
  sendEngagementDisputedAdminNotification,
  sendEngagementSubmittedStudentNotification,
} from "@/lib/email/outbox";

const engagementIdSchema = z.object({
  engagementId: z.uuid(),
});

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value.length > 0 ? value : null));

function formDataObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

const submitDeliverableSchema = engagementIdSchema.extend({
  deliverable_summary: optionalText(5000),
  deliverable_url: optionalText(2000).refine(
    (value) => value === null || isHttpUrl(value),
  ),
});

const disputeSchema = engagementIdSchema.extend({
  dispute_notes: z.string().trim().min(1).max(5000),
});

const feedbackSchema = engagementIdSchema.extend({
  feedback_text: z.string().trim().max(5000).optional().default(""),
  rating: z.coerce.number().int().min(1).max(5),
});

function redirectToEngagement(
  engagementId: string,
  params: Record<string, string>,
): never {
  const searchParams = new URLSearchParams(params);

  redirect(`/app/engagements/${engagementId}?${searchParams.toString()}`);
}

function redirectInvalid(formData: FormData): never {
  redirectToEngagement(String(formData.get("engagementId") ?? ""), {
    error: "invalid",
  });
}

function engagementError(message: string | undefined) {
  switch (message) {
    case "engagement_closed":
    case "engagement_not_started":
    case "engagement_not_submitted":
    case "engagement_not_completed":
    case "request_state_invalid":
      return "closed";
    case "deliverable_required":
    case "deliverable_url_too_long":
    case "deliverable_summary_too_long":
    case "deliverable_url_invalid":
      return "invalid_deliverable";
    case "deliverable_conflict":
    case "dispute_conflict":
    case "feedback_conflict":
      return "conflict";
    case "dispute_notes_required":
    case "dispute_notes_too_long":
      return "invalid_dispute";
    case "feedback_rating_invalid":
    case "feedback_text_too_long":
      return "invalid_feedback";
    default:
      return "invalid";
  }
}

function revalidateEngagementPaths(engagementId: string) {
  revalidatePath(`/app/engagements/${engagementId}`);
  revalidatePath("/app/engagements");
  revalidatePath("/app");
  revalidatePath(`/app/messages/${engagementId}`);
  revalidatePath("/app/messages");
}

export async function startMyEngagementWork(formData: FormData) {
  const parsed = engagementIdSchema.safeParse(formDataObject(formData));

  if (!parsed.success) {
    redirectInvalid(formData);
  }

  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("start_my_engagement_work", {
    p_engagement_id: parsed.data.engagementId,
  });

  if (error) {
    redirectToEngagement(parsed.data.engagementId, {
      error: engagementError(error.message),
    });
  }

  revalidateEngagementPaths(parsed.data.engagementId);
  redirectToEngagement(parsed.data.engagementId, { saved: "started" });
}

export async function submitMyEngagementDeliverable(formData: FormData) {
  const parsed = submitDeliverableSchema.safeParse(formDataObject(formData));

  if (!parsed.success) {
    redirectInvalid(formData);
  }

  if (
    parsed.data.deliverable_url === null &&
    parsed.data.deliverable_summary === null
  ) {
    redirectToEngagement(parsed.data.engagementId, {
      error: "invalid_deliverable",
    });
  }

  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("submit_my_engagement_deliverable", {
    p_deliverable_summary: parsed.data.deliverable_summary,
    p_deliverable_url: parsed.data.deliverable_url,
    p_engagement_id: parsed.data.engagementId,
  });

  if (error) {
    redirectToEngagement(parsed.data.engagementId, {
      error: engagementError(error.message),
    });
  }

  await sendEngagementSubmittedStudentNotification({
    engagementId: parsed.data.engagementId,
  });

  revalidateEngagementPaths(parsed.data.engagementId);
  redirectToEngagement(parsed.data.engagementId, { saved: "submitted" });
}

export async function completeMyEngagement(formData: FormData) {
  const parsed = engagementIdSchema.safeParse(formDataObject(formData));

  if (!parsed.success) {
    redirectInvalid(formData);
  }

  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("complete_my_engagement", {
    p_engagement_id: parsed.data.engagementId,
  });

  if (error) {
    redirectToEngagement(parsed.data.engagementId, {
      error: engagementError(error.message),
    });
  }

  await sendEngagementCompletedProviderNotification({
    engagementId: parsed.data.engagementId,
  });

  revalidateEngagementPaths(parsed.data.engagementId);
  redirectToEngagement(parsed.data.engagementId, { saved: "completed" });
}

export async function disputeMyEngagement(formData: FormData) {
  const parsed = disputeSchema.safeParse(formDataObject(formData));

  if (!parsed.success) {
    redirectInvalid(formData);
  }

  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("dispute_my_engagement", {
    p_dispute_notes: parsed.data.dispute_notes,
    p_engagement_id: parsed.data.engagementId,
  });

  if (error) {
    redirectToEngagement(parsed.data.engagementId, {
      error: engagementError(error.message),
    });
  }

  await sendEngagementDisputedAdminNotification({
    engagementId: parsed.data.engagementId,
  });

  revalidateEngagementPaths(parsed.data.engagementId);
  redirectToEngagement(parsed.data.engagementId, { saved: "disputed" });
}

export async function submitMyEngagementFeedback(formData: FormData) {
  const parsed = feedbackSchema.safeParse(formDataObject(formData));

  if (!parsed.success) {
    redirectInvalid(formData);
  }

  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("submit_my_engagement_feedback", {
    p_engagement_id: parsed.data.engagementId,
    p_feedback_text: parsed.data.feedback_text,
    p_rating: parsed.data.rating,
  });

  if (error) {
    redirectToEngagement(parsed.data.engagementId, {
      error: engagementError(error.message),
    });
  }

  revalidateEngagementPaths(parsed.data.engagementId);
  redirectToEngagement(parsed.data.engagementId, { saved: "feedback" });
}
