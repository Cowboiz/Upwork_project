import Link from "next/link";
import { buildPageHrefWithParams } from "@/lib/workspace/pagination";

type PaginationControlsProps = {
  page: number;
  pageCount: number;
  pathname: string;
  searchParams?: URLSearchParams;
};

export function PaginationControls({
  page,
  pageCount,
  pathname,
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
        <span className="button-secondary opacity-50">Previous</span>
      ) : (
        <Link
          className="button-secondary"
          href={buildPageHrefWithParams({
            page: page - 1,
            pathname,
            searchParams,
          })}
        >
          Previous
        </Link>
      )}

      <span>
        Page {page} of {pageCount}
      </span>

      {nextDisabled ? (
        <span className="button-secondary opacity-50">Next</span>
      ) : (
        <Link
          className="button-secondary"
          href={buildPageHrefWithParams({
            page: page + 1,
            pathname,
            searchParams,
          })}
        >
          Next
        </Link>
      )}
    </nav>
  );
}
