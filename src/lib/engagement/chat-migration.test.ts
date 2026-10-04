import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20261003075413_phase5_engagement_chat.sql",
  ),
  "utf8",
);
const sendFixMigration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20261003084920_phase5_engagement_chat_send_fix.sql",
  ),
  "utf8",
);
const realtimeUnreadMigration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20261004140930_phase5_engagement_chat_realtime_unread.sql",
  ),
  "utf8",
);

describe("engagement chat migration", () => {
  it("creates engagement-scoped messages without broad authenticated table access", () => {
    expect(migration).toContain("create table if not exists public.engagement_messages");
    expect(migration).toContain("alter table public.engagement_messages enable row level security");
    expect(migration).toContain(
      "revoke all on table public.engagement_messages from anon, authenticated",
    );
    expect(migration).toContain(
      "unique (sender_profile_id, client_message_id)",
    );
  });

  it("uses security definer RPCs with empty search_path and authenticated execute grants", () => {
    for (const fn of [
      "get_engagement_thread",
      "get_my_engagement_threads",
      "get_engagement_messages",
      "send_engagement_message",
    ]) {
      expect(migration).toContain(`function public.${fn}`);
    }

    expect(migration).toContain("security definer");
    expect(migration).toContain("set search_path = ''");
    expect(migration).toContain("grant execute on function public.send_engagement_message");
  });

  it("derives sender from auth.uid and never accepts sender_profile_id as an RPC argument", () => {
    expect(migration).toContain("v_sender_id := auth.uid()");
    expect(migration).toContain("p_client_message_id uuid");
    expect(migration).not.toContain("p_sender_profile_id");
  });

  it("guards participant access, active account status, lifecycle, and idempotency", () => {
    expect(migration).toContain("profiles.account_status = 'active'");
    expect(migration).toContain("profiles.role in ('student', 'freelancer', 'both')");
    expect(migration).toContain(
      "authorized.engagement_status in ('agreed', 'in_progress', 'submitted')",
    );
    expect(migration).toContain(
      "constraint engagement_messages_sender_client_message_key",
    );
  });

  it("does not broaden legacy conversations or messages ACLs", () => {
    expect(migration).toContain(
      "Legacy public.conversations and public.messages are intentionally untouched",
    );
    expect(migration).not.toMatch(/grant\s+.*\s+on\s+table\s+public\.conversations/i);
    expect(migration).not.toMatch(/grant\s+.*\s+on\s+table\s+public\.messages/i);
    expect(migration).not.toMatch(/create policy .* on public\.conversations/i);
    expect(migration).not.toMatch(/create policy .* on public\.messages/i);
  });

  it("repairs send-message idempotency without ambiguous conflict column names", () => {
    expect(sendFixMigration).not.toContain(
      "on conflict (sender_profile_id, client_message_id)",
    );
    expect(sendFixMigration).toContain(
      "on conflict on constraint engagement_messages_sender_client_message_key",
    );
    expect(sendFixMigration).toContain("do nothing");
    expect(sendFixMigration).toContain("from public.engagement_messages as em");
    expect(sendFixMigration).toContain("em.sender_profile_id = v_sender_id");
    expect(sendFixMigration).toContain(
      "em.client_message_id = p_client_message_id",
    );
    expect(sendFixMigration).toContain(
      "em.project_engagement_id = p_engagement_id",
    );
    expect(sendFixMigration).toContain("v_sender_id := auth.uid()");
    expect(sendFixMigration).not.toContain("p_sender_profile_id");
  });

  it("adds private read watermarks with engagement-scoped message integrity", () => {
    expect(realtimeUnreadMigration).toContain(
      "create table if not exists public.engagement_message_reads",
    );
    expect(realtimeUnreadMigration).toContain(
      "primary key (project_engagement_id, profile_id)",
    );
    expect(realtimeUnreadMigration).toContain(
      "constraint engagement_message_reads_message_watermark_fkey",
    );
    expect(realtimeUnreadMigration).toContain(
      "references public.engagement_messages(id, project_engagement_id)",
    );
    expect(realtimeUnreadMigration).toContain(
      "alter table public.engagement_message_reads enable row level security",
    );
    expect(realtimeUnreadMigration).toContain(
      "revoke all on table public.engagement_message_reads from anon, authenticated",
    );
  });

  it("limits realtime SELECT to active normal engagement participants", () => {
    expect(realtimeUnreadMigration).toContain(
      "grant select on table public.engagement_messages to authenticated",
    );
    expect(realtimeUnreadMigration).toContain(
      'create policy "Engagement message active participants can select realtime rows"',
    );
    expect(realtimeUnreadMigration).toContain(
      "viewer.role in ('student', 'freelancer', 'both')",
    );
    expect(realtimeUnreadMigration).toContain("viewer.account_status = 'active'");
    expect(realtimeUnreadMigration).toContain(
      "viewer.id in (\n          pr.linked_student_profile_id",
    );
    expect(realtimeUnreadMigration).not.toMatch(
      /grant\s+(insert|update|delete|all)\s+on\s+table\s+public\.engagement_messages\s+to\s+authenticated/i,
    );
    expect(realtimeUnreadMigration).not.toMatch(/viewer\.role\s*=\s*'admin'/i);
  });

  it("adds engagement messages to the realtime publication idempotently", () => {
    expect(realtimeUnreadMigration).toContain("pubname = 'supabase_realtime'");
    expect(realtimeUnreadMigration).toContain(
      "alter publication supabase_realtime add table public.engagement_messages",
    );
    expect(realtimeUnreadMigration).toContain(
      "tablename = 'engagement_messages'",
    );
  });

  it("computes unread counts from counterpart messages newer than the watermark", () => {
    expect(realtimeUnreadMigration).toContain(
      "get_my_unread_message_count()",
    );
    expect(realtimeUnreadMigration).toContain("unread_count bigint");
    expect(realtimeUnreadMigration).toContain(
      "engagement_messages.sender_profile_id = authorized.counterparty_profile_id",
    );
    expect(realtimeUnreadMigration).toContain(
      "engagement_message_reads.last_read_created_at is null",
    );
    expect(realtimeUnreadMigration).toContain(
      "engagement_messages.created_at,\n          engagement_messages.id",
    );
    expect(realtimeUnreadMigration).toContain(
      "engagement_message_reads.last_read_created_at,\n          engagement_message_reads.last_read_message_id",
    );
  });

  it("marks threads read through an authenticated participant RPC without caller-supplied profile ids", () => {
    expect(realtimeUnreadMigration).toContain(
      "function public.mark_engagement_thread_read(",
    );
    expect(realtimeUnreadMigration).toContain("p_engagement_id uuid");
    expect(realtimeUnreadMigration).toContain("p_message_id uuid");
    expect(realtimeUnreadMigration).not.toContain("p_profile_id");
    expect(realtimeUnreadMigration).not.toContain("p_user_id");
    expect(realtimeUnreadMigration).toContain("v_reader_id := auth.uid()");
    expect(realtimeUnreadMigration).toContain(
      "from public.get_engagement_thread(p_engagement_id)",
    );
    expect(realtimeUnreadMigration).toContain(
      "where em.id = p_message_id\n    and em.project_engagement_id = p_engagement_id",
    );
    expect(realtimeUnreadMigration).toContain(
      "on conflict (project_engagement_id, profile_id)",
    );
    expect(realtimeUnreadMigration).toContain(
      "excluded.last_read_created_at,\n      excluded.last_read_message_id",
    );
    expect(realtimeUnreadMigration).toContain(
      "emr.last_read_created_at,\n      emr.last_read_message_id",
    );
  });

  it("grants unread RPC execution only to authenticated users and leaves legacy ACLs closed", () => {
    for (const fn of [
      "get_my_unread_message_count()",
      "mark_engagement_thread_read(uuid, uuid)",
    ]) {
      expect(realtimeUnreadMigration).toContain(
        `revoke all on function public.${fn} from public, anon, authenticated`,
      );
      expect(realtimeUnreadMigration).toContain(
        `grant execute on function public.${fn} to authenticated`,
      );
    }

    expect(realtimeUnreadMigration).toContain(
      "Legacy public.conversations and public.messages are intentionally untouched",
    );
    expect(realtimeUnreadMigration).not.toMatch(/publication .*public\.conversations/i);
    expect(realtimeUnreadMigration).not.toMatch(/publication .*public\.messages/i);
    expect(realtimeUnreadMigration).not.toMatch(/grant\s+.*\s+on\s+table\s+public\.conversations/i);
    expect(realtimeUnreadMigration).not.toMatch(/grant\s+.*\s+on\s+table\s+public\.messages/i);
  });
});
