"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import {
  canUseAuthenticatedLogin,
  getPostLoginRedirect,
  isUserRole,
  toAuthenticatedProfile,
} from "@/lib/auth/user-shared";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { getTrustedClientIp } from "@/lib/security/request-ip";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
  redirectTo: z.string().optional(),
});

function loginErrorRedirect(message: string, redirectTo?: string): never {
  const params = new URLSearchParams({ error: message });

  if (redirectTo) {
    params.set("next", redirectTo);
  }

  redirect(`/login?${params.toString()}`);
}

async function enforceLoginRateLimit() {
  const clientIp = await getTrustedClientIp();

  return checkRateLimit({
    action: "user_login_ip",
    identifier: clientIp,
    limit: 10,
    windowSeconds: 900,
  });
}

export async function loginUser(formData: FormData) {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!parsed.success) {
    loginErrorRedirect(
      parsed.error.issues[0]?.message ?? "Check your login details.",
      formData.get("redirectTo")?.toString(),
    );
  }

  let loginLimitAllowed = false;

  try {
    loginLimitAllowed = (await enforceLoginRateLimit()).allowed;
  } catch {
    loginErrorRedirect(
      "We could not process your login. Please try again.",
      parsed.data.redirectTo,
    );
  }

  if (!loginLimitAllowed) {
    loginErrorRedirect(
      "Too many login attempts. Please try again later.",
      parsed.data.redirectTo,
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (signInError) {
    loginErrorRedirect(
      "Email or password was not recognized.",
      parsed.data.redirectTo,
    );
  }

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;

  if (claimsError || !userId) {
    await supabase.auth.signOut();
    loginErrorRedirect("We could not verify your session. Please try again.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, account_status, full_name, role, username")
    .eq("id", userId)
    .single();

  if (profileError || !profile || !isUserRole(profile.role)) {
    await supabase.auth.signOut();
    loginErrorRedirect("We could not verify your account. Please try again.");
  }

  const authenticatedProfile = toAuthenticatedProfile(profile);

  if (!canUseAuthenticatedLogin(authenticatedProfile)) {
    await supabase.auth.signOut();
    redirect("/login?account_disabled=1");
  }

  const safeRedirect = getPostLoginRedirect(
    parsed.data.redirectTo,
    authenticatedProfile.role,
  );

  redirect(safeRedirect);
}

export async function logoutUser() {
  const supabase = await createSupabaseServerClient();

  await supabase.auth.signOut();

  redirect("/");
}
