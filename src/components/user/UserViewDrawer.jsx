import { motion, AnimatePresence } from "framer-motion";
import { Download, Loader2, MapPin, Shield, X } from "lucide-react";
import { useEffect, useState } from "react";
import { ArchiveUser, DisableUser, GetRoles, GetUser, ResetUserPassword } from "../../services/User";
import Avatar from "../helpers/Avatar";
import { RiVerifiedBadgeFill } from "react-icons/ri";
import { GetVaults, ToggleVaultAccess, UpdateVaultRoles } from "../../services/Vault";
import { FaCheckCircle } from "react-icons/fa";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import axiosConfig from "../../utils/axiosConfig";

const baseStorageUrl = import.meta.env.VITE_REACT_APP_STORAGE_URL;

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

  const handleDownloadId = async () => {
    setIsDownloading(true);
    try {
      const response = await axiosConfig.get(`/users/${userId}/download-id`, {
        responseType: "blob", // ✅ tells axios to return binary data
      });

      const url = window.URL.createObjectURL(response.data); // ✅ response.data, not response.blob()
      const a = document.createElement("a");
      a.href = url;
      a.download = `${user?.name}_Identity_Report.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  const isSuperAdmin = user?.roles?.some((role) => role.name == "super-admin");

  // ── 2. Optimized Mutation for Role Toggling ──
  const roleMutation = useMutation({
    mutationFn: ({ uid, vid, roles }) => UpdateVaultRoles(uid, vid, roles),
    onSuccess: (data, variables) => {
      // Find the actual role objects from our list to keep the UI consistent
      const newlySelectedRoles = rolesList.filter((r) => variables.roles.includes(r.id));

      queryClient.setQueryData(["users"], (oldUsers) => {
        if (!oldUsers) return [];
        return oldUsers.map((u) => (u.id === userId ? { ...u, roles: newlySelectedRoles } : u));
      });
    },
  });

  // ── 3. Optimized Mutation for Status (Disable/Enable) ──
  const statusMutation = useMutation({
    mutationFn: (uid) => DisableUser(uid),
    onSuccess: () => {
      const toggleStatus = (s) => (s === "inactive" ? "active" : "inactive");

      // Update Table Cache
      queryClient.setQueryData(["users"], (oldUsers) => {
        if (!oldUsers) return [];
        return oldUsers.map((u) => (u.id === userId ? { ...u, status: toggleStatus(u.status) } : u));
      });

      // Update Local Drawer State
      setUser((prev) => ({ ...prev, status: toggleStatus(prev.status) }));
    },
  });

  // ── 4. Optimized Mutation for Archiving ──
  const archiveMutation = useMutation({
    mutationFn: (uid) => ArchiveUser(uid),
    onSuccess: () => {
      queryClient.setQueryData(["users"], (oldUsers) => {
        if (!oldUsers) return [];
        return oldUsers.filter((u) => u.id !== userId); // Remove from list instantly
      });
      onClose();
    },
  });

  useEffect(() => {
    GetRoles().then((res) => {
      const roles = res?.data || [];
      setRolesList(roles);
    });
  }, [userId]);

  useEffect(() => {
    if (!isOpen || !userId) return;

    const initData = async () => {
      setLoading(true);
      try {
        const [vRes, rRes, uRes] = await Promise.all([GetVaults(), GetRoles(), GetUser(userId)]);
        setVaultList(vRes?.data || []);
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

  // useEffect(() => {
  //   const fetchUserData = async () => {
  //     setLoading(true);
  //     try {
  //       const res = await GetUser(userId);
  //       const userData = res?.data?.data || res?.data;
  //       setUser(userData);

  //       const assignments = userData?.vault_assignments || userData?.vaultAssignments || [];
  //       setUserAssignments(assignments);

  //       if (assignments.length > 0) {
  //         const first = assignments[assignments.length - 1];
  //         setActiveVaultId(first.vault_id);
  //         setActiveRoles((first.roles || []).map(Number));
  //       }
  //     } catch (err) {
  //       console.error("Failed to fetch user details:", err);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  //   fetchUserData();
  // }, [isOpen, userId]);

  const activeAssignment = userAssignments.find((a) => a.vault_id === activeVaultId);

  const toggleVaultAccess = async (vaultId) => {
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
    } catch (error) {
      console.error("Toggle failed:", error);
    }
  };

  // const toggleRole = async (role) => {
  //   if (!activeVaultId) return;
  //   const isCurrentlyEnabled = activeRoles.map(Number).includes(Number(role.id));
  //   const newRoles = isCurrentlyEnabled ? activeRoles.filter((id) => Number(id) !== Number(role.id)) : [...activeRoles, role.id];

  //   try {
  //     await UpdateVaultRoles(userId, activeVaultId, newRoles);
  //     setActiveRoles(newRoles.map(Number));
  //     setUserAssignments((prev) => prev.map((assign) => (assign.vault_id === activeVaultId ? { ...assign, roles: newRoles } : assign)));
  //     refetch();
  //   } catch (error) {
  //     console.error("Role toggle failed:", error);
  //   }
  // };
  const toggleRole = (role) => {
    if (!activeVaultId) return;
    const isCurrentlyEnabled = activeRoles.includes(Number(role.id));
    const newRoles = isCurrentlyEnabled ? activeRoles.filter((id) => id !== Number(role.id)) : [...activeRoles, role.id];

    // Trigger optimized mutation
    roleMutation.mutate({ uid: userId, vid: activeVaultId, roles: newRoles });
    setActiveRoles(newRoles.map(Number));
  };

  const handleDisableUser = () => statusMutation.mutate(userId);
  const handleArchiveUser = () => archiveMutation.mutate(userId);

  // const handleDisableUser = async () => {
  //   setActionLoading("disable");
  //   try {
  //     await DisableUser(userId);
  //     setUser((prev) => ({
  //       ...prev,
  //       status: prev.status === "inactive" ? "active" : "inactive",
  //     }));
  //     refetch();
  //   } catch (err) {
  //     console.error(err);
  //   } finally {
  //     setActionLoading(null);
  //   }
  // };

  // const handleArchiveUser = async () => {
  //   setActionLoading("archive");
  //   try {
  //     await ArchiveUser(userId);
  //     setUser((prev) => ({ ...prev, status: "archived" }));
  //     refetch();
  //   } catch (err) {
  //     console.error(err);
  //   } finally {
  //     setActionLoading(null);
  //   }
  // };

  const handleResetPassword = async () => {
    setActionLoading("reset");
    try {
      await ResetUserPassword(userId);
      alert("Password reset email sent!");
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const assignedVaults = vaultList.filter((vault) => userAssignments.some((a) => a.vault_id === vault.id && (a.status === "active" || a.status === 1)));

  console.log({ user });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: "easeInOut" }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-[60]"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{
              type: "spring",
              damping: 30,
              stiffness: 220,
              mass: 0.8,
            }}
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

            {/* Loading State */}
            {loading && (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-gray-500">Loading user details...</p>
              </div>
            )}

            {/* Main Content */}
            {!loading && user && (
              <div className="flex-1 overflow-y-auto space-y-8">
                <div className="flex items-center p-6 justify-between">
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

                  <div className="flex flex-col  gap-2">
                    <div className="flex justify-end items-center gap-2">
                      <button
                        onClick={handleDownloadId}
                        disabled={isDownloading}
                        className="flex items-center justify-center gap-2 text-black bg-white border border-gray-300 hover:border-gray-400 py-1.5 px-4 rounded-lg text-sm font-semibold transition disabled:opacity-70"
                      >
                        {isDownloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                        ID
                      </button>

                      <button
                        onClick={handleResetPassword}
                        disabled={actionLoading === "reset"}
                        className="flex items-center justify-center gap-2 bg-indigo-500 text-white border border-gray-300 hover:border-gray-400 py-2 px-3 rounded-lg text-xs font-semibold transition disabled:opacity-50"
                      >
                        {actionLoading === "reset" ? "Sending..." : "Reset Pass"}
                      </button>

                      {/* Address Tooltip Container */}
                      <div className="relative group">
                        <button className="flex items-center justify-center gap-2 bg-indigo-500 border border-gray-300 hover:border-gray-400 py-2 px-3 rounded-lg text-xs font-semibold transition cursor-help">
                          <MapPin size={16} className="text-white" />
                        </button>

                        {/* Tooltip Card - Positioned TOP-FULL (appears below) */}
                        <div className="absolute top-full right-0 mt-2 w-64 p-4 bg-white border border-gray-200 rounded-xl shadow-xl opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 z-[80] origin-top-right">
                          <div className="space-y-3">
                            <div>
                              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Current Address</p>
                              <p className="text-xs text-gray-700 mt-0.5 leading-relaxed">
                                {[user?.current_address, user?.current_thana, user?.current_district, user?.current_division]
                                  .filter(Boolean) // Removes null, undefined, or empty strings
                                  .join(", ")}{" "}
                                {/* Joins them with a comma and a space */}
                              </p>
                            </div>
                            <div className="pt-2 border-t border-gray-100">
                              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Permanent Address</p>
                              <p className="text-xs text-gray-700 mt-0.5 leading-relaxed">
                                {[user?.permanent_address, user?.permanent_thana, user?.permanent_district, user?.permanent_division]
                                  .filter(Boolean) // Removes null, undefined, or empty strings
                                  .join(", ")}{" "}
                                {/* Joins them with a comma and a space */}
                              </p>
                            </div>
                          </div>

                          {/* Tooltip Arrow - Points Up */}
                          <div className="absolute -top-1 right-4 w-2 h-2 bg-white border-t border-l border-gray-200 rotate-45"></div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center w-full text-xs gap-3">
                      <button
                        onClick={handleDisableUser}
                        disabled={actionLoading === "disable" || isSuperAdmin}
                        className={` text-white px-3 py-2 rounded-lg font-bold transition disabled:opacity-20 disabled:bg-gray-500 ${
                          user?.status === "inactive" ? "bg-green-600 hover:bg-green-700" : "bg-[#AE2448] hover:bg-red-800"
                        }`}
                      >
                        {actionLoading === "disable" ? "..." : user?.status === "inactive" ? "ENABLE USER" : "DISABLE USER"}
                      </button>
                      <button
                        onClick={handleArchiveUser}
                        disabled={actionLoading === "archive" || user?.status === "archived"}
                        className={` text-white px-3 py-2 rounded-lg font-bold transition disabled:opacity-50 ${
                          user?.status === "archived" ? "bg-gray-400" : "bg-[#AE2448] hover:bg-red-800"
                        }`}
                      >
                        {actionLoading === "archive" ? "..." : user?.status === "archived" ? "ARCHIVED" : "ARCHIVE USER"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Network Access Control */}
                <div className="grid grid-cols-3 p-6 bg-[#F6F7F9] rounded-lg gap-6">
                  <div>
                    <div className="mb-6">
                      <h4 className="text-blue-600 font-bold uppercase text-xs mb-4">NETWORK ACCESS CONTROL</h4>
                      <div className="bg-white border border-gray-200 py-3 rounded-2xl">
                        {vaultList.map((vault) => {
                          const assignment = userAssignments.find((a) => a.vault_id === vault.id);
                          const isActive = assignment && (assignment.status === "active" || assignment.status === 1);
                          return (
                            <div
                              key={vault.id}
                              className="text-sm text-black border-gray-100 rounded-3xl px-5 py-2.5 flex items-center justify-between  transition"
                            >
                              <div className="flex items-center text-xs gap-3">
                                <div className="p-2 bg-gray-100 rounded-xl">🔒</div>
                                <p className="font-semibold">{vault.name}</p>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={isActive} onChange={() => toggleVaultAccess(vault.id)} className="sr-only peer" />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
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
                                className={`flex items-center gap-3 w-full rounded-2xl ${
                                  activeVaultId === vault.id ? "border-blue-600 !bg-black text-white" : "border-gray-100 text-gray-600"
                                }`}
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
                        {rolesList?.map((role) => {
                          const isEnabled = activeRoles.includes(role.id);
                          return (
                            <div
                              key={role.id}
                              onClick={() => toggleRole(role)}
                              className={`rounded-3xl p-4 flex items-center justify-between cursor-pointer transition-all border ${
                                isEnabled ? "bg-blue-600 text-white border-blue-600" : "bg-white border-gray-200 hover:border-gray-300"
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
        </>
      )}
    </AnimatePresence>
  );
};

export default UserViewDrawer;
