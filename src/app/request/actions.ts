"use server";

import { redirect } from "next/navigation";
import { sendProjectRequestSubmittedNotifications } from "@/lib/email/outbox";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { getTrustedClientIp } from "@/lib/security/request-ip";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { formDataToObject, projectRequestSchema } from "@/lib/stage1/validation";

type ProjectRequestNotificationRow = {
  contact_method: string;
  contact_value: string;
  id: string;
  requester_name: string;
};

function isUniqueViolation(error: { code?: string } | null) {
  return error?.code === "23505";
}

function contactRateLimitIdentifier({
  contactMethod,
  contactValue,
}: {
  contactMethod: string;
  contactValue: string;
}) {
  return `${contactMethod}\n${contactValue.trim()}`;
}

async function enforceProjectRequestRateLimit(input: {
  contact_method: string;
  contact_value: string;
}) {
  const clientIp = await getTrustedClientIp();
  const ipLimit = await checkRateLimit({
    action: "project_request_submit_ip",
    identifier: clientIp,
    limit: 30,
    windowSeconds: 3600,
  });

  if (!ipLimit.allowed) {
    return false;
  }

  const contactLimit = await checkRateLimit({
    action: "project_request_submit_contact",
    identifier: contactRateLimitIdentifier({
      contactMethod: input.contact_method,
      contactValue: input.contact_value,
    }),
    limit: 5,
    windowSeconds: 3600,
  });

  return contactLimit.allowed;
}

async function getExistingRequestBySubmissionId(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  intakeSubmissionId: string,
) {
  const { data, error } = await supabase
    .from("project_requests")
    .select("id, requester_name, contact_method, contact_value")
    .eq("intake_submission_id", intakeSubmissionId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data satisfies ProjectRequestNotificationRow;
}

export async function submitProjectRequest(formData: FormData) {
  const parsed = projectRequestSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    const message = encodeURIComponent(
      parsed.error.issues[0]?.message ?? "Please check the form and try again.",
    );
    redirect(`/request?error=${message}`);
  }

  const input = parsed.data;
  const supabase = createSupabaseAdminClient();
  let allowed = false;

  try {
    allowed = await enforceProjectRequestRateLimit(input);
  } catch {
    redirect(
      `/request?error=${encodeURIComponent("We could not submit your request. Please try again.")}`,
    );
  }

  if (!allowed) {
    redirect(
      `/request?error=${encodeURIComponent("Too many submissions. Please try again later.")}`,
    );
  }

  const { data: request, error } = await supabase
    .from("project_requests")
    .insert({
      intake_submission_id: input.intake_submission_id,
      requester_name: input.requester_name,
      contact_method: input.contact_method,
      contact_value: input.contact_value,
      school_or_context: input.school_or_context,
      category: input.category,
      description: input.description,
      desired_deliverables: input.desired_deliverables,
      deadline: input.deadline,
      deadline_flexible: input.deadline_flexible,
      budget_range: input.budget_range,
      currency: input.currency,
      asset_links: input.asset_links,
      source_channel: input.source_channel,
      contact_permission_confirmed: input.contact_permission_confirmed,
      age_eligible_confirmed: input.age_eligible_confirmed,
      integrity_attested: input.integrity_attested,
    })
    .select("id, requester_name, contact_method, contact_value")
    .single();

  if (error) {
    if (isUniqueViolation(error)) {
      const existingRequest = await getExistingRequestBySubmissionId(
        supabase,
        input.intake_submission_id,
      );

      if (existingRequest) {
        await sendProjectRequestSubmittedNotifications(supabase, {
          contactMethod: existingRequest.contact_method,
          contactValue: existingRequest.contact_value,
          id: existingRequest.id,
          requesterName: existingRequest.requester_name,
        });

        redirect("/request?submitted=1");
      }
    }

    redirect(
      `/request?error=${encodeURIComponent("We could not submit your request. Please try again.")}`,
    );
  }

  await sendProjectRequestSubmittedNotifications(supabase, {
    contactMethod: request.contact_method,
    contactValue: request.contact_value,
    id: request.id,
    requesterName: request.requester_name,
  });

  redirect("/request?submitted=1");
}
