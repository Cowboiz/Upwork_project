import { describe, expect, it } from "vitest";
import { parseProfileUpdateInput } from "./profile";

describe("profile update boundary", () => {
  it("accepts only editable profile fields", () => {
    const parsed = parseProfileUpdateInput({
      fullName: "Taylor Lee",
      id: "f9fd6670-6191-4a17-9d04-6c7033a4fc95",
      role: "admin",
      username: "taylor",
    });

    expect(parsed.success).toBe(true);

    if (parsed.success) {
      expect(parsed.data).toEqual({
        fullName: "Taylor Lee",
        username: "taylor",
      });
      expect("role" in parsed.data).toBe(false);
      expect("id" in parsed.data).toBe(false);
    }
  });

  it("rejects invalid usernames", () => {
    const parsed = parseProfileUpdateInput({
      fullName: "Taylor Lee",
      username: "no spaces",
    });

    expect(parsed.success).toBe(false);
  });
});
