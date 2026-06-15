import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import DataTable from "../../components/global/dataTable/DataTable";
import { AnimatePresence, motion } from "framer-motion";
import VerifierAvatars from "../../components/global/verifierAvatars.jsx/VerifierAvatars";
import dayjs from "dayjs";
import { GetVaults } from "../../services/Vault";
import CashOutConfirmationModal from "../../components/cashout/CashOutConfirmationModal";
import { ApproveCashOut, CustodianVerifyCashReceived, DeleteCashOut, GetCashOut, GetCashOuts, VerifyCashOut } from "../../services/Cash";
import { useSelector } from "react-redux";
import { usePermissions } from "../../hooks/usePermissions";
import { selectAuthUser, selectIsSuperAdmin } from "../../store/authSlice";
import CashOutRequestDrawer from "../../components/cashout/CashOutRequestDrawer";
import VerifyButton from "../../components/verifyButton/VerifyButton";
import { useToast } from "../../hooks/useToast";
import CashOutDetails from "../../components/cashout/CashOutDetails";
import CashOutCustodianModal from "../../components/cashout/CashOutCustodianModal";
import { HiDotsHorizontal } from "react-icons/hi";
import BagDetailsDrawer from "../../components/cashout/bagDetailsDrawer.jsx/BagDetailsDrawer";
import CustodianAvatar from "../../components/cashout/CustodianAvatar";

