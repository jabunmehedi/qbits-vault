import { AnimatePresence, motion } from "framer-motion";
import { Check, Shield, UserIcon, X } from "lucide-react";
import { useEffect, useState } from "react";
import { UpdatePermissions } from "../../services/Permission";
import { a } from "framer-motion/client";
import { useToast } from "../../hooks/useToast";

const baseStorageUrl = import.meta.env.VITE_REACT_APP_STORAGE_URL;

const Avatar = ({ src, name, size = "sm" }) => {
  const dim = size === "lg" ? "w-13 h-13" : "w-9 h-9";
  const icon = size === "lg" ? "w-6 h-6" : "w-4 h-4";

  return src ? (
    <img src={baseStorageUrl + "/" + src} alt={name} className={`${dim} rounded-xl object-cover border border-gray-200`} />
  ) : (
    <div className={`${dim} rounded-xl border border-gray-200 bg-white flex items-center justify-center`}>
      <UserIcon className={`${icon} text-gray-400`} />
    </div>
  );
};

const PermissionViewer = ({ isOpen, onClose, user, permissions }) => {
  const [selectedPerms, setSelectedPerms] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const { addToast } = useToast();

  // Load current user permissions
  useEffect(() => {
    if (user?.permissions && isOpen) {
      setSelectedPerms(user.permissions.map((p) => p.id));
    }
  }, [user, isOpen]);

  // Group permissions
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
      // Deselect all in group
      setSelectedPerms((prev) => prev.filter((id) => !groupIds.includes(id)));
    } else {
      // Select all in group
      setSelectedPerms((prev) => [...new Set([...prev, ...groupIds])]);
    }
  };

  const isGroupFullySelected = (groupName) => {
    const groupIds = groupedPermissions[groupName].map((p) => p.id);
    return groupIds.every((id) => selectedPerms.includes(id));
  };

  const isGroupPartiallySelected = (groupName) => {
    const groupIds = groupedPermissions[groupName].map((p) => p.id);
    return groupIds.some((id) => selectedPerms.includes(id)) && !isGroupFullySelected(groupName);
  };

  const handleReset = () => {
    setSelectedPerms(user?.permissions?.map((p) => p.id) || []);
  };

  const handleSave = async () => {
    if (!user?.id) return;

    setIsSaving(true);

    try {
      await UpdatePermissions(user.id, selectedPerms);

      // Force toast with more visible styling
      addToast({
        type: "success",
        message: "✅ Permissions updated successfully!",
        duration: 2000,
      });
    } catch (error) {
      console.error("❌ Error:", error);
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60]"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-[70] bg-white overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="border-b border-gray-100 bg-white px-8 py-6 flex items-center justify-between sticky top-0 z-10">
              {user && (
                <div className="flex items-center gap-4">
                  <Avatar src={user.img} name={user.name} size="lg" />
                  <div>
                    <p className="font-bold text-lg uppercase text-[#1a2b4b]">{user.name}</p>
                    <p className="text-sm text-blue-800">{user.email}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                {/* <button
                  onClick={handleReset}
                  className="px-6 py-3 border border-gray-200 text-[#1a2b4b] rounded-2xl text-sm font-bold hover:bg-gray-50 transition"
                >
                  Reset to Default
                </button> */}
                <button
                  onClick={handleSave}
                  className="px-6 py-2 uppercase bg-blue-800 text-white rounded-2xl font-bold text-sm hover:bg-black transition shadow-lg"
                >
                  Update Permission
                </button>
                <button onClick={onClose} className="p-3 hover:bg-gray-100 rounded-2xl transition">
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Permissions Content */}
            <div className="flex-1 overflow-auto p-8 bg-[#f8fafd]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                {Object.entries(groupedPermissions).map(([groupName, perms]) => {
                  const allSelected = isGroupFullySelected(groupName);
                  const partiallySelected = isGroupPartiallySelected(groupName);

                  return (
                    <div key={groupName} className="bg-white rounded-3xl border border-gray-100">
                      {/* Group Header with Select All */}
                      <div className="flex p-6 items-center justify-between mb-2 bg-blue-50/40 border-b border-gray-200 pb-3">
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={allSelected}
                              onChange={() => toggleGroup(groupName)}
                              className="w-5 h-5 accent-[#3EAAFF] cursor-pointer"
                            />
                          </label>
                          <h4 className="capitalize font-semibold text-sm text-gray-600">{groupName}</h4>
                        </div>
                      </div>

                      {/* Permissions List */}
                      <div className="px-6">
                        {perms.map((perm) => {
                          const isChecked = selectedPerms.includes(perm.id);
                          return (
                            <div
                              key={perm.id}
                              onClick={() => togglePermission(perm.id)}
                              className="flex items-center gap-3 py-2 rounded-2xl hover:bg-gray-50 cursor-pointer transition-all"
                            >
                              <div
                                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all mt-0.5 ${
                                  isChecked ? "bg-[#3EAAFF] border-[#3EAAFF]" : "bg-white border-gray-300"
                                }`}
                              >
                                {isChecked && <Check className="w-3 h-3 text-white" />}
                              </div>
                              <span className="text-xs font-medium text-gray-700 capitalize">{perm.name.split(".").slice(1).join(" ") || perm.name}</span>
                            </div>
                          );
                        })}
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
