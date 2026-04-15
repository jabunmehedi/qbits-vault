import { motion } from "framer-motion";
import { useLocation, Link } from "react-router-dom";
import { FiHome, FiSettings, FiLogOut, FiSend, FiRefreshCw, FiX, FiMenu } from "react-icons/fi";
import { AiOutlineAudit, AiOutlineUser } from "react-icons/ai";
import { CiInboxOut, CiVault } from "react-icons/ci";
import { Shield } from "lucide-react";

import { Logout } from "../../../services/Auth";

const menuItems = [
  { icon: FiHome, label: "Overview", path: "/" },
  { icon: AiOutlineUser, label: "Users", path: "/users" },
  { icon: CiVault, label: "Vaults", path: "/vault" },
  { icon: FiSend, label: "Cash In", path: "/cashin" },
  { icon: CiInboxOut, label: "Cash Out", path: "/cashout" },
  { icon: AiOutlineAudit, label: "Reconcile", path: "/reconcile" },
  { icon: Shield, label: "Verifications", path: "/verifications" },
  { icon: FiSettings, label: "Permissions", path: "/role-and-permissions" },
  { icon: FiSettings, label: "Settings" },
  { icon: FiRefreshCw, label: "Activity Log", path: "/activity-log" },
];

export default function Sidebar({ isMobile, isMinimized, isDrawerOpen, setIsDrawerOpen, sidebarWidthClass }) {
  const { pathname } = useLocation();
  const user = JSON.parse(localStorage.getItem("auth"))?.user ?? {};
  const showLabel = !isMinimized || isMobile;

  const isActive = (path) => path && (pathname === path || pathname.startsWith(`${path}/`));

  const handleLogout = () => {
    Logout().then(() => {
      localStorage.clear();
      window.location.href = "/login";
    });
  };

  const asideClasses = isMobile
    ? `fixed inset-y-0 left-0 z-50 w-[280px] max-w-[85vw] transform transition-transform duration-300 lg:hidden
       ${isDrawerOpen ? "translate-x-0" : "-translate-x-full"}`
    : `relative z-30 ${sidebarWidthClass}`;

  return (
    <motion.aside
      className={`h-full backdrop-blur-3xl border-r border-gray-200 flex flex-col overflow-y-auto ${asideClasses}`}
      animate={isMobile ? undefined : { width: isMinimized ? 64 : 220 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <div className="flex flex-col h-full p-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-10 px-2">
          <h1 className={`text-xl font-semibold text-gray-400 ${showLabel ? "block" : "hidden"}`}>{isMinimized && !isMobile ? "QBV" : "QBits Vault"}</h1>

          {isMobile ? (
            <button onClick={() => setIsDrawerOpen(false)} className="p-2 -mr-2 rounded-lg hover:bg-white/10">
              <FiX size={24} className="text-gray-300" />
            </button>
          ) : (
            <button
              onClick={() => setIsMinimized((v) => !v)}
              className="p-2 rounded-lg hover:bg-white/10 text-gray-400"
              aria-label={isMinimized ? "Expand" : "Minimize"}
            >
              {isMinimized && <FiMenu size={20} />}
            </button>
          )}
        </div>

        {/* Menu */}
        <nav className="flex-1 space-y-1">
          {menuItems.map((item) => {
            const active = isActive(item.path);

            return (
              <Link key={item.label} to={item.path ?? "#"} onClick={isMobile ? () => setIsDrawerOpen(false) : undefined} className="block">
                <div
                  className={`
            group text-[14px] flex items-center gap-4 px-4 py-2 rounded-lg transition-all duration-200
            ${active ? "bg-[#e8f3ff93] text-indigo-500 " : "text-gray-500 hover:bg-gray-50 hover:text-indigo-500"}
          `}
                >
                  <item.icon
                    size={16}
                    className={`
              transition-colors duration-200
              ${active ? "text-indigo-500" : "text-gray-500 group-hover:text-indigo-500"}
            `}
                  />
                  {showLabel && <span className="text-sm">{item.label}</span>}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="mt-auto pt-6 border-t border-gray-100/20">
          <Link
            to="/profile"
            onClick={isMobile ? () => setIsDrawerOpen(false) : undefined}
            className={`
              flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
              text-gray-500  hover:text-indigo-200 mb-2
              ${!showLabel && "justify-center px-2"}
            `}
          >
            <div className="w-10 h-10 rounded-full border-2 border-gray-600/40 overflow-hidden flex-shrink-0">
              <img
                src="https://images.unsplash.com/photo-1633332755192-727a05c4013d?auto=format&fit=crop&w=880&q=80"
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            </div>
            {showLabel && <span className="text-sm hover:text-indigo-500 truncate">{user.name || "User"}</span>}
          </Link>

          <button
            onClick={() => {
              handleLogout();
              isMobile && setIsDrawerOpen(false);
            }}
            className={`
              w-full flex items-center cursor-pointer gap-3 px-4 py-3 rounded-lg transition-colors
              text-gray-500  hover:text-red-400
              ${!showLabel && "justify-center px-2"}
            `}
          >
            <FiLogOut size={20} />
            {showLabel && <span className="text-sm">Logout</span>}
          </button>
        </div>
      </div>
    </motion.aside>
  );
}
