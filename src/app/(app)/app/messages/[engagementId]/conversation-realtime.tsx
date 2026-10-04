"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
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
  const markedMessageId = useRef<string | null>(null);
  const [, startTransition] = useTransition();

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
