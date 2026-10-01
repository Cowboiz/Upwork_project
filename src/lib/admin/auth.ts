import "server-only";

import { redirect } from "next/navigation";
import { getCanonicalLoginRedirectForAdminArea } from "@/lib/auth/user-shared";
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

  return {
    supabase,
    userId,
  };
}
