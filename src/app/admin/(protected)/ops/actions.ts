"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { retryFailedEmailOutboxRow } from "@/lib/email/outbox";

const retryEmailSchema = z.object({
  outbox_id: z.uuid("Invalid email outbox row."),
});

function formDataObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

function redirectToOps(params: Record<string, string>): never {
  const searchParams = new URLSearchParams(params);

  redirect(`/admin/ops?${searchParams.toString()}`);
}

export async function retryFailedEmail(formData: FormData) {
  await requireAdmin();

  const parsed = retryEmailSchema.safeParse(formDataObject(formData));

  if (!parsed.success) {
    redirectToOps({
      email_retry: "invalid",
      email_retry_message: "Invalid email retry request.",
    });
  }

  const result = await retryFailedEmailOutboxRow(parsed.data.outbox_id);

  revalidatePath("/admin/ops");
  redirectToOps({
    email_retry: result.status,
    email_retry_message: result.message,
  });
}
