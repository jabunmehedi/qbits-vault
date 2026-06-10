import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Save, Lock, Shield, CheckCircle, User, Settings, Eye, EyeOff, X, Database, Loader2, Check, ChevronDown } from "lucide-react";
import { ChangePassword, GetUser, UpdateUser } from "../../services/User";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchAuthUser, selectAuthUser } from "../../store/authSlice";
import { MakeDefaultVault } from "../../services/Vault";
import { useToast } from "../../hooks/useToast";

const baseStorageUrl = import.meta.env.VITE_REACT_APP_STORAGE_URL;

const Profile = () => {
  const [activeTab, setActiveTab] = useState("profile");
  const [isEditing, setIsEditing] = useState(false);

  // Profile states
  const [name, setName] = useState();
  const [email, setEmail] = useState();
  const [phone, setPhone] = useState();
  const [userRoles, setUserRoles] = useState([]);
  const [userPermissions, setUserPermissions] = useState([]);
  const [avatar, setAvatar] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");

  // Settings state
  const [defaultVault, setDefaultVault] = useState();

  // Password states
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Validation & UI feedback states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [serverError, setServerError] = useState("");

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const { addToast } = useToast();
  const dispatch = useDispatch();

  const navigate = useNavigate();
  const { handleSubmit, register, reset, watch } = useForm();

  const user = useSelector(selectAuthUser);

  useEffect(() => {
    if (user?.default_vault_id) {
      setDefaultVault(user.default_vault_id);
    }
  }, [user?.default_vault_id]);

  // FIXED: Responsive, fast-rendering image change pipeline handler
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Image size should be less than 5MB");
        return;
      }
      setSelectedFile(file);
      setImagePreviewUrl(URL.createObjectURL(file));
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedVaultDetails = user?.vault_assignments.find((v) => v?.vault_id === Number(defaultVault));

  const tabs = [
    { id: "profile", label: "Profile Details", icon: User },
    { id: "password", label: "Password", icon: Lock },
    { id: "permissions", label: "Access Matrix", icon: Shield },
    { id: "settings", label: "System Preferences", icon: Settings },
  ];

  useEffect(() => {
    if (!user?.id) return;

    GetUser(user?.id).then((res) => {
      dispatch(fetchAuthUser());

      setName(res?.data?.data?.name || "");
      setEmail(res?.data?.data?.email || "");
      setPhone(res?.data?.data?.phone || "");
      setUserRoles(res?.data?.data?.roles || []);
      setAvatar(res?.data?.data?.img || "");
      setUserPermissions(res?.data?.data?.permissions || []);
    });
  }, [user?.id, dispatch]);

  const handleUpdateProfile = async () => {
    if (!name || !email) {
      addToast({ type: "error", message: "All fields are required." });
      return;
    }

    setIsSubmitting(true);
    setServerError("");
    setSuccessMessage("");

    const formData = new FormData();
    formData.append("name", name);
    formData.append("email", email);
    if (phone) formData.append("phone", phone);
    if (selectedFile) formData.append("img", selectedFile);

    try {
      const response = await UpdateUser(user.id, formData);

      if (response.success && !response.success) {
        addToast({ type: "error", message: response?.message || "Failed to update profile." });
      }

      const updatedImg = response?.data?.img;

      if (updatedImg) {
        setAvatar(updatedImg);
      }

      addToast({ type: "success", message: "Profile updated successfully." });
      await dispatch(fetchAuthUser());

      setSelectedFile(null);
      setImagePreviewUrl("");
      setIsEditing(false);
    } catch (error) {
      setServerError(error?.response?.data?.message || "Failed to update target configurations.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const groupedPermissions = userPermissions.reduce((acc, perm) => {
    const [group] = perm.name.split(".");
    if (!acc[group]) acc[group] = [];
    acc[group].push(perm);
    return acc;
  }, {});

  const handleChangePassword = async (data) => {
    if (data.confirmPassword !== data.newPassword) {
      addToast({ type: "error", message: "Passwords do not match." });
      return;
    }
    if (data.newPassword.length < 6) {
      addToast({ type: "error", message: "Password must be at least 6 characters." });
      return;
    }

    setIsSubmitting(true);
    setServerError("");
    setSuccessMessage("");

    try {
      const res = await ChangePassword(user?.id, {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });

      if (!res?.success) {
        setServerError(res?.message || "Failed to reset authentication credentials.");
      }

      addToast({ type: "success", message: "Password reset successfully." });
      setTimeout(() => {
        localStorage.clear();
        navigate("/login");
      }, 1500);
    } catch (error) {
      setServerError(error?.response?.data?.message || "Authentication reset rejected.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSubmitting(true);

    try {
      const payload = {
        default_vault_id: defaultVault,
      };

      await MakeDefaultVault(user?.id, payload);

      dispatch(fetchAuthUser());

      addToast({ type: "success", message: "Default vault updated successfully." });
    } catch (error) {
      console.log(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Compute the current layout path link string safely
  const resolvedAvatarSrc = imagePreviewUrl
    ? imagePreviewUrl
    : avatar
      ? `${baseStorageUrl}/${avatar}`
      : user?.img
        ? `${baseStorageUrl}/${user.img}`
        : "https://images.unsplash.com/photo-1633332755192-727a05c4013d?auto=format&fit=crop&w=500&q=80";

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 font-sans relative overflow-x-hidden">
      {/* Premium Dashboard Style Ambient Blurs */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-200/20 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-80 h-80 bg-indigo-200/20 blur-[90px] rounded-full pointer-events-none" />

      <div className="max-w-5xl mx-auto relative z-10 space-y-6">
        {/* Header Block */}
        <div className="border-b border-slate-200/80 pb-5">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Account Workspace
          </h1>
          <p className="text-sm text-slate-500 mt-1">Configure profile signatures, secure tokens, and environment options.</p>
        </div>

        {/* Global Alert Notices System */}
        {/* <AnimatePresence>
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, h: 0 }}
              animate={{ opacity: 1, h: "auto" }}
              exit={{ opacity: 0, h: 0 }}
              className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold rounded-xl flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" /> {successMessage}
            </motion.div>
          )}
          {serverError && (
            <motion.div
              initial={{ opacity: 0, h: 0 }}
              animate={{ opacity: 1, h: "auto" }}
              exit={{ opacity: 0, h: 0 }}
              className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold rounded-xl flex items-center gap-2"
            >
              <X className="w-4 h-4" /> {serverError}
            </motion.div>
          )}
        </AnimatePresence> */}

        {/* Dynamic Glassmorphic Navigation Tabs Matrix */}
        <div className="flex flex-wrap gap-1.5 bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-1.5 ">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSuccessMessage("");
                setServerError("");
              }}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                activeTab === tab.id ? "bg-cyan-50/70 text-cyan-700 shadow-xs" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Main Content Workspace Panel */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-3xl  overflow-hidden min-h-[460px] flex flex-col"
        >
          {/* PROFILE VIEW PANEL */}
          {activeTab === "profile" && (
            <div className="p-8 lg:p-12 grid grid-cols-1 md:grid-cols-3 gap-10 items-start">
              <div className="flex flex-col items-center justify-center text-center space-y-4 border-b md:border-b-0 md:border-r border-slate-100 pb-6 md:pb-0 md:pr-6">
                <div className="relative group">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="relative w-40 h-40 rounded-full ring-4 ring-slate-100 overflow-hidden shadow-md bg-slate-50"
                  >
                    <img src={resolvedAvatarSrc} alt="Avatar Graphic" className="w-full h-full object-cover" />
                    {isEditing && (
                      <label className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/60 text-white cursor-pointer opacity-100 transition duration-150">
                        <Camera className="w-6 h-6 text-cyan-400 mb-1" />
                        <span className="text-[10px] font-bold tracking-wider uppercase">Upload</span>
                        <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                      </label>
                    )}
                  </motion.div>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">{name}</h3>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">{email}</p>
                </div>
              </div>

              <div className="md:col-span-2 space-y-6">
                <h4 className="text-sm font-bold tracking-wider uppercase text-slate-400 mb-4">Identity Signatures</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Full Name</label>
                    {isEditing ? (
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-3 text-sm text-black bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500/50 focus:bg-white outline-none font-semibold transition-all"
                      />
                    ) : (
                      <div className="px-4 py-3 bg-slate-50 border border-transparent text-sm text-slate-800 font-bold rounded-xl">{name}</div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Primary Email</label>

                    <div className="px-4 py-3 bg-slate-50 border border-transparent text-sm text-slate-700 font-medium rounded-xl font-mono">{email}</div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Mobile Number</label>

                    <div className="px-4 py-3 bg-slate-50 border border-transparent text-sm text-slate-700 font-medium rounded-xl">
                      {phone || "Not configured"}
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  {isEditing ? (
                    <>
                      <button
                        onClick={handleUpdateProfile}
                        disabled={isSubmitting}
                        className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-xs flex items-center gap-2 transition disabled:opacity-50"
                      >
                        <Save className="w-4 h-4" />
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update"}
                      </button>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          setSelectedFile(null);
                          setImagePreviewUrl("");
                        }}
                        className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider rounded-xl transition"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold uppercase tracking-wider rounded-md shadow-xs transition"
                    >
                      Click to Update
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* CHANGE PASSWORD VIEW PANEL */}
          {activeTab === "password" && (
            <form onSubmit={handleSubmit(handleChangePassword)} className="p-8 lg:p-12 max-w-xl mx-auto w-full space-y-5">
              <div className="text-center mb-4">
                <h3 className="text-lg font-bold text-slate-800">Credential Rotation Engine</h3>
                <p className="text-xs text-slate-400 mt-0.5">Enforce high-entropy updates across system entryways.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrent ? "text" : "password"}
                    required
                    {...register("currentPassword", { required: true })}
                    className="w-full px-4 py-3 text-slate-500 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500/50 focus:bg-white outline-none tracking-wide transition"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">New Password</label>
                <div className="relative">
                  <input
                    type={showNew ? "text" : "password"}
                    required
                    {...register("newPassword", { required: true })}
                    className="w-full px-4 py-3 text-slate-500 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500/50 focus:bg-white outline-none tracking-wide transition"
                    placeholder="Minimum 3 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Re-verify New Password</label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    required
                    {...register("confirmPassword", { required: true })}
                    className="w-full px-4 py-3 text-slate-500 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500/50 focus:bg-white outline-none tracking-wide transition"
                    placeholder="Match exactly"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-4 text-center">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full py-3 bg-gradient-to-r flex justify-center  text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-xs  transition ${isSubmitting ? "cursor-not-allowed opacity-70 from-gray-300 to-gray-300" : "from-cyan-600 to-indigo-600 hover:from-cyan-700 hover:to-indigo-700"}`}
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Change Password"}
                </button>
              </div>
            </form>
          )}

          {/* MY PERMISSIONS VIEW PANEL */}
          {activeTab === "permissions" && (
            <div className="p-8 lg:p-12 space-y-8">
              <div className="flex flex-col items-center justify-center text-center pb-4 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Security Roles</p>
                <div className="flex justify-center gap-2 mt-2.5 flex-wrap">
                  {userRoles?.map((role, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-indigo-50/60 text-indigo-600 border border-indigo-100 text-xs font-bold rounded-lg uppercase tracking-wider"
                    >
                      {role?.name}
                    </span>
                  ))}
                </div>
              </div>

              <div className="max-w-4xl mx-auto space-y-8">
                {Object.entries(groupedPermissions).map(([groupName, perms]) => (
                  <div key={groupName} className="space-y-3">
                    <h3 className="text-xs font-extrabold text-cyan-600 uppercase tracking-widest border-b border-slate-100 pb-1.5 capitalize">
                      {groupName.replace("-", " ")} Framework
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {perms.map((perm) => (
                        <div key={perm.id} className="flex items-center gap-2.5 p-3 bg-slate-50/60 border border-slate-100 rounded-xl">
                          <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          <span className="text-xs font-bold text-slate-700 font-mono truncate">{perm.name.split(".")[1] || perm.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SYSTEM PREFERENCES / SETTINGS VIEW PANEL */}
          {activeTab === "settings" && (
            <div className="p-8 lg:p-12 max-w-xl mx-auto w-full space-y-6">
              <div className="text-center mb-4">
                <h3 className="text-lg font-bold text-slate-800">Workspace Environment Configs</h3>
                <p className="text-xs text-slate-400 mt-0.5">Control default scopes for system-wide dashboard operations.</p>
              </div>

              <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-200/40 pb-3">
                  <Database className="text-cyan-600 w-5 h-5 flex-shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Primary Vault Scope</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">Sets default API routing initialization bindings dynamically.</p>
                  </div>
                </div>

                <div className="relative" ref={dropdownRef}>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Default Active Vault Context</label>

                  {/* Custom Selector Input Button */}
                  <button
                    type="button"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className={`w-full flex items-center justify-between px-4 py-3 text-sm bg-white border rounded-xl text-left font-semibold text-slate-700 shadow-xs transition-all outline-none ${
                      dropdownOpen ? "border-cyan-500 ring-2 ring-cyan-500/10" : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <span className="truncate">{selectedVaultDetails?.vault?.name}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform duration-200 flex-shrink-0 ml-2 ${
                        dropdownOpen ? "rotate-180 text-cyan-600" : ""
                      }`}
                    />
                  </button>

                  {/* Modern Animated Dropdown Panel Overlay */}
                  <AnimatePresence>
                    {dropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden p-1.5"
                      >
                        <div className="max-h-60 overflow-y-auto space-y-0.5 scrollbar-thin scrollbar-thumb-slate-100">
                          {user?.vault_assignments
                            ?.filter((vault) => vault?.status === "active")
                            .map((vlt) => {
                              const isSelected = defaultVault === vlt.vault_id;
                              return (
                                <button
                                  key={vlt.vault_id}
                                  type="button"
                                  onClick={() => {
                                    setDefaultVault(vlt.vault_id);
                                    setDropdownOpen(false);
                                  }}
                                  className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-semibold rounded-lg text-left transition-all ${
                                    isSelected ? "bg-cyan-50/70 text-cyan-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                  }`}
                                >
                                  <span className="truncate">{vlt.vault?.name}</span>
                                  {isSelected && <Check className="w-4 h-4 text-cyan-600 flex-shrink-0 ml-2" />}
                                </button>
                              );
                            })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  disabled={isSubmitting}
                  className={`w-full py-3 bg-gradient-to-r flex justify-center  text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-xs  transition ${isSubmitting ? "cursor-not-allowed opacity-70 from-gray-300 to-gray-300" : "from-cyan-600 to-indigo-600 hover:from-cyan-700 hover:to-indigo-700"}`}
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "make change"}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Profile;
