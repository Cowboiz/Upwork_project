"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { verifyEngagementAccessBearerToken } from "@/lib/engagement/tokens";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type ProviderEngagementRpcClient = {
  rpc(
    functionName: "start_engagement_work",
    args: {
      p_token_id: string;
    },
  ): Promise<{
    error: {
      message: string;
    } | null;
  }>;
  rpc(
    functionName: "submit_engagement_deliverable",
    args: {
      p_deliverable_summary?: string;
      p_deliverable_url?: string;
      p_token_id: string;
    },
  ): Promise<{
    error: {
      message: string;
    } | null;
  }>;
};

const tokenSchema = z.object({
  token: z.string().trim().min(1, "Missing engagement token."),
});

const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .transform((value) => (value.length > 0 ? value : null));

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

const submitDeliverableSchema = tokenSchema.extend({
  deliverable_summary: optionalText(
    5000,
    "Use 5000 characters or fewer for the deliverable summary.",
  ),
  deliverable_url: optionalText(
    2000,
    "Use 2000 characters or fewer for the deliverable URL.",
  ).refine(
    (value) => value === null || isHttpUrl(value),
    "Use an http:// or https:// deliverable URL.",
  ),
});

function formDataObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

function redirectToProviderPage(
  token: string,
  params: Record<string, string>,
): never {
  const searchParams = new URLSearchParams({ token, ...params });

  redirect(`/engagement/provider?${searchParams.toString()}`);
}

function redirectInvalid(): never {
  redirect("/engagement/provider?error=invalid");
}

function friendlyEngagementError(message: string) {
  if (message.includes("token_expired")) {
    return "expired";
  }

  if (
    message.includes("token_revoked") ||
    message.includes("engagement_closed") ||
    message.includes("engagement_not_started")
  ) {
    return "closed";
  }

  if (
    message.includes("deliverable_required") ||
    message.includes("deliverable_url_too_long") ||
    message.includes("deliverable_summary_too_long") ||
    message.includes("deliverable_url_invalid")
  ) {
    return "invalid_deliverable";
  }

  if (message.includes("deliverable_conflict")) {
    return "conflict";
  }

  return "invalid";
}

export async function startProviderEngagementWork(formData: FormData) {
  const parsed = tokenSchema.safeParse(formDataObject(formData));

  if (!parsed.success) {
    redirectInvalid();
  }

  const verified = await verifyEngagementAccessBearerToken(
    parsed.data.token,
    "provider",
  );

  if (!verified.ok) {
    redirectToProviderPage(parsed.data.token, { error: verified.reason });
  }

  const { error } = await (
    createSupabaseAdminClient() as unknown as ProviderEngagementRpcClient
  ).rpc("start_engagement_work", {
    p_token_id: verified.tokenId,
  });

  if (error) {
    redirectToProviderPage(parsed.data.token, {
      error: friendlyEngagementError(error.message),
    });
  }

  revalidatePath("/engagement/provider");
  redirectToProviderPage(parsed.data.token, { saved: "started" });
}

export async function submitProviderEngagementDeliverable(formData: FormData) {
  const parsed = submitDeliverableSchema.safeParse(formDataObject(formData));

  if (!parsed.success) {
    redirectInvalid();
  }

  const { deliverable_summary: summary, deliverable_url: url, token } = parsed.data;

  if (url === null && summary === null) {
    redirectToProviderPage(token, { error: "invalid_deliverable" });
  }

  const verified = await verifyEngagementAccessBearerToken(token, "provider");

  if (!verified.ok) {
    redirectToProviderPage(token, { error: verified.reason });
  }

  const { error } = await (
    createSupabaseAdminClient() as unknown as ProviderEngagementRpcClient
  ).rpc("submit_engagement_deliverable", {
    p_deliverable_summary: summary ?? undefined,
    p_deliverable_url: url ?? undefined,
    p_token_id: verified.tokenId,
  });

  if (error) {
    redirectToProviderPage(token, {
      error: friendlyEngagementError(error.message),
    });
  }

  revalidatePath("/engagement/provider");
  redirectToProviderPage(token, { saved: "submitted" });
}
