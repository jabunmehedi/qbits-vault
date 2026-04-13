import { useRef, useState } from "react";
import CustomModal from "../global/modal/CustomModal";
import { useToast } from "../../hooks/useToast";
import axiosConfig from "../../utils/axiosConfig";
import { Check, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
const INITIAL_FORM = { name: "", email: "", password: "", role: [] };

const CreateNewUserModal = ({ setOpenModel, fetchUsers, roles, roleSearch, setRoleSearch, dropdownOpen, setDropdownOpen,toggleRole }) => {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const { addToast } = useToast();
  const dropdownRef = useRef(null);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.role.length) {
      addToast({ type: "error", message: "Please select at least one role" });
      return;
    }
    try {
      await axiosConfig.post("/users", formData);
      addToast({ type: "success", message: "User created successfully" });
      setFormData(INITIAL_FORM);
      setOpenModel(false);
      fetchUsers();
    } catch (err) {
      addToast({ type: "error", message: err.response?.data?.message || "Failed to create user" });
    }
  };

  return (
    <CustomModal
      isCloseModal={() => {
        setOpenModel(false);
        setFormData(INITIAL_FORM);
      }}
    >
      <h2 className="text-lg font-bold text-[#1a2b4b] mb-6 uppercase tracking-tight">Create New User</h2>
      <form onSubmit={handleCreateSubmit} className="space-y-4">
        {["name", "email", "password"].map((field) => (
          <div key={field}>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{field}</label>
            <input
              type={field === "password" ? "password" : "text"}
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-400 text-sm"
              onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
              required
            />
          </div>
        ))}

        {/* Role Dropdown from your first code */}
        <div className="relative" ref={dropdownRef}>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Assign Roles</label>
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-left text-sm flex justify-between items-center"
          >
            <span className={formData.role.length ? "text-gray-900" : "text-gray-400"}>
              {formData.role.length ? `${formData.role.length} Roles Selected` : "Select Roles"}
            </span>
            <ChevronDown size={16} />
          </button>

          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute z-50 w-full mt-2 bg-white border border-gray-200 shadow-xl rounded-xl p-2"
              >
                <input
                  type="text"
                  placeholder="Search roles..."
                  className="w-full p-2 mb-2 bg-gray-50 rounded-lg text-xs outline-none"
                  onChange={(e) => setRoleSearch(e.target.value)}
                />
                <div className="max-h-40 overflow-y-auto">
                  {roles
                    .filter((r) => r.name.toLowerCase().includes(roleSearch.toLowerCase()))
                    .map((role) => (
                      <div
                        key={role.id}
                        onClick={() => toggleRole(role.id)}
                        className="flex items-center justify-between p-2 hover:bg-blue-50 rounded-lg cursor-pointer"
                      >
                        <span className="text-xs font-bold text-gray-700">{role.name}</span>
                        {formData.role.includes(role.id) && <Check size={14} className="text-blue-600" />}
                      </div>
                    ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button type="submit" className="w-full py-3 bg-[#1a2b4b] text-white rounded-xl font-bold uppercase text-xs tracking-widest mt-4">
          Create User
        </button>
      </form>
    </CustomModal>
  );
};

export default CreateNewUserModal;
