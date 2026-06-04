import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { ConfirmResetPassword } from "../../services/User";
import { useToast } from "../../hooks/useToast";
import { useNavigate } from "react-router-dom";

const ResetPassword = () => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  const email = params.get("email");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { addToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      setStatus({ type: "error", msg: "All password fields are required." });
      return;
    }

    if (password !== confirmPassword) {
      setStatus({ type: "error", msg: "Passwords do not match." });
      return;
    }

    if (password.length < 6) {
      setStatus({ type: "error", msg: "Password must be at least 6 characters long." });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const payload = {
        token,
        email,
        password,
        password_confirmation: confirmPassword,
      };
      const res = await ConfirmResetPassword(payload);

      if (!res?.success) {
        setStatus({ type: "error", msg: res?.data?.message || "Something went wrong. Please request a new link." });
        return;
      }
      navigate("/login");
      addToast({ type: "success", message: "Password updated successfully! You can close this tab and log in." });
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setStatus({
        type: "error",
        msg: err?.response?.data?.message || "Something went wrong. Please request a new link.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center px-4 overflow-hidden relative">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="bg-white/80 backdrop-blur-xl rounded-3xl max-w-md shadow-2xl border border-white/20 overflow-hidden px-10 py-6"
      >
        <div className="py-8">
          {/* Header Graphic/Text Wrapper */}
          <div className="text-center mb-8">
            <div className="text-center mb-2">
              <h1 className="text-xl font-bold text-gray-600 mb-2 tracking-tight">QBits Vault</h1>
            </div>
            <h2 className="text-2xl font-semibold text-[#1a2b4b] tracking-tight">Create New Password</h2>
            <p className="text-xs text-gray-400 mt-1.5 max-w-[80%] mx-auto leading-relaxed">
              Please enter your strong new credentials below to secure and finalize account recovery.
            </p>
          </div>

          {/* Dynamic Action Alerts Messaging System */}
          <AnimatePresence mode="wait">
            {status && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className={`mb-6 p-4 rounded-xl border text-xs flex items-start gap-3 ${
                  status.type === "success" ? "bg-emerald-50 border-emerald-100 text-emerald-800" : "bg-rose-50 border-rose-100 text-rose-800"
                }`}
              >
                {status.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <span className="font-semibold leading-relaxed">{status.msg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Context Inputs Form Body */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* New Password Input Group */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">New Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock size={16} />
                </div>
                <input
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-10 py-2.5 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition duration-200 disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm Password Input Group */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Confirm Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock size={16} />
                </div>
                <input
                  type={showConfirmPass ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-10 py-2.5 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition duration-200 disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                >
                  {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2  hover:bg-gray-50 bg-indigo-500 hover:text-gray-800 text-white  text-md rounded-lg border border-gray-300 shadow-sm hover:shadow-md transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3"
              >
                {loading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Updating Password...
                  </>
                ) : (
                  "Update Password"
                )}
              </button>
            </div>
            <p className="text-center text-gray-400 text-sm mt-8">
              Design & Developed By <span className="text-indigo-500">Pippa Technologies Inc.</span>
            </p>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
