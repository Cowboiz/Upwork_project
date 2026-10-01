"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import {
  getPostLoginRedirect,
  toAuthenticatedProfile,
} from "@/lib/auth/user-shared";
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

export async function loginUser(formData: FormData) {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!parsed.success) {
    loginErrorRedirect(
      parsed.error.issues[0]?.message ?? "Check your login details.",
      formData.get("redirectTo")?.toString(),
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
    .select("id, full_name, role, username")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    await supabase.auth.signOut();
    loginErrorRedirect("We could not verify your account. Please try again.");
  }

  const safeRedirect = getPostLoginRedirect(
    parsed.data.redirectTo,
    toAuthenticatedProfile(profile).role,
  );

  redirect(safeRedirect);
}

export async function logoutUser() {
  const supabase = await createSupabaseServerClient();

  await supabase.auth.signOut();

  redirect("/");
}
