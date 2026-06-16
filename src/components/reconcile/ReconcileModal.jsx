import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import CustomModal from "../global/modal/CustomModal";
import { AnimatePresence, motion } from "framer-motion";
import { Building2, ChevronDown, Loader2 } from "lucide-react";
import { GetLatestReconcile, StartReconcile, UpdateReconcile, ViewReconcile } from "../../services/Reconcile";
import dayjs from "dayjs";
import { useToast } from "../../hooks/useToast";
import { useSelector } from "react-redux";
import { selectAuthUser } from "../../store/authSlice";

const ReconcileModal = ({ isClose, refetch, reconcileId, defaultVaultId }) => {
  const [selectedVaultId, setSelectedVaultId] = useState(null);
  const [latestReconcileData, setLatestReconcileData] = useState([]);
  const [vaults, setVaults] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const [modalLoading, setModalLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addToast } = useToast();

  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);
  const user = useSelector(selectAuthUser);
  const defaultSelectedVaultId = !reconcileId && defaultVaultId ? Number(defaultVaultId) : null;

  const getCurrentTime = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  };
  const [selectedTime, setSelectedTime] = useState(getCurrentTime());
  const [auditDate, setAuditDate] = useState(() => new Date().toISOString().split("T")[0]);

  useEffect(() => {
    if (user?.vault_assignments?.length === 0) return;
    const assignVaults = user?.vault_assignments?.filter((assign) => assign.status === "active");
    setVaults(assignVaults);
    GetLatestReconcile().then((res) => setLatestReconcileData(res?.data || []));
  }, [user?.vault_assignments]);

  useEffect(() => {
    if (defaultSelectedVaultId) {
      setSelectedVaultId(defaultSelectedVaultId);
    }
  }, [defaultSelectedVaultId]);

  useEffect(() => {
    if (reconcileId) {
      setModalLoading(true);
      ViewReconcile(reconcileId)
        .then((res) => {
          const targetData = res?.data || res;
          if (targetData) {
            setSelectedVaultId(targetData.vault_id);
            if (targetData.from_date) setAuditDate(dayjs(targetData.from_date).format("YYYY-MM-DD"));
            if (targetData.audit_time) {
              const [h, m] = targetData.audit_time.split(":");
              setSelectedTime(`${h}:${m}`);
            }
          }
        })
        .catch((err) => console.error("Error retrieving reconcile:", err))
        .finally(() => setModalLoading(false));
    }
  }, [reconcileId]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e) => {
      if (buttonRef.current && !buttonRef.current.contains(e.target) && dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropdownOpen]);

  const openDropdown = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 8, left: rect.left, width: rect.width });
    }
    setDropdownOpen(true);
  };

  const handleVaultSelect = (vaultId) => {
    setSelectedVaultId(vaultId);
    setDropdownOpen(false);
  };

  const selectedVaultName = vaults.find((v) => v.vault_id === selectedVaultId)?.vault?.name;

  const handleSubmitRequest = async () => {
    try {
      setIsSubmitting(true);
      const payload = {
        vault_id: selectedVaultId,
        from_date: auditDate,
        audit_time: `${selectedTime}:00`,
      };

      if (reconcileId) {
        await UpdateReconcile(reconcileId, payload);
        addToast({ type: "success", message: "Reconciliation rescheduled successfully" });
      } else {
        const res = await StartReconcile({
          ...payload,
          from_date: latestReconcileData?.to_date || auditDate,
        });
        if (!res?.success) {
          addToast({ type: "error", message: res?.message || "Failed to start reconciliation. Please try again." });
          return;
        }
      }

      await refetch();
      isClose();
    } catch (error) {
      console.error("Failed to save reconciliation:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <CustomModal isCloseModal={isClose} title={reconcileId ? "Reschedule Reconciliation" : "Setup Reconciliation"}>
      <div className="flex flex-col">
        {modalLoading ? (
          <div className="flex items-center justify-center h-48">
            <span className="text-sm font-medium text-gray-400 animate-pulse">Loading Configuration...</span>
          </div>
        ) : (
          <>
            {/* Date & Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1 tracking-wide">Set Audit Date</label>
                <input
                  type="date"
                  value={auditDate}
                  onChange={(e) => setAuditDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:border-blue-400 transition-colors text-sm font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1 tracking-wide">Set Audit Time</label>
                <input
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:border-blue-400 transition-colors text-sm font-medium"
                />
              </div>
            </div>

            {/* Vault Selector */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1 tracking-wide">Select Vault</label>
              <button
                ref={buttonRef}
                type="button"
                disabled={!!reconcileId}
                onClick={() => (dropdownOpen ? setDropdownOpen(false) : openDropdown())}
                className="w-full px-4 py-2.5 rounded-xl text-left text-sm flex justify-between items-center min-h-[42px] transition-colors bg-gray-50 border border-gray-200 hover:border-blue-300 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Building2 size={15} className="shrink-0 text-gray-400" />
                  <span className={selectedVaultId ? "text-gray-900 font-medium" : "text-gray-400"}>
                    {selectedVaultName ?? "Choose a vault..."}
                  </span>
                </div>
                <ChevronDown size={15} className={`ml-2 shrink-0 text-gray-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
              </button>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="flex gap-3 justify-end mt-8 pt-4 border-t border-gray-100">
          <button onClick={isClose} className="px-6 py-2.5 text-gray-600 border border-gray-200 rounded-xl font-bold text-sm hover:text-red-400 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmitRequest}
            disabled={!selectedVaultId || modalLoading || isSubmitting}
            className="min-w-[160px] flex justify-center px-6 py-2.5 bg-[#1a73e8] hover:bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {modalLoading || isSubmitting ? <Loader2 className="animate-spin w-4 h-4" /> : reconcileId ? "Update Changes" : "Save"}
          </button>
        </div>
      </div>

      {/* Portal dropdown — renders above all modal layers */}
      {createPortal(
        <AnimatePresence>
          {dropdownOpen && (
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              style={{ position: "fixed", top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width, zIndex: 99999 }}
              className="bg-white border border-gray-200 shadow-2xl rounded-xl p-2"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="max-h-48 overflow-y-auto">
                {vaults?.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-3">No vaults assigned</p>
                ) : (
                  vaults?.map((vault) => (
                    <div
                      key={vault.vault_id}
                      onClick={() => handleVaultSelect(vault.vault_id)}
                      className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors ${
                        selectedVaultId === vault.vault_id ? "bg-blue-50 text-blue-700" : "hover:bg-gray-50 text-gray-700"
                      }`}
                    >
                      <span className="text-sm font-medium">{vault?.vault?.name}</span>
                      {selectedVaultId === vault.vault_id && (
                        <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                      )}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </CustomModal>
  );
};

export default ReconcileModal;
