import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiTrendingUp, FiTrendingDown, FiChevronDown, FiClock, FiCheckCircle, FiArrowUpRight, FiArrowDownLeft, FiLayers, FiCalendar } from "react-icons/fi";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { GetDashboardReports } from "../../../services/Dashboard";
import { useSelector } from "react-redux";
import { selectAuthUser, selectIsSuperAdmin } from "../../../store/authSlice";
import KYCReminderModal from "../../kycModal/KYCReminderModal";

// Advanced Multi-metric Demo Data Matrix grouped by Timeframe Filters
const demoChartDataMatrix = {
  "7days": [
    { name: "Mon", cashIn: 12000, cashOut: 8000, reconciliation: 4000 },
    { name: "Tue", cashIn: 19000, cashOut: 12000, reconciliation: 7000 },
    { name: "Wed", cashIn: 15000, cashOut: 14000, reconciliation: 1000 },
    { name: "Thu", cashIn: 22000, cashOut: 10000, reconciliation: 12000 },
    { name: "Fri", cashIn: 30000, cashOut: 18000, reconciliation: 12000 },
    { name: "Sat", cashIn: 18000, cashOut: 9000, reconciliation: 9000 },
    { name: "Sun", cashIn: 25000, cashOut: 15000, reconciliation: 10000 },
  ],
  "1month": [
    { name: "Week 1", cashIn: 45000, cashOut: 32000, reconciliation: 13000 },
    { name: "Week 2", cashIn: 58000, cashOut: 41000, reconciliation: 17000 },
    { name: "Week 3", cashIn: 62000, cashOut: 48000, reconciliation: 14000 },
    { name: "Week 4", cashIn: 85000, cashOut: 55000, reconciliation: 30000 },
  ],
  "3month": [
    { name: "Month 1", cashIn: 180000, cashOut: 130000, reconciliation: 50000 },
    { name: "Month 2", cashIn: 220000, cashOut: 160000, reconciliation: 60000 },
    { name: "Month 3", cashIn: 290000, cashOut: 195000, reconciliation: 95000 },
  ],
  "6month": [
    { name: "Jan", cashIn: 120000, cashOut: 90000, reconciliation: 30000 },
    { name: "Feb", cashIn: 150000, cashOut: 110000, reconciliation: 40000 },
    { name: "Mar", cashIn: 140000, cashOut: 125000, reconciliation: 15000 },
    { name: "Apr", cashIn: 210000, stroke: 140000, reconciliation: 70000 },
    { name: "May", cashIn: 240000, cashOut: 170000, reconciliation: 70000 },
    { name: "Jun", cashIn: 310000, cashOut: 210000, reconciliation: 100000 },
  ],
  "1year": [
    { name: "H1 2025", cashIn: 850000, cashOut: 620000, reconciliation: 230000 },
    { name: "H2 2025", cashIn: 1150000, cashOut: 840000, reconciliation: 310000 },
    { name: "H1 2026", cashIn: 1450000, cashOut: 990000, reconciliation: 460000 },
  ],
};

