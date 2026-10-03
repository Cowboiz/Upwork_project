import "server-only";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export type {
  AuthenticatedProfile,
  AuthenticatedUser,
  UserRole,
} from "./user-shared";
export {
  getAdminAreaRedirectForRole,
  getCanonicalLoginRedirectForAdminArea,
  getPostLoginRedirect,
  getUserAppRedirectForRole,
  canUseAppWorkspace,
  isAppUserRole,
  isUserRole,
  normalizeUserRole,
  toAuthenticatedProfile,
} from "./user-shared";
import {
  getUserAppRedirectForRole,
  isUserRole,
  toAuthenticatedProfile,
  canUseAppWorkspace,
} from "./user-shared";

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
    .select("id, account_status, full_name, role, username")
    .eq("id", userId)
    .single();

  if (profileError || !profile || !isUserRole(profile.role)) {
    await supabase.auth.signOut();
    redirect("/login");
  }

  const profileResult = toAuthenticatedProfile(profile);
  const roleRedirect = getUserAppRedirectForRole(profileResult.role);

  if (roleRedirect) {
    redirect(roleRedirect);
  }

  if (!canUseAppWorkspace(profileResult)) {
    await supabase.auth.signOut();
    redirect("/login?account_disabled=1");
  }

  return {
    supabase,
    user: {
      id: userId,
      email:
        typeof claimsData.claims.email === "string"
          ? claimsData.claims.email
          : null,
      profile: profileResult,
    },
  };
}

export async function requireAccount() {
  const supabase = await createSupabaseServerClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;

  if (claimsError || !userId) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, account_status, full_name, role, username")
    .eq("id", userId)
    .single();

  if (profileError || !profile || !isUserRole(profile.role)) {
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

export async function getOptionalUser() {
  const supabase = await createSupabaseServerClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;

  if (claimsError || !userId) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, account_status, full_name, role, username")
    .eq("id", userId)
    .single();

  if (profileError || !profile || !isUserRole(profile.role)) {
    return null;
  }

  return {
    id: userId,
    email:
      typeof claimsData.claims.email === "string"
        ? claimsData.claims.email
        : null,
    profile: toAuthenticatedProfile(profile),
  };
}
