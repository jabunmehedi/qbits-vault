import { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useToast } from "../../hooks/useToast";
import DataTable from "../../components/global/dataTable/DataTable";
import CustomModal from "../../components/global/modal/CustomModal";
import axiosConfig from "../../utils/axiosConfig";
import { GetRoles, GetUsers } from "../../services/User";
import { Check, ChevronDown, Shield, X, Camera, UserIcon, Search, Filter, Plus, Settings2 } from "lucide-react";
import PermissionButton from "../../components/global/permissionButton/PermissionButton";
import { CiEdit } from "react-icons/ci";
import { MdDelete } from "react-icons/md";
import StatusBadge from "../../components/user/StatusBadge";
import TabContent from "../../components/user/TabContent";
import PermissionViewer from "../../components/user/PermissionViewer";
import CreateNewUserModal from "../../components/user/CreateNewUserModal";
import RoleDrawer from "../../components/user/RoleDrawer";
import Avatar from "../../components/helpers/Avatar";
import UserViewDrawer from "../../components/user/UserViewDrawer";

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

// ─── Main component ────────────────────────────────────────────────────────────
const User = () => {
  const { addToast } = useToast();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [roleDrawerOpen, setRoleDrawerOpen] = useState(false);

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
  const [selectedUserId, setSelectedUserId] = useState(null);
  const dropdownRef = useRef(null);

  const [openUserViewDrawer, setOpenUserViewDrawer] = useState(false);

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

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [uRes, rRes, pRes] = await Promise.all([GetUsers(), GetRoles(), axiosConfig.get("/permissions")]);
      setUsers(uRes?.data?.data || []);
      setRoles(rRes?.data || []);
      setPermissions(pRes.data.data || pRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  console.log({ users });

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

  const refetchRoles = () => {
    GetRoles().then((res) => setRoles(res?.data || []));
  };

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

  console.log({ roleDrawerOpen });
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
    console.log({ roleId });
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
      title: "IDENTITY POINT",
      key: "name",
      className: "w-[320px]",
      render: (row) => (
        <div className="flex items-center gap-4 py-2">
          <div className="relative">
            <Avatar src={row.img} name={row.name} size="lg" className="w-6 h-6 " />
            <div
              className={`absolute -bottom-1 -right-1 w-3 h-3 ${row.status === "inactive" ? "bg-red-500" : "bg-green-500"} border-2 border-white rounded-full`}
            ></div>
          </div>
          <div className="flex flex-col">
            <div
              onClick={() => {
                setOpenUserViewDrawer(true);
                setSelectedUserId(row.id);
              }}
              className="flex items-center gap-1 group cursor-pointer"
            >
              <div className="flex flex-col">
                <span className="font-bold text-[#1a2b4b] text-sm tracking-tight">{row.name}</span>
                <span className="text-gray-400 text-xs font-medium">{row.email}</span>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
            </div>
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded mt-1 self-start tracking-wider uppercase">Main HQ Vault</span>
          </div>
        </div>
      ),
    },
    // {
    //   title: "DETAILS",
    //   key: "email",
    //   render: (row) => (
    //     <div className="flex flex-col items-start">
    //       <span className="text-gray-400 text-xs font-medium">{row.email}</span>
    //       <div className="flex items-center gap-1 mt-1 border border-blue-100 bg-blue-50/50 px-2 py-0.5 rounded-full">
    //         <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
    //         <span className="text-[10px] font-bold text-blue-600 uppercase tracking-tighter">Verified</span>
    //       </div>
    //     </div>
    //   ),
    // },
    {
      title: "MANAGE",
      key: "manage",
      render: (row) => (
        <button
          onClick={() => {
            setSelectedUser(row);
            setDrawerOpen(true);
          }}
          className="flex items-center gap-2 border shadow border-slate-300 px-4 py-1.5 rounded-lg text-[#1a2b4b] font-bold text-[11px] uppercase tracking-widest hover:bg-[#1a2b4b] hover:text-white transition-all active:scale-95"
        >
          <Settings2 className="w-3.5 h-3.5" />
          Permissions
        </button>
      ),
    },
    ...roles.map((role) => ({
      title: role.name.toUpperCase(),
      key: role.id,
      className: "text-center",
      render: (row) => {
        const isSelected = row.roles?.some((r) => r.id === role.id);
        return (
          <div className="flex justify-center">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isSelected ? "bg-blue-100 text-blue-600" : "bg-gray-50 text-gray-200 border border-gray-100"}`}
            >
              {isSelected ? <Check className="w-5 h-5 stroke-[3px]" /> : <X className="w-4 h-4 opacity-20" />}
            </div>
          </div>
        );
      },
    })),
  ];

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="font-sans">
      {/* Top Header Section */}
      <div className="flex justify-between items-center mb-10">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-10 bg-[#1a2b4b] rounded-full"></div>
          <div>
            <h1 className="text-2xl font-black text-[#1a2b4b] uppercase">User List</h1>
            <p className="text-[10px] font-bold text-gray-400 tracking-[0.2em] uppercase">User Management</p>
          </div>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => setRoleDrawerOpen(true)} // Added this
            className="flex items-center gap-2 px-6 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-600 font-bold text-sm shadow-sm hover:shadow-md transition-all"
          >
            <Shield className="w-4 h-4" /> Create Role
          </button>
          <button
            onClick={() => setOpenModel(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#1a73e8] text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-200 hover:bg-blue-600 transition-all"
          >
            <Plus className="w-5 h-5" /> New User
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search identity..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl  focus:ring-2 ring-blue-100 outline-none text-gray-700 font-medium"
          />
        </div>
        <button className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-2xl text-gray-500 font-bold text-sm hover:bg-gray-50 transition-all">
          <Filter className="w-4 h-4" /> Advanced Filters
        </button>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden">
        <DataTable columns={columns} data={users} isLoading={isLoading} className="matrix-table" />
      </div>

      {<UserViewDrawer isOpen={openUserViewDrawer} onClose={() => setOpenUserViewDrawer(false)} userId={selectedUserId} />}

      {/* Create New User Modal */}
      {openModel && (
        <CreateNewUserModal
          toggleRole={toggleRole}
          setOpenModel={setOpenModel}
          fetchUsers={fetchUsers}
          roles={roles}
          roleSearch={roleSearch}
          setRoleSearch={setRoleSearch}
          dropdownOpen={dropdownOpen}
          setDropdownOpen={setDropdownOpen}
        />
      )}

      {/* Role Drawer */}
      {roleDrawerOpen && <RoleDrawer isOpen={roleDrawerOpen} onClose={() => setRoleDrawerOpen(false)} rolesList={roles} refetchRoles={refetchRoles} />}

      {/* Permission Drawer */}
      <PermissionViewer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} user={selectedUser} permissions={permissions} />
    </div>
  );
};

export default User;
