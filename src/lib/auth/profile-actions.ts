"use server";

import { redirect } from "next/navigation";
import { parseProfileUpdateInput } from "@/lib/auth/profile";
import { requireAccount } from "@/lib/auth/user";

function getProfilePath(role: string) {
  return role === "admin" ? "/admin/profile" : "/app/profile";
}

function profileRedirect(path: string, params: Record<string, string>): never {
  redirect(`${path}?${new URLSearchParams(params).toString()}`);
}

export async function updateProfile(formData: FormData) {
  const parsed = parseProfileUpdateInput(Object.fromEntries(formData.entries()));
  const { supabase, user } = await requireAccount();
  const profilePath = getProfilePath(user.profile.role);

  if (!parsed.success) {
    profileRedirect(profilePath, {
      error: parsed.error.issues[0]?.message ?? "Check your profile details.",
    });
  }

  const { error } = await supabase.rpc("update_my_profile", {
    p_full_name: parsed.data.fullName ?? "",
    p_username: parsed.data.username ?? "",
  });

  if (error) {
    profileRedirect(profilePath, {
      error: "We could not update your profile. Please try again.",
    });
  }

  profileRedirect(profilePath, { updated: "1" });
}
