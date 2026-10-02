import type { UserRole } from "@/lib/auth/user-shared";

export type DashboardSection = "engagements" | "provider" | "requests";

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

export function mapParticipantSide(side: string | null | undefined) {
  return side === "provider" ? "Provider" : "Student";
}
