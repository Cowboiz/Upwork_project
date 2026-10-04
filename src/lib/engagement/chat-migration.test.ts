import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function normalizeNewlines(value: string) {
  return value.replace(/\r\n/g, "\n");
}

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

const migrationSql = normalizeNewlines(migration);
const sendFixMigrationSql = normalizeNewlines(sendFixMigration);
const realtimeUnreadMigrationSql = normalizeNewlines(realtimeUnreadMigration);

const chatAccessHelper = realtimeUnreadMigrationSql.slice(
  realtimeUnreadMigrationSql.indexOf(
    "create or replace function public.can_access_engagement_chat",
  ),
  realtimeUnreadMigrationSql.indexOf(
    'create policy "Engagement message active participants can select realtime rows"',
  ),
);

const realtimeSelectPolicy = realtimeUnreadMigrationSql.slice(
  realtimeUnreadMigrationSql.indexOf(
    'create policy "Engagement message active participants can select realtime rows"',
  ),
  realtimeUnreadMigrationSql.indexOf("do $$", realtimeUnreadMigrationSql.indexOf(
    'create policy "Engagement message active participants can select realtime rows"',
  )),
);

describe("engagement chat migration", () => {
  it("creates engagement-scoped messages without broad authenticated table access", () => {
    expect(migrationSql).toContain("create table if not exists public.engagement_messages");
    expect(migrationSql).toContain("alter table public.engagement_messages enable row level security");
    expect(migrationSql).toContain(
      "revoke all on table public.engagement_messages from anon, authenticated",
    );
    expect(migrationSql).toContain(
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
      expect(migrationSql).toContain(`function public.${fn}`);
    }

    expect(migrationSql).toContain("security definer");
    expect(migrationSql).toContain("set search_path = ''");
    expect(migrationSql).toContain("grant execute on function public.send_engagement_message");
  });

  it("derives sender from auth.uid and never accepts sender_profile_id as an RPC argument", () => {
    expect(migrationSql).toContain("v_sender_id := auth.uid()");
    expect(migrationSql).toContain("p_client_message_id uuid");
    expect(migrationSql).not.toContain("p_sender_profile_id");
  });

  it("guards participant access, active account status, lifecycle, and idempotency", () => {
    expect(migrationSql).toContain("profiles.account_status = 'active'");
    expect(migrationSql).toContain("profiles.role in ('student', 'freelancer', 'both')");
    expect(migrationSql).toContain(
      "authorized.engagement_status in ('agreed', 'in_progress', 'submitted')",
    );
    expect(migrationSql).toContain(
      "constraint engagement_messages_sender_client_message_key",
    );
  });

  it("does not broaden legacy conversations or messages ACLs", () => {
    expect(migrationSql).toContain(
      "Legacy public.conversations and public.messages are intentionally untouched",
    );
    expect(migrationSql).not.toMatch(/grant\s+.*\s+on\s+table\s+public\.conversations/i);
    expect(migrationSql).not.toMatch(/grant\s+.*\s+on\s+table\s+public\.messages/i);
    expect(migrationSql).not.toMatch(/create policy .* on public\.conversations/i);
    expect(migrationSql).not.toMatch(/create policy .* on public\.messages/i);
  });

  it("repairs send-message idempotency without ambiguous conflict column names", () => {
    expect(sendFixMigrationSql).not.toContain(
      "on conflict (sender_profile_id, client_message_id)",
    );
    expect(sendFixMigrationSql).toContain(
      "on conflict on constraint engagement_messages_sender_client_message_key",
    );
    expect(sendFixMigrationSql).toContain("do nothing");
    expect(sendFixMigrationSql).toContain("from public.engagement_messages as em");
    expect(sendFixMigrationSql).toContain("em.sender_profile_id = v_sender_id");
    expect(sendFixMigrationSql).toContain(
      "em.client_message_id = p_client_message_id",
    );
    expect(sendFixMigrationSql).toContain(
      "em.project_engagement_id = p_engagement_id",
    );
    expect(sendFixMigrationSql).toContain("v_sender_id := auth.uid()");
    expect(sendFixMigrationSql).not.toContain("p_sender_profile_id");
  });

  it("adds private read watermarks with engagement-scoped message integrity", () => {
    expect(realtimeUnreadMigrationSql).toContain(
      "create table if not exists public.engagement_message_reads",
    );
    expect(realtimeUnreadMigrationSql).toContain(
      "primary key (project_engagement_id, profile_id)",
    );
    expect(realtimeUnreadMigrationSql).toContain(
      "constraint engagement_message_reads_message_watermark_fkey",
    );
    expect(realtimeUnreadMigrationSql).toContain(
      "references public.engagement_messages(id, project_engagement_id)",
    );
    expect(realtimeUnreadMigrationSql).toContain(
      "alter table public.engagement_message_reads enable row level security",
    );
    expect(realtimeUnreadMigrationSql).toContain(
      "revoke all on table public.engagement_message_reads from anon, authenticated",
    );
  });

  it("limits realtime SELECT to active normal engagement participants", () => {
    expect(realtimeUnreadMigrationSql).toContain(
      "grant select on table public.engagement_messages to authenticated",
    );
    expect(realtimeUnreadMigrationSql).toContain(
      'create policy "Engagement message active participants can select realtime rows"',
    );
    expect(realtimeSelectPolicy).toContain(
      "public.can_access_engagement_chat(project_engagement_id)",
    );
    expect(realtimeSelectPolicy).not.toMatch(/public\.project_engagements/i);
    expect(realtimeSelectPolicy).not.toMatch(/public\.request_candidates/i);
    expect(realtimeSelectPolicy).not.toMatch(/public\.project_requests/i);
    expect(realtimeSelectPolicy).not.toMatch(/public\.provider_applications/i);
    expect(realtimeSelectPolicy).not.toMatch(/public\.profiles/i);
    expect(realtimeUnreadMigrationSql).not.toMatch(
      /grant\s+(insert|update|delete|all)\s+on\s+table\s+public\.engagement_messages\s+to\s+authenticated/i,
    );
  });

  it("uses a security definer boolean helper for realtime participant authorization", () => {
    expect(chatAccessHelper).toContain(
      "create or replace function public.can_access_engagement_chat(p_engagement_id uuid)",
    );
    expect(chatAccessHelper).toContain("returns boolean");
    expect(chatAccessHelper).toContain("security definer");
    expect(chatAccessHelper).toContain("stable");
    expect(chatAccessHelper).toContain("set search_path = ''");
    expect(chatAccessHelper).toContain("profiles.id = (select auth.uid())");
    expect(chatAccessHelper).toContain("profiles.account_status = 'active'");
    expect(chatAccessHelper).toContain(
      "profiles.role in ('student', 'freelancer', 'both')",
    );
    expect(chatAccessHelper).toContain(
      "public.project_requests.linked_student_profile_id as student_profile_id",
    );
    expect(chatAccessHelper).toContain(
      "public.request_candidates.linked_provider_profile_id",
    );
    expect(chatAccessHelper).toContain(
      "public.provider_applications.linked_provider_profile_id",
    );
    expect(chatAccessHelper).toContain(
      "engagement_participants.student_profile_id is not null",
    );
    expect(chatAccessHelper).toContain(
      "engagement_participants.provider_profile_id is not null",
    );
    expect(chatAccessHelper).toContain(
      "current_profile.id in (\n          engagement_participants.student_profile_id",
    );
    expect(chatAccessHelper).not.toMatch(/role\s*=\s*'admin'/i);
    expect(chatAccessHelper).not.toMatch(/returns table/i);
  });

  it("grants realtime authorization helper execution only to authenticated users", () => {
    expect(realtimeUnreadMigrationSql).toContain(
      "revoke all on function public.can_access_engagement_chat(uuid) from public, anon, authenticated",
    );
    expect(realtimeUnreadMigrationSql).toContain(
      "grant execute on function public.can_access_engagement_chat(uuid) to authenticated",
    );
  });

  it("adds engagement messages to the realtime publication idempotently", () => {
    expect(realtimeUnreadMigrationSql).toContain("pubname = 'supabase_realtime'");
    expect(realtimeUnreadMigrationSql).toContain(
      "alter publication supabase_realtime add table public.engagement_messages",
    );
    expect(realtimeUnreadMigrationSql).toContain(
      "tablename = 'engagement_messages'",
    );
  });

  it("drops RPC signatures before recreating unread return shapes", () => {
    const threadDrop = realtimeUnreadMigrationSql.indexOf(
      "drop function if exists public.get_engagement_thread(uuid);",
    );
    const threadCreate = realtimeUnreadMigrationSql.indexOf(
      "create or replace function public.get_engagement_thread(p_engagement_id uuid)",
    );
    const threadsDrop = realtimeUnreadMigrationSql.indexOf(
      "drop function if exists public.get_my_engagement_threads(integer, integer);",
    );
    const threadsCreate = realtimeUnreadMigrationSql.indexOf(
      "create or replace function public.get_my_engagement_threads(",
    );

    expect(threadDrop).toBeGreaterThan(-1);
    expect(threadsDrop).toBeGreaterThan(-1);
    expect(threadDrop).toBeLessThan(threadCreate);
    expect(threadsDrop).toBeLessThan(threadsCreate);
    expect(realtimeUnreadMigrationSql).not.toMatch(
      /drop function if exists public\.get_engagement_thread\(uuid\)\s+cascade/i,
    );
    expect(realtimeUnreadMigrationSql).not.toMatch(
      /drop function if exists public\.get_my_engagement_threads\(integer,\s*integer\)\s+cascade/i,
    );
  });

  it("computes unread counts from counterpart messages newer than the watermark", () => {
    expect(realtimeUnreadMigrationSql).toContain(
      "get_my_unread_message_count()",
    );
    expect(realtimeUnreadMigrationSql).toContain("unread_count bigint");
    expect(realtimeUnreadMigrationSql).toContain(
      "engagement_messages.sender_profile_id = authorized.counterparty_profile_id",
    );
    expect(realtimeUnreadMigrationSql).toContain(
      "engagement_message_reads.last_read_created_at is null",
    );
    expect(realtimeUnreadMigrationSql).toContain(
      "engagement_messages.created_at,\n          engagement_messages.id",
    );
    expect(realtimeUnreadMigrationSql).toContain(
      "engagement_message_reads.last_read_created_at,\n          engagement_message_reads.last_read_message_id",
    );
  });

  it("marks threads read through an authenticated participant RPC without caller-supplied profile ids", () => {
    expect(realtimeUnreadMigrationSql).toContain(
      "function public.mark_engagement_thread_read(",
    );
    expect(realtimeUnreadMigrationSql).toContain("p_engagement_id uuid");
    expect(realtimeUnreadMigrationSql).toContain("p_message_id uuid");
    expect(realtimeUnreadMigrationSql).not.toContain("p_profile_id");
    expect(realtimeUnreadMigrationSql).not.toContain("p_user_id");
    expect(realtimeUnreadMigrationSql).toContain("v_reader_id := auth.uid()");
    expect(realtimeUnreadMigrationSql).toContain(
      "from public.get_engagement_thread(p_engagement_id)",
    );
    expect(realtimeUnreadMigrationSql).toContain(
      "where em.id = p_message_id\n    and em.project_engagement_id = p_engagement_id",
    );
    expect(realtimeUnreadMigrationSql).toContain(
      "on conflict (project_engagement_id, profile_id)",
    );
    expect(realtimeUnreadMigrationSql).toContain(
      "excluded.last_read_created_at,\n      excluded.last_read_message_id",
    );
    expect(realtimeUnreadMigrationSql).toContain(
      "emr.last_read_created_at,\n      emr.last_read_message_id",
    );
  });

  it("grants unread RPC execution only to authenticated users and leaves legacy ACLs closed", () => {
    for (const fn of [
      "get_my_unread_message_count()",
      "can_access_engagement_chat(uuid)",
      "mark_engagement_thread_read(uuid, uuid)",
    ]) {
      expect(realtimeUnreadMigrationSql).toContain(
        `revoke all on function public.${fn} from public, anon, authenticated`,
      );
      expect(realtimeUnreadMigrationSql).toContain(
        `grant execute on function public.${fn} to authenticated`,
      );
    }

    expect(realtimeUnreadMigrationSql).toContain(
      "Legacy public.conversations and public.messages are intentionally untouched",
    );
    expect(realtimeUnreadMigrationSql).not.toMatch(/publication .*public\.conversations/i);
    expect(realtimeUnreadMigrationSql).not.toMatch(/publication .*public\.messages/i);
    expect(realtimeUnreadMigrationSql).not.toMatch(/grant\s+.*\s+on\s+table\s+public\.conversations/i);
    expect(realtimeUnreadMigrationSql).not.toMatch(/grant\s+.*\s+on\s+table\s+public\.messages/i);
  });
});
