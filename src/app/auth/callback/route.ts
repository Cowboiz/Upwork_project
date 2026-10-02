import { NextResponse, type NextRequest } from "next/server";
import {
  AUTH_CONFIRMATION_ERROR_PATH,
  getPostConfirmationRedirectForRole,
} from "@/lib/auth/email-confirmation";
import {
  isUserRole,
  toAuthenticatedProfile,
} from "@/lib/auth/user-shared";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.url));
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next");

  if (!code) {
    return redirectTo(request, AUTH_CONFIRMATION_ERROR_PATH);
  }

  const supabase = await createSupabaseServerClient();
  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    return redirectTo(request, AUTH_CONFIRMATION_ERROR_PATH);
  }

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;

  if (claimsError || !userId) {
    await supabase.auth.signOut();

    return redirectTo(request, AUTH_CONFIRMATION_ERROR_PATH);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, role, username")
    .eq("id", userId)
    .single();

  if (profileError || !profile || !isUserRole(profile.role)) {
    await supabase.auth.signOut();

    return redirectTo(request, AUTH_CONFIRMATION_ERROR_PATH);
  }

  const redirectPath = getPostConfirmationRedirectForRole({
    next,
    role: toAuthenticatedProfile(profile).role,
  });

  return redirectTo(request, redirectPath);
}
