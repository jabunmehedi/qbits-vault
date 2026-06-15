import { useSearchParams } from "react-router-dom";
import DataTable from "../../components/global/dataTable/DataTable";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { GetReconciles, VerifyReconcile } from "../../services/Reconcile";
import VerifierAvatars from "../../components/global/verifierAvatars.jsx/VerifierAvatars";
import { ChevronRight, Plus } from "lucide-react";
import VaultBagsDrawer from "../../components/reconcile/VaultBagsDrawer";
import { useSelector } from "react-redux";
import ReconcileViewDrawer from "../../components/reconcile/ReconcileViewDrawer";
import VerifyButton from "../../components/verifyButton/VerifyButton";
import { useToast } from "../../hooks/useToast";
import ReconclieDetails from "../../components/reconcile/ReconclieDetails";
import { selectAuthUser, selectIsSuperAdmin } from "../../store/authSlice";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import customParseFormat from "dayjs/plugin/customParseFormat";
import ReconcileModal from "../../components/reconcile/ReconcileModal";
import { usePermissions } from "../../hooks/usePermissions";

dayjs.extend(customParseFormat);
dayjs.extend(utc);

const Reconcile = () => {
  const [reconcileData, setReconcileData] = useState([]);
  const [openReconcileModel, setOpenReconcileModel] = useState();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedReconcile, setSelectedReconcile] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loadingBags, setLoadingBags] = useState(false);
  const [expandedBag, setExpandedBag] = useState(null);
  const [openReconcileViewDrawer, setOpenReconcileViewDrawer] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(null);
  const [activeVerifyId, setActiveVerifyId] = useState(null);
  const [editReconcileId, setEditReconcileId] = useState(null);
  const [varianceNotesModal, setVarianceNotesModal] = useState(null);
  const [paginationData, setPaginationData] = useState({});
  const currentPage = parseInt(searchParams.get("page") || "1");
  const step = parseInt(searchParams.get("step") || "0");
  const { addToast } = useToast();

  const isSuperAdmin = useSelector(selectIsSuperAdmin);
  const user = useSelector(selectAuthUser);
  const { hasPermission } = usePermissions();

  const fetchReconcileData = () => {
    GetReconciles({ page: currentPage }).then((res) => {
      const { data: items, ...pagination } = res?.data ?? {};
      setReconcileData(items ?? []);
      setPaginationData(pagination);
    });
  };

  useEffect(() => {
    fetchReconcileData();
  }, [currentPage]);

  const openVaultDrawer = async (vault) => {
    setSelectedReconcile(vault);
    setDrawerOpen(true);
    setLoadingBags(true);
    setExpandedBag(null);

    if (vault.variance_bags && vault.variance_bags.length > 0) {
      setLoadingBags(false);
      return;
    }
    setLoadingBags(false);
  };

  const refetch = () => {
    fetchReconcileData();
  };

  const handleVerifyClick = async (id) => {
    setVerifyLoading(id);
    try {
      const res = await VerifyReconcile(id);

      if (!res?.success) {
        addToast({ message: res?.message, type: "error" });
        return;
      }

      fetchReconcileData();
      addToast({ message: "Reconcile verified successfully", type: "success" });
    } catch (err) {
      console.error("Failed to verify Reconcile:", err);
    } finally {
      setVerifyLoading(null);
    }
  };

  const handleOpenCreateModal = () => {
    setEditReconcileId(null);
    setOpenReconcileModel(true);
  };

  const handleOpenRescheduleModal = (id) => {
    setEditReconcileId(id);
    setOpenReconcileModel(true);
  };

  const handlePageChange = (page) => {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set("page", page.toString());
      return p;
    });
  };

  const columns = [
    {
      title: "Vault",
      key: "vault_id",
      className: "w-[7%]",
      render: (row) => <span className="font-mono">{row.vault?.name}</span>,
    },
    {
      title: "Reconcile Id",
      key: "reconcile_tran_id",
      className: "w-[14%]",
      render: (row) => <span className="block truncate font-mono text-indigo-400">{row.reconcile_tran_id}</span>,
    },
    {
      title: "Expected",
      key: "expected_balance",
      className: "w-[8%]",
      render: (row) => <span className="">{row?.expected_balance}</span>,
    },
    {
      title: "Counted",
      key: "counted_balance",
      className: "w-[7%]",
      render: (row) => <span className="">{row?.counted_balance}</span>,
    },
    {
      title: "Variance",
      key: "variance",
      className: "w-[7%]",
      render: (row) => {
        const bagsWithNotes = (row?.variance_bags || []).filter((b) => b?.pivot?.note);
        const hasNotes = bagsWithNotes.length > 0;
        return (
          <span
            onClick={hasNotes ? () => setVarianceNotesModal({ bags: bagsWithNotes, reconcileTranId: row.reconcile_tran_id }) : undefined}
            className={`${row?.variance < 0 ? "text-red-500" : "text-green-500"} ${hasNotes ? "underline decoration-dotted cursor-pointer" : ""}`}
          >
            {row?.variance}
          </span>
        );
      },
    },
    {
      title: "Bags",
      key: "total_bags",
      className: "w-[8%]",
      render: (row) => {
        return (
          <>
            <p>
              Total <span className="font-bold">{row?.total_bags || "-"}</span>
            </p>
            <p>
              Counted <span className="font-bold">{row?.finished_bag_count || "-"}</span>
            </p>
          </>
        );
      },
    },
    {
      title: "Audit Date",
      key: "from_date",
      className: "w-[10%]",
      render: (row) => {
        const timeStr = row?.audit_time;
        const formattedTime = timeStr ? dayjs(timeStr, "HH:mm:ss").format("hh:mm A") : "N/A";
        return (
          <div className="flex flex-col">
            <span>{dayjs.utc(row.from_date).format("DD MMM, YYYY")}</span>
            <span className="text-gray-400 text-xs">{formattedTime}</span>
          </div>
        );
      },
    },
    {
      title: "Audit End",
      key: "expected_completion_at",
      className: "w-[10%]",
      render: (row) => {
        if (!row?.expected_completion_at) return <span className="text-gray-300 text-xs">—</span>;
        return (
          <div className="flex flex-col">
            <span>{dayjs.utc(row.expected_completion_at).format("DD MMM, YYYY")}</span>
            <span className="text-gray-400 text-xs">{dayjs.utc(row.expected_completion_at).format("hh:mm A")}</span>
          </div>
        );
      },
    },
    {
      title: "Reconciler",
      key: "created_at",
      className: "w-[14%] text-center",
      render: (row) => {
        const isVerifierShowButton = row?.required_verifiers?.some((verifier) => verifier?.user_id === user?.id && !verifier?.verified);
        const isAuditCountingDone = row?.started_by && row?.status === "counted";
        const isRejected = row?.verifier_status === "rejected";
        return (
          <div className="flex items-center gap-2 flex-wrap">
            <VerifierAvatars requiredVerifiers={row.required_verifiers || []} isRejected={isRejected} />
            {isVerifierShowButton && isAuditCountingDone && !isRejected && (
              <VerifyButton
                handleSubmit={() => handleVerifyClick(row.id)}
                isOpen={activeVerifyId === row.id}
                isLoading={verifyLoading}
                setOpen={(isOpen) => setActiveVerifyId(isOpen ? row.id : null)}
                className="max-w-xl"
              >
                <ReconclieDetails reconcile={row} />
              </VerifyButton>
            )}
            <span
              className={`capitalize text-xs px-2 py-0.5 rounded-full border ${
                row?.verifier_status === "pending"
                  ? "bg-yellow-50 border-yellow-200 text-yellow-600"
                  : row?.verifier_status === "rejected"
                    ? "bg-red-50 border-red-200 text-red-500"
                    : "bg-green-50 border-green-200 text-green-500"
              }`}
            >
              {row?.verifier_status}
            </span>
          </div>
        );
      },
    },
    {
      title: "Status",
      key: "status",
      className: "w-[9%]",
      render: (row) => (
        <span
          className={`capitalize text-xs ${
            row?.status === "pending"
              ? "bg-yellow-50 border border-yellow-200 text-yellow-600"
              : row?.status === "completed"
                ? "bg-green-50 border border-green-200 text-green-500"
                : row?.status === "counted"
                  ? "bg-indigo-50 border border-indigo-200 text-indigo-500"
                  : row?.status === "expired"
                    ? "bg-red-50 border border-red-200 text-red-500"
                    : "bg-orange-50 border border-orange-200 text-orange-500"
          } px-2.5 py-1 rounded-full`}
        >
          {row?.status}
        </span>
      ),
    },
    {
      title: "Action",
      key: "actions",
      className: "w-[9%]",
      render: (row) => {
        // ─── Calculate Leftover Time Window ─────────────────
        const cleanDateStr = row?.from_date ? row.from_date.split("T")[0] : null;
        const cleanTimeStr = row?.audit_time || "00:00:00";

        let showReschedule = false;

        if (row?.status === "pending" && cleanDateStr) {
          // Combine Date and Time into a single comprehensive target timestamp
          const targetSchedule = dayjs(`${cleanDateStr} ${cleanTimeStr}`, "YYYY-MM-DD HH:mm:ss");
          const now = dayjs();

          // Calculate the exact hours remaining between right now and the audit schedule target
          const hoursRemaining = targetSchedule.diff(now, "hour", true);

          // Show only if the schedule is still ahead in the future AND there are more than 6 hours left
          if (hoursRemaining >= 6) {
            showReschedule = true;
          }
        }

        return (
          <div className="flex gap-2 py-2">
            {/* View Button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setSelectedReconcile(row);
                setOpenReconcileViewDrawer(true);
              }}
              className="p-2 rounded-lg cursor-pointer text-blue-600 transition-all"
            >
              <span>View</span>
            </motion.button>

            {/* Conditional Reschedule Button */}
            {showReschedule && (isSuperAdmin || hasPermission("reconciliation.reschedule")) && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleOpenRescheduleModal(row.id)}
                className="p-2 rounded-lg cursor-pointer text-orange-600 transition-all"
              >
                <span>Reschedule</span>
              </motion.button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-10 bg-[#1a2b4b] rounded-full" />
          <div>
            <h1 className="xl:text-2xl font-black text-[#1a2b4b] uppercase">Reconcile List</h1>
            <p className="text-[8px] xl:text-[10px] font-bold text-gray-400 tracking-[0.2em] uppercase">Reconciliation Management</p>
          </div>
        </div>
        {hasPermission("reconciliation.create") && (
          <div className="flex items-center gap-4">
            <button onClick={handleOpenCreateModal} className="flex items-center gap-2 px-6 py-2.5 bg-[#1a73e8] text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-200 hover:bg-blue-600 transition-all">
              <Plus className="w-5 h-5" /> Request Reconcile
            </button>
          </div>
        )}
      </div>
      {step === 0 && (
        <DataTable columns={columns} data={reconcileData} paginationData={paginationData} changePage={handlePageChange} className="h-[calc(100vh-120px)]" />
      )}

      {drawerOpen && <VaultBagsDrawer selectedReconcile={selectedReconcile} setDrawerOpen={setDrawerOpen} />}

      {varianceNotesModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 mx-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-800">Variance Notes</h3>
                <p className="text-xs text-gray-400 mt-0.5">{varianceNotesModal.reconcileTranId}</p>
              </div>
              <button onClick={() => setVarianceNotesModal(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer text-lg leading-none">✕</button>
            </div>
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {varianceNotesModal.bags.map((bag) => (
                <div key={bag.id} className="bg-gray-50 border border-gray-100 rounded-lg p-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
                    <span className="font-mono">{bag.barcode} · RN-{bag.rack_number}</span>
                    <span className="text-red-500">Diff: {bag.pivot.difference}</span>
                  </div>
                  <p className="text-sm text-gray-700">{bag.pivot.note}</p>
                </div>
              ))}
            </div>
            <button onClick={() => setVarianceNotesModal(null)} className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold text-sm rounded-lg transition-colors cursor-pointer">
              Close
            </button>
          </div>
        </div>
      )}

      {openReconcileModel && <ReconcileModal reconcileId={editReconcileId} isClose={() => setOpenReconcileModel(false)} refetch={refetch} />}
      {openReconcileViewDrawer && (
        <ReconcileViewDrawer
          reconcileId={selectedReconcile?.id}
          reconcileTranId={selectedReconcile?.reconcile_tran_id}
          isOpen={openReconcileViewDrawer}
          onClose={() => setOpenReconcileViewDrawer(false)}
          refetch={refetch}
        />
      )}
    </>
  );
};

export default Reconcile;
