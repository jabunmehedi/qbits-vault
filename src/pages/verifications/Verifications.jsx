import { AnimatePresence, motion } from "framer-motion";
import { Camera, Check, CheckCircle, QrCode, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import DataTable from "../../components/global/dataTable/DataTable";
import CustomModal from "../../components/global/modal/CustomModal";
import { useToast } from "../../hooks/useToast";
import { ApproveCashIn, ApproveCashOut, GetPendingCashIn, GetPendingCashOut, VerifyCashIn, VerifyCashOut } from "../../services/Cash"; // add VerifyCashIn
import { BarcodeScannerModal } from "./BarcodeScannerModal";
import { GetPendingReconciliations, VerifyReconcile } from "../../services/Reconcile";
import ReconcileVerifyModel from "../../components/verifications/reconcile/ReconcileVerifyModel";
import ReconcileStart from "../../components/verifications/reconcile/ReconcileStart";
import { selectIsLockedForOperations } from "../../store/checkReconcile";

const Verifications = () => {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState("cashin");
  const [allPendingCashIn, setAllPendingCashIn] = useState([]);
  const [allPendingCashOut, setAllPendingCashOut] = useState([]);
  const [allPendingReconcile, setAllPendingReconcile] = useState([]);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [scannedBarcode, setScannedBarcode] = useState("");
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const isLocked = useSelector(selectIsLockedForOperations);

  const permissions = useSelector((state) => state.auth.permissions || []);
  const hasPermission = (perm) => permissions.includes(perm);


  // Verify Modal State
  const [openVerifyModal, setOpenVerifyModal] = useState(false);
  const [openApproveModal, setOpenApproveModal] = useState(false);
  const [openCashoutApproveModal, setOpenCashoutApproveModal] = useState(false);
  const [selectedCashIn, setSelectedCashIn] = useState(null);
  const [selectedCashOut, setSelectedCashOut] = useState(null);
  const [verifyAction, setVerifyAction] = useState("verify"); // verify, approve, reject
  const [OpenOtpModal, setOpenOtpModal] = useState(false);
  const [otpModalSubmitAction, setOtpModalSubmitAction] = useState("");

  // Reconcile
  const [openReconcileVerifyModel, setOpenReconcileVerifyModel] = useState(false);
  const [openReconcileStartModel, setOpenReconcileStartModel] = useState(false);
  const [selectedReconcile, setSelectedReconcile] = useState();

  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [note, setNote] = useState("");

  const photoInputRef = useRef(null);

  const user = useSelector((state) => state.auth.user);

  // 1. Read tab from URL when component mounts
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabFromUrl = params.get("tab");

    if (tabFromUrl && ["cashin", "cashout", "reconcile"].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
    // else keep default "cashin"
  }, []);

  // 2. Update URL when user changes tab
  const handleTabChange = (newTab) => {
    setActiveTab(newTab);

    // Update URL without full reload
    const params = new URLSearchParams(window.location.search);
    params.set("tab", newTab);

    // Use replaceState → no new history entry (cleaner)
    window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
  };

  const tabs = [
    { id: "cashin", label: "Cash In" },
    { id: "cashout", label: "Cash Out" },
    { id: "reconcile", label: "Reconcile" },
  ];

  useEffect(() => {
    fetchPendingCashIns();
    fetchPendingCashOuts();
    fetchPendingReconciliations();
  }, []);

  const handleTakePhoto = () => {
    photoInputRef.current?.click();
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const photoUrl = URL.createObjectURL(file);
      setCapturedPhoto({ file, url: photoUrl });
      // Camera closes automatically here
    }
  };

  // fetch pending cashins
  const fetchPendingCashIns = async () => {
    try {
      const res = await GetPendingCashIn();
      setAllPendingCashIn(res?.data || []);
    } catch (err) {
      addToast({ type: "error", message: "Failed to load pending cash-ins" });
    }
  };

  // fetch pending cashouts
  const fetchPendingCashOuts = async () => {
    try {
      const res = await GetPendingCashOut();
      setAllPendingCashOut(res?.data || []);
    } catch (err) {
      addToast({ type: "error", message: "Failed to load pending cash-outs" });
    }
  };

  // fetching pending reconciliations
  const fetchPendingReconciliations = async () => {
    try {
      const res = await GetPendingReconciliations();
      setAllPendingReconcile(res?.data || []);
    } catch (err) {
      addToast({ type: "error", message: "Failed to load pending reconciliations" });
    }
  };

  // Open verify modal
  const handleVerifyClick = (cashIn, action = "verify") => {
    setSelectedCashIn(cashIn);
    setVerifyAction(action);
    setNote("");
    setOpenVerifyModal(true);
  };
  const handleApproveClick = (cashIn, action = "approve") => {
    setSelectedCashIn(cashIn);
    setVerifyAction(action);
    setNote("");
    setOpenApproveModal(true);
  };

  const handleCashOutVerifyClick = (cashOut, action = "verify") => {
    setSelectedCashOut(cashOut);
    setVerifyAction(action);
    setNote("");
    setOpenVerifyModal(true);
  };
  const handleCashOutApproveClick = (cashOut, action = "approve") => {
    setSelectedCashOut(cashOut);
    setVerifyAction(action);
    setNote("");
    setOpenCashoutApproveModal(true);
  };

  // reconcile
  const handleReconcileVerifyClick = (reconcile) => {
    setSelectedReconcile(reconcile);
    setVerifyAction("verify");
    setNote("");
    setOpenReconcileVerifyModel(true);
  };
  const handleReconcileApproveClick = (reconcile) => {
    setSelectedReconcile(reconcile);
    setVerifyAction("approve");
    setNote("");
    setOpenReconcileStartModel(true);
  };


  // Submit verification
  const handleVerifySubmit = async () => {
    if (!selectedCashIn) return;
    setOtpModalSubmitAction("cashin");
    setOpenOtpModal(true);
  };
  const handleCashoutApproveSubmit = async () => {
    if (!selectedCashOut) return;
    setOtpModalSubmitAction("cashout");
    setOpenOtpModal(true);
  };
  const handleVerifyCashOutSubmit = async () => {
    setOtpModalSubmitAction("cashout");
    setOpenOtpModal(true);
  };

  const handleFinalVerifyConfirm = async () => {
    if (otp !== "1234") {
      setOtpError("Invalid OTP");
      return;
    }

    try {
      if (verifyAction === "verify") {
        await VerifyCashIn(selectedCashIn.id, verifyAction, note);
        setOpenOtpModal(false);
        addToast({ type: "success", message: `${verifyAction.charAt(0).toUpperCase() + verifyAction.slice(1)} successful!` });
      } else if (verifyAction === "approve") {
        await ApproveCashIn(selectedCashIn.id, note);
        setOpenOtpModal(false);
        setOpenApproveModal(false);
        addToast({ type: "success", message: `${verifyAction.charAt(0).toUpperCase() + verifyAction.slice(1)} successful!` });
      }

      setOpenVerifyModal(false);
      fetchPendingCashIns(); // refresh list
    } catch (err) {
      addToast({ type: "error", message: "Verification failed" });
    }
  };

  // Submit verification

  const handleCashOutVerifySubmit = async () => {
    if (!selectedCashOut) return;

    try {
      if (verifyAction === "verify") {
        await VerifyCashOut(selectedCashOut.id, verifyAction, note);
        addToast({ type: "success", message: `${verifyAction.charAt(0).toUpperCase() + verifyAction.slice(1)} successful!` });
        setOpenOtpModal(false);
      } else if (verifyAction === "approve") {
        await ApproveCashOut(selectedCashOut.id, note);
        setOpenOtpModal(false);
        addToast({ type: "success", message: `${verifyAction.charAt(0).toUpperCase() + verifyAction.slice(1)} successful!` });
      }

      setOpenVerifyModal(false);
      fetchPendingCashIns(); // refresh list
    } catch (err) {
      addToast({ type: "error", message: "Verification failed" });
    }
  };

  const handleReconcileVerifySubmit = async () => {
    if (!selectedReconcile) return;
    setOtpModalSubmitAction("reconcile");
    setOpenOtpModal(true);
  };

  const hanleReconcileConfirmVerify = async () => {
    if (otp !== "1234") {
      setOtpError("Invalid OTP");
      return;
    }

    try {
      if (verifyAction === "verify") {
        await VerifyReconcile(selectedReconcile.id, verifyAction, note);
        setOpenOtpModal(false);
        setOpenReconcileVerifyModel(false);
        addToast({ type: "success", message: `${verifyAction.charAt(0).toUpperCase() + verifyAction.slice(1)} successful!` });
      } else if (verifyAction === "approve") {
        await ApproveCashIn(selectedCashIn.id, note);
        setOpenOtpModal(false);
        setOpenApproveModal(false);
        addToast({ type: "success", message: `${verifyAction.charAt(0).toUpperCase() + verifyAction.slice(1)} successful!` });
      }

      setOpenVerifyModal(false);
      fetchPendingReconciliations();
    } catch (err) {
      addToast({ type: "error", message: "Verification failed" });
    }

    addToast({ type: "success", message: "Verification successful!" });
  };

  const refech = () => {
    fetchPendingReconciliations();
  };

  const cashInPendingColumns = [
    {
      title: "Vault",
      key: "vault_id",
      className: "w-20",
      render: (row) => <span className="font-mono text-cyan-400">{row.vault?.vault_id || row.vault_id}</span>,
    },
    {
      title: "Transaction Id",
      key: "trans_id",
      className: "w-28",
      render: (row) => <span className="">{row?.tran_id}</span>,
    },
    {
      title: "Bag",
      key: "bag_barcode",
      className: "w-28",
      render: (row) => (
        <span className="">
          {row.bags?.barcode}-RN{row.bags?.rack_number}
        </span>
      ),
    },
    {
      title: "Order Ids",
      key: "orders.order_id",
      className: "w-[220px]",
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          {row?.orders?.map((order, index) => (
            <span
              key={index}
              className="text-sm bg-cyan-50 border border-cyan-200 cursor-pointer  text-cyan-500 text-xs rounded-full flex items-center gap-2 px-3 py-2"
            >
              {order?.order_id}
            </span>
          ))}
        </div>
      ),
    },
    {
      title: "Amount (৳)",
      key: "cash_in_amount",
      className: "w-40",
      render: (row) => <span className="">{parseFloat(row.cash_in_amount).toLocaleString()}</span>,
    },
    {
      title: "Verifier Status",
      key: "verifier_status",
      className: "w-40",
      render: (row) => (
        <span
          className={`capitalize px-4 py-2 rounded-full text-xs ${
            row.verifier_status === "pending"
              ? "bg-yellow-50 text-yellow-500"
              : row.verifier_status === "verified"
                ? "bg-green-50 text-green-500"
                : "bg-gray-50 text-gray-500"
          }`}
        >
          {row.verifier_status}
        </span>
      ),
    },
    {
      title: "Status",
      key: "status",
      className: "w-40",
      render: (row) => (
        <span
          className={`capitalize px-4 py-2 rounded-full text-xs ${
            row.status === "pending"
              ? "bg-yellow-50 text-yellow-500"
              : row.status === "approved"
                ? "bg-green-50 text-green-500"
                : row.status === "rejected"
                  ? "bg-red-100 text-red-700"
                  : "bg-gray-50 text-gray-500"
          }`}
        >
          {row.status}
        </span>
      ),
    },
    {
      title: "Action",
      key: "actions",
      className: `w-64 ${isLocked ? "hidden" : "flex"}`,
      render: (row) => {
        const isVerified = row?.required_verifiers?.find((verifier) => verifier.user_id === user?.id)?.verified;

        return (
          <div className="flex items-center justify-start gap-3 py-2">
            {hasPermission("cash-in.verify") && !isVerified && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleVerifyClick(row, "verify")}
                className="px-4 py-1 bg-cyan-50 cursor-pointer text-cyan-500 border border-cyan-200 rounded-full font-medium  flex items-center gap-2"
              >
                {/* <Check className="w-5 h-5" /> */}
                Verify
              </motion.button>
            )}

            {/* Approve Button */}
            {hasPermission("cash-in.approve") && (
              <>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleApproveClick(row, "approve")}
                  className={`px-4 py-1 bg-emerald-50 cursor-pointer ${
                    isVerified ? "flex" : "hidden"
                  } text-green-500 border border-emerald-200 rounded-full  flex items-center gap-2`}
                >
                  Approve
                </motion.button>
              </>
            )}

            {/* Reject Button */}
            {hasPermission("cash-in.reject") && row.verifier_status === "pending" && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleVerifyClick(row, "reject")}
                className="px-4 py-1 bg-pink-50 cursor-pointer text-pink-400 border border-pink-200  rounded-full   flex items-center gap-2"
              >
                Reject
              </motion.button>
            )}
          </div>
        );
      },
    },
  ];
  const cashOutPendingColumns = [
    {
      title: "Vault",
      key: "vault_id",
      className: "w-20",
      render: (row) => <span className="font-mono text-cyan-400">{row.vault?.vault_id || row.vault_id}</span>,
    },
    {
      title: "Bag",
      key: "bag_barcode",
      className: "w-64",
      render: (row) => (
        <div className="flex flex-wrap items-center gap-2 -ml-1 -mt-1">
          {row?.cash_out_bags?.length > 0 ? (
            row.cash_out_bags.map((bag, i) => (
              <span key={i} className="inline-flex items-center px-3 py-1.5 bg-cyan-50 border border-cyan-200 text-xs font-medium rounded-full">
                {bag?.bag?.barcode} - RN#{bag?.bag?.rack_number}
              </span>
            ))
          ) : (
            <span className="text-gray-400 text-xs">No bags</span>
          )}
        </div>
      ),
    },
    {
      title: "Amount (৳)",
      key: "cash_in_amount",
      className: "w-40",
      render: (row) => <span className="">{parseFloat(row.cash_out_amount).toLocaleString()}</span>,
    },
    {
      title: "Verifier Status",
      key: "verifier_status",
      className: "w-40",
      render: (row) => (
        <span
          className={`capitalize px-4 py-2 rounded-full text-xs ${
            row.verifier_status === "pending"
              ? "bg-yellow-50 text-yellow-500"
              : row.verifier_status === "verified"
                ? "bg-green-50 text-green-500"
                : "bg-gray-50 text-gray-500"
          }`}
        >
          {row.verifier_status}
        </span>
      ),
    },
    {
      title: "Approvers Status",
      key: "status",
      className: "w-40",
      render: (row) => (
        <span
          className={`capitalize px-4 py-2 rounded-full text-xs ${
            row.status === "pending"
              ? "bg-yellow-50 text-yellow-500"
              : row.status === "approved"
                ? "bg-green-50 text-green-500"
                : row.status === "rejected"
                  ? "bg-red-100 text-red-700"
                  : "bg-gray-50 text-gray-500"
          }`}
        >
          {row.status}
        </span>
      ),
    },
    {
      title: "Action",
      key: "actions",
      className: `w-64`,
      render: (row) => {
        const isVerified = row?.required_verifiers?.find((verifier) => verifier.user_id === user?.id)?.verified;

        return (
          <div className={`${isLocked ? "hidden" : "flex"} items-center justify-start gap-3 py-2`}>
            {hasPermission("cash-out.verify") && !isVerified && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleCashOutVerifyClick(row, "verify")}
                className="px-4 py-1 bg-cyan-50 cursor-pointer text-cyan-500 border border-cyan-200 rounded-full font-medium  flex items-center gap-2"
              >
                {/* <Check className="w-5 h-5" /> */}
                Verify
              </motion.button>
            )}

            {/* Approve Button */}
            {hasPermission("cash-out.approve") && (
              <>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleCashOutApproveClick(row, "approve")}
                  className={`px-4 py-1 bg-emerald-50 cursor-pointer ${
                    isVerified ? "flex" : "hidden"
                  } text-green-500 border border-emerald-200 rounded-full  flex items-center gap-2`}
                >
                  Approve
                </motion.button>
              </>
            )}

            {/* Reject Button */}
            {hasPermission("cash-in.reject") && row.verifier_status === "pending" && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleCashOutVerifyClick(row, "reject")}
                className="px-4 py-1 bg-pink-50 cursor-pointer text-pink-400 border border-pink-200  rounded-full   flex items-center gap-2"
              >
                Reject
              </motion.button>
            )}
          </div>
        );
      },
    },
  ];
  const reconcilePendingColumns = [
    {
      title: "Reconcile ID",
      key: "reconcile_tran_id",
      className: "w-40",
      render: (row) => <span className="font-mono text-cyan-400">{row?.reconcile_tran_id}</span>,
    },
    {
      title: "Vault ID",
      key: "reconcile_tran_id",
      className: "w-24",
      render: (row) => <span className="font-mono text-cyan-400">{row?.vault.vault_id}</span>,
    },
    {
      title: "Exp. Amount(৳)",
      key: "bag_barcode",
      className: "w-34",
      render: (row) => <span className="">{row?.vault?.bags?.reduce((sum, bag) => sum + parseFloat(bag.current_amount || 0), 0)}</span>,
    },

    {
      title: "CNT. Amount(৳)",
      key: "cash_in_amount",
      className: "w-40",
      render: (row) => <span className="">{row?.vault?.bags?.reduce((sum, bag) => sum + parseFloat(bag.current_amount || 0), 0)}</span>,
    },
    {
      title: "Verifier Status",
      key: "verifier_status",
      className: "w-40",
      render: (row) => (
        <span
          className={`capitalize px-4 py-2 rounded-full text-xs ${
            row.verifier_status === "pending"
              ? "bg-yellow-50 text-yellow-600"
              : row.verifier_status === "verified"
                ? "bg-green-50 text-green-500"
                : "bg-gray-50 text-gray-500"
          }`}
        >
          {row.verifier_status}
        </span>
      ),
    },
    {
      title: "Approvers Status",
      key: "status",
      className: "w-40",
      render: (row) => (
        <span
          className={`capitalize px-4 py-2 rounded-full text-xs ${
            row.status === "pending"
              ? "bg-yellow-50 text-yellow-600"
              : row.status === "approved"
                ? "bg-green-50 text-green-500"
                : row.status === "rejected"
                  ? "bg-red-100 text-red-700"
                  : "bg-gray-50 text-gray-500"
          }`}
        >
          {row.status}
        </span>
      ),
    },
    {
      title: "Status",
      key: "status",
      className: "w-40",
      render: (row) => (
        <span
          className={`capitalize px-4 py-2 rounded-full text-xs ${
            row.status === "pending"
              ? "bg-yellow-50 text-yellow-600"
              : row.status === "approved"
                ? "bg-green-50 text-green-500"
                : row.status === "rejected"
                  ? "bg-red-100 text-red-700"
                  : "bg-gray-50 text-gray-500"
          }`}
        >
          {row.status}
        </span>
      ),
    },
    {
      title: "Action",
      key: "actions",
      className: "w-64",
      render: (row) => {
        const isVerified = row?.required_verifiers?.find((verifier) => verifier.user_id === user?.id)?.verified;

        return (
          <div className="flex items-center justify-start gap-3 py-2">
            {hasPermission("reconciliation.verify") && !isVerified && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleReconcileVerifyClick(row)}
                className="px-4 text-xs py-2 bg-cyan-50 cursor-pointer text-cyan-500 border border-cyan-200 rounded-full font-medium  flex items-center gap-2"
              >
                {/* <Check className="w-5 h-5" /> */}
                Verify
              </motion.button>
            )}

            {/* Approve Button */}
            {hasPermission("reconciliation.approve") && (
              <>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleReconcileApproveClick(row)}
                  className={`px-4 py-2 text-xs bg-emerald-50 cursor-pointer ${
                    isVerified ? "flex" : "hidden"
                  } text-green-500 border border-emerald-200 rounded-full  flex items-center gap-2`}
                >
                  Start Reconcile
                </motion.button>
              </>
            )}

            {/* Reject Button */}
            {hasPermission("cash-in.reject") && row.verifier_status === "pending" && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleCashOutVerifyClick(row, "reject")}
                className="px-4 py-2 text-xs bg-pink-50 cursor-pointer text-pink-400 border border-pink-200  rounded-full   flex items-center gap-2"
              >
                Reject
              </motion.button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="min-h-screen">
      <div className=" py-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Tabs */}
          <div className="flex  justify-center lg:gap-8  border-gray-200 lg:mb-2 max-w-3xl mx-auto">
            {tabs.map((tab) => (
              <motion.button
                key={tab.id}
                whileHover={{ scale: 1.05 }}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-3 lg:pb-4 px-2 border-b-2 transition-all  ${
                  activeTab === tab.id ? "border-cyan-600 text-cyan-600" : "border-transparent text-gray-600 hover:text-gray-800"
                }`}
              >
                {tab.label}
              </motion.button>
            ))}
          </div>

          <motion.div key={activeTab} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="bg-white rounded-3xl overflow-hidden">
            {activeTab === "cashin" && (
              <div className="p-2 lg:p-8">
                <h2 className="lg:text-lg text-center font-medium text-gray-800 mb-6">Pending Cash In</h2>
                <DataTable columns={cashInPendingColumns} data={allPendingCashIn} className="h-[calc(100vh-140px)] lg:h-[calc(100vh-200px)]" />
              </div>
            )}

            {activeTab === "cashout" && (
              <div className="lg:p-8 text-center py-20">
                <h2 className="text-lg font-medium text-gray-800 mb-6">Pending Cash Out</h2>
                <DataTable columns={cashOutPendingColumns} data={allPendingCashOut} className="h-[calc(100vh-220px)]" />
              </div>
            )}

            {activeTab === "reconcile" && (
              <div className="lg:p-8 text-center py-20">
                <h2 className="text-lg font-medium text-gray-800 mb-6">Pending Reconciliations</h2>
                <DataTable columns={reconcilePendingColumns} data={allPendingReconcile} className="h-[calc(100vh-220px)]" />
              </div>
            )}
          </motion.div>
        </motion.div>

        {/* cash in Verify Modal */}
        <AnimatePresence>
          {openVerifyModal && selectedCashIn && (
            <CustomModal isCloseModal={() => setOpenVerifyModal(false)}>
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                <h2 className="text-xl font-bold text-center mb-8 text-gray-800">{verifyAction.charAt(0).toUpperCase() + verifyAction.slice(1)} Cash In</h2>

                <div className="space-y-2 mb-8">
                  <p className="text-sm">
                    <span className="">Bag Barcode:</span> <span className="font-mono font-medium text-cyan-600 text-md">{selectedCashIn.bag_barcode}</span>
                  </p>
                  <p className="text-sm  text-gray-800">
                    Amount: <span className="text-green-600 font-medium text-xl">৳{parseFloat(selectedCashIn.cash_in_amount).toLocaleString()}</span>
                  </p>
                  <p className="text-sm">
                    Current Status: <span className="capitalize font-medium text-green-600 ">{selectedCashIn.verifier_status}</span>
                  </p>
                </div>

                <div className="mb-8">
                  <label className="block text-lg font-medium text-gray-700 mb-3">Note (Optional)</label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Add a note about your decision..."
                    className="w-full px-6 py-4 border-2 border-gray-200 rounded-xl focus:border-cyan-500 outline-none resize-none"
                    rows="4"
                  />
                </div>

                <div className="flex gap-6 justify-center">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setOpenVerifyModal(false)}
                    className="px-10 py-4 border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition"
                  >
                    Cancel
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleVerifySubmit}
                    className={`px-12 py-4 rounded-xl font-bold text-white shadow-lg flex items-center gap-3 ${
                      verifyAction === "verify"
                        ? "bg-gradient-to-r from-blue-600 to-cyan-600"
                        : verifyAction === "approve"
                          ? "bg-gradient-to-r from-green-600 to-emerald-600"
                          : "bg-gradient-to-r from-red-600 to-pink-600"
                    }`}
                  >
                    {verifyAction === "verify" && <Check className="w-6 h-6" />}
                    {verifyAction === "approve" && <CheckCircle className="w-6 h-6" />}
                    {verifyAction === "reject" && <XCircle className="w-6 h-6" />}
                    Confirm {verifyAction.charAt(0).toUpperCase() + verifyAction.slice(1)}
                  </motion.button>
                </div>
              </motion.div>
            </CustomModal>
          )}
        </AnimatePresence>

        {/* cash in approve Modal */}
        <AnimatePresence>
          {openApproveModal && selectedCashIn && (
            <CustomModal isCloseModal={() => setOpenApproveModal(false)}>
              <div className="max-h-[calc(90vh-80px)] overflow-y-auto px-2 sm:px-4 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">
                <h2 className="text-xl font-bold text-center mb-8 text-gray-800">{verifyAction.charAt(0).toUpperCase() + verifyAction.slice(1)} Cash In</h2>

                <div className="space-y-2 mb-2 lg:mb-8">
                  <p className="text-sm">
                    <span className="">Bag Barcode:</span>{" "}
                    <span className="font-mono font-medium text-cyan-600 text-md">
                      {selectedCashIn.bags?.barcode}-RN#{selectedCashIn.bags?.rack_number}
                    </span>
                  </p>
                  <p className="text-sm  text-gray-800">
                    Amount: <span className="text-green-600 font-medium text-xl">৳{parseFloat(selectedCashIn.cash_in_amount).toLocaleString()}</span>
                  </p>
                  <p className="text-sm">
                    Current Status: <span className="capitalize font-medium text-green-600 ">{selectedCashIn.verifier_status}</span>
                  </p>
                </div>

                <div className="mb-2 lg:mb-8">
                  <label className="block text-sm lg:text-lg font-medium text-gray-700 mb-3">Scan Bag</label>
                  {scannedBarcode ? (
                    <div className="p-4 bg-green-50 border border-green-300 rounded-lg text-center">
                      <p className="font-mono text-xl text-green-700">{scannedBarcode}</p>
                      <button onClick={() => setScannedBarcode("")} className="text-sm text-red-600 mt-2">
                        Clear
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsScannerOpen(true)}
                      className="lg:w-full flex items-center lg:justify-center gap-3 p-2 lg:p-6 border border-dashed border-cyan-400 rounded-xl hover:bg-cyan-50"
                    >
                      <QrCode className="lg:w-10 lg:h-10 text-cyan-600" />
                      <span className="text-cyan-600 text-xs lg:text-sm font-medium">Tap to scan barcode</span>
                    </button>
                  )}
                </div>

                <BarcodeScannerModal
                  isOpen={isScannerOpen}
                  onClose={() => setIsScannerOpen(false)}
                  onScanned={(code) => {
                    setScannedBarcode(code);
                    setIsScannerOpen(false); // Auto close
                  }}
                />

                <div className="mb-2 lg:mb-8">
                  <label className="block text-sm lg:text-lg font-medium text-gray-700 mb-3">Take Picture of Bag</label>

                  <div className="flex w-full gap-4">
                    {capturedPhoto ? (
                      <div className="relative">
                        <img src={capturedPhoto.url} alt="Bag" className="w-64 h-64 object-cover rounded-lg shadow-md" />
                        <button onClick={() => setCapturedPhoto(null)} className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2">
                          <XCircle className="w-5 h-5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={handleTakePhoto}
                        className="flex  items-center gap-3 p-2 border border-dashed border-cyan-400 rounded-xl hover:bg-cyan-50 transition"
                      >
                        <Camera className="w-6 h-6 text-cyan-600" />
                        <span className="text-cyan-600 text-xs lg:text-sm font-medium">Tap to take photo</span>
                      </button>
                    )}

                    {/* Hidden input that triggers native camera */}
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment" // This forces rear camera on mobile
                      className="hidden"
                      onChange={handlePhotoChange}
                    />
                  </div>
                </div>
                <div className="mb-8">
                  <label className="block text-sm lg:text-lg font-medium text-gray-700 mb-3">Note</label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Add a note about your decision..."
                    className="w-full placeholder:text-sm px-6 py-4 border border-gray-200 rounded-xl focus:border-cyan-500 outline-none resize-none"
                    rows="lg:4"
                  />
                </div>

                <div className="flex gap-6 justify-end">
                  <div
                    onClick={() => setOpenVerifyModal(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl cursor-pointer hover:bg-red-50 transition"
                  >
                    Cancel
                  </div>

                  <button
                    disabled={!scannedBarcode || !capturedPhoto}
                    onClick={handleVerifySubmit}
                    className={`px-4 py-2 rounded-xl cursor-pointer text-white flex items-center gap-3 ${
                      verifyAction === "verify"
                        ? "bg-gradient-to-r from-blue-600 to-cyan-600"
                        : verifyAction === "approve"
                          ? "bg-gradient-to-r from-green-600 to-emerald-600"
                          : "bg-gradient-to-r from-red-600 to-pink-600"
                    }`}
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </CustomModal>
          )}
        </AnimatePresence>

        {/* CashOut Verify Modal */}
        <AnimatePresence>
          {openVerifyModal && selectedCashOut && (
            <CustomModal isCloseModal={() => setOpenVerifyModal(false)}>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                //   className="max-w-2xl w-full p-10 bg-white rounded-3xl shadow-2xl"
              >
                <h2 className="text-xl font-bold text-center mb-8 text-gray-800">{verifyAction.charAt(0).toUpperCase() + verifyAction.slice(1)} Cash out</h2>

                <div className="space-y-2 mb-8">
                  <p className="text-sm">
                    <span className="">Bags:</span>{" "}
                    <span className="font-mono font-medium text-cyan-600 text-md">
                      {selectedCashOut?.cash_out_bags
                        ?.map((bag) => bag?.bag && `${bag.bag.barcode ?? ""}-RN#${bag.bag.rack_number ?? ""}`)
                        ?.filter(Boolean)
                        ?.join(", ") ?? ""}
                    </span>
                  </p>
                  <p className="text-sm  text-gray-800">
                    Amount: <span className="text-green-600 font-medium text-xl">৳{parseFloat(selectedCashOut?.cash_out_amount).toLocaleString()}</span>
                  </p>
                  <p className="text-sm">
                    Current Status: <span className="capitalize font-medium text-green-600 ">{selectedCashOut?.verifier_status}</span>
                  </p>
                </div>

                <div className="mb-8">
                  <label className="block text-lg font-medium text-gray-700 mb-3">Note (Optional)</label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Add a note about your decision..."
                    className="w-full px-6 py-4 border-2 border-gray-200 rounded-xl focus:border-cyan-500 outline-none resize-none"
                    rows="4"
                  />
                </div>

                <div className="flex gap-6 justify-center">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setOpenVerifyModal(false)}
                    className="px-10 py-4 border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition"
                  >
                    Cancel
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleVerifyCashOutSubmit}
                    className={`px-12 py-4 rounded-xl font-bold text-white shadow-lg flex items-center gap-3 ${
                      verifyAction === "verify"
                        ? "bg-gradient-to-r from-blue-600 to-cyan-600"
                        : verifyAction === "approve"
                          ? "bg-gradient-to-r from-green-600 to-emerald-600"
                          : "bg-gradient-to-r from-red-600 to-pink-600"
                    }`}
                  >
                    {verifyAction === "verify" && <Check className="w-6 h-6" />}
                    {verifyAction === "approve" && <CheckCircle className="w-6 h-6" />}
                    {verifyAction === "reject" && <XCircle className="w-6 h-6" />}
                    Confirm
                  </motion.button>
                </div>
              </motion.div>
            </CustomModal>
          )}
        </AnimatePresence>

        {/* cash out approve Modal */}
        <AnimatePresence>
          {openCashoutApproveModal && selectedCashOut && (
            <CustomModal isCloseModal={() => setOpenCashoutApproveModal(false)}>
              <div className="max-h-[82vh] overflow-y-auto overscroll-contain -webkit-overflow-scrolling-touch px-2 sm:px-0">
                <div className="min-h-fit flex flex-col">
                  {" "}
                  {/* helps layout stability */}
                  <h2 className="text-xl font-bold text-center mb-6 sm:mb-8 text-gray-800 mt-2">
                    {verifyAction.charAt(0).toUpperCase() + verifyAction.slice(1)} Cash Out
                  </h2>
                  <div className="space-y-3 mb-8 text-sm">
                    <p>
                      <span className="font-semibold">Bag Barcode:</span>{" "}
                      <span className="font-mono font-medium text-cyan-600">
                        {selectedCashOut?.cash_out_bags?.map((bag) => `${bag.bag.barcode}-RN#${bag.bag.rack_number}`).join(", ")}
                      </span>
                    </p>
                    <p className="text-gray-800">
                      Amount:{" "}
                      <span className="text-green-600 font-medium text-lg">৳{parseFloat(selectedCashOut?.cash_out_amount || "0").toLocaleString()}</span>
                    </p>
                    <p>
                      Current Status: <span className="capitalize font-medium text-green-600">{selectedCashOut?.verifier_status}</span>
                    </p>
                  </div>
                  {/* Scan Bag section */}
                  <div className="mb-8">
                    <label className="block text-lg font-medium text-gray-700 mb-3">Scan Bag</label>
                    {scannedBarcode ? (
                      <div className="p-4 bg-green-50 border border-green-300 rounded-lg text-center">
                        <p className="font-mono text-xl text-green-700 break-all">{scannedBarcode}</p>
                        <button onClick={() => setScannedBarcode("")} className="text-sm text-red-600 mt-2 underline">
                          Clear
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setIsScannerOpen(true)}
                        className="w-full flex items-center justify-center gap-3 p-6 border-2 border-dashed border-cyan-400 rounded-xl hover:bg-cyan-50 active:bg-cyan-100 transition"
                      >
                        <QrCode className="w-10 h-10 text-cyan-600" />
                        <span className="text-cyan-600 font-medium">Tap to scan barcode</span>
                      </button>
                    )}
                  </div>
                  <BarcodeScannerModal
                    isOpen={isScannerOpen}
                    onClose={() => setIsScannerOpen(false)}
                    onScanned={(code) => {
                      setScannedBarcode(code);
                      setIsScannerOpen(false);
                    }}
                  />
                  {/* Photo section – keep compact */}
                  <div className="mb-8">
                    <label className="block text-lg font-medium text-gray-700 mb-3">Take Picture of Bag</label>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      {capturedPhoto ? (
                        <div className="relative">
                          <img src={capturedPhoto.url} alt="Bag preview" className="w-48 h-48 sm:w-64 sm:h-64 object-cover rounded-lg shadow-md" />
                          <button onClick={() => setCapturedPhoto(null)} className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 shadow">
                            <XCircle className="w-5 h-5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={handleTakePhoto}
                          className="flex items-center gap-3 px-5 py-4 border-2 border-dashed border-cyan-400 rounded-xl hover:bg-cyan-50 active:bg-cyan-100 transition"
                        >
                          <Camera className="w-7 h-7 text-cyan-600" />
                          <span className="text-cyan-600 font-medium">Tap to take photo</span>
                        </button>
                      )}

                      <input ref={photoInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoChange} />
                    </div>
                  </div>
                  {/* Note */}
                  <div className="mb-8">
                    <label className="block text-lg font-medium text-gray-700 mb-3">Note</label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Add a note about your decision..."
                      className="w-full px-5 py-4 border border-gray-200 rounded-xl focus:border-cyan-500 outline-none min-h-[110px] resize-none"
                      rows={4}
                    />
                  </div>
                  {/* Buttons – sticky-like feel with padding */}
                  <div className="flex gap-4 sm:gap-6 justify-end pt-4 pb-6 sm:pb-2 sticky bottom-0 bg-white z-10 -mx-2 sm:-mx-0 px-2 sm:px-0">
                    <button
                      type="button"
                      onClick={() => setOpenCashoutApproveModal(false)}
                      className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition"
                    >
                      Cancel
                    </button>

                    <button
                      disabled={!scannedBarcode || !capturedPhoto}
                      onClick={handleCashoutApproveSubmit}
                      className={`
                px-6 py-2.5 rounded-xl text-white font-medium flex items-center gap-2 transition
                disabled:opacity-50 disabled:cursor-not-allowed
                ${
                  verifyAction === "verify"
                    ? "bg-gradient-to-r from-blue-600 to-cyan-600"
                    : verifyAction === "approve"
                      ? "bg-gradient-to-r from-green-600 to-emerald-600"
                      : "bg-gradient-to-r from-red-600 to-pink-600"
                }
              `}
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              </div>
            </CustomModal>
          )}
        </AnimatePresence>

        {/* // Reconcile section */}
        {openReconcileVerifyModel && (
          <ReconcileVerifyModel
            selectedReconcile={selectedReconcile}
            setOpenReconcileVerifyModel={setOpenReconcileVerifyModel}
            handleReconcileVerifySubmit={handleReconcileVerifySubmit}
          />
        )}

        {openReconcileStartModel && (
          <ReconcileStart
            selectedReconcile={selectedReconcile}
            selectedCashIn={selectedCashIn}
            setOpenApproveModal={setOpenApproveModal}
            isCloseModal={() => setOpenReconcileStartModel(false)}
            refech={refech}
            // handleApproveSubmit={handleApproveSubmit}
          />
        )}

        {/* Otp modal */}
        <AnimatePresence>
          {OpenOtpModal && (
            <div className="fixed inset-0 text-gray-600 bg-black/70 flex items-center justify-center z-[60]">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                // onClick={() => setShowReconfirm(false)}
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
                  <div>
                    <p>Verify Otp</p>
                    <div>
                      <input
                        type="text"
                        placeholder="Enter Otp"
                        className={`w-full my-4 px-4 py-2 bg-bgDark border ${
                          otpError ? "border-red-600" : "border-gray-200"
                        } rounded-md text-textDark focus:outline-none`}
                        value={otp}
                        onChange={(e) => {
                          setOtp(e.target.value);
                          setOtpError("");
                        }}
                      />
                      <p>{otpError && <span className="text-red-600">{otpError}</span>}</p>
                    </div>
                  </div>

                  <div className="flex gap-4 mt-4 justify-center">
                    <button
                      onClick={() => setOpenOtpModal(false)}
                      className="px-8 py-3 text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-100 transition font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={
                        otpModalSubmitAction === "cashin"
                          ? handleFinalVerifyConfirm
                          : otpModalSubmitAction === "reconcile"
                            ? hanleReconcileConfirmVerify
                            : handleCashOutVerifySubmit
                      }
                      className="px-10 py-3 cursor-pointer bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-green-500/30 transition"
                    >
                      Verify
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Verifications;
