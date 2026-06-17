import { useSearchParams } from "react-router-dom";
import DataTable from "../../components/global/dataTable/DataTable";
import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GetReconciles } from "../../services/Reconcile";
import { ArrowLeft, Building2, Landmark, Loader2, Plus, Scale, Wallet, WalletCards } from "lucide-react";
import { useSelector } from "react-redux";
import ReconcileViewDrawer from "../../components/reconcile/ReconcileViewDrawer";
import { selectAuthUser, selectIsSuperAdmin } from "../../store/authSlice";
import { GetVaults } from "../../services/Vault";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import customParseFormat from "dayjs/plugin/customParseFormat";
import ReconcileModal from "../../components/reconcile/ReconcileModal";
import { usePermissions } from "../../hooks/usePermissions";

dayjs.extend(customParseFormat);
dayjs.extend(utc);

const fmt = (n) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });
const vaultBalance = (vault) => (vault?.bags || []).reduce((sum, bag) => sum + parseFloat(bag.current_amount || 0), 0);
const bagDifference = (bag) => Number(bag?.pivot?.difference ?? 0);
const reconcileVariance = (row) => {
  // Variance = expected − counted, so it always agrees with the Expected and
  // Counted columns (including bags that weren't counted).
  if (row?.expected_balance != null && row?.counted_balance != null) {
    return Number(row.expected_balance) - Number(row.counted_balance);
  }
  const bagVariance = (row?.variance_bags || []).reduce((sum, bag) => sum + bagDifference(bag), 0);
  if (bagVariance !== 0) return bagVariance;
  return row?.variance;
};
const auditEndAt = (row) =>
  row?.audit_end_at ||
  row?.ended_at ||
  row?.end_at ||
  row?.completed_at ||
  row?.expected_completion_at ||
  (row?.status === "completed" ? row?.updated_at : null);

