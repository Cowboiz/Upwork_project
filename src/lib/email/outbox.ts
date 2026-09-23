import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import {
  buildExistingProviderResponseUrl,
  buildProviderResponseUrl,
} from "@/lib/provider-response/tokens";
import {
  buildExistingStudentDecisionUrl,
  buildStudentDecisionUrl,
} from "@/lib/student-decision/tokens";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
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
  providerContactedEmail,
  providerApplicationSubmittedEmail,
  requesterRequestSubmittedEmail,
  shortlistPresentedEmail,
} from "./templates";

type Supabase = SupabaseClient<Database>;
type EmailOutboxRow = Pick<
  Database["public"]["Tables"]["email_outbox"]["Row"],
  "attempt_count" | "id" | "provider_recipient_email" | "status"
>;
type RetryEmailOutboxRow = Pick<
  Database["public"]["Tables"]["email_outbox"]["Row"],
  | "attempt_count"
  | "dedupe_key"
  | "id"
  | "provider_recipient_email"
  | "recipient_role"
  | "related_project_request_id"
  | "related_provider_application_id"
  | "related_request_candidate_id"
  | "status"
  | "template_key"
>;
type RecipientRole = "admin" | "provider" | "student";

export type RetryFailedEmailResult = {
  message: string;
  status:
    | "already_sent"
    | "disabled"
    | "failed"
    | "finalization_error"
    | "in_progress"
    | "not_failed"
    | "not_found"
    | "sent";
};

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

type ProviderContactedNotificationInput = {
  budgetRange: string;
  budgetCurrency: string;
  candidateId: string;
  contactMethod: string;
  contactValue: string;
  deadline: string | null;
  deadlineFlexible: boolean;
  projectCategory: string;
  projectRequestId: string;
  proposedCurrency: string;
  proposedPrice: number | null;
  providerApplicationId: string;
  providerName: string;
  scopeSummary: string | null;
};

type ShortlistPresentedNotificationInput = {
  availability: string;
  candidateId: string;
  candidateRank: number;
  contactMethod: string;
  contactValue: string;
  currency: string;
  projectRequestId: string;
  proposedPrice: number | null;
  providerApplicationId: string;
  providerName: string;
  rateExpectations: string;
  scopeSummary: string | null;
  skills: string[];
};

