import { useEffect, useRef, useState } from "react";
import CustomModal from "../global/modal/CustomModal";
import { useToast } from "../../hooks/useToast";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CreateUser } from "../../services/User";

// ─── Constants ────────────────────────────────────────────────────────────────
const SUPERADMIN_NAMES = ["Superadmin", "Super Admin", "superadmin", "super-admin"];

const INITIAL_FORM = { name: "", email: "", password: "", role: [] };

const CreateNewUserModal = ({ setOpenModal, onUserCreated, roles, roleSearch, setRoleSearch }) => {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addToast } = useToast();
  const dropdownRef = useRef(null);

  const assignableRoles = roles.filter((role) => !SUPERADMIN_NAMES.includes(role.name));

  const filteredRoles = assignableRoles.filter((role) => role?.name?.toLowerCase().includes((roleSearch || "").toLowerCase()));

  // Helper to handle input change and clear errors for that field
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  // Toggle Role
  const toggleRole = (role) => {
    if (errors.role) setErrors((prev) => ({ ...prev, role: null }));

    const isSelected = formData.role.includes(role.id);
    if (isSelected) {
      setFormData((prev) => ({ ...prev, role: prev.role.filter((id) => id !== role.id) }));
      setSelectedRoles((prev) => prev.filter((name) => name !== role.name));
    } else {
      setFormData((prev) => ({ ...prev, role: [...prev.role, role.id] }));
      setSelectedRoles((prev) => [...prev, role.name]);
    }
  };

  // Sync selectedRoles when formData.role changes (e.g. on reset)
  useEffect(() => {
    const currentRoleNames = assignableRoles.filter((role) => formData?.role?.includes(role.id)).map((role) => role.name);
    setSelectedRoles(currentRoleNames);
  }, [formData.role, roles]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleClose = () => {
    setOpenModal(false);
    setFormData(INITIAL_FORM);
    setErrors({}); // ✅ Clear errors on close
    setSelectedRoles([]);
    if (setRoleSearch) setRoleSearch("");
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    if (!formData.role || !formData.role.length) {
      setErrors((prev) => ({ ...prev, role: "Please select at least one role" }));
      addToast({ type: "error", message: "Please select at least one role" });
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await CreateUser(formData);

      const { success, message, errors: backendErrors } = res;

      if (!success) {
        if (backendErrors) {
          setErrors(backendErrors);
        }
        addToast({ type: "error", message: message || "Failed to create user" });
        return;
      }

      if (onUserCreated) onUserCreated();
      handleClose();
      addToast({ type: "success", message: "User created successfully" });
    } catch (err) {
      console.error(err);

      const apiResponse = err.response?.data;
      const errorMessage = apiResponse?.message || "Failed to create user";

      if (apiResponse?.errors) {
        setErrors(apiResponse.errors); // ✅ Feeds 'email' and 'password' arrays into your view state
      }

      addToast({ type: "error", message: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <CustomModal isCloseModal={handleClose} className="max-w-lg">
      <h2 className="text-lg font-bold text-[#1a2b4b] mb-6 uppercase tracking-tight">Create New User</h2>
      <form onSubmit={handleCreateSubmit} className="space-y-4">
        {["name", "email", "password"].map((field) => {
          const hasError = !!errors[field];
          return (
            <div key={field}>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{field}</label>
              <input
                type={field === "password" ? "password" : "text"}
                value={formData[field]}
                className={`w-full px-4 py-2 rounded-xl outline-none text-sm transition-colors ${
                  hasError
                    ? "bg-red-50 border-2 border-red-500 focus:border-red-600 text-red-900"
                    : "bg-gray-50 border border-gray-200 focus:border-blue-400 text-gray-900"
                }`}
                onChange={(e) => handleInputChange(field, e.target.value)}
              />

              {hasError && <p className="text-xs text-red-500 font-semibold mt-1 pl-1">{Array.isArray(errors[field]) ? errors[field][0] : errors[field]}</p>}
            </div>
          );
        })}

        {/* Role Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Assign Roles</label>
          <button
            type="button"
            onClick={() => setDropdownOpen((prev) => !prev)}
            className={`w-full px-4 py-2 rounded-xl text-left text-sm flex justify-between items-center min-h-[42px] transition-colors ${
              errors.role ? "bg-red-50 border-2 border-red-500" : "bg-gray-50 border border-gray-200"
            }`}
          >
            <span className={formData.role?.length ? "text-gray-900" : "text-gray-400"}>
              {selectedRoles.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedRoles.map((roleName, index) => (
                    <span key={index} className="inline-block bg-cyan-500 text-white text-sm px-3 py-1 rounded-full">
                      {roleName}
                    </span>
                  ))}
                </div>
              ) : (
                "Select Roles"
              )}
            </span>
            <ChevronDown size={16} className={`transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {errors.role && <p className="text-xs text-red-500 font-semibold mt-1 pl-1">{Array.isArray(errors.role) ? errors.role[0] : errors.role}</p>}

          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="absolute z-[99999] w-full mt-2 bg-white border border-gray-200 shadow-2xl rounded-xl p-2"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <input
                  type="text"
                  placeholder="Search roles..."
                  value={roleSearch || ""}
                  className="w-full p-2 mb-2 bg-gray-50 rounded-lg text-xs outline-none border border-gray-100 focus:border-blue-300"
                  onChange={(e) => setRoleSearch && setRoleSearch(e.target.value)}
                />
                <div className="max-h-48 overflow-y-auto">
                  {filteredRoles.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-3">No roles found</p>
                  ) : (
                    filteredRoles.map((role) => (
                      <div
                        key={role.id}
                        onClick={() => toggleRole(role)}
                        className="flex items-center justify-between p-2 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                      >
                        <span className="text-xs font-bold text-gray-700">{role?.name}</span>
                        {formData.role.includes(role.id) && <Check size={14} className="text-blue-600 shrink-0" />}
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          disabled={isSubmitting}
          type="submit"
          className={`w-full flex items-center justify-center gap-2 py-3 ${
            isSubmitting ? "bg-gray-200 cursor-not-allowed" : "bg-indigo-500 hover:bg-indigo-600"
          } text-white rounded-xl font-bold uppercase text-xs tracking-widest mt-4 transition-colors`}
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create User"}
        </button>
      </form>
    </CustomModal>
  );
};

export default CreateNewUserModal;
