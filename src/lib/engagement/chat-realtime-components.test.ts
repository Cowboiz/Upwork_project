import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const workspaceRealtime = readFileSync(
  join(
    process.cwd(),
    "src/components/workspace/workspace-message-realtime.tsx",
  ),
  "utf8",
);

const appLayout = readFileSync(
  join(process.cwd(), "src/app/(app)/layout.tsx"),
  "utf8",
);

const conversationRealtime = readFileSync(
  join(
    process.cwd(),
    "src/app/(app)/app/messages/[engagementId]/conversation-realtime.tsx",
  ),
  "utf8",
);

describe("workspace engagement message realtime", () => {
  it("mounts one workspace-wide engagement_messages INSERT subscription from the app layout", () => {
    expect(appLayout).toContain(
      'import { WorkspaceMessageRealtime } from "@/components/workspace/workspace-message-realtime"',
    );
    expect(appLayout).toContain("<WorkspaceMessageRealtime />");
    expect(workspaceRealtime).toContain(
      '.channel("workspace-engagement-messages")',
    );
    expect(workspaceRealtime).toContain('"postgres_changes"');
    expect(workspaceRealtime).toContain('event: "INSERT"');
    expect(workspaceRealtime).toContain('schema: "public"');
    expect(workspaceRealtime).toContain('table: "engagement_messages"');
    expect(workspaceRealtime).not.toContain("filter:");
  });

  it("refreshes app workspace data on allowed realtime inserts and cleans up the channel", () => {
    expect(workspaceRealtime).toContain("router.refresh()");
    expect(workspaceRealtime).toContain("useMemo(() => createSupabaseBrowserClient(), [])");
    expect(workspaceRealtime).toContain("void supabase.removeChannel(channel)");
  });

  it("keeps the conversation component focused on mark-read without a duplicate postgres subscription", () => {
    expect(conversationRealtime).toContain("markEngagementThreadRead");
    expect(conversationRealtime).toContain("latestMessageId");
    expect(conversationRealtime).toContain("markedMessageId.current === latestMessageId");
    expect(conversationRealtime).not.toContain('"postgres_changes"');
    expect(conversationRealtime).not.toContain("createSupabaseBrowserClient");
    expect(conversationRealtime).not.toContain("removeChannel");
  });
});
