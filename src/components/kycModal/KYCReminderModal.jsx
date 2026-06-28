import { motion, AnimatePresence } from "framer-motion";
import { ShieldEllipsisIcon, ShieldCheck, X } from "lucide-react";
import { useState } from "react";
import { useSelector } from "react-redux";
import { selectAuthUser } from "../../store/authSlice";
import KYCUploadModal from "./KYCUploadModal";

const KYCReminderModal = ({ isOpen, onClose }) => {
  const [showUpload, setShowUpload] = useState(false);
  const user = useSelector(selectAuthUser);

  const docsSubmitted = !!(user?.nid_front_img && user?.nid_back_img);

  return (
    <>
      <AnimatePresence>
        {isOpen && !showUpload && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[32px] p-8 shadow-2xl text-center"
            >
              <button
                onClick={onClose}
                className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              {docsSubmitted ? (
                <>
                  <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center">
                      <ShieldCheck className="w-10 h-10 text-blue-500" />
                    </div>
                  </div>

                  <h2 className="text-2xl font-bold text-[#1e293b] mb-4">Documents Under Review</h2>
                  <p className="text-gray-500 leading-relaxed mb-8 px-4">
                    Your KYC documents have been submitted and are{" "}
                    <span className="font-bold text-blue-600">pending admin verification</span>.
                    You will be notified once your account is verified.
                  </p>

                  <div className="flex gap-3">
                    <button
                      onClick={onClose}
                      className="flex-1 py-3.5 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-all"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => setShowUpload(true)}
                      className="flex-1 py-3.5 bg-[#0f172a] text-white text-sm font-semibold rounded-2xl hover:bg-[#1e293b] transition-all active:scale-[0.98]"
                    >
                      Update Documents
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 bg-orange-50 rounded-2xl flex items-center justify-center">
                      <ShieldEllipsisIcon className="w-10 h-10 text-orange-500" />
                    </div>
                  </div>

                  <h2 className="text-2xl font-bold text-[#1e293b] mb-4">KYC Reminder</h2>
                  <p className="text-gray-500 leading-relaxed mb-8 px-4">
                    Please complete your <span className="font-bold text-[#1e293b]">KYC Verification</span> within 30 days.
                    Failure to do so will result in your account being{" "}
                    <span className="text-red-500 font-semibold">disabled</span>.
                  </p>

                  <div className="flex gap-3">
                    <button
                      onClick={onClose}
                      className="flex-1 py-3.5 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-all"
                    >
                      Remind Me Later
                    </button>
                    <button
                      onClick={() => setShowUpload(true)}
                      className="flex-1 py-3.5 bg-[#0f172a] text-white text-sm font-semibold rounded-2xl hover:bg-[#1e293b] transition-all active:scale-[0.98]"
                    >
                      Complete KYC
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <KYCUploadModal
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        onSuccess={onClose}
      />
    </>
  );
};

export default KYCReminderModal;
