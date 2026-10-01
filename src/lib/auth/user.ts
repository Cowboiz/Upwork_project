import "server-only";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export type { AuthenticatedProfile, AuthenticatedUser, UserRole } from "./user-shared";
export {
  getPostLoginRedirect,
  isUserRole,
  normalizeUserRole,
  toAuthenticatedProfile,
} from "./user-shared";
import { toAuthenticatedProfile } from "./user-shared";

export async function requireUser() {
  const supabase = await createSupabaseServerClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;

  if (claimsError || !userId) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, role, username")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    await supabase.auth.signOut();
    redirect("/login");
  }

  return {
    supabase,
    user: {
      id: userId,
      email:
        typeof claimsData.claims.email === "string"
          ? claimsData.claims.email
          : null,
      profile: toAuthenticatedProfile(profile),
    },
  };
}
