import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Loader2 } from "lucide-react";
import { bootstrapAuthUser } from "../../store/authSlice";

const PermissionInitializer = ({ children }) => {
  const dispatch = useDispatch();
  const { token } = useSelector((state) => state.auth);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      if (token) {
        const resultAction = await dispatch(bootstrapAuthUser());
        if (bootstrapAuthUser.rejected.match(resultAction) && !resultAction.meta?.condition) {
          console.error("Failed to bootstrap auth user:", resultAction.error);
        }
      }

      setIsReady(true);
    };

    initializeAuth();
  }, [token, dispatch]);

  if (token && !isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-purple-50 via-pink-50 to-blue-50">
        <div className="text-center">
          <Loader2 className="animate-spin" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default PermissionInitializer;
