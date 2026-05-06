import { Navigate } from "react-router-dom";
import { usePermissions } from "../../hooks/usePermissions";

const PermissionRoute = ({ children, permission }) => {
  const { hasPermission } = usePermissions();

  if (!hasPermission(permission)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default PermissionRoute;
