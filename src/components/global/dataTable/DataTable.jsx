import { useEffect, useState } from "react";
import { FiChevronLeft, FiChevronRight, FiSearch } from "react-icons/fi";
import { motion } from "framer-motion";

const DataTable = ({ columns, data, paginationData, changePage, onSearch, className, isLoading }) => {
  const [search, setSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      if (onSearch) {
        onSearch(search.trim());
      }
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
    <div className={`relative ${className} flex flex-col backdrop-blur-xl rounded-2xl overflow-hidden`}>
      {/* <div className="p-6 border-b border-white/10 bg-white shrink-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="text-xl font-semibold text-white"></h3>
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white/10 border border-gray-200 rounded-lg text-gray-600 placeholder-gray-400 focus:outline-none focus:border-cyan-400 transition w-full sm:w-64"
              disabled={isLoading}
            />
          </div>
        </div>
      </div> */}

      <div className="flex-1 overflow-hidden relative bg-white">
        <div className="h-full overflow-y-auto scrollbar-custom relative">
          <table className="w-full table-fixed border-collapse">
            <thead>
              <tr className="  text-gray-800 border-b border-white/10">
                {columns.map((column, index) => (
                  <th
                    key={index}
                    className={`px-6 py-3 text-left text-xs font-semibold text-gray-800 sticky top-0 z-20 bg-gray-100 ${column?.className}`}
                    onClick={() => (column.iconClickAction ? column.iconClickAction() : null)}
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
                      <div className="relative flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full border-4 border-gray-50 border-t-cyan-500 animate-spin"></div>
                        {/* <span className="absolute text-sm font-medium text-cyan-600">Loading</span> */}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((row, i) => (
                  <motion.tr
                    key={row.id || i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="border-b border-white/5 hover:bg-white/5 transition"
                  >
                    {columns.map((column, colIndex) => (
                      <td key={colIndex} className={`px-6 py-2 text-gray-600 border-b border-gray-100 text-start text-xs ${column?.className}`}>
                        {column.render ? column.render(row, row, data.length) : row[column.key] || <span className="">-</span>}
                      </td>
                    ))}
                  </motion.tr>
                ))
              )}
              {data?.length === 0 && (
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

      <div className="px-6 py-2 border-t border-gray-50 bg-gray-50 shrink-0">
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
