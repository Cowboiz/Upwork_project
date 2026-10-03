import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("admin lifecycle migration backstop", () => {
  it("adds a database trigger preventing generic admin demotion, deactivation, and delete", () => {
    const migration = readFileSync(
      join(
        process.cwd(),
        "supabase/migrations/20261003065659_phase5_admin_user_management.sql",
      ),
      "utf8",
    );

    expect(migration).toContain(
      "prevent_generic_admin_account_lifecycle_change",
    );
    expect(migration).toContain("old.role = 'admin'");
    expect(migration).toContain("tg_op = 'DELETE'");
    expect(migration).toContain("new.role <> 'admin'");
    expect(migration).toContain("new.account_status <> 'active'");
    expect(migration).toContain(
      "before update or delete on public.profiles",
    );
  });
});
