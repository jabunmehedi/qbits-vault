import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import DataTable from "../../components/global/dataTable/DataTable";
import axiosConfig from "../../utils/axiosConfig";
import { GetRoles, GetUsers } from "../../services/User";
import { Check, ChevronDown, Shield, X, Search, Filter, Plus, Settings2, Building2 } from "lucide-react";
import { CiMail } from "react-icons/ci";
import PermissionViewer from "../../components/user/PermissionViewer";
import CreateNewUserModal from "../../components/user/CreateNewUserModal";
import RoleDrawer from "../../components/user/RoleDrawer";
import Avatar from "../../components/helpers/Avatar";
import UserViewDrawer from "../../components/user/UserViewDrawer";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePermissions } from "../../hooks/usePermissions";
import { useSelector } from "react-redux";
import { selectAuthUser, selectIsAdmin, selectIsSuperAdmin } from "../../store/authSlice";

// ─── Constants ─────────────────────────────────────────────────────────────────
const SUPERADMIN_NAMES = new Set(["Superadmin", "Super Admin", "superadmin", "super_admin", "super-admin"]);

// ─── Status color map ──────────────────────────────────────────────────────────
const STATUS_COLOR = {
  inactive: "bg-red-500",
  archived: "bg-gray-500",
  pending: "bg-orange-500",
};
const DEFAULT_STATUS_COLOR = "bg-green-500";

