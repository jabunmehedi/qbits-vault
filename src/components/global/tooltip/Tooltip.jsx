import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

const Tooltip = ({ children, title = "Are you sure?", onConfirm, confirmText = "Confirm", cancelText = "Cancel", isLoading = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);

  const handleTriggerClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top,
        left: rect.left + rect.width / 2,
      });
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  const handleConfirm = async () => {
    if (onConfirm) {
      await onConfirm();
    }
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block" ref={triggerRef} onClick={handleTriggerClick}>
      {/* This renders whatever button/icon you pass into it */}
      {children}

      {isOpen &&
        createPortal(
          <div className="fixed inset-0" style={{ zIndex: 999999 }}>
            {/* Click-outside backdrop wrapper */}
            <div
              className="absolute inset-0 bg-transparent"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              transition={{ duration: 0.15 }}
              style={{
                position: "fixed",
                top: `${coords.top - 80}px`,
                left: `${coords.left - 100}px`,
                // right: `${coords.right + 100}px`,
                transform: "translate(-50%, -100%)",
                pointerEvents: "auto",
              }}
              className="bg-white border border-gray-200 shadow-2xl rounded-xl p-3 flex flex-col gap-2 max-w-[180px]"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-xs  font-medium text-gray-700 text-center">{title}</p>

              <div className="flex gap-2 justify-center">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                  }}
                  disabled={isLoading}
                  className="px-2 py-1 text-[11px] font-semibold rounded-md border border-gray-200 hover:bg-gray-50 text-gray-600 cursor-pointer transition disabled:opacity-50"
                >
                  {cancelText}
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={isLoading}
                  className="px-2 py-1 text-[11px] font-semibold rounded-md bg-red-600 hover:bg-red-700 text-white flex items-center gap-1 cursor-pointer transition shadow-sm disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : confirmText}
                </button>
              </div>

              {/* Tooltip Indicator Triangle Arrow */}
              <div className="absolute top-[calc(100%-5px)] left-1/2 -translate-x-1/2 w-2 h-2 bg-white border-r border-b border-gray-200 transform rotate-45" />
            </motion.div>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default Tooltip;
