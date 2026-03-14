import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AiOutlineSearch, AiOutlineDown, AiOutlineCheck, AiOutlineWarning } from "react-icons/ai";
import { GetVaultBagById, GetVaults } from "../../services/Vault";
import { CreateCashIn } from "../../services/Cash";
import { useNavigate } from "react-router-dom";

export default function CashDepositConfirmModal({
  amounts,
  selectedRows,
  showConfirmModal,
  setShowConfirmModal,
  totalEnteredAmount,
  denominations,
}) {
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
  const printRef = useRef(null);

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
  const filteredVaults = vaults.filter(
    (v) => v.name.toLowerCase().includes(vaultSearch.toLowerCase()) || v.vault_id.toLowerCase().includes(vaultSearch.toLowerCase()),
  );

  // // Filter bags
  const filteredBags = availableBags.filter((bag) => {
    const search = bagSearch.toLowerCase();
    return bag.barcode?.toLowerCase().includes(search) || bag.rack_number?.toString().includes(search);
  });

  // First confirm button → opens reconfirm modal
  const handleFirstConfirm = () => {
    if (!selectedVault || !selectedBag) {
      alert("Please select both vault and bag");
      return;
    }
    setShowReconfirm(true);
  };

  const handlePrintSuccess = () => {
    if (!printRef.current) {
      console.error("printRef is null → print content was not rendered");
      return;
    }

    const printContent = printRef.current.innerHTML;
    const original = document.body.innerHTML;

    document.body.innerHTML = printContent;
    window.print();

    setTimeout(() => {
      document.body.innerHTML = original;
      window.location.reload(); // or navigate
    }, 100);
  };

  // Final confirm handler → actual API call
  const handleFinalConfirm = async () => {
    if (!selectedVault || !selectedBag) {
      alert("Please select both vault and bag");
      return;
    }

    const orders = selectedRows.map((row) => ({
      id: row.id,
      order_id: row.order_id,
      total_cash_to_deposit: row?.total_cash_to_deposit,
      total_cash_in_amount: amounts[row.id] || 0,
    }));

    try {
      const payload = {
        vault_id: selectedVault?.id,
        bag_id: selectedBag?.id,
        cash_in_amount: totalEnteredAmount,
        denominations: denominations,
        orders: orders,
      };

      const res = await CreateCashIn(payload);

      if (res?.success === true) {
        setTimeout(() => {
          handlePrintSuccess();
        }, 300);

        setTimeout(() => {
          navigate("/cashin?step=0");
          localStorage.removeItem("cashInWizard");
          setShowReconfirm(false);
          setShowConfirmModal(false);
        }, 1800);
      }
    } catch (error) {
      console.error(error);
    }
  };

  if (!showConfirmModal) return null;

  return (
    <>
      <div ref={printRef} style={{ display: "none" }}>
        <div
          style={{
            fontFamily: "monospace, Arial, sans-serif",
            padding: "20px",
            maxWidth: "800px",
            margin: "0 auto",
            color: "#000",
          }}
        >
          <hr style={{ border: "1px dashed #000", margin: "12px 0" }} />

          {/* Summary info - you should get real values from API if possible */}
          <div style={{ lineHeight: "1.6" }}>
            {/* <div>
              <strong>Attempts:</strong> 18
            </div> */}
            {/* <div>
              <strong>Last Cash In:</strong> 17 Jan 2026 14:30 by Rahim
            </div>
            <div>
              <strong>Last Cash Out:</strong> 15 Jan 2026 09:15 by Karim
            </div> */}
            <div>
              <strong>Current Bag Amount:</strong> ৳{totalEnteredAmount.toLocaleString("en-US")}
            </div>
          </div>

          <hr style={{ border: "1px dashed #000", margin: "16px 0" }} />

          <div>
            <strong>Denominations:</strong>
            <div style={{ marginTop: "8px", paddingLeft: "12px" }}>
              {Object.entries(denominations || {})
                .filter(([, count]) => count > 0)
                .sort(([a], [b]) => Number(b) - Number(a))
                .map(([note, count]) => (
                  <div
                    key={note}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      maxWidth: "260px",
                    }}
                  >
                    <span>
                      ৳{note.padStart(4)} × {count}
                    </span>
                    <span>= ৳{(Number(note) * count).toLocaleString()}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
      ;{/* Main Confirmation Modal */}
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
          <h3 className="text-3xl font-bold text-gray-600 mb-8 text-center">Confirm Cash In</h3>

          {/* Vault Select */}
          <div className="mb-6" ref={vaultRef}>
            <label className="block text-sm font-medium text-gray-600 mb-3">
              Select Vault <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <div
                onClick={() => setVaultOpen(!vaultOpen)}
                className="w-full px-5 py-2 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between cursor-pointer hover:border-cyan-500 transition"
              >
                {selectedVault ? (
                  <div className="flex items-center gap-2">
                    <p className="text-gray-600">{selectedVault.name}</p>
                    <p className="text-cyan-500 text-sm font-mono">{selectedVault.vault_id}</p>
                  </div>
                ) : (
                  <span className="text-gray-500">Choose a vault...</span>
                )}
                <AiOutlineDown className={`w-4 h-3 text-gray-400 transition-transform ${vaultOpen ? "rotate-180" : ""}`} />
              </div>

              <AnimatePresence>
                {vaultOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full mt-2 w-full bg-gray-50 border border-gray-200 rounded-lg shadow-2xl z-10 overflow-hidden"
                  >
                    <div className="p-3 border-b border-gray-200">
                      <div className="flex items-center gap-3 bg-gray-100 rounded-lg px-4 py-2">
                        <AiOutlineSearch className="w-5 h-5 text-gray-600" />
                        <input
                          type="text"
                          placeholder="Search vault..."
                          value={vaultSearch}
                          onChange={(e) => setVaultSearch(e.target.value)}
                          className="w-full bg-transparent text-gray-600 outline-none placeholder:text-gray-500"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="max-h-[220px] overflow-y-auto">
                      {filteredVaults.length === 0 ? (
                        <p className="text-center py-8 text-gray-500">No vaults found</p>
                      ) : (
                        filteredVaults.map((vault) => (
                          <div
                            key={vault.id}
                            onClick={() => {
                              setSelectedVault(vault);
                              setVaultOpen(false);
                              setVaultSearch("");
                            }}
                            className="px-5 py-2 border-b border-gray-200 hover:bg-gray-100 cursor-pointer transition flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <p className="text-gray-600">{vault.name}</p>
                              <p className="text-cyan-500 text-sm font-mono">{vault.vault_id}</p>
                            </div>
                            {selectedVault?.id === vault.id && <AiOutlineCheck className="w-5 h-5 text-cyan-400" />}
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Bag Select */}
          <div className="mb-8" ref={bagRef}>
            <label className="block text-sm font-medium text-gray-600 mb-3">
              Select Bag <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <div
                onClick={() => selectedVault && setBagOpen(!bagOpen)}
                className={`w-full px-5 py-2 bg-gray-50 border rounded-lg flex items-center justify-between transition ${
                  !selectedVault ? "opacity-50 cursor-not-allowed border-gray-200" : "cursor-pointer hover:border-cyan-500 border-gray-200"
                }`}
              >
                {selectedBag ? (
                  <div className="flex items-center gap-2">
                    <p className="text-gray-600 font-mono">{selectedBag.barcode}</p>
                    <p className="text-gray-400 text-sm">Rack: {selectedBag.rack_number}</p>
                  </div>
                ) : (
                  <span className="text-gray-500">{selectedVault ? "Choose a bag..." : "First select a vault"}</span>
                )}
                <AiOutlineDown className={`w-4 h-3 text-gray-400 transition-transform ${bagOpen ? "rotate-180" : ""}`} />
              </div>

              <AnimatePresence>
                {bagOpen && selectedVault && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-2xl z-10 overflow-hidden"
                  >
                    <div className="p-3 border-b border-gray-200">
                      <div className="flex items-center gap-3 bg-gray-100 rounded-lg px-4 py-2">
                        <AiOutlineSearch className="w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search by code or rack..."
                          value={bagSearch}
                          onChange={(e) => setBagSearch(e.target.value)}
                          className="w-full bg-transparent text-gray-500 outline-none"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="max-h-[220px] overflow-y-auto">
                      {filteredBags.length === 0 ? (
                        <p className="text-center py-8 text-gray-500">No bags available</p>
                      ) : (
                        filteredBags.map((bag) => (
                          <div
                            key={bag.id}
                            onClick={() => {
                              setSelectedBag(bag);
                              setBagOpen(false);
                              setBagSearch("");
                            }}
                            className="px-5 py-4 hover:bg-gray-50 cursor-pointer transition flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <p className="text-cyan-400 font-mono">{bag.barcode}</p>
                              <p className="text-gray-400 text-sm">Rack: {bag.rack_number}</p>
                            </div>
                            {selectedBag?.id === bag.id && <AiOutlineCheck className="w-5 h-5 text-cyan-400" />}
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Amount Summary */}
          <div className="bg-gray-50 rounded-xl p-6 mb-8 border border-gray-200">
            <div className="flex justify-between text-lg">
              <span className="text-gray-600">Total Amount</span>
              <strong className="text-cyan-500">৳{totalEnteredAmount.toFixed(2)}</strong>
            </div>
            <div className="mt-4">
              <span className="text-gray-600 text-sm">Denominations</span>

              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {Object.entries(denominations || {})
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
                        className={`
                          relative overflow-hidden rounded-2xl p-6 text-center border border-gray-200 transition-all 
                        `}
                      >
                        <p className={`font-black text-cyan-500 `}>৳{note}</p>
                        <p className="text-gray-500 mt-2 text-sm">× {count}</p>
                        <p className={`font-bold mt-3 text-gray-600`}>৳{subtotal.toLocaleString()}</p>
                      </motion.div>
                    );
                  })}
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
              disabled={!selectedVault || !selectedBag}
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
                <p className="text-gray-600 mb-2">You are about to deposit:</p>
                <p className="text-3xl font-bold text-cyan-600 mb-6">৳{totalEnteredAmount.toLocaleString()}</p>
                <p className="text-gray-600 mb-8">
                  into bag <strong className="text-cyan-600 font-mono">{selectedBag?.barcode}</strong> in vault <strong>{selectedVault?.name}</strong>.
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
                    Yes, Deposit Now
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
