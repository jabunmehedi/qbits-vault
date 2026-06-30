import { Navigate } from "react-router-dom";
import { usePermissions } from "../../hooks/usePermissions";
import { useSelector } from "react-redux";
import { selectIsSuperAdmin } from "../../store/authSlice";

const PermissionRoute = ({ children, permission }) => {
  const { hasPermission } = usePermissions();

  const isSuperAdmin = useSelector(selectIsSuperAdmin);

  // If the user is Super Admin, let them through immediately
  if (isSuperAdmin) {
    return <>{children}</>;
  }

  if (!hasPermission(permission)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default PermissionRoute;
