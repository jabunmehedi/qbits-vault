import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axiosConfig from "../utils/axiosConfig";

export const fetchUserPermissions = createAsyncThunk("auth/fetchPermissions", async (_, { rejectWithValue }) => {
  try {
    const userId = localStorage.getItem('auth') ? JSON.parse(localStorage.getItem('auth')).user.id : null;

    const res = await axiosConfig.get(`/users/${userId}`);
    return {
      roles: res.data.roles || [],
      permissions: res.data || [],
    };
  } catch (err) {
    return rejectWithValue("Failed to load permissions");
  }
});

const getInitialToken = () => {
  return localStorage.getItem("access_token") || null;
};

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

      // Extract roles from user.roles array
      const roleNames = user.roles?.map((role) => role.name) || [];

      // Extract permissions from user.roles[0].permissions (Spatie sends them nested)
      const allPermissions = [];
      user.roles?.forEach((role) => {
        role.permissions?.forEach((perm) => {
          if (!allPermissions.includes(perm.name)) {
            allPermissions.push(perm.name);
          }
        });
      });

      state.user = user;
      state.roles = roleNames;
      state.permissions = allPermissions;
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
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserPermissions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserPermissions.fulfilled, (state, action) => {
        state.roles = action.payload.roles;
        state.permissions = action.payload.permissions;
        state.loading = false;
      })
      .addCase(fetchUserPermissions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { login, logout } = authSlice.actions;
export default authSlice.reducer;
