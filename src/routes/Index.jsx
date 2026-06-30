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
import CashOut from "../pages/cashout/CashOut";
import Reconcile from "../pages/reconcile/Reconcile";
import ActivityLog from "../pages/activityLog/ActivityLog";
import ResetPasswordPage from "../components/resetPassword/ResetPassword";
import PermissionRoute from "../components/permissionRoute/PermissionRoute";
import VaultAudit from "../pages/settings/vaultAudit/VaultAudit";
import Reports from "../pages/reports/Reports";
import Roles from "../pages/roles/Roles";

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
          path: "/roles",
          element: (
            <PermissionRoute permission="role.view">
              <Roles />
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
          path: "/reports",
          element: (
            <PermissionRoute permission="report.view">
              <Reports />
            </PermissionRoute>
          ),
        },
        {
          path: "/profile",
          element: <Profile />,
        },
        {
          path: "/logs",
          element: (
            <PermissionRoute permission="log.view">
              <ActivityLog />
            </PermissionRoute>
          ),
        },
        {
          path: "/reconcile/config-vault-audit",
          element: (
            <PermissionRoute permission="reconciliation.config_audit_view">
              <VaultAudit />
            </PermissionRoute>
          ),
        },
      ],
    },
  ];
  const router = createBrowserRouter(Routes);

  return <RouterProvider router={router} />;
};

export default AppRoutes;
