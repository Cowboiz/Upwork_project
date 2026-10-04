import { describe, expect, it } from "vitest";
import { getAggregateActiveCount } from "./aggregates";

describe("workspace data aggregates", () => {
  it("uses RPC aggregate active count instead of deriving from page rows", () => {
    expect(
      getAggregateActiveCount({
        activeCount: 12,
        error: null,
      }),
    ).toBe(12);
  });

  it("falls back to zero active count for empty pages", () => {
    expect(getAggregateActiveCount({ error: null })).toBe(0);
  });

  it("uses zero active count for failed loads", () => {
    expect(getAggregateActiveCount({ error: "failed" })).toBe(0);
  });
});
