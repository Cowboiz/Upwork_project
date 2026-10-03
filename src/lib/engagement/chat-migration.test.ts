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
    expect(migration).toContain("on conflict (sender_profile_id, client_message_id)");
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
});
