import { describe, expect, it } from "vitest";
import {
  adminUserSearchParamsForPagination,
  type AdminUserRow,
  canHardDeleteUser,
  canMutateAdminTarget,
  getAdminUsers,
  normalizeProfileUpdateInput,
  parseAdminUserQuery,
  toAdminUserListResult,
} from "./user-management";

function userRow(overrides: Partial<AdminUserRow> = {}): AdminUserRow {
  return {
    account_status: "active",
    created_at: "2026-10-01T00:00:00.000Z",
    email: "user@example.test",
    full_name: "Project User",
    id: "user-id",
    last_sign_in_at: null,
    role: "student",
    total_count: 1,
    updated_at: "2026-10-01T00:00:00.000Z",
    username: "project-user",
    ...overrides,
  };
}

describe("admin user management policy", () => {
  it("protects admin targets from destructive generic management", () => {
    expect(canMutateAdminTarget("admin")).toBe(false);
    expect(
      canHardDeleteUser({
        hasHistory: false,
        role: "admin",
      }),
    ).toBe(false);
  });

  it("allows safe normal-user profile edits", () => {
    expect(
      normalizeProfileUpdateInput({
        accountStatus: "active",
        fullName: "Taylor Student",
        role: "both",
        username: "Taylor.Student",
      }),
    ).toEqual({
      accountStatus: "active",
      fullName: "Taylor Student",
      role: "both",
      username: "taylor.student",
    });
  });

  it("allows deactivation and reactivation targets for normal users", () => {
    expect(
      normalizeProfileUpdateInput({
        accountStatus: "deactivated",
        fullName: "",
        role: "student",
        username: "",
      })?.accountStatus,
    ).toBe("deactivated");
    expect(
      normalizeProfileUpdateInput({
        accountStatus: "active",
        fullName: "",
        role: "freelancer",
        username: "",
      })?.accountStatus,
    ).toBe("active");
  });

  it("blocks generic role mutation to admin", () => {
    expect(
      normalizeProfileUpdateInput({
        accountStatus: "active",
        fullName: "Admin Please",
        role: "admin",
        username: "admin-please",
      }),
    ).toBeNull();
  });

  it("blocks hard delete for users with business history", () => {
    expect(
      canHardDeleteUser({
        hasHistory: true,
        role: "student",
      }),
    ).toBe(false);
  });

  it("allows hard delete for eligible normal users without history", () => {
    expect(
      canHardDeleteUser({
        hasHistory: false,
        role: "freelancer",
      }),
    ).toBe(true);
  });
});

describe("admin user pagination filters", () => {
  it("normalizes invalid pages to one", () => {
    expect(parseAdminUserQuery({ page: "0" }).page).toBe(1);
    expect(parseAdminUserQuery({ page: "-1" }).page).toBe(1);
    expect(parseAdminUserQuery({ page: "abc" }).page).toBe(1);
  });

  it("preserves users query parameters for pagination", () => {
    const query = parseAdminUserQuery({
      page: "1",
      q: "tai",
      role: "student",
      sort: "oldest",
      status: "active",
    });

    expect(adminUserSearchParamsForPagination(query).toString()).toBe(
      "q=tai&role=student&status=active&sort=oldest",
    );
  });

  it.each([
    [0, 1],
    [1, 1],
    [10, 1],
    [11, 2],
  ])("calculates page count for %i admin users", (totalCount, pageCount) => {
    const users =
      totalCount === 0 ? [] : [userRow({ total_count: totalCount })];

    expect(
      toAdminUserListResult({
        error: false,
        page: 1,
        users,
      }),
    ).toMatchObject({
      page: 1,
      pageCount,
      totalCount,
    });
  });

  it("retries page one for out-of-range admin user pages", async () => {
    const rpcCalls: unknown[] = [];
    const supabase = {
      rpc: async (_name: string, args: { p_offset: number }) => {
        rpcCalls.push(args);

        if (args.p_offset > 0) {
          return { data: [], error: null };
        }

        return {
          data: [userRow({ total_count: 11 })],
          error: null,
        };
      },
    };

    await expect(
      getAdminUsers(
        supabase as never,
        parseAdminUserQuery({
          page: "999",
        }),
      ),
    ).resolves.toMatchObject({
      page: 1,
      pageCount: 2,
      totalCount: 11,
      users: [expect.objectContaining({ id: "user-id" })],
    });

    expect(rpcCalls).toEqual([
      expect.objectContaining({ p_offset: 9980 }),
      expect.objectContaining({ p_offset: 0 }),
    ]);
  });
});
