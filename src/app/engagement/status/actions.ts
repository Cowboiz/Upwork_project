"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { verifyEngagementAccessBearerToken } from "@/lib/engagement/tokens";
import {
  sendEngagementCompletedProviderNotification,
  sendEngagementDisputedAdminNotification,
} from "@/lib/email/outbox";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type StudentEngagementRpcClient = {
  rpc(
    functionName: "complete_engagement",
    args: {
      p_token_id: string;
    },
  ): Promise<{
    error: {
      message: string;
    } | null;
  }>;
  rpc(
    functionName: "dispute_engagement",
    args: {
      p_dispute_notes: string;
      p_token_id: string;
    },
  ): Promise<{
    error: {
      message: string;
    } | null;
  }>;
};

const tokenSchema = z.object({
  token: z.string().trim().min(1, "Missing engagement token."),
});

const disputeSchema = tokenSchema.extend({
  dispute_notes: z
    .string()
    .trim()
    .min(1, "Add issue details.")
    .max(5000, "Use 5000 characters or fewer for issue details."),
});

const feedbackSchema = tokenSchema.extend({
  feedback_text: z.string().trim().max(5000).optional().default(""),
  rating: z.coerce
    .number()
    .int("Choose a rating from 1 to 5.")
    .min(1, "Choose a rating from 1 to 5.")
    .max(5, "Choose a rating from 1 to 5."),
});

function formDataObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

function redirectToStudentEngagement(
  token: string,
  params: Record<string, string>,
): never {
  const searchParams = new URLSearchParams({ token, ...params });

  redirect(`/engagement/status?${searchParams.toString()}`);
}

function redirectInvalid(): never {
  redirect("/engagement/status?error=invalid");
}

function friendlyStudentEngagementError(message: string) {
  if (message.includes("token_expired")) {
    return "expired";
  }

  if (
    message.includes("engagement_closed") ||
    message.includes("engagement_not_submitted") ||
    message.includes("request_state_invalid")
  ) {
    return "closed";
  }

  if (
    message.includes("dispute_notes_required") ||
    message.includes("dispute_notes_too_long")
  ) {
    return "invalid_dispute";
  }

  if (message.includes("dispute_conflict")) {
    return "conflict";
  }

  return "invalid";
}

function friendlyStudentFeedbackError(message: string) {
  if (message.includes("token_expired")) {
    return "expired";
  }

  if (
    message.includes("feedback_rating_invalid") ||
    message.includes("feedback_text_too_long")
  ) {
    return "invalid_feedback";
  }

  if (message.includes("engagement_not_completed")) {
    return "feedback_closed";
  }

  if (message.includes("feedback_conflict")) {
    return "feedback_conflict";
  }

  return "invalid";
}

export async function completeStudentEngagement(formData: FormData) {
  const parsed = tokenSchema.safeParse(formDataObject(formData));

  if (!parsed.success) {
    redirectInvalid();
  }

  const verified = await verifyEngagementAccessBearerToken(
    parsed.data.token,
    "student",
  );

  if (!verified.ok) {
    redirectToStudentEngagement(parsed.data.token, { error: verified.reason });
  }

  const { error } = await (
    createSupabaseAdminClient() as unknown as StudentEngagementRpcClient
  ).rpc("complete_engagement", {
    p_token_id: verified.tokenId,
  });

  if (error) {
    redirectToStudentEngagement(parsed.data.token, {
      error: friendlyStudentEngagementError(error.message),
    });
  }

  await sendEngagementCompletedProviderNotification({
    engagementId: verified.tokenRow.project_engagement_id,
  });

  revalidatePath("/engagement/status");
  redirectToStudentEngagement(parsed.data.token, { saved: "completed" });
}

export async function disputeStudentEngagement(formData: FormData) {
  const parsed = disputeSchema.safeParse(formDataObject(formData));

  if (!parsed.success) {
    redirectInvalid();
  }

  const verified = await verifyEngagementAccessBearerToken(
    parsed.data.token,
    "student",
  );

  if (!verified.ok) {
    redirectToStudentEngagement(parsed.data.token, { error: verified.reason });
  }

  const { error } = await (
    createSupabaseAdminClient() as unknown as StudentEngagementRpcClient
  ).rpc("dispute_engagement", {
    p_dispute_notes: parsed.data.dispute_notes,
    p_token_id: verified.tokenId,
  });

  if (error) {
    redirectToStudentEngagement(parsed.data.token, {
      error: friendlyStudentEngagementError(error.message),
    });
  }

  await sendEngagementDisputedAdminNotification({
    engagementId: verified.tokenRow.project_engagement_id,
  });

  revalidatePath("/engagement/status");
  redirectToStudentEngagement(parsed.data.token, { saved: "disputed" });
}

export async function submitStudentEngagementFeedback(formData: FormData) {
  const parsed = feedbackSchema.safeParse(formDataObject(formData));

  if (!parsed.success) {
    const token = formData.get("token");

    if (typeof token === "string" && token.trim()) {
      redirectToStudentEngagement(token, { error: "invalid_feedback" });
    }

    redirectInvalid();
  }

  const verified = await verifyEngagementAccessBearerToken(
    parsed.data.token,
    "student",
  );

  if (!verified.ok) {
    redirectToStudentEngagement(parsed.data.token, { error: verified.reason });
  }

  const { data, error } = await createSupabaseAdminClient().rpc(
    "submit_engagement_feedback",
    {
      p_feedback_text: parsed.data.feedback_text,
      p_rating: parsed.data.rating,
      p_token_id: verified.tokenId,
    },
  );

  if (error || data !== "submitted") {
    redirectToStudentEngagement(parsed.data.token, {
      error: error ? friendlyStudentFeedbackError(error.message) : "invalid",
    });
  }

  revalidatePath("/engagement/status");
  redirectToStudentEngagement(parsed.data.token, { saved: "feedback" });
}