const Reconcile = () => {
  const [reconcileData, setReconcileData] = useState([]);
  const [latestReconcileByVault, setLatestReconcileByVault] = useState({});
  const [vaults, setVaults] = useState([]);
  const [vaultsLoading, setVaultsLoading] = useState(true);
  const [openReconcileModel, setOpenReconcileModel] = useState();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedReconcile, setSelectedReconcile] = useState(null);
  const [openReconcileViewDrawer, setOpenReconcileViewDrawer] = useState(false);
  const [editReconcileId, setEditReconcileId] = useState(null);
  const [varianceNotesModal, setVarianceNotesModal] = useState(null);
  const [paginationData, setPaginationData] = useState({});
  const currentPage = parseInt(searchParams.get("page") || "1");
  const activeVaultId = searchParams.get("vault");

  const isSuperAdmin = useSelector(selectIsSuperAdmin);
  const user = useSelector(selectAuthUser);
  const { hasPermission } = usePermissions();
  const waitingForAssignments = !isSuperAdmin && !user;

  useEffect(() => {
    GetVaults()
      .then((res) => {
        setVaults(res?.data?.data || []);
      })
      .finally(() => setVaultsLoading(false));
  }, []);

  const fetchLatestReconcileByVault = useCallback(() => {
    GetReconciles({ per_page: 200 }).then((res) => {
      const items = res?.data?.data ?? [];
      const map = {};
      items.forEach((r) => {
        const vid = String(r.vault_id || r.vault?.id);
        if (!map[vid]) map[vid] = r;
      });
      setLatestReconcileByVault(map);
    });
  }, []);

  useEffect(() => {
    fetchLatestReconcileByVault();
  }, [fetchLatestReconcileByVault]);

  useEffect(() => {
    if (!activeVaultId) fetchLatestReconcileByVault();
  }, [activeVaultId, fetchLatestReconcileByVault]);

  const filteredVaults = useMemo(() => {
    if (isSuperAdmin) return vaults;
    return vaults.filter((vault) => user?.vault_assignments?.some((assign) => Number(assign.vault_id) === Number(vault.id) && assign.status === "active"));
  }, [isSuperAdmin, user?.vault_assignments, vaults]);

  const activeVault = activeVaultId ? filteredVaults.find((vault) => Number(vault.id) === Number(activeVaultId)) : null;
  const isVaultSelectionLoading = activeVaultId && (vaultsLoading || waitingForAssignments);

  const fetchReconcileData = useCallback(async () => {
    const res = await GetReconciles({ page: currentPage, vault_id: activeVaultId });
    const { data: items, ...pagination } = res?.data ?? {};
    setReconcileData(items ?? []);
    setPaginationData(pagination);
    return items ?? [];
  }, [activeVaultId, currentPage]);

  useEffect(() => {
    if (activeVaultId) fetchReconcileData();
  }, [activeVaultId, currentPage, fetchReconcileData]);

  useEffect(() => {
    if (!activeVaultId || isVaultSelectionLoading || activeVault) return;

    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.delete("vault");
      p.delete("page");
      return p;
    });
  }, [activeVault, activeVaultId, isVaultSelectionLoading, setSearchParams]);

  const refetch = () => {
    fetchReconcileData();
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

  const handleSelectVault = (vault) => {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set("vault", vault.id.toString());
      p.delete("page");
      return p;
    });
  };

  const handleBackToVaults = () => {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.delete("vault");
      p.delete("page");
      return p;
    });
  };

  const visibleReconcileData = activeVaultId
    ? reconcileData.filter((row) => Number(row?.vault_id || row?.vault?.id) === Number(activeVaultId))
    : reconcileData;

  const latestReconcile = visibleReconcileData[0] || null;
  const latestVariance = reconcileVariance(latestReconcile);
  const activeVaultBalance = vaultBalance(activeVault);
  const activeVaultBagCount = activeVault?.bags?.length || 0;

  const renderSelectedVaultSummary = () => {
    if (!activeVault) return null;

    const summaryCards = [
      {
        label: "Vault Code",
        value: `#${activeVault.vault_code || activeVault.id}`,
        icon: Landmark,
        tone: "bg-blue-50 text-[#1a73e8]",
      },
      {
        label: "Current Balance",
        value: `৳${fmt(activeVaultBalance)}`,
        icon: Wallet,
        tone: "bg-emerald-50 text-emerald-600",
      },
      {
        label: "Total Bags",
        value: activeVaultBagCount,
        icon: WalletCards,
        tone: "bg-slate-100 text-slate-600",
      },
      {
        label: "Latest Variance",
        value: latestReconcile ? `৳${fmt(latestVariance)}` : "No reconcile yet",
        icon: Scale,
        tone: Number(latestVariance || 0) === 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600",
      },
    ];

    return (
      <div className="bg-white border-x border-t border-slate-200 rounded-t-2xl overflow-hidden shrink-0">
        <div className="bg-slate-50/60 border-b border-slate-100 px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Vault Reconciliation Summary</h3>
            <p className="text-[11px] font-semibold text-slate-400 mt-0.5 truncate">{activeVault.address || "No address recorded"}</p>
          </div>
          {latestReconcile && (
            <span className={`capitalize text-xs px-2.5 py-1 rounded-full border font-bold ${
              latestReconcile.status === "pending"
                ? "bg-yellow-50 border-yellow-200 text-yellow-600"
                : latestReconcile.status === "counting"
                ? "bg-blue-50 border-blue-200 text-[#1a73e8]"
                : latestReconcile.status === "counted"
                ? "bg-blue-50 border-blue-200 text-[#1a73e8]"
                : latestReconcile.status === "completed"
                ? "bg-green-50 border-green-200 text-green-500"
                : latestReconcile.status === "expired"
                ? "bg-red-50 border-red-200 text-red-500"
                : "bg-orange-50 border-orange-200 text-orange-500"
            }`}>
              Latest: {latestReconcile.status}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 p-4">
          {summaryCards.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${item.tone}`}>
                  <Icon size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.label}</p>
                  <p className="text-sm font-black text-[#1a2b4b] mt-0.5 truncate">{item.value}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderVaultOverview = () => {
    if (vaultsLoading || waitingForAssignments) {
      return (
        <div className="flex-1 min-h-0 py-20 flex items-center justify-center gap-2 text-slate-400 text-sm">
          <Loader2 className="animate-spin" size={16} />
          Loading assigned vaults...
        </div>
      );
    }

    if (filteredVaults.length === 0) {
      return (
        <div className="flex-1 min-h-0 py-20 flex items-center justify-center text-sm font-semibold text-slate-400">
          No vaults available for reconciliation.
        </div>
      );
    }

    return (
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden flex-1 min-h-0">
        <div className="bg-slate-50/60 border-b border-slate-100 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="bg-[#1a73e8] text-white text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wide">Vaults</span>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Select Vault For Reconcile</h3>
          </div>
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3.5 py-2 shadow-sm">
            <WalletCards size={15} className="text-[#1a73e8]" />
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Vaults</span>
            <span className="text-sm font-black text-[#1a2b4b]">{filteredVaults.length}</span>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredVaults.map((vault) => {
            const latestRec = latestReconcileByVault[String(vault.id)];
            const activeStatus = latestRec && latestRec.status !== "completed" ? latestRec.status : null;
            return (
              <button
                key={vault.id}
                type="button"
                onClick={() => handleSelectVault(vault)}
                className="group text-left cursor-pointer bg-white border border-slate-200 rounded-2xl p-5 hover:border-[#1a73e8] hover:shadow-lg hover:shadow-blue-50 transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 shrink-0 rounded-xl bg-blue-50 text-[#1a73e8] flex items-center justify-center group-hover:bg-[#1a73e8] group-hover:text-white transition-colors">
                      <Landmark size={20} />
                    </div>
                    <div className="min-w-0">
                      <span className="inline-block font-mono text-[10px] font-bold text-[#1a73e8] bg-blue-50 px-1.5 py-0.5 rounded">
                        #{vault.vault_code || vault.id}
                      </span>
                      <h4 className="text-base font-black text-[#1a2b4b] mt-1 truncate">{vault.name}</h4>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="bg-emerald-50 border border-emerald-100 text-emerald-600 text-[11px] font-bold px-2.5 py-1 rounded-full">
                      {vault?.bags?.length || 0} Bag{(vault?.bags?.length || 0) !== 1 ? "s" : ""}
                    </span>
                    {activeStatus && (
                      <span className={`capitalize text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                        activeStatus === "pending"
                          ? "bg-yellow-50 border-yellow-200 text-yellow-600"
                          : activeStatus === "counting"
                          ? "bg-blue-50 border-blue-200 text-[#1a73e8]"
                          : activeStatus === "counted"
                          ? "bg-blue-50 border-blue-200 text-[#1a73e8]"
                          : activeStatus === "expired"
                          ? "bg-red-50 border-red-200 text-red-500"
                          : "bg-orange-50 border-orange-200 text-orange-500"
                      }`}>
                        {activeStatus}
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 font-semibold mt-2.5 ml-0.5 truncate">{vault.address || "No address recorded"}</p>

                <div className="mt-4 pt-4 border-t border-dashed border-slate-200 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reconciliation Logs</span>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-300 group-hover:text-[#1a73e8] transition-colors">
                    Open
                    <Building2 className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const columns = [
    {
      title: "Reconcile Id",
      key: "reconcile_tran_id",
      className: "w-[14%]",
      render: (row) => <span className="block truncate text-[#1a73e8] font-semibold">{row.reconcile_tran_id}</span>,
    },
    {
      title: "Expected",
      key: "expected_balance",
      className: "w-[8%]",
      render: (row) => {
        const expected = row?.expected_balance ?? activeVaultBalance;
        return <span className="font-semibold text-slate-700">৳{fmt(expected)}</span>;
      },
    },
    {
      title: "Counted",
      key: "counted_balance",
      className: "w-[7%]",
      render: (row) =>
        row?.counted_balance !== null && row?.counted_balance !== undefined ? (
          <span className="font-semibold text-slate-700">৳{fmt(row.counted_balance)}</span>
        ) : (
          <span className="text-slate-300">—</span>
        ),
    },
    {
      title: "Variance",
      key: "variance",
      className: "w-[7%]",
      render: (row) => {
        const bagsWithNotes = (row?.variance_bags || []).filter((b) => b?.pivot?.note);
        const hasNotes = bagsWithNotes.length > 0;
        const variance = reconcileVariance(row);
        const hasVariance = variance !== null && variance !== undefined;
        return (
          <span
            onClick={hasNotes ? () => setVarianceNotesModal({ bags: bagsWithNotes, reconcileTranId: row.reconcile_tran_id }) : undefined}
            className={`${hasVariance ? (variance <= 0 ? "text-green-500" : "text-red-500") : "text-slate-300"} ${hasNotes ? "underline decoration-dotted cursor-pointer" : ""}`}
          >
            {hasVariance ? `৳${fmt(variance)}` : "—"}
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
              Total <span className="font-bold">{row?.total_bags ?? activeVaultBagCount}</span>
            </p>
            <p>
              Counted <span className="font-bold">{row?.finished_bag_count ?? 0}</span>
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
        const endAt = auditEndAt(row);
        if (!endAt) return <span className="text-gray-300 text-xs">—</span>;
        return (
          <div className="flex flex-col">
            <span>{dayjs.utc(endAt).format("DD MMM, YYYY")}</span>
            <span className="text-gray-400 text-xs">{dayjs.utc(endAt).format("hh:mm A")}</span>
          </div>
        );
      },
    },
   /* {
      title: "Reconciler",
      key: "reconciler",
      className: "w-[14%]",
      render: (row) => (
        <div className="flex items-center gap-2">
          <VerifierAvatars requiredVerifiers={row.required_reconcilers || []} />
        </div>
      ),
    },*/
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
                  ? "bg-blue-50 border border-blue-200 text-[#1a73e8]"
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
    <div className="h-[calc(100vh-16px)] flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-10 bg-[#1a2b4b] rounded-full" />
          <div>
            <h1 className="xl:text-2xl font-black text-[#1a2b4b] uppercase">{activeVault ? activeVault.name : "Reconcile Vaults"}</h1>
            <p className="text-[8px] xl:text-[10px] font-bold text-gray-400 tracking-[0.2em] uppercase">
              {activeVault ? "Reconciliation Logs" : "Reconciliation Management"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {activeVault && (
            <button
              onClick={handleBackToVaults}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:border-[#1a73e8] hover:text-[#1a73e8] transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          )}
          {hasPermission("reconciliation.create") && (
            <button onClick={handleOpenCreateModal} className="flex items-center gap-2 px-6 py-2.5 bg-[#1a73e8] text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-200 hover:bg-blue-600 transition-all">
              <Plus className="w-5 h-5" /> Request Reconcile
            </button>
          )}
        </div>
      </div>

      {activeVault ? (
        <div className="flex-1 min-h-0 flex flex-col rounded-2xl overflow-hidden">
          {renderSelectedVaultSummary()}
          <DataTable
            columns={columns}
            data={visibleReconcileData}
            paginationData={paginationData}
            changePage={handlePageChange}
            className="flex-1 min-h-0 !rounded-t-none !border-t-0"
          />
        </div>
      ) : isVaultSelectionLoading ? (
        <div className="flex-1 min-h-0 py-20 flex items-center justify-center gap-2 text-slate-400 text-sm">
          <Loader2 className="animate-spin" size={16} />
          Opening vault reconciles...
        </div>
      ) : (
        renderVaultOverview()
      )}

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

      {openReconcileModel && (
        <ReconcileModal
          reconcileId={editReconcileId}
          defaultVaultId={activeVault?.id}
          isClose={() => setOpenReconcileModel(false)}
          refetch={refetch}
          onCreated={(vaultId) => handleSelectVault({ id: vaultId })}
        />
      )}
      {openReconcileViewDrawer && (
        <ReconcileViewDrawer
          reconcileId={selectedReconcile?.id}
          reconcileTranId={selectedReconcile?.reconcile_tran_id}
          isOpen={openReconcileViewDrawer}
          onClose={() => setOpenReconcileViewDrawer(false)}
          refetch={refetch}
        />
      )}
    </div>
  );
};

export default Reconcile;
