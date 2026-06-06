import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Shield, X, Trash2 } from "lucide-react";
import { useToast } from "../../hooks/useToast";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { selectIsAdmin, selectIsSuperAdmin } from "../../store/authSlice";
import { usePermissions } from "../../hooks/usePermissions";
import { CreateRole, DeleteRole } from "../../services/Role"; // Assuming DeleteRole exists here

const RoleDrawer = ({ isOpen, onClose, rolesList, refetchRoles }) => {
  const [newRoleName, setNewRoleName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [deletingRoleId, setDeletingRoleId] = useState(null); // Tracks which role shows the tooltip

  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const isSuperAdmin = useSelector(selectIsSuperAdmin);
  const isAdmin = useSelector(selectIsAdmin);

  const { hasPermission } = usePermissions();

  const canCreateRole = isSuperAdmin || (isAdmin && hasPermission("role.create"));
  const canDeleteRole = isSuperAdmin || (isAdmin && hasPermission("role.delete"));

  // Create Mutation
  const mutation = useMutation({
    onMutate: () => {
      setIsLoading(true);
    },
    mutationFn: (roleName) => CreateRole({ name: roleName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      addToast({ type: "success", message: "Role created successfully" });
      setNewRoleName("");
    },
    onError: (error) => {
      addToast({ type: "error", message: error?.response?.data?.message || "Failed to create role" });
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (roleId) => DeleteRole(roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      addToast({ type: "success", message: "Role deleted successfully" });
      setDeletingRoleId(null);
    },
    onError: (error) => {
      addToast({ type: "error", message: error?.response?.data?.message || "Failed to delete role" });
      setDeletingRoleId(null);
    },
  });

  const handleCreateRole = () => {
    if (!newRoleName) return addToast({ type: "error", message: "Role name is required" });
    mutation.mutate(newRoleName);
  };

  const handleDeleteRole = (id) => {
    deleteMutation.mutate(id);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]"
          />
          <motion.div className="fixed right-0 top-0 h-full w-[400px] bg-white z-[70] shadow-2xl p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-[#1a2b4b]">ROLE MANAGEMENT</h3>
              <X className="cursor-pointer text-gray-400" onClick={onClose} />
            </div>

            {/* Create Role Form */}
            <div className="mb-8">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Role Identifier</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="Role Name..."
                  className="flex-1 px-4 py-2 text-black bg-gray-50 border border-gray-100 rounded-lg outline-none focus:border-blue-400 text-sm"
                />
                {canCreateRole && (
                  <button
                    onClick={handleCreateRole}
                    disabled={isLoading}
                    className={`${isLoading ? "bg-gray-200 cursor-not-allowed" : "bg-[#1a2b4b]"} text-white px-4 py-2 rounded-lg text-xs font-bold uppercase`}
                  >
                    {isLoading ? <Loader2 className="animate-spin w-4 h-4 mx-4 text-black" /> : "Create"}
                  </button>
                )}
              </div>
            </div>

            {/* Roles List */}
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Existing Roles</p>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
              {rolesList
                .filter((role) => role.name !== "super-admin")
                .map((role) => (
                  <div
                    key={role.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 group hover:border-blue-200 transition-all relative"
                  >
                    <div className="flex items-center gap-3">
                      <Shield className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-bold text-gray-700 uppercase">{role.name}</span>
                    </div>

                    {canDeleteRole && (
                      <div className="relative flex items-center">
                        {/* Tooltip Confirmation Overlay */}
                        <AnimatePresence>
                          {deletingRoleId === role.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -5 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -5 }}
                              className="absolute right-0 bottom-full mb-2 bg-slate-900 text-white p-2.5 rounded-lg shadow-xl !z-[9999] flex flex-col gap-1.5 w-48 text-center"
                            >
                              <p className="text-[11px] font-medium leading-tight">Are you sure you want to delete this role?</p>
                              <div className="flex justify-center gap-2 mt-0.5">
                                <button
                                  onClick={() => setDeletingRoleId(null)}
                                  className="px-2 py-1 text-[10px] font-bold uppercase bg-gray-700 hover:bg-gray-600 rounded"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleDeleteRole(role.id)}
                                  disabled={deleteMutation.isPending}
                                  className="px-2 py-1 text-[10px] font-bold uppercase bg-red-500 hover:bg-red-600 rounded flex items-center justify-center min-w-[40px]"
                                >
                                  {deleteMutation.isPending ? <Loader2 className="animate-spin w-3 h-3" /> : "Delete"}
                                </button>
                              </div>
                              {/* Small Arrow pointing down to the button */}
                              <div className="w-2 h-2 bg-slate-900 rotate-45 absolute bottom-[-4px] right-3"></div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Main Trash Icon Button */}
                        <button
                          onClick={() => setDeletingRoleId(deletingRoleId === role.id ? null : role.id)}
                          className={`transition-all ${deletingRoleId === role.id ? "text-red-500 opacity-100" : "opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500"}`}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default RoleDrawer;
