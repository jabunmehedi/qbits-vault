import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Scale, Wallet } from "lucide-react";
import CustomModal from "../global/modal/CustomModal";
import { SettleVariance, ViewReconcile } from "../../services/Reconcile";
import { useToast } from "../../hooks/useToast";

const fmt = (n) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });

const SettleVarianceModal = ({ reconciliationId, bagId, onClose, onSettled }) => {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ["reconcileReport", reconciliationId],
    queryFn: async () => {
      const res = await ViewReconcile(reconciliationId);
      return res?.data || null;
    },
    enabled: !!reconciliationId,
  });

  const bagEntry = (data?.variance_bags || []).find((b) => Number(b.id) === Number(bagId));
  const difference = Number(bagEntry?.pivot?.difference || 0);
  const isShortage = difference > 0;
  const absDiff = Math.abs(difference);
  const alreadySettled = Number(bagEntry?.pivot?.settled_amount || 0);
  const outstanding = Math.max(Math.round((absDiff - alreadySettled) * 100) / 100, 0);
  const bagLabel = bagEntry?.barcode || bagEntry?.bag_identifier_barcode || `Bag #${bagId}`;

  // Controlled-with-fallback so the default appears once the query resolves,
  // without a setState-in-effect.
  const [amountInput, setAmountInput] = useState(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const amount = amountInput === null ? (outstanding ? String(outstanding) : "") : amountInput;
  const amountNum = Number(amount || 0);
  const tooMuch = amountNum > outstanding;
  const canSubmit = !submitting && !isLoading && !!bagEntry && amountNum > 0 && !tooMuch;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    const res = await SettleVariance(reconciliationId, bagId, {
      amount: amountNum,
      note: note?.trim() || undefined,
    });
    setSubmitting(false);

    if (res?.success) {
      addToast({ type: "success", message: res?.message || "Variance settled" });
      queryClient.invalidateQueries({ queryKey: ["vaultStatement"] });
      queryClient.invalidateQueries({ queryKey: ["reconcileReport", reconciliationId] });
      onSettled?.();
      onClose?.();
    } else {
      addToast({ type: "error", message: res?.message || "Could not settle variance" });
    }
  };

  return (
    <CustomModal
      isCloseModal={onClose}
      className="max-w-lg !rounded-2xl"
      title={
        <span className="flex items-center gap-2 text-[#1a2b4b]">
          <Scale size={18} className="text-[#1a73e8]" /> Settle variance
        </span>
      }
    >
      {isLoading ? (
        <div className="py-16 flex items-center justify-center gap-2 text-slate-400 text-sm">
          <Loader2 className="animate-spin" size={16} /> Loading reconcile...
        </div>
      ) : !bagEntry ? (
        <div className="py-16 text-center text-sm font-semibold text-slate-400">Could not load this bag&apos;s variance.</div>
      ) : outstanding <= 0 ? (
        <div className="py-16 text-center text-sm font-semibold text-emerald-600">This bag&apos;s variance is already fully settled.</div>
      ) : (
        <div className="space-y-5">
          {/* Context */}
          <div className={`rounded-xl border px-4 py-3 ${isShortage ? "bg-rose-50 border-rose-100" : "bg-emerald-50 border-emerald-100"}`}>
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-600">
                Bag <span className="font-mono font-bold text-slate-800">{bagLabel}</span>
              </span>
              <span className={`font-black ${isShortage ? "text-rose-600" : "text-emerald-600"}`}>
                {isShortage ? "Shortage" : "Surplus"} ৳{fmt(outstanding)}
              </span>
            </div>
            <p className="text-[11px] font-semibold text-slate-500 mt-1">
              {isShortage
                ? "The fine you collect will be added back to this bag (credit)."
                : "The excess will be removed from this bag (debit)."}
            </p>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">Settlement amount (৳)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmountInput(e.target.value)}
              className={`w-full rounded-xl border px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:ring-2 ${
                tooMuch ? "border-rose-300 focus:ring-rose-100" : "border-slate-200 focus:ring-blue-100 focus:border-[#1a73e8]"
              }`}
              placeholder="0.00"
            />
            {tooMuch && <p className="text-[11px] font-semibold text-rose-500 mt-1">Cannot exceed the outstanding ৳{fmt(outstanding)}.</p>}
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">Note (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#1a73e8] resize-none"
              placeholder="e.g. Fine collected from custodian"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1a73e8] text-white font-bold text-sm hover:bg-[#1665d8] transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? <Loader2 className="animate-spin" size={15} /> : <Wallet size={15} />}
              Settle ৳{fmt(amountNum)}
            </button>
          </div>
        </div>
      )}
    </CustomModal>
  );
};

export default SettleVarianceModal;
