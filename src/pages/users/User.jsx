import { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useToast } from "../../hooks/useToast";
import DataTable from "../../components/global/dataTable/DataTable";
import CustomModal from "../../components/global/modal/CustomModal";
import axiosConfig from "../../utils/axiosConfig";
import { GetRoles, GetUsers } from "../../services/User";
import { Check, ChevronDown, Shield, X, Camera, UserIcon } from "lucide-react";
import PermissionButton from "../../components/global/permissionButton/PermissionButton";
import { CiEdit } from "react-icons/ci";
import { MdDelete } from "react-icons/md";
import StatusBadge from "../../components/user/StatusBadge";
import TabContent from "../../components/user/TabContent";

// ─── Constants ────────────────────────────────────────────────────────────────
const TABS = ["profile", "permissions", "migrate"];

const INITIAL_FORM = { name: "", email: "", password: "", role: [] };

const INITIAL_EDIT = {
  name: "",
  email: "",
  status: "active",
  permissions: [],
  rolePermissions: [],
  directPermissions: [],
};

// ─── Small helpers ─────────────────────────────────────────────────────────────
const Avatar = ({ src, name, size = "sm" }) => {
  const dim = size === "lg" ? "w-20 h-20" : "w-9 h-9";
  const icon = size === "lg" ? "w-10 h-10" : "w-4 h-4";
  return src ? (
    <img src={src} alt={name} className={`${dim} rounded-full object-cover border border-gray-200`} />
  ) : (
    <div className={`${dim} rounded-full border border-gray-200 bg-gray-100 flex items-center justify-center`}>
      <UserIcon className={`${icon} text-gray-400`} />
    </div>
  );
};

