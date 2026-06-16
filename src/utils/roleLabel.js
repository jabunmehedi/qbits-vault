// Frontend-only display labels for roles. Backend role names stay unchanged
// (e.g. the "approver" role is shown as "Cashier" since cash-in uses it as a cashier).
const ROLE_LABELS = {
  approver: "Cashier",
};

export const roleLabel = (name) => {
  if (!name) return name;
  return ROLE_LABELS[String(name).toLowerCase()] || name;
};