function sanitizeEmailError(error: unknown) {
  if (error instanceof Error && error.message.startsWith("Missing required")) {
    return error.message.slice(0, 300);
  }

  if (error instanceof Error && error.message.startsWith("Email retry")) {
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

async function loadRetryOutboxRow(supabase: Supabase, outboxId: string) {
  const { data, error } = await supabase
    .from("email_outbox")
    .select(
      "id, dedupe_key, template_key, recipient_role, provider_recipient_email, related_project_request_id, related_provider_application_id, related_request_candidate_id, status, attempt_count",
    )
    .eq("id", outboxId)
    .maybeSingle();

  if (error) {
    return null;
  }

  return data satisfies RetryEmailOutboxRow | null;
}

async function claimFailedRetry(
  supabase: Supabase,
  row: RetryEmailOutboxRow,
) {
  const { data, error } = await supabase
    .from("email_outbox")
    .update({
      attempt_count: row.attempt_count + 1,
      last_error: null,
      status: "pending",
    })
    .eq("id", row.id)
    .eq("status", "failed")
    .eq("attempt_count", row.attempt_count)
    .select(
      "id, dedupe_key, template_key, recipient_role, provider_recipient_email, related_project_request_id, related_provider_application_id, related_request_candidate_id, status, attempt_count",
    )
    .maybeSingle();

  if (error) {
    return null;
  }

  return data satisfies RetryEmailOutboxRow | null;
}

async function markRetrySent(
  supabase: Supabase,
  row: RetryEmailOutboxRow,
  providerMessageId: string,
) {
  const { data, error } = await supabase
    .from("email_outbox")
    .update({
      last_error: null,
      provider_message_id: providerMessageId,
      sent_at: new Date().toISOString(),
      status: "sent",
    })
    .eq("id", row.id)
    .eq("status", "pending")
    .eq("attempt_count", row.attempt_count)
    .select(
      "id, dedupe_key, template_key, recipient_role, provider_recipient_email, related_project_request_id, related_provider_application_id, related_request_candidate_id, status, attempt_count",
    )
    .maybeSingle();

  if (error) {
    return null;
  }

  return data satisfies RetryEmailOutboxRow | null;
}

async function markRetryFailed(
  supabase: Supabase,
  row: RetryEmailOutboxRow,
  error: unknown,
) {
  const { data, error: updateError } = await supabase
    .from("email_outbox")
    .update({
      last_error: sanitizeEmailError(error),
      status: "failed",
    })
    .eq("id", row.id)
    .eq("status", "pending")
    .eq("attempt_count", row.attempt_count)
    .select(
      "id, dedupe_key, template_key, recipient_role, provider_recipient_email, related_project_request_id, related_provider_application_id, related_request_candidate_id, status, attempt_count",
    )
    .maybeSingle();

  if (updateError) {
    return null;
  }

  return data satisfies RetryEmailOutboxRow | null;
}

function retryFailure(message: string): never {
  throw new Error(`Email retry failed: ${message}`);
}

async function reconstructProjectRequestEmail(
  supabase: Supabase,
  row: RetryEmailOutboxRow,
) {
  if (!row.related_project_request_id) {
    retryFailure("missing related request.");
  }

  const { data: request, error } = await supabase
    .from("project_requests")
    .select("id, requester_name")
    .eq("id", row.related_project_request_id)
    .maybeSingle();

  if (error || !request) {
    retryFailure("request data unavailable.");
  }

  return requesterRequestSubmittedEmail({
    requesterName: request.requester_name,
  });
}

async function reconstructProviderApplicationEmail(
  supabase: Supabase,
  row: RetryEmailOutboxRow,
) {
  if (!row.related_provider_application_id) {
    retryFailure("missing related provider application.");
  }

  const { data: provider, error } = await supabase
    .from("provider_applications")
    .select("id, applicant_name")
    .eq("id", row.related_provider_application_id)
    .maybeSingle();

  if (error || !provider) {
    retryFailure("provider application data unavailable.");
  }

  return providerApplicationSubmittedEmail({
    applicantName: provider.applicant_name,
  });
}

async function reconstructProviderContactedEmail(
  supabase: Supabase,
  row: RetryEmailOutboxRow,
) {
  if (
    !row.related_project_request_id ||
    !row.related_provider_application_id ||
    !row.related_request_candidate_id
  ) {
    retryFailure("missing related provider contact records.");
  }

  const [
    { data: request, error: requestError },
    { data: provider, error: providerError },
    { data: candidate, error: candidateError },
  ] = await Promise.all([
    supabase
      .from("project_requests")
      .select("id, category, budget_range, currency, deadline, deadline_flexible")
      .eq("id", row.related_project_request_id)
      .maybeSingle(),
    supabase
      .from("provider_applications")
      .select("id, applicant_name")
      .eq("id", row.related_provider_application_id)
      .maybeSingle(),
    supabase
      .from("request_candidates")
      .select("id, scope_summary, proposed_price, currency")
      .eq("id", row.related_request_candidate_id)
      .maybeSingle(),
  ]);

  if (requestError || providerError || candidateError) {
    retryFailure("provider contact data unavailable.");
  }

  if (!request || !provider || !candidate) {
    retryFailure("provider contact data unavailable.");
  }

  const responseUrl = await buildExistingProviderResponseUrl(
    supabase,
    candidate.id,
  );

  if (!responseUrl) {
    retryFailure("Response link is no longer valid for retry.");
  }

  return providerContactedEmail({
    budgetRange: request.budget_range,
    budgetCurrency: request.currency,
    deadline: request.deadline,
    deadlineFlexible: request.deadline_flexible,
    projectCategory: request.category,
    proposedCurrency: candidate.currency,
    proposedPrice: candidate.proposed_price,
    providerName: provider.applicant_name,
    responseUrl,
    scopeSummary: candidate.scope_summary,
  });
}

async function reconstructShortlistPresentedEmail(
  supabase: Supabase,
  row: RetryEmailOutboxRow,
) {
  if (
    !row.related_project_request_id ||
    !row.related_provider_application_id ||
    !row.related_request_candidate_id
  ) {
    retryFailure("missing related shortlist records.");
  }

  const [
    { data: provider, error: providerError },
    { data: candidate, error: candidateError },
  ] = await Promise.all([
    supabase
      .from("provider_applications")
      .select("id, applicant_name, skills, availability, rate_expectations")
      .eq("id", row.related_provider_application_id)
      .maybeSingle(),
    supabase
      .from("request_candidates")
      .select("id, candidate_rank, scope_summary, proposed_price, currency")
      .eq("id", row.related_request_candidate_id)
      .maybeSingle(),
  ]);

  if (providerError || candidateError) {
    retryFailure("shortlist data unavailable.");
  }

  if (!provider || !candidate || candidate.candidate_rank === null) {
    retryFailure("shortlist data unavailable.");
  }

  const decisionUrl = await buildExistingStudentDecisionUrl(
    supabase,
    candidate.id,
  );

  if (!decisionUrl) {
    retryFailure("Response link is no longer valid for retry.");
  }

  return shortlistPresentedEmail({
    availability: provider.availability,
    candidateRank: candidate.candidate_rank,
    currency: candidate.currency,
    decisionUrl,
    proposedPrice: candidate.proposed_price,
    providerName: provider.applicant_name,
    rateExpectations: provider.rate_expectations,
    scopeSummary: candidate.scope_summary,
    skills: provider.skills,
  });
}

async function reconstructRetryEmail(
  supabase: Supabase,
  row: RetryEmailOutboxRow,
) {
  switch (row.template_key) {
    case "request_submitted_student_confirmation":
      return reconstructProjectRequestEmail(supabase, row);
    case "request_submitted_admin_alert":
      return adminNewRequestEmail();
    case "provider_application_submitted_provider_confirmation":
      return reconstructProviderApplicationEmail(supabase, row);
    case "provider_application_submitted_admin_alert":
      return adminNewProviderApplicationEmail();
    case "provider_contacted_provider":
      return reconstructProviderContactedEmail(supabase, row);
    case "shortlist_presented_student":
      return reconstructShortlistPresentedEmail(supabase, row);
    default:
      retryFailure("unsupported template.");
  }
}

function retryResultForCurrentState(
  row: RetryEmailOutboxRow | null,
): RetryFailedEmailResult {
  if (!row) {
    return {
      message: "Email outbox row was not found.",
      status: "not_found",
    };
  }

  if (row.status === "sent") {
    return {
      message: "Email has already been sent.",
      status: "already_sent",
    };
  }

  if (row.status === "pending") {
    return {
      message: "Email retry is already in progress.",
      status: "in_progress",
    };
  }

  return {
    message: "Email is not currently eligible for retry.",
    status: "not_failed",
  };
}

async function retryFailedResultAfterFinalizationMiss(
  supabase: Supabase,
  row: RetryEmailOutboxRow,
): Promise<RetryFailedEmailResult> {
  const currentRow = await loadRetryOutboxRow(supabase, row.id);

  if (currentRow?.status === "sent") {
    return {
      message: "Email has already been sent.",
      status: "sent",
    };
  }

  return {
    message: "Email retry state could not be finalized. Check the outbox row before retrying.",
    status: "finalization_error",
  };
}

async function finalizeRetryFailure(
  supabase: Supabase,
  row: RetryEmailOutboxRow,
  error: unknown,
): Promise<RetryFailedEmailResult> {
  const failedRow = await markRetryFailed(supabase, row, error);

  if (failedRow) {
    return {
      message: "Email retry failed. Check the sanitized error in the outbox row.",
      status: "failed",
    };
  }

  return retryFailedResultAfterFinalizationMiss(supabase, row);
}

export async function retryFailedEmailOutboxRow(
  outboxId: string,
): Promise<RetryFailedEmailResult> {
  const supabase = createSupabaseAdminClient();
  const row = await loadRetryOutboxRow(supabase, outboxId);

  if (!row) {
    return retryResultForCurrentState(row);
  }

  if (row.status !== "failed") {
    return retryResultForCurrentState(row);
  }

  if (!isEmailEnabled()) {
    return {
      message: "Email delivery is disabled. Enable email before retrying.",
      status: "disabled",
    };
  }

  const claimedRow = await claimFailedRetry(supabase, row);

  if (!claimedRow) {
    const currentRow = await loadRetryOutboxRow(supabase, row.id);

    return retryResultForCurrentState(currentRow);
  }

  try {
    const message = await reconstructRetryEmail(supabase, claimedRow);
    const result = await sendEmail({
      ...message,
      idempotencyKey: claimedRow.dedupe_key,
      to: claimedRow.provider_recipient_email,
    });

    if (result.skipped) {
      return finalizeRetryFailure(
        supabase,
        claimedRow,
        new Error("Email retry failed: email delivery is disabled."),
      );
    }

    const sentRow = await markRetrySent(
      supabase,
      claimedRow,
      result.providerMessageId,
    );

    if (!sentRow) {
      const recoveryResult = await finalizeRetryFailure(
        supabase,
        claimedRow,
        new Error(
          "Email retry failed: Email was submitted but delivery state could not be finalized.",
        ),
      );

      if (
        recoveryResult.status === "failed" ||
        recoveryResult.status === "sent"
      ) {
        return recoveryResult;
      }

      return {
        message: "Email was submitted but delivery state could not be finalized. Check provider and outbox state before retrying.",
        status: "finalization_error",
      };
    }

    return {
      message: "Email retry sent.",
      status: "sent",
    };
  } catch (error) {
    return finalizeRetryFailure(supabase, claimedRow, error);
  }
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

export async function sendProviderContactedNotification(
  input: ProviderContactedNotificationInput,
) {
  try {
    if (input.contactMethod !== "email") {
      return;
    }

    const supabase = createSupabaseAdminClient();
    const responseUrl = await buildProviderResponseUrl(
      supabase,
      input.candidateId,
    );

    if (!responseUrl) {
      return;
    }

    await enqueueAndSendEmail(supabase, {
      ...providerContactedEmail({
        budgetRange: input.budgetRange,
        budgetCurrency: input.budgetCurrency,
        deadline: input.deadline,
        deadlineFlexible: input.deadlineFlexible,
        projectCategory: input.projectCategory,
        proposedCurrency: input.proposedCurrency,
        proposedPrice: input.proposedPrice,
        providerName: input.providerName,
        responseUrl,
        scopeSummary: input.scopeSummary,
      }),
      dedupeKey: `provider_contacted:provider:${input.candidateId}`,
      recipientRole: "provider",
      related: {
        related_project_request_id: input.projectRequestId,
        related_provider_application_id: input.providerApplicationId,
        related_request_candidate_id: input.candidateId,
      },
      templateKey: "provider_contacted_provider",
      to: input.contactValue,
    });
  } catch {
    // Email notification failures must not block successful workflow updates.
  }
}

export async function sendShortlistPresentedNotification(
  input: ShortlistPresentedNotificationInput,
) {
  try {
    if (input.contactMethod !== "email") {
      return;
    }

    const supabase = createSupabaseAdminClient();
    const decisionUrl = await buildStudentDecisionUrl(supabase, input.candidateId);

    if (!decisionUrl) {
      return;
    }

    await enqueueAndSendEmail(supabase, {
      ...shortlistPresentedEmail({
        availability: input.availability,
        candidateRank: input.candidateRank,
        currency: input.currency,
        decisionUrl,
        proposedPrice: input.proposedPrice,
        providerName: input.providerName,
        rateExpectations: input.rateExpectations,
        scopeSummary: input.scopeSummary,
        skills: input.skills,
      }),
      dedupeKey: `shortlist_presented:student:${input.candidateId}`,
      recipientRole: "student",
      related: {
        related_project_request_id: input.projectRequestId,
        related_provider_application_id: input.providerApplicationId,
        related_request_candidate_id: input.candidateId,
      },
      templateKey: "shortlist_presented_student",
      to: input.contactValue,
    });
  } catch {
    // Email notification failures must not block successful workflow updates.
  }
}
