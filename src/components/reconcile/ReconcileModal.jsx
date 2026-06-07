import { useEffect, useState } from "react";
import CustomModal from "../global/modal/CustomModal";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Loader2 } from "lucide-react";
import { GetVaults } from "../../services/Vault";
import { GetLatestReconcile, StartReconcile, UpdateReconcile, ViewReconcile } from "../../services/Reconcile";
import dayjs from "dayjs";
import { useToast } from "../../hooks/useToast";
import { useSelector } from "react-redux";
import { selectAuthUser } from "../../store/authSlice";

const ReconcileModal = ({ isClose, refetch, reconcileId }) => {
  const [selectedVaultId, setSelectedVaultId] = useState(null);
  const [latestReconcileData, setLatestReconcileData] = useState([]);
  const [vaults, setVaults] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addToast } = useToast();

  const user = useSelector(selectAuthUser);

  const getCurrentTime = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  };
  const [selectedTime, setSelectedTime] = useState(getCurrentTime());

  const getTodayDate = () => new Date().toISOString().split("T")[0];
  const [auditDate, setAuditDate] = useState(getTodayDate());

  // 1. Initial configuration pulling
  useEffect(() => {
    if (user?.vault_assignments?.length === 0) return;

    const assignVaults = user?.vault_assignments?.filter((assign) => assign.status === "active");
    setVaults(assignVaults);
    GetLatestReconcile().then((res) => setLatestReconcileData(res?.data || []));
  }, []);

  // 2. Load and edit mode hook checks
  useEffect(() => {
    if (reconcileId) {
      setModalLoading(true);
      ViewReconcile(reconcileId)
        .then((res) => {
          const targetData = res?.data || res;
          if (targetData) {
            setSelectedVaultId(targetData.vault_id);
            if (targetData.from_date) {
              setAuditDate(dayjs(targetData.from_date).format("YYYY-MM-DD"));
            }
            if (targetData.audit_time) {
              const timeParts = targetData.audit_time.split(":");
              setSelectedTime(`${timeParts[0]}:${timeParts[1]}`);
            }
          }
        })
        .catch((err) => console.error("Error retrieving target single reconcile element:", err))
        .finally(() => setModalLoading(false));
    }
  }, [reconcileId]);

  const handleVaultSelect = (vaultId) => {
    setSelectedVaultId(vaultId);
    setDropdownOpen(false);
  };

  const handleSubmitRequest = async () => {
    try {
      setIsSubmitting(true);
      const combinedToDateTime = `${selectedTime}:00`;

      const payload = {
        vault_id: selectedVaultId,
        from_date: auditDate,
        audit_time: combinedToDateTime,
      };

      if (reconcileId) {
        await UpdateReconcile(reconcileId, payload);
      } else {
        const res = await StartReconcile({
          ...payload,
          from_date: latestReconcileData?.to_date || auditDate,
        });

        if (!res?.success) {
          addToast({
            type: "error",
            message: res?.message || "Failed to start reconciliation. Please try again.",
          });
          return;
        }
      }

      await refetch();
      isClose();
    } catch (error) {
      console.error("Failed to save or update reconciliation form processing parameters:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  console.log({ vaults });
  console.log({ selectedVaultId });

  return (
    <CustomModal isCloseModal={isClose}>
      <div className="flex flex-col">
        {/* Header */}
        <div className="mb-6">
          <p className="text-center text-2xl font-bold text-gray-800">{reconcileId ? "Reschedule Reconciliation" : "Setup Reconciliation"}</p>
        </div>

        {modalLoading ? (
          <div className="flex items-center justify-center h-48">
            <span className="text-sm font-medium text-gray-400 animate-pulse">Loading Configuration...</span>
          </div>
        ) : (
          <>
            {/* Content */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {/* Audit Date Input Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Set audit Date</label>
                <input
                  type="date"
                  value={auditDate}
                  onChange={(e) => setAuditDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all font-medium"
                />
              </div>

              {/* Time Selector Block Input Element */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Set audit Time</label>
                <input
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all font-medium"
                />
              </div>
            </div>

            <p className="mb-3 font-medium text-gray-800">Select Vault</p>

            <div className="relative overflow-visible">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg flex justify-between items-center text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
              >
                {selectedVaultId ? vaults.find((v) => v.vault_id === selectedVaultId)?.vault?.name || "Unknown Vault" : "Choose a Vault"}
                <ChevronDown className={`w-5 h-5 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {dropdownOpen && (
                  <motion.ul
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute z-[100] w-full bg-white border border-gray-200 rounded-lg mt-1 max-h-64 overflow-y-auto shadow-xl divide-y divide-gray-100"
                  >
                    {vaults?.map((vault) => (
                      <li
                        key={vault.vault_id}
                        onClick={() => handleVaultSelect(vault.vault_id)}
                        className="px-4 py-2.5 text-gray-500 gap-2 hover:bg-cyan-50 cursor-pointer transition-colors flex items-center"
                      >
                        <span>{vault?.vault?.name}</span>
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="flex gap-3 justify-end mt-8 pt-4 border-t border-gray-100">
          <button onClick={isClose} className="px-6 py-2.5 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition font-medium">
            Cancel
          </button>

          <button
            onClick={handleSubmitRequest}
            disabled={!selectedVaultId || modalLoading || isSubmitting}
            className="min-w-[160px] flex justify-center px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg font-semibold shadow-md hover:shadow-lg hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {modalLoading || isSubmitting ? <Loader2 className="animate-spin" /> : reconcileId ? "Update Changes" : "Save"}
          </button>
        </div>
      </div>
    </CustomModal>
  );
};

export default ReconcileModal;
