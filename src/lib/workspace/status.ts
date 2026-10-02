const LABEL_OVERRIDES: Record<string, string> = {
  in_progress: "In progress",
  needs_review: "Needs review",
};

export function formatStatusLabel(status: string | null | undefined) {
  if (!status) {
    return "Unknown";
  }

  if (LABEL_OVERRIDES[status]) {
    return LABEL_OVERRIDES[status];
  }

  return status
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Flexible";
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function formatCurrency(amount: number | null | undefined, currency: string) {
  if (amount === null || amount === undefined) {
    return "Not set";
  }

  return new Intl.NumberFormat("en", {
    currency,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(amount);
}
