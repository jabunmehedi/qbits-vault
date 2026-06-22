import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, Link } from "react-router-dom";
import { FiHome, FiSettings, FiLogOut, FiSend, FiX, FiChevronDown } from "react-icons/fi";
import { AiOutlineAudit, AiOutlineUser } from "react-icons/ai";
import { CiInboxOut, CiVault as VaultIcon } from "react-icons/ci";
import { Logout } from "../../../services/Auth";
import { usePermissions } from "../../../hooks/usePermissions";
import { useSelector } from "react-redux";
import { selectAuthUser, selectIsSuperAdmin } from "../../../store/authSlice";
import { UserIcon } from "lucide-react";

const baseStorageUrl = import.meta.env.VITE_REACT_APP_STORAGE_URL;

const menuItems = [
  { icon: FiHome, label: "Overview", path: "/" },
  { icon: AiOutlineUser, label: "Users", permission: "user.view", path: "/users" },
  { icon: VaultIcon, label: "Vaults", permission: "vault.view", path: "/vault" },
  { icon: FiSend, label: "Cash In", permission: "cash-in.view", path: "/cashin" },
  { icon: CiInboxOut, label: "Cash Out", permission: "cash-out.view", path: "/cashout" },
  { icon: AiOutlineAudit, label: "Reconcile", permission: "reconciliation.view", path: "/reconcile" },
  {
    icon: AiOutlineAudit,
    label: "Reports",
    permission: "report.view",
    path: "/reports",
  },
  {
    icon: FiSettings,
    label: "Settings",
    permission: "setting.view",
    children: [
      { label: "Config Vault Audit", permission: "setting.config_audit_view", path: "/settings/config-vault-audit" },
      // { label: "System Preferences", permission: "setting.default_view", path: "/settings/system-preferences" },
      { label: "Logs", permission: "setting.log", path: "/settings/activity-log" },
    ],
  },
];

