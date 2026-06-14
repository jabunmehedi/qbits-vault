import { useEffect, useState } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { AnimatePresence, motion } from "framer-motion";

const DataTable = ({ columns, data, paginationData, changePage, onSearch, className, isLoading }) => {
  const [search, setSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      if (onSearch) onSearch(search.trim());
    }, 600);
    return () => clearTimeout(timer);
  }, [search, onSearch]);

  const generatePageNumbers = () => {
    if (!paginationData?.last_page) return [];
    const current = paginationData.current_page || 1;
    const last = paginationData.last_page;
    const delta = 2;
    const pages = [];
    const result = [];

    for (let i = Math.max(2, current - delta); i <= Math.min(last - 1, current + delta); i++) {
      pages.push(i);
    }

    if (current - delta > 2) pages.unshift("...");
    if (current + delta < last - 1) pages.push("...");

    result.push(1);
    pages.forEach((p) => result.push(p));
    if (last > 1) result.push(last);

    return [...new Set(result)];
  };

  const handlePageClick = (page) => {
    if (typeof page !== "number") return;
    changePage(page); 
  };

  return (
    /* FIXED: Border and overflow configuration moved directly to the parent container */
    <div className={`relative ${className} flex flex-col rounded-2xl border border-slate-200 bg-white overflow-hidden isolate shadow-xs`}>
      <div className="flex-1 overflow-hidden relative">
        {/* FIXED: Removed individual component border to eliminate conflicting background edge overlap */}
        <div className="h-full overflow-y-auto scrollbar-custom relative">
          <table className="w-full border-collapse table-fixed">
            <thead>
              <tr className="text-gray-800 border-b border-slate-200">
                {columns.map((column, index) => (
                  <th
                    key={index}
                    className={`px-4 py-2 text-[10px] font-bold uppercase tracking-wider sticky top-0 z-20 bg-[#F9FBFD] text-slate-500 ${
                      column?.className?.includes("text-") ? column.className : `text-start ${column?.className ?? ""}`
                    }`}
                    onClick={() => column.iconClickAction?.()}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{column.title}</span>
                      {column.icon && (
                        <span className="text-slate-400">
                          <column.icon size={12} />
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr className="h-[50vh]">
                  <td colSpan={columns.length} className="h-64">
                    <div className="flex items-center justify-center h-full">
                      <div className="w-10 h-10 rounded-full border-4 border-slate-100 border-t-cyan-500 animate-spin" />
                    </div>
                  </td>
                </tr>
              ) : (
                <AnimatePresence mode="popLayout">
                  {data.map((row, i) => (
                    <motion.tr
                      key={row.id || i}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{
                        duration: 0.2,
                        ease: "easeInOut",
                      }}
                      className="border-b border-slate-100 last:border-b-0 bg-white hover:bg-slate-50/40 transition-colors"
                    >
                      {columns.map((column, colIndex) => (
                        <td key={colIndex} className={`px-4 py-1.5 text-slate-600 text-start text-xs transition-all duration-300 ${column?.noClip ? "overflow-visible" : "overflow-hidden max-w-0"} ${column?.className ?? ""}`}>
                          <motion.div className="w-full">{column.render ? column.render(row, row, data.length) : row[column.key] || <span className="text-slate-300">-</span>}</motion.div>
                        </td>
                      ))}
                    </motion.tr>
                  ))}
                </AnimatePresence>
              )}
              {data?.length === 0 && !isLoading && (
                <tr className="h-[50vh]">
                  <td colSpan={columns.length} className="h-64">
                    <div className="flex items-center justify-center h-full">
                      <span className="text-sm font-semibold text-slate-400">No data records found.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Controls Area */}
      {/* FIXED: Removed overlapping inner borders to align with unified container boundaries */}
      <div className="px-6 py-3 bg-[#F9FBFD] border-t border-slate-200 shrink-0">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-400">
          <div>
            Showing {(paginationData?.current_page - 1) * paginationData?.per_page + 1} to{" "}
            {Math.min(paginationData?.current_page * paginationData?.per_page, paginationData?.total)} of {paginationData?.total} entries
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => changePage(paginationData?.current_page - 1)}
              disabled={!paginationData?.prev_page_url || isLoading}
              className="px-3 py-2 text-slate-600 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
            >
              <FiChevronLeft size={14} /> Previous
            </button>

            <div className="flex items-center gap-1">
              {generatePageNumbers().map((page, index) => (
                <button
                  key={index}
                  onClick={() => handlePageClick(page)}
                  disabled={page === "..." || isLoading}
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
                    ${page === paginationData?.current_page 
                      ? "bg-indigo-500 text-white border-2 border-white shadow" 
                      : "text-slate-500 hover:bg-slate-100"
                    }
                    ${page === "..." ? "cursor-default" : "cursor-pointer"}
                    ${isLoading ? "opacity-50 cursor-not-allowed" : ""}
                  `}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              onClick={() => changePage(paginationData?.current_page + 1)}
              disabled={!paginationData?.next_page_url || isLoading}
              className="px-3 py-2 text-slate-600  disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
            >
              Next <FiChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataTable;