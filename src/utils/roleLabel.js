// Canonical display order for role columns in the user list table.
// Matches the capability matrix drawer layout (left-to-right, top-to-bottom).
export const ROLE_COLUMN_ORDER = [
  "admin",
  "bag create",
  "cash-in verifier",
  "cash-in cashier",
  "cash-out verifier",
  "cash-out cashier",
  "custodian",
  "auditor",
  "audit initiator",
  "reconciler",
];

// Frontend-only display labels for vault capability matrix roles.
const ROLE_LABELS = {
  "cash-in verifier": "Cash-In Verifier",
  "cash-in cashier": "Cash-In Cashier",
  "cash-out verifier": "Cash-Out Verifier",
  "cash-out cashier": "Cash-Out Cashier",
  "bag create": "Bag Create",
  "audit initiator": "Audit Initiator",
};

export const roleLabel = (name) => {
  if (!name) return name;
  return ROLE_LABELS[String(name).toLowerCase()] || name;
};

export const normalizeRoleSlug = (role) => {
  const value = String(role || "").trim().toLowerCase();
  return value
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
};

export const isSuperAdminRole = (role) => normalizeRoleSlug(role) === "super-admin";

export const CANONICAL_PERMISSION_NAMES = [
  "vault.create",
  "vault.view",
  "vault.edit",
  "vault.delete",
  "cash-in.request",
  "cash-in.edit",
  "cash-in.delete",
  "cash-in.view",
  "cash-in.verify",
  "cash-in.cashier",
  "cash-in.reject",
  "cash-out.request",
  "cash-out.view",
  "cash-out.edit",
  "cash-out.delete",
  "cash-out.verify",
  "cash-out.cashier",
  "reconciliation.view",
  "reconciliation.create",
  "reconciliation.reschedule",
  "reconciliation.read",
  "reconciliation.reconcile",
  "reconciliation.reject",
  "reconciliation.settle",
  "user.create",
  "user.view",
  "user.details",
  "user.edit",
  "user.delete",
  "role.create",
  "role.view",
  "role.edit",
  "role.delete",
  "role.manage_permissions",
  "report.view",
  "reconciliation.config_audit_view",
  "reconciliation.config_audit_edit",
  "log.view",
];

export const PERMISSION_GROUP_ORDER = [
  "role",
  "user",
  "vault",
  "cash-in",
  "cash-out",
  "reconciliation",
  "report",
  "log",
];

const PERMISSION_NAME_ALIASES = {
  "cash-out.create": "cash-out.request",
  "cash-in.approve": "cash-in.cashier",
  "cash-out.approve": "cash-out.cashier",
  "reconciliation.verify": "reconciliation.reconcile",
  "reconciliation.approve": "reconciliation.reconcile",
  "permission.view": "role.manage_permissions",
  "permission.edit": "role.manage_permissions",
  "permission.create": "role.manage_permissions",
  "assign-role": "role.manage_permissions",
  "assign-permission": "role.manage_permissions",
};

export const normalizePermissionName = (fullName) => {
  const key = String(fullName || "").trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(PERMISSION_NAME_ALIASES, key) ? PERMISSION_NAME_ALIASES[key] : key;
};

export const getPermissionGroup = (permission) => {
  const normalized = normalizePermissionName(permission?.normalizedName || permission?.name);
  if (!normalized) return "general";
  return normalized.split(".")[0] || "general";
};

export const preparePermissionGroups = (permissions = []) => {
  const deduped = new Map();

  permissions.forEach((permission) => {
    const normalizedName = normalizePermissionName(permission?.name);
    if (!normalizedName || !CANONICAL_PERMISSION_NAMES.includes(normalizedName)) {
      return;
    }

    const existing = deduped.get(normalizedName);
    if (!existing || String(permission?.name).toLowerCase() === normalizedName) {
      deduped.set(normalizedName, { ...permission, normalizedName });
    }
  });

  const grouped = {};

  Array.from(deduped.values())
    .sort((left, right) => CANONICAL_PERMISSION_NAMES.indexOf(left.normalizedName) - CANONICAL_PERMISSION_NAMES.indexOf(right.normalizedName))
    .forEach((permission) => {
      const group = getPermissionGroup(permission);
      if (!grouped[group]) grouped[group] = [];
      grouped[group].push(permission);
    });

  return Object.fromEntries(
    Object.entries(grouped).sort(([left], [right]) => {
      const leftIndex = PERMISSION_GROUP_ORDER.indexOf(left);
      const rightIndex = PERMISSION_GROUP_ORDER.indexOf(right);
      const safeLeft = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
      const safeRight = rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;
      return safeLeft - safeRight || left.localeCompare(right);
    })
  );
};

// Override labels for specific full permission names.
// Falls back to capitalising the action part of the permission name.
const PERMISSION_LABELS = {
  "cash-in.cashier": "Cashier",
  "cash-out.cashier": "Cashier",
  "cash-out.reject": "Reject",
  "reconciliation.reconcile": "Reconcile",
  "role.manage_permissions": "Permissions",
  "log.view": "View",
  "reconciliation.config_audit_view": "Config Audit View",
  "reconciliation.config_audit_edit": "Config Audit Edit",
};

export const permissionLabel = (fullName) => {
  if (!fullName) return fullName;
  const key = normalizePermissionName(fullName);
  if (!key) return fullName;
  if (PERMISSION_LABELS[key]) return PERMISSION_LABELS[key];
  const action = key.split(".").slice(1).join(" ");
  return action
    ? action.charAt(0).toUpperCase() + action.slice(1)
    : fullName;
};
