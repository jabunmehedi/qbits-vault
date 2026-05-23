import { useEffect, useState } from "react";
import CustomModal from "../global/modal/CustomModal";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { GetVaults } from "../../services/Vault";
import { GetLatestReconcile, StartReconcile } from "../../services/Reconcile";

const ReconcileModal = ({ isClose, refetch }) => {
  const [selectedVaultId, setSelectedVaultId] = useState(null);
  const [latestReconcileData, setLatestReconcileData] = useState([]);
  const [vaults, setVaults] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // ─── Time Selector State ─────────────────────────────────
  const getCurrentTime = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  };
  const [selectedTime, setSelectedTime] = useState(getCurrentTime());

  // ─── State-Driven Audit Date ─────────────────────────────
  const getTodayDate = () => new Date().toISOString().split("T")[0];
  const [auditDate, setAuditDate] = useState(getTodayDate());

  useEffect(() => {
    GetVaults().then((res) => setVaults(res.data || []));
  }, []);

  useEffect(() => {
    GetLatestReconcile().then((res) => setLatestReconcileData(res?.data || []));
  }, []);

  const handleVaultSelect = (vaultId) => {
    setSelectedVaultId(vaultId);
    setDropdownOpen(false);
  };

  const handleSubmitRequest = async () => {
    try {
      // Combines user selected audit date and time safely
      // Example payload output: "2026-05-23 14:30:00"
      const combinedToDateTime = `${selectedTime}:00`;

      await StartReconcile({
        vault_id: selectedVaultId,
        from_date: latestReconcileData?.to_date,
        audit_time: combinedToDateTime,
      });

      // Refresh data
      await refetch();
      isClose();
    } catch (error) {
      console.error("Failed to start reconciliation:", error);
    }
  };

  return (
    <CustomModal isCloseModal={isClose}>
      <div className="flex flex-col ">
        {/* Header */}
        <div className="mb-6">
          <p className="text-center text-2xl font-bold text-gray-800">Setup Reconciliation</p>
        </div>

        {/* Content */}
        <>
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
              {selectedVaultId ? vaults.find((v) => v.id === selectedVaultId)?.name || "Unknown Vault" : "Choose a Vault"}
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
                  {vaults.map((vault) => (
                    <li
                      key={vault.id}
                      onClick={() => handleVaultSelect(vault.id)}
                      className="px-4 py-2.5 text-gray-500 gap-2 hover:bg-cyan-50 cursor-pointer transition-colors flex items-center"
                    >
                      <span>{vault.name}</span>
                      <span className="text-cyan-500  text-sm">({vault.vault_id})</span>
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>
        </>

        {/* Footer */}
        <div className="flex gap-3 justify-end mt-8 pt-4 border-t border-gray-100">
          <button onClick={isClose} className="px-6 py-2.5 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition font-medium">
            Cancel
          </button>

          <button
            onClick={handleSubmitRequest}
            disabled={!selectedVaultId}
            className="min-w-[160px] px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg font-semibold shadow-md hover:shadow-lg hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Save
          </button>
        </div>
      </div>
    </CustomModal>
  );
};

export default ReconcileModal;