const ExpandableBagIds = ({ bags, isExpanded, onToggle, onIdClick }) => {
  if (!bags || bags.length === 0) return <span className="text-gray-400">—</span>;

  const previewbags = bags.cash_out_bags.slice(0, 2);
  const extrabags = bags.cash_out_bags.slice(2);
  const hasMore = extrabags.length > 0;

  return (
    <div className="flex flex-col w-full max-w-[200px]">
      <div className="flex flex-wrap gap-x-1 items-center">
        {previewbags?.map((bag, i) => (
          <span
            onClick={() => onIdClick(bag)}
            key={bag.id || `preview-${i}`}
            className="whitespace-nowrap font-semibold bg-white rounded-md px-2 py-1 border border-gray-200 hover:bg-indigo-50 cursor-pointer"
          >
            {bag?.bag?.barcode} - RN#{bag?.bag?.rack_number}
            {i === previewbags.length - 1 && !hasMore ? "" : ","}
          </span>
        ))}
        {hasMore && !isExpanded && (
          <button
            type="button"
            onClick={onToggle}
            className="text-blue-500 bg-slate-200 py-1 cursor-pointer rounded-sm hover:text-blue-700 text-[11px] font-bold px-1 transition-all active:scale-95"
          >
            <HiDotsHorizontal className="text-slate-500" />
          </button>
        )}
      </div>

      <motion.div
        initial={false}
        animate={{
          height: isExpanded ? "auto" : "0px",
          opacity: isExpanded ? 1 : 0,
        }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="overflow-hidden"
      >
        <div className="flex flex-wrap gap-x-1 pt-1">
          {extrabags.map((bag, i) => (
            <span
              key={bag.id || `extra-${i}`}
              onClick={() => onIdClick(bag)}
              className="whitespace-nowrap font-semibold bg-white rounded-md px-2 py-1 border border-gray-200 hover:bg-indigo-50 cursor-pointer"
            >
              {bag?.bag?.barcode} - RN
              {i === extrabags.length - 1 ? "" : ","}
            </span>
          ))}
          <button
            type="button"
            onClick={onToggle}
            className="text-[10px] text-blue-400 underline hover:text-red-600 font-medium flex items-center gap-1 w-full mt-1 transition-colors"
          >
            less
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const CashOut = () => {
  const [vaults, setVaults] = useState([]);
  const [selectedVaultId, setSelectedVaultId] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);
  const [cashOuts, setCashOuts] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedBags, setSelectedBags] = useState([]);
  const [editCashOutData, setEditCashOutData] = useState(null);
  const [openCashOutReqDrawer, setOpenCashOutReqDrawer] = useState(false);
  const [selectedBagsTotalAmount, setSelectedBagsTotalAmount] = useState(0);
  const [verifyLoading, setVerifyLoading] = useState(null);
  const [activeCustodianId, setActiveCustodianId] = useState(null);
  const [activeVerifyId, setActiveVerifyId] = useState(null);
  const [activeApproveId, setActiveApproveId] = useState(null);
  const [activeActionMenuId, setActiveActionMenuId] = useState(null);
  const [openBagDetailsDrawer, setOpenBagDetailsDrawer] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const { hasPermission } = usePermissions();
  const user = useSelector(selectAuthUser);
  const isSuperAdmin = useSelector(selectIsSuperAdmin);

  const { addToast } = useToast();

  const toggleRow = (rowId, e) => {
    e.stopPropagation();
    setExpandedRows((prev) => ({ ...prev, [rowId]: !prev[rowId] }));
  };

  useEffect(() => {
    // Fetch vaults
    GetVaults().then((res) => setVaults(res.data?.data || []));
  }, []);

  const fetchCashOutLits = async () => {
    const res = await GetCashOuts();
    setCashOuts(res?.data?.data || []);
  };

  useEffect(() => {
    fetchCashOutLits();
  }, []);

  const refetch = () => {
    fetchCashOutLits();
  };

  const cashOutPagination = {
    current_page: 1,
    per_page: cashOuts.length || 1,
    total: cashOuts.length || 0,
    prev_page_url: null,
    next_page_url: null,
    last_page: 1,
  };

  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveActionMenuId(null);
      setDeleteConfirmId(null);
    };
    if (activeActionMenuId !== null) {
      window.addEventListener("click", handleOutsideClick);
    }
    return () => {
      window.removeEventListener("click", handleOutsideClick);
    };
  }, [activeActionMenuId]);

  const handleVerify = async (id) => {
    setVerifyLoading(id);
    try {
      const res = await VerifyCashOut(id);

       if (!res?.success) {
        addToast({ message: res?.message, type: "error" });
        return;
      }
      

      fetchCashOutLits();
      addToast({ message: "Cashout verified successfully", type: "success" });
    } catch (err) {
      console.error("Failed to verify cash-in:", err);
    } finally {
      setVerifyLoading(null);
    }
  };
  const handleApprove = async (id) => {
    setVerifyLoading(id);
    try {
      const res = await ApproveCashOut(id);

      if (res?.success === true || res?.verifier_status == "verified") {
        fetchCashOutLits();
        addToast({ message: "Cashout approved successfully", type: "success" });
      } else {
        addToast({ message: res?.message, type: "error" });
      }
    } catch (err) {
      console.error("Failed to verify cash-in:", err);
    } finally {
      setVerifyLoading(null);
    }
  };
  const handleCustodianVerify = async (id) => {
    setVerifyLoading(id);
    try {
      const res = await CustodianVerifyCashReceived(id);

      if (res?.success === true) {
        fetchCashOutLits();
        addToast({ message: "Custodian verified successfully", type: "success" });
      }
    } catch (err) {
      console.error("Failed to verify cash-in:", err);
      addToast({ message: "Failed to verify", type: "error" });
    } finally {
      setVerifyLoading(null);
    }
  };

  const handleDeleteSubmit = async (id) => {
    try {
      const res = await DeleteCashOut(id);

      if (res?.success === false) {
        addToast({ message: res?.message, type: "error" });
        return;
      }

      fetchCashOutLits();
      addToast({ message: "Cashout data deleted successfully", type: "success" });
    } catch (err) {
      console.error("Failed to delete cashout item:", err);
      addToast({ message: "Failed to delete item", type: "error" });
    } finally {
      setDeleteConfirmId(null);
      setActiveActionMenuId(null);
    }
  };

  const handleOpenDetails = (bag) => {
    setSelectedBags(bag);
    setOpenBagDetailsDrawer(true);
  };

  const columnsCashOutLists = [
    {
      title: "Vault name",
      key: "name",
      className: "w-[7%]",
      render: (row) => <span className="text-[#1a73e8] font-semibold">{row?.vault?.name}</span>,
    },
    {
      title: "Tran ID",
      key: "tran_id",
      className: "w-[14%]",
      render: (row) => <span className="block truncate font-mono text-gray-400">{row?.tran_id}</span>,
    },
    {
      title: "Bags ID",
      key: "customer.name",
      className: "w-[22%]",
      render: (row) => (
        <ExpandableBagIds bags={row} onIdClick={(bag) => handleOpenDetails(bag)} isExpanded={!!expandedRows[row.id]} onToggle={(e) => toggleRow(row.id, e)} />
      ),
    },
    {
      title: "req Amount",
      key: "current_amount",
      className: "w-[7%]",
      render: (row) => <span className="">{row?.request_amount}</span>,
    },
    {
      title: "bag Amount",
      key: "current_amount",
      className: "w-[7%]",
      render: (row) => <span className="">{row?.cash_out_amount}</span>,
    },

    {
      title: "Req at",
      key: "created_at",
      className: "w-[8%]",
      render: (row) => <span className="whitespace-nowrap">{dayjs(row.created_at).format("DD MMM, YYYY")}</span>,
    },
    {
      title: "Verifications",
      key: "required_verifiers",
      className: "w-[11%] text-center",
      render: (row) => {
        const isVerifierShowButton = row?.required_verifiers?.some((verifier) => verifier?.user_id === user?.id && !verifier?.verified);
        const isRejected = row?.verifier_status === "rejected" || row?.approver_status === "rejected";
        return (
          <div className="flex items-center gap-2">
            <VerifierAvatars requiredVerifiers={row.required_verifiers || []} isRejected={isRejected} />
            {isVerifierShowButton && !isRejected && (
              <VerifyButton
                handleSubmit={() => handleVerify(row.id)}
                isOpen={activeVerifyId === row.id}
                isLoading={verifyLoading}
                setOpen={(isOpen) => setActiveVerifyId(isOpen ? row.id : null)}
                className="max-w-xl"
                title="Verify"
              >
                <CashOutDetails cashOut={row} />
              </VerifyButton>
            )}
          </div>
        );
      },
    },
    {
      title: "Custodian",
      key: "current_amount",
      className: "w-[9%] text-center",
      render: (row) => {
        const isVerifierShowButton = row?.custodian?.custodian_id === user?.id && row?.custodian?.status === "pending";
        const isVerified = row?.verifier_status === "verified";
        return (
          <>
            {row?.custodian ? (
              <div className="flex items-center gap-2">
                <CustodianAvatar custodian={row?.custodian || []} />
                {isVerifierShowButton && isVerified && (
                  <VerifyButton
                    handleSubmit={() => handleCustodianVerify(row.id)}
                    isOpen={activeCustodianId === row.id}
                    isLoading={verifyLoading}
                    setOpen={(isOpen) => setActiveCustodianId(isOpen ? row.id : null)}
                    className="max-w-xl"
                    title="Receive"
                  >
                    <CashOutCustodianModal cashOut={row} />
                  </VerifyButton>
                )}
              </div>
            ) : (
              <span className="text-gray-300 text-xs">—</span>
            )}
          </>
        );
      },
    },
    {
      title: "Approvals",
      key: "required_verifiers",
      className: "w-[11%] text-center",
      render: (row) => {
        const isApproverShowButton = row?.required_approvers?.some((approver) => approver?.user_id === user?.id && !approver?.approved);
        const isVerified = row?.verifier_status === "verified";

        const isCustodianConditionMet = !row?.custodian || row?.custodian?.status === "verified";

        return (
          <div className="flex items-center gap-2">
            <VerifierAvatars requiredVerifiers={row.required_approvers || []} isRejected={row?.approver_status === "rejected"} />
            {isApproverShowButton && isVerified && isCustodianConditionMet && (
              <VerifyButton
                handleSubmit={() => handleApprove(row.id)}
                isOpen={activeApproveId === row.id}
                isLoading={verifyLoading}
                setOpen={(isOpen) => setActiveApproveId(isOpen ? row.id : null)}
                className="max-w-xl"
                title="Approve"
              >
                <CashOutDetails cashOut={row} />
              </VerifyButton>
            )}
          </div>
        );
      },
    },
    {
      title: "Action",
      key: "actions",
      noClip: true,
      className: "w-[4%] relative",
      render: (row) => {
        const isMenuOpen = activeActionMenuId === row.id;
        const isConfirmingDelete = deleteConfirmId === row.id;

        const toggleMenu = (e) => {
          e.stopPropagation();
          setActiveActionMenuId(isMenuOpen ? null : row.id);
          setDeleteConfirmId(null);
        };

        const handleEdit = async (e) => {
          e.stopPropagation();
          setActiveActionMenuId(null);

          try {
            // 1. Call the API to get up-to-date details for this specific cashout
            const res = await GetCashOut(row.id);

            // if (res?.success || res?.data) {
            // 2. Extract the data object based on your API structure (e.g., res.data or res.data.data)
            const freshCashOutData = res.data?.data || res.data || res;

            // 3. Set the specific data into your edit state
            setEditCashOutData(freshCashOutData);

            // 4. Open the Cash Out Request Drawer
            setOpenCashOutReqDrawer(true);
            // } else {
            //   addToast({ message: res?.message || "Failed to fetch cashout details.", type: "error" });
            // }
          } catch (err) {
            console.error("Error fetching specific cashout item details:", err);
            addToast({ message: "An error occurred while fetching details.", type: "error" });
          }
        };

        const handleDeleteClick = (e) => {
          e.stopPropagation(); // Stop parent triggers
          setDeleteConfirmId(row.id); // Shift dropdown view into inline verification mode
        };

        const handleCancelDelete = (e) => {
          e.stopPropagation();
          setDeleteConfirmId(null);
        };

        return (
          <div className="relative inline-block text-left">
            <button
              onClick={toggleMenu}
              className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 focus:outline-none transition-colors duration-200 cursor-pointer"
              aria-label="Actions"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 12c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
              </svg>
            </button>

            {isMenuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                transition={{ duration: 0.15 }}
                className={`absolute right-0 mt-1 ${row?.verifier_status === "verified" ? "hidden" : ""} bg-white border border-gray-200 divide-y divide-gray-100 rounded-lg shadow-xl z-50 overflow-hidden transition-all ${
                  isConfirmingDelete ? "w-44" : "w-28"
                }`}
              >
                <AnimatePresence mode="wait">
                  {!isConfirmingDelete ? (
                    <motion.div key="options" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      {/* Edit Option */}
                      {(isSuperAdmin || hasPermission("cash-out.edit")) && (
                        <button
                          onClick={handleEdit}
                          className="flex items-center w-full px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors gap-2 font-medium cursor-pointer"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                          Edit
                        </button>
                      )}

                      {/* Delete Option Trigger */}
                      {(isSuperAdmin || hasPermission("cash-out.delete")) && (
                        <button
                          onClick={handleDeleteClick}
                          className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors gap-2 font-medium cursor-pointer"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                          Delete
                        </button>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="confirm"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="py-4 text-center"
                    >
                      <p className="text-xs text-gray-500 font-medium mb-2">Are you sure you want to delete?</p>
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={handleCancelDelete}
                          className="px-2 py-1 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-600 rounded transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSubmit(row.id);
                          }}
                          className="px-2 py-1 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded transition-colors cursor-pointer"
                        >
                          Confirm
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-10 bg-[#1a2b4b] rounded-full" />
          <div>
            <h1 className="xl:text-2xl font-black text-[#1a2b4b] uppercase">Cash Out List</h1>
            <p className="text-[8px] xl:text-[10px] font-bold text-gray-400 tracking-[0.2em] uppercase">Cash Out Management</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {(isSuperAdmin || hasPermission("cash-out.create")) && (
            <button
              onClick={() => {
                setEditCashOutData(null);
                setOpenCashOutReqDrawer(true);
              }}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#1a73e8] text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-200 hover:bg-blue-600 transition-all"
            >
              <Plus className="w-5 h-5" /> Cash Out Request
            </button>
          )}
        </div>
      </div>

      <DataTable columns={columnsCashOutLists} data={cashOuts} paginationData={cashOutPagination} changePage={() => {}} className="h-[calc(100vh-100px)]" />

      {openCashOutReqDrawer && (
        <CashOutRequestDrawer isOpen={openCashOutReqDrawer} onClose={() => setOpenCashOutReqDrawer(false)} refetch={refetch} editData={editCashOutData} />
      )}

      {openBagDetailsDrawer && <BagDetailsDrawer bag={selectedBags} isOpen={openBagDetailsDrawer} onClose={() => setOpenBagDetailsDrawer(false)} />}

      <CashOutConfirmationModal
        showConfirmModal={showConfirmModal}
        setShowConfirmModal={setShowConfirmModal}
        // totalEnteredAmount={totalEnteredAmount}
        // denominations={denominations}
        selectedRows={selectedRows}
        selectedVaultId={selectedVaultId}
        amounts={selectedBagsTotalAmount}
        refetch={refetch}
      />
    </div>
  );
};

export default CashOut;
