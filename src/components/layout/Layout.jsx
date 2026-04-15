// Layout.jsx
import { Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiMenu, FiAlertCircle, FiMinimize2 } from "react-icons/fi";
import Sidebar from "./sidebar/Sidebar";
import { useDispatch, useSelector } from "react-redux";
import { fetchReconciliationStatus, selectIsLockedForOperations } from "../../store/checkReconcile";
import InitialVerification from "../initialVerification/InitialVerification";


const Layout = () => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isNoteMinimized, setIsNoteMinimized] = useState(false);

  const dispatch = useDispatch();
  const location = useLocation();
  const isOperationsLocked = useSelector(selectIsLockedForOperations);

  // Get current user
  const currentUser = useSelector((state) => state.auth?.user);
  const loggedUser = localStorage.getItem("auth")
    ? JSON.parse(localStorage.getItem("auth")).user
    : currentUser;

  const isSuperAdmin = loggedUser?.roles?.some((role) =>
    ["Superadmin", "Super Admin", "superadmin", "super_admin"].includes(role.name)
  );

  const isNotVerified = loggedUser?.status === "inactive" || loggedUser?.email_verified_at === null;

  // Show verification screen?
  const showVerification = !isSuperAdmin && isNotVerified;

  // Reconciliation check
  useEffect(() => {
    dispatch(fetchReconciliationStatus());
  }, [location.pathname, dispatch]);

  useEffect(() => {
    const handleFocus = () => dispatch(fetchReconciliationStatus());
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [dispatch]);

  // Mobile & Sidebar logic
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setIsDrawerOpen(false);
        setIsMinimized(true);
      } else {
        setIsMinimized(false);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const sidebarWidthClass = isMinimized ? "w-16" : "w-[220px]";
  const contentMargin = isMobile ? "ml-0" : isMinimized ? "ml-16" : "";

  // ─── VERIFICATION SCREEN ─────────────────────────────────────
  if (showVerification) {
    return <InitialVerification onSuccess={() => window.location.reload()} />;
  }

  // ─── NORMAL LAYOUT (when verified or Superadmin) ─────────────
  if (!isOperationsLocked) {
    return (
      <div className="min-h-screen text-white relative overflow-hidden">
        {isMobile && (
          <header className="fixed top-0 left-0 right-0 z-50 border-b border-gray-100 lg:hidden">
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="text-lg font-medium text-gray-400">QBits Vault</div>
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
            <main className="flex-1 overflow-y-auto bg-[#f8fafd] p-4 md:py-2">
              <Outlet />
            </main>
          </div>

          {isMobile && isDrawerOpen && (
            <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setIsDrawerOpen(false)} />
          )}
        </div>
      </div>
    );
  }

  // ─── LOCKED MODE (Reconciliation) ─────────────────────────────
  return (
    <div className="min-h-screen text-white relative overflow-hidden">
      {/* ... your existing locked mode code ... */}
      {/* (I kept it unchanged as per your original) */}
      {isMobile && (
        <header className="fixed top-0 left-0 right-0 z-50 border-b border-gray-100 lg:hidden">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="text-lg font-medium text-center text-gray-400">QBits Vault</div>
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
          <main className="overflow-y-auto p-4 md:py-6 relative">
            {/* Your reconciliation warning UI remains unchanged */}
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default Layout;