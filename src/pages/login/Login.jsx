import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiUser, FiLock, FiEye, FiEyeOff } from "react-icons/fi";
import { motion } from "framer-motion";
import { SignIn } from "../../services/Auth";

import { useToast } from "../../hooks/useToast";
import { useDispatch } from "react-redux";
import { login } from "../../store/authSlice";
import ForgetPasswordModel from "../../components/forgetPassword/ForgetPasswordModel";

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [openForgetPasswordModel, setOpenForgetPasswordModel] = useState(false);

  const { addToast } = useToast();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    setLoading(true);

    try {
      const res = await SignIn({ email, password });

      if (res?.success === true) {
        const auth = {
          access_token: res?.data?.access_token,
          user: res?.data?.user,
        };

        sessionStorage.removeItem("kyc_modal_shown");

        dispatch(login(auth));
        localStorage.setItem("auth", JSON.stringify(auth));
        navigate("/");
      } else {
        // 401, 400, 403, etc.
        addToast({
          type: "error",
          message: res?.data?.message || "Login failed. Please check your credentials.",
        });
      }
    } catch (error) {
      console.error("Login error:", error);

      let message = "Something went wrong. Please try again.";

      if (error?.response?.data?.message) {
        message = error.response.data.message;
      } else if (error.message === "Network Error") {
        message = "Cannot connect to server. Check your internet.";
      }

      addToast({ type: "error", message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center px-4 overflow-hidden relative">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative w-full max-w-md"
      >
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden px-10 py-12">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold text-gray-600 mb-2 tracking-tight">QBits Vault</h1>
            <p className="text-gray-400 text-sm">Access your secure vault</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username Field */}
            <div className="relative">
              <div className="absolute inset-0 bg-gray-100 rounded-xl blur-lg opacity-50"></div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
              <div className="relative bg-gray-100 backdrop-blur-md border border-gray-200 rounded-xl px-4 py-2 flex items-center gap-3 transition-all focus-within:bg-white/20">
                <FiUser className="text-sm text-gray-600" />
                <input
                  type="text"
                  placeholder="Username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent text-gray-600 placeholder-gray-400 outline-none text-lg"
                  required
                  autoComplete="username"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="relative">
              <div className="absolute inset-0 bg-gray-100 rounded-xl blur-lg opacity-50"></div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
              <div className="relative bg-gray-100 backdrop-blur-md border border-gray-200 rounded-xl px-4 py-2 flex items-center gap-3 transition-all focus-within:bg-white/20">
                <FiLock className="text-sm text-gray-600" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent text-gray-600 placeholder-gray-400 outline-none text-lg flex-1"
                  required
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-gray-400 hover:text-gray-600 transition"
                  disabled={loading}
                >
                  {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center text-sm">
              {/* Remember me (commented out) */}
              <div />
              <div onClick={() => setOpenForgetPasswordModel(true)} className="text-cyan-500 cursor-pointer hover:text-cyan-300 transition font-medium">
                {/* Forgot password? */}
              </div>
            </div>

            <motion.button
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              type="submit"
              disabled={loading}
              // className={`w-full py-4 font-semibold text-lg rounded-xl transition-all duration-300
              //   ${
              //     loading
              //       ? "bg-gray-100 text-gray-500 cursor-not-allowed"
              //       : "bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-lg hover:shadow-cyan-500/50 hover:translate-y-[-2px]"
              //   }`}
              className="w-full py-2  hover:bg-gray-50 bg-indigo-500 hover:text-gray-800 text-white  text-md rounded-lg border border-gray-300 shadow-sm hover:shadow-md transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <svg className="
                   h-5 w-5 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                </>
              ) : (
                "Log In"
              )}
            </motion.button>
          </form>

          <p className="text-center text-gray-400 text-sm mt-8">Product of QBits Computer</p>
          <p className="text-center text-gray-300 text-sm mt-8">
            Design & Developed By <span className="text-indigo-500">Pippa Technologies Inc.</span>
          </p>
        </div>
      </motion.div>

      {openForgetPasswordModel && <ForgetPasswordModel isCloseModal={() => setOpenForgetPasswordModel(false)} />}
    </div>
  );
};

export default Login;
