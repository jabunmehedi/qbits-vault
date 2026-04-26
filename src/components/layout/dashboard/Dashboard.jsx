// Dashboard.jsx
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FiTrendingUp, FiTrendingDown } from "react-icons/fi";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { GetDashboardReports } from "../../../services/Dashboard";
import { useSelector } from "react-redux";
import { selectAuthUser, selectIsSuperAdmin } from "../../../store/authSlice";
import KYCReminderModal from "../../kycModal/KYCReminderModal";

const chartData = [
  { name: "Jan", value: 24000 },
  { name: "Feb", value: 32000 },
  { name: "Mar", value: 28000 },
  { name: "Apr", value: 45000 },
  { name: "May", value: 68000 },
  { name: "Jun", value: 82000 },
  { name: "Jul", value: 98000 },
];

export default function Dashboard() {
  // const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dashboardData, setDashboardData] = useState({});
  const [showKYCModal, setShowKYCModal] = useState(false);

  const authUser = useSelector(selectAuthUser);

  const isSuperAdmin = useSelector(selectIsSuperAdmin);


  useEffect(() => {
    GetDashboardReports().then((res) => {
      setDashboardData(res.data);
    });
  }, []);

  useEffect(() => {
    const hasSeenModal = sessionStorage.getItem("kyc_modal_shown");

    // Show if: User exists AND KYC is null AND they haven't seen it THIS session
    if (authUser && authUser.kyc_verified_at === null && !hasSeenModal && !isSuperAdmin) {
      setShowKYCModal(true);
    }
  }, [authUser]);

  const handleCloseModal = () => {
    setShowKYCModal(false);
    // Set flag so it doesn't show again until next login/session
    sessionStorage.setItem("kyc_modal_shown", "true");
  };

  return (
    <div className=" h-screen">
      {/* Mobile Sidebar Overlay */}

      <KYCReminderModal isOpen={showKYCModal} onClose={handleCloseModal} />

      {/* Main Content */}
      <div className=" w-full!  p-4 ">
        {/* Top Bar */}

        {/* Dashboard Content */}
        <main className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {[
              { label: "Remaining Balance", value: dashboardData?.totalVaultBalance, change: "+12.5%", trend: "up" },
              { label: "Total CashIn", value: dashboardData?.totalCashIn, change: "+5.2%", trend: "up" },
              { label: "Total Cashout", value: dashboardData?.totalCashOut, change: "-2.1%", trend: "down" },
              { label: "Total Vaults", value: "6", change: "+1", trend: "up" },
              { label: "Total Bags", value: "6", change: "+1", trend: "up" },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white backdrop-blur-xl border border-gray-200 rounded-2xl p-6 hover:bg-white/15 transition"
              >
                <div className="flex items-center justify-between mb-4">
                  <p className="text-gray-400">{stat.label}</p>
                  {stat.trend === "up" ? <FiTrendingUp className="text-green-400" /> : <FiTrendingDown className="text-red-400" />}
                </div>
                <h3 className="text-3xl font-bold text-gray-600 mb-2">{stat.value}</h3>
                <p className={`text-sm ${stat.trend === "up" ? "text-green-400" : "text-red-400"}`}>{stat.change} from last month</p>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white backdrop-blur-xl border border-white/20 rounded-2xl p-6">
              <h3 className="text-xl font-semibold text-white mb-6">Portfolio Growth</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis dataKey="name" stroke="#ffffff50" />
                  <YAxis stroke="#ffffff50" />
                  <Tooltip contentStyle={{ background: "rgba(0,0,0,0.8)", border: "none" }} />
                  <Area type="monotone" dataKey="value" stroke="#06b6d4" fillOpacity={1} fill="url(#colorGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
              {/* <h3 className="text-xl font-semibold text-white mb-6">Quick Actions</h3> */}
              {/* <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: FiSend, label: "Cash In", color: "from-purple-500 to-pink-500" },
                  { icon: FiDownload, label: "Cash Out", color: "from-cyan-500 to-blue-500" },
                  { icon: FiCopy, label: "Reconciliation", color: "from-green-500 to-emerald-500" },
                  { icon: FiEye, label: "View Seed", color: "from-red-500 to-rose-500" },
                ].map((action) => (
                  <motion.button
                    key={action.label}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`p-6 bg-gradient-to-br ${action.color} rounded-2xl text-white font-medium flex flex-col items-center gap-3 shadow-lg`}
                  >
                    <action.icon size={28} />
                    <span>{action.label}</span>
                  </motion.button>
                ))}
              </div> */}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
