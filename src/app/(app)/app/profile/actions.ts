"use server";

import { redirect } from "next/navigation";
import { parseProfileUpdateInput } from "@/lib/auth/profile";
import { requireUser } from "@/lib/auth/user";

function profileRedirect(params: Record<string, string>): never {
  redirect(`/app/profile?${new URLSearchParams(params).toString()}`);
}

export async function updateProfile(formData: FormData) {
  const parsed = parseProfileUpdateInput(Object.fromEntries(formData.entries()));

  if (!parsed.success) {
    profileRedirect({
      error: parsed.error.issues[0]?.message ?? "Check your profile details.",
    });
  }

  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("update_my_profile", {
    p_full_name: parsed.data.fullName ?? "",
    p_username: parsed.data.username ?? "",
  });

  if (error) {
    profileRedirect({
      error: "We could not update your profile. Please try again.",
    });
  }

  profileRedirect({ updated: "1" });
}
