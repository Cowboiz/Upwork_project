import { redirect } from "next/navigation";
import { getCanonicalLoginRedirectForAdminArea } from "@/lib/auth/user-shared";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminLoginPage() {
  const supabase = await createSupabaseServerClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims.sub) {
    redirect(getCanonicalLoginRedirectForAdminArea());
  }

  const { data: isAdmin } = await supabase.rpc("is_admin");

  if (isAdmin) {
    redirect("/admin/requests");
  }

  redirect("/app");
}
