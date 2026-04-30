import { motion, AnimatePresence } from "framer-motion";
import Drawer from "../global/drawer/Drawer";
import { MdArrowOutward, MdOutlineCalculate, MdRestartAlt } from "react-icons/md";
import DataTable from "../global/dataTable/DataTable";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CreateCashIn, GetCashIn, UpdateCashIn } from "../../services/Cash";
import { GetOrders } from "../../services/Orders";
import dayjs from "dayjs";
import { LuMinus, LuPlus } from "react-icons/lu";
import { Loader2 } from "lucide-react";
import { RiCloseCircleLine } from "react-icons/ri";

const DENOM_NOTES = [1000, 500, 200, 100, 50, 20, 10, 5, 2, 1];
const INITIAL_DENOMINATIONS = Object.fromEntries(DENOM_NOTES.map((n) => [n, 0]));


const ErrorModal = ({ isOpen, message, onCancel, onCreate }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
      >
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <p className="text-slate-500 text-sm">{message?.message || "No bag available for cash-in"}</p>
        </div>
        <div className="flex mb-6 justify-between items-center gap-4 px-4">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-2xl text-sm border border-slate-200 font-bold text-slate-500 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onCreate}
            className="px-4 flex-1 py-2 rounded-2xl bg-[#1a73e8] shadow-lg shadow-blue-200 hover:bg-blue-600 text-sm font-bold text-white transition-colors"
          >
            Create Bag
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ─── Confirm Modal ────────────────────────────────────────────────────────────
const ConfirmModal = ({ isOpen, grandTotal, onCancel, onConfirm, loading }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
      >
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-slate-800 font-bold text-lg mb-1">Confirm Submission</h3>
          <p className="text-slate-500 text-sm">
            You are about to submit a cash deposit of{" "}
            <span className="font-bold text-slate-800">৳{grandTotal.toLocaleString("en-BD", { minimumFractionDigits: 2 })}</span>
          </p>
        </div>
        <div className="flex mb-6 justify-between items-center gap-4 px-4">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2 rounded-2xl text-sm border border-slate-200 font-bold text-slate-500 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 flex-1 py-2 rounded-2xl bg-[#1a73e8] shadow-lg shadow-blue-200 hover:bg-blue-600 text-sm font-bold text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin w-4 h-4" /> : "Confirm & Submit"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const CashInRequestDrawer = ({ isOpen, onClose, refetch }) => {
  // Step: 1 = order selection, 2 = denominations
  const [step, setStep] = useState(1);
  const [cashInId, setCashInId] = useState(null); // store created cash-in ID for PUT

  const [selectedRows, setSelectedRows] = useState([]);
  const [paginationData, setPaginationData] = useState({});
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [cashIns, setCashIns] = useState([]);
  const [cashInsLoaded, setCashInsLoaded] = useState(false);
  const [denominations, setDenominations] = useState(INITIAL_DENOMINATIONS);

  // Step 1 submission
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositError, setDepositError] = useState("");
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);

  // Step 2 submission
  const [submitLoading, setSubmitLoading] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const currentPage = parseInt(searchParams.get("page") || "1");
  const searchTerm = searchParams.get("search") || "";
  const perPage = parseInt(searchParams.get("per_page") || "10");

  // ── Reset everything on drawer close ──
  const handleClose = useCallback(() => {
    setStep(1);
    setCashInId(null);
    setSelectedRows([]);
    setDenominations(INITIAL_DENOMINATIONS);
    setDepositError("");
    setIsErrorModalOpen(false);
    setIsConfirmModalOpen(false);
    onClose();
  }, [onClose]);

  // ── Fetch cash-ins (to exclude already-processed orders) ──
  const fetchCashIns = useCallback(() => {
    setLoading(true);
    GetCashIn()
      .then((res) => {
        setCashIns(res?.data?.data || []);
        setCashInsLoaded(true);
      })
      .catch(() => {
        setCashIns([]);
        setCashInsLoaded(true);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchCashIns();
  }, []); // eslint-disable-line

  // ── Fetch orders (exclude those already in a cash-in) ──
  const fetchOrders = useCallback(async () => {
    if (!cashInsLoaded) return;
    setLoading(true);
    try {
      const excludedOrderIds = cashIns
        .flatMap((c) => c.orders || [])
        .map((o) => o.order_id)
        .filter(Boolean);

      const res = await GetOrders({
        page: currentPage,
        search: searchTerm || undefined,
        per_page: perPage,
        exclude_order_ids: excludedOrderIds.length > 0 ? excludedOrderIds : undefined,
      });
      setOrders(res?.data?.orders || []);
      setPaginationData(res?.data?.pagination || {});
    } catch {
      setOrders([]);
      setPaginationData({});
    } finally {
      setLoading(false);
    }
  }, [cashInsLoaded, cashIns, currentPage, searchTerm, perPage]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handlePageChange = (page) => {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set("page", page.toString());
      return p;
    });
  };

  const handleSearch = (term) => {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      if (term.trim()) {
        p.set("search", term.trim());
        p.set("page", "1");
      } else {
        p.delete("search");
      }
      return p;
    });
  };

  // ── Calculations ──
  const totalAmount = selectedRows.reduce((sum, o) => sum + (parseFloat(o.total_cash_to_deposit) || 0), 0);
  const grandTotal = Object.entries(denominations).reduce((sum, [val, cnt]) => sum + parseInt(val) * (parseInt(cnt) || 0), 0);
  const difference = grandTotal - totalAmount;
  const isGenerateEnabled = selectedRows.length > 0 && totalAmount <= 200_000;

  const updateDenom = (value, delta) => setDenominations((prev) => ({ ...prev, [value]: Math.max(0, (prev[value] || 0) + delta) }));

  const handleInputChange = (value, val) => {
    const num = parseInt(val.replace(/[^0-9]/g, "")) || 0;
    setDenominations((prev) => ({ ...prev, [value]: num }));
  };

  // ── Step 1: Create cash-in → move to step 2 ──
  const handleGenerateDeposit = async () => {
    setDepositLoading(true);
    try {
      const payload = {
        cash_in_amount: totalAmount,
        orders: selectedRows.map((row) => ({
          id: row.id,
          order_id: row.order_id,
          total_cash_to_deposit: row.total_cash_to_deposit,
          total_cash_in_amount: row.total_cash_to_deposit,
        })),
      };

      const res = await CreateCashIn(payload);
      console.log({ res });
      if (res?.status === 500) {
        setDepositError(res?.response?.data?.message || "An error occurred.");
        setIsErrorModalOpen(true);
      } else if (res?.status === 200 || res?.status === 201 || res?.success === true) {
        setCashInId(res?.data?.id); // store for PUT
        setStep(2);
      }
    } catch (err) {
      setDepositError(err?.message || "An error occurred.");
      setIsErrorModalOpen(true);
    } finally {
      setDepositLoading(false);
    }
  };

  // ── Step 2: Open confirm modal ──
  const handleDoneClick = () => setIsConfirmModalOpen(true);

  // ── Step 2: Confirm → PUT denominations → close ──
  const handleConfirmSubmit = async () => {
    setSubmitLoading(true);
    try {
      const payload = { denominations };
      const res = await UpdateCashIn(cashInId, payload);

      if (res?.success === true) {
        refetch?.();
        handleClose();
      }
    } catch (err) {
      console.error("Submit error:", err);
    } finally {
      selectedRows([]);
      setSubmitLoading(false);
      setIsConfirmModalOpen(false);
    }
  };

  const handleCreateBagRedirect = () => {
    window.open(`/vault?vault_edit_id=${depositError?.vault_id}`, "_blank");
    setIsErrorModalOpen(false);
    setSelectedRows([]);
    setDepositError("");
  };

  // ── Columns ──
  const columnsStep1 = [
    {
      title: "Select",
      key: "selection",
      className: "w-20 text-center",
      render: (row) => {
        const isSelected = selectedRows.some((s) => s.id === row.id);
        return (
          <div className="flex items-center justify-center">
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedRows((prev) => (prev.some((item) => item.id === row.id) ? prev.filter((item) => item.id !== row.id) : [...prev, row]));
              }}
              className={`relative w-6 h-6 rounded flex items-center justify-center border overflow-hidden transition-all duration-300 ${
                isSelected ? "bg-cyan-50 border-cyan-200" : "bg-transparent border-gray-200 hover:border-cyan-200"
              }`}
            >
              <motion.div className="absolute inset-0 bg-cyan-50" initial={false} animate={{ scale: isSelected ? 1 : 0 }} transition={{ duration: 0.35 }} />
              <motion.svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 relative z-10 pointer-events-none" initial={false}>
                <motion.path
                  d="M4 12L9 17L20 6"
                  stroke="#06B6D4"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: isSelected ? 1 : 0, opacity: isSelected ? 1 : 0 }}
                  transition={{ duration: 0.35, opacity: { duration: 0.15 }, pathLength: { delay: isSelected ? 0.1 : 0 } }}
                />
              </motion.svg>
            </motion.button>
          </div>
        );
      },
    },
    { title: "Order ID", key: "order_id", render: (row) => <span className="font-mono text-cyan-400">{row.order_id}</span> },
    { title: "Total", key: "payable_amount", render: (row) => <span>{row?.payable_amount}</span> },
    { title: "Cash to Deposit", key: "received_st", render: (row) => <span>{row?.total_cash_to_deposit}</span> },
    { title: "Customer", key: "customer", render: (row) => <span>{row?.customer_name}</span> },
    { title: "Received Date", key: "received_date", render: (row) => <span>{dayjs(row.created_at).format("DD MMM, YYYY hh:mm A")}</span> },
  ];

  return (
    <>
      <Drawer isOpen={isOpen} onClose={handleClose}>
        <AnimatePresence mode="wait">
          {/* ── Step 1: Order Selection ── */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col h-full bg-[#F8FAFC]"
            >
              <div className="p-6 bg-white border-b border-slate-200">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <MdArrowOutward className="text-blue-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">Cash In Request</h2>
                    <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">Select orders to deposit into vault</p>
                  </div>
                </div>
                <div className="mt-8 flex items-end justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Total Selected Amount</p>
                    <h1 className="text-3xl font-bold text-slate-900">৳{totalAmount.toLocaleString("en-BD", { minimumFractionDigits: 2 })}</h1>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="px-4 py-2 rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-600">
                      {selectedRows.length} Orders Selected
                    </div>
                    <button
                      onClick={handleGenerateDeposit}
                      disabled={!isGenerateEnabled || depositLoading}
                      className="px-6 py-2 cursor-pointer bg-[#1a73e8] shadow-lg shadow-blue-200 hover:bg-blue-600 text-white font-semibold text-sm rounded-lg transition-all disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none flex items-center gap-2"
                    >
                      {depositLoading ? <Loader2 className="animate-spin w-4 h-4" /> : "Generate Deposit"}
                    </button>
                  </div>
                </div>
              </div>
              <DataTable
                columns={columnsStep1}
                data={orders}
                changePage={handlePageChange}
                onSearch={handleSearch}
                paginationData={paginationData}
                selectedRows={selectedRows}
                loading={loading}
                setSelectedRows={setSelectedRows}
                className="h-[calc(100vh-100px)]"
              />
            </motion.div>
          )}

          {/* ── Step 2: Denominations ── */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex flex-col h-full bg-white"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                    <MdOutlineCalculate size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">Denominations</h2>
                    <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                      Expected: ৳{totalAmount.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setDenominations(INITIAL_DENOMINATIONS)}
                  className="text-red-500 text-sm font-semibold flex items-center gap-1 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <MdRestartAlt /> Reset
                </button>
              </div>

              <div className="flex flex-1 overflow-hidden">
                {/* Left: Denom controls */}
                <div className="w-[55%] p-6 overflow-y-auto border-r border-slate-100 scrollbar-hide">
                  <div className="grid grid-cols-2 gap-4">
                    {DENOM_NOTES.map((note) => (
                      <div
                        key={note}
                        className="bg-[#F1F5F9] rounded-xl p-4 flex flex-col items-center gap-3 border border-transparent hover:border-blue-200 transition-all"
                      >
                        <span className="text-lg font-bold text-slate-700">{note.toLocaleString()}</span>
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => updateDenom(note, -1)}
                            className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-600 hover:bg-slate-50 border border-slate-100"
                          >
                            <LuMinus size={14} />
                          </button>
                          <input
                            type="text"
                            value={denominations[note] || 0}
                            onChange={(e) => handleInputChange(note, e.target.value)}
                            className="w-12 text-center bg-transparent text-blue-600 font-bold text-lg outline-none"
                          />
                          <button
                            onClick={() => updateDenom(note, 1)}
                            className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-600 hover:bg-slate-50 border border-slate-100"
                          >
                            <LuPlus size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right: Summary */}
                <div className="w-[45%] p-8 bg-[#FCFCFD] flex flex-col">
                  {difference > 0 && (
                    <p className="text-red-400 mb-2 flex items-center gap-1 ring-red-500/20 bg-red-50 text-xs font-medium px-3 py-1.5 rounded-full">
                      <RiCloseCircleLine size={16} /> ৳{difference} over - remove notes
                    </p>
                  )}
                  <div className="p-6 rounded-2xl border border-slate-200 bg-white space-y-6">
                    <div className="flex justify-between">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Expected Total</p>
                        <p className="text-xl font-bold text-slate-800">{totalAmount.toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Difference</p>
                        <p className={`text-xl font-bold ${difference === 0 ? "text-green-500" : "text-orange-500"}`}>
                          {difference > 0 ? `+${difference.toLocaleString()}` : difference.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Grand Total</p>
                      <p className={`text-4xl font-black ${totalAmount < grandTotal ? "text-red-600" : "text-blue-600"} `}>৳{grandTotal.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="mt-10 flex-1">
                    <h3 className="text-sm font-bold text-slate-800 mb-4">Calculation Summary</h3>
                    <div className="text-[10px] font-bold text-gray-400 uppercase grid grid-cols-3 pb-2 mb-3">
                      <span>Denom</span>
                      <span>Count</span>
                      <span className="text-right">Total</span>
                    </div>
                    <div className="overflow-y-auto max-h-[300px] pr-2">
                      {Object.entries(denominations).filter(([, cnt]) => cnt > 0).length > 0 ? (
                        Object.entries(denominations)
                          .filter(([, cnt]) => cnt > 0)
                          .map(([val, cnt]) => (
                            <div key={val} className="grid grid-cols-3 border-b py-3 border-slate-200 text-sm">
                              <span className="font-bold text-slate-700">{val}</span>
                              <span className="text-slate-500">x{cnt}</span>
                              <span className="font-bold text-slate-800 text-right">৳{(val * cnt).toLocaleString()}</span>
                            </div>
                          ))
                      ) : (
                        <div className="h-32 flex items-center justify-center text-slate-300 text-sm italic">Start adding notes to see summary</div>
                      )}
                    </div>
                  </div>

                  {/* Done button → opens confirm modal */}
                  <button
                    onClick={handleDoneClick}
                    disabled={grandTotal === 0 || difference !== 0}
                    className="mt-6 w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:cursor-not-allowed text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-100"
                  >
                    <motion.span whileTap={{ scale: 0.95 }} className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full border-2 border-white/30 flex items-center justify-center">
                        <motion.div initial={false} animate={{ scale: difference === 0 ? 1 : 0 }}>
                          ✓
                        </motion.div>
                      </div>
                      Done
                    </motion.span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Drawer>

      {/* Error modal (no bag) */}
      <ErrorModal
        isOpen={isErrorModalOpen}
        message={depositError}
        onCancel={() => setIsErrorModalOpen(false)} // ✅ fixed: was calling isOpenDepositErrorModal(false)
        onCreate={handleCreateBagRedirect}
      />

      {/* Confirm submit modal */}
      <ConfirmModal
        isOpen={isConfirmModalOpen}
        grandTotal={grandTotal}
        onCancel={() => setIsConfirmModalOpen(false)}
        onConfirm={handleConfirmSubmit}
        loading={submitLoading}
      />
    </>
  );
};

export default CashInRequestDrawer;
