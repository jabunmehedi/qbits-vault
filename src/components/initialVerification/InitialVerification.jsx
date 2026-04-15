import { useState } from "react";
import axiosConfig from "../../utils/axiosConfig";
import { Check, Shield, Upload, ArrowRight, Loader2 } from "lucide-react";

const InitialVerification = ({ onSuccess }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Form States
  const [emailCode, setEmailCode] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [address, setAddress] = useState("");

  // Handle Email Verification (Step 1)
  const handleVerifyEmail = async () => {
    if (!emailCode.trim()) {
      setError("Please enter verification code");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const response = await axiosConfig.post("/email/verify", {
        code: emailCode.trim(),
      });

      setSuccess(true);
      setError("");

      // Move to next step after short delay for UX
      setTimeout(() => {
        setStep(2);
        setSuccess(false);
        setEmailCode("");
      }, 1200);
    } catch (err) {
      setError(
        err.response?.data?.message || 
        "Invalid or expired verification code. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      onSuccess(); // Complete all steps
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 1: // Email Verification
        return (
          <div className="w-full max-w-sm">
            <h2 className="text-3xl font-bold text-[#0f172a] mb-2">Email Verification</h2>
            <p className="text-gray-600 mb-8">
              Enter the 6-digit code sent to your email
            </p>

            <input
              type="text"
              placeholder="Enter verification code"
              className="w-full px-5 py-4 bg-[#f8fafc] border border-gray-200 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none text-lg tracking-widest text-center mb-6"
              value={emailCode}
              onChange={(e) => setEmailCode(e.target.value)}
              maxLength={6}
            />

            {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
            {success && <p className="text-green-600 text-sm mb-4 text-center">✓ Email verified successfully!</p>}

            <button
              onClick={handleVerifyEmail}
              disabled={loading || emailCode.length < 4}
              className="w-full bg-[#0061ff] hover:bg-blue-700 disabled:bg-gray-400 text-white py-4 rounded-2xl font-semibold flex items-center justify-center gap-3 transition-all text-lg"
            >
              {loading ? (
                <>
                  <Loader2 size={22} className="animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  Verify Email <ArrowRight size={20} />
                </>
              )}
            </button>
          </div>
        );

      case 2: // Phone / OTP Verification
        return (
          <div className="w-full max-w-sm text-center lg:text-left">
            <h2 className="text-3xl font-bold text-[#0f172a] mb-6">Phone Verification</h2>
            <p className="text-gray-600 mb-8">Enter the OTP sent to your phone</p>

            <div className="flex gap-3 mb-10 justify-center">
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  type="text"
                  maxLength="1"
                  className="w-14 h-14 text-center border border-gray-200 rounded-2xl bg-[#f8fafc] text-2xl font-bold focus:border-blue-500 focus:ring-2 outline-none"
                  value={digit}
                  onChange={(e) => {
                    const newOtp = [...otp];
                    newOtp[idx] = e.target.value;
                    setOtp(newOtp);

                    // Auto focus next input
                    if (e.target.value && idx < 5) {
                      const nextInput = e.target.nextSibling;
                      if (nextInput) nextInput.focus();
                    }
                  }}
                />
              ))}
            </div>

            <button
              onClick={handleNext}
              className="w-full bg-[#0061ff] text-white py-4 rounded-2xl font-semibold hover:bg-blue-700 transition-colors text-lg"
            >
              Verify OTP
            </button>
          </div>
        );

      case 3: // Address
        return (
          <div className="w-full max-w-sm">
            <h2 className="text-3xl font-bold text-[#0f172a] mb-6">Permanent Address</h2>
            <textarea
              placeholder="Enter your full permanent address..."
              rows="5"
              className="w-full px-5 py-4 bg-[#f8fafc] border border-gray-200 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none resize-none mb-6"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
            <button
              onClick={handleNext}
              className="w-full bg-[#0061ff] text-white py-4 rounded-2xl font-semibold hover:bg-blue-700 transition-colors text-lg"
            >
              Save & Continue
            </button>
          </div>
        );

      case 4: // KYC
        return (
          <div className="w-full max-w-sm">
            <h2 className="text-3xl font-bold text-[#0f172a] mb-6">KYC Verification</h2>
            <div className="space-y-4 mb-8">
              {["National ID (Front)", "National ID (Back)", "Passport Size Photo"].map((label, i) => (
                <div
                  key={i}
                  className="border-2 border-dashed border-gray-300 rounded-2xl p-6 flex items-center gap-4 hover:border-blue-400 hover:bg-blue-50/50 cursor-pointer transition-all"
                >
                  <Upload size={28} className="text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-700">{label}</p>
                    <p className="text-xs text-gray-500">Click to upload</p>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={handleNext}
              className="w-full bg-[#0f172a] hover:bg-black text-white py-4 rounded-2xl font-semibold text-lg transition-colors"
            >
              Complete Registration
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[620px]">
        {/* Left Sidebar */}
        <div className="w-full md:w-[35%] bg-[#0b1221] p-10 flex flex-col">
          <div className="mb-12">
            <div className="w-12 h-12 bg-[#0061ff] rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(0,97,255,0.5)]">
              <Shield className="text-white" size={26} />
            </div>
          </div>

          <div className="space-y-10">
            {[
              { id: 1, title: "Email Verify" },
              { id: 2, title: "Verification" },
              { id: 3, title: "Address" },
              { id: 4, title: "KYC" },
            ].map((s) => {
              const isActive = step === s.id;
              const isCompleted = step > s.id;

              return (
                <div key={s.id} className="flex items-center gap-5">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-300 border-2 ${
                      isActive
                        ? "bg-[#0061ff] border-[#0061ff] shadow-lg"
                        : isCompleted
                        ? "bg-[#0061ff] border-[#0061ff]"
                        : "border-gray-700"
                    }`}
                  >
                    {isCompleted ? (
                      <Check size={20} className="text-white" />
                    ) : (
                      <span className={`font-bold text-lg ${isActive ? "text-white" : "text-gray-500"}`}>
                        {s.id}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">STEP {s.id}</p>
                    <p className={`font-semibold ${isActive || isCompleted ? "text-white" : "text-gray-500"}`}>
                      {s.title}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Content */}
        <div className="flex-1 flex items-center justify-center p-8 md:p-12">
          {renderStepContent()}
        </div>
      </div>
    </div>
  );
};

export default InitialVerification;