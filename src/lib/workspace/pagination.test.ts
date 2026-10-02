import { describe, expect, it } from "vitest";
import { getPageCount, normalizePage, pageToOffset, PAGE_SIZE } from "./pagination";

describe("workspace pagination", () => {
  it("uses ten rows per page", () => {
    expect(PAGE_SIZE).toBe(10);
  });

  it.each([
    [undefined, 1],
    ["0", 1],
    ["-1", 1],
    ["abc", 1],
    ["2", 2],
    [["3"], 3],
  ] as const)("normalizes %j to page %i", (input, expected) => {
    expect(normalizePage(input)).toBe(expected);
  });

  it.each([
    [0, 1],
    [1, 1],
    [10, 1],
    [11, 2],
    [20, 2],
    [21, 3],
  ])("calculates page count for %i rows", (rowCount, expected) => {
    expect(getPageCount(rowCount)).toBe(expected);
  });

  it("calculates server offsets from normalized pages", () => {
    expect(pageToOffset(1)).toBe(0);
    expect(pageToOffset(2)).toBe(10);
    expect(pageToOffset(3)).toBe(20);
  });
});
