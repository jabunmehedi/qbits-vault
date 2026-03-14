import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AiOutlineWarning } from "react-icons/ai";
import { GetVaultBagById, GetVaults } from "../../services/Vault";
import { useNavigate } from "react-router-dom";
import { Hash, Package } from "lucide-react";
import { CreateCashOut } from "../../services/Cash";

export default function CashOutConfirmationModal({ amounts, selectedRows, selectedVaultId, showConfirmModal, setShowConfirmModal, refetch }) {
  const [selectedVault, setSelectedVault] = useState(null);
  const [selectedBag, setSelectedBag] = useState(null);
  const [availableBags, setAvailableBags] = useState([]);
  const [vaults, setVaults] = useState([]);

  // Search states
  const [vaultSearch, setVaultSearch] = useState("");
  const [bagSearch, setBagSearch] = useState("");

  // Dropdown open states
  const [vaultOpen, setVaultOpen] = useState(false);
  const [bagOpen, setBagOpen] = useState(false);

  // Reconfirmation modal state
  const [showReconfirm, setShowReconfirm] = useState(false);

  const vaultRef = useRef(null);
  const bagRef = useRef(null);
  const navigate = useNavigate();

  // fetch all vaults
  const fetchVaultData = async () => {
    try {
      const res = await GetVaults();
      setVaults(res?.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchVaultData();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (vaultRef.current && !vaultRef.current.contains(e.target)) setVaultOpen(false);
      if (bagRef.current && !bagRef.current.contains(e.target)) setBagOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Load bags when vault selected
  useEffect(() => {
    if (selectedVault) {
      GetVaultBagById(selectedVault?.id).then((res) => {
        setAvailableBags(res?.data || []);
      });

      setSelectedBag(null);
    } else {
      setAvailableBags([]);
    }
  }, [selectedVault]);

  // Filter vaults
  // const filteredVaults = vaults.filter(
  //   (v) => v.name.toLowerCase().includes(vaultSearch.toLowerCase()) || v.vault_id.toLowerCase().includes(vaultSearch.toLowerCase()),
  // );


  // // Filter bags
  // const filteredBags = availableBags.filter((bag) => {
  //   const search = bagSearch.toLowerCase();
  //   return bag.barcode?.toLowerCase().includes(search) || bag.rack_number?.toString().includes(search);
  // });

  // First confirm button → opens reconfirm modal
  const handleFirstConfirm = () => {
    setShowReconfirm(true);
  };

  // Final confirm handler → actual API call
  const handleFinalConfirm = async () => {
    try {
      const payload = {
        vault_id: selectedVaultId,
        bags: selectedRows,
        cash_out_amount: selectedRows?.reduce((acc, bag) => acc + bag?.current_amount, 0),
      };

      await CreateCashOut(payload);

      setShowReconfirm(false);
      setShowConfirmModal(false);
      navigate("/cashout?step=0");
      //   if (res?.success === true) {
      //     navigate("/cashin?step=0");
      //     localStorage.removeItem("cashInWizard");
      //     setShowReconfirm(false);
      //     setShowConfirmModal(false);
      //   }
    } catch (error) {
      console.error(error);
    } finally {
      refetch();
    }
  };

  if (!showConfirmModal) return null;


  return (
    <>
      {/* Main Confirmation Modal */}
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowConfirmModal(false)}
          className="absolute inset-0"
        />

        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="relative bg-white border border-[#353857] rounded-2xl p-10 max-w-2xl w-full mx-4 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-3xl font-bold text-gray-600 mb-8 text-center">Confirm Cash Out Request</h3>

          <div className="max-h-96 overflow-y-auto">
            {selectedRows?.map((bag, index) => (
              <motion.div
                key={bag.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="px-6 py-4 border-b border-gray-200 hover:bg-gray-50 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4">
                      <div className="bg-cyan-100 rounded-xl p-3">
                        <Package className="w-8 h-8 text-cyan-600" />
                      </div>
                      <div className="flex items-center justify-between w-full">
                        <div>
                          <div className="flex items-center gap-2">
                            <Hash className="w-4 h-4 text-gray-500" />
                            <p className="font-semibold text-gray-900">{bag.barcode}</p>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                            <span className="font-medium">Rack:</span>
                            <span>{bag.rack_number || "N/A"}</span>
                          </div>
                        </div>

                        <div className="text-right ">
                          <p className="text-xl font-bold text-gray-900">৳{bag.current_amount?.toLocaleString() || 0}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Amount Summary */}
          <div className="bg-gray-50 rounded-xl p-6 mb-8 border border-gray-200">
            <div className="flex justify-between text-lg">
              <span className="text-gray-600">Total Amount</span>
              <strong className="text-cyan-500">৳{amounts}</strong>
            </div>
            <div className="mt-4">
              <span className="text-gray-600 text-sm">Denominations</span>

              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {(() => {
                  // Combine all denominations from all selected rows
                  const combinedDenominations = {};

                  selectedRows?.forEach((row) => {
                    try {
                      if (row.denominations) {
                        const parsed = JSON.parse(row.denominations);

                        // Add to combined totals
                        Object.entries(parsed).forEach(([note, count]) => {
                          if (combinedDenominations[note]) {
                            combinedDenominations[note] += count;
                          } else {
                            combinedDenominations[note] = count;
                          }
                        });
                      }
                    } catch (e) {
                      console.error("Failed to parse denominations:", e);
                    }
                  });

                  return Object.entries(combinedDenominations)
                    .filter(([, count]) => count > 0)
                    .sort(([a], [b]) => parseInt(b) - parseInt(a)) // Big notes first!
                    .map(([note, count]) => {
                      const subtotal = parseInt(note) * count;

                      return (
                        <motion.div
                          key={note}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 }}
                          className="relative overflow-hidden rounded-2xl p-6 text-center border border-gray-200 transition-all"
                        >
                          <p className="font-black text-cyan-500">৳{note}</p>
                          <p className="text-gray-500 mt-2 text-sm">× {count}</p>
                          <p className="font-bold mt-3 text-gray-600">৳{subtotal.toLocaleString()}</p>
                        </motion.div>
                      );
                    });
                })()}
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-4 justify-end">
            <button
              onClick={() => setShowConfirmModal(false)}
              className="px-8 py-3 text-red-400 border border-red-400/50 rounded-xl hover:bg-red-400/10 transition font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleFirstConfirm}
              //   disabled={!selectedVault || !selectedBag}
              className="px-10 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-cyan-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Confirm Deposit
            </button>
          </div>
        </motion.div>
      </div>

      {/* Reconfirmation Modal (Second Confirmation) */}
      <AnimatePresence>
        {showReconfirm && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowReconfirm(false)}
              className="absolute inset-0"
            />

            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="relative bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <AiOutlineWarning className="w-20 h-20 text-yellow-500 mx-auto mb-6" />
                <h4 className="text-2xl font-bold text-gray-800 mb-4">Are You Sure?</h4>
                <p className="text-gray-600 mb-2">You are about to Cash Out:</p>
                <p className="text-3xl font-bold text-cyan-600 mb-6">৳{amounts}</p>
                <p className="text-gray-600 mb-8">
                  From the following bags:
                  <br />
                  {selectedRows?.map((row) => (
                    <div key={row?.id} className="flex flex-col">
                      <span className="font-bold">
                        {row.barcode}-Rack#{row?.rack_number}
                      </span>
                    </div>
                  ))}
                </p>

                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => setShowReconfirm(false)}
                    className="px-8 py-3 text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-100 transition font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleFinalConfirm}
                    className="px-10 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-green-500/30 transition"
                  >
                    Yes, Cash Out
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
