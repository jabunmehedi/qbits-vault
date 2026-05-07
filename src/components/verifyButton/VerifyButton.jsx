import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../utils/cn";
import { Loader2 } from "lucide-react";

const VerifyButton = ({ children, isOpen, setOpen, className, handleVerifyClick, isLoading }) => {
  const handleToggle = (e) => {
    e.stopPropagation();
    setOpen(!isOpen);
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, setOpen]);

  return (
    <div className="relative inline-block">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleToggle}
        className={cn(
          "relative px-5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all z-10",
          "bg-indigo-600 text-white shadow-lg hover:bg-indigo-700",
          isOpen && "ring-4 ring-indigo-200",
        )}
      >
        Verify
      </motion.button>

      {isOpen &&
        createPortal(
          <AnimatePresence>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9998] cursor-pointer"
              onClick={() => setOpen(false)}
            />

            {/* Modal Wrapper - Centers the content */}
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                key="modal"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 350 }}
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  "pointer-events-auto w-full  bg-white rounded-3xl shadow-[0_30px_60px_-12px_rgba(0,0,0,0.4)] border border-slate-100 p-8 overflow-hidden relative",
                  className,
                )}
              >
                <div className="relative z-10">
                  <div className="mb-6">{children}</div>

                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setOpen(false)}
                      className="flex-1 py-3 text-[11px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      disabled={isLoading}
                      onClick={() => handleVerifyClick()}
                      className={`flex-1 py-3 text-[11px] flex items-center justify-center font-bold uppercase tracking-widest ${isLoading ? "bg-indigo-50 cursor-not-allowed border border-indigo-200" : "bg-indigo-600 shadow-xl shadow-indigo-200 hover:bg-indigo-700"} text-white rounded-2xl    active:scale-95 transition-all`}
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" /> : "Confirm"}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
};

export default VerifyButton;