// ─── Main component ────────────────────────────────────────────────────────────
const User = () => {
  const { addToast } = useToast();

  // ── Data state ──
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // ── Create modal state ──
  const [openModel, setOpenModel] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [roleSearch, setRoleSearch] = useState("");
  const dropdownRef = useRef(null);

  // ── Edit modal state ──
  const [editOpen, setEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editFormData, setEditFormData] = useState(INITIAL_EDIT);
  const [activeTab, setActiveTab] = useState("profile");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPerm, setSavingPerm] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [imgPreview, setImgPreview] = useState(null);
  const imgInputRef = useRef(null);

  // ── Fetch data ──
  const fetchUsers = useCallback(() => {
    setIsLoading(true);
    GetUsers()
      .then((res) => setUsers(res?.data?.data || []))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    fetchUsers();
    GetRoles().then((res) => setRoles(res?.data || []));
    axiosConfig.get("/permissions").then((res) => setPermissions(res.data.data || res.data || []));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync editFormData when selectedUser changes ──
  useEffect(() => {
    if (!selectedUser?.data) return;
    const user = selectedUser.data;

    const rolePermissionIds = (user.roles || []).flatMap((r) => r.permissions || []).map((p) => p.id);

    const directPermissionIds = (user.permissions || []).map((p) => p.id);

    const effectiveIds = selectedUser.effective_permissions
      ? Object.values(selectedUser.effective_permissions).map(Number)
      : [...new Set([...rolePermissionIds, ...directPermissionIds])];

    setEditFormData({
      name: user.name || "",
      email: user.email || "",
      status: user.status || "active",
      rolePermissions: rolePermissionIds,
      directPermissions: directPermissionIds,
      permissions: effectiveIds,
    });
    setImgPreview(user.img || null);
  }, [selectedUser]);

  // ── Close dropdown on outside click ──
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ─── Handlers ────────────────────────────────────────────────────────────────

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

  const handleEdit = async (e, row) => {
    e.stopPropagation();
    try {
      const res = await axiosConfig.get(`/users/${row.id}`);
      setSelectedUser(res.data.data);
      setActiveTab("profile");
      setEditOpen(true);
    } catch {
      addToast({ type: "error", message: "Failed to load user details" });
    }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const payload = new FormData();
      payload.append("name", editFormData.name);
      payload.append("email", editFormData.email);
      payload.append("status", editFormData.status);
      if (imgInputRef.current?.files?.[0]) {
        payload.append("img", imgInputRef.current.files[0]);
      }
      await axiosConfig.post(`/users/${selectedUser.data.id}?_method=PUT`, payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      addToast({ type: "success", message: "Profile updated" });
      fetchUsers();
    } catch (err) {
      addToast({ type: "error", message: err.response?.data?.message || "Failed to update profile" });
    } finally {
      setEditOpen(false);
      setSavingProfile(false);
    }
  };

  const handleTogglePermission = async (permId) => {
    const prev = editFormData.permissions;
    const next = prev.includes(permId) ? prev.filter((id) => id !== permId) : [...prev, permId];

    // Optimistic update
    setEditFormData((p) => ({ ...p, permissions: next }));
    setSavingPerm(true);
    try {
      await axiosConfig.put(`/users/${selectedUser.data.id}`, { permissions: next });
      const res = await axiosConfig.get(`/users/${selectedUser.data.id}`);
      setSelectedUser(res.data.data);
      addToast({ type: "success", message: "Permission updated" });
    } catch {
      setEditFormData((p) => ({ ...p, permissions: prev })); // rollback
      addToast({ type: "error", message: "Failed to update permission" });
    } finally {
      setSavingPerm(false);
    }
  };

  const handleMigrate = async (targetUser) => {
    setMigrating(true);
    try {
      await axiosConfig.post(`/users/${selectedUser.data.id}/migrate-verifications`, {
        target_user_id: targetUser.id,
      });
      addToast({ type: "success", message: `Verifications migrated to ${targetUser.name}` });
      // Reload user to reflect cleared verifications
      const res = await axiosConfig.get(`/users/${selectedUser.data.id}`);
      setSelectedUser(res.data.data);
    } catch (err) {
      addToast({ type: "error", message: err.response?.data?.message || "Migration failed" });
    } finally {
      setMigrating(false);
    }
  };

  const toggleRole = (roleId) => {
    setFormData((prev) => ({
      ...prev,
      role: prev.role.includes(roleId) ? prev.role.filter((id) => id !== roleId) : [...prev.role, roleId],
    }));
  };

  const filteredRoles = roles.filter((r) => r.name.toLowerCase().includes(roleSearch.toLowerCase()));

  const selectedRoleNames = roles.filter((r) => formData.role.includes(r.id)).map((r) => r.name);

  // ─── Table columns ────────────────────────────────────────────────────────────
  const columns = [
    {
      title: "User",
      key: "name",
      className: "w-56",
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar src={row.img} name={row.name} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-700 truncate">{row.name}</p>
            <p className="text-xs text-gray-400 truncate">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      title: "Roles",
      key: "roles",
      className: "w-48",
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.roles?.map((role) => (
            <span key={role.id} className="text-xs px-2 py-0.5 bg-cyan-50 text-cyan-700 border border-cyan-200 rounded-full">
              {role.name}
            </span>
          ))}
        </div>
      ),
    },
    {
      title: "Status",
      key: "status",
      className: "w-28",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      title: "Action",
      key: "actions",
      className: "w-24",
      render: (row) => (
        <div className="flex items-center gap-2">
          <PermissionButton permission="user.edit">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => handleEdit(e, row)}
              className="p-1.5 rounded-md text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
              aria-label="Edit user"
            >
              <CiEdit size={16} />
            </motion.button>
          </PermissionButton>
          <PermissionButton permission="user.delete">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              aria-label="Delete user"
            >
              <MdDelete size={16} />
            </motion.button>
          </PermissionButton>
        </div>
      ),
    },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Page header */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="text-gray-700 text-base font-semibold">Users</p>
          <span className="text-gray-400 text-xs">Manage system users and permissions</span>
        </div>
        <PermissionButton permission="user.create">
          <button onClick={() => setOpenModel(true)} className="text-sm px-3 py-1.5 bg-gray-800 hover:bg-black text-white rounded-lg transition-colors">
            + Create User
          </button>
        </PermissionButton>
      </div>

      <DataTable columns={columns} data={users} isLoading={isLoading} paginationData={{}} className="h-[calc(100vh-100px)]" />

      {/* ── Create User Modal ──────────────────────────────────────────────── */}
      {openModel && (
        <CustomModal
          isCloseModal={() => {
            setOpenModel(false);
            setFormData(INITIAL_FORM);
          }}
        >
          <h2 className="text-lg font-semibold text-gray-800 mb-5">Create New User</h2>

          <form onSubmit={handleCreateSubmit} className="space-y-4">
            {[
              { label: "Full name", name: "name", type: "text", placeholder: "Md. Rahman" },
              { label: "Email", name: "email", type: "email", placeholder: "user@example.com" },
              { label: "Password", name: "password", type: "password", placeholder: "Min 6 characters", minLength: 6 },
            ].map((f) => (
              <div key={f.name}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                <input
                  name={f.name}
                  type={f.type}
                  value={formData[f.name]}
                  onChange={(e) => setFormData((p) => ({ ...p, [e.target.name]: e.target.value }))}
                  required
                  minLength={f.minLength}
                  placeholder={f.placeholder}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-cyan-400 outline-none transition-colors"
                />
              </div>
            ))}

            {/* Role selector */}
            <div ref={dropdownRef}>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Roles <span className="text-red-400">*</span>
              </label>

              {selectedRoleNames.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {selectedRoleNames.map((name) => (
                    <span key={name} className="flex items-center gap-1 text-xs px-2 py-1 bg-cyan-50 text-cyan-700 border border-cyan-200 rounded-full">
                      {name}
                      <button
                        type="button"
                        onClick={() => {
                          const r = roles.find((r) => r.name === name);
                          if (r) toggleRole(r.id);
                        }}
                        className="hover:text-cyan-900"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setDropdownOpen((o) => !o)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg flex items-center justify-between text-gray-600 hover:border-cyan-400 transition-colors bg-white outline-none"
                >
                  <span className={formData.role.length ? "text-gray-700" : "text-gray-400"}>
                    {formData.role.length ? `${formData.role.length} selected` : "Select roles..."}
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
                </button>

                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden"
                    >
                      <div className="p-2 border-b border-gray-100">
                        <input
                          type="text"
                          placeholder="Search roles..."
                          value={roleSearch}
                          onChange={(e) => setRoleSearch(e.target.value)}
                          className="w-full px-2 py-1.5 text-xs bg-gray-50 rounded outline-none"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-[180px] overflow-y-auto">
                        {filteredRoles.length === 0 ? (
                          <p className="text-center py-4 text-xs text-gray-400">No roles found</p>
                        ) : (
                          filteredRoles.map((role) => {
                            const sel = formData.role.includes(role.id);
                            return (
                              <div
                                key={role.id}
                                onClick={() => toggleRole(role.id)}
                                className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer text-sm border-b border-gray-50 last:border-0 transition-colors ${sel ? "bg-cyan-50" : "hover:bg-gray-50"}`}
                              >
                                <Shield className="w-3.5 h-3.5 text-cyan-500 flex-shrink-0" />
                                <span className="flex-1 text-gray-700">{role.name}</span>
                                {sel && <Check className="w-3.5 h-3.5 text-cyan-500" />}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <button type="submit" className="w-full py-2.5 bg-gray-800 hover:bg-black text-white rounded-lg text-sm font-medium transition-colors">
              Create User
            </button>
          </form>
        </CustomModal>
      )}

      {/* ── Edit User Modal ────────────────────────────────────────────────── */}
      {editOpen && selectedUser && (
        <CustomModal
          isCloseModal={() => {
            setEditOpen(false);
            setSelectedUser(null);
          }}
        >
          {/* Modal header with user info */}
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
            {/* Avatar with upload overlay */}
            <div className="relative group cursor-pointer" onClick={() => imgInputRef.current?.click()}>
              <Avatar src={imgPreview} name={selectedUser.data?.name} size="lg" />
              <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-5 h-5 text-white" />
              </div>
              <input
                ref={imgInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setImgPreview(URL.createObjectURL(file));
                }}
              />
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800 truncate">{selectedUser.data?.name}</p>
              <p className="text-xs text-gray-400 truncate">{selectedUser.data?.email}</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {selectedUser.data?.roles?.map((r) => (
                  <span key={r.id} className="text-[10px] px-1.5 py-0.5 bg-cyan-50 text-cyan-600 border border-cyan-100 rounded-full">
                    {r.name}
                  </span>
                ))}
              </div>
            </div>

            <StatusBadge status={selectedUser.data?.status} />
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${
                  activeTab === tab ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <TabContent
            activeTab={activeTab}
            editFormData={editFormData}
            setEditFormData={setEditFormData}
            handleSaveProfile={handleSaveProfile}
            savingProfile={savingProfile}
            permissions={permissions}
            handleTogglePermission={handleTogglePermission}
            savingPerm={savingPerm}
            selectedUser={selectedUser}
            users={users}
            handleMigrate={handleMigrate}
            migrating={migrating}
          />
        </CustomModal>
      )}
    </div>
  );
};

export default User;
