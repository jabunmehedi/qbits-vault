import { motion, AnimatePresence } from "framer-motion";
import { Shield, X } from "lucide-react";
import { MdDelete } from "react-icons/md";
import { useToast } from "../../hooks/useToast";
import { useState } from "react";
import axiosConfig from "../../utils/axiosConfig";

const RoleDrawer = ({ isOpen, onClose, rolesList, refetchRoles }) => {
  const [newRoleName, setNewRoleName] = useState("");

  const { addToast } = useToast();



  const handleCreateRole = async () => {
    if (!newRoleName) return addToast({ type: "error", message: "Role name is required" });
    try {
      await axiosConfig.post("/roles", { name: newRoleName });
      addToast({ type: "success", message: "Role created successfully" });
      setNewRoleName("");

      refetchRoles(); // Refresh roles list
      // Refresh roles list
      //   const res = await GetRoles();
    } catch (err) {
      addToast({ type: "error", message: "Failed to create role" });
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
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]"
          />
          <motion.div
            // initial={{ x: "100%" }}
            // animate={{ x: 0 }}
            // exit={{ x: "100%" }}
            className="fixed right-0 top-0 h-full w-[400px] bg-white z-[70] shadow-2xl p-8"
          >
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
                <button onClick={handleCreateRole} className="bg-[#1a2b4b] text-white px-4 py-2 rounded-lg text-xs font-bold uppercase">
                  Add
                </button>
              </div>
            </div>

            {/* Roles List */}
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Existing Roles</p>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
              {rolesList.map((role) => (
                <div
                  key={role.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 group hover:border-blue-200 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Shield className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-bold text-gray-700 uppercase">{role.name}</span>
                  </div>
                  <button className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all">
                    <MdDelete size={18} />
                  </button>
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
