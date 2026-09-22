"use server";

import { redirect } from "next/navigation";
import { sendProjectRequestSubmittedNotifications } from "@/lib/email/outbox";
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