export default function Sidebar({ isMobile, isMinimized, isDrawerOpen, setIsDrawerOpen, sidebarWidthClass, setIsMinimized }) {
  const { pathname } = useLocation();
  const user = useSelector(selectAuthUser);
  const showLabel = !isMinimized || isMobile;
  const { hasPermission } = usePermissions();
  const isSuperAdmin = useSelector(selectIsSuperAdmin);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const isActive = (path) => path && (pathname === path || pathname.startsWith(`${path}/`));

  const handleLogout = () => {
    Logout().then(() => {
      localStorage.clear();
      window.location.href = "/login";
    });
  };

  const asideClasses = isMobile
    ? `fixed inset-y-0 left-0 z-50 w-[280px] max-w-[85vw] transform transition-transform duration-300 lg:hidden shadow-2xl bg-white/95 backdrop-blur-xl border-r border-slate-200
       ${isDrawerOpen ? "translate-x-0" : "-translate-x-full"}`
    : `relative z-30 bg-white/70 backdrop-blur-xl border-r border-slate-200/80  ${sidebarWidthClass}`;

  const resolvedAvatarSrc = user?.img ? `${baseStorageUrl}/${user.img}` : null;

  return (
    <motion.aside
      className={`h-full flex flex-col overflow-y-auto ${asideClasses}`}
      animate={isMobile ? undefined : { width: isMinimized ? 72 : 240 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <div className="flex flex-col h-full p-4 py-6">
        {/* Brand Header Section */}
        <div className="flex items-center justify-between mb-8 px-2 min-h-[40px]">
          <AnimatePresence mode="wait">
            {showLabel ? (
              <motion.img
                key="logo-full"
                src="/logo.png"
                alt="QBits Vault"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-8 w-auto object-contain mx-auto"
              />
            ) : (
              <motion.img
                key="logo-mini"
                src="/logo.png"
                alt="QBits Vault"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-7 w-auto object-contain mx-auto"
              />
            )}
          </AnimatePresence>

          {isMobile && (
            <button onClick={() => setIsDrawerOpen(false)} className="p-2 -mr-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors">
              <FiX size={20} />
            </button>
          )}
        </div>

        {/* Dynamic Nav links Area */}
        <nav className="flex-1 space-y-1.5">
          {menuItems
            .filter((item) => {
              if (isSuperAdmin) return true;
              if (item.permission && !hasPermission(item.permission)) return false;

              return true;
            })
            .map((item) => {
              const hasChildren = !!item.children;
              const active = isActive(item.path);

              if (hasChildren) {
                return (
                  <div key={item.label} className="w-full">
                    <button
                      onClick={() => {
                        if (isMinimized && !isMobile) {
                          setIsMinimized(false);
                        }
                        setIsSettingsOpen(!isSettingsOpen);
                      }}
                      className={`
                        w-full group text-[13px] font-semibold flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all duration-150 cursor-pointer
                        text-slate-500 hover:bg-slate-50 hover:text-slate-900
                      `}
                    >
                      <div className="flex items-center gap-3.5">
                        <item.icon size={18} className="text-slate-400 group-hover:text-slate-700 transition-colors" />
                        {showLabel && <span>{item.label}</span>}
                      </div>
                      {showLabel && (
                        <FiChevronDown
                          size={14}
                          className={`transform transition-transform duration-200 text-slate-400 ${isSettingsOpen ? "rotate-180" : ""}`}
                        />
                      )}
                    </button>

                    {/* Smooth Animate Submenu Dropdown */}
                    <AnimatePresence>
                      {isSettingsOpen && showLabel && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.15 }}
                          className="pl-6 mt-1 space-y-1 border-l border-slate-100 ml-5 overflow-hidden"
                        >
                          {item?.children
                            ?.filter((subItem) => {
                              if (isSuperAdmin) return true;
                              return !subItem.permission || hasPermission(subItem.permission);
                            })
                            .map((subItem) => {
                              const subActive = isActive(subItem.path);
                              return (
                                <Link key={subItem.label} to={subItem.path} onClick={isMobile ? () => setIsDrawerOpen(false) : undefined} className="block">
                                  <div
                                    className={`
                                    text-[12.5px] px-3.5 py-2 rounded-lg transition-all duration-150
                                    ${subActive ? "bg-blue-50/80 text-[#1a73e8] font-bold" : "text-slate-400 hover:bg-slate-50/80 hover:text-slate-800"}
                                  `}
                                  >
                                    {subItem.label}
                                  </div>
                                </Link>
                              );
                            })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              }

              return (
                <Link key={item.label} to={item.path ?? "#"} onClick={isMobile ? () => setIsDrawerOpen(false) : undefined} className="block">
                  <div
                    className={`
                      group text-[13px] font-medium flex items-center gap-3.5 px-3.5 py-2.5 rounded-md transition-all duration-150
                      ${active ? "bg-blue-50/80 text-[#1a73e8] font-bold" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}
                    `}
                  >
                    <item.icon
                      size={18}
                      className={`
                        transition-colors duration-150
                        ${active ? "text-[#1a73e8]" : "text-slate-400 group-hover:text-slate-700"}
                      `}
                    />
                    {showLabel && <span>{item.label}</span>}
                  </div>
                </Link>
              );
            })}
        </nav>

        {/* Footer Actions / Profiles Panel */}
        <div className="mt-auto pt-4 border-t border-slate-200/60 space-y-1">
          <Link
            to="/profile"
            onClick={isMobile ? () => setIsDrawerOpen(false) : undefined}
            className={`
              flex items-center gap-3 px-3 py-2 rounded-xl transition-all
              text-slate-600 hover:bg-slate-50/80 mb-1
              ${!showLabel && "justify-center px-1"}
            `}
          >
            <div className="w-8 h-8 rounded-full border border-slate-200 shadow-sm overflow-hidden flex-shrink-0 bg-white flex items-center justify-center">
              {resolvedAvatarSrc
                ? <img src={resolvedAvatarSrc} alt="Avatar" className="w-full h-full object-cover" />
                : <UserIcon className="w-4 h-4 text-gray-400" />
              }
            </div>
            {showLabel && (
              <div className="truncate flex flex-col">
                <span className="text-[13px] font-bold text-slate-800 truncate">{user.name || "User Admin"}</span>
                <span className="text-[11px] text-slate-400 truncate">View Profile</span>
              </div>
            )}
          </Link>

          <button
            onClick={() => {
              handleLogout();
              isMobile && setIsDrawerOpen(false);
            }}
            className={`
              w-full flex items-center cursor-pointer gap-3.5 px-3.5 py-2.5 rounded-xl transition-colors
              text-slate-400 hover:text-rose-600 hover:bg-rose-50/40 text-[13px] font-semibold
              ${!showLabel && "justify-center px-1"}
            `}
          >
            <FiLogOut size={16} className="flex-shrink-0" />
            {showLabel && <span>Sign Out</span>}
          </button>
        </div>
      </div>
    </motion.aside>
  );
}
