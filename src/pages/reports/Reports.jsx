import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Layers, Loader2, BookOpen, Landmark } from "lucide-react";
import { GetReports } from "../../services/Reports";
import DataTable from "../../components/global/dataTable/DataTable";
import { GetVaults } from "../../services/Vault";
import { useSelector } from "react-redux";
import { selectAuthUser, selectIsSuperAdmin } from "../../store/authSlice";
import { useSearchParams } from "react-router-dom";
import VaultStatementList from "../../components/reports/VaultStatementList";
import VaultStatement from "../../components/reports/VaultStatement";

const Reports = () => {
  const [mode, setMode] = useState("statement"); // "statement" (bank-style) | "ledger" (flat)
  const [activeVault, setActiveVault] = useState(null); // selected vault for the statement view
  const [timeline, setTimeline] = useState("all");
  const [selectedVault, setSelectedVault] = useState("all");
  const [vaults, setVaults] = useState([]);
  const [, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);

  const isSuperAdmin = useSelector(selectIsSuperAdmin);
  const user = useSelector(selectAuthUser);

  useEffect(() => {
    GetVaults().then((res) => {
      setVaults(res?.data?.data || []);
    });
  }, []);

  const handlePageChange = (page) => {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set("page", page.toString());
      return p;
    });
  };

  // Compute derived filtered vaults list based on user role assignments
  const filteredVaults = isSuperAdmin
    ? vaults
    : vaults.filter((vault) => user?.vault_assignments?.some((assign) => Number(assign.vault_id) === Number(vault.id) && assign.status === "active"));

  // React Query Fetch Hook
  const { data, isLoading } = useQuery({
    queryKey: ["vaultReport", timeline, selectedVault, page],
    queryFn: async () => {
      const res = await GetReports({
        timeline,
        vault_id: selectedVault,
        page: page,
        per_page: 15,
      });

      return res.data;
    },
  });

  // Safe destructuring of your structured API data payload wrapper
  const reportSummary = data?.summary;
  const ledgerRows = data?.ledger || [];
  const pagination = data?.pagination;

  // Custom Columns Mapping with precise formatting rules
  const columns = [
    {
      title: "Date and time",
      key: "completed_at",
      className: "w-32 text-start font-normal text-slate-400",
      render: (row) => <span>{row.completed_at || "—"}</span>,
    },
    {
      title: "Transaction Id",
      key: "tran_id",
      className: "w-40 text-start font-mono font-bold text-slate-900",
      render: (row) => <span>{row.tran_id}</span>,
    },
    {
      title: "Vault",
      key: "vault",
      className: "w-32 text-start",
      render: (row) => (
        <span className="bg-gray-100  text-slate-600 font-bold px-2 py-0.5 rounded text-[10px]">{row.vault?.name || `ID: ${row.vault_id}`}</span>
      ),
    },
    {
      title: "Bag Ref",
      key: "assigned_bags",
      className: "w-40 text-start",
      render: (row) =>
        row.assigned_bags && row.assigned_bags.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {row.assigned_bags.map((bag) => (
              <span
                key={bag.id}
                className="bg-slate-50 text-slate-700 font-mono font-bold px-1.5 py-0.5 rounded text-[10px] border border-slate-200 shadow-2xs"
              >
                {bag.barcode}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-slate-300 font-normal">—</span>
        ),
    },
    {
      title: "Debit (Cash Out)",
      key: "debit",
      className: "w-28 text-end font-bold !text-red-500",
      render: (row) => (
        <span className="text-red-400">{row.debit ? `৳${Number(row.debit).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "—"}</span>
      ),
    },
    {
      title: "Credit (Cash In)",
      key: "credit",
      className: "w-28 text-end font-bold !text-green-600",
      render: (row) => (
        <span className="text-green-600">{row.credit ? `৳${Number(row.credit).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "—"}</span>
      ),
    }
  ];

  const isStatement = mode === "statement";

  return (
    <div>
      {/* Upper Controls / Breadcrumb Panel */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-10 bg-[#1a2b4b] rounded-full" />
          <div>
            <h1 className="xl:text-2xl font-black text-[#1a2b4b] uppercase">
              {isStatement ? "Bank Statement" : "Vault Ledger Reports"}
            </h1>
            <p className="text-[8px] xl:text-[10px] font-bold text-gray-400 tracking-[0.2em] uppercase">Audit Reports</p>
          </div>
        </div>

        {/* Filters Matrix Row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Mode toggle: Bank Statement vs flat Ledger */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            <button
              onClick={() => {
                setMode("statement");
                setActiveVault(null);
              }}
              className={`flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                isStatement ? "bg-white text-[#1a73e8] shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Landmark size={14} /> Statement
            </button>
            <button
              onClick={() => setMode("ledger")}
              className={`flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                !isStatement ? "bg-white text-[#1a73e8] shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <BookOpen size={14} /> Ledger
            </button>
          </div>

          {/* Dynamic Transaction ID Text Search Input */}
          {/* <div className="flex items-center gap-1.5 bg-white border rounded-xl px-3 py-1.5 shadow-2xs">
            <Search size={14} className="text-slate-400" />
            <input
              type="text"
              placeholder="Search Tran ID..."
              value={tranId}
              onChange={(e) => {
                setTranId(e.target.value);
                setPage(1);
              }}
              className="text-xs font-semibold bg-transparent outline-none text-slate-700 w-32 placeholder-slate-400"
            />
          </div> */}

          {/* Timeline Dropdown Control */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
            <Calendar size={14} className="text-slate-400" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Timeline:</span>
            <select
              value={timeline}
              onChange={(e) => {
                setTimeline(e.target.value);
                setPage(1);
              }}
              className="text-xs font-semibold bg-transparent outline-none cursor-pointer text-slate-700"
            >
              <option value="all">All Months</option>
              <option value="today">Today</option>
              <option value="current_month">Current Month</option>
            </select>
          </div>

          {/* Vault ID Select Filter Constraint — ledger mode only */}
          {!isStatement && (
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
              <Layers size={14} className="text-slate-400" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Vault:</span>
              <select
                value={selectedVault}
                onChange={(e) => {
                  setSelectedVault(e.target.value);
                  setPage(1);
                }}
                className="text-xs font-semibold bg-transparent outline-none cursor-pointer text-slate-700"
              >
                <option value="all">All Active Vaults</option>
                {/* DYNAMIC CONDITIONALLY FILTERED VAULT LOOP */}
                {filteredVaults?.map((vault) => (
                  <option key={vault.id} value={vault.id}>
                    {vault.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Bank Statement Mode: vault accounts list -> per-vault running-balance statement */}
      {isStatement ? (
        activeVault ? (
          <VaultStatement vault={activeVault} timeline={timeline} onBack={() => setActiveVault(null)} />
        ) : (
          <VaultStatementList vaults={filteredVaults} onSelect={setActiveVault} />
        )
      ) : (
      /* Main Ledger Content Canvas Card Wrapper */
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
        {/* Aggregate Status Summary Header Strip */}
        <div className="bg-slate-50/50 border-b border-slate-100 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="bg-[#1a2b4b] text-white text-[10px] font-black px-2 py-0.5 rounded-md uppercase">Live</span>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Unified Balance Sheet</h3>
          </div>

          <div className="flex items-center gap-6 text-xs font-semibold">
            <div>
              <span className="text-emerald-600">Total Credits (Cash In): </span>
              <span className="text-emerald-600 font-bold">
                ৳{Number(reportSummary?.total_credits || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="border-l border-slate-200 h-4" />
            <div>
              <span className="text-rose-600">Total Debits (Cash Out): </span>
              <span className="text-rose-600 font-bold">
                ৳{Number(reportSummary?.total_debits || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="border-l border-slate-200 h-4" />
            <div className="px-3 py-1.5 rounded-lg flex gap-2">
              <span>Ending Net Balance:</span>
              <span className="font-bold">৳{Number(reportSummary?.net_balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* Global Abstracted Reusable Data Table Context Instance */}
        {isLoading ? (
          <div className="py-20 flex items-center justify-center gap-2 text-slate-400 text-sm">
            <Loader2 className="animate-spin" size={16} />
            Gathering structural accounting logs...
          </div>
        ) : (
          <DataTable data={ledgerRows} columns={columns} paginationData={pagination} changePage={handlePageChange} className="h-[calc(100vh-220px)]" />
        )}
      </div>
      )}
    </div>
  );
};

export default Reports;
