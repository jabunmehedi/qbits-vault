import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import DataTable from "../../components/global/dataTable/DataTable";
import { GetRoles, GetUsers } from "../../services/User";
import { Check, ChevronDown, SlidersHorizontal, X, Search, Plus, Building2 } from "lucide-react";
import { CiMail } from "react-icons/ci";
import CreateNewUserModal from "../../components/user/CreateNewUserModal";
import Avatar from "../../components/helpers/Avatar";
import UserViewDrawer from "../../components/user/UserViewDrawer";
import PermissionViewer from "../../components/user/PermissionViewer";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePermissions } from "../../hooks/usePermissions";
import { useSelector } from "react-redux";
import { isSuperAdminRole, roleLabel, ROLE_COLUMN_ORDER } from "../../utils/roleLabel";
import { selectIsSuperAdmin } from "../../store/authSlice";
import axiosConfig from "../../utils/axiosConfig";

// ─── Constants ─────────────────────────────────────────────────────────────────

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
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const vaultAssignments = (row?.vault_assignments ?? []).filter((va) => va.status === "active" || va.status === 1);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (triggerRef.current?.contains(e.target)) return;
      if (menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleOpen = (e) => {
    e.stopPropagation();
    if (open) { setOpen(false); return; }
    const rect = triggerRef.current.getBoundingClientRect();
    setCoords({ top: rect.bottom + 6, left: rect.left });
    setOpen(true);
  };

  const selectedAssignment = vaultAssignments.find((va) => va.vault_id === selectedVaultId);
  const displayName = selectedAssignment?.vault?.name ?? vaultAssignments[0]?.vault?.name ?? "No Vault";

  if (vaultAssignments.length === 0) {
    return <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded tracking-wider uppercase">No Vault</span>;
  }

  // Single vault — static badge, no dropdown needed
  if (vaultAssignments.length === 1) {
    return (
      <span className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded tracking-wider uppercase border border-blue-100">
        <Building2 className="w-3 h-3" />
        <span className="max-w-[100px] truncate">{vaultAssignments[0]?.vault?.name ?? `Vault #${vaultAssignments[0]?.vault_id}`}</span>
      </span>
    );
  }

  return (
    <div ref={triggerRef} className="inline-block">
      <button
        onClick={handleOpen}
        className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded tracking-wider uppercase hover:bg-blue-100 transition-colors border border-blue-100"
      >
        <Building2 className="w-3 h-3" />
        <span className="max-w-[100px] truncate">{displayName}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          style={{ top: coords.top, left: coords.left }}
          className="fixed z-[99999] bg-white border border-gray-200 rounded-xl shadow-lg min-w-[160px] py-1 overflow-hidden"
        >
          {vaultAssignments.map((va) => (
            <button
              key={va.vault_id}
              onClick={(e) => {
                e.stopPropagation();
                onVaultChange(row.id, va.vault_id);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-semibold transition-colors ${
                selectedVaultId === va.vault_id ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{va.vault?.name ?? `Vault #${va.vault_id}`}</span>
              {selectedVaultId === va.vault_id && <Check className="w-3 h-3 ml-auto stroke-[3px]" />}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
};

// ─── Main component ─────────────────────────────────────────────────────────────
const User = () => {
  const [openModel, setOpenModel] = useState(false);
  const [openUserViewDrawer, setOpenUserViewDrawer] = useState(false);
  const [openPermissionViewer, setOpenPermissionViewer] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedPermissionUser, setSelectedPermissionUser] = useState(null);
  const [paginationData, setPaginationData] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Map of userId → selected vaultId
  const [userVaultSelection, setUserVaultSelection] = useState({});

  const isSuperAdmin = useSelector(selectIsSuperAdmin);
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();


  // ── Derived permission flags ──
  const canViewUserDetail = useMemo(() => isSuperAdmin || hasPermission("user.details"), [isSuperAdmin, hasPermission]);
  const canCreateUser = useMemo(() => isSuperAdmin || hasPermission("user.create"), [isSuperAdmin, hasPermission]);
  const canManageUserPermissions = useMemo(
    () => isSuperAdmin || hasPermission("role.manage_permissions"),
    [isSuperAdmin, hasPermission],
  );

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
        // Only seed if no selection exists yet — preserves manual vault switches
        if (user.id in next) return;

        const assignments = (user.vault_assignments ?? []).filter((va) => va.status === "active" || va.status === 1);
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

  const { data: permissions = [] } = useQuery({
    queryKey: ["permissions"],
    queryFn: async () => {
      const res = await axiosConfig.get("/permissions");
      return res?.data?.data ?? res?.data ?? [];
    },
  });

  // ── React Query: Permissions ──
  // ── Filtered users — hide superadmins from non-superadmin viewers ──
  const filteredUsers = useMemo(() => {
    if (isSuperAdmin) return users;
    return users.filter((user) => !user.roles?.some((role) => isSuperAdminRole(role.slug || role.name)));
  }, [users, isSuperAdmin]);

  // ── Stable non-superadmin roles list, sorted to match the capability matrix drawer ──
  const visibleRoles = useMemo(() => {
    const filtered = roles.filter((role) => !isSuperAdminRole(role.slug || role.name));
    return [...filtered].sort((a, b) => {
      const ai = ROLE_COLUMN_ORDER.indexOf(a.name.toLowerCase());
      const bi = ROLE_COLUMN_ORDER.indexOf(b.name.toLowerCase());
      const aPos = ai === -1 ? Infinity : ai;
      const bPos = bi === -1 ? Infinity : bi;
      return aPos - bPos;
    });
  }, [roles]);

  const genericRoles = useMemo(
    () => roles.filter((role) => role.type === "generic" && !isSuperAdminRole(role.slug || role.name)),
    [roles],
  );

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

  const handleCloseModal = useCallback((val) => {
    setOpenModel(val);
  }, []);

  const handleUserCreated = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["users"] });
  }, [queryClient]);

  const handlePermissionSaved = useCallback(() => {
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
    // ── Role columns — checked based on selected vault's role list ──
    const roleColumns = visibleRoles.map((role) => ({
      title: roleLabel(role.name).toUpperCase(),
      key: role.id,
      className: "text-center",
      render: (row) => {
        const selectedVaultId = userVaultSelection[row.id] ?? null;
        const vaultAssignments = (row.vault_assignments ?? []).filter((va) => va.status === "active" || va.status === 1);

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

    const permissionColumn = {
      title: "MANAGE",
      key: "permissions",
      className: "text-center w-[180px]",
      noClip: true,
      render: (row) => (
        <div className="flex justify-center">
          {canManageUserPermissions && (
            <button
              type="button"
              onClick={() => {
                setSelectedPermissionUser(row);
                setOpenPermissionViewer(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#d7dee9] text-[10px] font-bold uppercase tracking-[0.18em] text-[#1a2b4b] shadow-sm hover:border-blue-200 hover:text-blue-600 transition-all"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Permissions
            </button>
          )}
        </div>
      ),
    };

    return [identityColumn, permissionColumn, ...roleColumns];
  }, [
    visibleRoles,
    canViewUserDetail,
    canManageUserPermissions,
    userVaultSelection,
    handleOpenUserView,
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
    {/*    <button className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-2xl text-gray-500 font-bold text-sm hover:bg-gray-50 transition-all">
          <Filter className="w-4 h-4" /> Advanced Filters
        </button>*/}
      </div>

      {/* Data Table */}
      <DataTable columns={columns} data={filteredUsers} paginationData={paginationData} changePage={handlePageChange} isLoading={isUsersLoading} className="h-[calc(100vh-200px)]" />

      <UserViewDrawer isOpen={openUserViewDrawer} onClose={() => setOpenUserViewDrawer(false)} userId={selectedUserId} />
      <PermissionViewer
        isOpen={openPermissionViewer}
        onClose={() => setOpenPermissionViewer(false)}
        user={selectedPermissionUser}
        permissions={permissions}
        onSaved={handlePermissionSaved}
      />

      {openModel && <CreateNewUserModal setOpenModal={handleCloseModal} roles={genericRoles} onUserCreated={handleUserCreated} />}
    </div>
  );
};

export default User;
