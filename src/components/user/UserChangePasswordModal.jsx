import { AnimatePresence, motion } from "framer-motion";
import { Eye, EyeOff, KeyRound, Loader2, X } from "lucide-react";
import { useState } from "react";

const UserChangePasswordModal = ({
  showPasswordModal,
  setShowPasswordModal,
  passwordMutation,
  handlePasswordSubmit,
  userName,
  newPassword,
  setNewPassword,
}) => {
  const [showPasswordText, setShowPasswordText] = useState(false);
  return (
    <AnimatePresence>
      {showPasswordModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            if (!passwordMutation.isPending) setShowPasswordModal(false);
          }}
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[90] flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden text-black border border-gray-100"
          >
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                  <KeyRound size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Change Password</h3>
                  <p className="text-[11px] text-gray-400">Set a new password for {userName}</p>
                </div>
              </div>
              <button
                onClick={() => setShowPasswordModal(false)}
                disabled={passwordMutation.isPending}
                className="p-1 hover:bg-gray-100 rounded-lg transition text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form Content Input Field Area */}
            <form onSubmit={handlePasswordSubmit}>
              <div className="p-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">New Password</label>
                  <div className="relative">
                    <input
                      type={showPasswordText ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      disabled={passwordMutation.isPending}
                      required
                      className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl pl-3.5 pr-10 py-2.5 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordText(!showPasswordText)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                    >
                      {showPasswordText ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Form Controls Action Triggers Footer */}
              <div className="bg-gray-50 border-t border-gray-100 px-5 py-3.5 flex gap-2 justify-end">
                <button
                  type="button"
                  disabled={passwordMutation.isPending}
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-200/60 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordMutation.isPending || !newPassword.trim()}
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50"
                >
                  {passwordMutation.isPending ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Password"
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default UserChangePasswordModal;
