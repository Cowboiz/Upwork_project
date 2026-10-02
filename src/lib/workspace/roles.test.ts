import { describe, expect, it } from "vitest";
import {
  canViewProviderApplications,
  canViewRequests,
  getDashboardSections,
  getWorkspaceNavItems,
  isActiveEngagementStatus,
  isActiveRequestStatus,
  mapParticipantSide,
} from "./roles";

describe("workspace role sections", () => {
  it("shows student sections only for student role", () => {
    expect(getDashboardSections("student")).toEqual(["requests", "engagements"]);
    expect(canViewRequests("student")).toBe(true);
    expect(canViewProviderApplications("student")).toBe(false);
  });

  it("shows provider sections only for freelancer role", () => {
    expect(getDashboardSections("freelancer")).toEqual([
      "provider",
      "engagements",
    ]);
    expect(canViewRequests("freelancer")).toBe(false);
    expect(canViewProviderApplications("freelancer")).toBe(true);
  });

  it("shows all workspace sections for both role", () => {
    expect(getDashboardSections("both")).toEqual([
      "requests",
      "provider",
      "engagements",
    ]);
  });

  it("builds student workspace navigation without provider applications", () => {
    expect(getWorkspaceNavItems("student")).toEqual([
      { href: "/app", label: "Overview" },
      { href: "/app/requests", label: "Requests / Projects" },
      { href: "/app/engagements", label: "Engagements" },
      { href: "/app/messages", label: "Messages" },
    ]);
  });

  it("builds freelancer workspace navigation without requests", () => {
    expect(getWorkspaceNavItems("freelancer")).toEqual([
      { href: "/app", label: "Overview" },
      { href: "/app/provider", label: "Provider applications" },
      { href: "/app/engagements", label: "Engagements" },
      { href: "/app/messages", label: "Messages" },
    ]);
  });

  it("builds both-role navigation with request and provider workspaces", () => {
    expect(getWorkspaceNavItems("both")).toEqual([
      { href: "/app", label: "Overview" },
      { href: "/app/requests", label: "Requests / Projects" },
      { href: "/app/provider", label: "Provider applications" },
      { href: "/app/engagements", label: "Engagements" },
      { href: "/app/messages", label: "Messages" },
    ]);
  });

  it("maps participant sides to readable labels", () => {
    expect(mapParticipantSide("student")).toBe("Student");
    expect(mapParticipantSide("provider")).toBe("Provider");
  });

  it.each([
    "new",
    "needs_clarification",
    "reviewed",
    "matched",
    "in_progress",
  ])("treats request status %s as active", (status) => {
    expect(isActiveRequestStatus(status)).toBe(true);
  });

  it.each(["completed", "cancelled", "rejected"])(
    "treats request status %s as inactive",
    (status) => {
      expect(isActiveRequestStatus(status)).toBe(false);
    },
  );

  it.each(["agreed", "in_progress"])(
    "treats engagement status %s as active",
    (status) => {
      expect(isActiveEngagementStatus(status)).toBe(true);
    },
  );

  it.each(["submitted", "completed", "cancelled", "disputed"])(
    "treats engagement status %s as inactive",
    (status) => {
      expect(isActiveEngagementStatus(status)).toBe(false);
    },
  );
});
