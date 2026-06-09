import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiTrendingUp, FiTrendingDown, FiChevronDown, FiClock, FiCheckCircle, FiArrowUpRight, FiArrowDownLeft, FiLayers, FiCalendar } from "react-icons/fi";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { GetDashboardReports } from "../../../services/Dashboard";
import { useSelector } from "react-redux";
import { selectAuthUser, selectIsSuperAdmin } from "../../../store/authSlice";
import KYCReminderModal from "../../kycModal/KYCReminderModal";

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [showKYCModal, setShowKYCModal] = useState(false);
  const [timeframe, setTimeframe] = useState("1month");
  const [selectedVault, setSelectedVault] = useState(""); // "" signifies "All Vaults"

  // Dropdown states
  const [timeframeDropdownOpen, setTimeframeDropdownOpen] = useState(false);
  const [vaultDropdownOpen, setVaultDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const authUser = useSelector(selectAuthUser);
  const isSuperAdmin = useSelector(selectIsSuperAdmin);

  const formatCurrency = (value) => {
    const formattedNumber = new Intl.NumberFormat("en-IN", {
      maximumFractionDigits: 0,
    }).format(value || 0);

    return `${formattedNumber}`;
  };

  // Synchronize dashboard API updates whenever either timeframe OR selectedVault mutations fire
  useEffect(() => {
    setIsLoading(true);
    GetDashboardReports(timeframe, selectedVault)
      .then((res) => {
        setDashboardData(res?.data || null);
      })
      .finally(() => setIsLoading(false));
  }, [timeframe, selectedVault]);

  useEffect(() => {
    const hasSeenModal = sessionStorage.getItem("kyc_modal_shown");
    if (authUser && authUser.kyc_verified_at === null && !hasSeenModal && !isSuperAdmin) {
      setShowKYCModal(true);
    }
  }, [authUser, isSuperAdmin]);

  const handleCloseModal = () => {
    setShowKYCModal(false);
    sessionStorage.setItem("kyc_modal_shown", "true");
  };

  const timeframeLabels = {
    "7days": "Last 7 Days",
    "1month": "Last Month",
    "3month": "Last 3 Months",
    "6month": "Last 6 Months",
    "1year": "Last Year",
  };

  const cardsConfig = [
    {
      label: "Remaining Balance",
      value: formatCurrency(dashboardData?.totalVaultBalance?.value),
      change: dashboardData?.totalVaultBalance?.change || "0%",
      trend: dashboardData?.totalVaultBalance?.trend || "up",
      icon: FiLayers,
      color: "text-emerald-600 bg-emerald-50",
    },
    {
      label: "Total CashIn",
      value: formatCurrency(dashboardData?.totalCashIn?.value),
      change: dashboardData?.totalCashIn?.change || "0%",
      trend: dashboardData?.totalCashIn?.trend || "up",
      icon: FiArrowDownLeft,
      color: "text-cyan-600 bg-cyan-50",
    },
    {
      label: "Total Cashout",
      value: formatCurrency(dashboardData?.totalCashOut?.value),
      change: dashboardData?.totalCashOut?.change || "0%",
      trend: dashboardData?.totalCashOut?.trend || "down",
      icon: FiArrowUpRight,
      color: "text-rose-600 bg-rose-50",
    },
    {
      label: "Total Vaults Registered",
      value: dashboardData?.totalVaults ?? "0",
      change: isSuperAdmin ? "Global view" : "Assigned view",
      trend: "up",
      icon: FiLayers,
      color: "text-purple-600 bg-purple-50",
    },
    {
      label: "Total Transferred Bags",
      value: dashboardData?.totalBags ?? "0",
      change: "Synced",
      trend: "up",
      icon: FiCheckCircle,
      color: "text-amber-600 bg-amber-50",
    },
  ];

  // Dynamically resolve label matching selection
  const selectedVaultLabel = selectedVault ? dashboardData?.vaults?.find((v) => v.id === Number(selectedVault))?.name || "Vault Selected" : "All Vaults";

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 p-6 font-sans relative overflow-x-hidden">
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-200/20 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-80 h-80 bg-indigo-200/20 blur-[90px] rounded-full pointer-events-none" />

      <KYCReminderModal isOpen={showKYCModal} onClose={handleCloseModal} />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-slate-200/80 pb-5 relative z-50">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Qbits Vault Dashboard
          </h1>
          <p className="text-sm text-slate-400 mt-1">Real-time ecosystem health metrics and verification ledgers.</p>
        </div>

        {/* Filters Group Container */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Vault Selection Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setVaultDropdownOpen(!vaultDropdownOpen);
                setTimeframeDropdownOpen(false);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/90 backdrop-blur-md border border-slate-200 hover:border-indigo-500/50 rounded-xl text-sm font-semibold text-slate-700 transition-all "
            >
              <FiLayers className="text-indigo-600" />
              <span>{selectedVaultLabel}</span>
              <FiChevronDown className={`transition-transform duration-200 ${vaultDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
              {vaultDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-xl shadow-xl z-[9999] overflow-hidden max-h-60 overflow-y-auto"
                >
                  <button
                    onClick={() => {
                      setSelectedVault("");
                      setVaultDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition ${
                      selectedVault === "" ? "text-indigo-600 font-bold bg-indigo-50/50" : "text-slate-600"
                    }`}
                  >
                    All Vaults
                  </button>
                  {dashboardData?.vaults?.map((vault) => (
                    <button
                      key={vault.id}
                      onClick={() => {
                        setSelectedVault(vault.id.toString());
                        setVaultDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition ${
                        selectedVault === vault.id.toString() ? "text-indigo-600 font-bold bg-indigo-50/50" : "text-slate-600"
                      }`}
                    >
                      {vault.name}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Dynamic Interactive Filter Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setTimeframeDropdownOpen(!timeframeDropdownOpen);
                setVaultDropdownOpen(false);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/90 backdrop-blur-md border border-slate-200 hover:border-cyan-500/50 rounded-xl text-sm font-semibold text-slate-700 transition-all "
            >
              <FiCalendar className="text-cyan-600" />
              <span>{timeframeLabels[timeframe]}</span>
              <FiChevronDown className={`transition-transform duration-200 ${timeframeDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
              {timeframeDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-[9999] overflow-hidden"
                >
                  {Object.entries(timeframeLabels).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setTimeframe(key);
                        setTimeframeDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition ${
                        timeframe === key ? "text-cyan-600 font-bold bg-cyan-50/50" : "text-slate-600"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <main className="space-y-8 relative z-10">
        {/* KPI Analytical Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          {cardsConfig.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-5 hover:border-slate-300 transition-all group relative"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 group-hover:text-slate-500 transition-colors">{stat.label}</p>
                <div className={`p-2 rounded-xl font-semibold ${stat.color}`}>
                  <stat.icon size={16} />
                </div>
              </div>

              {isLoading ? (
                <div className="h-8 w-28 bg-slate-200 animate-pulse rounded mb-2" />
              ) : (
                <h3 className="text-2xl font-bold tracking-tight text-slate-900 mb-1">{stat.value}</h3>
              )}

              <div className="flex items-center gap-1.5 text-xs">
                {stat.trend === "up" ? <FiTrendingUp className="text-emerald-500" /> : <FiTrendingDown className="text-rose-500" />}
                <span className={stat.trend === "up" ? "text-emerald-600 font-semibold" : "text-rose-600 font-semibold"}>{stat.change}</span>
                <span className="text-slate-400">vs last slice</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Dynamic Charts & Side Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-6 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">Transactional Health Matrix</h3>
                <p className="text-xs text-slate-400 mt-0.5">Continuous analytical distribution overlaying asset velocities.</p>
              </div>

              <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 bg-slate-50 px-3 py-1.5 border border-slate-100 rounded-xl">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-500 inline-block" /> Cash In
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Cash Out
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" /> Reconciliation
                </div>
              </div>
            </div>

            <div className="w-full h-[320px] mt-2">
              {isLoading ? (
                <div className="w-full h-full bg-slate-100/50 animate-pulse rounded-xl flex items-center justify-center text-sm text-slate-400 font-medium">
                  Loading telemetry matrix...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dashboardData?.chartData || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradientCashIn" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradientCashOut" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradientRecon" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px" }}
                      itemStyle={{ fontSize: "12px" }}
                      labelStyle={{ fontSize: "11px", color: "#64748b", fontWeight: "bold" }}
                    />
                    <Area type="monotone" name="Cash In" dataKey="cashIn" stroke="#06b6d4" strokeWidth={2.5} fillOpacity={1} fill="url(#gradientCashIn)" />
                    <Area type="monotone" name="Cash Out" dataKey="cashOut" stroke="#f43f5e" strokeWidth={2.5} fillOpacity={1} fill="url(#gradientCashOut)" />
                    <Area
                      type="monotone"
                      name="Reconciliation"
                      dataKey="reconciliation"
                      stroke="#6366f1"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#gradientRecon)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Pending Verification Panel */}
          <div className="flex flex-col gap-5">
            <div className="bg-gradient-to-br from-indigo-50 to-slate-50 border border-indigo-100 rounded-2xl p-5 relative overflow-hidden">
              <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-indigo-500/5 blur-xl rounded-full" />
              <div>
                <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Next Vault Reconciliation</p>
                {dashboardData?.nextReconciliation ? (
                  <h4 className="text-xl font-bold text-slate-900 mt-2 flex items-center gap-2">
                    <FiClock className="text-indigo-600" />{" "}
                    <span>{dashboardData?.nextReconciliation ? dashboardData?.nextReconciliation?.next_reconcile_date : "N/A"}</span>
                    <span className="text-indigo-400 text-xs">({dashboardData?.nextReconciliation?.vault_name})</span>
                  </h4>
                ) : (
                  <span className="text-xs font-semibold py-2">No reconciliations</span>
                )}
                {dashboardData?.nextReconciliation && (
                  <p className="text-xs text-slate-500 mt-1">
                    Automatic state confirmation cycle starts in {dashboardData?.nextReconciliation?.days_remaining} days
                  </p>
                )}
              </div>
            </div>
            {dashboardData?.pendingVaultBagRequest?.length > 0 && (
              <div className="bg-gradient-to-br from-orange-50 to-slate-50 border border-orange-100 rounded-2xl p-5 relative overflow-hidden">
                <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-indigo-500/5 blur-xl rounded-full" />

                <div>
                  <p className="text-xs font-bold text-orange-600 uppercase tracking-widest">
                    New Bag create Request ({dashboardData.pendingVaultBagRequest.length})
                  </p>

                  <div className="space-y-3 mt-2">
                    {dashboardData.pendingVaultBagRequest.map((item, idx) => (
                      <div key={item.id || idx} className="border-b border-orange-100/50 last:border-0 pb-2 last:pb-0">
                        <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                          <span>{item?.vault?.name || "N/A"}</span>
                          <span className="text-indigo-500 text-xs font-mono">(Code: {item?.vault?.vault_code || "—"})</span>
                        </h4>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                          <span>
                            Requested by: <strong className="text-slate-700">{item?.request_user?.name}</strong>
                          </span>
                          <span className="bg-orange-100/80 text-orange-700 px-2 py-0.5 rounded-full text-[10px] font-semibold">Pending</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-5 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Verification Ledger</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Pending security authorization pipelines.</p>
                  </div>
                  {dashboardData?.pendingLedger?.length > 0 && (
                    <span className="bg-amber-50 text-amber-600 border border-amber-200 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      {dashboardData?.pendingLedger?.length} Pending
                    </span>
                  )}
                </div>

                <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200">
                  {dashboardData?.pendingLedger?.length > 0 ? (
                    dashboardData?.pendingLedger.map((item) => (
                      <div
                        key={item.tran_id}
                        className="group flex justify-between items-center p-3 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-xl transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-lg text-xs font-bold ${item.type === "Cash In" ? "bg-cyan-50 text-cyan-600" : item.type === "Cash Out" ? "bg-rose-50 text-rose-600" : "bg-purple-50 text-purple-600"}`}
                          >
                            {item.type === "Cash In" ? "CI" : item.type === "Cash Out" ? "CO" : "VT"}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-800 group-hover:text-cyan-600 transition-colors">
                              {item.tran_id} <span className="text-xs text-indigo-400">{item.vault_name}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <span>{item.type}</span> &bull; <span>{item.time}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-bold text-slate-800">
                            {item.amount.toString().includes("BDT") || item.amount.toString().includes("৳")
                              ? item.amount
                              : formatCurrency(parseFloat(item.amount.toString().replace(/[^\d.]/g, "")) || 0)}
                          </div>
                          <div className="text-[10px] text-amber-600 flex items-center gap-1 justify-end mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block animate-pulse" />
                            <span>{item?.status}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center flex justify-center h-[250px] items-center text-gray-300  ">No pending verifications</div>
                  )}
                </div>
              </div>
              <button className="w-full mt-4 text-center py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold rounded-xl border border-slate-200/60 transition-all">
                Access Audit Queue
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
