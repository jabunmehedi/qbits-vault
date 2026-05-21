import { motion } from "framer-motion";
import { X } from "lucide-react";

const CustomModal = ({ isCloseModal, children, title = "Modal", className = "" }) => {
  const hasWidth = className.includes("max-w-") || className.includes("w-");
  const widthFallback = hasWidth ? "" : "max-w-2xl";

  return (
    <div className="fixed inset-0 bg-black/70 flex flex-col z-[999] overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4 sm:p-8">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={`bg-white border border-[#353857] rounded-4xl w-full flex flex-col overflow-hidden max-h-[90vh] ${widthFallback} ${className}`}
        >
          {/* Header */}
          <div className="flex items-center justify-between py-7 px-8 bg-[#fcfcfd]">
            <div className="text-black font-semibold text-lg">{title}</div>
            <button
              type="button" // CRITICAL: Ensures clicking X doesn't submit forms
              onClick={isCloseModal}
              className="p-1 rounded-full  transition-colors group"
            >
              <X className="w-4 h-4 text-gray-400 group-hover:text-red-400 cursor-pointer" />
            </button>
          </div>

          {/* Content */}
          <div className="px-10 pb-10 text-gray-600 overflow-y-auto custom-scrollbar">{children}</div>
        </motion.div>
      </div>
    </div>
  );
};

export default CustomModal;
