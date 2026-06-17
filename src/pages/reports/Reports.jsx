import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Calendar, Loader2 } from "lucide-react";
import { GetVaults } from "../../services/Vault";
import { useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { selectAuthUser, selectIsSuperAdmin } from "../../store/authSlice";
import VaultStatementList from "../../components/reports/VaultStatementList";
import VaultStatement from "../../components/reports/VaultStatement";

const TIMELINE_OPTIONS = new Set(["all", "today", "current_month"]);

const Reports = () => {
  const [vaults, setVaults] = useState([]);
  const [vaultsLoading, setVaultsLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  const isSuperAdmin = useSelector(selectIsSuperAdmin);
  const user = useSelector(selectAuthUser);
  const activeVaultId = searchParams.get("vault");
  const timelineParam = searchParams.get("timeline");
  const timeline = TIMELINE_OPTIONS.has(timelineParam) ? timelineParam : "all";
  const waitingForAssignments = !isSuperAdmin && !user;

  useEffect(() => {
    GetVaults()
      .then((res) => {
        setVaults(res?.data?.data || []);
      })
      .finally(() => setVaultsLoading(false));
  }, []);

  const filteredVaults = useMemo(() => {
    if (isSuperAdmin) return vaults;
    return vaults.filter((vault) => user?.vault_assignments?.some((assign) => Number(assign.vault_id) === Number(vault.id) && assign.status === "active"));
  }, [isSuperAdmin, user?.vault_assignments, vaults]);

  const activeVault = activeVaultId ? filteredVaults.find((vault) => Number(vault.id) === Number(activeVaultId)) : null;
  const isVaultSelectionLoading = activeVaultId && (vaultsLoading || waitingForAssignments);

  useEffect(() => {
    if (!activeVaultId || isVaultSelectionLoading || activeVault) return;

    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.delete("vault");
      return params;
    });
  }, [activeVault, activeVaultId, isVaultSelectionLoading, setSearchParams]);

  const handleSelectVault = (vault) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set("vault", vault.id);
      return params;
    });
  };

  const handleBackToVaultList = () => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.delete("vault");
      return params;
    });
  };

  const handleTimelineChange = (value) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (value === "all") {
        params.delete("timeline");
      } else {
        params.set("timeline", value);
      }
      return params;
    });
  };

  return (
    <div className="h-[calc(100vh-16px)] flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-10 bg-[#1a2b4b] rounded-full" />
          <div>
            <h1 className="xl:text-2xl font-black text-[#1a2b4b] uppercase">Bank Statement</h1>
            <p className="text-[8px] xl:text-[10px] font-bold text-gray-400 tracking-[0.2em] uppercase">Audit Reports</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {activeVault && (
            <button
              onClick={handleBackToVaultList}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:border-[#1a73e8] hover:text-[#1a73e8] transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          )}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
            <Calendar size={14} className="text-slate-400" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Timeline:</span>
            <select
              value={timeline}
              onChange={(e) => handleTimelineChange(e.target.value)}
              className="text-xs font-semibold bg-transparent outline-none cursor-pointer text-slate-700"
            >
              <option value="all">All Months</option>
              <option value="today">Today</option>
              <option value="current_month">Current Month</option>
            </select>
          </div>
        </div>
      </div>

      {activeVault ? (
        <VaultStatement vault={activeVault} timeline={timeline} onBack={handleBackToVaultList} />
      ) : isVaultSelectionLoading ? (
        <div className="flex-1 min-h-0 py-20 flex items-center justify-center gap-2 text-slate-400 text-sm">
          <Loader2 className="animate-spin" size={16} />
          Opening vault statement...
        </div>
      ) : (
        <VaultStatementList vaults={filteredVaults} onSelect={handleSelectVault} />
      )}
    </div>
  );
};

export default Reports;
