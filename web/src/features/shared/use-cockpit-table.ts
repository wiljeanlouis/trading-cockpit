import { useEffect, useMemo, useState } from 'react';

export type SortDirection = 'asc' | 'desc';

export interface CockpitTableSortConfig<K extends string> {
  defaultSortKey: K;
  defaultSortDirection?: SortDirection;
  descendingByDefaultKeys?: readonly K[];
}

export interface CockpitTableOptions<T, K extends string> {
  items: T[];
  getStatus: (item: T) => string | null | undefined;
  defaultStatuses: readonly string[];
  sorters: Record<K, (left: T, right: T) => number>;
  sortConfig: CockpitTableSortConfig<K>;
}

export function normalizeTableStatus(value: string | null | undefined): string {
  return String(value || '')
    .trim()
    .toUpperCase();
}

function areStringArraysEqual(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

export function useCockpitTable<T, K extends string>({
  items,
  getStatus,
  defaultStatuses,
  sorters,
  sortConfig
}: CockpitTableOptions<T, K>) {
  const [sortKey, setSortKey] = useState<K>(sortConfig.defaultSortKey);
  const [sortDirection, setSortDirection] = useState<SortDirection>(
    sortConfig.defaultSortDirection ?? 'asc'
  );
  const [activeStatuses, setActiveStatuses] = useState<string[]>([...defaultStatuses]);

  const availableStatuses = useMemo(() => {
    const statuses = new Set(
      items.map((item) => normalizeTableStatus(getStatus(item))).filter(Boolean)
    );
    return Array.from(statuses).sort((left, right) =>
      left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [getStatus, items]);

  useEffect(() => {
    if (availableStatuses.length === 0) return;
    setActiveStatuses((current) => {
      const filtered = current.filter((status) => availableStatuses.includes(status));
      if (filtered.length > 0) {
        return areStringArraysEqual(filtered, current) ? current : filtered;
      }

      const defaults = [...defaultStatuses].filter((status) => availableStatuses.includes(status));
      const next = defaults.length > 0 ? defaults : [availableStatuses[0]];
      return areStringArraysEqual(next, current) ? current : next;
    });
  }, [availableStatuses, defaultStatuses]);

  const filteredItems = useMemo(() => {
    const visible = items.filter((item) => {
      if (activeStatuses.length === 0) return true;
      return activeStatuses.includes(normalizeTableStatus(getStatus(item)));
    });

    const sorted = [...visible].sort((left, right) => {
      const comparison = sorters[sortKey](left, right);
      if (comparison !== 0) return comparison * (sortDirection === 'asc' ? 1 : -1);
      return 0;
    });

    return sorted;
  }, [activeStatuses, getStatus, items, sortDirection, sorters, sortKey]);

  function toggleStatus(status: string) {
    setActiveStatuses((current) =>
      current.includes(status) ? current.filter((value) => value !== status) : [...current, status]
    );
  }

  function resetStatuses() {
    setActiveStatuses([...defaultStatuses]);
  }

  function setSort(key: K) {
    if (sortKey === key) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(key);
    setSortDirection(
      sortConfig.descendingByDefaultKeys?.includes(key)
        ? 'desc'
        : (sortConfig.defaultSortDirection ?? 'asc')
    );
  }

  return {
    activeStatuses,
    availableStatuses,
    filteredItems,
    resetStatuses,
    setSort,
    sortDirection,
    sortKey,
    toggleStatus
  };
}
