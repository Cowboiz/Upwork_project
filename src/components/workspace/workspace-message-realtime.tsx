"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function WorkspaceMessageRealtime() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  useEffect(() => {
    const channel = supabase
      .channel("workspace-engagement-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
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
  }, [router, supabase]);

  return null;
}
