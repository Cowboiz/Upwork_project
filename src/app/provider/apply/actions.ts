"use server";

import { redirect } from "next/navigation";
import { sendProviderApplicationSubmittedNotifications } from "@/lib/email/outbox";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  formDataToObject,
  providerApplicationSchema,
} from "@/lib/stage1/validation";

type ProviderApplicationNotificationRow = {
  applicant_name: string;
  contact_method: string;
  contact_value: string;
  id: string;
};

function isUniqueViolation(error: { code?: string } | null) {
  return error?.code === "23505";
}

async function getExistingProviderApplicationBySubmissionId(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  intakeSubmissionId: string,
) {
  const { data, error } = await supabase
    .from("provider_applications")
    .select("id, applicant_name, contact_method, contact_value")
    .eq("intake_submission_id", intakeSubmissionId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data satisfies ProviderApplicationNotificationRow;
}

export async function submitProviderApplication(formData: FormData) {
  const parsed = providerApplicationSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    const message = encodeURIComponent(
      parsed.error.issues[0]?.message ?? "Please check the form and try again.",
    );
    redirect(`/provider/apply?error=${message}`);
  }

  const input = parsed.data;
  const confirmedAt = new Date().toISOString();
  const supabase = createSupabaseAdminClient();

  const { data: providerApplication, error } = await supabase
    .from("provider_applications")
    .insert({
      intake_submission_id: input.intake_submission_id,
      applicant_name: input.applicant_name,
      contact_method: input.contact_method,
      contact_value: input.contact_value,
      skills: input.skills,
      preferred_project_types: input.preferred_project_types,
      portfolio_urls: input.portfolio_urls,
      availability: input.availability,
      rate_expectations: input.rate_expectations,
      source_channel: input.source_channel,
      age_eligible_confirmed: input.age_eligible_confirmed,
      privacy_acknowledged_at: confirmedAt,
      policy_accepted_at: confirmedAt,
    })
    .select("id, applicant_name, contact_method, contact_value")
    .single();

  if (error) {
    if (isUniqueViolation(error)) {
      const existingProviderApplication =
        await getExistingProviderApplicationBySubmissionId(
          supabase,
          input.intake_submission_id,
        );

      if (existingProviderApplication) {
        await sendProviderApplicationSubmittedNotifications(supabase, {
          applicantName: existingProviderApplication.applicant_name,
          contactMethod: existingProviderApplication.contact_method,
          contactValue: existingProviderApplication.contact_value,
          id: existingProviderApplication.id,
        });

        redirect("/provider/apply?submitted=1");
      }
    }

    redirect(
      `/provider/apply?error=${encodeURIComponent("We could not submit your application. Please try again.")}`,
    );
  }

  await sendProviderApplicationSubmittedNotifications(supabase, {
    applicantName: providerApplication.applicant_name,
    contactMethod: providerApplication.contact_method,
    contactValue: providerApplication.contact_value,
    id: providerApplication.id,
  });

  redirect("/provider/apply?submitted=1");
}
