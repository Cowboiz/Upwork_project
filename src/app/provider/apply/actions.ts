"use server";

import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  formDataToObject,
  providerApplicationSchema,
} from "@/lib/stage1/validation";

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

  const { error } = await createSupabaseAdminClient()
    .from("provider_applications")
    .insert({
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
    });

  if (error) {
    redirect(
      `/provider/apply?error=${encodeURIComponent("We could not submit your application. Please try again.")}`,
    );
  }

  redirect("/provider/apply?submitted=1");
}
