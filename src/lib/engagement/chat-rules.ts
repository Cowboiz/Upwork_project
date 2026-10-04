export const MESSAGE_PAGE_SIZE = 50;
export const SENDABLE_ENGAGEMENT_STATUSES = [
  "agreed",
  "in_progress",
  "submitted",
] as const;
export const READ_ONLY_ENGAGEMENT_STATUSES = [
  "completed",
  "cancelled",
  "disputed",
] as const;

export function normalizeMessageBody(body: string) {
  return body.trim();
}

export function isValidMessageBody(body: string) {
  const normalized = normalizeMessageBody(body);

  return normalized.length >= 1 && normalized.length <= 4000;
}

export function isSendableEngagementStatus(status: string) {
  return SENDABLE_ENGAGEMENT_STATUSES.includes(
    status as (typeof SENDABLE_ENGAGEMENT_STATUSES)[number],
  );
}

export function getMessagePageCount(totalCount: number) {
  return Math.max(1, Math.ceil(totalCount / MESSAGE_PAGE_SIZE));
}
