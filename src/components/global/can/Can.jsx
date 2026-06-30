import { usePermissions } from "../../../hooks/usePermissions";

const Can = ({ perform, anyOf, children, fallback = null }) => {
  const { hasPermission, hasAnyPermission } = usePermissions();

  const allowed = anyOf ? hasAnyPermission(anyOf) : perform ? hasPermission(perform) : true;

  return allowed ? children : fallback;
};

export default Can;
