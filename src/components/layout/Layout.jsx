// Layout.jsx
import { Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiMenu, FiAlertCircle, FiMinimize2 } from "react-icons/fi";
import Sidebar from "./sidebar/Sidebar";
import { useDispatch, useSelector } from "react-redux";
import { fetchReconciliationStatus, selectIsLockedForOperations } from "../../store/checkReconcile";
import { FaAngleDoubleDown } from "react-icons/fa";

const Layout = () => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isNoteMinimized, setIsNoteMinimized] = useState(false);

  // Reconciliation status
  const dispatch = useDispatch();
  const location = useLocation();
  const isOperationsLocked = useSelector(selectIsLockedForOperations);

  useEffect(() => {
    dispatch(fetchReconciliationStatus());
  }, [location.pathname, dispatch]);

  useEffect(() => {
    const handleFocus = () => dispatch(fetchReconciliationStatus());
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [dispatch]);

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

  // ─── NOT LOCKED ─── Normal layout
  if (!isOperationsLocked) {
    return (
      <div className="min-h-screen text-white relative overflow-hidden">
        {isMobile && (
          <header className="fixed top-0 left-0 right-0 z-50 border-b border-gray-100 lg:hidden">
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="text-lg font-medium text-gray-400">QBits Vault</div>
              <button
                onClick={() => setIsDrawerOpen(true)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Open menu"
              >
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
            <main className="flex-1 overflow-y-auto bg-[#F4F4F4] p-4 md:py-2">
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

  // ─── LOCKED MODE ─── Animated warning note + fixed center-top icon
  return (
    <div className="min-h-screen text-white relative overflow-hidden">
      {isMobile && (
        <header className="fixed top-0 left-0 right-0 z-50 border-b border-gray-100 lg:hidden">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="text-lg font-medium text-center text-gray-400">QBits Vault</div>
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Open menu"
            >
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
            <AnimatePresence>
              {/* Full centered warning + backdrop */}
              {!isNoteMinimized && (
                <motion.div
                  key="backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-[60]"
                  onClick={() => setIsNoteMinimized(true)}
                >
                  <motion.div
                    key="card"
                    initial={{ opacity: 0, scale: 0.85, y: 40 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.85, y: 20 }}
                    transition={{ duration: 0.4, type: "spring", stiffness: 300, damping: 25 }}
                    className="bg-gradient-to-br from-red-900/95 to-red-800/95 border-2 border-red-600/70 rounded-2xl p-8 max-w-md w-[90vw] max-h-[80vh] shadow-2xl relative backdrop-blur-md"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => setIsNoteMinimized(true)}
                      className="absolute top-4 right-4 text-red-200 hover:text-white p-2 rounded-xl hover:bg-red-700/40 transition-all duration-200 hover:scale-110"
                      title="Minimize"
                      aria-label="Minimize warning"
                    >
                      <FiMinimize2 size={22} />
                    </button>

                    <div className="flex items-start gap-4 mb-6">
                      <FiAlertCircle size={36} className="text-red-400 mt-1 drop-shadow-lg" />
                      <div>
                        <h3 className="text-2xl font-bold text-white mb-2">Reconciliation In Progress</h3>
                        <p className="text-red-200 text-base">Vault is temporarily locked</p>
                      </div>
                    </div>

                    <p className="text-red-100 leading-relaxed mb-6 text-base">
                      No cash in, cash out, transfers, adjustments or new reconciliations are allowed until reconciliation is completed.
                    </p>

                    <button
                      onClick={() => setIsNoteMinimized(true)}
                      className="w-full bg-red-700 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-lg hover:shadow-red-600/40"
                    >
                      Understood – Show as Icon
                    </button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Fixed center-top minimized icon */}
            <AnimatePresence>
              {isNoteMinimized && (
                <motion.div
                  key="minimized-icon"
                  initial={{ opacity: 0, y: -30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -30 }}
                  transition={{ duration: 0.4, type: "spring", stiffness: 400, damping: 25 }}
                  className="fixed top-2 left-1/2 -translate-x-1/2 z-[100]"
                >
                  <button
                    onClick={() => setIsNoteMinimized(false)}
                    className="relative bg-gradient-to-br from-red-200 to-red-400 text-white px-4 py-2 rounded shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 border border-red-400/50 backdrop-blur-md hover:shadow-red-500/60 group"
                    title="Click to show reconciliation warning"
                    aria-label="Reconciliation active – click to expand"
                  >
                    {/* Pulsing alert indicator
                    <div className="absolute -top-2 -right-2 w-5 h-5 bg-yellow-400 rounded-full animate-ping opacity-75"></div>
                    <div className="absolute -top-2 -right-2 w-5 h-5 bg-yellow-400 rounded-full"></div> */}

                    <FaAngleDoubleDown size={14} className="drop-shadow-lg" />

                    {/* Hover effect */}
                    <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-30 bg-white/20 transition-opacity duration-200 pointer-events-none" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <Outlet />
          </main>
        </div>

        {isMobile && isDrawerOpen && (
          <div className="fixed z-40 lg:hidden" onClick={() => setIsDrawerOpen(false)} />
        )}
      </div>
    </div>
  );
};

export default Layout;