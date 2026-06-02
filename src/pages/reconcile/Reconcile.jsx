import { useSearchParams } from "react-router-dom";
import DataTable from "../../components/global/dataTable/DataTable";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { GetReconciles, VerifyReconcile } from "../../services/Reconcile";
import VerifierAvatars from "../../components/global/verifierAvatars.jsx/VerifierAvatars";
import { ChevronRight } from "lucide-react";
import VaultBagsDrawer from "../../components/reconcile/VaultBagsDrawer";
import { useSelector } from "react-redux";
import ReconcileViewDrawer from "../../components/reconcile/ReconcileViewDrawer";
import VerifyButton from "../../components/verifyButton/VerifyButton";
import { useToast } from "../../hooks/useToast";
import ReconclieDetails from "../../components/reconcile/ReconclieDetails";
import { selectAuthUser } from "../../store/authSlice";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import customParseFormat from "dayjs/plugin/customParseFormat";
import ReconcileModal from "../../components/reconcile/ReconcileModal";

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
  const [paginationData, setPaginationData] = useState({});
  const currentPage = parseInt(searchParams.get("page") || "1");
  const step = parseInt(searchParams.get("step") || "0");
  const { addToast } = useToast();

  const user = useSelector(selectAuthUser);

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
      await VerifyReconcile(id);
      fetchReconcileData();
      addToast({ message: "Cash-in verified successfully", type: "success" });
    } catch (err) {
      console.error("Failed to verify cash-in:", err);
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
      className: "w-14",
      render: (row) => <span className="font-mono">{row.vault?.name}</span>,
    },
    {
      title: "Reconcile Id",
      key: "reconcile_tran_id",
      className: "w-40",
      render: (row) => <span className="font-mono text-indigo-400">{row.reconcile_tran_id}</span>,
    },
    {
      title: "Expected",
      key: "expected_balance",
      className: "w-18",
      render: (row) => <span className="">{row?.expected_balance}</span>,
    },
    {
      title: "Counted",
      key: "counted_balance",
      className: "w-14",
      render: (row) => <span className="">{row?.counted_balance}</span>,
    },
    {
      title: "Variance",
      key: "variance",
      className: "w-18",
      render: (row) => <span className={`${row?.variance < 0 ? "text-red-500" : "text-green-500"}`}>{row?.variance}</span>,
    },
    {
      title: "Bags",
      key: "total_bags",
      className: "w-26",
      render: (row) => {
        const bagCount = row.variance_bags?.filter((bag) => bag?.pivot?.difference < 0).length;
        return (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => openVaultDrawer(row)}
            className={`px-3 py-2 ${bagCount > 0 ? "bg-red-50 border border-red-200 text-red-400" : ""} bg-cyan-50 border border-cyan-200 cursor-pointer text-cyan-500 text-xs rounded-full flex items-center gap-2`}
          >
            <span>
              {bagCount} Bag{bagCount !== 1 ? "s" : ""}
            </span>
            <ChevronRight className="w-4 h-4" />
          </motion.button>
        );
      },
    },
    {
      title: "Audit Date",
      key: "from_date",
      className: "w-34",
      render: (row) => <span className="">{dayjs.utc(row.from_date).format("DD MMM, YYYY")}</span>,
    },
    {
      title: "Audit Time",
      key: "audit_time",
      className: "w-34",
      render: (row) => {
        const timeStr = row?.audit_time;
        const formattedTime = timeStr ? dayjs(timeStr, "HH:mm:ss").format("hh:mm A") : "N/A";
        return <span className="text-gray-600 font-medium capitalize">{formattedTime}</span>;
      },
    },
    {
      title: "Verifiers",
      key: "created_at",
      className: "w-20 text-center",
      render: (row) => {
        const isVerifierShowButton = row?.required_verifiers?.some((verifier) => verifier?.user_id === user?.id && !verifier?.verified);
        const isAuditCountingDone = row?.started_by && row?.status === "counted";
        return (
          <div className="flex flex-col items-center gap-2">
            <VerifierAvatars requiredVerifiers={row.required_verifiers || []} />
            {isVerifierShowButton && isAuditCountingDone && (
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
              className={`capitalize text-xs px-2.5 py-1 rounded-full border ${
                row?.verifier_status === "pending" ? "bg-yellow-50 border-yellow-200 text-yellow-600" : "bg-green-50 border-green-200 text-green-500"
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
      className: "w-32",
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
      className: "w-24",
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
            {showReschedule && (
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
      <div className="flex items-center justify-between p-2">
        <div>
          <h1 className="text-lg font-semibold text-gray-600 uppercase">Reconcile List</h1>
          <p className="text-xs text-gray-400">Manage Your All Reconcile</p>
        </div>
        <div className="flex items-center gap-4">
          <div onClick={handleOpenCreateModal} className="cursor-pointer transition-all px-4 py-2 hover:bg-black rounded text-white bg-[#424242]">
            <p>Request Reconcile</p>
          </div>
        </div>
      </div>
      {step === 0 && (
        <DataTable columns={columns} data={reconcileData} paginationData={paginationData} changePage={handlePageChange} className="h-[calc(100vh-120px)]" />
      )}

      {drawerOpen && <VaultBagsDrawer selectedReconcile={selectedReconcile} setDrawerOpen={setDrawerOpen} />}

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
