import { useSelector, useDispatch } from "react-redux";
import { useToast } from "./useToast";
import { fetchUserPermissions } from "../store/authSlice";
import { useCallback, useMemo } from "react";
import { isSuperAdminRole, normalizePermissionName, normalizeRoleSlug } from "../utils/roleLabel";

export const usePermissions = () => {
  const dispatch = useDispatch();
  const { addToast } = useToast();

  const authState = useSelector((state) => state.auth);
  const { user, roles, permissions, loading, error } = authState;

  const isSuperAdmin = useMemo(
    () => roles.some((name) => isSuperAdminRole(name)),
    [roles],
  );

  const hasPermission = useCallback(
    (perm) => {
      // 1. Super Admin always has permission
      if (isSuperAdmin) return true;

      const normalized = normalizePermissionName(perm);
      return Array.isArray(permissions) && permissions.includes(normalized);
    },
    [permissions, isSuperAdmin]
  );

  const hasAnyPermission = useCallback(
    (permArray) => {
      if (isSuperAdmin) return true;
      
      return Array.isArray(permArray) && permArray.some((p) => hasPermission(p));
    },
    [hasPermission, isSuperAdmin]
  );

  const hasRole = useCallback(
    (roleName) => {
      return Array.isArray(roles) && roles.some((name) => normalizeRoleSlug(name) === normalizeRoleSlug(roleName));
    },
    [roles]
  );

  const refreshPermissions = useCallback(async () => {
    try {
      await dispatch(fetchUserPermissions()).unwrap();
      // Optional: addToast({ type: "success", message: "Permissions synced" });
    } catch (err) {
      addToast({ type: "error", message: "Failed to sync permissions" });
    }
  }, [dispatch, addToast]);

  return {
    user,
    roles,
    permissions,
    loading,
    error,
    isSuperAdmin, // Export this so you can use it for specific UI badges
    hasPermission,
    hasAnyPermission,
    hasRole,
    refreshPermissions,
  };
};
