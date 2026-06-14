import { motion, AnimatePresence } from "framer-motion";
import Drawer from "../global/drawer/Drawer";
import { MdArrowOutward, MdOutlineCalculate, MdRestartAlt } from "react-icons/md";
import DataTable from "../global/dataTable/DataTable";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CreateCashIn, UpdateCashIn } from "../../services/Cash";
import { GetOrders } from "../../services/Orders";
import dayjs from "dayjs";
import { LuMinus, LuPlus } from "react-icons/lu";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { RiCloseCircleLine } from "react-icons/ri";
import ConfirmModal from "./ConfirmModal";
import { useDispatch, useSelector } from "react-redux";
import { fetchAuthUser, selectAuthUser } from "../../store/authSlice";
import VaultSelect from "./VaultSelect";
import { AddBagToVault } from "../../services/Vault";
import { useToast } from "../../hooks/useToast";

const DENOM_NOTES = [1000, 500, 200, 100, 50, 20, 10, 5, 2, 1];
const INITIAL_DENOMINATIONS = Object.fromEntries(DENOM_NOTES.map((n) => [n, 0]));

const CashInRequestDrawer = ({ isOpen, onClose, refetch, editData = null }) => {
  const isEditMode = !!editData;

  const [step, setStep] = useState(1);
  const [selectedRows, setSelectedRows] = useState([]);
  const [paginationData, setPaginationData] = useState({});
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [denominations, setDenominations] = useState(INITIAL_DENOMINATIONS);
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositError, setDepositError] = useState("");
  const [isDepositError, setIsDepositError] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [selectedVault, setSelectedVault] = useState(null);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);


  const [searchParams, setSearchParams] = useSearchParams();
  const currentPage = parseInt(searchParams.get("page") || "1");
  const searchTerm = searchParams.get("search") || "";
  const perPage = parseInt(searchParams.get("per_page") || "10");

  const reduxUser = useSelector(selectAuthUser);
  const dispatch = useDispatch();
  const { addToast } = useToast();

  // ── Sync reduxUser → local user state (separate from dispatch) ──
  useEffect(() => {
    if (reduxUser) {
      setUser(reduxUser);
    }
  }, [reduxUser]);

  // ── Fetch auth user when drawer opens ──
  useEffect(() => {
    if (isOpen) {
      dispatch(fetchAuthUser());
    }
  }, [isOpen, dispatch]);

  // ── Reset on close ──
  const handleClose = useCallback(() => {
    setStep(1);
    setSelectedRows([]);
    setDenominations(INITIAL_DENOMINATIONS);
    setDepositError("");
    setIsDepositError(false);
    setIsConfirmModalOpen(false);
    setSelectedVault(null);
    setError(null);
    onClose();
  }, [onClose]);

  // ── Seed vault + denominations from editData (edit mode only) ──
  useEffect(() => {
    if (!isEditMode || !editData || !user) return;

    setDenominations(editData.denominations ? Object.fromEntries(DENOM_NOTES.map((n) => [n, editData.denominations[String(n)] ?? 0])) : INITIAL_DENOMINATIONS);

    const vault = user?.vault_assignments?.find((v) => v.vault.id === editData.vault_id);
    setSelectedVault(vault || null);
  }, [isEditMode, editData, user]); // eslint-disable-line

  // ── Seed vault (create mode only) ──
  useEffect(() => {
    if (isEditMode) return;
    if (!user?.vault_assignments) return;

    const active = user.vault_assignments.filter((v) => v.status === "active");
    if (active.length === 1) {
      setSelectedVault(active[0]);
    } else {
      setSelectedVault(null);
    }
  }, [isEditMode, user]);

  // ── Pre-select edit orders once orders list is loaded ──
  useEffect(() => {
    if (!isEditMode || !editData || orders.length === 0) return;

    const editOrderIds = editData.orders.map((o) => o.order_id);
    const matched = orders.filter((o) => editOrderIds.includes(o.order_id));

    if (matched.length > 0) {
      setSelectedRows(matched);
    }
  }, [orders]); // eslint-disable-line

  // ── Fetch orders ──
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await GetOrders({
        page: currentPage,
        search: searchTerm || undefined,
        per_page: perPage,
      });

      const fetchedOrders = res?.data?.orders || [];

      if (isEditMode && editData?.orders?.length > 0) {
        const fetchedOrderIds = fetchedOrders.map((o) => o.order_id);
        const missingOrders = editData.orders.filter((o) => !fetchedOrderIds.includes(o.order_id));
        const merged = [...missingOrders, ...fetchedOrders];
        setOrders(merged);
      } else {
        setOrders(fetchedOrders);
      }

      setPaginationData(res?.data?.pagination || {});
    } catch (e) {
      setOrders([]);
      setPaginationData({});
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, perPage, isEditMode, editData]);

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

  const updateDenom = (value, delta) => setDenominations((prev) => ({ ...prev, [value]: Math.max(0, (prev[value] || 0) + delta) }));

  const handleInputChange = (value, val) => {
    const num = parseInt(val.replace(/[^0-9]/g, "")) || 0;
    setDenominations((prev) => ({ ...prev, [value]: num }));
  };

  // ── Vault limit validations ──
  const bagMin = parseFloat(selectedVault?.vault?.bag_min_bal_limit || 0);
  const bagMax = parseFloat(selectedVault?.vault?.bag_balance_limit || 0);

  const vaultValidation = () => {
    if (!selectedVault) return { valid: false, msg: "Please select a vault." };
    if (bagMin > 0 && totalAmount < bagMin) return { valid: false, msg: `Minimum cash-in amount is ৳${bagMin.toLocaleString("en-BD")}` };
    if (bagMax > 0 && totalAmount > bagMax) return { valid: false, msg: `Maximum cash-in limit is ৳${bagMax.toLocaleString("en-BD")}` };
    return { valid: true, msg: null };
  };

  const { valid: isVaultValid, msg: vaultMsg } = vaultValidation();
  const isCashInVaultMinMaxAmountAllowed = selectedRows.length > 0 && isVaultValid;

  const handleGenerateDeposit = () => {
    const { valid, msg } = vaultValidation();
    if (!valid) return setError(msg);
    setDepositLoading(true);
    setStep(2);
  };

  const handleDoneClick = () => setIsConfirmModalOpen(true);

  // ── Submit ──
  const handleConfirmSubmit = async () => {
    const { valid, msg } = vaultValidation();
    if (!valid) {
      setIsConfirmModalOpen(false);
      setError(msg);
      setStep(1);
      return;
    }

    setSubmitLoading(true);
    try {
      let payload;

      if (isEditMode) {
        const originalOrderIds = editData.orders.map((o) => o.order_id);
        const selectedOrderIds = selectedRows.map((o) => o.order_id);

        const removedOrderIds = originalOrderIds.filter((id) => !selectedOrderIds.includes(id));

        const addedOrders = selectedRows
          .filter((row) => !originalOrderIds.includes(row.order_id))
          .map((row) => ({
            id: row.id,
            order_id: row.order_id,
            customer_name: row.customer_name,
            payable_amount: row.total,
            total_cash_to_deposit: row.total_cash_to_deposit,
            total_cash_in_amount: row.total_cash_to_deposit,
          }));

        payload = {
          cash_in_amount: totalAmount,
          denominations: denominations,
          vault_id: selectedVault?.vault.id || user?.default_vault_id,
          added_orders: addedOrders,
          removed_order_ids: removedOrderIds,
        };
      } else {
        payload = {
          cash_in_amount: totalAmount,
          denominations: denominations,
          vault_id: selectedVault?.vault.id || user?.default_vault_id,
          orders: selectedRows.map((row) => ({
            id: row.id,
            order_id: row.order_id,
            customer_name: row.customer_name,
            payable_amount: row.total,
            total_cash_to_deposit: row.total_cash_to_deposit,
            total_cash_in_amount: row.total_cash_to_deposit,
          })),
        };
      }

      const res = isEditMode ? await UpdateCashIn(editData.id, payload) : await CreateCashIn(payload);

      if (res?.status === 500 || res?.status === 422 || res?.success === false) {
        setIsDepositError(true);
        setDepositError(res?.response?.data || "An error occurred.");
      } else if (res?.status === 200 || res?.status === 201 || res?.success === true) {
        refetch?.();
        handleClose();
      }
    } catch (err) {
      console.error("Submit error:", err);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleCancelConfirmSubmit = () => {
    setSubmitLoading(false);
    setIsDepositError(false);
    setDepositError("");
    setIsConfirmModalOpen(false);
  };

  const handleBagCreated = async (rackNumber) => {
    const vaultId = depositError?.vault_id ?? depositError?.message?.vault_id;
    const res = await AddBagToVault(vaultId, { rack_number: rackNumber });

    if (!res?.success) {
      addToast({ type: "error", message: res?.message || "Failed to create bag" });
      throw new Error(res?.message);
    }

    addToast({ type: "success", message: "Bag created successfully! You can now retry your cash-in." });
  };

  // ── Columns ──
  const columns = [
    {
      title: "Select",
      key: "selection",
      className: "!w-10 text-center whitespace-nowrap",
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
                  animate={{
                    pathLength: isSelected ? 1 : 0,
                    opacity: isSelected ? 1 : 0,
                  }}
                  transition={{
                    duration: 0.35,
                    opacity: { duration: 0.15 },
                    pathLength: { delay: isSelected ? 0.1 : 0 },
                  }}
                />
              </motion.svg>
            </motion.button>
          </div>
        );
      },
    },
    {
      title: "Order ID",
      key: "order_id",
      className: "whitespace-nowrap",
      render: (row) => <span className="font-mono font-medium text-cyan-600">{row.order_id}</span>,
    },
    {
      title: "Total",
      key: "payable_amount",
      className: "whitespace-nowrap",
      render: (row) => <span>{row?.payable_amount}</span>,
    },
    {
      title: "Cash to Deposit",
      key: "received_st",
      className: "whitespace-nowrap",
      render: (row) => <span>{row?.total_cash_to_deposit}</span>,
    },
    {
      title: "Customer",
      key: "customer",
      className: "whitespace-nowrap",
      render: (row) => <span>{row?.customer_name}</span>,
    },
    {
      title: "Status",
      key: "status",
      className: "whitespace-nowrap",
      render: () => <span className="bg-cyan-50 px-2 py-1 rounded text-xs text-cyan-500">Received By AT</span>,
    },
    {
      title: "Received Date",
      key: "received_date",
      className: "whitespace-nowrap",
      render: (row) => <span>{dayjs(row.created_at).format("DD MMM, YYYY hh:mm A")}</span>,
    },
  ];

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={handleClose}
        className="w-[70%]"
        title={
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <MdArrowOutward className="text-blue-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">{isEditMode ? "Edit Cash In Request" : "Cash In Request"}</h2>
              <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                {isEditMode ? `Editing · ${editData?.tran_id}` : "Select orders to deposit into vault"}
              </p>
            </div>
          </div>
        }
      >
        <AnimatePresence mode="wait">
          {/* ── Step 1: Order Selection ── */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col h-full"
            >
              <div className="px-6 pt-3 pb-6 bg-white">
                <div className="flex items-end justify-between">
                  <VaultSelect
                    vaults={user?.vault_assignments}
                    defaultVault={user?.default_vault_id}
                    selectedVault={selectedVault}
                    onSelect={(vault) => {
                      setSelectedVault(vault);
                      setError(null);
                    }}
                    error={error}
                    setError={setError}
                  />

                  <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                      <div
                        className={`px-4 py-2 rounded-full border border-slate-200 text-xs font-semibold ${
                          selectedRows.length > 0 ? "text-cyan-600" : "text-slate-400"
                        }`}
                      >
                        {selectedRows.length} Orders Selected
                      </div>
                    </div>
                    <div>
                      {selectedRows.length > 0 && vaultMsg ? (
                        <p className="text-xs text-red-500 font-medium text-center">{vaultMsg}</p>
                      ) : (
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Total Selected Amount</p>
                      )}
                      <h1 className={`text-3xl font-bold text-end ${vaultMsg ? "text-red-500" : "text-slate-900"}`}>
                        ৳{totalAmount.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                      </h1>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6">
                <DataTable
                  columns={columns}
                  data={orders}
                  changePage={handlePageChange}
                  onSearch={handleSearch}
                  paginationData={paginationData}
                  selectedRows={selectedRows}
                  loading={loading}
                  setSelectedRows={setSelectedRows}
                  className="h-[calc(100vh-310px)]"
                />
              </div>

              <div className="flex items-center bg-[#FDFDFE] border-t border-slate-200 mt-2 py-4 px-6 gap-3 justify-end">
                <button
                  onClick={handleClose}
                  className="min-w-[160px] px-6 py-2.5 text-center justify-center cursor-pointer bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-sm rounded-xl transition-all flex items-center gap-2"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerateDeposit}
                  disabled={depositLoading || !isCashInVaultMinMaxAmountAllowed}
                  className="min-w-[160px] px-6 py-2.5 cursor-pointer justify-center bg-[#1a73e8] shadow-lg shadow-blue-200 hover:bg-blue-600 text-white font-bold text-sm rounded-xl transition-all disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none flex items-center gap-2"
                >
                  {depositLoading ? (
                    <Loader2 className="animate-spin w-4 h-4" />
                  ) : (
                    <span className="flex gap-1 items-center">
                      Next <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </button>
              </div>
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
                <div className="flex items-center">
                  <button
                    onClick={() => setDenominations(INITIAL_DENOMINATIONS)}
                    className="text-red-500 text-sm font-semibold flex items-center gap-1 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <MdRestartAlt /> Reset
                  </button>
                  <button
                    onClick={() => {
                      setDepositLoading(false);
                      setStep(1);
                    }}
                    className="text-gray-500 text-sm flex items-center gap-1 hover:text-gray-800 px-3 py-1.5 cursor-pointer transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                </div>
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
                            value={denominations[note] ?? 0}
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
                    <p className="text-red-400 mb-2 flex items-center gap-1 bg-red-50 text-xs font-medium px-3 py-1.5 rounded-full">
                      <RiCloseCircleLine size={16} /> ৳{difference.toLocaleString()} over — remove notes
                    </p>
                  )}
                  <div className="p-6 rounded-2xl border border-slate-200 bg-white space-y-6">
                    <div className="flex justify-between">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Expected Total</p>
                        <p className="text-xl font-bold text-slate-800">৳{totalAmount.toLocaleString()}</p>
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
                      <p className={`text-4xl font-black ${totalAmount < grandTotal ? "text-red-600" : "text-blue-600"}`}>৳{grandTotal.toLocaleString()}</p>
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
                          .sort(([a], [b]) => parseInt(b) - parseInt(a))
                          .map(([val, cnt]) => (
                            <div key={val} className="grid grid-cols-3 border-b py-3 border-slate-200 text-sm">
                              <span className="font-bold text-slate-700">৳{val}</span>
                              <span className="text-slate-500">x{cnt}</span>
                              <span className="font-bold text-slate-800 text-right">৳{(parseInt(val) * cnt).toLocaleString()}</span>
                            </div>
                          ))
                      ) : (
                        <div className="h-32 flex items-center justify-center text-slate-300 text-sm italic">Start adding notes to see summary</div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={handleDoneClick}
                    disabled={grandTotal === 0 || difference !== 0}
                    className="mt-6 w-full py-2.5 bg-[#1a73e8] hover:bg-blue-600 disabled:bg-slate-200 disabled:cursor-not-allowed text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-200"
                  >
                    <motion.span whileTap={{ scale: 0.95 }} className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full border-2 border-white/30 flex items-center justify-center">
                        <motion.div initial={false} animate={{ scale: difference === 0 ? 1 : 0 }}>
                          ✓
                        </motion.div>
                      </div>
                      {isEditMode ? "Update" : "Done"}
                    </motion.span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Drawer>

      {isConfirmModalOpen && (
        <ConfirmModal
          grandTotal={grandTotal}
          onCancel={handleCancelConfirmSubmit}
          onConfirm={handleConfirmSubmit}
          loading={submitLoading}
          isDepositError={isDepositError}
          message={depositError}
          onBagCreated={handleBagCreated}
        />
      )}
    </>
  );
};

export default CashInRequestDrawer;
