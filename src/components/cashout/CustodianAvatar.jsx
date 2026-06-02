import { motion } from "framer-motion";
import { useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import dayjs from "dayjs";

const CustodianAvatar = ({ custodian = [] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);

  const handleToggle = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();

      if (!isOpen && triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setCoords({
          top: rect.top,
          left: rect.left + rect.width / 2,
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
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white shadow-sm group-hover:scale-105 transition-transform ${
            custodian?.status === "verified" ? "bg-cyan-500 text-white" : "bg-gray-300 text-gray-600"
          }`}
        >
          {(custodian?.custodian?.name || "V").charAt(0).toUpperCase()}
        </div>
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
                top: `${coords.top - 100}px`,
                left: `${coords.left - 110}px`,
                transform: "translate(-50%, -100%)",
                pointerEvents: "auto",
              }}
              className="w-64 bg-[#0B1120] text-white rounded-xl shadow-2xl p-4 border border-slate-700"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">
                  Cash Received{" "}
                  <span className={` ${custodian?.status === "pending" ? "animate-pulse text-orange-400" : "text-green-400"}`}>({custodian?.amount})</span>
                </span>
                <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white">
                  ✕
                </button>
              </div>

              <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center border  text-xs font-bold ${custodian?.status === "verified" ? "text-white bg-indigo-400 border-indigo-700 " : "text-slate-500 bg-slate-800 border-slate-700 "}`}
                  >
                    {(custodian?.custodian?.name || "V").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold">{custodian?.custodian?.name || "Unknown"}</span>
                    <span className="text-[10px] text-slate-500">
                      {custodian?.verified_at ? dayjs(custodian?.verified_at).format("DD MMM, hh:mm A") : "Pending"}
                    </span>
                  </div>
                </div>
              </div>
              {/* Arrow */}
              <div className="absolute -bottom-1.5 left-1/14 -translate-x-1/2 w-3 h-3 bg-[#0B1120] border-r border-b border-slate-700 rotate-45" />
            </motion.div>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default CustodianAvatar;
