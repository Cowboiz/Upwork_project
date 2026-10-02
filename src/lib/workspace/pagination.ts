export const PAGE_SIZE = 10;

export function normalizePage(rawPage: readonly string[] | string | undefined) {
  const value = Array.isArray(rawPage) ? rawPage[0] : rawPage;
  const parsed = Number.parseInt(value ?? "1", 10);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
}

export function pageToOffset(page: number) {
  return (Math.max(page, 1) - 1) * PAGE_SIZE;
}

export function getPageCount(totalCount: number) {
  return Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
}

export function buildPageHref(pathname: string, page: number) {
  const params = new URLSearchParams({ page: String(Math.max(page, 1)) });

  return `${pathname}?${params.toString()}`;
}
