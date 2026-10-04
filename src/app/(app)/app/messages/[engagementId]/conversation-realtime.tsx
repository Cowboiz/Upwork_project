"use client";

import { useEffect, useMemo, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { markEngagementThreadRead } from "./actions";

type ConversationRealtimeProps = {
  engagementId: string;
  latestMessageId: string | null;
};

export function ConversationRealtime({
  engagementId,
  latestMessageId,
}: ConversationRealtimeProps) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const markedMessageId = useRef<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const channel = supabase
      .channel(`engagement-messages:${engagementId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          filter: `project_engagement_id=eq.${engagementId}`,
          schema: "public",
          table: "engagement_messages",
        },
        () => {
          router.refresh();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [engagementId, router, supabase]);

  useEffect(() => {
    if (!latestMessageId || markedMessageId.current === latestMessageId) {
      return;
    }

    markedMessageId.current = latestMessageId;

    startTransition(() => {
      void markEngagementThreadRead({
        engagementId,
        messageId: latestMessageId,
      }).then(() => {
        router.refresh();
      });
    });
  }, [engagementId, latestMessageId, router]);

  return null;
}
