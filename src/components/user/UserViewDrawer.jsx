import { motion, AnimatePresence } from "framer-motion";
import { Download, Loader2, MapPin, Shield, X, FileText, User, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { ArchiveUser, DisableUser, GetRoles, GetUser, MigrateUser, UserArchiveCheck, UserNewPassword } from "../../services/User";
import Avatar from "../helpers/Avatar";
import { RiVerifiedBadgeFill } from "react-icons/ri";
import { GetVaults, ToggleVaultAccess, UpdateVaultRoles } from "../../services/Vault";
import { FaCheckCircle } from "react-icons/fa";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import axiosConfig from "../../utils/axiosConfig";
import { selectIsAdmin, selectIsSuperAdmin } from "../../store/authSlice";
import { useSelector } from "react-redux";
import UserChangePasswordModal from "./UserChangePasswordModal";
import { useToast } from "../../hooks/useToast";
import UserMigrationModal from "./UserMigrationModal";

const UserViewDrawer = ({ isOpen, onClose, userId, refetch }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [vaultList, setVaultList] = useState([]);
  const [activeVaultId, setActiveVaultId] = useState(null);
  const [activeRoles, setActiveRoles] = useState([]);
  const [userAssignments, setUserAssignments] = useState([]);
  const [rolesList, setRolesList] = useState([]);
  const [actionLoading, setActionLoading] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Migration Panel Workflow States
  const [showMigrationPanel, setShowMigrationPanel] = useState(false);
  const [pendingResponsibilities, setPendingResponsibilities] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedTargetUser, setSelectedTargetUser] = useState("");
  const [isMigrating, setIsMigrating] = useState(false);
  const [checkingMigration, setCheckingMigration] = useState(false);

  // Identity document preview modal state
  const [showPreview, setShowPreview] = useState(false);

  // Custom manual password modification modal states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  const isSuperAdmin = useSelector(selectIsSuperAdmin);
  const isAdmin = useSelector(selectIsAdmin);

  const { addToast } = useToast();

  const handleDownloadId = async () => {
    setIsDownloading(true);
    try {
      const response = await axiosConfig.get(`/users/${userId}/download-id`, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(response.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${user?.name || "User"}_Identity_Report.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setShowPreview(false);
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  const passwordMutation = useMutation({
    mutationFn: async (password) => {
      return await UserNewPassword(userId, { newPassword: password });
    },
    onSuccess: (res) => {
      if (res?.success === false) {
        const validationError = res?.errors?.newPassword?.[0] || res?.message || "Validation error.";
        addToast({ type: "error", message: validationError });
        return;
      }
      setNewPassword("");
      setShowPasswordModal(false);
      addToast({ type: "success", message: "Password updated successfully." });
    },
    onError: () => {
      addToast({ type: "error", message: "Network communication failed." });
    },
  });

  const migrationMutation = useMutation({
    mutationFn: ({ uid, targetId }) => MigrateUser(uid, targetId),
    onSuccess: (res) => {
      // Safely extract from any nesting level
      const isFailure = res?.success === false || res?.data?.success === false || res?.status === false;

      if (isFailure) {
        addToast({
          type: "error",
          message: res?.message || res?.data?.message || "Migration validation failed.",
        });
        return;
      }

      // Remove migrated user from all cached user-list shapes
      queryClient.setQueriesData({ queryKey: ["users"] }, (oldCache) => filterUsers(oldCache, (u) => u.id !== userId));

      // Invalidate AFTER optimistic update so refetch doesn't race
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["users"] });
      }, 300);

      addToast({
        type: "success",
        message: "Workflow parameters shifted; user archived cleanly.",
      });
      onClose();
    },
    onError: (err) => {
      addToast({
        type: "error",
        message: err?.response?.data?.message || "Migration process failed.",
      });
    },
  });

  const patchUsers = (oldCache, patchFn) => {
    if (!oldCache) return oldCache;
    if (Array.isArray(oldCache)) return oldCache.map(patchFn);
    if (oldCache?.data && Array.isArray(oldCache.data)) return { ...oldCache, data: oldCache.data.map(patchFn) };
    if (oldCache?.data?.data && Array.isArray(oldCache.data.data)) return { ...oldCache, data: { ...oldCache.data, data: oldCache.data.data.map(patchFn) } };
    return oldCache;
  };

  const roleMutation = useMutation({
    mutationFn: ({ uid, vid, roles }) => UpdateVaultRoles(uid, vid, roles),
    onSuccess: (data, variables) => {
      const newlySelectedRoles = rolesList.filter((r) => variables.roles.includes(r.id));

      // ADDED: Push role changes into the users list cache in real time
      queryClient.setQueriesData({ queryKey: ["users"] }, (oldCache) =>
        patchUsers(oldCache, (u) => {
          if (u.id !== userId) return u;
          const updatedAssignments = (u.vault_assignments ?? []).map((va) => (va.vault_id === variables.vid ? { ...va, roles: variables.roles } : va));
          return { ...u, vault_assignments: updatedAssignments, roles: newlySelectedRoles };
        }),
      );
    },
  });
  const statusMutation = useMutation({
    mutationFn: (uid) => DisableUser(uid),
    onSuccess: () => {
      const toggleStatus = (s) => (s === "inactive" ? "active" : "inactive");
      queryClient.setQueriesData({ queryKey: ["users"] }, (oldCache) =>
        patchUsers(oldCache, (u) => (u.id === userId ? { ...u, status: toggleStatus(u.status) } : u)),
      );
      setUser((prev) => ({ ...prev, status: toggleStatus(prev.status) }));
    },
  });

  const filterUsers = (oldCache, filterFn) => {
    if (!oldCache) return oldCache;
    if (Array.isArray(oldCache)) return oldCache.filter(filterFn);
    if (oldCache?.data && Array.isArray(oldCache.data)) return { ...oldCache, data: oldCache.data.filter(filterFn) };
    if (oldCache?.data?.data && Array.isArray(oldCache.data.data))
      return { ...oldCache, data: { ...oldCache.data, data: oldCache.data.data.filter(filterFn) } };
    return oldCache;
  };

  const archiveMutation = useMutation({
    mutationFn: (uid) => ArchiveUser(uid),
    onSuccess: (res) => {
      if (res?.success === false || res?.data?.success === false) {
        addToast({ type: "error", message: res?.data?.message || "Archive target validation rejected." });
        return;
      }
      queryClient.setQueriesData({ queryKey: ["users"] }, (oldCache) => filterUsers(oldCache, (u) => u.id !== userId));
      queryClient.invalidateQueries({ queryKey: ["users"] });
      addToast({ type: "success", message: "User archived successfully." });
      onClose();
    },
    onError: (err) => {
      addToast({
        type: "error",
        message: err?.response?.data?.message || "Cannot archive. User has active workflow assignments.",
      });
    },
  });

  useEffect(() => {
    if (!isOpen || !userId) {
      setUser(null);
      setVaultList([]);
      setActiveVaultId(null);
      setActiveRoles([]);
      setUserAssignments([]);
      return;
    }

    const initData = async () => {
      setLoading(true);
      setShowMigrationPanel(false);
      setPendingResponsibilities([]);
      setSelectedTargetUser("");

      setUser(null);
      setVaultList([]);
      setActiveVaultId(null);
      setActiveRoles([]);
      setUserAssignments([]);

      try {
        const [vRes, rRes, uRes] = await Promise.all([GetVaults(), GetRoles(), GetUser(userId)]);
        setVaultList(vRes?.data?.data || []);
        setRolesList(rRes?.data || []);

        const userData = uRes?.data?.data || uRes?.data;
        setUser(userData);

        const assignments = userData?.vault_assignments || [];
        setUserAssignments(assignments);

        const activeItem = assignments.find((a) => a.status === 1 || a.status === "active");
        if (activeItem) {
          setActiveVaultId(activeItem.vault_id);
          setActiveRoles((activeItem.roles || []).map(Number));
        }
      } catch (err) {
        console.error("Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, [isOpen, userId]);

  // Explicitly trigger accountability check data panel via the manual Migrate Button
  const handleFetchMigrationDetails = async () => {
    setCheckingMigration(true);
    try {
      const response = await UserArchiveCheck(userId);
      setPendingResponsibilities(response.data.pending_tasks);
      setAvailableUsers(response.data.fallback_users || []);
      setShowMigrationPanel((prev) => !prev);

      if (response.data.pending_tasks.length === 0) {
        addToast({ type: "info", message: "This user has no pending workflow locks." });
      }
    } catch (err) {
      console.error("Fetch requirements error:", err);
      addToast({ type: "error", message: "Failed to gather task parameters." });
    } finally {
      setCheckingMigration(false);
    }
  };

  const handleExecuteMigration = () => {
    if (!selectedTargetUser) {
      addToast({ type: "error", message: "Please choose a user to receive assignments." });
      return;
    }
    // CHANGED: Instead of manual async-await, use the tracking mutation context hook
    migrationMutation.mutate({ uid: userId, targetId: selectedTargetUser });
  };

  const toggleVaultSetAccess = async (vaultId) => {
    if (!isSuperAdmin && !isAdmin) return;
    try {
      await ToggleVaultAccess(userId, vaultId);
      const res = await GetUser(userId);
      const updatedAssignments = res?.data?.data?.vault_assignments || res?.data?.vaultAssignments || [];

      setUserAssignments(updatedAssignments);

      const stillActive = updatedAssignments.find((a) => a.vault_id === vaultId && (a.status === "active" || a.status === 1));
      if (!stillActive && activeVaultId === vaultId) {
        setActiveVaultId(null);
        setActiveRoles([]);
      }

      // ADDED: Push vault toggle changes into the users list cache in real time
      queryClient.setQueriesData({ queryKey: ["users"] }, (oldCache) =>
        patchUsers(oldCache, (u) => {
          if (u.id !== userId) return u;
          return { ...u, vault_assignments: updatedAssignments };
        }),
      );
    } catch (error) {
      console.error("Toggle failed:", error);
    }
  };

  const toggleRole = (role) => {
    if (!activeVaultId || (!isSuperAdmin && !isAdmin)) return;
    const isCurrentlyEnabled = activeRoles.includes(Number(role.id));
    const newRoles = isCurrentlyEnabled ? activeRoles.filter((id) => id !== Number(role.id)) : [...activeRoles, role.id];

    roleMutation.mutate({ uid: userId, vid: activeVaultId, roles: newRoles });
    setActiveRoles(newRoles.map(Number));
  };

  const handleDisableUser = () => statusMutation.mutate(userId);
  const handleArchiveUser = () => archiveMutation.mutate(userId);

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (!newPassword.trim()) return;
    passwordMutation.mutate(newPassword);
  };

  const assignedVaults = vaultList.filter((vault) => userAssignments.some((a) => a.vault_id === vault.id && (a.status === "active" || a.status === 1)));

  const getCurrentAddressString = () => {
    return [user?.current_address, user?.current_thana, user?.current_district, user?.current_division].filter(Boolean).join(", ") || "N/A";
  };

  const getPermanentAddressString = () => {
    return [user?.permanent_address, user?.permanent_thana, user?.permanent_district, user?.permanent_division].filter(Boolean).join(", ") || "N/A";
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-[60]"
          />

          {/* Drawer Profile Sidebar Component */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 220, mass: 0.8 }}
            className="fixed right-0 top-0 h-full w-[40%] bg-white z-[70] shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="border-b border-gray-100 bg-white px-6 py-5 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 rounded-xl">
                  <Shield className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-[#1a2b4b] tracking-tight">User Profile</h2>
                  <p className="text-xs text-gray-400">Manage access & permissions</p>
                </div>
              </div>
              <button onClick={onClose} className="p-3 hover:bg-gray-100 rounded-2xl transition-all active:scale-95">
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            {loading && (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-gray-500">Loading user details...</p>
              </div>
            )}

            {!loading && user && (
              <div className="flex-1 overflow-y-auto space-y-8">
                <div className="flex items-center p-6 justify-between border-b border-gray-50 pb-6">
                  <div className="flex items-center gap-4">
                    <Avatar src={user?.img} name={user?.name} size="xl" />
                    <div className="flex-1">
                      <div className="flex items-center mb-2 gap-2">
                        <h3 className="text-2xl font-bold text-[#1a2b4b]">{user?.name}</h3>
                        <RiVerifiedBadgeFill className={`w-6 h-6 ${user?.verified ? "text-blue-500" : "text-gray-400"}`} />
                      </div>
                      <p className="text-sm text-gray-400">{user?.email}</p>
                      <p className="text-sm text-gray-400">{user?.phone}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 items-end">
                    <div className="flex justify-end items-center gap-2">
                      <button
                        onClick={() => setShowPreview(true)}
                        disabled={!isSuperAdmin && !isAdmin}
                        className="flex items-center justify-center gap-2 text-black bg-white border border-gray-300 hover:border-gray-400 py-1.5 px-4 rounded-lg text-sm font-semibold transition disabled:opacity-70"
                      >
                        <FileText size={14} />
                        ID
                      </button>

                      {isSuperAdmin && (
                        <button
                          onClick={() => setShowPasswordModal(true)}
                          disabled={!isSuperAdmin && !isAdmin}
                          className="flex items-center justify-center gap-2 bg-indigo-500 text-white hover:bg-indigo-600 py-2 px-3 rounded-lg text-xs font-semibold transition disabled:opacity-50 shadow-xs"
                        >
                          Change Pass
                        </button>
                      )}

                      <div className="relative group">
                        <button className="flex items-center justify-center gap-2 bg-indigo-500 border border-gray-300 hover:border-gray-400 py-2 px-3 rounded-lg text-xs font-semibold transition cursor-help">
                          <MapPin size={16} className="text-white" />
                        </button>
                        <div className="absolute top-full right-0 mt-2 w-64 p-4 bg-white border border-gray-200 rounded-xl shadow-xl opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 z-[80] origin-top-right">
                          <div className="space-y-3">
                            <div>
                              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Current Address</p>
                              <p className="text-xs text-gray-700 mt-0.5 leading-relaxed">{getCurrentAddressString()}</p>
                            </div>
                            <div className="pt-2 border-t border-gray-100">
                              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Permanent Address</p>
                              <p className="text-xs text-gray-700 mt-0.5 leading-relaxed">{getPermanentAddressString()}</p>
                            </div>
                          </div>
                          <div className="absolute -top-1 right-4 w-2 h-2 bg-white border-t border-l border-gray-200 rotate-45"></div>
                        </div>
                      </div>
                    </div>

                    {/* Operational Actions Panel with Side-by-Side Migrate and Archive Option Row */}
                    <div className="flex items-center gap-2 w-full justify-end">
                      <button
                        onClick={handleDisableUser}
                        disabled={actionLoading === "disable" || (!isSuperAdmin && !isAdmin)}
                        className={`text-white px-3 py-2 rounded-lg text-xs font-bold transition disabled:opacity-20 ${
                          user?.status === "inactive" ? "bg-green-600 hover:bg-green-700" : "bg-[#AE2448] hover:bg-red-800"
                        }`}
                      >
                        {actionLoading === "disable" ? "..." : user?.status === "inactive" ? "ENABLE USER" : "DISABLE USER"}
                      </button>

                      {/* Explicit Migrate Trigger Button next to Archive */}
                      <button
                        onClick={handleFetchMigrationDetails}
                        disabled={checkingMigration || user?.status === "archived" || (!isSuperAdmin && !isAdmin)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition text-gray-700 bg-gray-100 border border-gray-200 hover:bg-gray-200 disabled:opacity-40"
                      >
                        <>
                          <RefreshCw size={12} />
                          MIGRATE
                        </>
                      </button>

                      <button
                        onClick={handleArchiveUser}
                        disabled={checkingMigration || migrationMutation.isPending || user?.status === "archived" || (!isSuperAdmin && !isAdmin)}
                        className={`text-white px-3 py-2 rounded-lg text-xs font-bold transition disabled:opacity-40 ${
                          user?.status === "archived" ? "bg-gray-400" : "bg-zinc-800 hover:bg-zinc-900"
                        }`}
                      >
                        {archiveMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : user?.status === "archived" ? "ARCHIVED" : "ARCHIVE USER"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Vault Controls Mapping Group */}
                <div className="grid grid-cols-3 p-6 bg-[#F6F7F9] rounded-lg gap-6">
                  <div>
                    <div className="mb-6">
                      <h4 className="text-blue-600 font-bold uppercase text-xs mb-4">VAULT ACCESS CONTROL</h4>
                      <div className="bg-white border border-gray-200 py-3 rounded-2xl">
                        {vaultList.map((vault) => {
                          const assignment = userAssignments.find((a) => a.vault_id === vault.id);
                          const isActive = assignment && (assignment.status === "active" || assignment.status === 1);
                          return (
                            <div
                              key={vault.id}
                              className="text-sm text-black border-gray-100 rounded-3xl px-5 py-2.5 flex items-center justify-between transition"
                            >
                              <div className="flex items-center text-xs gap-3">
                                <div className="p-2 bg-gray-100 rounded-xl">🔒</div>
                                <p className="font-semibold">{vault.name}</p>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={isActive} onChange={() => toggleVaultSetAccess(vault.id)} className="sr-only peer" />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1a73e8]"></div>
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-blue-600 font-bold uppercase text-xs mb-4">Switch Vault View</h4>
                      <div className="bg-white border border-gray-200 py-3 rounded-2xl">
                        {assignedVaults.length > 0 ? (
                          assignedVaults.map((vault) => (
                            <div
                              key={vault.id}
                              onClick={() => {
                                setActiveVaultId(vault.id);
                                const assignment = userAssignments.find((a) => a.vault_id === vault.id);
                                setActiveRoles(assignment?.roles || []);
                              }}
                              className="rounded-3xl text-xs px-5 py-2.5 flex items-center justify-between cursor-pointer transition-all"
                            >
                              <div
                                className={`flex items-center gap-3 w-full rounded-2xl ${activeVaultId === vault.id ? "border-blue-600 !bg-black text-white" : "border-gray-100 text-gray-600"}`}
                              >
                                <div className="p-2 bg-gray-100 rounded-xl">🔒</div>
                                <p className="font-semibold">{vault.name}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-gray-400 text-sm p-4">No vault assigned yet.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {activeVaultId && (
                    <div className="col-span-2">
                      <h4 className="text-blue-600 font-bold uppercase text-xs mb-4">
                        CAPABILITY MATRIX: <span className="text-gray-500">{vaultList.find((v) => v.id === activeVaultId)?.name}</span>
                      </h4>
                      <div className="grid grid-cols-2 text-black gap-3">
                        {rolesList
                          ?.filter((role) => role.name !== "super-admin" && role.name !== "Super Admin")
                          .map((role) => {
                            const isEnabled = activeRoles.includes(role.id);
                            return (
                              <div
                                key={role.id}
                                onClick={() => toggleRole(role)}
                                className={`rounded-3xl p-4 flex items-center capitalize justify-between cursor-pointer transition-all border ${
                                  isEnabled ? "bg-[#1a73e8] text-white border-[#1a73e8]" : "bg-white border-gray-200 hover:border-gray-300"
                                }`}
                              >
                                <div>
                                  <p className="font-bold">{role?.name}</p>
                                  <p className="text-xs opacity-75">{isEnabled ? "Enabled" : "Disabled"}</p>
                                </div>
                                <div className={`w-8 h-8 rounded-2xl flex items-center justify-center text-xl ${isEnabled ? "" : "bg-gray-100"}`}>
                                  {isEnabled ? <FaCheckCircle /> : "○"}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>

          {/* Identity Report Document PDF Preview Modal Layer */}
          <AnimatePresence>
            {showPreview && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowPreview(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4 overflow-y-auto"
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-zinc-800 w-full max-w-xl h-full rounded-2xl shadow-2xl overflow-hidden flex flex-col my-4"
                >
                  <div className="bg-zinc-900 border-b border-zinc-700 px-5 py-3 flex items-center justify-between text-white">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-400" />
                      <h3 className="text-xs font-bold">Identity Report Preview</h3>
                    </div>
                    <button onClick={() => setShowPreview(false)} className="p-1 hover:bg-zinc-700 rounded-lg transition">
                      <X className="w-4 h-4 text-zinc-400" />
                    </button>
                  </div>

                  <div className="p-6 bg-zinc-700 flex justify-center overflow-y-auto h-full">
                    <div className="w-full bg-white rounded-md p-6 flex flex-col justify-between relative text-black font-sans border border-zinc-200 shadow-xl max-w-lg">
                      <div>
                        <div className="flex justify-between items-center border-b-[3px] border-[#1a2b4b] pb-2 mb-4">
                          <div>
                            <h1 className="text-lg font-black tracking-tight text-[#1a2b4b] uppercase">Verified Personnel Profile</h1>
                          </div>
                          <div className="text-right text-[9px] text-gray-500 font-mono leading-tight font-bold">
                            REF ID: #{userId}
                            <br />
                            DATE: {new Date().toLocaleDateString("en-GB")}
                          </div>
                        </div>

                        <div className="flex gap-5 mb-4">
                          <div className="w-[28%] flex-shrink-0">
                            {user?.img ? (
                              <img src={user.img} alt={user.name} className="w-full aspect-square object-cover rounded-lg border border-gray-200" />
                            ) : (
                              <div className="w-full aspect-square rounded-lg border border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center text-gray-400 gap-0.5">
                                <User size={18} strokeWidth={1.5} />
                                <span className="text-[8px] font-bold uppercase">No Photo</span>
                              </div>
                            )}
                          </div>

                          <div className="flex-1">
                            <h2 className="text-xl font-black text-[#1a2b4b] tracking-tight leading-tight">{user?.name}</h2>
                            <p className="text-xs italic text-gray-500 mb-3">{user?.email}</p>

                            <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest block mb-1.5 border-b border-gray-200 pb-0.5">
                              Official Contact Information
                            </span>

                            <div className="bg-[#f8fafc] border border-[#f1f5f9] rounded-lg p-3 grid grid-cols-2 gap-2.5">
                              <div className="col-span-2">
                                <b className="block text-[8px] text-gray-400 uppercase tracking-wider">Current Registered Address</b>
                                <p className="text-[11px] font-bold text-[#1e293b] leading-tight mt-0.5">{getCurrentAddressString()}</p>
                              </div>
                              <div>
                                <b className="block text-[8px] text-gray-400 uppercase tracking-wider">Primary Phone</b>
                                <p className="text-[11px] font-bold text-[#1e293b] mt-0.5">{user?.phone || "N/A"}</p>
                              </div>
                              <div>
                                <b className="block text-[8px] text-gray-400 uppercase tracking-wider">Document Status</b>
                                <p className="text-[11px] font-bold text-emerald-600 mt-0.5">✓ ACTIVE & VERIFIED</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-2">
                          <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest block mb-1.5 border-b border-gray-200 pb-0.5">
                            National Identity Card (NID)
                          </span>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="w-full h-28 aspect-[3/2] bg-[#f8fafc] border border-gray-300 rounded-lg overflow-hidden flex items-center justify-center p-1">
                                {user?.nid_front ? (
                                  <img src={user.nid_front} alt="NID Front" className="w-full h-full object-contain" />
                                ) : (
                                  <span className="text-[10px] text-gray-400 font-medium">Front Side Image Missing</span>
                                )}
                              </div>
                              <p className="text-[9px] font-bold text-gray-500 text-center mt-1 uppercase tracking-wide">NID: Front View</p>
                            </div>

                            <div>
                              <div className="w-full h-28 aspect-[3/2] bg-[#f8fafc] border border-gray-300 rounded-lg overflow-hidden flex items-center justify-center p-1">
                                {user?.nid_back ? (
                                  <img src={user.nid_back} alt="NID Back" className="w-full h-full object-contain" />
                                ) : (
                                  <span className="text-[10px] text-gray-400 font-medium">Back Side Image Missing</span>
                                )}
                              </div>
                              <p className="text-[9px] font-bold text-gray-500 text-center mt-1 uppercase tracking-wide">NID: Back View</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-gray-200 pt-2 flex justify-between items-center text-[8px] text-gray-400 font-mono font-bold mt-6">
                        <div>THIS IS A SYSTEM GENERATED DOCUMENT</div>
                        <div>SECURITY HASH: {userId ? `SEC-${userId}X79` : "N/A"}</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-zinc-900 border-t border-zinc-700 p-3 flex gap-2 justify-end">
                    <button
                      onClick={() => setShowPreview(false)}
                      className="px-3 py-1.5 bg-zinc-800 border border-zinc-600 text-zinc-300 hover:bg-zinc-700 text-xs font-semibold rounded-md transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDownloadId}
                      disabled={isDownloading}
                      className="flex items-center gap-1.5 bg-[#1a73e8] hover:bg-blue-600 text-white px-4 py-1.5 rounded-md text-xs font-semibold transition shadow-md shadow-blue-200 disabled:opacity-75"
                    >
                      {isDownloading ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Downloading...
                        </>
                      ) : (
                        <>
                          <Download size={14} />
                          Download PDF
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {showPasswordModal && (
            <UserChangePasswordModal
              showPasswordModal={showPasswordModal}
              setShowPasswordModal={setShowPasswordModal}
              passwordMutation={passwordMutation}
              handlePasswordSubmit={handlePasswordSubmit}
              newPassword={newPassword}
              setNewPassword={setNewPassword}
              userName={user?.name}
            />
          )}

          {showMigrationPanel && (
            <UserMigrationModal
              onClose={() => setShowMigrationPanel(false)}
              userName={user?.name}
              pendingResponsibilities={pendingResponsibilities}
              availableUsers={availableUsers}
              selectedTargetUser={selectedTargetUser}
              setSelectedTargetUser={setSelectedTargetUser}
              onExecuteMigration={handleExecuteMigration}
              isMigrating={migrationMutation.isPending}
            />
          )}
        </>
      )}
    </AnimatePresence>
  );
};

export default UserViewDrawer;
