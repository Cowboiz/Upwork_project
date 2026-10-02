import { formatStatusLabel } from "@/lib/workspace/status";

type StatusBadgeProps = {
  tone?: "blue" | "slate";
  value: string;
};

export function StatusBadge({ tone = "slate", value }: StatusBadgeProps) {
  const className =
    tone === "blue"
      ? "border-blue-200 bg-blue-50 text-blue-700"
      : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <span
      className={`inline-flex rounded-md border px-2 py-1 text-xs font-bold ${className}`}
    >
      {formatStatusLabel(value)}
    </span>
  );
}
