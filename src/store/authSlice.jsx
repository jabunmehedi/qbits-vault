// store/authSlice.js
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axiosConfig from "../utils/axiosConfig";

// ── Thunk: fetch fresh user from API (replaces separate authUser slice) ────────
export const fetchAuthUser = createAsyncThunk("auth/fetchAuthUser", async (_, { getState, rejectWithValue }) => {
  try {
    // Prefer user id from Redux state, fall back to localStorage
    const userId = getState().auth.user?.id || (localStorage.getItem("auth") ? JSON.parse(localStorage.getItem("auth")).user?.id : null);

    if (!userId) return rejectWithValue("No user id available");

    const res = await axiosConfig.get(`/users/${userId}`);
    console.log(res.data.data.data);
    return res.data.data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to fetch user");
  }
});

// ── Kept for backwards-compat (roles/permissions refresh) ─────────────────────
export const fetchUserPermissions = createAsyncThunk("auth/fetchPermissions", async (_, { dispatch }) => {
  // Just re-use fetchAuthUser — no duplicate API call
  return dispatch(fetchAuthUser()).unwrap();
});

// ── Helpers ───────────────────────────────────────────────────────────────────
const extractRolesAndPermissions = (user) => {
  // Extract role names
  const roles = user.roles?.map((r) => r.name) || [];

  // Extract permission names from the top-level 'permissions' array
  const permissions = user.permissions?.map((p) => p.name) || [];

  // Logic for Super Admin: Often, you want Super Admins to pass all permission checks
  const isSuperAdmin = roles.some((name) => ["Super Admin", "super-admin", "Superadmin"].includes(name));

  return { roles, permissions, isSuperAdmin };
};

const getInitialToken = () => localStorage.getItem("access_token") || null;

// ── Slice ─────────────────────────────────────────────────────────────────────
const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: null,
    roles: [],
    permissions: [],
    token: getInitialToken(),
    loading: false,
    error: null,
  },
  reducers: {
    login: (state, action) => {
      const { user, access_token } = action.payload;
      const { roles, permissions } = extractRolesAndPermissions(user);

      state.user = user;
      state.roles = roles;
      state.permissions = permissions;
      state.token = access_token;
      state.loading = false;
      state.error = null;

      localStorage.setItem("access_token", access_token);
    },

    logout: (state) => {
      state.user = null;
      state.roles = [];
      state.permissions = [];
      state.token = null;
      state.loading = false;
      state.error = null;

      localStorage.removeItem("access_token");
      localStorage.removeItem("auth");
    },

    // Optimistic update after a verification step completes
    // e.g. dispatch(patchAuthUser({ phone_verified_at: new Date().toISOString() }))
    patchAuthUser: (state, action) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
  },

  extraReducers: (builder) => {
    builder
      // ── fetchAuthUser ──────────────────────────────────────────────────────
      .addCase(fetchAuthUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAuthUser.fulfilled, (state, action) => {
        const user = action.payload;
        const { roles, permissions } = extractRolesAndPermissions(user);

        state.user = user; // full fresh user from API
        state.roles = roles;
        state.permissions = permissions;
        state.loading = false;
      })
      .addCase(fetchAuthUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { login, logout, patchAuthUser } = authSlice.actions;
export default authSlice.reducer;

// ── Selectors (single source of truth for all components) ─────────────────────
export const selectAuthUser = (state) => state.auth.user;
export const selectAuthLoading = (state) => state.auth.loading;
export const selectAuthToken = (state) => state.auth.token;
export const selectRoles = (state) => state.auth.roles;
export const selectPermissions = (state) => state.auth.permissions;

// Verification selectors — derived from live API user, never localStorage
export const selectIsEmailVerified = (state) => !!state.auth.user?.email_verified_at;
export const selectIsPhoneVerified = (state) => !!state.auth.user?.phone_verified_at;

export const selectIsAddressSaved = (state) => {
  const u = state.auth.user;
  // Check if the essential current address fields exist in the user object
  return !!(u?.current_address && u?.current_division && u?.current_district);
};
export const selectIsKycVerified = (state) => !!state.auth.user?.kyc_verified_at;
export const selectIsFullyVerified = (state) => {
  const u = state.auth.user;
  if (!u) return false;
  // Comprehensive check
  return !!(u.email_verified_at && u.phone_verified_at && u.current_address && (u.verified == true || u.verified == 1));
};
export const selectIsSuperAdmin = (state) =>
  state.auth.roles.some((name) => ["Superadmin", "Super Admin", "superadmin", "super_admin", "super-admin"].includes(name));

export const selectHasPermission = (permission) => (state) => state.auth.permissions.includes(permission);
