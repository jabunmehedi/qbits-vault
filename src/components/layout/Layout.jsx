// Layout.jsx
import { Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { FiMenu } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import { Loader2 } from "lucide-react";

import Sidebar from "./sidebar/Sidebar";
import InitialVerification from "../initialVerification/InitialVerification";

import { fetchAuthUser, selectAuthLoading, selectIsSuperAdmin, selectIsFullyVerified, selectAuthUser } from "../../store/authSlice";
import { fetchReconciliationStatus, selectIsLockedForOperations } from "../../store/checkReconcile";

// ── AppShell declared OUTSIDE Layout — fixes "component created during render" ─
// Props passed explicitly instead of closing over Layout's state
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
  const location = useLocation();

  const authUser = useSelector(selectAuthUser);
  const authLoading = useSelector(selectAuthLoading);
  const isSuperAdmin = useSelector(selectIsSuperAdmin);
  const isFullyVerified = useSelector(selectIsFullyVerified);
  const isOperationsLocked = useSelector(selectIsLockedForOperations);

  // ── Fetch fresh user from API on mount ───────────────────────────────────────
  useEffect(() => {
    dispatch(fetchAuthUser());
  }, [dispatch]);

  // ── Reconciliation polling ───────────────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchReconciliationStatus());
  }, [location.pathname, dispatch]);

  useEffect(() => {
    const onFocus = () => dispatch(fetchReconciliationStatus());
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
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

  // ── Spinner while user loads ─────────────────────────────────────────────────
  if (authLoading || !authUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafd]">
        <Loader2 size={36} className="animate-spin text-[#0061ff]" />
      </div>
    );
  }

  // ── Verification gate ────────────────────────────────────────────────────────
  if (!isSuperAdmin && !isFullyVerified) {
    return <InitialVerification onSuccess={() => dispatch(fetchAuthUser())} />;
  }

  // ── Render (normal + locked both use the same AppShell) ──────────────────────
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
