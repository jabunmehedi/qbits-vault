import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Login from "../pages/login/Login";
import PrivateRoute from "../components/privateRoute/PrivateRoute";
import Layout from "../components/layout/Layout";
import Dashboard from "../components/layout/dashboard/Dashboard";
import ErrorPage from "../pages/404/ErrorPage";
import User from "../pages/users/User";
import CashIn from "../pages/cashin/CashIn";
import Vault from "../pages/vault/Vault";
import Profile from "../pages/profile/Profile";
import RolePermissionManager from "../pages/roleAndPermissions/RolePermissionManager";
import Verifications from "../pages/verifications/Verifications";
import CashOut from "../pages/cashout/CashOut";
import Reconcile from "../pages/reconcile/Reconcile";
import ActivityLog from "../pages/activityLog/ActivityLog";
import ResetPasswordPage from "../components/resetPassword/ResetPassword";
import PermissionRoute from "../components/permissionRoute/PermissionRoute";

const AppRoutes = () => {
  const Routes = [
    {
      path: "/login",
      element: <Login />,
    },
    {
      path: "/reset-password",
      element: <ResetPasswordPage />,
    },
    {
      path: "/",
      element: (
        <PrivateRoute>
          <Layout />
        </PrivateRoute>
      ),
      errorElement: <ErrorPage />,
      children: [
        {
          path: "/",
          element: <Dashboard />,
        },
        {
          path: "/users",
          element: (
            <PermissionRoute permission="user.view">
              <User />
            </PermissionRoute>
          ),
        },
        {
          path: "/vault",
          element: (
            <PermissionRoute permission="vault.view">
              <Vault />
            </PermissionRoute>
          ),
        },
        {
          path: "/cashin",
          element: (
            <PermissionRoute permission="cash-in.view">
              <CashIn />
            </PermissionRoute>
          ),
        },
        {
          path: "/cashout",
          element: (
            <PermissionRoute permission="cash-out.view">
              <CashOut />
            </PermissionRoute>
          ),
        },
        {
          path: "/reconcile",
          element: (
            <PermissionRoute permission="reconciliation.view">
              <Reconcile />
            </PermissionRoute>
          ),
        },
        {
          path: "/profile",
          element: <Profile />,
        },
        {
          path: "/verifications",
          element: <Verifications />,
        },
        {
          path: "/role-and-permissions",
          element: <RolePermissionManager />,
        },
        {
          path: "/activity-log",
          element: <ActivityLog />,
        },
      ],
    },
  ];
  const router = createBrowserRouter(Routes);

  return <RouterProvider router={router} />;
};

export default AppRoutes;
