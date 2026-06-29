import { AnimatePresence, motion } from "framer-motion";
import { Check, UserIcon, X } from "lucide-react";
import { useEffect, useState } from "react";
import { UpdatePermissions } from "../../services/Permission";
import { useToast } from "../../hooks/useToast";
import { useDispatch, useSelector } from "react-redux";
import { fetchAuthUser, selectIsAdmin, selectIsSuperAdmin } from "../../store/authSlice";
import { usePermissions } from "../../hooks/usePermissions";
import { permissionLabel } from "../../utils/roleLabel";

const baseStorageUrl = import.meta.env.VITE_REACT_APP_STORAGE_URL;

const Avatar = ({ src, name, size = "sm" }) => {
  const dim = size === "lg" ? "w-11 h-11" : "w-8 h-8";
  const icon = size === "lg" ? "w-5 h-5" : "w-4 h-4";

  return src ? (
    <img src={baseStorageUrl + "/" + src} alt={name} className={`${dim} rounded-xl object-cover border border-slate-200/80 shadow-2xs`} />
  ) : (
    <div className={`${dim} rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center shadow-2xs`}>
      <UserIcon className={`${icon} text-slate-400`} />
    </div>
  );
};

const PermissionViewer = ({ isOpen, onClose, user, permissions, onSaved }) => {
  const [selectedPerms, setSelectedPerms] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const { addToast } = useToast();

  const isSuperAdmin = useSelector(selectIsSuperAdmin);
  const isAdmin = useSelector(selectIsAdmin);

  const { hasPermission } = usePermissions();

  const canEdit = isSuperAdmin || (isAdmin && hasPermission("permission.edit"));

  const dispatch = useDispatch();

  const loadpermissions = () => {
    if (user?.permissions && isOpen) {
      setSelectedPerms(user.permissions.map((p) => p.id));
    }
  };

  useEffect(() => {
    loadpermissions();
  }, [user, isOpen]);

  const groupedPermissions = permissions.reduce((acc, perm) => {
    const [group] = perm.name.split(".");
    if (!acc[group]) acc[group] = [];
    acc[group].push(perm);
    return acc;
  }, {});

  const togglePermission = (id) => {
    setSelectedPerms((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  };

  const toggleGroup = (groupName) => {
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
    if (!user?.id) return;

    setIsSaving(true);
    try {
      const res = await UpdatePermissions(user.id, selectedPerms);

      if (!res?.success) {
        addToast({
          type: "error",
          message: res?.message || "Failed to update permissions",
          duration: 2000,
        });
        return;
      }

      await dispatch(fetchAuthUser());
      onSaved?.();

      addToast({
        type: "success",
        message: "Permissions updated successfully!",
        duration: 2000,
      });
    } catch (error) {
      console.error(" Error:", error);
      addToast({
        type: "error",
        message: "Failed to update permissions",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay Dimmer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-md z-[60]"
          />

          {/* Fullscreen Modal Drawer Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.99, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.99, y: 12 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-0 z-[70] bg-white overflow-hidden flex flex-col"
          >
            {/* Header Content Wrapper */}
            <div className="border-b border-slate-100 bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-10">
              {user && (
                <div className="flex items-center gap-3.5 min-w-0">
                  <Avatar src={user.img} name={user.name} size="lg" />
                  <div className="min-w-0">
                    <p className="font-black text-slate-800 text-sm tracking-wide truncate">{user.name}</p>
                    <p className="text-xs text-slate-400 font-medium truncate mt-0.5">{user.email}</p>
                  </div>
                </div>
              )}

              {/* Top Controls Action Row */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!canEdit || isSaving}
                  className="px-4 py-2 bg-[#1a73e8] hover:bg-blue-600 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-xs flex items-center gap-2"
                >
                  {isSaving && <div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-white rounded-full animate-spin" />}
                  Update Permissions
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

            {/* Scope Content Area Grid */}
            <div className="flex-1 overflow-auto p-6 bg-slate-50/50 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                {Object.entries(groupedPermissions).map(([groupName, perms]) => {
                  const allSelected = isGroupFullySelected(groupName);

                  return (
                    <div key={groupName} className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col justify-between">
                      <div>
                        {/* Domain Group Matrix Item Header */}
                        <div className="flex px-4 py-3 items-center justify-between bg-slate-50 border-b border-slate-100">
                          <h4 className="capitalize font-black text-xs text-slate-700 tracking-wide">{groupName}</h4>

                          <button
                            type="button"
                            disabled={!canEdit}
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

                        {/* Individual Flag Permissions Rows Mapping */}
                        <div className="p-3 space-y-1">
                          {perms.map((perm) => {
                            const isChecked = selectedPerms.includes(perm.id);
                            return (
                              <button
                                key={perm.id}
                                type="button"
                                disabled={!canEdit}
                                onClick={() => togglePermission(perm.id)}
                                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all group ${
                                  isChecked ? "bg-slate-50/80 text-slate-800" : "text-slate-500 hover:bg-slate-50/40 hover:text-slate-700"
                                }`}
                              >
                                {/* Micro Custom Toggle Dot Matrix Circle */}
                                <div
                                  className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all flex-shrink-0 ${
                                    isChecked ? "bg-[#1a73e8] border-[#1a73e8] shadow-xs" : "bg-white border-slate-300 group-hover:border-slate-400"
                                  }`}
                                >
                                  {isChecked && <Check className="w-2.5 h-2.5 text-white stroke-[3.5]" />}
                                </div>
                                <span className="text-xs font-semibold capitalize tracking-wide truncate">
                                  {permissionLabel(perm.name)}
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

export default PermissionViewer;
