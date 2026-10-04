import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

type Supabase = SupabaseClient<Database>;

export type EngagementParticipants = {
  engagementId: string;
  providerProfileId: string | null;
  requestCandidateId: string;
  studentProfileId: string | null;
};

export async function resolveEngagementParticipants(
  supabase: Supabase,
  engagementId: string,
): Promise<EngagementParticipants | null> {
  const { data: engagement, error: engagementError } = await supabase
    .from("project_engagements")
    .select("id, request_candidate_id")
    .eq("id", engagementId)
    .maybeSingle();

  if (engagementError || !engagement) {
    return null;
  }

  const { data: candidate, error: candidateError } = await supabase
    .from("request_candidates")
    .select(
      "id, project_request_id, provider_application_id, linked_provider_profile_id",
    )
    .eq("id", engagement.request_candidate_id)
    .maybeSingle();

  if (candidateError || !candidate) {
    return null;
  }

  const [{ data: request }, { data: providerApplication }] = await Promise.all([
    supabase
      .from("project_requests")
      .select("linked_student_profile_id")
      .eq("id", candidate.project_request_id)
      .maybeSingle(),
    candidate.provider_application_id
      ? supabase
          .from("provider_applications")
          .select("linked_provider_profile_id")
          .eq("id", candidate.provider_application_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    engagementId: engagement.id,
    providerProfileId:
      candidate.linked_provider_profile_id ??
      providerApplication?.linked_provider_profile_id ??
      null,
    requestCandidateId: candidate.id,
    studentProfileId: request?.linked_student_profile_id ?? null,
  };
}
