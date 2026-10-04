"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { normalizeSignupRole } from "@/lib/auth/registration";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { getTrustedClientIp } from "@/lib/security/request-ip";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const registerSchema = z
  .object({
    accountRole: z.enum(["student", "freelancer", "both"]),
    confirmPassword: z.string().min(1, "Confirm your password."),
    email: z.email("Enter a valid email address."),
    fullName: z.string().trim().min(1, "Enter your name.").max(120),
    password: z.string().min(12, "Use at least 12 characters."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

function registerRedirect(params: Record<string, string>): never {
  const searchParams = new URLSearchParams(params);

  redirect(`/register?${searchParams.toString()}`);
}

async function enforceRegisterRateLimit() {
  const clientIp = await getTrustedClientIp();

  return checkRateLimit({
    action: "account_register_ip",
    identifier: clientIp,
    limit: 5,
    windowSeconds: 900,
  });
}

export async function registerUser(formData: FormData) {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!parsed.success) {
    registerRedirect({
      error: parsed.error.issues[0]?.message ?? "Check your registration details.",
    });
  }

  try {
    const limit = await enforceRegisterRateLimit();

    if (!limit.allowed) {
      registerRedirect({
        error: "Too many account creation attempts. Please try again later.",
      });
    }
  } catch {
    registerRedirect({
      error: "We could not process your registration. Please try again.",
    });
  }

  const accountRole = normalizeSignupRole(parsed.data.accountRole);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        account_role: accountRole,
        full_name: parsed.data.fullName,
      },
    },
  });

  if (error) {
    registerRedirect({
      error: "We could not create that account. Please try again.",
    });
  }

  if (data.session) {
    redirect("/app");
  }

  registerRedirect({
    check_email: "1",
  });
}
