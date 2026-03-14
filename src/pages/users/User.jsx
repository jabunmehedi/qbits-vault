import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useToast } from "../../hooks/useToast";
import DataTable from "../../components/global/dataTable/DataTable";
import CustomModal from "../../components/global/modal/CustomModal";
import axiosConfig from "../../utils/axiosConfig";
import { GetRoles, GetUsers } from "../../services/User";
import { Check, ChevronDown, Shield, UserIcon, X } from "lucide-react";
import PermissionButton from "../../components/global/permissionButton/PermissionButton";
import { CiEdit } from "react-icons/ci";
import { MdDelete } from "react-icons/md";

const User = () => {
  const { addToast } = useToast();
  const [roles, setRoles] = useState([]);
  const [openModel, setOpenModel] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [roleSearch, setRoleSearch] = useState("");
  const [permissions, setPermissions] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [activeTab, setActiveTab] = useState("profile");
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: [], // Changed to array for multiple roles
  });
  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    status: "active",
    permissions: [],
    rolePermissions: [], // NEW: for comparison
    directPermissions: [], // NEW: for marking overrides
  });

  const initialFormState = {
    name: "",
    email: "",
    password: "",
    role: [],
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleEditChange = (e) => {
    setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate role selection
    if (!formData.role || formData.role.length === 0) {
      addToast({ type: "error", message: "Please select at least one role" });
      return;
    }

    try {
      // Send role as array of IDs
      const submitData = {
        ...formData,
        role: formData.role, // This will be an array of role IDs
      };

      await axiosConfig.post("/users", submitData);
      addToast({ type: "success", message: "User created successfully" });

      // Reset form and close modal
      setFormData(initialFormState);
      setOpenModel(false);

      // Refresh users list
      GetUsers().then((res) => setUsers(res?.data?.data));
    } catch (error) {
      addToast({
        type: "error",
        message: error.response?.data?.message || "Failed to create user",
      });
    }
  };

  useEffect(() => {
    GetRoles().then((res) => setRoles(res?.data));
  }, []);

  useEffect(() => {
    setIsLoading(true);
    try {
      GetUsers().then((res) => setUsers(res?.data?.data));
      setIsLoading(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedUser || !selectedUser.data) return;

    const user = selectedUser.data;

    // Role permissions
    const rolePermissionIds = (user.roles || []).flatMap((role) => role.permissions || []).map((perm) => perm.id);

    // Direct permissions
    const directPermissionIds = (user.permissions || []).map((p) => p.id);

    // Effective permissions from backend (convert object to array)
    const effectivePermissionIds = selectedUser.effective_permissions
      ? Object.values(selectedUser.effective_permissions).map(Number)
      : [...new Set([...rolePermissionIds, ...directPermissionIds])];

    setEditFormData((prev) => ({
      ...prev,
      name: user.name || "",
      email: user.email || "",
      status: user.status || "active",
      rolePermissions: rolePermissionIds,
      directPermissions: directPermissionIds,
      permissions: effectivePermissionIds,
    }));
  }, [selectedUser]);

  useEffect(() => {
    // Assuming you have a service to get all permissions
    axiosConfig.get("/permissions").then((res) => {
      setPermissions(res.data.data || res.data); // adjust based on your API
    });
  }, []);

  const handleEdit = async (e, row) => {
    e.stopPropagation();
    try {
      const res = await axiosConfig.get(`/user/${row.id}`);
      setSelectedUser(res.data.data); // Updated to res.data.data based on new structure
      setEditOpen(true);
      setActiveTab("profile");
    } catch (error) {
      addToast({ type: "error", message: "Failed to load user details" });
    }
  };

  const toggleRole = (roleId) => {
    setFormData((prev) => {
      const currentRoles = prev.role || [];
      const isSelected = currentRoles.includes(roleId);

      return {
        ...prev,
        role: isSelected ? currentRoles.filter((id) => id !== roleId) : [...currentRoles, roleId],
      };
    });
  };

  const removeRole = (roleId) => {
    setFormData((prev) => ({
      ...prev,
      role: prev.role.filter((id) => id !== roleId),
    }));
  };

  const columns = [
    {
      title: "Avatar",
      key: "avatar",
      className: "w-20",
      render: (row) => {
        return (
          <div>
            {row?.img ? (
              <img src={row.img} alt={row?.name} className="w-10 h-10 rounded-full border border-cyan-200 object-cover" />
            ) : (
              <div className="w-10 h-10 text-gray-400 flex justify-center items-center rounded-full border border-gray-300 bg-gray-50">
                <UserIcon className="w-5 h-5" />
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: "Name",
      key: "name",
      className: "w-40",
      render: (row) => <span className="">{row?.name}</span>,
    },
    {
      title: "Role",
      key: "role",
      className: "w-40",
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row?.roles?.map((role, index) => (
            <span key={index} className="px-2 py-1 bg-cyan-50 text-cyan-700 rounded text-xs border border-cyan-200">
              {role?.name}
            </span>
          ))}
        </div>
      ),
    },
    {
      title: "Email",
      key: "email",
      className: "w-40",
      render: (row) => <span className="">{row?.email}</span>,
    },
    {
      title: "Status",
      key: "status",
      className: "w-32",
      render: (row) => (
        <span className={`capitalize px-4 py-2 ${row.status === "active" ? "text-green-500 bg-green-50" : "text-yellow-500"} rounded-full text-xs`}>
          {row?.status}
        </span>
      ),
    },
    {
      title: "Action",
      key: "actions",
      className: "w-40",
      render: (row) => {
        return (
          <div className="flex items-center justify-start gap-3 py-2">
            <PermissionButton permission="user.edit">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => handleEdit(e, row)}
                // className="p-2 rounded-lg bg-blue-500/10 cursor-pointer hover:bg-blue-500/20 text-blue-600 border border-blue-400/20 transition-all"
                aria-label="Edit user"
              >
                <CiEdit size={16}/>
              </motion.button>
            </PermissionButton>

            <PermissionButton permission="user.delete">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="cursor-pointer hover:text-red-400"
                // onClick={handleDelete}
                // className="p-2 rounded-lg bg-red-500/10 cursor-pointer hover:bg-red-500/20 text-red-600 border border-red-400/20 transition-all"
                aria-label="Delete user"
              >
                <MdDelete size={16}/>
              </motion.button>
            </PermissionButton>
          </div>
        );
      },
    },
  ];


  const togglePermission = async (permId) => {
    // Get current effective permissions
    const currentPermissions = editFormData.permissions;
    const currentlyHas = currentPermissions.includes(permId);

    let newPermissionsList;

    if (currentlyHas) {
      newPermissionsList = currentPermissions.filter((id) => id !== permId);
    } else {
      newPermissionsList = [...currentPermissions, permId];
    }

    // Optimistic UI update
    setEditFormData((prev) => ({
      ...prev,
      permissions: newPermissionsList,
    }));


    try {
      // Correct ID: selectedUser.data.id
      await axiosConfig.put(`/user/${selectedUser.data.id}`, {
        permissions: newPermissionsList,
      });

      // Reload fresh user data
      const res = await axiosConfig.get(`/user/${selectedUser.data.id}`);

      // res.data.data is the { data: user, effective_permissions: {...} }
      setSelectedUser(res.data.data);

      addToast({ type: "success", message: "Permission updated" });
    } catch (error) {
      console.error("Update failed:", error);

      // Rollback
      setEditFormData((prev) => ({
        ...prev,
        permissions: currentPermissions,
      }));

      addToast({ type: "error", message: "Failed to update permission" });
    }
  };

  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredRoles = roles?.filter((role) => role?.name.toLowerCase().includes(roleSearch.toLowerCase()));

  const getSelectedRoleNames = () => {
    return roles.filter((role) => formData.role.includes(role.id)).map((role) => role.name);
  };

  return (
    <div>
      <div className="flex justify-between mb-2">
        <div>
          <p className="text-[#424242] text-lg font-medium">Users</p>
          <span className="text-gray-400 text-sm">Manage your users</span>
        </div>
        <PermissionButton permission="user.create">
          <button
            onClick={() => setOpenModel(true)}
            className="bg-[#424242] border text-white py-2 px-3 mb-2 text-sm rounded-lg hover:bg-black cursor-pointer transition-colors"
          >
            Create User
          </button>
        </PermissionButton>
      </div>
      <DataTable columns={columns} data={users} isLoading={isLoading} paginationData={{}} className="h-[calc(100vh-100px)]" />

      {openModel && (
        <CustomModal
          isCloseModal={() => {
            setOpenModel(false);
            setFormData(initialFormState);
          }}
        >
          <h2 className="text-xl font-bold text-gray-800 mb-8 text-center">Create New User</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
              <input
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-5 py-2 border border-gray-200 rounded-lg focus:border-cyan-500 outline-none transition-colors"
                placeholder="e.g. Md. Rahman"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-5 py-2 border border-gray-200 rounded-lg focus:border-cyan-500 outline-none transition-colors"
                placeholder="user@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
                className="w-full px-5 py-2 border border-gray-200 rounded-lg focus:border-cyan-500 outline-none transition-colors"
                placeholder="Enter secure password (min 6 characters)"
              />
            </div>

            <div ref={dropdownRef}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assign Roles <span className="text-red-500">*</span>
              </label>

              {/* Selected Roles Display */}
              {formData.role.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {getSelectedRoleNames().map((roleName, index) => (
                    <motion.div
                      key={index}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="flex items-center gap-2 px-3 py-1.5 bg-cyan-50 text-cyan-700 rounded-lg border border-cyan-200"
                    >
                      <span className="text-sm font-medium">{roleName}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const roleToRemove = roles.find((r) => r.name === roleName);
                          if (roleToRemove) removeRole(roleToRemove.id);
                        }}
                        className="hover:bg-cyan-100 rounded-full p-0.5 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}

              <div className="relative">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="w-full px-5 py-4 bg-white border-2 border-gray-200 rounded-xl focus:border-cyan-500 outline-none flex items-center justify-between transition-all hover:border-cyan-400"
                >
                  <div className="flex items-center gap-4">
                    {formData.role.length > 0 ? (
                      <>
                        <Shield className="w-6 h-6 text-cyan-600" />
                        <span className="font-medium text-gray-800">
                          {formData.role.length} role{formData.role.length > 1 ? "s" : ""} selected
                        </span>
                      </>
                    ) : (
                      <span className="text-gray-500">Select roles...</span>
                    )}
                  </div>
                  <ChevronDown className={`w-5 h-5 text-gray-600 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
                </motion.button>

                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute top-full mt-2 w-full bg-white rounded-xl shadow-2xl border-2 border-gray-200 z-50 overflow-hidden"
                    >
                      <div className="p-3 border-b border-gray-200">
                        <input
                          type="text"
                          placeholder="Search roles..."
                          value={roleSearch}
                          onChange={(e) => setRoleSearch(e.target.value)}
                          className="w-full px-4 py-2 bg-gray-50 rounded-lg text-sm outline-none focus:ring-2 focus:ring-cyan-500"
                          autoFocus
                        />
                      </div>

                      <div className="max-h-[200px] overflow-y-auto">
                        {filteredRoles.length === 0 ? (
                          <p className="text-center py-8 text-gray-500 text-sm">No roles found</p>
                        ) : (
                          filteredRoles.map((role) => {
                            const isSelected = formData.role.includes(role.id);
                            return (
                              <motion.div
                                key={role.id}
                                whileHover={{ backgroundColor: "#f0f9ff" }}
                                onClick={() => toggleRole(role.id)}
                                className={`px-5 py-3 flex items-center gap-4 cursor-pointer border-b border-gray-100 last:border-0 ${
                                  isSelected ? "bg-cyan-50" : ""
                                }`}
                              >
                                <Shield className="w-4 h-4 text-cyan-600 flex-shrink-0" />
                                <div className="flex-1">
                                  <p className="text-gray-800">{role.name}</p>
                                </div>
                                {isSelected && <Check className="w-5 h-5 text-cyan-600 ml-auto" />}
                              </motion.div>
                            );
                          })
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-shadow"
            >
              Create User
            </motion.button>
          </form>
        </CustomModal>
      )}

      {editOpen && selectedUser && (
        <CustomModal
          isCloseModal={() => {
            setEditOpen(false);
            setSelectedUser(null);
            setActiveTab("profile");
          }}
        >
          <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">Edit User</h2>

          <div className="flex mb-4">
            {["profile", "permissions", "verifications", "history"].map((tab) => (
              <motion.button
                key={tab}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 capitalize ${activeTab === tab ? "border-b-2 border-cyan-600 text-cyan-600 font-medium" : "text-gray-600"}`}
              >
                {tab}
              </motion.button>
            ))}
          </div>

          <div className="min-h-[300px]">
            {activeTab === "profile" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="flex justify-center">
                  {selectedUser?.img ? (
                    <img src={selectedUser?.img} alt={selectedUser.name} className="w-20 h-20 rounded-full border border-cyan-200 object-cover" />
                  ) : (
                    <div className="w-20 h-20 flex justify-center items-center rounded-full border border-gray-300 bg-gray-50">
                      <UserIcon className="w-10 h-10 text-gray-400" />
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                  <input
                    name="name"
                    value={editFormData.name}
                    onChange={handleEditChange}
                    className="w-full px-5 py-2 border border-gray-200 rounded-lg focus:border-cyan-500 outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    name="email"
                    type="email"
                    value={editFormData.email}
                    onChange={handleEditChange}
                    className="w-full px-5 py-2 border border-gray-200 rounded-lg focus:border-cyan-500 outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Roles</label>
                  <div className="flex flex-wrap gap-2">
                    {selectedUser?.roles?.map((role) => (
                      <span key={role.id} className="px-3 py-1.5 bg-cyan-50 text-cyan-700 rounded-lg border border-cyan-200 text-sm">
                        {role.name}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={editFormData.status}
                    onChange={handleEditChange}
                    name="status"
                    className="w-full px-5 py-2 border border-gray-200 rounded-lg focus:border-cyan-500 outline-none transition-colors"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>
              </motion.div>
            )}

            {activeTab === "permissions" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-h-[500px] overflow-y-auto pb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1">
                  {(() => {
                    const grouped = permissions.reduce((acc, perm) => {
                      const [group] = perm.name.split(".");
                      const key = group.replace(/-/g, " ");
                      if (!acc[key]) acc[key] = [];
                      acc[key].push(perm);
                      return acc;
                    }, {});

                    const sortedGroups = Object.keys(grouped).sort();

                    return sortedGroups.map((groupName) => {
                      const permsInGroup = grouped[groupName];

                      return (
                        <div key={groupName} className="bg-white rounded-xl border border-gray-300 shadow hover:shadow-lg transition-shadow">
                          <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-cyan-50 to-blue-50">
                            <h4 className="font-bold text-gray-800 capitalize flex items-center gap-2">
                              <Shield className="w-6 h-6 text-cyan-600" />
                              {groupName.replace(/\b\w/g, (l) => l.toUpperCase())}
                            </h4>
                          </div>

                          <div className="p-5 space-y-4">
                            {permsInGroup.map((perm) => {
                              const isChecked = editFormData.permissions.includes(perm.id);

                              // if (wasFromRole && isChecked) {
                              //   badge = <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">from role</span>;
                              // } else if (isChecked) {
                              //   badge = <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">added</span>;
                              // } else if (wasFromRole) {
                              //   badge = <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">removed</span>;
                              // }

                              return (
                                <div key={perm.id} className="flex items-center justify-between p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition">
                                  <div className="flex items-center gap-4">
                                    <input
                                      type="checkbox"
                                      id={`perm-${perm.id}`}
                                      checked={isChecked}
                                      onChange={() => togglePermission(perm.id)}
                                      className="w-5 h-5 text-cyan-600 rounded focus:ring-cyan-500 cursor-pointer"
                                    />
                                    <label htmlFor={`perm-${perm.id}`} className="text-sm font-medium text-gray-800 cursor-pointer">
                                      {perm.name.split(".").pop().replace(/-/g, " ")}
                                    </label>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </motion.div>
            )}
          </div>
        </CustomModal>
      )}
    </div>
  );
};

export default User;
