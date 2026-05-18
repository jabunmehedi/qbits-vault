import { motion, AnimatePresence } from "framer-motion";
import Drawer from "../global/drawer/Drawer";
import { MdArrowOutward } from "react-icons/md";
import { useCallback, useEffect, useState } from "react";
import { CreateCashOut, GetCashInsByVaultId } from "../../services/Cash";
import { useSelector } from "react-redux";
import { selectAuthUser } from "../../store/authSlice";
import { useToast } from "../../hooks/useToast";
import DataTable from "../global/dataTable/DataTable";
import VaultSelect from "../cashin/VaultSelect";
import { ArrowRight, ArrowLeft, Loader2, Info, User } from "lucide-react";
import dayjs from "dayjs";
import { GetCustodiansByVaultId } from "../../services/User";
import { CiWarning } from "react-icons/ci";

const CashOutRequestDrawer = ({ isOpen, onClose, refetch, editData = null }) => {
  const isEditMode = !!editData;

  const [step, setStep] = useState(1);
  const [selectedRows, setSelectedRows] = useState([]);
  const [paginationData, setPaginationData] = useState({});
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositError, setDepositError] = useState("");
  const [isDepositError, setIsDepositError] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [selectedVault, setSelectedVault] = useState(null);
  const [custodians, setCustodians] = useState([]);
  const [error, setError] = useState(null);

  // ── Step 1 & Step 2 Fields ──
  const [requestedAmount, setRequestedAmount] = useState("");
  const [requestedAmountTouched, setRequestedAmountTouched] = useState(false); // Tracks if next was clicked without input
  const [selectedCustodian, setSelectedCustodian] = useState(null);
  const [purposeNote, setPurposeNote] = useState("");
  const [purposeNoteTouched, setPurposeNoteTouched] = useState(false);

  //   const [searchParams, setSearchParams] = useSearchParams();
  //   const currentPage = parseInt(searchParams.get("page") || "1");
  //   const searchTerm = searchParams.get("search") || "";
  //   const perPage = parseInt(searchParams.get("per_page") || "10");

  const user = useSelector(selectAuthUser);
  const { addToast } = useToast();

  // ── Reset on close ──
  const handleClose = useCallback(() => {
    setStep(1);
    setSelectedRows([]);
    setRequestedAmount("");
    setRequestedAmountTouched(false);
    setSelectedCustodian(null);
    setPurposeNote("");
    setPurposeNoteTouched(false);
    setDepositError("");
    setIsDepositError(false);
    setIsConfirmModalOpen(false);
    setSelectedVault(null);
    setError(null);
    onClose();
  }, [onClose]);

  // ── Seed default vault for create mode ──
  useEffect(() => {
    if (isEditMode) return;
    if (user?.default_vault_id) {
      const defaultV = user.vault_assignments?.find((v) => v.vault.id == user.default_vault_id);
      setSelectedVault(defaultV || null);
    }
  }, [isEditMode, user?.default_vault_id, user?.vault_assignments]);

  // ── Seed selected rows ──
  useEffect(() => {
    if (!isEditMode || !editData || orders.length === 0) return;

    const editOrderIds = editData.orders.map((o) => o.order_id);
    const matched = orders.filter((o) => editOrderIds.includes(o.order_id));

    if (matched.length > 0) {
      setSelectedRows(matched);
    }
  }, [orders, isEditMode, editData]);

  // ── Fetch orders ──
  const fetchCashIns = useCallback(async () => {
    if (!selectedVault?.vault?.id) {
      setOrders([]);
      setPaginationData({});
      return;
    }

    setLoading(true);
    try {
      const res = await GetCashInsByVaultId(selectedVault?.vault?.id);
      const fetchedOrders = res?.data || [];

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
  }, [isEditMode, editData, selectedVault?.vault?.id]);

  useEffect(() => {
    if (isOpen) {
      fetchCashIns();
    }
  }, [fetchCashIns, isOpen]);

  // ── Calculation Logic ──
  const totalSelectedBagAmount = selectedRows.reduce((sum, o) => sum + (parseFloat(o.cash_in_amount) || 0), 0);

  // Difference calculator matching your rule: Requested Amount - Selected Bag sum
  const calculatedExcessAmount = requestedAmount < totalSelectedBagAmount;

  const isCustodianRequire = parseFloat(requestedAmount) < parseFloat(totalSelectedBagAmount) ? true : false;

  const handleGenerateDeposit = () => {
    // 1. Required Vault Check
    if (!selectedVault) return setError("Please select a vault.");

    // 2. Required Requested Amount Validation
    if (!requestedAmount.trim() || parseFloat(requestedAmount) <= 0) {
      setRequestedAmountTouched(true);
      return addToast({ type: "error", message: "Requested amount is required to proceed." });
    }

    // 3. Row Selection Check
    if (selectedRows.length === 0) {
      return addToast({ type: "error", message: "Please select at least one cash out bag." });
    }

    setDepositLoading(true);
    setTimeout(() => {
      setDepositLoading(false);
      setStep(2);
    }, 300);
  };

  useEffect(() => {
    if (selectedVault) {
      GetCustodiansByVaultId(selectedVault?.vault?.id).then((res) => {
        setCustodians(res);
      });
    }
  }, [selectedVault?.vault?.id]);

  const handleConfirmSubmit = async () => {
    if (!selectedCustodian && isCustodianRequire) {
      return addToast({ type: "error", message: "Please select an Excess Cash Custodian." });
    }
    if (!purposeNote.trim()) {
      setPurposeNoteTouched(true);
      return addToast({ type: "error", message: "Purpose / Note is required to submit." });
    }

    setSubmitLoading(true);

    try {
      const payload = {
        cash_in_id: selectedRows[0].id,
        vault_id: selectedVault?.vault?.id,
        request_amount: parseFloat(requestedAmount),
        bags: selectedRows,
        custodian_id: selectedCustodian?.id || null,
        cash_out_amount: totalSelectedBagAmount,
        purpose_note: purposeNote,
      };

      const res = await CreateCashOut(payload);
      // console.log({ res });

      if (res?.success === true) {
        refetch();
        onClose();
      } else {
        addToast({ type: "error", message: res?.message });
      }
    } catch (error) {
      console.error("Cash Out Submission Error:", error);
    } finally {
      setSubmitLoading(false);
    }
  };

  // Is the field currently failing validation checks?
  const isRequestedAmountInvalid = requestedAmountTouched && (!requestedAmount.trim() || parseFloat(requestedAmount) <= 0);
  const isPurposeNoteInvalid = purposeNoteTouched && !purposeNote.trim();

  // ── Columns ──
  const columns = [
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
      title: "Bag ID",
      key: "order_id",
      render: (row) => <span className="font-mono font-semibold text-black/70 ">{row.bags?.barcode}</span>,
    },
    {
      title: "Transaction ID",
      key: "tran_id",
      render: (row) => <span className="font-mono font-semibold text-cyan-500 ">{row?.tran_id}</span>,
    },
    {
      title: "Total",
      key: "cash_in_amount",
      render: (row) => <span>৳{parseFloat(row?.cash_in_amount || 0).toLocaleString()}</span>,
    },
    {
      title: "Cash in date",
      key: "created_at",
      render: (row) => <span>{dayjs(row?.created_at).format("DD MMM,YYYY hh:mm A")}</span>,
    },
  ];

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={handleClose}
        title={
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <MdArrowOutward className="text-blue-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">{isEditMode ? "Edit Cash Out Request" : "New Cash Out Request"}</h2>
              <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">
                {isEditMode ? `Editing · ${editData?.tran_id}` : `Step ${step}: ${step === 1 ? "Select vault & cash out bags" : "Add Details & Submit"}`}
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
              className="flex flex-col h-full "
            >
              <div className="p-6 bg-white ">
                <div className="grid grid-cols-2 gap-6 items-end justify-between">
                  <VaultSelect
                    vaults={user?.vault_assignments}
                    defaultVault={user?.default_vault_id}
                    selectedVault={selectedVault}
                    onSelect={setSelectedVault}
                    error={error}
                    setError={setError}
                  />

                  <div className="flex-1 items-center gap-4">
                    <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-1 ml-1">
                      Requested Amount <span className="text-red-500">*</span>
                    </p>
                    <div
                      className={`flex text-gray-700 gap-2 items-center border p-2.5 rounded-lg bg-[#F8FAFC] transition-all focus-within:bg-white ${
                        isRequestedAmountInvalid
                          ? "border-red-500 focus-within:border-red-500 shadow-sm shadow-red-50"
                          : "border-slate-200 focus-within:border-cyan-500"
                      }`}
                    >
                      <p className="text-xs font-semibold text-slate-400">BDT</p>
                      <input
                        type="text"
                        value={requestedAmount}
                        onChange={(e) => {
                          setRequestedAmount(e.target.value.replace(/[^0-9.]/g, ""));
                          if (requestedAmountTouched) setRequestedAmountTouched(false);
                        }}
                        placeholder="0.00"
                        className="w-full h-full focus:outline-none bg-transparent font-semibold"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex-1 items-center gap-4 mt-4 ">
                  <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-1 ml-1">Total Selected Bag Amount (BDT)</p>
                  <div className="flex text-slate-800 gap-2 items-center border border-slate-200 p-2.5 rounded-lg bg-[#F7FBFF]">
                    <p className="text-xs font-semibold text-slate-400">BDT</p>
                    <input
                      type="text"
                      readOnly
                      value={totalSelectedBagAmount ? totalSelectedBagAmount.toFixed(2) : "0.00"}
                      className="w-full h-full focus:outline-none bg-transparent font-bold text-cyan-600"
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 flex-1 overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase ml-1">Available Orders for Cash Out</span>
                  <span className="bg-blue-50 text-blue-700 text-[11px] font-semibold px-2.5 py-1 rounded-full">{selectedRows.length} Selected</span>
                </div>
                <DataTable
                  columns={columns}
                  data={orders}
                  paginationData={paginationData}
                  selectedRows={selectedRows}
                  loading={loading}
                  setSelectedRows={setSelectedRows}
                  className="h-[calc(100vh-480px)]"
                />
              </div>

              <div className="flex items-center bg-[#FDFDFE] border-t border-slate-200 py-6 px-6 gap-4 justify-between">
                <button
                  onClick={handleClose}
                  className="px-6 py-3 w-[35%] text-center justify-center cursor-pointer bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-sm rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerateDeposit}
                  disabled={depositLoading}
                  className="px-6 w-[65%] py-3 cursor-pointer justify-center bg-[#1e293b] shadow-md hover:bg-black text-white font-semibold text-sm rounded-xl transition-all disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none flex items-center justify-center gap-2"
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
              className="flex flex-col h-full"
            >
              <div className="flex-1 p-6 overflow-y-auto space-y-6">
                {/* 1. Excess Cash Custodian Label Row */}
                {calculatedExcessAmount && (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#475569] tracking-wider uppercase">Excess Cash Custodian</span>
                      <span className="bg-[#EFF6FF] text-[#2563EB] text-[10px] font-medium px-2 py-0.5 rounded border border-[#DBEAFE] flex items-center gap-1">
                        <User className="w-3 h-3" />
                        Selection Required
                      </span>
                    </div>

                    <div className="bg-[#FFFDF5] border border-[#f8ebba] rounded-xl p-5 flex items-center justify-between ">
                      <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-lg bg-[#FEF3C7] flex items-center justify-center text-[#D97706]">
                          <svg
                            width="22"
                            height="22"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <rect x="2" y="5" width="20" height="14" rx="2" />
                            <line x1="2" y1="10" x2="22" y2="10" />
                            <circle cx="12" cy="14.5" r="2.5" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-[11px] font-bold text-orange-400 uppercase tracking-wide">Calculated Excess Amount</h4>
                          <p className="text-[12px] font-medium text-[#9A3412]">Difference from selected bags</p>
                        </div>
                      </div>
                      <div className="text-xl font-black text-[#9A3412] ">BDT {totalSelectedBagAmount.toFixed(2)}</div>
                    </div>

                    <div className="">
                      {custodians?.length === 0 ? (
                        <div className="bg-red-50/50 border border-red-300 flex flex-col gap-4 justify-center items-center rounded-xl w-full min-h-[200px]">
                          <CiWarning className="w-12 h-12 text-red-400" />
                          <p className="text-red-500  text-center text-sm">
                            No custodians found for this vault. You cannot proceed with the cash-out process. Please assign a custodian to this vault first and
                            try again.
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {custodians?.map((custodian) => {
                            const isSelected = selectedCustodian?.id === custodian.id;
                            return (
                              <motion.div
                                key={custodian.id}
                                whileHover={{ y: -1 }}
                                whileTap={{ scale: 0.99 }}
                                onClick={() => setSelectedCustodian(custodian)}
                                className={`p-4 rounded-xl border flex items-center gap-4 cursor-pointer transition-all ${
                                  isSelected ? "border-blue-200 shadow-md shadow-blue-50 bg-blue-50" : "border-[#E2E8F0] bg-white hover:border-[#CBD5E1] "
                                }`}
                              >
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm ${
                                    isSelected ? "bg-[#2563EB] text-white" : "bg-gray-100 text-slate-400"
                                  }`}
                                >
                                  {custodian.name.charAt(0).toUpperCase()}
                                </div>
                                <span className="font-bold text-xs text-black/80">{custodian.name}</span>
                              </motion.div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* 4. Purpose / Note Textarea Component */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#475569] tracking-wider uppercase">Purpose / Note</label>
                  <textarea
                    rows={4}
                    value={purposeNote}
                    onChange={(e) => {
                      setPurposeNote(e.target.value);
                      if (purposeNoteTouched) setPurposeNoteTouched(false);
                    }}
                    placeholder="Provide a detailed explanation for this vault withdrawal..."
                    className={`w-full bg-[#F8FAFC] border rounded-xl p-4 text-sm text-[#334155] placeholder-[#94A3B8] focus:outline-none transition-all resize-none ${
                      isPurposeNoteInvalid ? "border-red-500 focus:border-red-500 shadow-sm shadow-red-50" : "border-[#E2E8F0] focus:border-[#CBD5E1]"
                    }`}
                  />
                </div>

                {/* 5. Verification Notice Block Section */}
                <div className="bg-[#FFFDF5] border border-[#FEF3C7] rounded-xl p-4 flex gap-3">
                  <Info className="w-5 h-5 text-[#D97706] shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h5 className="text-xs font-bold text-[#9A3412]">Verification Notice</h5>
                    <p className="text-xs text-[#ad5d01] ">
                      A surplus of BDT {totalSelectedBagAmount.toFixed(2)} will remain. You must select a custodian to take responsibility for this excess cash.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 2 Bottom Sticky Action Footer layout */}
              <div className="flex items-center bg-slate-50 border-t border-slate-100 p-6 gap-4 justify-between shadow-lg">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-3 w-[30%] flex items-center gap-2 text-center justify-center cursor-pointer  border border-gray-200 bg-slate-50 text-slate-600 hover:bg-slate-100 font-semibold text-sm rounded-xl transition-all"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={handleConfirmSubmit}
                  disabled={submitLoading || (isCustodianRequire && !selectedCustodian)}
                  className="px-6 w-[70%] py-3 cursor-pointer justify-center bg-[#2563EB] shadow-md hover:bg-[#1D4ED8] text-white font-bold text-sm rounded-xl transition-all disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none flex items-center justify-center gap-2"
                >
                  {submitLoading ? (
                    <Loader2 className="animate-spin w-4 h-4" />
                  ) : (
                    <span>{isEditMode ? "Update Cash Out Request" : "Submit Cash Out Request"}</span>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Drawer>
    </>
  );
};

export default CashOutRequestDrawer;
