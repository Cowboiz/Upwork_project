"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database.types";

export function createSupabaseBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error("Missing required Supabase browser environment variables");
  }

  return createBrowserClient<Database>(
    supabaseUrl,
    supabasePublishableKey,
  );
}
