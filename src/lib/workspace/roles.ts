import type { UserRole } from "@/lib/auth/user-shared";

export type DashboardSection = "engagements" | "provider" | "requests";
export type WorkspaceNavItem = {
  href: string;
  label: string;
};

export const ACTIVE_REQUEST_STATUSES = [
  "new",
  "needs_clarification",
  "reviewed",
  "matched",
  "in_progress",
] as const;

export const ACTIVE_ENGAGEMENT_STATUSES = ["agreed", "in_progress"] as const;

export function getDashboardSections(role: UserRole): DashboardSection[] {
  if (role === "student") {
    return ["requests", "engagements"];
  }

  if (role === "freelancer") {
    return ["provider", "engagements"];
  }

  if (role === "both") {
    return ["requests", "provider", "engagements"];
  }

  return [];
}

export function canViewRequests(role: UserRole) {
  return role === "student" || role === "both";
}

export function canViewProviderApplications(role: UserRole) {
  return role === "freelancer" || role === "both";
}

export function getWorkspaceNavItems(role: UserRole): WorkspaceNavItem[] {
  const items: WorkspaceNavItem[] = [{ href: "/app", label: "Overview" }];

  if (canViewRequests(role)) {
    items.push({ href: "/app/requests", label: "Requests / Projects" });
  }

  if (canViewProviderApplications(role)) {
    items.push({ href: "/app/provider", label: "Provider applications" });
  }

  items.push(
    { href: "/app/engagements", label: "Engagements" },
    { href: "/app/messages", label: "Messages" },
  );

  return items;
}

export function isActiveRequestStatus(status: string) {
  return ACTIVE_REQUEST_STATUSES.includes(
    status as (typeof ACTIVE_REQUEST_STATUSES)[number],
  );
}

export function isActiveEngagementStatus(status: string) {
  return ACTIVE_ENGAGEMENT_STATUSES.includes(
    status as (typeof ACTIVE_ENGAGEMENT_STATUSES)[number],
  );
}

export function mapParticipantSide(side: string | null | undefined) {
  return side === "provider" ? "Provider" : "Student";
}
