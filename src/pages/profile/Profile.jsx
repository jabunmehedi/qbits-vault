import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Camera, Save, Lock, Shield, CheckCircle } from "lucide-react";
import { ChangePassword, GetUser, UpdateUser } from "../../services/User";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
const baseStorageUrl = import.meta.env.VITE_REACT_APP_STORAGE_URL;

const Profile = () => {
  const [activeTab, setActiveTab] = useState("profile");
  const [isEditing, setIsEditing] = useState(false);
  // Profile states
  const [name, setName] = useState("Md. Rahman");
  const [email, setEmail] = useState("rahman@example.com");
  const [phone, setPhone] = useState("+880 17xxx xxxxx");
  const [userRoles, setUserRoles] = useState([]);
  const [userPermissions, setUserPermissions] = useState([]);
  const [avatar, setAvatar] = useState("");

  const [selectedFile, setSelectedFile] = useState(null);

  // Password states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Validation & UI feedback states
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [serverError, setServerError] = useState("");

  const navigate = useNavigate();

  const { handleSubmit, register } = useForm();

  const user = JSON.parse(localStorage.getItem("auth")).user;

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
        alert("Image size should be less than 5MB");
        return;
      }
      setSelectedFile(file);

      const reader = new FileReader();
      reader.onloadend = () => setAvatar(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const tabs = [
    { id: "profile", label: "Profile", icon: Camera },
    { id: "password", label: "Change Password", icon: Lock },
    { id: "permissions", label: "My Permissions", icon: Shield },
  ];

  // Mock user permissions (replace with real data from auth or API)
  // const userRoles = ["Admin", "Cash Verifier"];
  // const userPermissions = ["Create Vault", "Edit Vault", "Delete Vault", "Verify Cash Deposit", "View All Reports", "Manage Users"];

  useEffect(() => {
    GetUser(user?.id).then((res) => {
      setName(res?.data?.data?.name);
      setEmail(res?.data?.data?.email);
      setPhone(res?.data?.data?.phone);
      setUserRoles(res?.data?.data?.roles);
      setAvatar(res?.data?.data?.img);
      setUserPermissions(res?.data?.data?.permissions);
    });
  }, []);

  const handleUpdateProfile = async () => {
    if (!name || !email) {
      alert("Name and Email are required!");
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

      setSuccessMessage("Profile updated successfully!");

      // Update avatar with new image from server if returned
      if (response?.data?.data?.img) {
        setAvatar(response.data.data.img);
      }

      setSelectedFile(null); // Reset selected file
      setIsEditing(false);
    } catch (error) {
      const errMsg = error?.response?.data?.message || "Failed to update profile";
      setServerError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const groupedPermissions = userPermissions.reduce((acc, perm) => {
    const [group] = perm.name.split("."); // 'vault', 'cash-in', 'cash-out'...

    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(perm);

    return acc;
  }, {});

  const handleChangePassword = async (data) => {
    if (confirmPassword !== data.newPassword) {
      alert("New passwords do not match!");
      return;
    }
    // Validate password length
    if (data.newPassword.length < 6) {
      alert("New password must be at least 6 characters long!");
      return;
    }

    // setSuccessMessage("");
    // setServerError("");
    // setErrors({});

    // if (!validateForm()) return;

    // setIsSubmitting(true);

    try {
      // Replace with your actual API call
      await ChangePassword(user?.id, {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });

      // Success
      setSuccessMessage("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      // addToast({ type: "success", message: "Password changed successfully!" });

      navigate("/login");
    } catch (error) {
      const errMsg = error?.response?.data?.message || error?.response?.data?.errors?.current_password?.[0] || "Failed to change password. Please try again.";

      setServerError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 rounded-2xl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-10 text-center">My Profile</h1>

        {/* Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-2 bg-white rounded-2xl shadow-lg p-2">
          {tabs.map((tab) => (
            <motion.button
              key={tab.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-8 py-4 rounded-xl font-medium transition-all ${
                activeTab === tab.id ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </motion.button>
          ))}
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* PROFILE TAB */}
          {activeTab === "profile" && (
            <div className="p-10 flex">
              <div className="relative  mb-8">
                <motion.div whileHover={{ scale: 1.05 }} className="relative inline-block">
                  <img src={baseStorageUrl + "/" + avatar} alt="Profile" className="w-48 h-48 rounded-full border-8 border-white shadow-2xl object-cover" />
                  {isEditing && (
                    <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full cursor-pointer hover:bg-black/60 transition">
                      <Camera className="w-12 h-12 text-white" />
                      <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                    </label>
                  )}
                </motion.div>
              </div>

              <div className="max-w-2xl mx-auto">
                <h2 className="text-3xl font-bold text-gray-800 mb-8">
                  {isEditing ? (
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-2 text-xl font-semibold border border-cyan-100 rounded-xl focus:border-cyan-500 outline-none"
                    />
                  ) : (
                    name
                  )}
                </h2>

                <div className="space-y-6">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Email</label>
                    {isEditing ? (
                      <input
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="mt-2 w-full px-5 py-3 border-2 border-gray-200 rounded-xl focus:border-cyan-500 outline-none"
                      />
                    ) : (
                      <p className="mt-2 text-xl text-gray-700">{email}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600">Phone</label>
                    {isEditing ? (
                      <input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="mt-2 w-full px-5 py-3 border-2 border-gray-200 rounded-xl focus:border-cyan-500 outline-none"
                      />
                    ) : (
                      <p className="mt-2 text-xl text-gray-700">{phone || "Not set"}</p>
                    )}
                  </div>
                </div>

                <div className="mt-10 flex gap-4">
                  {isEditing ? (
                    <>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleUpdateProfile}
                        disabled={isSubmitting}
                        className="px-10 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-2xl font-semibold shadow-lg flex items-center gap-3 disabled:opacity-70"
                      >
                        <Save className="w-6 h-6" />
                        {isSubmitting ? "Saving..." : "Save Changes"}
                      </motion.button>

                      <button
                        onClick={() => {
                          setIsEditing(false);
                          setSelectedFile(null);
                          // Reset preview if needed
                        }}
                        className="px-10 py-4 bg-gray-200 text-gray-700 rounded-2xl font-semibold"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setIsEditing(true)}
                      className="px-10 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-2xl font-semibold shadow-lg"
                    >
                      Edit Profile
                    </motion.button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* CHANGE PASSWORD TAB */}
          {activeTab === "password" && (
            <form onSubmit={handleSubmit(handleChangePassword)} className="p-10 max-w-2xl mx-auto">
              <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">Change Password</h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                  <div className="mt-1 relative">
                    <input
                      type={showCurrent ? "text" : "password"}
                      required
                      {...register("currentPassword", { required: true })}
                      className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl focus:border-cyan-500 outline-none transition"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showCurrent ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path
                            fillRule="evenodd"
                            d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.781-1.781zm4.365 4.364a5.002 5.002 0 016.86 6.86l-1.414-1.414a3 3 0 00-4.243-4.243L8.072 6.657z"
                            clipRule="evenodd"
                          />
                          <path d="M10 13a3 3 0 100-6 3 3 0 000 6z" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path
                            fillRule="evenodd"
                            d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7-4.478 0-8.268-2.943-9.542-7z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>

                  <div className="mt-1 relative">
                    <input
                      // value={newPassword}
                      type={showNew ? "text" : "password"}
                      {...register("newPassword", { required: true })}
                      className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl focus:border-cyan-500 outline-none transition"
                      placeholder="Enter strong password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showNew ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path
                            fillRule="evenodd"
                            d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.781-1.781zm4.365 4.364a5.002 5.002 0 016.86 6.86l-1.414-1.414a3 3 0 00-4.243-4.243L8.072 6.657z"
                            clipRule="evenodd"
                          />
                          <path d="M10 13a3 3 0 100-6 3 3 0 000 6z" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path
                            fillRule="evenodd"
                            d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7-4.478 0-8.268-2.943-9.542-7z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>

                  <div className="mt-1 relative">
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl focus:border-cyan-500 outline-none transition"
                      placeholder="Repeat new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showConfirm ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path
                            fillRule="evenodd"
                            d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.781-1.781zm4.365 4.364a5.002 5.002 0 016.86 6.86l-1.414-1.414a3 3 0 00-4.243-4.243L8.072 6.657z"
                            clipRule="evenodd"
                          />
                          <path d="M10 13a3 3 0 100-6 3 3 0 000 6z" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path
                            fillRule="evenodd"
                            d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7-4.478 0-8.268-2.943-9.542-7z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-10 flex justify-center">
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-12 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold shadow-lg"
                >
                  Update Password
                </motion.button>
              </div>
            </form>
          )}

          {/* MY PERMISSIONS TAB */}
          {activeTab === "permissions" && (
            <div className="p-10">
              {/* Roles */}
              <div className="mb-4 text-center">
                <p className="text-lg text-gray-600 mb-2">Your Roles</p>
                <div className="flex justify-center gap-4 flex-wrap">
                  {userRoles?.map((role, idx) => (
                    <motion.span key={idx} whileHover={{ scale: 1.1 }} className="px-4 py-1 rounded-full font-semibold border border-gray-200 text-gray-800">
                      {role?.name}
                    </motion.span>
                  ))}
                </div>
              </div>

              {/* Permissions List */}
              <div className="max-w-4xl mx-auto space-y-10">
                {Object.entries(groupedPermissions).map(([groupName, perms]) => (
                  <div key={groupName} className="space-y-4">
                    {/* Group Header */}
                    <h3 className="text-md text-cyan-700 capitalize border-b border-cyan-50 pb-2">{groupName.replace("-", " ")}</h3>

                    {/* Permissions grid */}
                    <div className="flex flex-wrap gap-4">
                      {perms.map((perm, idx) => (
                        <motion.div
                          key={perm.id}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.06 }}
                          className="flex items-center gap-3 p-2 text-sm bg-white rounded-xl border border-gray-200  transition-shadow"
                        >
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                          <span className="text-gray-800 ">{perm.name.split(".")[1] || perm.name}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Profile;
