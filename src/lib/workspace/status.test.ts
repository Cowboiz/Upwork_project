import { describe, expect, it } from "vitest";
import { formatStatusLabel } from "./status";

describe("workspace status labels", () => {
  it.each([
    ["new", "New"],
    ["needs_review", "Needs review"],
    ["in_progress", "In progress"],
    ["completed", "Completed"],
    ["student_decision_pending", "Student Decision Pending"],
  ])("formats %s", (status, expected) => {
    expect(formatStatusLabel(status)).toBe(expected);
  });
});
