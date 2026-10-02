import { describe, expect, it } from "vitest";
import {
  canViewProviderApplications,
  canViewRequests,
  getDashboardSections,
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

  it("maps participant sides to readable labels", () => {
    expect(mapParticipantSide("student")).toBe("Student");
    expect(mapParticipantSide("provider")).toBe("Provider");
  });
});
