import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { ArrowUpRight, ChevronRight, Landmark, Layers, Loader2, Settings, Wallet } from "lucide-react";
import dayjs from "dayjs";

const fmt = (n) => Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2 });
const vaultBalance = (vault) => (vault?.bags || []).reduce((s, b) => s + parseFloat(b.current_amount || 0), 0);

const VaultCardList = ({
  vaults = [],
  paginationData,
  changePage,
  onOpenDrawer,
  onEdit,
  onDelete,
  onRequestCashIn,
  canRequestCashIn = false,
  canEdit = false,
  canDelete = false,
  isApiDeleting = false,
  defaultVaultId,
  onSetDefault,
  savingDefaultVaultId,
  onOpenThreshold,
  canEditThreshold = false,
}) => {
  const [activeActionMenuId, setActiveActionMenuId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const totalBalance = vaults.reduce((s, v) => s + vaultBalance(v), 0);

  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveActionMenuId(null);
      setDeleteConfirmId(null);
    };
    if (activeActionMenuId !== null) {
      window.addEventListener("click", handleOutsideClick);
    }
    return () => window.removeEventListener("click", handleOutsideClick);
  }, [activeActionMenuId]);

  // ── Pagination helpers (mirrors DataTable footer) ───────────────────────────
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

  const hasPagination =
    Number.isFinite(paginationData?.current_page) && Number.isFinite(paginationData?.per_page) && Number.isFinite(paginationData?.total);
  const showingFrom = hasPagination ? (paginationData.current_page - 1) * paginationData.per_page + 1 : vaults.length > 0 ? 1 : 0;
  const showingTo = hasPagination ? Math.min(paginationData.current_page * paginationData.per_page, paginationData.total) : vaults.length || 0;
  const totalEntries = hasPagination ? paginationData.total : vaults.length || 0;
  const showPaginationControls = hasPagination && typeof changePage === "function";

  return (
    <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden flex flex-col flex-1 min-h-0">
      {/* Aggregate summary strip */}
      <div className="bg-slate-50/60 border-b border-slate-100 px-6 py-4 flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-2">
          <span className="bg-[#1a73e8] text-white text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wide">Vaults</span>
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Vault Accounts Overview</h3>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3.5 py-2 shadow-sm">
            <Layers size={15} className="text-[#1a73e8]" />
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Vaults</span>
            <span className="text-sm font-black text-[#1a2b4b]">{totalEntries}</span>
          </div>
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3.5 py-2 shadow-sm">
            <Wallet size={15} className="text-emerald-500" />
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Balance</span>
            <span className="text-sm font-black text-[#1a2b4b]">৳{fmt(totalBalance)}</span>
          </div>
        </div>
      </div>

      {/* Vault cards */}
      <div className="p-6 flex-1 min-h-0 overflow-y-auto scrollbar-custom">
        {vaults.length === 0 ? (
          <div className="py-20 flex items-center justify-center">
            <span className="text-sm font-semibold text-slate-400">No vault accounts available.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {vaults.map((vault) => {
              const balance = vaultBalance(vault);
              const bagCount = vault?.bags?.length || 0;
              const isMenuOpen = activeActionMenuId === vault.id;
              const isConfirmingDelete = deleteConfirmId === vault.id;

              const toggleMenu = (e) => {
                e.stopPropagation();
                setActiveActionMenuId(isMenuOpen ? null : vault.id);
                setDeleteConfirmId(null);
              };

              return (
                <div
                  key={vault.id}
                  className="group bg-white border border-slate-200 rounded-2xl p-5 hover:border-[#1a73e8] hover:shadow-lg hover:shadow-blue-50 transition-all duration-200"
                >
                  {/* Header: icon + identity + action menu */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-11 h-11 shrink-0 rounded-xl bg-blue-50 text-[#1a73e8] flex items-center justify-center group-hover:bg-[#1a73e8] group-hover:text-white transition-colors">
                        <Landmark size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-block font-mono text-[10px] font-bold text-[#1a73e8] bg-blue-50 px-1.5 py-0.5 rounded">
                            #{vault.vault_code || vault.id}
                          </span>
                          <span className="bg-blue-50 text-[11px] text-[#1a73e8] border border-blue-200 py-0.5 px-2 rounded-full font-bold">Active</span>
                        </div>
                        <h4 className="text-base font-black text-[#1a2b4b] truncate mt-1">{vault.name}</h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {canRequestCashIn && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRequestCashIn?.(vault);
                          }}
                          title="Request cash-in for this vault"
                          className="inline-flex items-center gap-1 bg-[#1a73e8] text-white text-[11px] font-bold py-1 px-2.5 rounded-full hover:bg-blue-600 transition-colors cursor-pointer"
                        >
                          <ArrowUpRight size={13} /> Cash In
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); onSetDefault?.(vault.id); }}
                        disabled={savingDefaultVaultId === vault.id}
                        title={defaultVaultId === vault.id ? "Default vault" : "Set as default"}
                        className="flex items-center gap-1.5 group/toggle"
                      >
                        <div className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${defaultVaultId === vault.id ? "bg-[#1a73e8]" : "bg-slate-200 group-hover/toggle:bg-slate-300"}`}>
                          {savingDefaultVaultId === vault.id ? (
                            <div className="absolute inset-0 flex items-center justify-center"><Loader2 size={11} className="animate-spin text-white" /></div>
                          ) : (
                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow transition-all duration-200 ${defaultVaultId === vault.id ? "left-5" : "left-1"}`} />
                          )}
                        </div>
                        <span className={`text-[11px] font-bold transition-colors ${defaultVaultId === vault.id ? "text-[#1a73e8]" : "text-slate-400"}`}>Default</span>
                      </button>

                      {(canEdit || canDelete || canEditThreshold) && (
                        <div className="relative inline-block text-left">
                          <button
                            onClick={toggleMenu}
                            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 focus:outline-none transition-colors duration-200 cursor-pointer"
                            aria-label="Actions"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 12c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                            </svg>
                          </button>

                          {isMenuOpen && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -5 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -5 }}
                              transition={{ duration: 0.15 }}
                              onClick={(e) => e.stopPropagation()}
                              className={`absolute right-0 mt-1 bg-white border border-gray-200 divide-y divide-gray-100 rounded-lg shadow-xl z-50 overflow-hidden ${isConfirmingDelete ? "w-44" : "w-36"}`}
                            >
                              <AnimatePresence mode="wait">
                                {!isConfirmingDelete ? (
                                  <motion.div key="options" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                    {canEditThreshold && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveActionMenuId(null);
                                          onOpenThreshold?.(vault);
                                        }}
                                        className="flex items-center w-full px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors gap-2 font-medium cursor-pointer"
                                      >
                                        <Settings size={14} />
                                        Vault Rules
                                      </button>
                                    )}
                                    {canEdit && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveActionMenuId(null);
                                          onEdit(vault);
                                        }}
                                        className="flex items-center w-full px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors gap-2 font-medium cursor-pointer"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                        Edit
                                      </button>
                                    )}
                                    {canDelete && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDeleteConfirmId(vault.id);
                                        }}
                                        className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors gap-2 font-medium cursor-pointer"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        Delete
                                      </button>
                                    )}
                                  </motion.div>
                                ) : (
                                  <motion.div
                                    key="confirm"
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    className="py-4 text-center"
                                  >
                                    <p className="text-xs text-gray-500 font-medium mb-2">Are you sure?</p>
                                    <div className="flex justify-center gap-2">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDeleteConfirmId(null);
                                        }}
                                        className="px-2 py-1 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-600 rounded transition-colors cursor-pointer"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        disabled={isApiDeleting}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onDelete(vault.id);
                                        }}
                                        className="px-2 py-1 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded transition-colors cursor-pointer"
                                      >
                                        {isApiDeleting ? <Loader2 className="w-4 h-4 mx-2 animate-spin" /> : "Confirm"}
                                      </button>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </motion.div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 font-semibold mt-2.5 ml-0.5 truncate">{vault.address || "No address recorded"}</p>

                  {/* Balance + racks */}
                  <div className="mt-4 pt-4 border-t border-dashed border-slate-200 flex items-end justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Available Balance</p>
                      <p className={`text-2xl font-black mt-0.5 ${balance > 0 ? "text-[#1a2b4b]" : "text-slate-300"}`}>৳{fmt(balance)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Racks</p>
                      <p className="text-sm font-black text-[#1a2b4b] mt-0.5">{vault.total_racks || "—"}</p>
                    </div>
                  </div>

                  {/* Last cash in / out */}
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Last Cash In</p>
                      <p className="text-[11px] font-bold text-slate-600 mt-0.5">
                        {vault.last_cash_in ? dayjs(vault.last_cash_in).format("DD MMM, YYYY hh:mm A") : "—"}
                      </p>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Last Cash Out</p>
                      <p className="text-[11px] font-bold text-slate-600 mt-0.5">
                        {vault.last_cash_out ? dayjs(vault.last_cash_out).format("DD MMM, YYYY hh:mm A") : "—"}
                      </p>
                    </div>
                  </div>

                  {/* View Bags */}
                  <div className="mt-4">
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => onOpenDrawer(vault)}
                      className="w-full px-4 py-2.5 bg-green-50 border border-green-200 cursor-pointer text-green-600 text-sm font-bold rounded-xl inline-flex items-center justify-center gap-1.5 hover:bg-green-100 transition-colors"
                    >
                      <span>View {bagCount} Bag{bagCount !== 1 ? "s" : ""}</span>
                      <ChevronRight className="w-4 h-4" />
                    </motion.button>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer / pagination (mirrors DataTable) */}
      <div className="px-6 py-3 bg-[#F9FBFD] border-t border-slate-200 shrink-0">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-400">
          <div>
            Showing {showingFrom} to {showingTo} of {totalEntries} entries
          </div>

          {showPaginationControls ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => changePage(paginationData.current_page - 1)}
                disabled={!paginationData?.prev_page_url}
                className="px-3 py-2 text-slate-600 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
              >
                <FiChevronLeft size={14} /> Previous
              </button>

              <div className="flex items-center gap-1">
                {generatePageNumbers().map((page, index) => (
                  <button
                    key={index}
                    onClick={() => (typeof page === "number" ? changePage(page) : null)}
                    disabled={page === "..."}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      page === paginationData.current_page ? "bg-[#1a73e8] text-white border-2 border-white shadow" : "text-slate-500 hover:bg-slate-100"
                    } ${page === "..." ? "cursor-default" : "cursor-pointer"}`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() => changePage(paginationData.current_page + 1)}
                disabled={!paginationData?.next_page_url}
                className="px-3 py-2 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
              >
                Next <FiChevronRight size={14} />
              </button>
            </div>
          ) : (
            <div className="text-xs text-slate-400 font-semibold">All entries loaded</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VaultCardList;
