// src/components/PermissionInitializer.jsx
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchUserPermissions } from "../../store/authSlice";
import { Loader2 } from "lucide-react";

const PermissionInitializer = ({ children }) => {
  const dispatch = useDispatch();
  const { token, permissions, loading, isHydrated } = useSelector((state) => state.auth);
  const [isReady, setIsReady] = useState(false);


  useEffect(() => {
    const initializePermissions = async () => {
      // If we have a token but no permissions, fetch them
      if (token && permissions.length === 0 && !loading) {

        try {
          await dispatch(fetchUserPermissions()).unwrap();
     
        } catch (error) {
          console.error("❌ Failed to load permissions:", error);
        }
      } else if (token && permissions.length > 0) {
      }

      setIsReady(true);
    };

    initializePermissions();
  }, [token]);

  if (token && !isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-purple-50 via-pink-50 to-blue-50">
        <div className="text-center">
         <Loader2 className="animate-spin"/>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default PermissionInitializer;
