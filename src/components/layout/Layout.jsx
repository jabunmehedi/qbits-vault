import { Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { FiMenu } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";

import Sidebar from "./sidebar/Sidebar";
import InitialVerification from "../initialVerification/InitialVerification";

import { fetchAuthUser, selectIsSuperAdmin, selectIsFullyVerified } from "../../store/authSlice";

const AppShell = ({ isMobile, isMinimized, isDrawerOpen, setIsDrawerOpen, sidebarWidthClass, contentMargin, children }) => (
  <div className="min-h-screen text-white relative overflow-hidden">
    {isMobile && (
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-gray-100 lg:hidden">
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="text-lg font-medium text-gray-400">QBits Vault</span>
          <button onClick={() => setIsDrawerOpen(true)} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
            <FiMenu size={24} className="text-gray-500" />
          </button>
        </div>
      </header>
    )}

    <div className="flex h-screen pt-[64px] lg:pt-0">
      <Sidebar
        isMobile={isMobile}
        isMinimized={isMinimized}
        isDrawerOpen={isDrawerOpen}
        setIsDrawerOpen={setIsDrawerOpen}
        sidebarWidthClass={sidebarWidthClass}
      />

      <div className={`flex-1 flex flex-col ${contentMargin} transition-all duration-300 ease-in-out overflow-hidden`}>
        <main className="flex-1 overflow-y-auto bg-[#f8fafd] p-4 md:py-2">{children}</main>
      </div>

      {isMobile && isDrawerOpen && <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setIsDrawerOpen(false)} />}
    </div>
  </div>
);

// ── Layout ────────────────────────────────────────────────────────────────────
const Layout = () => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const dispatch = useDispatch();
  const isSuperAdmin = useSelector(selectIsSuperAdmin);
  const isFullyVerified = useSelector(selectIsFullyVerified);

  useEffect(() => {
    dispatch(fetchAuthUser());
  }, [dispatch]);

  // ── Responsive sidebar ───────────────────────────────────────────────────────
  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      setIsMinimized(mobile);
      if (mobile) setIsDrawerOpen(false);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const sidebarWidthClass = isMinimized ? "w-16" : "w-[220px]";
  const contentMargin = isMobile ? "ml-0" : isMinimized ? "ml-16" : "";

  // ── Verification gate ────────────────────────────────────────────────────────
  // if (!isSuperAdmin && !isFullyVerified) {
  //   return <InitialVerification onSuccess={() => dispatch(fetchAuthUser())} />;
  // }

  return (
    <AppShell
      isMobile={isMobile}
      isMinimized={isMinimized}
      isDrawerOpen={isDrawerOpen}
      setIsDrawerOpen={setIsDrawerOpen}
      sidebarWidthClass={sidebarWidthClass}
      contentMargin={contentMargin}
    >
      <Outlet />
    </AppShell>
  );
};

export default Layout;
