import { ArrowDownCircle, ArrowUpCircle, ChevronDown, History, Package } from "lucide-react";
import Drawer from "../global/drawer/Drawer";
import { AnimatePresence, motion } from "framer-motion";
import dayjs from "dayjs";
import { useState } from "react";

const VaultBagDetailsDrawer = ({ drawerOpen, setDrawerOpen, selectedVault, vaultBagsDetails, loadingBags }) => {
  const [expandedBag, setExpandedBag] = useState(null);
  const [historyBag, setHistoryBag] = useState(null);

  console.log({ historyBag });

  const toggleBagExpand = (barcode) => setExpandedBag(expandedBag === barcode ? null : barcode);

  return (
    <Drawer
      isOpen={drawerOpen}
      onClose={() => setDrawerOpen(false)}
      title={
        <div className="flex items-center gap-4 border-b border-slate-100 pb-4 w-full">
          <div className="p-2.5 bg-cyan-50 border border-cyan-100/50 rounded-xl text-cyan-600 flex-shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div className="truncate">
            <h2 className="text-base font-bold text-slate-800 truncate">{selectedVault?.name}</h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5 tracking-wider uppercase">{selectedVault?.vault_id}</p>
          </div>
        </div>
      }
    >
      <div className="p-6 pt-0 max-h-[calc(100vh-120px)] overflow-y-auto scrollbar-thin">
        {/* Dynamic Context Header Stats Panel */}
        <div className="mb-6 mt-4 p-4 bg-slate-50/60 border border-slate-200/50 rounded-2xl flex items-center justify-between shadow-2xs">
          <div>
            <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase">Cash Bags</h3>
            <p className="text-xl font-extrabold text-slate-800 mt-0.5">
              {vaultBagsDetails.length} Total Node{vaultBagsDetails.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold tracking-wider text-slate-400 uppercase">Aggregated Holdings</p>
            <p className="text-xl font-black text-emerald-600 mt-0.5">
              ৳{vaultBagsDetails.reduce((s, b) => s + parseFloat(b.current_amount || 0), 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {loadingBags ? (
          <div className="flex items-center justify-center py-24">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-100 border-t-cyan-500" />
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
                  {/* Item Container Accordion Bar Trigger */}
                  <button
                    onClick={() => toggleBagExpand(bag.barcode)}
                    className="w-full p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left transition hover:bg-slate-50/50"
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
                            <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-purple-50 text-purple-600 border border-purple-100/50 rounded-md">
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

                    {/* Action Triggers Grid Block */}
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setHistoryBag(bag);
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/60 rounded-lg transition"
                      >
                        <History className="w-3 h-3" /> History
                      </button>

                      <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.15 }} className="text-slate-400 p-1">
                        <ChevronDown className="w-4 h-4" />
                      </motion.div>
                    </div>
                  </button>

                  {/* Expanded Meta-details Accordion Panel Area */}
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
                          {/* Left Panel: Denominations breakdown context */}
                          <div className="lg:col-span-2 space-y-2">
                            <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Denomination Matrix</h5>
                            {denominations ? (
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                {Object.entries(denominations)
                                  .filter(([_, c]) => c > 0)
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

                          {/* Right Panel: Activity Summary metrics */}
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
    </Drawer>
  );
};

export default VaultBagDetailsDrawer;
