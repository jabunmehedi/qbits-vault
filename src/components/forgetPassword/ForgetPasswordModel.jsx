import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Loader2, KeyRound, AlertCircle, CheckCircle2 } from "lucide-react";
import CustomModal from "../global/modal/CustomModal";
import { ForgetPassword } from "../../services/User";
import { useToast } from "../../hooks/useToast";

const ForgetPasswordModel = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: null, message: "" });

  const { addToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setStatus({ type: null, message: "" });

    try {
      const res = await ForgetPassword(email);

      if (!res?.success) {
        setStatus({
          type: "error",
          message: res?.data?.message || "Something went wrong. Please check your email address.",
        });
        return;
      }

      addToast({
        type: "success",
        message: res?.data?.message || "Password reset link has been dispatched to your email address.",
      });

      setEmail("");
      onClose();
    } catch (err) {
      console.error("Forget password error:", err);
      setStatus({
        type: "error",
        message: err?.response?.data?.message || "Something went wrong. Please check your email address.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <CustomModal isOpen={isOpen} onClose={onClose} className="max-w-md" title="Reset Your Password">
      <div className="w-full  p-2 text-black font-sans">
        {/* Decorative Top Branding Icon Illustration Area */}
        <div className="flex justify-center mb-5">
          <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100/50">
            <KeyRound className="w-6 h-6 animate-pulse" />
          </div>
        </div>

        {/* Header Text Groupings */}
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-gray-900 tracking-tight">Forgot Password?</h3>
          <p className="text-xs text-gray-400 mt-1.5 max-w-[85%] mx-auto leading-relaxed">
            No worries! Enter your registered email address below, and we'll send you instructions to reset your password safely.
          </p>
        </div>

        {/* Dynamic Status / Feedback Alert System Panels */}
        <AnimatePresence mode="wait">
          {status.type && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className={`mb-5 p-3.5 rounded-xl border text-xs flex items-start gap-3 ${
                status.type === "success" ? "bg-emerald-50/60 border-emerald-100 text-emerald-800" : "bg-rose-50/60 border-rose-100 text-rose-800"
              }`}
            >
              {status.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span className="font-medium leading-relaxed">{status.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Action Input form body wrapper */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <Mail size={16} />
              </div>
              <input
                type="email"
                required
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition duration-200 disabled:opacity-60"
              />
            </div>
          </div>

          {/* Form Modal Actions Footer Triggers Row */}
          <div className="flex gap-2.5 justify-end pt-2 border-t border-gray-50 mt-6">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="px-6 py-2.5 text-sm font-bold text-gray-600 border border-gray-200 rounded-xl hover:text-red-400 hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-[#1a73e8] hover:bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-200 transition-all disabled:opacity-50 disabled:pointer-events-none min-w-[140px]"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Reset Link"
              )}
            </button>
          </div>
        </form>
      </div>
    </CustomModal>
  );
};

export default ForgetPasswordModel;
