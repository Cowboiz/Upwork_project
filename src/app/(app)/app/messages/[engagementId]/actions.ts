"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/user";
import { isValidMessageBody } from "@/lib/engagement/chat-rules";
import { logEngagementMessageSendFailed } from "@/lib/observability/server-log";

const sendMessageSchema = z.object({
  body: z.string().max(4000),
  clientMessageId: z.uuid(),
  engagementId: z.uuid(),
});

export async function sendEngagementMessage(formData: FormData) {
  const parsed = sendMessageSchema.safeParse({
    body: formData.get("body"),
    clientMessageId: formData.get("clientMessageId"),
    engagementId: formData.get("engagementId"),
  });

  if (!parsed.success || !isValidMessageBody(parsed.data.body)) {
    redirect(`/app/messages/${formData.get("engagementId") ?? ""}?error=invalid`);
  }

  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("send_engagement_message", {
    p_body: parsed.data.body,
    p_client_message_id: parsed.data.clientMessageId,
    p_engagement_id: parsed.data.engagementId,
  });

  if (error) {
    logEngagementMessageSendFailed({
      engagementId: parsed.data.engagementId,
      stage: "rpc",
    });

    redirect(`/app/messages/${parsed.data.engagementId}?error=unavailable`);
  }

  revalidatePath(`/app/messages/${parsed.data.engagementId}`);
  revalidatePath("/app/messages");
  redirect(`/app/messages/${parsed.data.engagementId}`);
}
