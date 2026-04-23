import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import axiosConfig from "../../utils/axiosConfig";
import { Check, Shield, ArrowRight, Loader2, Phone } from "lucide-react";

import {
  fetchAuthUser,
  patchAuthUser,
  selectAuthUser,
  selectAuthLoading,
  selectIsEmailVerified,
  selectIsPhoneVerified,
  selectIsAddressSaved,
  selectIsKycVerified,
} from "../../store/authSlice";
import { useDivisions, useDistricts } from "bd-geo-location/react";
import { IoDocumentTextOutline } from "react-icons/io5";
import { UserVerification } from "../../services/User";

const InitialVerification = ({ onSuccess }) => {
  const dispatch = useDispatch();

  // ── All state from Redux — zero localStorage reads ───────────────────────────
  const loggedUser = useSelector(selectAuthUser);
  const userLoading = useSelector(selectAuthLoading);
  const isEmailVerified = useSelector(selectIsEmailVerified);
  const isPhoneVerified = useSelector(selectIsPhoneVerified);
  const isAddressSaved = useSelector(selectIsAddressSaved);
  const isKycDone = useSelector(selectIsKycVerified);

  // Case 3 Address States
  const [currentAddr, setCurrentAddr] = useState({ street: "", divisionId: "", districtId: "", upazilaId: "" });
  const [permanentAddr, setPermanentAddr] = useState({ street: "", divisionId: "", districtId: "", upazilaId: "" });
  const [isSame, setIsSame] = useState(false);

  // Current Address Data
  const curDivisions = useDivisions();
  const curDistricts = useDistricts(currentAddr.divisionId);
  // Extract upazilas from the selected district object
  const curUpazilas = curDistricts?.find((d) => d.id === currentAddr.districtId)?.upazilas || [];

  // Permanent Address Data
  const perDivisions = useDivisions();
  const perDistricts = useDistricts(permanentAddr.divisionId);
  const perUpazilas = perDistricts?.find((d) => d.id === permanentAddr.districtId)?.upazilas || [];

  // ── Step: null until user loads, then computed once ──────────────────────────
  const [step, setStep] = useState(null);

  useEffect(() => {
    if (!loggedUser) return;
    if (!isEmailVerified) return setStep(1);
    if (!isPhoneVerified) return setStep(2);
    if (!isAddressSaved) return setStep(3);
    if (!isKycDone) return setStep(4);
    onSuccess?.();
  }, [loggedUser, isEmailVerified, isPhoneVerified, isAddressSaved, isKycDone]);



  // ── Local UI state ────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [emailCode, setEmailCode] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [showOtpView, setShowOtpView] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [address, setAddress] = useState("");
  const [kycFiles, setKycFiles] = useState({ front: null, back: null, photo: null });

  // Pre-fill phone / address once user loads
  useEffect(() => {
    if (loggedUser?.phone) setPhoneNumber(loggedUser.phone);
    if (loggedUser?.address) setAddress(loggedUser.address);
  }, [loggedUser]);

  // Auto-send OTP if user has phone but hasn't verified yet
  useEffect(() => {
    if (step === 2 && loggedUser?.phone && !isPhoneVerified && !showOtpView) {
      handleSendOtp(loggedUser.phone);
    }
  }, [step, loggedUser]);

  // Sync logic for Case 3 (Address)
  useEffect(() => {
    if (isSame) {
      setPermanentAddr({ ...currentAddr });
    } else {
      setPermanentAddr({
        street: "",
        divisionId: "",
        districtId: "",
        upazilaId: "",
      });
    }
  }, [currentAddr, isSame]);

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const handleSendOtp = async (phone) => {
    setLoading(true);
    setError("");
    try {
      await axiosConfig.post("/phone/send-otp", { phone });
      setShowOtpView(true);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!emailCode.trim()) return setError("Please enter the verification code");
    setLoading(true);
    setError("");
    setSuccess(false);
    try {
      await axiosConfig.post("/email/verify", { code: emailCode.trim() });
      setSuccess(true);
      // Optimistic update — no re-fetch needed
      dispatch(patchAuthUser({ email_verified_at: new Date().toISOString() }));
      setTimeout(() => {
        setSuccess(false);
        setEmailCode("");
        setStep(2);
      }, 1200);
    } catch (err) {
      setError(err.response?.data?.message || "Invalid or expired code.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    setLoading(true);
    setError("");
    try {
      const fullOtp = otp.join("");
      await axiosConfig.post("/phone/verify", { otp: fullOtp, phone: phoneNumber });
      dispatch(
        patchAuthUser({
          phone: phoneNumber,
          phone_verified_at: new Date().toISOString(),
        }),
      );
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.message || "Invalid OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAddress = async () => {
    if (!currentAddr.street || !currentAddr.upazilaId) {
      return setError("Please complete your address");
    }

    setLoading(true);
    setError("");

    try {
      // Helper to extract names from IDs for Current Address
      const currentPayload = {
        street: currentAddr.street,
        division: curDivisions?.find((d) => d.id === currentAddr.divisionId)?.name || "",
        district: curDistricts?.find((d) => d.id === currentAddr.districtId)?.name || "",
        upazila: curUpazilas?.find((u) => u.id === currentAddr.upazilaId)?.name || "",
      };

      // Helper to extract names from IDs for Permanent Address
      const permanentPayload = {
        street: permanentAddr.street,
        division: perDivisions?.find((d) => d.id === permanentAddr.divisionId)?.name || "",
        district: perDistricts?.find((d) => d.id === permanentAddr.districtId)?.name || "",
        upazila: perUpazilas?.find((u) => u.id === permanentAddr.upazilaId)?.name || "",
      };

      const finalPayload = {
        current: currentPayload,
        permanent: permanentPayload,
      };

      await axiosConfig.post("/user/verification", finalPayload);

      // Optimistically update Redux with the names for display
      dispatch(
        patchAuthUser({
          current_address: currentPayload.street,
          current_division: currentPayload.division,
          current_district: currentPayload.district,
          current_thana: currentPayload.upazila,
          permanent_address: permanentPayload.street,
          permanent_division: permanentPayload.division,
          permanent_district: permanentPayload.district,
          permanent_thana: permanentPayload.upazila,
        }),
      );
      setStep(4);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save address.");
    } finally {
      setLoading(false);
    }
  };

  // const handleCompleteKyc = async () => {
  //   setLoading(true);
  //   setError("");
  //   try {
  //     const formData = new FormData();
  //     if (kycFiles.front) formData.append("nid_front", kycFiles.front);
  //     if (kycFiles.back) formData.append("nid_back", kycFiles.back);
  //     if (kycFiles.photo) formData.append("photo", kycFiles.photo);

  //     await axiosConfig.post("/user/kyc", formData, {
  //       headers: { "Content-Type": "multipart/form-data" },
  //     });

  //     // Re-fetch to get latest verified/kyc_verified_at from server
  //     await dispatch(fetchAuthUser());
  //     onSuccess?.();
  //   } catch (err) {
  //     setError(err.response?.data?.message || "KYC submission failed.");
  //   } finally {
  //     setLoading(false);
  //   }
  // };
  const handleCompleteKyc = async () => {
    setLoading(true);
    setError("");
    const formData = new FormData();

    try {

      if (kycFiles.front) formData.append("nid_front_img", kycFiles.front);
      if (kycFiles.back) formData.append("nid_back_img", kycFiles.back);
      if (kycFiles.photo) formData.append("img", kycFiles.photo);


      await axiosConfig.post(`/user/verification`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // 4. Refresh Redux state
      await dispatch(fetchAuthUser()).unwrap();

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error("KYC Error:", err);
      setError(err.response?.data?.message || "KYC submission failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleSkipKyc = async () => {
    try {
      await UserVerification({ is_skip: 1 });

      await dispatch(fetchAuthUser()).unwrap();

      if (typeof onSuccess === "function") {
        onSuccess();
      }
    } catch (error) {
      console.error("Failed to skip KYC:", error);
    }
  };

  // ── OTP input helpers ─────────────────────────────────────────────────────────
  const handleOtpInput = (e, idx) => {
    const val = e.target.value.replace(/\D/, "");
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    if (val && idx < 5) e.target.nextSibling?.focus();
  };

  const handleOtpKeyDown = (e, idx) => {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) {
      e.target.previousSibling?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    setOtp(pasted.split("").concat(Array(6).fill("")).slice(0, 6));
  };

  // ── Loading skeleton ──────────────────────────────────────────────────────────
  if (userLoading || step === null) {
    return (
      <div className="min-h-screen bg-[#f1f5f9] flex items-center justify-center">
        <Loader2 size={36} className="animate-spin text-[#0061ff]" />
      </div>
    );
  }

  // ── Sidebar config ────────────────────────────────────────────────────────────
  const STEPS = [
    { id: 1, title: "Email Verify", done: isEmailVerified },
    { id: 2, title: "Phone Verify", done: isPhoneVerified },
    { id: 3, title: "Address", done: isAddressSaved },
    { id: 4, title: "KYC", done: isKycDone },
  ];

  // ── Step content ──────────────────────────────────────────────────────────────
  const renderStepContent = () => {
    switch (step) {
      // ── Step 1: Email ─────────────────────────────────────────────────────────
      case 1:
        return (
          <div className="w-full max-w-sm">
            <h2 className="text-3xl font-bold text-[#0f172a] mb-2">Email Verification</h2>
            <p className="text-gray-400 mb-8">
              We've sent a code to <span className="text-gray-700 font-semibold">{loggedUser?.email}</span>
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
            {success && <p className="text-green-600 text-sm mb-4 text-center">✓ Email verified!</p>}

            <button
              onClick={handleVerifyEmail}
              disabled={loading || emailCode.length < 4}
              className="w-full bg-[#0061ff] hover:bg-blue-700 disabled:bg-gray-300 text-white py-4 rounded-2xl font-semibold flex items-center justify-center gap-3 transition-all text-lg"
            >
              {loading ? (
                <>
                  <Loader2 size={22} className="animate-spin" /> Verifying...
                </>
              ) : (
                <>
                  Verify Email <ArrowRight size={20} />
                </>
              )}
            </button>
          </div>
        );

      // ── Step 2: Phone ─────────────────────────────────────────────────────────
      case 2:
        return (
          <div className="w-full max-w-sm">
            <h2 className="text-3xl font-bold text-[#0f172a] mb-2">Phone Verification</h2>

            {!showOtpView ? (
              <>
                <p className="text-gray-400 mb-8">Enter your mobile number to receive an OTP.</p>
                <div className="relative mb-6">
                  <Phone className="absolute left-4 top-4 text-gray-400" size={20} />
                  <input
                    type="tel"
                    placeholder="e.g. +8801XXXXXXXXX"
                    className="w-full pl-12 pr-5 py-4 bg-[#f8fafc] border border-gray-200 rounded-2xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>
                {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
                <button
                  onClick={() => handleSendOtp(phoneNumber)}
                  disabled={loading || !phoneNumber.trim()}
                  className="w-full bg-[#0061ff] hover:bg-blue-700 disabled:bg-gray-300 text-white py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all"
                >
                  {loading ? <Loader2 className="animate-spin" size={22} /> : "Send Code"}
                </button>
              </>
            ) : (
              <>
                <p className="text-gray-400 mb-8">
                  Enter the OTP sent to <span className="text-gray-700 font-semibold">{phoneNumber}</span>
                </p>
                <div className="flex gap-2 mb-8 justify-center" onPaste={handleOtpPaste}>
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      className="w-12 h-14 text-center border border-gray-200 rounded-xl bg-[#f8fafc] text-xl font-bold focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                      value={digit}
                      onChange={(e) => handleOtpInput(e, idx)}
                      onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                    />
                  ))}
                </div>
                {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
                <button
                  onClick={handleVerifyPhoneOtp}
                  disabled={loading || otp.join("").length < 6}
                  className="w-full bg-[#0061ff] hover:bg-blue-700 disabled:bg-gray-300 text-white py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all"
                >
                  {loading ? <Loader2 className="animate-spin" size={22} /> : "Verify OTP"}
                </button>
                <button
                  onClick={() => {
                    setShowOtpView(false);
                    setOtp(["", "", "", "", "", ""]);
                    setError("");
                  }}
                  className="w-full text-blue-600 mt-4 text-sm font-medium hover:underline"
                >
                  Change Phone Number
                </button>
              </>
            )}
          </div>
        );

      case 3:
        return (
          <div className="w-full max-w-xl">
            <h2 className="text-2xl font-bold text-[#0f172a] mb-6">Address Entry</h2>

            {/* Current Address Group */}
            <div className="bg-[#f8fafc] border border-gray-100 rounded-[32px] p-6 mb-6">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 block">Current Address</label>
              <textarea
                placeholder="Street address / House"
                className="w-full bg-white border border-gray-100 rounded-2xl p-4 mb-3 outline-none text-sm"
                value={currentAddr.street}
                onChange={(e) => setCurrentAddr({ ...currentAddr, street: e.target.value })}
              />
              <div className="grid grid-cols-3 gap-3">
                <select
                  className="bg-white border rounded-xl p-3 text-xs outline-none"
                  value={currentAddr.divisionId}
                  onChange={(e) => setCurrentAddr({ ...currentAddr, divisionId: e.target.value, districtId: "", upazilaId: "" })}
                >
                  <option value="">Division</option>
                  {curDivisions?.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>

                <select
                  className="bg-white border rounded-xl p-3 text-xs outline-none"
                  value={currentAddr.districtId}
                  onChange={(e) => setCurrentAddr({ ...currentAddr, districtId: e.target.value, upazilaId: "" })}
                  disabled={!currentAddr.divisionId}
                >
                  <option value="">District</option>
                  {curDistricts?.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>

                <select
                  className="bg-white border rounded-xl p-3 text-xs outline-none"
                  value={currentAddr.upazilaId}
                  onChange={(e) => setCurrentAddr({ ...currentAddr, upazilaId: e.target.value })}
                  disabled={!currentAddr.districtId}
                >
                  <option value="">Upazila/Thana</option>
                  {curUpazilas.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Permanent Address Group */}
            <div className="bg-[#f8fafc] border border-gray-100 rounded-[32px] p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Permanent Address</label>
                <button
                  onClick={() => setIsSame(!isSame)}
                  className={`text-[10px] font-bold uppercase flex items-center gap-2 ${isSame ? "text-blue-600" : "text-gray-400"}`}
                >
                  <div
                    className={`w-4 h-4 border rounded flex items-center justify-center ${isSame ? "bg-blue-600 border-blue-600" : "bg-white border-gray-300"}`}
                  >
                    {isSame && <Check size={12} className="text-white" />}
                  </div>
                  Same as Current
                </button>
              </div>
              <textarea
                className="w-full bg-white border border-gray-100 rounded-2xl p-4 mb-3 outline-none text-sm disabled:opacity-50"
                value={permanentAddr.street}
                onChange={(e) => setPermanentAddr({ ...permanentAddr, street: e.target.value })}
                disabled={isSame}
              />
              <div className="grid grid-cols-3 gap-3">
                <select
                  className="bg-white border rounded-xl p-3 text-xs outline-none disabled:opacity-50"
                  value={permanentAddr.divisionId}
                  disabled={isSame}
                  onChange={(e) => setPermanentAddr({ ...permanentAddr, divisionId: e.target.value, districtId: "", upazilaId: "" })}
                >
                  <option value="">Division</option>
                  {perDivisions?.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>

                <select
                  className="bg-white border rounded-xl p-3 text-xs outline-none disabled:opacity-50"
                  value={permanentAddr.districtId}
                  disabled={isSame || !permanentAddr.divisionId}
                  onChange={(e) => setPermanentAddr({ ...permanentAddr, districtId: e.target.value, upazilaId: "" })}
                >
                  <option value="">District</option>
                  {perDistricts?.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>

                <select
                  className="bg-white border rounded-xl p-3 text-xs outline-none disabled:opacity-50"
                  value={permanentAddr.upazilaId}
                  disabled={isSame || !permanentAddr.districtId}
                  onChange={(e) => setPermanentAddr({ ...permanentAddr, upazilaId: e.target.value })}
                >
                  <option value="">Upazila/Thana</option>
                  {perUpazilas.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
            <button onClick={handleSaveAddress} className="w-full bg-[#0061ff] text-white py-4 rounded-2xl font-bold shadow-lg">
              {loading ? <Loader2 className="animate-spin mx-auto" /> : "Save & Continue"}
            </button>
          </div>
        );

      // ── Step 4: KYC ───────────────────────────────────────────────────────────
      // Inside renderStepContent -> case 4
      case 4: {
        return (
          <div className="w-full max-w-sm">
            <h2 className="text-3xl font-bold text-[#0f172a] mb-2">KYC Verification</h2>
            <p className="text-gray-400 mb-8">Upload documentation for full system access.</p>

            <div className="space-y-4 mb-8 mt-6">
              {[
                { id: "front", label: "NID Front Side", backendKey: "nid_front_img" },
                { id: "back", label: "NID Back Side", backendKey: "nid_back_img" },
                { id: "photo", label: "Profile Photo", backendKey: "img" },
              ].map((item) => (
                <label
                  key={item.id}
                  className="border-2 border-dashed border-gray-200 rounded-2xl p-5 flex items-center gap-4 cursor-pointer hover:border-blue-400 transition-colors"
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      kycFiles[item.id] ? "bg-green-100 text-green-600" : "bg-gray-50 text-gray-400"
                    }`}
                  >
                    {kycFiles[item.id] ? <Check size={20} /> : <IoDocumentTextOutline size={20} />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{item.label}</p>
                    <p className="text-xs text-gray-400 truncate">{kycFiles[item.id]?.name || "Click to Upload JPG, PNG"}</p>
                  </div>
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => setKycFiles({ ...kycFiles, [item.id]: e.target.files[0] })} />
                </label>
              ))}
            </div>

            {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}

            <button
              onClick={handleCompleteKyc}
              disabled={loading || !kycFiles.front || !kycFiles.back || !kycFiles.photo}
              className="w-full bg-[#0f172a] text-white py-4 rounded-2xl font-bold mb-4 disabled:bg-gray-300 transition-all"
            >
              {loading ? <Loader2 className="animate-spin mx-auto" /> : "Complete Registration"}
            </button>

            <button onClick={() => handleSkipKyc()} className="w-full text-gray-400 text-sm font-medium hover:text-blue-600">
              Skip for now →
            </button>
          </div>
        );
      }

      default:
        return null;
    }
  };

  // ── Layout ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f1f5f9] flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[620px]">
        {/* Sidebar */}
        <div className="w-full md:w-[35%] bg-[#0b1221] p-10 flex flex-col">
          <div className="mb-12">
            <div className="w-12 h-12 bg-[#0062ffcc] rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(0,97,255,0.5)]">
              <Shield className="text-white" size={26} />
            </div>
          </div>
          <div className="space-y-10">
            {STEPS.map((s) => {
              const isActive = step === s.id;
              const isCompleted = step > s.id || s.done;
              return (
                <div key={s.id} className="flex items-center gap-5">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 border ${
                      isActive ? "bg-[#0062ffcc] border-transparent shadow-lg" : isCompleted ? "bg-green-500 border-green-500" : "border-gray-700"
                    }`}
                  >
                    {isCompleted ? (
                      <Check size={20} className="text-white" />
                    ) : (
                      <span className={`font-bold text-lg ${isActive ? "text-white" : "text-gray-500"}`}>{s.id}</span>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">STEP {s.id}</p>
                    <p className={`font-semibold ${isActive || isCompleted ? "text-white" : "text-gray-500"}`}>{s.title}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex items-center justify-center p-8 md:p-12">{renderStepContent()}</div>
      </div>
    </div>
  );
};

export default InitialVerification;
