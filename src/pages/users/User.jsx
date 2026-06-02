import { useState, useMemo, useCallback, useEffect } from "react";
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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePermissions } from "../../hooks/usePermissions";
import { useSelector } from "react-redux";
import { selectIsAdmin, selectIsSuperAdmin } from "../../store/authSlice";

// ─── Constants ────────────────────────────────────────────────────────────────
const SUPERADMIN_NAMES = new Set(["Superadmin", "Super Admin", "superadmin", "super_admin", "super-admin"]);

// ─── Status color map ─────────────────────────────────────────────────────────
const STATUS_COLOR = {
  inactive: "bg-red-500",
  archived: "bg-gray-500",
  pending: "bg-orange-500",
};
const DEFAULT_STATUS_COLOR = "bg-green-500";

// ─── Main component ────────────────────────────────────────────────────────────
const User = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [roleDrawerOpen, setRoleDrawerOpen] = useState(false);
  const [openModel, setOpenModel] = useState(false);
  const [openUserViewDrawer, setOpenUserViewDrawer] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [paginationData, setPaginationData] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const isSuperAdmin = useSelector(selectIsSuperAdmin);
  const isAdmin = useSelector(selectIsAdmin);
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();

  // ── Logged-in user (stable reference, no localStorage reads in memos) ──
  const loggedUser = useMemo(() => {
    try {
      const auth = localStorage.getItem("auth");
      return auth ? JSON.parse(auth).user : null;
    } catch {
      return null;
    }
  }, []); // computed once on mount

  // ── Derived permission flag ──
  const canViewUserDetail = useMemo(() => isSuperAdmin || (isAdmin && hasPermission("user.details")), [isSuperAdmin, isAdmin, hasPermission]);

  const canManagePermissions = useMemo(() => isSuperAdmin || (isAdmin && hasPermission("permission.view")), [isSuperAdmin, isAdmin, hasPermission]);

  const canCreateRole = useMemo(() => isSuperAdmin || (isAdmin && hasPermission("role.create")), [isSuperAdmin, isAdmin, hasPermission]);

  const canCreateUser = useMemo(() => isSuperAdmin || (isAdmin && hasPermission("user.create")), [isSuperAdmin, isAdmin, hasPermission]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // ── React Query: Users ──
  const { data: users = [], isLoading: isUsersLoading } = useQuery({
    queryKey: ["users", debouncedSearch],
    queryFn: async () => {
      const res = await GetUsers({ search: debouncedSearch, page: 1 });
      setPaginationData(res?.data ?? {});
      return res?.data?.data ?? [];
    },
  });

  // ── React Query: Roles ──
  const { data: roles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const res = await GetRoles();
      return res?.data ?? [];
    },
  });

  // ── React Query: Permissions ──
  const { data: permissions = [] } = useQuery({
    queryKey: ["permissions"],
    queryFn: async () => {
      const res = await axiosConfig.get("/permissions");
      return res.data.data ?? res.data ?? [];
    },
  });

  // ── Filtered users — hide superadmins from non-superadmin viewers ──
  const filteredUsers = useMemo(() => {
    if (isSuperAdmin) return users;
    return users.filter((user) => !user.roles?.some((role) => SUPERADMIN_NAMES.has(role.name)));
  }, [users, isSuperAdmin]);

  // ── Stable non-superadmin roles list ──
  const visibleRoles = useMemo(() => roles.filter((role) => !SUPERADMIN_NAMES.has(role.name)), [roles]);

  // ── Handlers ──
  const handleOpenUserView = useCallback(
    (row) => {
      if (!canViewUserDetail) return;
      setSelectedUserId(row.id);
      setOpenUserViewDrawer(true);
    },
    [canViewUserDetail],
  );

  const handleOpenPermissions = useCallback((row) => {
    setSelectedUser(row);
    setDrawerOpen(true);
  }, []);

  const handleCloseModal = useCallback((val) => {
    setOpenModel(val);
  }, []);

  const handleUserCreated = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["users"] });
  }, [queryClient]);

  // ── Columns ──
  const columns = useMemo(() => {
    const identityColumn = {
      title: "IDENTITY",
      key: "name",
      className: "w-[320px] text-left",
      render: (row) => (
        <div className="flex items-center gap-4 py-2">
          <div className="relative">
            <Avatar src={row.img} name={row.name} size="lg" className="w-6 h-6" />
            <div className={`absolute -bottom-1 -right-1 w-3 h-3 ${STATUS_COLOR[row.status] ?? DEFAULT_STATUS_COLOR} border-2 border-white rounded-full`} />
          </div>
          <div className="flex flex-col">
            <div
              onClick={() => handleOpenUserView(row)}
              className={`flex items-center gap-1 group ${canViewUserDetail ? "cursor-pointer" : "cursor-default pointer-events-none select-none"}`}
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
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded mt-1 self-start tracking-wider uppercase">
              {row?.default_vault?.name ?? "No Default Vault"}
            </span>
          </div>
        </div>
      ),
    };

    const manageColumn = canManagePermissions
      ? {
          title: "MANAGE",
          key: "manage",
          className: "text-left w-40",
          render: (row) => {
            // Hide the button for the logged-in superadmin's own row
            // if (isSuperAdmin && row.id === loggedUser?.id) return null;
            return (
              <button
                onClick={() => handleOpenPermissions(row)}
                className="flex items-center gap-2 border shadow border-slate-300 px-4 py-1.5 rounded-lg text-[#1a2b4b] font-bold text-[11px] uppercase tracking-widest hover:bg-[#1a2b4b] hover:text-white transition-all active:scale-95"
              >
                <Settings2 className="w-3.5 h-3.5" />
                Permissions
              </button>
            );
          },
        }
      : null;

    const roleColumns = visibleRoles.map((role) => ({
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

    return [identityColumn, ...(manageColumn ? [manageColumn] : []), ...roleColumns];
  }, [visibleRoles, canManagePermissions, canViewUserDetail, isSuperAdmin, loggedUser, handleOpenUserView, handleOpenPermissions]);

  return (
    <div className="font-sans">
      {/* Top Header Section */}
      <div className="flex justify-between items-center mb-10">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-10 bg-[#1a2b4b] rounded-full" />
          <div>
            <h1 className="xl:text-2xl font-black text-[#1a2b4b] uppercase">User List</h1>
            <p className="text-[8px] xl:text-[10px] font-bold text-gray-400 tracking-[0.2em] uppercase">User Management</p>
          </div>
        </div>

        <div className="flex gap-4">
          {/* FIX: was `(isAdmin && cond) || (isSuperAdmin && ...)` — parentheses
              made the isSuperAdmin branch always render regardless of canCreateRole.
              Now using the pre-computed memos with correct semantics. */}
          {canCreateRole && (
            <button
              onClick={() => setRoleDrawerOpen(true)}
              className="flex items-center gap-2 px-6 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-600 font-bold text-xs lg:text-sm shadow-sm hover:shadow-md transition-all"
            >
              <Shield className="w-4 h-4" /> Create Role
            </button>
          )}
          {canCreateUser && (
            <button
              onClick={() => setOpenModel(true)}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#1a73e8] text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-200 hover:bg-blue-600 transition-all"
            >
              <Plus className="w-5 h-5" /> New User
            </button>
          )}
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search identity..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 ring-blue-100 outline-none text-gray-700 font-medium"
          />
        </div>
        <button className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-2xl text-gray-500 font-bold text-sm hover:bg-gray-50 transition-all">
          <Filter className="w-4 h-4" /> Advanced Filters
        </button>
      </div>

      {/* Data Table */}
      <DataTable columns={columns} data={filteredUsers} paginationData={paginationData} isLoading={isUsersLoading} className="h-[calc(100vh-200px)]" />

      <UserViewDrawer isOpen={openUserViewDrawer} onClose={() => setOpenUserViewDrawer(false)} userId={selectedUserId} />

      {openModel && <CreateNewUserModal setOpenModal={handleCloseModal} roles={roles} onUserCreated={handleUserCreated} />}

      {roleDrawerOpen && <RoleDrawer isOpen={roleDrawerOpen} onClose={() => setRoleDrawerOpen(false)} rolesList={roles} />}

      <PermissionViewer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} user={selectedUser} permissions={permissions} />
    </div>
  );
};

export default User;
