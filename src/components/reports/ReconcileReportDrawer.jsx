import { Fragment, useState } from "react";
import dayjs from "dayjs";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, CheckCircle2, ChevronDown, Loader2, Scale, StickyNote, TrendingDown, TrendingUp, UserIcon, Wallet } from "lucide-react";
import Drawer from "../global/drawer/Drawer";
import Can from "../global/can/Can";
import SettleVarianceModal from "./SettleVarianceModal";
import { ViewReconcile } from "../../services/Reconcile";

const fmt = (n) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });
const dt = (v) => (v ? dayjs(v).format("DD MMM YYYY, h:mm A") : "—");

const varianceMeta = (variance) => {
  const v = Number(variance || 0);
  if (v > 0) return { label: "Shortage", tone: "text-rose-600", bg: "bg-rose-50", border: "border-rose-100", Icon: TrendingDown };
  if (v < 0) return { label: "Surplus", tone: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100", Icon: TrendingUp };
  return { label: "Matched", tone: "text-slate-600", bg: "bg-slate-50", border: "border-slate-200", Icon: Scale };
};

const StatCard = ({ label, value, tone = "text-[#1a2b4b]" }) => (
  <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
    <p className={`text-base font-black mt-0.5 ${tone}`}>৳{fmt(value)}</p>
  </div>
);

const ReconcileReportDrawer = ({ reconciliationId, isOpen, onClose, onSettled }) => {
  const [settleBagId, setSettleBagId] = useState(null);
  const [expandedBagId, setExpandedBagId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["reconcileReport", reconciliationId],
    queryFn: async () => {
      const res = await ViewReconcile(reconciliationId);
      return res?.data || null;
    },
    enabled: isOpen && !!reconciliationId,
  });

  const loading = isLoading && isOpen && !!reconciliationId;
  const variance = Number(data?.variance || 0);
  const meta = varianceMeta(variance);
  const absVariance = Math.abs(variance);
  const bags = data?.variance_bags || [];
  const totalAbsDiff = bags.reduce((s, b) => s + Math.abs(Number(b?.pivot?.difference || 0)), 0);
  const totalSettled = bags.reduce((s, b) => s + Number(b?.pivot?.settled_amount || 0), 0);
  const outstanding = Math.max(Math.round((totalAbsDiff - totalSettled) * 100) / 100, 0);

  return (
    <>
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      className="bg-[#F8FAFC] w-full sm:w-[46%]"
      title={
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-blue-50 text-[#1a73e8] flex items-center justify-center">
            <Scale size={16} />
          </span>
          <div>
            <p className="text-sm font-black text-[#1a2b4b] leading-tight">Reconciliation Report</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{data?.reconcile_tran_id || "—"}</p>
          </div>
        </div>
      }
    >
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
        {loading ? (
          <div className="py-24 flex items-center justify-center gap-2 text-slate-400 text-sm">
            <Loader2 className="animate-spin" size={16} /> Loading reconcile report...
          </div>
        ) : !data ? (
          <div className="py-24 flex items-center justify-center text-sm font-semibold text-slate-400">Could not load this reconcile.</div>
        ) : (
          <>
            {/* Variance summary */}
            <div className={`rounded-2xl border ${meta.border} ${meta.bg} px-5 py-4`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <meta.Icon className={meta.tone} size={18} />
                  <span className={`text-sm font-black uppercase tracking-wide ${meta.tone}`}>{meta.label}</span>
                </div>
                <span className={`text-xl font-black ${meta.tone}`}>৳{fmt(absVariance)}</span>
              </div>
              <p className="text-[11px] font-semibold text-slate-500 mt-1">Expected − Counted across all counted bags</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <StatCard label="Expected" value={data.expected_balance} />
              <StatCard label="Counted" value={data.counted_balance} />
              <StatCard label="Variance" value={absVariance} tone={meta.tone} />
            </div>

            {/* Settlement status (aggregated across bags) */}
            {totalAbsDiff > 0 && (
              <div className={`rounded-xl border px-4 py-3 ${outstanding <= 0 ? "bg-emerald-50 border-emerald-100" : "bg-amber-50 border-amber-100"}`}>
                {outstanding <= 0 ? (
                  <div className="flex items-center gap-2.5 text-xs">
                    <CheckCircle2 className="text-emerald-600 shrink-0" size={16} />
                    <p className="font-bold text-emerald-700">Fully settled · ৳{fmt(totalSettled)} across all bags</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 text-xs">
                    <Wallet className="text-amber-600 shrink-0" size={16} />
                    <p className="font-bold text-amber-700">
                      Outstanding ৳{fmt(outstanding)}
                      {totalSettled > 0 && <span className="text-slate-500 font-semibold"> · ৳{fmt(totalSettled)} settled</span>}
                      <span className="font-semibold text-slate-500"> — settle per bag from the statement</span>
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Per-bag breakdown */}
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Per-bag count</p>
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider">
                      <th className="text-left font-bold px-3 py-2">Bag</th>
                      <th className="text-right font-bold px-3 py-2">Expected</th>
                      <th className="text-right font-bold px-3 py-2">Counted</th>
                      <th className="text-right font-bold px-3 py-2">Difference</th>
                      <th className="text-right font-bold px-3 py-2">Settled</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bags.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-6 text-center text-slate-400 font-semibold">No bag-level records.</td>
                      </tr>
                    ) : (
                      bags.map((bag) => {
                        const diff = Number(bag?.pivot?.difference || 0);
                        const settled = Number(bag?.pivot?.settled_amount || 0);
                        const fullySettled = diff !== 0 && settled >= Math.abs(diff);
                        const diffTone = diff > 0 ? "text-rose-600" : diff < 0 ? "text-emerald-600" : "text-slate-400";
                        const settleNote = (bag?.pivot?.settlement_note || "").trim();
                        const settledAt = bag?.pivot?.settled_at;
                        const hasSettleNote = !!settleNote;
                        const isExpanded = expandedBagId === bag.id;
                        return (
                          <Fragment key={bag.id}>
                            <tr className="border-t border-slate-100">
                              <td className="px-3 py-2 font-mono text-[#1a73e8] font-semibold">{bag.barcode || bag.bag_identifier_barcode || `#${bag.id}`}</td>
                              <td className="px-3 py-2 text-right text-slate-600">৳{fmt(bag?.pivot?.expected_amount)}</td>
                              <td className="px-3 py-2 text-right text-slate-600">৳{fmt(bag?.pivot?.counted_amount)}</td>
                              <td className={`px-3 py-2 text-right font-bold ${diffTone}`}>{diff === 0 ? "—" : `৳${fmt(Math.abs(diff))}`}</td>
                              <td className="px-3 py-2 text-right font-semibold">
                                <div className="flex items-center justify-end gap-1.5">
                                  {diff === 0 ? (
                                    <span className="text-slate-300">—</span>
                                  ) : fullySettled ? (
                                    <span className="text-emerald-600">৳{fmt(settled)}</span>
                                  ) : (
                                    <Can
                                      perform="reconciliation.settle"
                                      fallback={<span className={settled > 0 ? "text-amber-600" : "text-slate-400"}>{settled > 0 ? `৳${fmt(settled)}` : "Not settled"}</span>}
                                    >
                                      <button
                                        type="button"
                                        onClick={() => setSettleBagId(bag.id)}
                                        className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 border border-amber-200 bg-amber-50 rounded-md px-2 py-0.5 hover:border-amber-500 transition cursor-pointer"
                                      >
                                        <Wallet size={11} /> Settle{settled > 0 ? ` (৳${fmt(settled)})` : ""}
                                      </button>
                                    </Can>
                                  )}
                                  {hasSettleNote && (
                                    <button
                                      type="button"
                                      onClick={() => setExpandedBagId(isExpanded ? null : bag.id)}
                                      title="View settle note"
                                      aria-label="View settle note"
                                      className="inline-flex items-center text-slate-400 hover:text-[#1a73e8] transition cursor-pointer"
                                    >
                                      <StickyNote size={13} />
                                      <ChevronDown size={12} className={`transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                            {isExpanded && hasSettleNote && (
                              <tr className="bg-amber-50/40">
                                <td colSpan={5} className="px-3 py-2.5">
                                  <div className="flex items-start gap-2 text-[11px]">
                                    <StickyNote size={13} className="text-amber-500 mt-0.5 shrink-0" />
                                    <div className="min-w-0">
                                      <p className="font-semibold text-slate-500">
                                        Settled ৳{fmt(settled)}{settledAt ? ` · ${dt(settledAt)}` : ""}
                                      </p>
                                      <p className="text-slate-700 italic mt-0.5 break-words whitespace-pre-wrap">“{settleNote}”</p>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Meta */}
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-slate-400 font-semibold"><CalendarDays size={14} /> Completed</span>
                <span className="font-semibold text-slate-700">{dt(data.completed_at)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-slate-400 font-semibold"><UserIcon size={14} /> Started by</span>
                <span className="font-semibold text-slate-700">{data.started_by_user?.name || "—"}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-slate-400 font-semibold"><UserIcon size={14} /> Completed by</span>
                <span className="font-semibold text-slate-700">{data.completed_by_user?.name || "—"}</span>
              </div>
              {data.resolution_reason && (
                <div className="pt-2 border-t border-slate-100 text-xs">
                  <p className="text-slate-400 font-semibold mb-0.5">Resolution reason</p>
                  <p className="text-slate-600 italic">“{data.resolution_reason}”</p>
                </div>
              )}
              {data.notes && (
                <div className="pt-2 border-t border-slate-100 text-xs">
                  <p className="text-slate-400 font-semibold mb-0.5">Notes</p>
                  <p className="text-slate-600 italic">“{data.notes}”</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Drawer>

    {settleBagId && (
      <SettleVarianceModal
        reconciliationId={reconciliationId}
        bagId={settleBagId}
        onClose={() => setSettleBagId(null)}
        onSettled={() => onSettled?.()}
      />
    )}
    </>
  );
};

export default ReconcileReportDrawer;
