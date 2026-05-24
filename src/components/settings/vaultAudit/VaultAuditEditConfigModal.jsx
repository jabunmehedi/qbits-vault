import { useState } from "react";
import CustomModal from "../../global/modal/CustomModal";
import { useForm } from "react-hook-form";
import { UpdateVaultAuditConfig } from "../../../services/VaultAudit";
import { Loader2 } from "lucide-react";

const VaultAuditEditConfigModal = ({ auditConfig, setIsModalOpen, refetchData }) => {
  const [isLoading, setIsLoading] = useState(false);

  const { handleSubmit, register, watch } = useForm({
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

    const payload = { ...data, status: "configured" };

    try {
      if (configId) {
        const res = await UpdateVaultAuditConfig(payload, configId);
        if (res?.success === true) {
          refetchData();
          setIsModalOpen(false);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <CustomModal
      title={
        <div className="flex flex-col ">
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
            {/* Note: Removed 'value' and 'onChange' hooks completely */}
            <select
              {...register("interval", { required: true })}
              className="w-full h-11 px-4 border border-[#3B82F6] text-sm text-slate-700 rounded-xl focus:outline-none bg-gray-50 appearance-none cursor-pointer"
              style={{
                backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23334155' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 12px center",
                backgroundSize: "16px",
              }}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="bi-weekly">Bi-Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
            </select>
          </div>

          {currentInterval !== "daily" && (
            <div>
              <label className="block text-[11px] font-bold tracking-wider text-[#94A3B8] uppercase mb-2">Audit Day</label>
              <select
                {...register("day", { required: true })}
                className="w-full h-11 px-4 border border-slate-200 text-sm text-slate-700 rounded-xl focus:outline-none focus:border-slate-300 bg-gray-50 appearance-none cursor-pointer"
                style={{
                  backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23334155' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 12px center",
                  backgroundSize: "16px",
                }}
              >
                <option value="monday">Monday</option>
                <option value="tuesday">Tuesday</option>
                <option value="wednesday">Wednesday</option>
                <option value="thursday">Thursday</option>
                <option value="friday">Friday</option>
                <option value="saturday">Saturday</option>
                <option value="sunday">Sunday</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold tracking-wider text-[#94A3B8] uppercase mb-2">Audit Time</label>
            <div className="relative flex items-center">
              <input
                type="time"
                {...register("time", { required: true })}
                className="w-full h-11 pl-4 pr-10 border border-slate-200 text-sm text-slate-700 rounded-xl focus:outline-none focus:border-slate-300 bg-slate-50/50 cursor-pointer"
              />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 pt-2 ">
          <button
            type="button"
            onClick={() => setIsModalOpen(false)}
            className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2.5 text-sm font-semibold text-white bg-[#0256EB] hover:bg-[#0149C7] rounded-xl shadow-[0_4px_12px_rgba(2,86,235,0.2)] transition-all cursor-pointer"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
          </button>
        </div>
      </form>
    </CustomModal>
  );
};

export default VaultAuditEditConfigModal;
