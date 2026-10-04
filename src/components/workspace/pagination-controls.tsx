import Link from "next/link";
import { buildPageHrefWithParams } from "@/lib/workspace/pagination";

type PaginationControlsProps = {
  nextLabel?: string;
  page: number;
  pageCount: number;
  pathname: string;
  previousLabel?: string;
  searchParams?: URLSearchParams;
};

export function PaginationControls({
  nextLabel = "Next",
  page,
  pageCount,
  pathname,
  previousLabel = "Previous",
  searchParams,
}: PaginationControlsProps) {
  const previousDisabled = page <= 1;
  const nextDisabled = page >= pageCount;

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center gap-3 text-sm font-bold text-slate-700"
    >
      {previousDisabled ? (
        <span className="button-secondary opacity-50">{previousLabel}</span>
      ) : (
        <Link
          className="button-secondary"
          href={buildPageHrefWithParams({
            page: page - 1,
            pathname,
            searchParams,
          })}
        >
          {previousLabel}
        </Link>
      )}

      <span>
        Page {page} of {pageCount}
      </span>

      {nextDisabled ? (
        <span className="button-secondary opacity-50">{nextLabel}</span>
      ) : (
        <Link
          className="button-secondary"
          href={buildPageHrefWithParams({
            page: page + 1,
            pathname,
            searchParams,
          })}
        >
          {nextLabel}
        </Link>
      )}
    </nav>
  );
}
