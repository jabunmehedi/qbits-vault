import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Plus, Search, Shield } from "lucide-react";
import { useSelector } from "react-redux";
import { DeleteRole } from "../../services/Role";
import { GetRoles } from "../../services/User";
import { usePermissions } from "../../hooks/usePermissions";
import { useToast } from "../../hooks/useToast";
import { selectIsSuperAdmin } from "../../store/authSlice";
import { roleLabel } from "../../utils/roleLabel";
import RoleEditorModal from "../../components/role/RoleEditorModal";
import DataTable from "../../components/global/dataTable/DataTable";

const Roles = () => {
  const [activeActionMenuId, setActiveActionMenuId] = useState(null);
  const [deletingRoleId, setDeletingRoleId] = useState(null);
  const [roleEditorOpen, setRoleEditorOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const isSuperAdmin = useSelector(selectIsSuperAdmin);
  const { hasPermission } = usePermissions();

  const canCreateRole = isSuperAdmin || hasPermission("role.create");
  const canDeleteRole = isSuperAdmin || hasPermission("role.delete");

  const { data: roles = [], isLoading: isRolesLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const res = await GetRoles();
      return res?.data ?? [];
    },
  });

  const { data: permissions = [] } = useQuery({
    queryKey: ["permissions"],
    queryFn: async () => {
      const axiosConfig = (await import("../../utils/axiosConfig")).default;
      const res = await axiosConfig.get("/permissions");
      return res?.data?.data ?? res?.data ?? [];
    },
  });

  const genericRoles = useMemo(
    () => roles.filter((role) => role.type === "generic"),
    [roles],
  );

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const filteredRoles = useMemo(() => {
    if (!debouncedSearch.trim()) return genericRoles;

    const query = debouncedSearch.trim().toLowerCase();
    return genericRoles.filter((role) => role.name?.toLowerCase().includes(query));
  }, [genericRoles, debouncedSearch]);

  const deleteMutation = useMutation({
    mutationFn: async (roleId) => {
      const result = await DeleteRole(roleId);
      if (result?.success === false) throw result;
      if (result?.status && result.status >= 400) throw result?.data || result;
      return result;
    },
    onSuccess: (_data, roleId) => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      addToast({ type: "success", message: "Role deleted successfully" });
      setActiveActionMenuId(null);
      setDeletingRoleId(null);
    },
    onError: (error) => {
      addToast({ type: "error", message: error?.response?.data?.message || "Failed to delete role" });
      setActiveActionMenuId(null);
      setDeletingRoleId(null);
    },
  });

  const columns = useMemo(() => {
    const roleColumn = {
      title: "ROLE",
      key: "name",
      className: "w-[60%] text-left",
      render: (row) => (
        <div className="flex items-center gap-3 py-2">
          <div className="w-10 h-10 rounded-xl border border-blue-100 bg-blue-50 flex items-center justify-center shrink-0">
            <Shield className="w-4 h-4 text-blue-500" />
          </div>
          <div className="min-w-0">
            <span className="font-bold text-[#1a2b4b] text-sm tracking-tight truncate block">{roleLabel(row.name)}</span>
          </div>
        </div>
      ),
    };

    const manageColumn = {
      title: "ACTION",
      key: "manage",
      className: "text-center w-[6%] relative",
      noClip: true,
      render: (row) => {
        const isMenuOpen = activeActionMenuId === row.id;
        const isConfirmingDelete = deletingRoleId === row.id;
        const isAssigned = Number(row.users_count || 0) > 0;

        const toggleMenu = (e) => {
          e.stopPropagation();
          setActiveActionMenuId(isMenuOpen ? null : row.id);
          setDeletingRoleId(null);
        };

        const handleDeleteClick = (e) => {
          e.stopPropagation();
          setDeletingRoleId(row.id);
        };

        const handleCancelDelete = (e) => {
          e.stopPropagation();
          setDeletingRoleId(null);
        };

        return (
          <div className="relative inline-block text-left">
            <button
              onClick={toggleMenu}
              className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 focus:outline-none transition-colors cursor-pointer"
              aria-label="Actions"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 12c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
              </svg>
            </button>

            {isMenuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                transition={{ duration: 0.15 }}
                className={`absolute right-0 mt-1 bg-white border border-gray-200 divide-y divide-gray-100 rounded-lg shadow-xl z-50 overflow-hidden ${isConfirmingDelete ? "w-44" : "w-36"}`}
              >
                <AnimatePresence mode="wait">
                  {!isConfirmingDelete ? (
                    <motion.div key="options" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveActionMenuId(null);
                          setEditingRole(row);
                          setRoleEditorOpen(true);
                        }}
                        className="flex items-center w-full px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors gap-2 font-medium cursor-pointer"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                      {canDeleteRole && (
                        <button
                          onClick={isAssigned ? undefined : handleDeleteClick}
                          disabled={isAssigned}
                          title={isAssigned ? "This role is assigned to one or more users and cannot be deleted." : "Delete"}
                          className={`flex items-center w-full px-3 py-2 text-sm gap-2 font-medium transition-colors ${
                            isAssigned
                              ? "text-gray-300 cursor-not-allowed bg-white"
                              : "text-red-600 hover:bg-red-50 cursor-pointer"
                          }`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="confirm"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="py-4 text-center"
                    >
                      <p className="text-xs text-gray-500 font-medium mb-2">Are you sure?</p>
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={handleCancelDelete}
                          disabled={deleteMutation.isPending}
                          className="px-2 py-1 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-600 rounded transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          No
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteMutation.mutate(row.id);
                          }}
                          disabled={deleteMutation.isPending}
                          className="px-2 py-1 text-xs font-semibold bg-red-500 hover:bg-red-600 text-white rounded transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed min-w-[44px] flex justify-center"
                        >
                          {deleteMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Yes"}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        );
      },
    };

    return [roleColumn, manageColumn];
  }, [activeActionMenuId, canDeleteRole, deleteMutation.isPending, deletingRoleId]);

  return (
    <div className="font-sans">
      <div className="flex justify-between items-center mb-10">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-10 bg-[#1a2b4b] rounded-full" />
          <div>
            <h1 className="xl:text-2xl font-black text-[#1a2b4b] uppercase">Role List</h1>
            <p className="text-[8px] xl:text-[10px] font-bold text-gray-400 tracking-[0.2em] uppercase">Role Management</p>
          </div>
        </div>

        <div className="flex gap-4">
          {canCreateRole && (
            <button
              onClick={() => {
                setEditingRole(null);
                setRoleEditorOpen(true);
              }}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#1a73e8] text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-200 hover:bg-blue-600 transition-all"
            >
              <Plus className="w-5 h-5" /> Create Role
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search roles..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 ring-blue-100 outline-none text-gray-700 font-medium"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredRoles}
        paginationData={{ current_page: 1, per_page: filteredRoles.length || 1, total: filteredRoles.length }}
        isLoading={isRolesLoading}
        hideFooter
        className="h-[calc(100vh-240px)]"
      />

      <RoleEditorModal
        isOpen={roleEditorOpen}
        onClose={() => setRoleEditorOpen(false)}
        role={editingRole}
        permissions={permissions}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ["roles"] });
          setRoleEditorOpen(false);
        }}
      />
    </div>
  );
};

export default Roles;
