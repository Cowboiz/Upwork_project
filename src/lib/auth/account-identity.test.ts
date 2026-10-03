import { describe, expect, it } from "vitest";
import { getAccountDisplayName, getAccountRoleLabel } from "./account-identity";
import type { AuthenticatedUser } from "./user-shared";

function account(
  overrides: Partial<Omit<AuthenticatedUser, "profile">> & {
    profile?: Partial<AuthenticatedUser["profile"]>;
  },
): AuthenticatedUser {
  const { profile, ...accountOverrides } = overrides;

  return {
    email: null,
    id: "user-id",
    ...accountOverrides,
    profile: {
      accountStatus: "active",
      fullName: null,
      id: "user-id",
      role: "student",
      username: null,
      ...profile,
    },
  };
}

describe("account identity display", () => {
  it("uses full name before username or email", () => {
    expect(
      getAccountDisplayName(
        account({
          email: "tai@example.test",
          profile: { fullName: "Tai", username: "tai" },
        }),
      ),
    ).toBe("Tai");
  });

  it("falls back from username to email without exposing ids", () => {
    expect(
      getAccountDisplayName(
        account({
          email: "tai@example.test",
          profile: { username: "tai" },
        }),
      ),
    ).toBe("tai");

    expect(getAccountDisplayName(account({ email: "tai@example.test" }))).toBe(
      "tai@example.test",
    );
  });

  it("formats role labels for the account control", () => {
    expect(getAccountRoleLabel("admin")).toBe("Admin");
    expect(getAccountRoleLabel("student")).toBe("Student");
  });
});
