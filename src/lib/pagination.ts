export const DEFAULT_PAGE_SIZE = 24;
export const MAX_PAGE_SIZE = 100;

export function paginationFrom(searchParams: URLSearchParams, fallback = DEFAULT_PAGE_SIZE) {
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(searchParams.get("pageSize")) || fallback));
  return { page, pageSize, from: (page - 1) * pageSize, to: page * pageSize - 1 };
}

export function cleanSearch(value: string | null) {
  return String(value || "").trim().replace(/[,%()]/g, " ").replace(/\s+/g, " ").slice(0, 100);
}
