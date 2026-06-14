import { motion } from "framer-motion";
import { useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import dayjs from "dayjs";

const VerifierAvatars = ({ requiredVerifiers = [], isRejected = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);

  if (!requiredVerifiers?.length) return <span className="text-gray-400 text-[10px]">None</span>;

  const handleToggle = useCallback(
    (e) => {
      // Stop ALL other actions in the table
      e.preventDefault();
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();

      if (!isOpen && triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setCoords({
          top: rect.top,
          bottom: rect.bottom,
          left: rect.left + rect.width / 2,
          flipDown: rect.top < 200,
        });
      }
      setIsOpen((prev) => !prev);
    },
    [isOpen, triggerRef],
  );

  return (
    <div className="relative inline-block" style={{ isolation: "auto" }}>
      {/* Clickable Stack */}
      <div
        ref={triggerRef}
        onClickCapture={handleToggle} // Using Capture phase to beat table listeners
        className="flex items-center -space-x-3 cursor-pointer p-1 group"
      >
        {requiredVerifiers.slice(0, 3).map((v, i) => (
          <div
            key={i}
            className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white shadow-sm group-hover:scale-105 transition-transform ${
              v.rejected_at ? "bg-red-500 text-white" : v.verified || v.approved ? "bg-green-500 text-white" : "bg-yellow-400 text-white"
            }`}
          >
            {(v.name || v.user?.name || "U").charAt(0).toUpperCase()}
          </div>
        ))}
        {requiredVerifiers.length > 3 && (
          <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center justify-center border-2 border-white">
            +{requiredVerifiers.length - 3}
          </div>
        )}
      </div>

      {isOpen &&
        createPortal(
          <div className="fixed inset-0" style={{ zIndex: 999999 }}>
            {/* Transparent Backdrop */}
            <div
              className="absolute inset-0 bg-black/5"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              style={{
                position: "fixed",
                top: coords.flipDown ? `${coords.bottom + 8}px` : `${coords.top - 8}px`,
                left: `${coords.left}px`,
                transform: coords.flipDown ? "translateX(-50%)" : "translate(-50%, -100%)",
                pointerEvents: "auto",
              }}
              className="w-64 bg-[#0B1120] text-white rounded-xl shadow-2xl p-4 border border-slate-700"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold tracking-widest text-blue-400 uppercase">Verifier Details</span>
                  {isRejected && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 uppercase tracking-wide">Rejected</span>
                  )}
                </div>
                <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white">
                  ✕
                </button>
              </div>

              <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
                {requiredVerifiers.map((v, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center border text-xs font-bold ${v.rejected_at ? "text-white bg-red-500 border-red-700" : v.verified || v.approved ? "text-white bg-green-500 border-green-700" : "text-white bg-yellow-400 border-yellow-500"}`}
                    >
                      {(v.name || v.user?.name || "U").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold">{v.name || v.user?.name}</span>
                      <span className="text-[10px] text-slate-500">
                        {v.rejected_at
                          ? `Rejected · ${dayjs(v.rejected_at).format("DD MMM, hh:mm A")}`
                          : v.verified_at || v.approved_at
                          ? dayjs(v.verified_at || v.approved_at).format("DD MMM, hh:mm A")
                          : "Pending"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {/* Arrow */}
              <div className={`absolute left-1/2 -translate-x-1/2 w-3 h-3 bg-[#0B1120] border-slate-700 rotate-45 ${coords.flipDown ? "-top-1.5 border-l border-t" : "-bottom-1.5 border-r border-b"}`} />
            </motion.div>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default VerifierAvatars;
