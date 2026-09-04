"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";

const requestIdSchema = z.object({
  request_id: z.uuid("Invalid request id."),
});

const internalNotesSchema = requestIdSchema.extend({
  internal_notes: z
    .string()
    .trim()
    .max(5000, "Use 5000 characters or fewer for internal notes.")
    .transform((value) => (value.length > 0 ? value : null)),
});

const rejectRequestSchema = requestIdSchema.extend({
  rejection_reason: z
    .string()
    .trim()
    .min(2, "Add a rejection reason.")
    .max(1000, "Use 1000 characters or fewer for the rejection reason."),
  rejection_type: z.enum(["integrity", "non_integrity"], {
    message: "Choose a rejection type.",
  }),
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

async function updateRequestReview(
  requestId: string,
  values: {
    status?: "needs_clarification" | "reviewed" | "rejected";
    integrity_review_status?: "clear" | "rejected";
    rejection_reason?: string;
    internal_notes?: string | null;
  },
) {
  const { supabase, userId } = await requireAdmin();
  const reviewedAt = new Date().toISOString();

  const { error } = await supabase
    .from("project_requests")
    .update({
      ...values,
      reviewed_by: userId,
      reviewed_at: reviewedAt,
    })
    .eq("id", requestId);

  if (error) {
    redirectWithError(requestId, "We could not update this request.");
  }

  revalidateRequestPaths(requestId);
}

export async function updateInternalNotes(formData: FormData) {
  const parsed = internalNotesSchema.safeParse(formDataObject(formData));

  if (!parsed.success) {
    redirectWithError(
      String(formData.get("request_id") ?? ""),
      parsed.error.issues[0]?.message ?? "Check the internal notes.",
    );
  }

  await updateRequestReview(parsed.data.request_id, {
    internal_notes: parsed.data.internal_notes,
  });

  redirectToRequest(
    parsed.data.request_id,
    new URLSearchParams({ saved: "notes" }),
  );
}

export async function markNeedsClarification(formData: FormData) {
  const parsed = requestIdSchema.safeParse(formDataObject(formData));

  if (!parsed.success) {
    redirect("/admin/requests");
  }

  await updateRequestReview(parsed.data.request_id, {
    status: "needs_clarification",
  });

  redirectToRequest(
    parsed.data.request_id,
    new URLSearchParams({ saved: "needs_clarification" }),
  );
}

export async function markReviewed(formData: FormData) {
  const parsed = requestIdSchema.safeParse(formDataObject(formData));

  if (!parsed.success) {
    redirect("/admin/requests");
  }

  await updateRequestReview(parsed.data.request_id, {
    status: "reviewed",
  });

  redirectToRequest(
    parsed.data.request_id,
    new URLSearchParams({ saved: "reviewed" }),
  );
}

export async function markIntegrityClear(formData: FormData) {
  const parsed = requestIdSchema.safeParse(formDataObject(formData));

  if (!parsed.success) {
    redirect("/admin/requests");
  }

  await updateRequestReview(parsed.data.request_id, {
    integrity_review_status: "clear",
  });

  redirectToRequest(
    parsed.data.request_id,
    new URLSearchParams({ saved: "integrity_clear" }),
  );
}

export async function rejectRequest(formData: FormData) {
  const parsed = rejectRequestSchema.safeParse(formDataObject(formData));

  if (!parsed.success) {
    redirectWithError(
      String(formData.get("request_id") ?? ""),
      parsed.error.issues[0]?.message ?? "Check the rejection details.",
    );
  }

  await updateRequestReview(parsed.data.request_id, {
    status: "rejected",
    rejection_reason: parsed.data.rejection_reason,
    ...(parsed.data.rejection_type === "integrity"
      ? { integrity_review_status: "rejected" as const }
      : {}),
  });

  redirectToRequest(
    parsed.data.request_id,
    new URLSearchParams({ saved: "rejected" }),
  );
}
