import { describe, expect, it } from "vitest";
import {
  adminUserSearchParamsForPagination,
  canHardDeleteUser,
  canMutateAdminTarget,
  normalizeProfileUpdateInput,
  parseAdminUserQuery,
} from "./user-management";

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
});
