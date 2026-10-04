import { describe, expect, it } from "vitest";
import {
  getMessagePageCount,
  isSendableEngagementStatus,
  isValidMessageBody,
  MESSAGE_PAGE_SIZE,
  normalizeMessageBody,
  SENDABLE_ENGAGEMENT_STATUSES,
} from "./chat-rules";

describe("engagement chat message validation", () => {
  it("normalizes ordinary message body whitespace", () => {
    expect(normalizeMessageBody("  hello\n")).toBe("hello");
  });

  it("rejects empty and oversized messages", () => {
    expect(isValidMessageBody("   ")).toBe(false);
    expect(isValidMessageBody("a".repeat(4000))).toBe(true);
    expect(isValidMessageBody("a".repeat(4001))).toBe(false);
  });
});

describe("engagement chat lifecycle", () => {
  it.each(["agreed", "in_progress", "submitted"] as const)(
    "allows sends for %s engagements",
    (status) => {
      expect(SENDABLE_ENGAGEMENT_STATUSES).toContain(status);
      expect(isSendableEngagementStatus(status)).toBe(true);
    },
  );

  it.each(["completed", "cancelled", "disputed"] as const)(
    "blocks sends for terminal %s engagements",
    (status) => {
      expect(isSendableEngagementStatus(status)).toBe(false);
    },
  );
});

describe("engagement chat pagination", () => {
  it("uses fifty rows per message page", () => {
    expect(MESSAGE_PAGE_SIZE).toBe(50);
  });

  it.each([
    [0, 1],
    [1, 1],
    [50, 1],
    [51, 2],
    [100, 2],
    [101, 3],
  ])("calculates message page count for %i messages", (count, expected) => {
    expect(getMessagePageCount(count)).toBe(expected);
  });
});
