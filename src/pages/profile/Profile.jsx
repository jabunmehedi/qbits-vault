import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Camera, Save, Lock, Shield, CheckCircle, User, Settings, Eye, EyeOff, Loader2 } from "lucide-react";
import { ChangePassword, GetUser, UpdateUser } from "../../services/User";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchAuthUser, selectAuthUser } from "../../store/authSlice";
import { useToast } from "../../hooks/useToast";
import { roleLabel } from "../../utils/roleLabel";

const baseStorageUrl = import.meta.env.VITE_REACT_APP_STORAGE_URL;

const Profile = () => {
  const [activeTab, setActiveTab] = useState("profile");
  const [isEditing, setIsEditing] = useState(true);

  // Profile states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [userRoles, setUserRoles] = useState([]);
  const [userPermissions, setUserPermissions] = useState([]);
  const [avatar, setAvatar] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");

  // Password states
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileErrors, setProfileErrors] = useState({});

  const { addToast } = useToast();
  const dispatch = useDispatch();

  const navigate = useNavigate();
  const { handleSubmit, register, reset, watch, setError, formState: { errors: passwordErrors } } = useForm();

  const user = useSelector(selectAuthUser);

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

  const tabs = [
    { id: "profile", label: "Profile Details", icon: User },
    { id: "password", label: "Password", icon: Lock },
    { id: "permissions", label: "Access Matrix", icon: Shield },
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
    const errors = {};
    if (!name?.trim()) errors.name = "Full name is required.";
    if (Object.keys(errors).length) {
      setProfileErrors(errors);
      return;
    }
    setProfileErrors({});

    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("name", name);
    formData.append("email", email);
    if (phone) formData.append("phone", phone);
    if (selectedFile) formData.append("img", selectedFile);

    try {
      const response = await UpdateUser(user.id, formData);

      const updatedUser = response?.data;
      if (!updatedUser?.id) {
        addToast({ type: "error", message: response?.data?.message || "Failed to update profile." });
        return;
      }

      if (updatedUser.name) setName(updatedUser.name);
      if (updatedUser.img) setAvatar(updatedUser.img);
      if (updatedUser.phone !== undefined) setPhone(updatedUser.phone);

      await dispatch(fetchAuthUser());

      addToast({ type: "success", message: "Profile updated successfully." });
      setSelectedFile(null);
      setImagePreviewUrl("");
    } catch (error) {
      addToast({ type: "error", message: error?.response?.data?.message || "Failed to update profile." });
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
    if (data.newPassword !== data.confirmPassword) {
      setError("confirmPassword", { message: "Passwords do not match." });
      return;
    }
    if (data.newPassword === data.currentPassword) {
      setError("newPassword", { message: "New password cannot be the same as the current password." });
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await ChangePassword(user?.id, {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });

      if (res?.success === false || res?.errors) {
        setError("currentPassword", { message: res?.message || "Current password is incorrect." });
        return;
      }

      addToast({ type: "success", message: "Password changed successfully. Logging out..." });
      setTimeout(() => {
        localStorage.clear();
        window.location.href = "/login";
      }, 800);
    } catch (error) {
      setError("currentPassword", { message: error?.response?.data?.message || "Failed to change password." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resolvedAvatarSrc = imagePreviewUrl
    ? imagePreviewUrl
    : avatar
      ? `${baseStorageUrl}/${avatar}`
      : user?.img
        ? `${baseStorageUrl}/${user.img}`
        : null;

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 font-sans relative overflow-x-hidden">
      {/* Premium Dashboard Style Ambient Blurs */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-200/20 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-80 h-80 bg-blue-200/20 blur-[90px] rounded-full pointer-events-none" />

      <div className="max-w-5xl mx-auto relative z-10 space-y-6">
        {/* Header Block */}
        <div className="border-b border-slate-200/80 pb-5 flex items-center gap-3">
          <div className="w-1.5 h-10 bg-[#1a2b4b] rounded-full" />
          <div>
            <h1 className="xl:text-2xl font-black text-[#1a2b4b] uppercase">Account Workspace</h1>
            <p className="text-[8px] xl:text-[10px] font-bold text-gray-400 tracking-[0.2em] uppercase">Profile Management</p>
          </div>
        </div>


        {/* Dynamic Glassmorphic Navigation Tabs Matrix */}
        <div className="flex flex-wrap gap-1.5 bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-1.5 ">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setProfileErrors({});
              }}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                activeTab === tab.id ? "bg-blue-50 text-[#1a73e8] shadow-xs" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
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
                    {resolvedAvatarSrc
                      ? <img src={resolvedAvatarSrc} alt="Avatar Graphic" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center bg-white"><User className="w-16 h-16 text-gray-300" /></div>
                    }
                    <label className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/60 text-white cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      <Camera className="w-6 h-6 text-white mb-1" />
                      <span className="text-[10px] font-bold tracking-wider uppercase">Upload</span>
                      <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                    </label>
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
                      <>
                        <input
                          value={name}
                          onChange={(e) => {
                            setName(e.target.value);
                            if (profileErrors.name) setProfileErrors((prev) => ({ ...prev, name: null }));
                          }}
                          className={`w-full px-4 py-3 text-sm rounded-xl outline-none font-semibold transition-all ${
                            profileErrors.name
                              ? "bg-red-50 border-2 border-red-400 text-red-900 placeholder:text-red-300 focus:border-red-500"
                              : "text-black bg-slate-50 border border-slate-200 focus:border-[#1a73e8]/50 focus:bg-white"
                          }`}
                        />
                        {profileErrors.name && (
                          <p className="text-xs text-red-500 font-semibold mt-1 pl-1">{profileErrors.name}</p>
                        )}
                      </>
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
                  <button
                    onClick={handleUpdateProfile}
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-[#1a73e8] hover:bg-blue-600 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg shadow-blue-200 flex items-center gap-2 transition disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* CHANGE PASSWORD VIEW PANEL */}
          {activeTab === "password" && (
            <form onSubmit={handleSubmit(handleChangePassword)} noValidate className="p-8 lg:p-12 max-w-xl mx-auto w-full space-y-5">
              <div className="text-center mb-4">
                <h3 className="text-lg font-bold text-slate-800">Credential Rotation Engine</h3>
                <p className="text-xs text-slate-400 mt-0.5">Enforce high-entropy updates across system entryways.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrent ? "text" : "password"}
                    {...register("currentPassword", { required: "Current password is required." })}
                    className={`w-full px-4 py-3 text-sm rounded-xl outline-none tracking-wide transition pr-10 ${
                      passwordErrors.currentPassword
                        ? "bg-red-50 border-2 border-red-400 text-red-900 placeholder:text-red-300 focus:border-red-500"
                        : "bg-slate-50 border border-slate-200 text-slate-500 focus:border-[#1a73e8]/50 focus:bg-white"
                    }`}
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
                {passwordErrors.currentPassword && (
                  <p className="text-xs text-red-500 font-semibold mt-1 pl-1">{passwordErrors.currentPassword.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">New Password</label>
                <div className="relative">
                  <input
                    type={showNew ? "text" : "password"}
                    {...register("newPassword", {
                      required: "New password is required.",
                      minLength: { value: 6, message: "New password must be at least 6 characters." },
                    })}
                    className={`w-full px-4 py-3 text-sm rounded-xl outline-none tracking-wide transition pr-10 ${
                      passwordErrors.newPassword
                        ? "bg-red-50 border-2 border-red-400 text-red-900 placeholder:text-red-300 focus:border-red-500"
                        : "bg-slate-50 border border-slate-200 text-slate-500 focus:border-[#1a73e8]/50 focus:bg-white"
                    }`}
                    placeholder="Minimum 6 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordErrors.newPassword && (
                  <p className="text-xs text-red-500 font-semibold mt-1 pl-1">{passwordErrors.newPassword.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Re-verify New Password</label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    {...register("confirmPassword", { required: "Please confirm your new password." })}
                    className={`w-full px-4 py-3 text-sm rounded-xl outline-none tracking-wide transition pr-10 ${
                      passwordErrors.confirmPassword
                        ? "bg-red-50 border-2 border-red-400 text-red-900 placeholder:text-red-300 focus:border-red-500"
                        : "bg-slate-50 border border-slate-200 text-slate-500 focus:border-[#1a73e8]/50 focus:bg-white"
                    }`}
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
                {passwordErrors.confirmPassword && (
                  <p className="text-xs text-red-500 font-semibold mt-1 pl-1">{passwordErrors.confirmPassword.message}</p>
                )}
              </div>

              <div className="pt-4 text-center">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full py-3 flex justify-center text-white text-xs font-bold uppercase tracking-wider rounded-xl transition ${isSubmitting ? "cursor-not-allowed opacity-70 bg-gray-300" : "bg-[#1a73e8] hover:bg-blue-600 shadow-lg shadow-blue-200"}`}
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
                      className="px-3 py-1 bg-blue-50 text-[#1a73e8] border border-blue-100 text-xs font-bold rounded-lg uppercase tracking-wider"
                    >
                      {roleLabel(role?.name)}
                    </span>
                  ))}
                </div>
              </div>

              <div className="max-w-4xl mx-auto space-y-8">
                {Object.entries(groupedPermissions).map(([groupName, perms]) => (
                  <div key={groupName} className="space-y-3">
                    <h3 className="text-xs font-extrabold text-[#1a2b4b] uppercase tracking-widest border-b border-slate-100 pb-1.5 capitalize">
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

        </motion.div>
      </div>
    </div>
  );
};

export default Profile;
