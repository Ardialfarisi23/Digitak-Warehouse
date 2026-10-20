"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const PREFIX = "h_";
const PAGE_SIZE = 20;

export type HistoryFilterKey =
  | "status"
  | "clusterId"
  | "projectName"
  | "actorId"
  | "jenisInput"
  | "startDate"
  | "endDate";

const FILTER_KEYS: HistoryFilterKey[] = [
  "status",
  "clusterId",
  "projectName",
  "actorId",
  "jenisInput",
  "startDate",
  "endDate",
];

export function useHistoryFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const read = useCallback(
    (key: string) => searchParams.get(PREFIX + key) ?? "",
    [searchParams]
  );

  const search = read("search");
  const page = Math.max(1, parseInt(read("page") || "1", 10) || 1);

  const filters = useMemo(() => {
    const out = {} as Record<HistoryFilterKey, string>;
    for (const k of FILTER_KEYS) out[k] = read(k);
    return out;
  }, [read]);

  const [searchInput, setSearchInput] = useState(search);

  const update = useCallback(
    (patch: Record<string, string | number | undefined>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(patch)) {
        const key = PREFIX + k;
        if (v === undefined || v === "") next.delete(key);
        else next.set(key, String(v));
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed === search) return;
    const t = setTimeout(() => update({ search: trimmed, page: undefined }), 400);
    return () => clearTimeout(t);
  }, [searchInput, search, update]);

  useEffect(() => {
    setSearchInput((prev) => (prev.trim() === search ? prev : search));
  }, [search]);

  const setFilter = useCallback(
    (key: HistoryFilterKey, value: string) => {
      if (
        (key === "startDate" || key === "endDate") &&
        value
      ) {
        const other = key === "startDate" ? filters.endDate : filters.startDate;
        if (other) {
          const [from, to] =
            key === "startDate" ? [value, other] : [other, value];
          if (from > to) return;
        }
      }
      update({ [key]: value, page: undefined });
    },
    [filters.endDate, filters.startDate, update]
  );

  const setPage = useCallback(
    (p: number) => update({ page: p <= 1 ? undefined : p }),
    [update]
  );

  const reset = useCallback(() => {
    const patch: Record<string, undefined> = { search: undefined, page: undefined };
    for (const k of FILTER_KEYS) patch[k] = undefined;
    setSearchInput("");
    update(patch);
  }, [update]);

  const activeCount = useMemo(
    () =>
      FILTER_KEYS.filter((k) => filters[k]).length + (search ? 1 : 0),
    [filters, search]
  );

  const params = useMemo(() => {
    const p: Record<string, string | number> = { page, limit: PAGE_SIZE };
    if (search) p.search = search;
    for (const k of FILTER_KEYS) if (filters[k]) p[k] = filters[k];
    return p;
  }, [filters, page, search]);

  return {
    searchInput,
    setSearchInput,
    filters,
    setFilter,
    page,
    setPage,
    reset,
    activeCount,
    params,
    pageSize: PAGE_SIZE,
  };
}