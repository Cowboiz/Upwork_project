import "server-only";

import { redirect } from "next/navigation";
import {
  getCanonicalLoginRedirectForAdminArea,
  isUserRole,
  toAuthenticatedProfile,
} from "@/lib/auth/user-shared";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  const userId = claimsData?.claims.sub;

  if (claimsError || !userId) {
    redirect(getCanonicalLoginRedirectForAdminArea());
  }

  const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin");

  if (adminError || !isAdmin) {
    redirect("/app");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, account_status, full_name, role, username")
    .eq("id", userId)
    .single();

  if (profileError || !profile || !isUserRole(profile.role)) {
    await supabase.auth.signOut();
    redirect(getCanonicalLoginRedirectForAdminArea());
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
    userId,
  };
}
