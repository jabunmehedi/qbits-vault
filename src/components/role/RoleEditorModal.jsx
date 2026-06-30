import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, Shield, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { usePermissions } from "../../hooks/usePermissions";
import { useToast } from "../../hooks/useToast";
import { CreateRole, UpdateRole } from "../../services/Role";
import { useSelector } from "react-redux";
import { selectIsSuperAdmin } from "../../store/authSlice";
import { permissionLabel, preparePermissionGroups, roleLabel } from "../../utils/roleLabel";

const unwrapMutationResult = (result) => {
  if (result?.success === false) {
    throw result;
  }

  if (result?.status && result.status >= 400) {
    throw result?.data || result;
  }

  return result;
};

const RoleEditorModal = ({ isOpen, onClose, role, permissions, onSaved }) => {
  const [roleName, setRoleName] = useState("");
  const [selectedPerms, setSelectedPerms] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const { addToast } = useToast();
  const isSuperAdmin = useSelector(selectIsSuperAdmin);
  const { hasPermission } = usePermissions();

  const isEditMode = !!role?.id;
  const canSave = isSuperAdmin || hasPermission(isEditMode ? "role.edit" : "role.create");
  const canManageRolePermissions = isSuperAdmin || hasPermission("role.manage_permissions");

  useEffect(() => {
    if (!isOpen) return;

    setRoleName(role?.name || "");
    setSelectedPerms((role?.permissions || []).map((p) => p.id));
  }, [role, isOpen]);

  const groupedPermissions = useMemo(() => {
    return preparePermissionGroups(permissions);
  }, [permissions]);

  const togglePermission = (id) => {
    if (!canManageRolePermissions) return;
    setSelectedPerms((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  };

  const toggleGroup = (groupName) => {
    if (!canManageRolePermissions) return;

    const groupPerms = groupedPermissions[groupName] || [];
    const groupIds = groupPerms.map((p) => p.id);
    const allSelected = groupIds.every((id) => selectedPerms.includes(id));

    if (allSelected) {
      setSelectedPerms((prev) => prev.filter((id) => !groupIds.includes(id)));
    } else {
      setSelectedPerms((prev) => [...new Set([...prev, ...groupIds])]);
    }
  };

  const isGroupFullySelected = (groupName) => {
    const groupIds = groupedPermissions[groupName]?.map((p) => p.id) || [];
    return groupIds.length > 0 && groupIds.every((id) => selectedPerms.includes(id));
  };

  const handleSave = async () => {
    const trimmedName = roleName.trim();
    if (!trimmedName) {
      addToast({ type: "error", message: "Role name is required" });
      return;
    }

    setIsSaving(true);
    try {
      if (isEditMode) {
        await unwrapMutationResult(await UpdateRole(role.id, { name: trimmedName, permissions: selectedPerms }));
      } else {
        const created = await unwrapMutationResult(await CreateRole({
          name: trimmedName,
          type: "generic",
          scope: "global",
          is_editable: true,
          is_deletable: true,
        }));

        const createdRoleId = created?.data?.id;
        if (createdRoleId && selectedPerms.length > 0) {
          await unwrapMutationResult(await UpdateRole(createdRoleId, { name: trimmedName, permissions: selectedPerms }));
        }
      }

      addToast({
        type: "success",
        message: isEditMode ? "Role updated successfully!" : "Role created successfully!",
        duration: 2000,
      });

      onSaved?.();
    } catch (error) {
      addToast({
        type: "error",
        message: error?.message || error?.response?.data?.message || "Failed to save role",
      });
    } finally {
      setIsSaving(false);
    }
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
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-md z-[60]"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.99, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.99, y: 12 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-0 z-[70] bg-white overflow-hidden flex flex-col"
          >
            <div className="border-b border-slate-100 bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center shadow-2xs">
                  <Shield className="w-5 h-5 text-slate-400" />
                </div>
                <div className="min-w-0">
                  <p className="font-black text-slate-800 text-sm tracking-wide truncate">
                    {isEditMode ? roleLabel(role?.name) : "Create Role"}
                  </p>
                  <p className="text-xs text-slate-400 font-medium truncate mt-0.5">
                    {isEditMode ? "Edit generic role" : "Create generic role with permissions"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!canSave || isSaving}
                  className="px-4 py-2 bg-[#1a73e8] hover:bg-blue-600 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-xs flex items-center gap-2"
                >
                  {isSaving && <div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-white rounded-full animate-spin" />}
                  {isEditMode ? "Update Role" : "Create Role"}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-200/60 rounded-xl transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="border-b border-slate-100 px-6 py-5 bg-white">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Role name</label>
              <input
                type="text"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                readOnly={!canSave}
                placeholder="Role name..."
                className="w-full max-w-xl px-4 py-3 text-black bg-gray-50 border border-gray-100 rounded-xl outline-none text-sm read-only:text-gray-500"
              />
            </div>

            <div className="flex-1 overflow-auto p-6 bg-slate-50/50 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                {Object.entries(groupedPermissions).map(([groupName, perms]) => {
                  const allSelected = isGroupFullySelected(groupName);

                  return (
                    <div key={groupName} className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col justify-between">
                      <div>
                        <div className="flex px-4 py-3 items-center justify-between bg-slate-50 border-b border-slate-100">
                          <h4 className="capitalize font-black text-xs text-slate-700 tracking-wide">{groupName}</h4>
                          <button
                            type="button"
                            disabled={!canManageRolePermissions}
                            onClick={() => toggleGroup(groupName)}
                            className={`flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md border transition-all ${
                              allSelected
                                ? "bg-blue-50 text-[#1a73e8] border-blue-200/60"
                                : "bg-white text-slate-400 border-slate-200 hover:text-slate-600 hover:border-slate-300"
                            }`}
                          >
                            {allSelected ? "Clear All" : "Select All"}
                          </button>
                        </div>

                        <div className="p-3 space-y-1">
                          {perms.map((perm) => {
                            const isChecked = selectedPerms.includes(perm.id);
                            return (
                              <button
                                key={perm.id}
                                type="button"
                                disabled={!canManageRolePermissions}
                                onClick={() => togglePermission(perm.id)}
                                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all group ${
                                  isChecked ? "bg-slate-50/80 text-slate-800" : "text-slate-500 hover:bg-slate-50/40 hover:text-slate-700"
                                }`}
                              >
                                <div
                                  className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all flex-shrink-0 ${
                                    isChecked ? "bg-[#1a73e8] border-[#1a73e8] shadow-xs" : "bg-white border-slate-300 group-hover:border-slate-400"
                                  }`}
                                >
                                  {isChecked && <Check className="w-2.5 h-2.5 text-white stroke-[3.5]" />}
                                </div>
                                <span className="text-xs font-semibold capitalize tracking-wide truncate">
                                  {permissionLabel(perm.normalizedName || perm.name)}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default RoleEditorModal;
