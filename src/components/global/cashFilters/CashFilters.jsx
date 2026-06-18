import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import DateRangePicker from "../dateRangePicker/DateRangePicker";

const PER_PAGE_OPTIONS = [50, 100, 250, 500, 1000];

/**
 * Filter bar for the cash-in / cash-out tables: bag search, date-range picker
 * and a per-page selector. All changes bubble up via `onChange(patch)` and are
 * persisted by the parent (localStorage).
 *
 * @param {{search:string,from_date:string,to_date:string,preset:string,per_page:number}} filters
 * @param {(patch:object) => void} onChange
 * @param {() => void} onReset
 */
const CashFilters = ({ filters, onChange, onReset, searchPlaceholder = "Search by bag barcode..." }) => {
  const [searchInput, setSearchInput] = useState(filters.search || "");

  // Debounce search so we don't refetch on every keystroke. The local input is
  // the source of truth while typing; external clears reset it explicitly below.
  useEffect(() => {
    const t = setTimeout(() => {
      if ((filters.search || "") !== searchInput) onChange({ search: searchInput });
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleReset = () => {
    setSearchInput("");
    onReset();
  };

  const hasActiveFilters = filters.search || filters.from_date || filters.to_date || (filters.preset && filters.preset !== "all");

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-64 text-gray-700">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm uppercase text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-indigo-400"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Date range */}
        <DateRangePicker
          value={{ from_date: filters.from_date, to_date: filters.to_date }}
          preset={filters.preset}
          onChange={(next) => onChange(next)}
        />

        {/* Per page */}
        <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Per Page</span>
          <select
            value={filters.per_page}
            onChange={(e) => onChange({ per_page: Number(e.target.value) })}
            className="text-sm font-bold bg-transparent outline-none cursor-pointer text-gray-700"
          >
            {PER_PAGE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        {/* Reset */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1 px-3 py-2 bg-red-50 border border-red-200 text-red-500 text-sm rounded-lg hover:bg-red-100 transition cursor-pointer"
          >
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>
    </div>
  );
};

export default CashFilters;
