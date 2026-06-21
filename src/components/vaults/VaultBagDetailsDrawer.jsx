import { ArrowDownCircle, ArrowUpCircle, ChevronDown, ChevronLeft, History, Package } from "lucide-react";
import Drawer from "../global/drawer/Drawer";
import { AnimatePresence, motion } from "framer-motion";
import dayjs from "dayjs";
import { useState, useEffect } from "react";
import { GetBagHistory } from "../../services/Vault";

const VaultBagDetailsDrawer = ({ drawerOpen, setDrawerOpen, selectedVault, vaultBagsDetails, loadingBags, expandedBag, toggleBagExpand }) => {
  const [selectedHistoryBag, setSelectedHistoryBag] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (!drawerOpen) {
      setSelectedHistoryBag(null);
      setHistoryData([]);
    }
  }, [drawerOpen]);

  const handleOpenHistory = async (e, bag) => {
    e.stopPropagation();
    setSelectedHistoryBag(bag);
    setLoadingHistory(true);
    try {
      const res = await GetBagHistory(bag.id);
      setHistoryData(res?.history ?? []);
    } catch {
      setHistoryData([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleCloseHistory = () => {
    setSelectedHistoryBag(null);
    setHistoryData([]);
  };

  return (
    <Drawer
      isOpen={drawerOpen}
      onClose={() => setDrawerOpen(false)}
      title={
        <div className="flex items-center gap-4 border-b border-slate-100 pb-4 w-full">
          <div className="p-2.5 bg-blue-50 border border-blue-100/50 rounded-xl text-[#1a73e8] flex-shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div className="truncate">
            <h2 className="text-base font-bold text-slate-800 truncate">{selectedVault?.name}</h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5 tracking-wider uppercase">{selectedVault?.vault_id}</p>
          </div>
        </div>
      }
    >
      <div className="relative overflow-hidden h-full">
        {/* ── Bag list panel ── */}
        <div className="p-6 pt-0 max-h-[calc(100vh-120px)] overflow-y-auto scrollbar-thin">
          <div className="mb-6 mt-4 px-4 py-3 bg-slate-50/60 border border-slate-200/50 rounded-2xl flex items-center justify-between shadow-2xs">
            <span className="text-sm font-semibold text-slate-600">
              Total Bags: <span className="text-slate-800 font-bold">{vaultBagsDetails.length}</span>
            </span>
            <span className="text-sm font-semibold text-slate-600">
              Total Amount:{" "}
              <span className="text-emerald-600 font-bold">
                ৳{vaultBagsDetails.reduce((s, b) => s + parseFloat(b.current_amount || 0), 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </span>
          </div>

          {loadingBags ? (
            <div className="flex items-center justify-center py-24">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-100 border-t-[#1a73e8]" />
            </div>
          ) : vaultBagsDetails.length === 0 ? (
            <div className="text-center py-24 border border-dashed border-slate-200 rounded-2xl bg-slate-50/30">
              <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-sm font-semibold text-slate-400">No active bags mapped inside this vault scope.</p>
            </div>
          ) : (
            <div className="space-y-4 pb-6">
              {vaultBagsDetails.map((bag) => {
                const denominations = bag.denominations ? JSON.parse(bag.denominations) : null;
                const totalNotes = denominations ? Object.values(denominations).reduce((a, b) => a + b, 0) : 0;
                const isExpanded = expandedBag === bag.barcode;

                return (
                  <motion.div
                    key={bag.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`bg-white border rounded-2xl overflow-hidden transition-all duration-150 ${
                      isExpanded ? "border-slate-300/80 shadow-xs" : "border-slate-200/80 hover:border-slate-300"
                    }`}
                  >
                    <div
                      onClick={() => toggleBagExpand(bag.barcode)}
                      className="w-full p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left transition hover:bg-slate-50/50 cursor-pointer"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="p-2 bg-slate-50 border border-slate-100 rounded-xl text-slate-500 mt-0.5 flex-shrink-0">
                          <Package className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-800 tracking-wide font-mono">{bag.barcode}</h4>
                            <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded-md bg-slate-100 text-slate-600 border border-slate-200/40">
                              Rack {bag.rack_number}
                            </span>
                            {bag.is_sealed && (
                            <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-blue-50 text-[#1a73e8] border border-blue-100/50 rounded-md">
                              Sealed
                            </span>
                            )}
                            {!bag.is_active && (
                              <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-rose-50 text-rose-600 border border-rose-100/50 rounded-md">
                                Inactive
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-2">
                            <span className="text-base font-extrabold text-slate-800">
                              ৳{parseFloat(bag.current_amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </span>
                            <div className="flex items-center gap-3 text-slate-400 text-xs font-medium">
                              {bag.last_cash_in_at && (
                                <span className="flex items-center gap-1">
                                  <ArrowDownCircle className="w-3.5 h-3.5 text-emerald-500" />
                                  {dayjs(bag.last_cash_in_at).format("DD MMM, YYYY")}
                                </span>
                              )}
                              {bag.last_cash_out_at && (
                                <span className="flex items-center gap-1">
                                  <ArrowUpCircle className="w-3.5 h-3.5 text-rose-500" />
                                  {dayjs(bag.last_cash_out_at).format("DD MMM, YYYY")}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={(e) => handleOpenHistory(e, bag)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/60 rounded-lg transition"
                        >
                          <History className="w-3 h-3" /> History
                        </button>
                        <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.15 }} className="text-slate-400 p-1">
                          <ChevronDown className="w-4 h-4" />
                        </motion.div>
                      </div>
                    </div>

                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: "easeOut" }}
                          className="border-t border-slate-100 bg-slate-50/40"
                        >
                          <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 space-y-2">
                              <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Denomination Matrix</h5>
                              {denominations ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                  {Object.entries(denominations)
                                    .filter(([, c]) => c > 0)
                                    .map(([note, count]) => (
                                      <div key={note} className="bg-white p-3.5 rounded-xl border border-slate-200/60 shadow-2xs flex flex-col justify-between">
                                        <div className="flex items-baseline justify-between">
                                          <span className="text-xs font-bold text-slate-400 font-mono">Note</span>
                                          <span className="text-sm font-black text-slate-800">৳{note}</span>
                                        </div>
                                        <div className="flex items-baseline justify-between mt-2 pt-1.5 border-t border-slate-100">
                                          <span className="text-[10px] text-slate-400">
                                            Qty: <strong className="text-slate-700 font-semibold">{count}</strong>
                                          </span>
                                          <span className="text-xs font-extrabold text-emerald-600">৳{(parseInt(note) * count).toLocaleString()}</span>
                                        </div>
                                      </div>
                                    ))}
                                  {totalNotes === 0 && <p className="col-span-full text-slate-400 text-xs py-4">No denomination ledger mappings found.</p>}
                                </div>
                              ) : (
                                <p className="text-slate-400 text-xs py-2">Denomination structures unavailable.</p>
                              )}
                            </div>

                            <div className="space-y-2">
                              <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Activity Metrics</h5>
                              <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-2xs space-y-3.5 text-xs font-semibold">
                                {bag.last_cash_in_amount && (
                                  <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Last cashIn Entry</p>
                                    <p className="text-base font-black text-emerald-600">+ ৳{parseFloat(bag.last_cash_in_amount).toLocaleString()}</p>
                                    <p className="text-[10px] text-slate-400 font-medium font-mono">{dayjs(bag.last_cash_in_at).format("DD MMM YYYY, h:mm A")}</p>
                                  </div>
                                )}
                                {bag.last_cash_out_amount && (
                                  <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Last Cashout Entry</p>
                                    <p className="text-base font-black text-red-600">+ ৳{parseFloat(bag.last_cash_out_amount).toLocaleString()}</p>
                                    <p className="text-[10px] text-slate-400 font-medium font-mono">{dayjs(bag.last_cash_out_at).format("DD MMM YYYY, h:mm A")}</p>
                                  </div>
                                )}
                                {bag.notes && (
                                  <div className="pt-2 border-t border-slate-100">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Notes Ledger</p>
                                    <p className="text-slate-600 font-medium mt-1 leading-relaxed text-[11px] bg-slate-50 p-2 border border-slate-100 rounded-lg">
                                      {bag.notes}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── History slide-over panel ── */}
        <AnimatePresence>
          {selectedHistoryBag && (
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 220 }}
              className="absolute inset-0 bg-white z-10 flex flex-col"
            >
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                <button
                  onClick={handleCloseHistory}
                  className="p-1.5 hover:bg-slate-100 rounded-lg transition"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-500" />
                </button>
                <div>
                  <p className="text-sm font-bold text-slate-800">Bag History</p>
                  <p className="text-xs text-slate-400 font-mono">{selectedHistoryBag.barcode}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
                {loadingHistory ? (
                  <div className="flex items-center justify-center py-24">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-100 border-t-[#1a73e8]" />
                  </div>
                ) : historyData.length === 0 ? (
                  <div className="text-center py-24">
                    <History className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                    <p className="text-sm font-semibold text-slate-400">No history found for this bag.</p>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-100" />
                    <div className="space-y-5">
                      {historyData.map((entry, i) => {
                        const isCashIn = entry.source === "cash_in";
                        const isCashOut = entry.source === "cash_out";
                        const isVariance = entry.source === "reconcile_variance";
                        const isSettlement = entry.source === "reconcile_settlement";
                        const dotColor = isCashIn ? "bg-emerald-500" : isCashOut ? "bg-rose-500" : isVariance ? "bg-amber-500" : isSettlement ? "bg-emerald-500" : "bg-[#1a73e8]";
                        const labelColor = isCashIn ? "text-emerald-600" : isCashOut ? "text-rose-600" : isVariance ? "text-amber-600" : isSettlement ? "text-emerald-600" : "text-[#1a73e8]";
                        return (
                          <div key={i} className="flex gap-4">
                            <div className={`w-3.5 h-3.5 rounded-full ${dotColor} border-2 border-white shadow-sm mt-1 flex-shrink-0 z-10`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-[11px] font-bold uppercase tracking-wider ${labelColor}`}>{entry.event}</span>
                                {entry.status && (
                                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded capitalize">
                                    {entry.status}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-700 font-medium mt-0.5 leading-relaxed">{entry.description}</p>
                              <div className="flex items-center gap-3 mt-1.5">
                                {entry.user_name && (
                                  <span className="text-[10px] text-slate-400 font-medium">{entry.user_name}</span>
                                )}
                                <span className="text-[10px] text-slate-300 font-mono">
                                  {dayjs(entry.timestamp).format("DD MMM YYYY, h:mm A")}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Drawer>
  );
};

export default VaultBagDetailsDrawer;
