import { useEffect, useState } from "react";
import { X, SlidersHorizontal } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { GetVaults } from "../../../services/Vault";
import DateRangePicker from "../dateRangePicker/DateRangePicker";

const VERIFIER_OPTIONS = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "verified", label: "Verified" },
  { value: "rejected", label: "Rejected" },
];

const CASHIER_OPTIONS = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const StatusChips = ({ options, value, onChange }) => (
  <div className="flex flex-wrap gap-2">
    {options.map((opt) => (
      <button
        key={opt.value}
        type="button"
        onClick={() => onChange(opt.value)}
        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
          value === opt.value
            ? "bg-[#1a73e8] text-white border-[#1a73e8]"
            : "bg-white text-gray-600 border-gray-200 hover:border-[#1a73e8] hover:text-[#1a73e8]"
        }`}
      >
        {opt.label}
      </button>
    ))}
  </div>
);

const CashFilterDrawer = ({ isOpen, onClose, filters, onChange }) => {
  const [vaults, setVaults] = useState([]);
  const [draft, setDraft] = useState({ ...filters });

  useEffect(() => {
    if (!isOpen) return;
    setDraft({ ...filters });
    GetVaults().then((res) => setVaults(res?.data?.data || []));
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const patchDraft = (patch) => setDraft((prev) => ({ ...prev, ...patch }));

  const handleApply = () => {
    onChange(draft);
    onClose();
  };

  const handleReset = () => {
    patchDraft({ vault_id: "", verifier_status: "", approver_status: "", from_date: "", to_date: "", preset: "all", min_amount: "", max_amount: "" });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-[60]"
          />

          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 220, mass: 0.8 }}
            className="fixed right-0 top-0 h-full w-[380px] bg-white z-[70] shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#1a73e8]" />
                <span className="font-bold text-[#1a2b4b] text-sm">Advanced Filters</span>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
              {/* Vault */}
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Vault
                </label>
                <select
                  value={draft.vault_id || ""}
                  onChange={(e) => patchDraft({ vault_id: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-[#1a73e8] bg-white cursor-pointer"
                >
                  <option value="">All Vaults</option>
                  {vaults.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Date Range
                </label>
                <DateRangePicker
                  value={{ from_date: draft.from_date, to_date: draft.to_date }}
                  preset={draft.preset}
                  onChange={(next) => patchDraft(next)}
                  className="w-full"
                />
              </div>

              {/* Verifier Status */}
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Verifier Status
                </label>
                <StatusChips
                  options={VERIFIER_OPTIONS}
                  value={draft.verifier_status || ""}
                  onChange={(v) => patchDraft({ verifier_status: v })}
                />
              </div>

              {/* Cashier Status */}
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Cashier Status
                </label>
                <StatusChips
                  options={CASHIER_OPTIONS}
                  value={draft.approver_status || ""}
                  onChange={(v) => patchDraft({ approver_status: v })}
                />
              </div>

              {/* Amount Range */}
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Amount Range
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">৳</span>
                    <input
                      type="number"
                      min="0"
                      value={draft.min_amount || ""}
                      onChange={(e) => patchDraft({ min_amount: e.target.value })}
                      placeholder="Min"
                      className="w-full pl-6 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-[#1a73e8] placeholder:text-gray-300"
                    />
                  </div>
                  <span className="text-gray-300 text-sm font-bold flex-shrink-0">—</span>
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">৳</span>
                    <input
                      type="number"
                      min="0"
                      value={draft.max_amount || ""}
                      onChange={(e) => patchDraft({ max_amount: e.target.value })}
                      placeholder="Max"
                      className="w-full pl-6 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-[#1a73e8] placeholder:text-gray-300"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 py-2.5 text-sm font-semibold border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="flex-1 py-2.5 text-sm font-semibold bg-[#1a73e8] text-white rounded-xl hover:bg-blue-600 transition-colors cursor-pointer"
              >
                Apply Filters
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CashFilterDrawer;