const pendingVerificationsDemo = [
  { id: "TXN-9081", type: "Cash In", amount: "$12,450", status: "Pending", time: "10 mins ago" },
  { id: "TXN-8842", type: "Cash Out", amount: "$6,200", status: "Pending", time: "25 mins ago" },
  { id: "VLT-004", type: "Vault Audit", amount: "Main Vault Sec-B", status: "Pending Review", time: "1 hr ago" },
  { id: "TXN-8711", type: "Cash In", amount: "$45,000", status: "Pending", time: "3 hrs ago" },
];

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState({});
  const [showKYCModal, setShowKYCModal] = useState(false);
  const [timeframe, setTimeframe] = useState("1month");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const authUser = useSelector(selectAuthUser);
  const isSuperAdmin = useSelector(selectIsSuperAdmin);

  useEffect(() => {
    GetDashboardReports().then((res) => {
      setDashboardData(res?.data || {});
    });
  }, []);

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

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 p-6 font-sans relative overflow-x-hidden">
      {/* Dynamic Background Blurs for Modern Polish */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-200/20 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-80 h-80 bg-indigo-200/20 blur-[90px] rounded-full pointer-events-none" />

      <KYCReminderModal isOpen={showKYCModal} onClose={handleCloseModal} />

      {/* Top Header Controls Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-slate-200/80 pb-5 relative z-50">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Qbits Vault Dashboard
          </h1>
          <p className="text-sm text-slate-400 mt-1">Real-time ecosystem health metrics and verification ledgers.</p>
        </div>

        {/* Dynamic Interactive Filter Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/90 backdrop-blur-md border border-slate-200 hover:border-cyan-500/50 rounded-xl text-sm font-semibold text-slate-700 transition-all"
          >
            <FiCalendar className="text-cyan-600" />
            <span>{timeframeLabels[timeframe]}</span>
            <FiChevronDown className={`transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`} />
          </button>

          <AnimatePresence>
            {dropdownOpen && (
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
                      setDropdownOpen(false);
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

      {/* Main Core View Area */}
      <main className="space-y-8 relative z-10">
        {/* Row 1: KPI Analytical Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          {[
            {
              label: "Remaining Balance",
              value: dashboardData?.totalVaultBalance || "$2,450,000",
              change: "+12.5%",
              trend: "up",
              icon: FiLayers,
              color: "text-emerald-600 bg-emerald-50",
            },
            {
              label: "Total CashIn",
              value: dashboardData?.totalCashIn || "$482,900",
              change: "+5.2%",
              trend: "up",
              icon: FiArrowDownLeft,
              color: "text-cyan-600 bg-cyan-50",
            },
            {
              label: "Total Cashout",
              value: dashboardData?.totalCashOut || "$120,400",
              change: "-2.1%",
              trend: "down",
              icon: FiArrowUpRight,
              color: "text-rose-600 bg-rose-50",
            },
            {
              label: "Total Vaults Registered",
              value: dashboardData?.totalVaults || "6",
              change: "+1 active",
              trend: "up",
              icon: FiLayers,
              color: "text-purple-600 bg-purple-50",
            },
            {
              label: "Total Transferred Bags",
              value: dashboardData?.totalBags || "14",
              change: "Synced",
              trend: "up",
              icon: FiCheckCircle,
              color: "text-amber-600 bg-amber-50",
            },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-5 hover:border-slate-300 transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 group-hover:text-slate-500 transition-colors">{stat.label}</p>
                <div className={`p-2 rounded-xl font-semibold ${stat.color}`}>
                  <stat.icon size={16} />
                </div>
              </div>
              <h3 className="text-2xl font-bold tracking-tight text-slate-900 mb-1">{stat.value}</h3>
              <div className="flex items-center gap-1.5 text-xs">
                {stat.trend === "up" ? <FiTrendingUp className="text-emerald-500" /> : <FiTrendingDown className="text-rose-500" />}
                <span className={stat.trend === "up" ? "text-emerald-600 font-semibold" : "text-rose-600 font-semibold"}>{stat.change}</span>
                <span className="text-slate-400">vs last slice</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Row 2: Charts (2/3) & Pending Verifications (1/3) Dashboard Split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Flow Chart Box */}
          <div className="lg:col-span-2 bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-6 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">Transactional Health Matrix</h3>
                <p className="text-xs text-slate-400 mt-0.5">Continuous analytical distribution overlaying asset velocities.</p>
              </div>

              {/* Contextual indicators */}
              <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 bg-slate-50 px-3 py-1.5 border border-slate-100 rounded-xl">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-500 inline-block" />
                  Cash In
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                  Cash Out
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
                  Reconciliation
                </div>
              </div>
            </div>

            <div className="w-full h-[320px] mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={demoChartDataMatrix[timeframe]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "12px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)",
                    }}
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
            </div>
          </div>

          {/* Pending Verifications Side Panel */}
          <div className="flex flex-col gap-5">
            {/* Countdown Box */}
            <div className="bg-gradient-to-br from-indigo-50 to-slate-50 border border-indigo-100 rounded-2xl p-5  relative overflow-hidden">
              <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-indigo-500/5 blur-xl rounded-full" />
              <div>
                <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Next Vault Reconciliation</p>
                <h4 className="text-xl font-bold text-slate-900 mt-2 flex items-center gap-2">
                  <FiClock className="text-indigo-600" /> June 15, 2026
                </h4>
                <p className="text-xs text-slate-500 mt-1">Automatic state confirmation cycle starts in 13 days.</p>
              </div>
            </div>

            {/* Verification Queue Block */}
            <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-5  flex-1 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Verification Ledger</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Pending security authorization pipelines.</p>
                  </div>
                  <span className="bg-amber-50 text-amber-600 border border-amber-200 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    {pendingVerificationsDemo.length} Pending
                  </span>
                </div>

                <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200">
                  {pendingVerificationsDemo.map((item) => (
                    <div
                      key={item.id}
                      className="group flex justify-between items-center p-3 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-xl transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg text-xs font-bold ${
                            item.type === "Cash In"
                              ? "bg-cyan-50 text-cyan-600"
                              : item.type === "Cash Out"
                                ? "bg-rose-50 text-rose-600"
                                : "bg-purple-50 text-purple-600"
                          }`}
                        >
                          {item.type === "Cash In" ? "CI" : item.type === "Cash Out" ? "CO" : "VT"}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-800 group-hover:text-cyan-600 transition-colors">{item.id}</div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <span>{item.type}</span> &bull; <span>{item.time}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-bold text-slate-800">{item.amount}</div>
                        <div className="text-[10px] text-amber-600 flex items-center gap-1 justify-end mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block animate-pulse" />
                          <span>Review</span>
                        </div>
                      </div>
                    </div>
                  ))}
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
