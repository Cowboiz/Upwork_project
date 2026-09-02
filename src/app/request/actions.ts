"use server";

import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { formDataToObject, projectRequestSchema } from "@/lib/stage1/validation";

export async function submitProjectRequest(formData: FormData) {
  const parsed = projectRequestSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    const message = encodeURIComponent(
      parsed.error.issues[0]?.message ?? "Please check the form and try again.",
    );
    redirect(`/request?error=${message}`);
  }

  const input = parsed.data;

  const { error } = await createSupabaseAdminClient()
    .from("project_requests")
    .insert({
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
    });

  if (error) {
    redirect(
      `/request?error=${encodeURIComponent("We could not submit your request. Please try again.")}`,
    );
  }

  redirect("/request?submitted=1");
}