// ─── VaultDropdown: per-row vault selector ─────────────────────────────────────
const VaultDropdown = ({ row, onVaultChange, selectedVaultId }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const vaultAssignments = row?.vault_assignments ?? [];

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectedAssignment = vaultAssignments.find((va) => va.vault_id === selectedVaultId);
  const displayName = selectedAssignment?.vault?.name ?? row?.default_vault?.name ?? "No Vault";

  if (vaultAssignments.length === 0) {
    return <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded tracking-wider uppercase">No Vault</span>;
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded tracking-wider uppercase hover:bg-blue-100 transition-colors border border-blue-100"
      >
        <Building2 className="w-3 h-3" />
        <span className="max-w-[100px] truncate">{displayName}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-lg min-w-[160px] py-1 overflow-hidden">
          {vaultAssignments
            .filter((va) => va.status === "active")
            .map((va) => (
              <button
                key={va.vault_id}
                onClick={(e) => {
                  e.stopPropagation();
                  onVaultChange(row.id, va.vault_id);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-semibold transition-colors
                ${selectedVaultId === va.vault_id ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50"}`}
              >
                <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{va.vault?.name ?? `Vault #${va.vault_id}`}</span>
                {selectedVaultId === va.vault_id && <Check className="w-3 h-3 ml-auto stroke-[3px]" />}
              </button>
            ))}
        </div>
      )}
    </div>
  );
};

// ─── Main component ─────────────────────────────────────────────────────────────
const User = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [roleDrawerOpen, setRoleDrawerOpen] = useState(false);
  const [openModel, setOpenModel] = useState(false);
  const [openUserViewDrawer, setOpenUserViewDrawer] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [paginationData, setPaginationData] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Map of userId → selected vaultId
  const [userVaultSelection, setUserVaultSelection] = useState({});

  const isSuperAdmin = useSelector(selectIsSuperAdmin);
  const isAdmin = useSelector(selectIsAdmin);
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();

  const loggedUser = useSelector(selectAuthUser);

  // ── Derived permission flags ──
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
    queryKey: ["users", debouncedSearch, currentPage],
    queryFn: async () => {
      const res = await GetUsers({ search: debouncedSearch, page: currentPage });
      setPaginationData(res?.data ?? {});
      return res?.data?.data ?? [];
    },
  });

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
  }, []);

  // ── Seed default vault selection when users load ──
  useEffect(() => {
    if (!users.length) return;
    setUserVaultSelection((prev) => {
      const next = { ...prev };

      users.forEach((user) => {
        // CHANGED: Always re-seed if user is in the list
        // (removes stale null entries left from previous cache operations)
        const assignments = user.vault_assignments ?? [];
        const hasDefault = assignments.some((va) => va.vault_id === user.default_vault_id);

        if (hasDefault) {
          next[user.id] = user.default_vault_id;
        } else if (assignments.length > 0) {
          next[user.id] = assignments[0].vault_id;
        } else {
          next[user.id] = null;
        }
      });

      // Clean up stale keys for users no longer in the list
      const currentUserIds = new Set(users.map((u) => u.id));
      Object.keys(next).forEach((id) => {
        if (!currentUserIds.has(Number(id))) {
          delete next[id];
        }
      });

      return next;
    });
  }, [users]);

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

  const handlePermissionsSaved = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["users"] });
  }, [queryClient]);

  const handlePermissionsClose = useCallback(() => {
    setDrawerOpen(false);
    queryClient.invalidateQueries({ queryKey: ["users"] });
  }, [queryClient]);

  // ── Filtered users — hide superadmins from non-superadmin viewers ──
  const filteredUsers = useMemo(() => {
    if (isSuperAdmin) return users;
    return users.filter((user) => !user.roles?.some((role) => SUPERADMIN_NAMES.has(role.name)));
  }, [users, isSuperAdmin]);

  // ── Stable non-superadmin roles list ──
  const visibleRoles = useMemo(() => roles.filter((role) => !SUPERADMIN_NAMES.has(role.name)), [roles]);

  // ── Vault selection handler ──
  const handleVaultChange = useCallback((userId, vaultId) => {
    setUserVaultSelection((prev) => ({ ...prev, [userId]: vaultId }));
  }, []);

  // ── Helpers ──
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
    // ── Identity column (includes vault dropdown) ──
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

            {/* Vault Dropdown */}
            <div className="mt-1">
              <VaultDropdown row={row} selectedVaultId={userVaultSelection[row.id] ?? null} onVaultChange={handleVaultChange} />
            </div>
          </div>
        </div>
      ),
    };

    // ── Manage (permissions) column ──
    const manageColumn = canManagePermissions
      ? {
          title: "MANAGE",
          key: "manage",
          className: "text-left w-40",
          render: (row) => (
            <button
              onClick={() => handleOpenPermissions(row)}
              className="flex items-center gap-2 border shadow border-slate-300 px-4 py-1.5 rounded-lg text-[#1a2b4b] font-bold text-[11px] uppercase tracking-widest hover:bg-[#1a2b4b] hover:text-white transition-all active:scale-95"
            >
              <Settings2 className="w-3.5 h-3.5" />
              Permissions
            </button>
          ),
        }
      : null;

    // ── Role columns — checked based on selected vault's role list ──
    const roleColumns = visibleRoles.map((role) => ({
      title: role.name.toUpperCase(),
      key: role.id,
      className: "text-center",
      render: (row) => {
        const selectedVaultId = userVaultSelection[row.id] ?? null;
        const vaultAssignments = row.vault_assignments ?? [];

        let isSelected = false;

        if (selectedVaultId !== null) {
          // Find the vault assignment for the currently selected vault
          const assignment = vaultAssignments.find((va) => va.vault_id === selectedVaultId);
          // assignment.roles is an array of role IDs (numbers)
          isSelected = assignment?.roles?.includes(role.id) ?? false;
        } else {
          // Fallback: no vault selected — use the user's global roles array
          isSelected = row.roles?.some((r) => r.id === role.id) ?? false;
        }

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
  }, [
    visibleRoles,
    canManagePermissions,
    canViewUserDetail,
    isSuperAdmin,
    loggedUser,
    userVaultSelection,
    handleOpenUserView,
    handleOpenPermissions,
    handleVaultChange,
  ]);

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
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search identity..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 ring-blue-100 outline-none text-gray-700 font-medium"
          />
        </div>
        <button className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-2xl text-gray-500 font-bold text-sm hover:bg-gray-50 transition-all">
          <Filter className="w-4 h-4" /> Advanced Filters
        </button>
      </div>

      {/* Data Table */}
      <DataTable columns={columns} data={filteredUsers} paginationData={paginationData} changePage={handlePageChange} isLoading={isUsersLoading} className="h-[calc(100vh-200px)]" />

      <UserViewDrawer isOpen={openUserViewDrawer} onClose={() => setOpenUserViewDrawer(false)} userId={selectedUserId} />

      {openModel && <CreateNewUserModal setOpenModal={handleCloseModal} roles={roles} onUserCreated={handleUserCreated} />}

      {roleDrawerOpen && <RoleDrawer isOpen={roleDrawerOpen} onClose={() => setRoleDrawerOpen(false)} rolesList={roles} />}

      <PermissionViewer isOpen={drawerOpen} user={selectedUser} onSaved={handlePermissionsSaved} onClose={handlePermissionsClose} permissions={permissions} />
    </div>
  );
};

export default User;
