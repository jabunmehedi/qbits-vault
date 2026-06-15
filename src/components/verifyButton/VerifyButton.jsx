import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../utils/cn";
import { Loader2, X } from "lucide-react";

const VerifyButton = ({ children, isOpen, setOpen, className, handleSubmit, handleReject, isLoading, title = "Verify", rejectTitle = "Reject this request?" }) => {
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectNote, setRejectNote] = useState("");

  const handleToggle = (e) => {
    e.stopPropagation();
    setOpen(!isOpen);
  };

  useEffect(() => {
    if (!isOpen) {
      setRejectMode(false);
      setRejectNote("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        if (rejectMode) setRejectMode(false);
        else setOpen(false);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, setOpen, rejectMode]);

  const handleRejectConfirm = () => {
    handleReject(rejectNote);
    setOpen(false);
  };

  return (
    <div className="relative inline-block">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleToggle}
        className={cn(
          "relative px-5 py-1.5 rounded-xl text-xs font-bold transition-all z-10",
          "bg-[#1a73e8] text-white shadow-lg shadow-blue-200 hover:bg-blue-600",
          isOpen && "ring-4 ring-blue-200",
        )}
      >
        {title}
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

            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                key="modal"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 350 }}
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  "pointer-events-auto w-full bg-white rounded-3xl shadow-[0_30px_60px_-12px_rgba(0,0,0,0.4)] border border-slate-100 p-8 overflow-hidden relative",
                  className,
                )}
              >
                <div className="relative z-10">
                  <button
                    type="button"
                    onClick={() => rejectMode ? setRejectMode(false) : setOpen(false)}
                    className="absolute top-0 right-0 p-1 rounded-full transition-colors group"
                  >
                    <X className="w-4 h-4 text-gray-400 group-hover:text-red-400 cursor-pointer" />
                  </button>

                  {rejectMode ? (
                    <div className="space-y-4">
                      <div className="text-center">
                        <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
                          <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                        <p className="text-sm font-semibold text-slate-700">{rejectTitle}</p>
                        <p className="text-xs text-slate-400 mt-1">Provide a reason (optional)</p>
                      </div>
                      <textarea
                        value={rejectNote}
                        onChange={(e) => setRejectNote(e.target.value)}
                        placeholder="Enter rejection reason..."
                        rows={3}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-200 resize-none"
                      />
                    </div>
                  ) : (
                    <div className="mb-6">{children}</div>
                  )}

                  <div className="flex items-center gap-3 mt-6">
                    <button
                      onClick={() => rejectMode ? setRejectMode(false) : setOpen(false)}
                      className="flex-1 py-2.5 text-sm font-bold border border-gray-200 text-gray-600 hover:text-red-400 hover:bg-gray-50 rounded-xl transition-colors"
                    >
                      {rejectMode ? "Back" : "Cancel"}
                    </button>

                    {!rejectMode && handleReject && (
                      <button
                        onClick={() => setRejectMode(true)}
                        disabled={isLoading}
                        className="flex-1 py-2.5 text-sm font-bold bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 rounded-xl transition-all disabled:opacity-50"
                      >
                        Reject
                      </button>
                    )}

                    {rejectMode ? (
                      <button
                        disabled={isLoading}
                        onClick={handleRejectConfirm}
                        className="flex-1 py-2.5 text-sm flex items-center justify-center font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all disabled:opacity-50"
                      >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Reject"}
                      </button>
                    ) : (
                      <button
                        disabled={isLoading}
                        onClick={() => handleSubmit()}
                        className={`flex-1 py-2.5 text-sm flex items-center justify-center font-bold rounded-xl transition-all ${isLoading ? "bg-gray-100 cursor-not-allowed text-gray-400" : "bg-[#1a73e8] hover:bg-blue-600 text-white shadow-lg shadow-blue-200"}`}
                      >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm"}
                      </button>
                    )}
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
