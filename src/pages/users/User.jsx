import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import DataTable from "../../components/global/dataTable/DataTable";
import axiosConfig from "../../utils/axiosConfig";
import { GetRoles, GetUsers } from "../../services/User";
import { Check, ChevronDown, Shield, X, Search, Filter, Plus, Settings2 } from "lucide-react";
import { CiMail } from "react-icons/ci";
import PermissionViewer from "../../components/user/PermissionViewer";
import CreateNewUserModal from "../../components/user/CreateNewUserModal";
import RoleDrawer from "../../components/user/RoleDrawer";
import Avatar from "../../components/helpers/Avatar";
import UserViewDrawer from "../../components/user/UserViewDrawer";
import { useQuery } from "@tanstack/react-query";
import { usePermissions } from "../../hooks/usePermissions";

// ─── Constants ────────────────────────────────────────────────────────────────
const SUPERADMIN_NAMES = ["Superadmin", "Super Admin", "superadmin", "super_admin"];

// ─── Main component ────────────────────────────────────────────────────────────
const User = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [roleDrawerOpen, setRoleDrawerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [openModel, setOpenModel] = useState(false);
  const [openUserViewDrawer, setOpenUserViewDrawer] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  const { hasPermission } = usePermissions();

  // ── Filter Users (Superadmin Logic) ──
  const loggedUser = localStorage.getItem("auth") ? JSON.parse(localStorage.getItem("auth")).user : null;
  const isSuperAdmin = loggedUser?.roles?.some((role) => SUPERADMIN_NAMES.includes(role.name));

  // ── 2. Use React Query for Users ──
  const { data: users = [], isLoading: isUsersLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await GetUsers();
      return res?.data?.data || [];
    },
  });

  // ── 3. Use React Query for Roles ──
  const { data: roles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const res = await GetRoles();
      return res?.data || [];
    },
  });

  // ── 4. Use React Query for Permissions ──
  const { data: permissions = [] } = useQuery({
    queryKey: ["permissions"],
    queryFn: async () => {
      const res = await axiosConfig.get("/permissions");
      return res.data.data || res.data || [];
    },
  });

  const filteredUsers = useMemo(() => {
    if (!loggedUser) return users;

    if (isSuperAdmin) return users;

    return users.filter((user) => !user.roles?.some((role) => SUPERADMIN_NAMES.includes(role.name)));
  }, [users, loggedUser]);

  // ── Fetch Data ──
  // const fetchData = useCallback(async () => {
  //   setIsLoading(true);
  //   try {
  //     const [uRes, rRes, pRes] = await Promise.all([GetUsers(), GetRoles(), axiosConfig.get("/permissions")]);
  //     setUsers(uRes?.data?.data || []);
  //     setRoles(rRes?.data || []);
  //     setPermissions(pRes.data.data || pRes.data || []);
  //   } catch (err) {
  //     console.error(err);
  //   } finally {
  //     setIsLoading(false);
  //   }
  // }, []);

  // useEffect(() => {
  //   fetchData();
  // }, [fetchData]);

  const columns = useMemo(() => {
    const baseColumns = [
      {
        title: "IDENTITY POINT",
        key: "name",
        className: "w-[320px] text-left",
        render: (row) => (
          <div className="flex items-center gap-4 py-2">
            <div className="relative">
              <Avatar src={row.img} name={row.name} size="lg" className="w-6 h-6" />
              <div
                className={`absolute -bottom-1 -right-1 w-3 h-3 ${
                  row.status === "inactive"
                    ? "bg-red-500"
                    : row.status === "archived"
                      ? "bg-gray-500"
                      : row.status === "pending"
                        ? "bg-orange-500"
                        : "bg-green-500"
                } border-2 border-white rounded-full`}
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
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#1a2b4b] text-sm tracking-tight">{row.name}</span>
                    <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                  </div>
                  <div className="flex items-center gap-2">
                    <CiMail className="text-gray-400" />
                    <span className="text-gray-400 text-xs font-medium">{row.email}</span>
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded mt-1 self-start tracking-wider uppercase">Main HQ Vault</span>
            </div>
          </div>
        ),
      },
    ];

    // Only show MANAGE column if user has permission
    if (hasPermission("permission.view")) {
      baseColumns.push({
        title: "MANAGE",
        key: "manage",
        className: "text-left w-40",
        render: (row) => (
          <button
            onClick={() => {
              setSelectedUser(row);
              setDrawerOpen(true);
            }}
            className={`${isSuperAdmin && row.id === loggedUser.id ? "hidden" : "flex"}  items-center gap-2 border shadow border-slate-300 px-4 py-1.5 rounded-lg text-[#1a2b4b] font-bold text-[11px] uppercase tracking-widest hover:bg-[#1a2b4b] hover:text-white transition-all active:scale-95`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            Permissions
          </button>
        ),
      });
    }

    // Role Columns
    const roleColumns = roles
      .filter((role) => !SUPERADMIN_NAMES.includes(role.name))
      .map((role) => ({
        title: role.name.toUpperCase(),
        key: role.id,
        className: "text-center",
        render: (row) => {
          const isSelected = row.roles?.some((r) => r.id === role.id);
          return (
            <div className="flex justify-center">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                  isSelected ? "bg-blue-100 text-blue-600" : "bg-gray-50 text-gray-400 border border-gray-100"
                }`}
              >
                {isSelected ? <Check className="w-5 h-5 stroke-[3px]" /> : <X className="w-4 h-4 opacity-20" />}
              </div>
            </div>
          );
        },
      }));

    return [...baseColumns, ...roleColumns];
  }, [roles, hasPermission]);

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="font-sans">
      {/* Top Header Section */}
      <div className="flex justify-between items-center mb-10">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-10 bg-[#1a2b4b] rounded-full"></div>
          <div>
            <h1 className="xl:text-2xl font-black text-[#1a2b4b] uppercase">User List</h1>
            <p className="text-[8px] xl:text-[10px] font-bold text-gray-400 tracking-[0.2em] uppercase">User Management</p>
          </div>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => setRoleDrawerOpen(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-600 font-bold text-xs lg:text-sm shadow-sm hover:shadow-md transition-all"
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

      {/* Search & Filter */}
      <div className="flex gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search identity..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 ring-blue-100 outline-none text-gray-700 font-medium"
          />
        </div>
        <button className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-2xl text-gray-500 font-bold text-sm hover:bg-gray-50 transition-all">
          <Filter className="w-4 h-4" /> Advanced Filters
        </button>
      </div>

      {/* Data Table */}
      <DataTable columns={columns} data={filteredUsers} isLoading={isLoading} className="h-[calc(100vh-200px)]" />

      <UserViewDrawer isOpen={openUserViewDrawer} onClose={() => setOpenUserViewDrawer(false)} userId={selectedUserId} />

      {openModel && <CreateNewUserModal setOpenModel={setOpenModel} roles={roles} />}

      {roleDrawerOpen && (
        <RoleDrawer
          isOpen={roleDrawerOpen}
          onClose={() => setRoleDrawerOpen(false)}
          rolesList={roles}
          // refetchRoles={() => GetRoles().then((res) => setRoles(res?.data || []))}
        />
      )}

      <PermissionViewer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} user={selectedUser} permissions={permissions} />
    </div>
  );
};

export default User;
