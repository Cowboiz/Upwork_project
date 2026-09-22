import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import {
  getAdminNotificationEmail,
  isEmailEnabled,
  resolveDeliveryRecipient,
  sendEmail,
  type EmailMessage,
} from "./client";
import {
  adminNewProviderApplicationEmail,
  adminNewRequestEmail,
  providerApplicationSubmittedEmail,
  requesterRequestSubmittedEmail,
} from "./templates";

type Supabase = SupabaseClient<Database>;
type EmailOutboxRow = Pick<
  Database["public"]["Tables"]["email_outbox"]["Row"],
  "attempt_count" | "id" | "provider_recipient_email" | "status"
>;
type RecipientRole = "admin" | "provider" | "student";

type RelatedRecords = {
  related_project_request_id?: string;
  related_provider_application_id?: string;
  related_request_candidate_id?: string;
  related_project_engagement_id?: string;
};

type OutboxEmailInput = EmailMessage & {
  dedupeKey: string;
  recipientRole: RecipientRole;
  related: RelatedRecords;
  templateKey: string;
};

type ProjectRequestNotificationInput = {
  contactMethod: string;
  contactValue: string;
  id: string;
  requesterName: string;
};

type ProviderApplicationNotificationInput = {
  applicantName: string;
  contactMethod: string;
  contactValue: string;
  id: string;
};

function sanitizeEmailError(error: unknown) {
  if (error instanceof Error && error.message.startsWith("Missing required")) {
    return error.message.slice(0, 300);
  }

  return "Email delivery failed.";
}

function isUniqueViolation(error: { code?: string } | null) {
  return error?.code === "23505";
}

async function loadOutboxRow(supabase: Supabase, dedupeKey: string) {
  const { data, error } = await supabase
    .from("email_outbox")
    .select("id, status, attempt_count, provider_recipient_email")
    .eq("dedupe_key", dedupeKey)
    .maybeSingle();

  if (error) {
    return null;
  }

  return data satisfies EmailOutboxRow | null;
}

async function enqueueOutboxRow(supabase: Supabase, input: OutboxEmailInput) {
  const { data, error } = await supabase
    .from("email_outbox")
    .insert({
      dedupe_key: input.dedupeKey,
      provider_recipient_email: resolveDeliveryRecipient(input.to),
      recipient_email: input.to,
      recipient_role: input.recipientRole,
      status: "pending",
      template_key: input.templateKey,
      ...input.related,
    })
    .select("id, status, attempt_count, provider_recipient_email")
    .single();

  if (!error) {
    return data satisfies EmailOutboxRow;
  }

  if (isUniqueViolation(error)) {
    return loadOutboxRow(supabase, input.dedupeKey);
  }

  return null;
}

async function claimAttempt(supabase: Supabase, row: EmailOutboxRow) {
  const { data, error } = await supabase
    .from("email_outbox")
    .update({
      attempt_count: row.attempt_count + 1,
      last_error: null,
      status: "pending",
    })
    .eq("id", row.id)
    .eq("attempt_count", row.attempt_count)
    .neq("status", "sent")
    .select("id, status, attempt_count, provider_recipient_email")
    .maybeSingle();

  if (error) {
    return null;
  }

  return data satisfies EmailOutboxRow | null;
}

async function markSent(
  supabase: Supabase,
  rowId: string,
  providerMessageId: string,
) {
  await supabase
    .from("email_outbox")
    .update({
      last_error: null,
      provider_message_id: providerMessageId,
      sent_at: new Date().toISOString(),
      status: "sent",
    })
    .eq("id", rowId);
}

async function markFailed(supabase: Supabase, rowId: string, error: unknown) {
  await supabase
    .from("email_outbox")
    .update({
      last_error: sanitizeEmailError(error),
      status: "failed",
    })
    .eq("id", rowId)
    .neq("status", "sent");
}

async function enqueueAndSendEmail(
  supabase: Supabase,
  input: OutboxEmailInput,
) {
  const row = await enqueueOutboxRow(supabase, input);

  if (!row || row.status === "sent" || !isEmailEnabled()) {
    return;
  }

  const claimedRow = await claimAttempt(supabase, row);

  if (!claimedRow) {
    return;
  }

  try {
    const result = await sendEmail({
      ...input,
      idempotencyKey: input.dedupeKey,
      to: claimedRow.provider_recipient_email,
    });

    if (result.skipped) {
      return;
    }

    await markSent(supabase, claimedRow.id, result.providerMessageId);
  } catch (error) {
    await markFailed(supabase, claimedRow.id, error);
  }
}

export async function sendProjectRequestSubmittedNotifications(
  supabase: Supabase,
  input: ProjectRequestNotificationInput,
) {
  try {
    if (input.contactMethod === "email") {
      await enqueueAndSendEmail(supabase, {
        ...requesterRequestSubmittedEmail({
          requesterName: input.requesterName,
        }),
        dedupeKey: `request_submitted:student:${input.id}`,
        recipientRole: "student",
        related: { related_project_request_id: input.id },
        templateKey: "request_submitted_student_confirmation",
        to: input.contactValue,
      });
    }

    const adminEmail = getAdminNotificationEmail();

    if (adminEmail) {
      await enqueueAndSendEmail(supabase, {
        ...adminNewRequestEmail(),
        dedupeKey: `request_submitted:admin:${input.id}`,
        recipientRole: "admin",
        related: { related_project_request_id: input.id },
        templateKey: "request_submitted_admin_alert",
        to: adminEmail,
      });
    }
  } catch {
    // Email notification failures must not block successful intake.
  }
}

export async function sendProviderApplicationSubmittedNotifications(
  supabase: Supabase,
  input: ProviderApplicationNotificationInput,
) {
  try {
    if (input.contactMethod === "email") {
      await enqueueAndSendEmail(supabase, {
        ...providerApplicationSubmittedEmail({
          applicantName: input.applicantName,
        }),
        dedupeKey: `provider_application_submitted:provider:${input.id}`,
        recipientRole: "provider",
        related: { related_provider_application_id: input.id },
        templateKey: "provider_application_submitted_provider_confirmation",
        to: input.contactValue,
      });
    }

    const adminEmail = getAdminNotificationEmail();

    if (adminEmail) {
      await enqueueAndSendEmail(supabase, {
        ...adminNewProviderApplicationEmail(),
        dedupeKey: `provider_application_submitted:admin:${input.id}`,
        recipientRole: "admin",
        related: { related_provider_application_id: input.id },
        templateKey: "provider_application_submitted_admin_alert",
        to: adminEmail,
      });
    }
  } catch {
    // Email notification failures must not block successful intake.
  }
}
