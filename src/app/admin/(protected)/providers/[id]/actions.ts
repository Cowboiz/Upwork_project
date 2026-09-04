"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";

const providerIdSchema = z.object({
  provider_id: z.uuid("Invalid provider id."),
});

const internalNotesSchema = providerIdSchema.extend({
  internal_notes: z
    .string()
    .trim()
    .max(5000, "Use 5000 characters or fewer for internal notes.")
    .transform((value) => (value.length > 0 ? value : null)),
});

const providerStatusSchema = providerIdSchema.extend({
  status: z.enum(["approved", "waitlisted", "rejected", "inactive"], {
    message: "Choose a supported provider status.",
  }),
});

function formDataObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

function redirectToProvider(
  providerId: string,
  params?: URLSearchParams,
): never {
  const suffix = params ? `?${params.toString()}` : "";

  redirect(`/admin/providers/${providerId}${suffix}`);
}

function redirectWithError(providerId: string, message: string): never {
  const params = new URLSearchParams({ error: message });

  if (!z.uuid().safeParse(providerId).success) {
    redirect(`/admin/providers?${params.toString()}`);
  }

  redirectToProvider(providerId, params);
}

function revalidateProviderPaths(providerId: string) {
  revalidatePath("/admin/providers");
  revalidatePath(`/admin/providers/${providerId}`);
}

async function updateProviderReview(
  providerId: string,
  values: {
    status?: "approved" | "waitlisted" | "rejected" | "inactive";
    internal_notes?: string | null;
  },
) {
  const { supabase, userId } = await requireAdmin();
  const reviewedAt = new Date().toISOString();

  const { error } = await supabase
    .from("provider_applications")
    .update({
      ...values,
      reviewed_by: userId,
      reviewed_at: reviewedAt,
    })
    .eq("id", providerId);

  if (error) {
    redirectWithError(providerId, "We could not update this provider.");
  }

  revalidateProviderPaths(providerId);
}

export async function updateInternalNotes(formData: FormData) {
  const parsed = internalNotesSchema.safeParse(formDataObject(formData));

  if (!parsed.success) {
    redirectWithError(
      String(formData.get("provider_id") ?? ""),
      parsed.error.issues[0]?.message ?? "Check the internal notes.",
    );
  }

  await updateProviderReview(parsed.data.provider_id, {
    internal_notes: parsed.data.internal_notes,
  });

  redirectToProvider(
    parsed.data.provider_id,
    new URLSearchParams({ saved: "notes" }),
  );
}

export async function updateProviderStatus(formData: FormData) {
  const parsed = providerStatusSchema.safeParse(formDataObject(formData));

  if (!parsed.success) {
    redirectWithError(
      String(formData.get("provider_id") ?? ""),
      parsed.error.issues[0]?.message ?? "Check the provider status.",
    );
  }

  await updateProviderReview(parsed.data.provider_id, {
    status: parsed.data.status,
  });

  redirectToProvider(
    parsed.data.provider_id,
    new URLSearchParams({ saved: parsed.data.status }),
  );
}
