import { motion, AnimatePresence } from "framer-motion";
import { ShieldEllipsisIcon, X } from "lucide-react";


const KYCReminderModal = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-[32px] p-8 shadow-2xl text-center"
          >
            {/* Close Button */}
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Icon Header */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-orange-50 rounded-2xl flex items-center justify-center">
                <ShieldEllipsisIcon className="w-10 h-10 text-orange-500" />
              </div>
            </div>

            {/* Content */}
            <h2 className="text-2xl font-bold text-[#1e293b] mb-4">
              KYC Reminder
            </h2>
            <p className="text-gray-500 leading-relaxed mb-8 px-4">
              Please complete your <span className="font-bold text-[#1e293b]">KYC Verification</span> within 30 days. 
              Failure to do so will result in your account being <span className="text-red-500 font-semibold">disabled</span>.
            </p>

            {/* Action Button */}
            <button
              onClick={onClose}
              className="w-full py-4 bg-[#0f172a] text-white font-semibold rounded-2xl hover:bg-[#1e293b] transition-all active:scale-[0.98]"
            >
              Understood
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default KYCReminderModal;