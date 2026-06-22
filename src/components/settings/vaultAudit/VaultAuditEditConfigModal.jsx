import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import CustomModal from "../../global/modal/CustomModal";
import { useForm, Controller } from "react-hook-form";
import { UpdateVaultAuditConfig } from "../../../services/VaultAudit";
import { ChevronDown, Check, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "../../../hooks/useToast";

const INTERVALS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "bi-weekly", label: "Bi-Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
];

const DAYS = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
];

const CustomSelect = ({ value, onChange, options, placeholder = "Select..." }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const btnRef = useRef(null);
  const dropRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (btnRef.current?.contains(e.target) || dropRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const openDropdown = () => {
    const rect = btnRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    setOpen(true);
  };

  const selected = options.find((o) => o.value === value);

  return (
    <div>
      <button
        ref={btnRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openDropdown())}
        className="w-full h-11 px-4 bg-gray-50 border border-gray-200 hover:border-[#1a73e8]/50 rounded-xl text-sm text-slate-700 flex items-center justify-between transition-colors focus:outline-none focus:border-[#1a73e8]"
      >
        <span className={selected ? "text-slate-700 font-medium" : "text-slate-400"}>{selected?.label || placeholder}</span>
        <ChevronDown size={15} className={`text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={dropRef}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width, zIndex: 99999 }}
              className="bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden"
            >
              {options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-blue-50 transition-colors text-left"
                >
                  <span className={opt.value === value ? "text-[#1a73e8] font-semibold" : "text-slate-700"}>{opt.label}</span>
                  {opt.value === value && <Check size={14} className="text-[#1a73e8]" />}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

const VaultAuditEditConfigModal = ({ auditConfig, setIsModalOpen, refetchData }) => {
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const { handleSubmit, watch, control } = useForm({
    defaultValues: {
      interval: auditConfig?.interval || "weekly",
      day: auditConfig?.day || "monday",
      time: auditConfig?.time || "14:00",
    },
  });

  const currentInterval = watch("interval");

  const handleSubmitForm = async (data) => {
    setIsLoading(true);
    const configId = auditConfig?.id;
    try {
      if (configId) {
        const res = await UpdateVaultAuditConfig({ ...data, status: "configured" }, configId);
        if (res?.success === true) {
          addToast({ type: "success", message: "Audit configuration updated." });
          refetchData();
          setIsModalOpen(false);
        } else if (res?.message) {
          addToast({ type: "error", message: res.message });
        }
      }
    } catch (error) {
      const message = error?.response?.data?.message || "Failed to update configuration.";
      addToast({ type: "error", message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <CustomModal
      title={
        <div className="flex flex-col">
          <span>Edit Audit Configuration</span>
          <span className="text-xs text-gray-600">{auditConfig?.vault?.name}</span>
        </div>
      }
      className="max-w-md"
      isCloseModal={() => setIsModalOpen(false)}
    >
      <form onSubmit={handleSubmit(handleSubmitForm)}>
        <div className="my-4 space-y-4">
          <div>
            <label className="block text-[11px] font-bold tracking-wider text-[#94A3B8] uppercase mb-2">Audit Interval</label>
            <Controller
              name="interval"
              control={control}
              rules={{ required: true }}
              render={({ field }) => <CustomSelect value={field.value} onChange={field.onChange} options={INTERVALS} />}
            />
          </div>

          {currentInterval !== "daily" && (
            <div>
              <label className="block text-[11px] font-bold tracking-wider text-[#94A3B8] uppercase mb-2">Audit Day</label>
              <Controller
                name="day"
                control={control}
                rules={{ required: true }}
                render={({ field }) => <CustomSelect value={field.value} onChange={field.onChange} options={DAYS} />}
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold tracking-wider text-[#94A3B8] uppercase mb-2">Audit Time</label>
            <Controller
              name="time"
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <input
                  type="time"
                  value={field.value}
                  onChange={field.onChange}
                  className="w-full h-11 px-4 bg-gray-50 border border-gray-200 text-sm text-slate-700 rounded-xl focus:outline-none focus:border-[#1a73e8] transition-colors cursor-pointer"
                />
              )}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => setIsModalOpen(false)}
            className="px-6 py-2.5 text-sm font-bold text-gray-600 border border-gray-200 rounded-xl hover:text-red-400 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2.5 text-sm font-bold text-white bg-[#1a73e8] hover:bg-blue-600 rounded-xl shadow-lg shadow-blue-200 transition-all cursor-pointer"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
          </button>
        </div>
      </form>
    </CustomModal>
  );
};

export default VaultAuditEditConfigModal;
