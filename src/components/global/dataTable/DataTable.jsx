import { useEffect, useState } from "react";
import { FiChevronLeft, FiChevronRight, FiSearch } from "react-icons/fi";
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
    const link = paginationData.links?.find((l) => l.page === page);
    if (link?.url) {
      const url = new URL(link.url);
      const params = Object.fromEntries(url.searchParams);
      changePage(params.page ? Number(params.page) : page);
    } else {
      changePage(page);
    }
  };

  return (
    <div className={`relative ${className} flex flex-col rounded-2xl overflow-hidden isolate`}>
      <div className="flex-1 overflow-hidden relative">
        <div className="h-full bg-white overflow-y-auto scrollbar-custom relative border border-slate-200">
          <table className="w-full  border-collapse">
            <thead>
              <tr className="text-gray-800 border-b  border-slate-200">
                {columns.map((column, index) => (
                  <th
                    key={index}
                    className={`px-6 py-3 text-[10px] font-bold uppercase sticky top-0 z-20 bg-[#F9FBFD] text-gray-500 ${
                      column?.className?.includes("text-") ? column.className : `text-start ${column?.className ?? ""}`
                    }`}
                    onClick={() => column.iconClickAction?.()}
                  >
                    <div>
                      <span>{column.title}</span>
                      {column.icon && (
                        <span>
                          <column.icon />
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
                      <div className="w-12 h-12 rounded-full border-4 border-gray-50 border-t-cyan-500 animate-spin" />
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
                        duration: 0.5,
                        ease: "easeInOut",
                      }}
                      className="border-b border-slate-100 bg-white hover:bg-slate-50/50 transition-colors"
                    >
                      {columns.map((column, colIndex) => (
                        <td key={colIndex} className={`px-6 py-3 text-gray-600 text-start text-xs transition-all duration-300 ${column?.className}`}>
                         
                          <motion.div >{column.render ? column.render(row, row, data.length) : row[column.key] || <span>-</span>}</motion.div>
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
                      <span className="text-sm font-medium text-gray-400">No data found.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="px-6 py-2 bg-[#F9FBFD] border border-gray-200 shrink-0 rounded-b-2xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
          <div>
            Showing {(paginationData?.current_page - 1) * paginationData?.per_page + 1} to{" "}
            {Math.min(paginationData?.current_page * paginationData?.per_page, paginationData?.total)} of {paginationData?.total} entries
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => changePage(paginationData?.current_page - 1)}
              disabled={!paginationData?.prev_page_url || isLoading}
              className="px-3 py-2 rounded-lg hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
            >
              <FiChevronLeft size={16} /> Previous
            </button>

            <div className="flex items-center gap-1">
              {generatePageNumbers().map((page, index) => (
                <button
                  key={index}
                  onClick={() => handlePageClick(page)}
                  disabled={page === "..." || isLoading}
                  className={`
                    w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium transition-all
                    ${page === paginationData?.current_page ? "bg-cyan-50 text-cyan-500 border border-cyan-200" : "hover:bg-white/10 text-gray-500"}
                    ${page === "..." ? "cursor-default text-gray-500" : "cursor-pointer"}
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
              className="px-3 py-2 rounded-lg hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
            >
              Next <FiChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataTable;
