import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import CustomModal from "../global/modal/CustomModal";
import { useToast } from "../../hooks/useToast";
import { Check, ChevronDown, Eye, EyeOff, Loader2, Lock, Mail, Shield, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CreateUser } from "../../services/User";
import { roleLabel } from "../../utils/roleLabel";

const SUPERADMIN_NAMES = ["Superadmin", "Super Admin", "superadmin", "super-admin"];
const INITIAL_FORM = { name: "", email: "", password: "", role: [] };
const FIELD_CONFIG = {
  name: { label: "Name", placeholder: "Enter full name", Icon: User, type: "text" },
  email: { label: "Email", placeholder: "Enter email address", Icon: Mail, type: "text" },
  password: { label: "Password", placeholder: "Enter password", Icon: Lock, type: "password" },
};

const CreateNewUserModal = ({ setOpenModal, onUserCreated, roles, roleSearch, setRoleSearch }) => {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { addToast } = useToast();
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);

  const assignableRoles = roles.filter((role) => !SUPERADMIN_NAMES.includes(role.name));
  const filteredRoles = assignableRoles.filter((role) => role?.name?.toLowerCase().includes((roleSearch || "").toLowerCase()));

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  };

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

  const openDropdown = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 8, left: rect.left, width: rect.width });
    }
    setDropdownOpen(true);
  };

  const closeDropdown = () => setDropdownOpen(false);

  useEffect(() => {
    const currentRoleNames = assignableRoles.filter((role) => formData?.role?.includes(role.id)).map((role) => role.name);
    setSelectedRoles(currentRoleNames);
  }, [formData.role, roles]);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e) => {
      if (buttonRef.current && !buttonRef.current.contains(e.target) && dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        closeDropdown();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropdownOpen]);

  const handleClose = () => {
    setOpenModal(false);
    setFormData(INITIAL_FORM);
    setErrors({});
    setSelectedRoles([]);
    closeDropdown();
    if (setRoleSearch) setRoleSearch("");
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    if (!formData.role || !formData.role.length) {
      setErrors((prev) => ({ ...prev, role: "Please select at least one role" }));
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await CreateUser(formData);
      const { success, message, errors: backendErrors } = res;

      if (!success) {
        if (backendErrors) {
          setErrors(backendErrors);
        } else {
          addToast({ type: "error", message: message || "Failed to create user" });
        }
        return;
      }

      if (onUserCreated) onUserCreated();
      handleClose();
      addToast({ type: "success", message: "User created successfully" });
    } catch (err) {
      console.error(err);
      const apiResponse = err.response?.data;
      if (apiResponse?.errors) {
        setErrors(apiResponse.errors);
      } else {
        addToast({ type: "error", message: apiResponse?.message || "Failed to create user" });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <CustomModal isCloseModal={handleClose} className="max-w-lg" title="Create New User">
      <form onSubmit={handleCreateSubmit} className="space-y-4">
        {["name", "email", "password"].map((field) => {
          const { label, placeholder, Icon, type } = FIELD_CONFIG[field];
          const hasError = !!errors[field];
          const isPassword = field === "password";

          return (
            <div key={field}>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1 tracking-wide">{label}</label>
              <div className="relative">
                <Icon size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${hasError ? "text-red-400" : "text-gray-400"}`} />
                <input
                  type={isPassword && showPassword ? "text" : type}
                  value={formData[field]}
                  placeholder={placeholder}
                  className={`w-full pl-9 ${isPassword ? "pr-10" : "pr-4"} py-2.5 rounded-xl outline-none text-sm transition-colors ${
                    hasError
                      ? "bg-red-50 border-2 border-red-500 focus:border-red-600 text-red-900 placeholder:text-red-300"
                      : "bg-gray-50 border border-gray-200 focus:border-blue-400 text-gray-900 placeholder:text-gray-400"
                  }`}
                  onChange={(e) => handleInputChange(field, e.target.value)}
                />
                {isPassword && (
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                )}
              </div>
              {hasError && <p className="text-xs text-red-500 font-semibold mt-1 pl-1">{Array.isArray(errors[field]) ? errors[field][0] : errors[field]}</p>}
            </div>
          );
        })}

        {/* Role Dropdown trigger */}
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1 tracking-wide">Assign Roles</label>
          <button
            ref={buttonRef}
            type="button"
            onClick={() => (dropdownOpen ? closeDropdown() : openDropdown())}
            className={`w-full px-4 py-2.5 rounded-xl text-left text-sm flex justify-between items-center min-h-[42px] transition-colors ${
              errors.role ? "bg-red-50 border-2 border-red-500" : "bg-gray-50 border border-gray-200 hover:border-blue-300"
            }`}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Shield size={15} className={`shrink-0 ${errors.role ? "text-red-400" : "text-gray-400"}`} />
              <span className={`flex-1 min-w-0 ${formData.role?.length ? "text-gray-900" : "text-gray-400"}`}>
                {selectedRoles.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedRoles.map((roleName, index) => (
                      <span key={index} className="inline-block bg-[#1a73e8] text-white text-xs px-2.5 py-0.5 rounded-full uppercase font-semibold">
                        {roleLabel(roleName)}
                      </span>
                    ))}
                  </div>
                ) : (
                  "Select roles..."
                )}
              </span>
            </div>
            <ChevronDown size={15} className={`ml-2 shrink-0 text-gray-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
          </button>
          {errors.role && <p className="text-xs text-red-500 font-semibold mt-1 pl-1">{Array.isArray(errors.role) ? errors.role[0] : errors.role}</p>}
        </div>

        <div className="flex gap-4 pt-2">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleClose}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl font-bold text-sm text-gray-600 hover:text-red-400 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={isSubmitting}
            type="submit"
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-colors ${
              isSubmitting ? "bg-gray-200 cursor-not-allowed text-gray-400" : "bg-[#1a73e8] hover:bg-blue-600 text-white shadow-lg shadow-blue-200"
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create User"
            )}
          </button>
        </div>
      </form>

      {/* Dropdown rendered via portal so it never affects modal height */}
      {createPortal(
        <AnimatePresence>
          {dropdownOpen && (
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              style={{ position: "fixed", top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width, zIndex: 99999 }}
              className="bg-white border border-gray-200 shadow-2xl rounded-xl p-2"
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
                      className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors ${
                        formData.role.includes(role.id) ? "bg-blue-50" : "hover:bg-gray-50"
                      }`}
                    >
                      <span className="text-xs font-bold text-gray-700 uppercase">{roleLabel(role?.name)}</span>
                      {formData.role.includes(role.id) && <Check size={14} className="text-blue-600 shrink-0" />}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </CustomModal>
  );
};

export default CreateNewUserModal;
