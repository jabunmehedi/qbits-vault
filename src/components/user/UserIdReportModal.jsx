import { motion, AnimatePresence } from "framer-motion";
import { X, FileText, User, Loader2 } from "lucide-react";

const UserIdReportModal = ({ isOpen, onClose, userId, user, currentAddress, isDownloading, onDownload }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4 overflow-y-auto"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-zinc-800 w-full max-w-xl h-full rounded-2xl shadow-2xl overflow-hidden flex flex-col my-4"
          >
            <div className="bg-zinc-900 border-b border-zinc-700 px-5 py-3 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-bold">Identity Report Preview</h3>
              </div>
              <button onClick={onClose} className="p-1 hover:bg-zinc-700 rounded-lg transition">
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>

            <div className="p-6 bg-zinc-700 flex justify-center overflow-y-auto h-full">
              <div className="w-full bg-white rounded-md p-6 flex flex-col justify-between relative text-black font-sans border border-zinc-200 shadow-xl max-w-lg">
                <div>
                  <div className="flex justify-between items-center border-b-[3px] border-[#1a2b4b] pb-2 mb-4">
                    <h1 className="text-lg font-black tracking-tight text-[#1a2b4b] uppercase">Verified Personnel Profile</h1>
                    <div className="text-right text-[9px] text-gray-500 font-mono leading-tight font-bold">
                      REF ID: #{userId}
                      <br />
                      DATE: {new Date().toLocaleDateString("en-GB")}
                    </div>
                  </div>

                  <div className="flex gap-5 mb-4">
                    <div className="w-[28%] flex-shrink-0">
                      {user?.img ? (
                        <img src={user.img} alt={user.name} className="w-full aspect-square object-cover rounded-lg border border-gray-200" />
                      ) : (
                        <div className="w-full aspect-square rounded-lg border border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center text-gray-400 gap-0.5">
                          <User size={18} strokeWidth={1.5} />
                          <span className="text-[8px] font-bold uppercase">No Photo</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      <h2 className="text-xl font-black text-[#1a2b4b] tracking-tight leading-tight">{user?.name}</h2>
                      <p className="text-xs italic text-gray-500 mb-3">{user?.email}</p>
                      <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest block mb-1.5 border-b border-gray-200 pb-0.5">
                        Official Contact Information
                      </span>
                      <div className="bg-[#f8fafc] border border-[#f1f5f9] rounded-lg p-3 grid grid-cols-2 gap-2.5">
                        <div className="col-span-2">
                          <b className="block text-[8px] text-gray-400 uppercase tracking-wider">Current Registered Address</b>
                          <p className="text-[11px] font-bold text-[#1e293b] leading-tight mt-0.5">{currentAddress}</p>
                        </div>
                        <div>
                          <b className="block text-[8px] text-gray-400 uppercase tracking-wider">Primary Phone</b>
                          <p className="text-[11px] font-bold text-[#1e293b] mt-0.5">{user?.phone || "N/A"}</p>
                        </div>
                        <div>
                          <b className="block text-[8px] text-gray-400 uppercase tracking-wider">Document Status</b>
                          <p className="text-[11px] font-bold text-emerald-600 mt-0.5">✓ ACTIVE & VERIFIED</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2">
                    <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest block mb-1.5 border-b border-gray-200 pb-0.5">
                      National Identity Card (NID)
                    </span>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="w-full h-28 aspect-[3/2] bg-[#f8fafc] border border-gray-300 rounded-lg overflow-hidden flex items-center justify-center p-1">
                          {user?.nid_front ? <img src={user.nid_front} alt="NID Front" className="w-full h-full object-contain" /> : <span className="text-[10px] text-gray-400 font-medium">Front Side Missing</span>}
                        </div>
                        <p className="text-[9px] font-bold text-gray-500 text-center mt-1 uppercase tracking-wide">NID: Front View</p>
                      </div>
                      <div>
                        <div className="w-full h-28 aspect-[3/2] bg-[#f8fafc] border border-gray-300 rounded-lg overflow-hidden flex items-center justify-center p-1">
                          {user?.nid_back ? <img src={user.nid_back} alt="NID Back" className="w-full h-full object-contain" /> : <span className="text-[10px] text-gray-400 font-medium">Back Side Missing</span>}
                        </div>
                        <p className="text-[9px] font-bold text-gray-500 text-center mt-1 uppercase tracking-wide">NID: Back View</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="border-t border-gray-200 pt-2 flex justify-between items-center text-[8px] text-gray-400 font-mono font-bold mt-6">
                  <div>THIS IS A SYSTEM GENERATED DOCUMENT</div>
                  <div>SECURITY HASH: {userId ? `SEC-${userId}X79` : "N/A"}</div>
                </div>
              </div>
            </div>
            <div className="bg-zinc-900 border-t border-zinc-700 p-3 flex gap-2 justify-end">
              <button onClick={onClose} className="px-3 py-3 bg-zinc-800 border border-zinc-600 text-zinc-300 hover:bg-zinc-700 text-xs font-semibold rounded-md transition">Cancel</button>
              <button onClick={onDownload} disabled={isDownloading} className="flex items-center gap-1.5 bg-[#1a73e8] hover:bg-blue-600 text-white px-4 py-3 rounded-md text-xs font-semibold transition shadow-md shadow-blue-200 disabled:opacity-75">
                {isDownloading ? <Loader2 size={14} className="animate-spin" /> : "Download"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default UserIdReportModal;