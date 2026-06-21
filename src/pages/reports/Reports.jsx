import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { GetVaults } from "../../services/Vault";
import { useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { selectAuthUser, selectIsSuperAdmin } from "../../store/authSlice";
import VaultStatementList from "../../components/reports/VaultStatementList";
import VaultStatement from "../../components/reports/VaultStatement";
import DateRangePicker from "../../components/global/dateRangePicker/DateRangePicker";

const Reports = () => {
  const [vaults, setVaults] = useState([]);
  const [vaultsLoading, setVaultsLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  const isSuperAdmin = useSelector(selectIsSuperAdmin);
  const user = useSelector(selectAuthUser);
  const activeVaultId = searchParams.get("vault");
  const fromDate = searchParams.get("from_date") || "";
  const toDate = searchParams.get("to_date") || "";
  const preset = searchParams.get("preset") || "all";
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

  const handleDateRangeChange = ({ from_date, to_date, preset: nextPreset }) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (from_date) params.set("from_date", from_date); else params.delete("from_date");
      if (to_date) params.set("to_date", to_date); else params.delete("to_date");
      if (nextPreset && nextPreset !== "all") params.set("preset", nextPreset); else params.delete("preset");
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
          <DateRangePicker
            value={{ from_date: fromDate, to_date: toDate }}
            preset={preset}
            onChange={handleDateRangeChange}
          />
        </div>
      </div>

      {activeVault ? (
        <VaultStatement vault={activeVault} fromDate={fromDate} toDate={toDate} onBack={handleBackToVaultList} />
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
