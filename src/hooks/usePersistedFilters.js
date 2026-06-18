import { useCallback, useEffect, useState } from "react";

const readStored = (storageKey, defaults) => {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) return { ...defaults, ...JSON.parse(raw) };
  } catch {
    // corrupt/blocked storage — fall back to defaults
  }
  return defaults;
};

/**
 * Filter state persisted to localStorage so a user's search/date-range/per-page
 * survives reloads and is re-applied by default on the next visit.
 *
 * @param {string} storageKey  unique key per table (e.g. "cashin_filters")
 * @param {object} defaults    default filter shape, used when nothing is stored
 */
export const usePersistedFilters = (storageKey, defaults) => {
  const [filters, setFilters] = useState(() => readStored(storageKey, defaults));

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(filters));
    } catch {
      // ignore write failures (private mode / quota)
    }
  }, [storageKey, filters]);

  // Patch one or more fields, optionally resetting back to page 1.
  const updateFilters = useCallback((patch, { resetPage = true } = {}) => {
    setFilters((prev) => ({ ...prev, ...patch, ...(resetPage ? { page: 1 } : {}) }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(defaults);
  }, [defaults]);

  return { filters, setFilters, updateFilters, resetFilters };
};

export default usePersistedFilters;
