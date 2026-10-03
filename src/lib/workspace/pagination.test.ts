import { describe, expect, it } from "vitest";
import {
  buildPageHrefWithParams,
  getPageCount,
  normalizePage,
  pageToOffset,
  PAGE_SIZE,
} from "./pagination";

describe("workspace pagination", () => {
  it("uses ten rows per page", () => {
    expect(PAGE_SIZE).toBe(10);
  });

  it.each([
    [undefined, 1],
    ["0", 1],
    ["-1", 1],
    ["abc", 1],
    ["999", 999],
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

  it.each([
    [
      "/admin/users",
      new URLSearchParams({
        page: "1",
        q: "tai",
        role: "student",
        status: "active",
      }),
      "/admin/users?page=2&q=tai&role=student&status=active",
    ],
    [
      "/admin/requests",
      new URLSearchParams({
        category: "web_landing_page",
        integrity: "clear",
        page: "1",
        q: "tai",
        status: "new",
      }),
      "/admin/requests?category=web_landing_page&integrity=clear&page=2&q=tai&status=new",
    ],
    [
      "/admin/providers",
      new URLSearchParams({
        contact_method: "email",
        page: "1",
        q: "tai",
        status: "approved",
      }),
      "/admin/providers?contact_method=email&page=2&q=tai&status=approved",
    ],
  ])("preserves query parameters for %s", (pathname, params, expected) => {
    expect(
      buildPageHrefWithParams({
        page: 2,
        pathname,
        searchParams: params,
      }),
    ).toBe(expected);
  });
});
