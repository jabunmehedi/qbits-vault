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

// Override labels for specific full permission names (e.g. "cash-in.approve").
// Falls back to capitalising the action part of the permission name.
const PERMISSION_LABELS = {
  "cash-in.approve":  "Cashier",
  "cash-out.approve": "Cashier",
};

export const permissionLabel = (fullName) => {
  if (!fullName) return fullName;
  const key = String(fullName).toLowerCase();
  if (PERMISSION_LABELS[key]) return PERMISSION_LABELS[key];
  const action = key.split(".").slice(1).join(" ");
  return action
    ? action.charAt(0).toUpperCase() + action.slice(1)
    : fullName;
};
