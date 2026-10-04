import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { logEngagementChatLoadFailed } from "@/lib/observability/server-log";
import type { Database } from "@/types/database.types";
import { getPageCount, pageToOffset, PAGE_SIZE } from "@/lib/workspace/pagination";
import { getMessagePageCount, MESSAGE_PAGE_SIZE } from "./chat-rules";

type Supabase = SupabaseClient<Database>;

export type EngagementThread =
  Database["public"]["Functions"]["get_my_engagement_threads"]["Returns"][number];
export type EngagementThreadDetail =
  Database["public"]["Functions"]["get_engagement_thread"]["Returns"][number];
export type EngagementMessage =
  Database["public"]["Functions"]["get_engagement_messages"]["Returns"][number];

export type ChatPaginatedResult<T> =
  | {
      error: null;
      page: number;
      pageCount: number;
      rows: T[];
      totalCount: number;
    }
  | {
      error: string;
      page: number;
      pageCount: 1;
      rows: [];
      totalCount: 0;
    };

function toThreadResult(
  rows: EngagementThread[],
  page: number,
  fallbackTotalCount = 0,
): ChatPaginatedResult<EngagementThread> {
  const totalCount = rows[0]?.total_count ?? fallbackTotalCount;

  return {
    error: null,
    page,
    pageCount: getPageCount(totalCount),
    rows,
    totalCount,
  };
}

function toMessageResult(
  rows: EngagementMessage[],
  page: number,
  fallbackTotalCount = 0,
): ChatPaginatedResult<EngagementMessage> {
  const totalCount = rows[0]?.total_count ?? fallbackTotalCount;

  return {
    error: null,
    page,
    pageCount: getMessagePageCount(totalCount),
    rows,
    totalCount,
  };
}

export async function getMyEngagementThreads(
  supabase: Supabase,
  page: number,
): Promise<ChatPaginatedResult<EngagementThread>> {
  const { data, error } = await supabase.rpc("get_my_engagement_threads", {
    p_limit: PAGE_SIZE,
    p_offset: pageToOffset(page),
  });

  if (error) {
    logEngagementChatLoadFailed({
      stage: "threads",
    });

    return {
      error: "We could not load your messages.",
      page,
      pageCount: 1,
      rows: [],
      totalCount: 0,
    };
  }

  if (page > 1 && (!data || data.length === 0)) {
    const { data: firstPage } = await supabase.rpc("get_my_engagement_threads", {
      p_limit: PAGE_SIZE,
      p_offset: 0,
    });

    return toThreadResult(firstPage ?? [], 1);
  }

  return toThreadResult(data ?? [], page);
}

export async function getMyUnreadMessageCount(supabase: Supabase) {
  const { data, error } = await supabase.rpc("get_my_unread_message_count");

  if (error) {
    logEngagementChatLoadFailed({
      stage: "unread-count",
    });

    return 0;
  }

  return data ?? 0;
}

export async function getEngagementThread(
  supabase: Supabase,
  engagementId: string,
) {
  const { data, error } = await supabase.rpc("get_engagement_thread", {
    p_engagement_id: engagementId,
  });

  if (error) {
    logEngagementChatLoadFailed({
      engagementId,
      stage: "thread",
    });

    return null;
  }

  return data?.[0] ?? null;
}

export async function getEngagementMessages(
  supabase: Supabase,
  engagementId: string,
  page: number,
): Promise<ChatPaginatedResult<EngagementMessage>> {
  const { data, error } = await supabase.rpc("get_engagement_messages", {
    p_engagement_id: engagementId,
    p_limit: MESSAGE_PAGE_SIZE,
    p_offset: (Math.max(page, 1) - 1) * MESSAGE_PAGE_SIZE,
  });

  if (error) {
    logEngagementChatLoadFailed({
      engagementId,
      stage: "messages",
    });

    return {
      error: "We could not load this conversation.",
      page,
      pageCount: 1,
      rows: [],
      totalCount: 0,
    };
  }

  if (page > 1 && (!data || data.length === 0)) {
    const { data: firstPage } = await supabase.rpc("get_engagement_messages", {
      p_engagement_id: engagementId,
      p_limit: MESSAGE_PAGE_SIZE,
      p_offset: 0,
    });

    return toMessageResult(firstPage ?? [], 1);
  }

  return toMessageResult(data ?? [], page);
}
