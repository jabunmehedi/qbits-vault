import { useState } from "react";
import axiosConfig from "../../utils/axiosConfig";

const ResetPassword = () => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  const email = params.get("email");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (password !== confirmPassword) {
      setStatus({ type: "error", msg: "Passwords do not match" });
      return;
    }
    setLoading(true);
    try {
      await axiosConfig.post("/users/reset-password/confirm", {
        token,
        email,
        password,
        password_confirmation: confirmPassword,
      });
      setStatus({ type: "success", msg: "Password reset! You can now log in." });
    } catch (err) {
      setStatus({ type: "error", msg: err?.response?.data?.message || "Something went wrong" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-[#1a2b4b] mb-2">Set New Password</h2>
        <p className="text-gray-500 text-sm mb-6">Enter your new password below.</p>

        <input
          type="password"
          placeholder="New Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 mb-3 text-sm outline-none focus:border-indigo-400"
        />
        <input
          type="password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 mb-4 text-sm outline-none focus:border-indigo-400"
        />

        {status && <p className={`text-sm mb-4 ${status.type === "error" ? "text-red-500" : "text-green-600"}`}>{status.msg}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold transition disabled:opacity-50"
        >
          {loading ? "Resetting..." : "Reset Password"}
        </button>
      </div>
    </div>
  );
};

export default ResetPassword;
